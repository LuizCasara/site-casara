'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Canvas} from '@react-three/fiber';
import {EffectComposer, Bloom, N8AO, Vignette} from '@react-three/postprocessing';
import {Suspense} from 'react';
import Room, {posicaoDaLavaLamp} from '@/components/livros/Room';
import Bookshelf from '@/components/livros/Bookshelf';
import DeskBooks from '@/components/livros/DeskBooks';
import TorreQueroLer from '@/components/livros/TorreQueroLer';
import LavaLamp from '@/components/livros/decor/LavaLamp';
import IndexPanel from '@/components/livros/IndexPanel';
import CameraRig, {type Viewpoint} from '@/components/livros/CameraRig';
import {useIsMobile} from '@/components/livros/use-is-mobile';
import {useFecharLivro} from '@/components/livros/use-fechar-livro';
import {useAlturaRodape, useAlturaDoElemento} from '@/components/livros/use-altura-rodape';
import {toShelfBooks} from '@/lib/book-dimensions.mjs';
import {NICHO_CAPACIDADE_M} from '@/lib/bookshelf-model.mjs';
import {agruparPorAnoDeLeitura} from '@/lib/shelf-years.mjs';
import {sortShelfBooks, filterShelfBooks, vizinhosDe} from '@/lib/livros-shelf.mjs';
import {CENAS, anoVizinho, paradaVizinha} from '@/lib/livros-cenas.mjs';
import {buildSpineAtlas, type SpineAtlas} from '@/lib/spine-canvas';
import {
    trackRoomLoaded, trackListFallback, trackBookOpened,
    trackShelfSorted, trackIndexOpened, trackBookFilter,
    trackRoomSceneChanged, trackShelfYearFocused, trackBookPaged,
    trackBookClosed, trackRoomObjectClick,
} from '@/utils/analytics';

export type ShelvedBookInput = {
    slug: string;
    title: string;
    author: string | null;
    rating: string | null;
    pages: number | null;
    spine_color: string | null;
    cover_path: string | null;
    category: string;
    tags: string[];
    year: number | null;
    finished_at: Date | string | null;
};

export type LivrosMode = {kind: 'sala'} | {kind: 'livro'; slug: string};

export type RoomCanvasProps = {
    books: ShelvedBookInput[];
    deskBooks: ShelvedBookInput[];
    /** Status 'quero-ler': a torre no chão ao lado da estante. */
    queroLer: ShelvedBookInput[];
    tags: string[];
    mode: LivrosMode;
};

type IndiceFiltros = {categoria: string | null; tag: string | null; busca: string};

// Cache em módulo: sobrevive a desmontar/remontar o RoomCanvas dentro da mesma
// sessão (ir e voltar entre /livros e /livros/lista) e reseta num reload, que é
// quando os dados vêm de novo do servidor. buildSpineAtlas espera fonte carregar
// e desenha um canvas por livro — refazer isso a cada ida e volta é desperdício.
let atlasCache: {chave: string; atlas: SpineAtlas} | null = null;

function chaveAtlas(shelfBooks: {slug: string; thicknessM: number}[]): string {
    return shelfBooks.map((b) => `${b.slug}:${b.thicknessM}`).join('|');
}

/**
 * Heurística deliberadamente simples: não há jeito confiável de medir GPU pelo
 * browser sem WebGL já ativo, então poucos núcleos de CPU é o sinal mais barato
 * de aparelho fraco. O resto da sala só depende de receber um motivo ou `null`.
 */
function detectaMotivoDegradacao(): 'sem-webgl' | 'reduced-motion' | 'gpu-fraca' | null {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'reduced-motion';
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'sem-webgl';
    } catch {
        return 'sem-webgl';
    }
    const cores = navigator.hardwareConcurrency ?? 8;
    if (cores < 4) return 'gpu-fraca';
    return null;
}

export default function RoomCanvas({books, deskBooks, queroLer, tags, mode}: RoomCanvasProps) {
    const router = useRouter();
    const openSlug = mode.kind === 'livro' ? mode.slug : null;

    const [manualViewpoint, setManualViewpoint] = useState<Viewpoint>('geral');
    const [atlas, setAtlas] = useState<SpineAtlas | null>(null);
    const [degradado, setDegradado] = useState(false);
    const [sortCriterio, setSortCriterio] = useState('padrao');
    const [filtros, setFiltros] = useState<IndiceFiltros>({categoria: null, tag: null, busca: ''});
    const [indiceAberto, setIndiceAberto] = useState(false);
    /** Close no porta-retratos da mesa do PC — ver o viewpoint 'retrato'. */
    const [retratoAberto, setRetratoAberto] = useState(false);
    const [grupoFocado, setGrupoFocado] = useState<number | null>(null);
    const isMobile = useIsMobile();
    const fecharLivro = useFecharLivro();
    const alturaRodape = useAlturaRodape();
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const barraRef = useRef<HTMLDivElement>(null);

    // Base = todos os livros 'lido', na ordem que vieram do banco. O atlas é
    // gerado a partir dela uma vez só, nunca refeito ao ordenar ou filtrar.
    const shelfBooksBase = useMemo(() => toShelfBooks(books), [books]);
    const deskShelfBooks = useMemo(() => toShelfBooks(deskBooks), [deskBooks]);
    const torreBooks = useMemo(() => toShelfBooks(queroLer), [queroLer]);
    // Os livros da torre entram no MESMO atlas de lombadas da estante: ficam
    // deitados, com a lombada virada para o lado e bem visível, ao contrário dos
    // da mesa (que mostram a capa e recebem um UV qualquer).
    const livrosDoAtlas = useMemo(
        () => [...shelfBooksBase, ...torreBooks],
        [shelfBooksBase, torreBooks],
    );
    const shelfBooksVisiveis = useMemo(
        () => sortShelfBooks(filterShelfBooks(shelfBooksBase, filtros), sortCriterio),
        [shelfBooksBase, filtros, sortCriterio],
    );
    // Os grupos de ano saem do acervo INTEIRO, não da lista filtrada: filtrar
    // esconde livros, nunca muda de que ano é cada nicho.
    const grupos = useMemo(
        () => agruparPorAnoDeLeitura(shelfBooksBase, NICHO_CAPACIDADE_M),
        [shelfBooksBase],
    );

    // Quanto da base do canvas está tapado. Medido, não estimado: a barra cresce
    // de uma para duas linhas quando os anos não cabem lado a lado, e é aí que um
    // valor fixo esconde o nicho mais baixo atrás dos botões.
    const alturaBarra = useAlturaDoElemento(barraRef, [manualViewpoint, grupos.length, alturaRodape]);
    const cobertoEmbaixoPx = alturaRodape + alturaBarra + 24;

    // "animate" só nasce falso quando a página já chega com um livro aberto
    // (link direto/externo): sem clique prévio, não há o que justificar animar.
    //
    // Cuidado com a ordem: como o Canvas só renderiza depois que `atlas` fica
    // pronto (`if (!atlas) return null` abaixo), "primeira renderização do
    // componente" NÃO é o mesmo momento que "primeira renderização da cena 3D" —
    // buildSpineAtlas é assíncrono e só resolve depois do primeiro commit. Por
    // isso o ref abaixo só vira `true` quando `atlas` de fato aparece.
    const [instantOpen] = useState(() => openSlug !== null);
    const hasShownSceneRef = useRef(false);
    const isFirstSceneRender = !hasShownSceneRef.current;
    useEffect(() => {
        if (atlas) hasShownSceneRef.current = true;
    }, [atlas]);
    const animateTransitions = !(isFirstSceneRender && instantOpen);

    const previousOpenSlugRef = useRef<string | null>(null);
    useEffect(() => {
        if (openSlug && previousOpenSlugRef.current !== openSlug) trackBookOpened(openSlug);
        previousOpenSlugRef.current = openSlug;
    }, [openSlug]);

    // Sair da cena da estante larga o foco do ano: voltar depois pela cena
    // "Estante" começa do nível 1, não no zoom de três cliques atrás.
    useEffect(() => {
        if (manualViewpoint !== 'estante') setGrupoFocado(null);
    }, [manualViewpoint]);

    /** Clicar no ano já ativo sobe um nível — o mesmo gesto da etiqueta 3D. */
    const selecionarGrupo = useCallback((indice: number) => {
        setGrupoFocado((atual) => {
            // Só a ENTRADA no ano vira evento; sair dele é o mesmo clique e
            // contaria duas vezes o mesmo interesse.
            if (atual !== indice) trackShelfYearFocused(grupos[indice]?.rotulo ?? '', indice);
            return atual === indice ? null : indice;
        });
    }, [grupos]);

    /**
     * Um passo no trilho da sala — cenas e anos no mesmo caminho, em loop (ver
     * `trilhoDeCenas`). Uma parada carrega os dois estados de uma vez: a cena
     * define o enquadramento, e o ano (quando existe) o nicho em foco.
     */
    const andarNoTrilho = useCallback((direcao: 1 | -1, origem: 'seta' | 'scroll') => {
        const destino = paradaVizinha(
            {cena: manualViewpoint, ano: grupoFocado},
            direcao,
            grupos.length,
        ) as {cena: Viewpoint; ano: number | null};
        setManualViewpoint(destino.cena);
        setGrupoFocado(destino.ano);
        // A parada é a cena OU um ano dentro dela — os dois são um passo no
        // mesmo trilho, e o que interessa medir aqui é por onde a pessoa andou.
        if (destino.ano !== null) trackShelfYearFocused(grupos[destino.ano]?.rotulo ?? '', destino.ano);
        else trackRoomSceneChanged(destino.cena, origem);
    }, [manualViewpoint, grupoFocado, grupos]);

    // Abrir um livro com o índice aberto não deixa os dois empilhados, nem
    // `indiceAberto` verdadeiro escondido no estado depois que o livro fecha.
    useEffect(() => {
        if (openSlug) setIndiceAberto(false);
    }, [openSlug]);

    // Cada lugar da sala é uma lista fechada para folhear (← →): quem abriu um
    // livro da mesa percorre a mesa, quem abriu um da torre percorre a fila de
    // leitura, e o resto percorre a estante como ela está sendo vista (ordenada
    // e filtrada). Misturar faria a seta saltar de um móvel para outro sem que
    // nada na tela explicasse o salto.
    const vizinhos = useMemo(() => {
        if (!openSlug) return {anterior: null, proximo: null};
        const daMesa = deskShelfBooks.some((b: {slug: string}) => b.slug === openSlug);
        const daTorre = torreBooks.some((b: {slug: string}) => b.slug === openSlug);
        const lista = daMesa ? deskShelfBooks : (daTorre ? torreBooks : shelfBooksVisiveis);
        return vizinhosDe(lista, openSlug);
    }, [openSlug, deskShelfBooks, torreBooks, shelfBooksVisiveis]);

    // `replace`, não `push`: cada livro folheado viraria uma entrada no
    // histórico, e o "✕ fechar" (que é router.back()) passaria a voltar pro livro
    // anterior em vez de pra sala.
    const folhear = useCallback((slug: string | null, direcao: 'anterior' | 'proximo') => {
        if (!slug) return;
        trackBookPaged(openSlug ?? '', slug, direcao);
        router.replace(`/livros/${slug}`);
    }, [router, openSlug]);

    // Os dois vizinhos do livro aberto entram no Router Cache antes de alguém
    // pedir por eles, então a seta troca de livro sem esperar rede. Só os dois
    // adjacentes: pré-carregar o acervo inteiro seria dezenas de requests para
    // servir um ou dois.
    //
    // O ganho só existe junto com `staleTimes.dynamic` no next.config — com o
    // padrão zero, a resposta pré-carregada é descartada antes de ser usada e o
    // prefetch vira request desperdiçado.
    useEffect(() => {
        if (!openSlug) return;
        for (const vizinho of [vizinhos.anterior, vizinhos.proximo]) {
            if (vizinho) router.prefetch(`/livros/${vizinho}`);
        }
    }, [openSlug, vizinhos.anterior, vizinhos.proximo, router]);

    // Um único listener para os três contextos, na ordem em que as camadas
    // aparecem na tela: livro aberto > índice aberto > sala. Sem esse
    // escalonamento, a seta trocaria a cena por baixo de um livro aberto.
    useEffect(() => {
        const aoTeclar = (e: KeyboardEvent) => {
            if (openSlug) {
                if (e.key === 'Escape') {
                    trackBookClosed(openSlug, 'esc');
                    fecharLivro();
                } else if (e.key === 'ArrowLeft') folhear(vizinhos.anterior, 'anterior');
                else if (e.key === 'ArrowRight') folhear(vizinhos.proximo, 'proximo');
                return;
            }
            if (retratoAberto) {
                if (e.key === 'Escape') setRetratoAberto(false);
                return;
            }
            if (indiceAberto) {
                if (e.key === 'Escape') setIndiceAberto(false);
                return;
            }
            // Esc na estante sobe um nível antes de qualquer outra coisa: quem
            // está com um ano em foco espera sair do zoom, não trocar de cena.
            if (e.key === 'Escape' && grupoFocado !== null) {
                setGrupoFocado(null);
                return;
            }
            // Segundo eixo de navegação, só na estante: as setas verticais andam
            // pelos ANOS. preventDefault porque ↑/↓ rolam a página por padrão.
            if (manualViewpoint === 'estante' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault();
                setGrupoFocado((atual) => anoVizinho(atual, e.key === 'ArrowUp' ? 1 : -1, grupos.length));
                return;
            }
            if (e.key === 'ArrowLeft') andarNoTrilho(-1, 'seta');
            else if (e.key === 'ArrowRight') andarNoTrilho(1, 'seta');
        };
        window.addEventListener('keydown', aoTeclar);
        return () => window.removeEventListener('keydown', aoTeclar);
    }, [openSlug, indiceAberto, retratoAberto, manualViewpoint, grupoFocado, grupos.length, vizinhos, folhear, fecharLivro, andarNoTrilho]);

    /**
     * A roda do mouse percorre o MESMO trilho das setas laterais: sala, mesa,
     * estante, cada ano do acervo, o canto do PC, e de volta ao começo. Quem
     * chega na página e gira a roda vê a sala se apresentar sem precisar
     * descobrir botão nenhum e sem ficar preso em lugar nenhum.
     *
     * Dois amortecedores, porque um gesto de trackpad dispara dezenas de
     * eventos: um limiar por evento, que ignora o arrastar de dedo fino, e um
     * intervalo mínimo entre passos, que impede pular três paradas num gesto só.
     *
     * `passive: true` e sem preventDefault de propósito: nada aqui bloqueia a
     * rolagem da página. Fica de fora quando há livro ou índice abertos — ali a
     * roda é do conteúdo do painel, não da sala.
     */
    useEffect(() => {
        if (mode.kind !== 'sala' || indiceAberto || retratoAberto) return;

        const LIMIAR_PX = 24;
        const INTERVALO_MS = 550;
        let ultimaTroca = 0;

        const aoRolar = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) < LIMIAR_PX) return;
            const agora = Date.now();
            if (agora - ultimaTroca < INTERVALO_MS) return;
            ultimaTroca = agora;
            andarNoTrilho(e.deltaY > 0 ? 1 : -1, 'scroll');
        };

        window.addEventListener('wheel', aoRolar, {passive: true});
        return () => window.removeEventListener('wheel', aoRolar);
    }, [mode.kind, indiceAberto, retratoAberto, andarNoTrilho]);

    useEffect(() => {
        const motivo = detectaMotivoDegradacao();
        if (motivo) {
            if (mode.kind === 'sala') {
                trackListFallback(motivo);
                router.replace('/livros/lista');
            } else {
                // Em /livros/<slug> a página SSR já é um fallback completo —
                // degradar aqui é só "não mostrar o 3D", nunca redirecionar pra
                // longe de um conteúdo que já funciona sozinho.
                setDegradado(true);
            }
            return;
        }

        const chave = chaveAtlas(livrosDoAtlas);
        if (atlasCache && atlasCache.chave === chave) {
            setAtlas(atlasCache.atlas);
            trackRoomLoaded(0, window.innerWidth < 768);
            return;
        }

        const inicio = performance.now();
        let cancelado = false;
        buildSpineAtlas(livrosDoAtlas).then((resultado) => {
            if (cancelado) return;
            atlasCache = {chave, atlas: resultado};
            setAtlas(resultado);
            trackRoomLoaded(Math.round(performance.now() - inicio), window.innerWidth < 768);
        });
        return () => {
            cancelado = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // O ResizeObserver do R3F às vezes perde a primeira medição do container e o
    // canvas fica preso no tamanho padrão (300x150). Isso não é só cosmético: o
    // R3F só cria o renderer quando o container mede > 0, então canvas não
    // medido significa cena preta E nenhum evento de ponteiro — sem hover, sem
    // clique.
    useEffect(() => {
        if (!atlas) return;
        const wrapper = canvasWrapperRef.current;
        if (!wrapper) return;

        const LIMITE_MS = 5000;
        const INTERVALO_MS = 100;
        let timeoutId: ReturnType<typeof setTimeout>;
        let cancelado = false;
        let inicio = Date.now();

        // A condição real, não um proxy: o canvas já tem a largura do container?
        // Medir o wrapper não serve — ele é `fixed inset-0` e já nasce com o
        // tamanho certo, então a checagem passaria com o canvas ainda em 300x150.
        const jaMedido = () => {
            const canvas = wrapper.querySelector('canvas');
            if (!canvas) return false;
            const alvo = wrapper.getBoundingClientRect();
            const atual = canvas.getBoundingClientRect();
            return atual.width > 0 && Math.abs(atual.width - alvo.width) < 1;
        };

        const tentar = () => {
            if (cancelado || jaMedido()) return;
            window.dispatchEvent(new Event('resize'));
            if (Date.now() - inicio < LIMITE_MS) timeoutId = setTimeout(tentar, INTERVALO_MS);
        };

        // setTimeout, NÃO requestAnimationFrame: rAF fica suspenso enquanto o
        // documento está oculto, e o ResizeObserver do R3F também não entrega
        // nada nesse estado — quem abre /livros numa aba em segundo plano ficaria
        // com a sala preta e sem eventos. Timers continuam rodando; o
        // visibilitychange abaixo cobre a aba que volta depois do limite.
        tentar();

        const aoMudarVisibilidade = () => {
            if (document.visibilityState !== 'visible' || jaMedido()) return;
            inicio = Date.now();
            clearTimeout(timeoutId);
            tentar();
        };
        document.addEventListener('visibilitychange', aoMudarVisibilidade);

        return () => {
            cancelado = true;
            clearTimeout(timeoutId);
            document.removeEventListener('visibilitychange', aoMudarVisibilidade);
        };
    }, [atlas]);

    if (degradado || !atlas) return null;

    // Abrir o índice leva a câmera para a ESTANTE: a lâmpada é o botão, e
    // filtrar acontece olhando os livros sumirem e aparecerem, com as etiquetas
    // de ano à vista. Abrir um LIVRO, ao contrário, não mexe na câmera — ele se
    // apresenta onde está, e quem escolheu o enquadramento continua nele.
    //
    // Precedência, de dentro para fora: o close no retrato ganha do índice, que
    // ganha da cena escolhida na barra. São estados que só se alcançam clicando
    // num objeto, então quem clicou por último manda.
    const viewpoint: Viewpoint = retratoAberto ? 'retrato' : (indiceAberto ? 'estante' : manualViewpoint);

    const abrirIndice = () => {
        setIndiceAberto(true);
        trackIndexOpened(filtros.categoria, filtros.tag);
    };
    const fecharIndice = () => setIndiceAberto(false);
    const mudarOrdenacao = (criterio: string) => {
        setSortCriterio(criterio);
        trackShelfSorted(criterio);
    };
    // Compara com o estado anterior para saber QUAL dos dois campos mudou — o
    // painel manda o par inteiro a cada clique, e sem isso todo clique numa
    // categoria também registraria um evento de tag.
    const mudarFiltros = (novos: IndiceFiltros) => {
        if (novos.categoria !== filtros.categoria) trackBookFilter('categoria', novos.categoria ?? '');
        if (novos.tag !== filtros.tag) trackBookFilter('tag', novos.tag ?? '');
        // A busca já chega com debounce do IndexPanel, então isto é um evento
        // por termo procurado, não por tecla digitada.
        if (novos.busca !== filtros.busca && novos.busca) trackBookFilter('busca', novos.busca);
        setFiltros(novos);
    };

    return (
        <>
            {/*
              z-0, NÃO -z-10: com z-index negativo o canvas é pintado atrás do
              conteúdo in-flow do documento, e o `<main className="flex-grow">`
              do layout raiz — transparente, mas ocupando a viewport inteira —
              vira o alvo de todo hit-test. A cena aparece normalmente e o R3F
              não recebe pointer event nenhum. Quem precisa ficar acima da sala
              declara isso explicitamente (Footer, o card de /livros/[slug], os
              botões de viewpoint em z-10, os overlays em z-20).
            */}
            <div ref={canvasWrapperRef} className="fixed inset-0 z-0">
                <Canvas shadows camera={{fov: 50}} dpr={isMobile ? 1 : [1, 2]}>
                    <Room
                        gruposDeAno={grupos.length}
                        onAbrirRetrato={mode.kind === 'sala' ? () => setRetratoAberto((v) => {
                            if (!v) trackRoomObjectClick('retrato');
                            return !v;
                        }) : undefined}
                        isMobile={isMobile}
                    />
                    <Bookshelf
                        todosOsLivros={shelfBooksBase}
                        shelfBooks={shelfBooksVisiveis}
                        atlas={atlas}
                        openSlug={openSlug}
                        animate={animateTransitions}
                        isMobile={isMobile}
                        grupoFocado={grupoFocado}
                        onSelecionarGrupo={selecionarGrupo}
                        mostrarEtiquetas={viewpoint === 'estante'}
                    />
                    <DeskBooks deskBooks={deskShelfBooks} atlas={atlas} openSlug={openSlug} animate={animateTransitions} isMobile={isMobile}/>
                    <TorreQueroLer livros={torreBooks} atlas={atlas} openSlug={openSlug} animate={animateTransitions} isMobile={isMobile} gruposDeAno={grupos.length}/>
                    {/*
                      A lava lamp é o Índice. Ela é montada AQUI, e não em
                      Room.tsx, porque virou controle: a sala é cenário e não
                      conhece filtro nem estado de UI — Room só publica onde ela
                      fica. Com um livro aberto ela continua na cena, mas sem
                      `onOpen`: vira enfeite aceso, sem etiqueta nem clique.
                    */}
                    <Suspense fallback={null}>
                        <LavaLamp
                            position={posicaoDaLavaLamp(grupos.length)}
                            onOpen={mode.kind === 'sala' && !indiceAberto ? abrirIndice : undefined}
                            isMobile={isMobile}
                            mostrarEtiqueta={viewpoint === 'estante'}
                        />
                    </Suspense>
                    <CameraRig
                        viewpoint={viewpoint}
                        animate={animateTransitions}
                        grupoFocado={grupoFocado}
                        totalGrupos={grupos.length}
                        cobertoEmbaixoPx={cobertoEmbaixoPx}
                    />
                    {/*
                      Ordem importa: N8AO primeiro, Bloom depois, Vignette por
                      último. O AO precisa rodar sobre a cena ainda "crua" — se
                      viesse depois do Bloom, leria o halo da luz como geometria
                      e escureceria em volta do brilho.
                    */}
                    <EffectComposer>
                        {/*
                          N8AO escurece as frestas onde duas superfícies se
                          encontram (perna de mesa com o chão, livro com a
                          prancha) — é o que faz um objeto parecer APOIADO em vez
                          de colado por cima.

                          aoRadius em METROS de mundo, não em pixels: 0.16 é a
                          escala desta sala (lombada de ~3cm, mesa de 70cm). Em
                          0.45 o efeito lia como sujeira geral, não como contato.
                          `halfRes` fica só no mobile: com raio apertado, meia
                          resolução borra justamente a marca fina que se quer.
                        */}
                        <N8AO
                            aoRadius={0.16}
                            distanceFalloff={0.6}
                            intensity={6}
                            quality={isMobile ? 'performance' : 'high'}
                            halfRes={isMobile}
                            color="#140c06"
                        />
                        {/*
                          `luminanceThreshold` alto de propósito. O Bloom vira
                          halo qualquer pixel acima do limite, e as lombadas do
                          acervo são claras (a cor sai do fundo da capa). No
                          limite padrão elas cruzavam e o título sumia dentro do
                          próprio brilho, mesmo com a câmera colada. Em 0.78 só o
                          que é de fato luz — telas, lava lamp, abajur — brilha.
                        */}
                        <Bloom intensity={0.3} luminanceThreshold={0.78}/>
                        <Vignette darkness={0.45} offset={0.35}/>
                    </EffectComposer>
                </Canvas>
            </div>
            {mode.kind === 'sala' && !indiceAberto && (
                // `bottom` medido a partir da altura real do rodapé, não um valor
                // fixo: ele tem ~123px no desktop e quase o dobro no celular. E
                // `z-20` para ficar acima dele no empilhamento — com ambos em
                // z-10, quem vem depois no DOM (o rodapé) vencia, deixando os
                // botões visíveis mas não clicáveis.
                <div
                    ref={barraRef}
                    style={{bottom: `${alturaRodape + 24}px`}}
                    className="fixed left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2"
                >
                    {/*
                      Os anos NÃO aparecem aqui: a etiqueta no próprio nicho diz
                      que ano é aquela prateleira E serve de botão, enquanto uma
                      linha aqui embaixo repetia a informação longe do objeto.
                    */}
                    <div className="flex gap-2">
                        {CENAS.map((cena: {id: Viewpoint; rotulo: string}) => (
                            <button
                                key={cena.id}
                                onClick={() => {
                                    if (cena.id !== manualViewpoint) trackRoomSceneChanged(cena.id, 'botao');
                                    setManualViewpoint(cena.id);
                                }}
                                aria-current={manualViewpoint === cena.id ? 'true' : undefined}
                                className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${manualViewpoint === cena.id ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                            >
                                {cena.rotulo}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {/*
              Folhear o acervo com o livro aberto. z-40 para ficar acima do
              overlay do livro (z-30). Cada seta some quando não há vizinho
              daquele lado — assim dá pra sentir onde o acervo começa e termina.

              Posição muda por LARGURA DE TELA, não por `isMobile`: o problema é
              o card ocupar quase toda a largura, o que acontece igualmente numa
              janela de desktop estreita, onde `pointer: coarse` é falso. O corte
              é `lg` (1024px) por conta de uma continha: o card é `max-w-3xl`
              (768px) com 16px de respiro, e cada seta precisa de ~68px — só sobra
              faixa livre nas laterais a partir de ~904px de viewport. Abaixo
              disso elas descem para os cantos de baixo.
            */}
            {mode.kind === 'livro' && (vizinhos.anterior || vizinhos.proximo) && (
                <>
                    {vizinhos.anterior && (
                        <button
                            onClick={() => folhear(vizinhos.anterior, 'anterior')}
                            aria-label="Livro anterior"
                            className="fixed bottom-4 left-4 z-40 flex h-11 w-11 items-center
                                       justify-center rounded-full bg-black/60 text-xl text-white
                                       shadow-lg transition hover:bg-black/80
                                       lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
                        >
                            ‹
                        </button>
                    )}
                    {vizinhos.proximo && (
                        <button
                            onClick={() => folhear(vizinhos.proximo, 'proximo')}
                            aria-label="Próximo livro"
                            className="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center
                                       justify-center rounded-full bg-black/60 text-xl text-white
                                       shadow-lg transition hover:bg-black/80
                                       lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
                        >
                            ›
                        </button>
                    )}
                </>
            )}
            {mode.kind === 'sala' && indiceAberto && (
                <IndexPanel
                    tags={tags}
                    sortCriterio={sortCriterio}
                    onSortChange={mudarOrdenacao}
                    filtros={filtros}
                    onFilterChange={mudarFiltros}
                    onClose={fecharIndice}
                    visiveis={shelfBooksVisiveis.length}
                    total={shelfBooksBase.length}
                />
            )}
        </>
    );
}
