'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Canvas} from '@react-three/fiber';
import {EffectComposer, Bloom, N8AO, Vignette} from '@react-three/postprocessing';
import Room from '@/components/livros/Room';
import Bookshelf from '@/components/livros/Bookshelf';
import DeskBooks from '@/components/livros/DeskBooks';
import IndexSheet from '@/components/livros/IndexSheet';
import IndexPanel from '@/components/livros/IndexPanel';
import CameraRig, {type Viewpoint} from '@/components/livros/CameraRig';
import {useIsMobile} from '@/components/livros/use-is-mobile';
import {useFecharLivro} from '@/components/livros/use-fechar-livro';
import {useAlturaRodape, useAlturaDoElemento} from '@/components/livros/use-altura-rodape';
import {toShelfBooks} from '@/lib/book-dimensions.mjs';
import {NICHO_CAPACIDADE_M} from '@/lib/bookshelf-model.mjs';
import {agruparPorAnoDeLeitura, livrosDoGrupo} from '@/lib/shelf-years.mjs';
import {sortShelfBooks, filterShelfBooks, vizinhosDe} from '@/lib/livros-shelf.mjs';
import {CENAS, cenaVizinha} from '@/lib/livros-cenas.mjs';
import {buildSpineAtlas, type SpineAtlas} from '@/lib/spine-canvas';
import {
    trackRoomLoaded, trackListFallback, trackBookOpened,
    trackShelfSorted, trackIndexOpened,
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
    tags: string[];
    mode: LivrosMode;
};

type IndiceFiltros = {categoria: string | null; tag: string | null};

// Cache em módulo (sobrevive a desmontar/remontar RoomCanvas dentro da
// mesma sessão — ex.: ir e voltar entre /livros e /livros/lista via
// RoomCanvasLoader — mas reseta num reload de página, que é o esperado já
// que os dados vêm de novo do servidor a cada carga). buildSpineAtlas
// espera fonte carregar e desenha em canvas por livro; refazer isso do
// zero toda vez que o usuário alterna pra lista e volta é desperdício —
// o acervo 'lido' não muda entre essas duas trocas.
let atlasCache: {chave: string; atlas: SpineAtlas} | null = null;

function chaveAtlas(shelfBooks: {slug: string; thicknessM: number}[]): string {
    return shelfBooks.map((b) => `${b.slug}:${b.thicknessM}`).join('|');
}

/**
 * Heurística deliberadamente simples: não há um jeito confiável de medir GPU
 * pelo browser sem WebGL já ativo, então poucos núcleos de CPU é o sinal mais
 * barato de aparelho fraco. Pode ser refinada depois sem mudar o contrato
 * (o resto da sala só depende de receber um motivo string ou `null`).
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

export default function RoomCanvas({books, deskBooks, tags, mode}: RoomCanvasProps) {
    const router = useRouter();
    const openSlug = mode.kind === 'livro' ? mode.slug : null;

    const [manualViewpoint, setManualViewpoint] = useState<Viewpoint>('geral');
    const [atlas, setAtlas] = useState<SpineAtlas | null>(null);
    const [degradado, setDegradado] = useState(false);
    const [sortCriterio, setSortCriterio] = useState('padrao');
    const [filtros, setFiltros] = useState<IndiceFiltros>({categoria: null, tag: null});
    const [indiceAberto, setIndiceAberto] = useState(false);
    const [grupoFocado, setGrupoFocado] = useState<number | null>(null);
    const isMobile = useIsMobile();
    const fecharLivro = useFecharLivro();
    const alturaRodape = useAlturaRodape();
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const barraRef = useRef<HTMLDivElement>(null);

    // Base = todos os livros 'lido', na ordem que vieram do banco — o atlas
    // é gerado a partir desta lista (uma vez só, nunca refeito ao ordenar ou
    // filtrar). A lista visível na estante é derivada dela.
    const shelfBooksBase = useMemo(() => toShelfBooks(books), [books]);
    const deskShelfBooks = useMemo(() => toShelfBooks(deskBooks), [deskBooks]);
    const shelfBooksVisiveis = useMemo(
        () => sortShelfBooks(filterShelfBooks(shelfBooksBase, filtros), sortCriterio),
        [shelfBooksBase, filtros, sortCriterio],
    );
    // Os grupos de ano saem do acervo INTEIRO (não da lista filtrada), pelo
    // mesmo motivo que Bookshelf.tsx: filtrar esconde livros, nunca muda de
    // que ano é cada nicho.
    const grupos = useMemo(
        () => agruparPorAnoDeLeitura(shelfBooksBase, NICHO_CAPACIDADE_M),
        [shelfBooksBase],
    );

    // Quanto da base do canvas está tapado. Medido, não estimado: a barra
    // cresce de uma para duas linhas quando os anos não cabem lado a lado, o
    // que acontece no celular — e é justamente aí que um valor fixo deixava o
    // nicho mais baixo escondido atrás dos botões. `manualViewpoint` entra nas
    // dependências porque a linha dos anos só existe na cena da estante.
    const alturaBarra = useAlturaDoElemento(barraRef, [manualViewpoint, grupos.length, alturaRodape]);
    const cobertoEmbaixoPx = alturaRodape + alturaBarra + 24;

    // "animate" só nasce falso quando a página já chega com um livro aberto
    // (link direto/externo) — sem clique prévio, não há o que justificar
    // animar (ver spec, decisão "Link externo entrega conteúdo primeiro").
    // Nas trocas seguintes (fechar, abrir outro) sempre anima.
    //
    // Cuidado com a ordem: como o Canvas só renderiza depois que `atlas` fica
    // pronto (`if (!atlas) return null` abaixo), "primeira renderização do
    // componente" NÃO é o mesmo momento que "primeira renderização da cena
    // 3D" — `buildSpineAtlas` é assíncrono e só resolve depois do primeiro
    // commit. Por isso o ref abaixo só vira `true` quando `atlas` de fato
    // aparece, não no mount do componente.
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
    // "Estante" tem que começar do nível 1 de novo, não no zoom em que a
    // pessoa estava três cliques atrás.
    useEffect(() => {
        if (manualViewpoint !== 'estante') setGrupoFocado(null);
    }, [manualViewpoint]);

    // Clicar no ano já ativo sobe um nível (spec, D4) — é o mesmo gesto do
    // botão da barra e da etiqueta 3D, que disparam esta função.
    const selecionarGrupo = useCallback((indice: number) => {
        setGrupoFocado((atual) => (atual === indice ? null : indice));
    }, []);

    // Abrir um livro enquanto o índice está aberto não deveria deixar os
    // dois empilhados — nem deixar indiceAberto "verdadeiro" escondido no
    // estado depois que o livro fecha e mode volta a ser 'sala'.
    useEffect(() => {
        if (openSlug) setIndiceAberto(false);
    }, [openSlug]);

    // Folhear (← →) anda dentro do MESMO grupo em que o livro aberto está:
    // quem abriu um livro da estante percorre a estante na ordem que está
    // vendo (já ordenada e filtrada), quem abriu um da mesa percorre a mesa.
    // Misturar os dois faria a seta pular de um móvel pro outro sem que nada
    // na tela explicasse o salto.
    const vizinhos = useMemo(() => {
        if (!openSlug) return {anterior: null, proximo: null};
        const daMesa = deskShelfBooks.some((b: {slug: string}) => b.slug === openSlug);
        return vizinhosDe(daMesa ? deskShelfBooks : shelfBooksVisiveis, openSlug);
    }, [openSlug, deskShelfBooks, shelfBooksVisiveis]);

    // `replace`, não `push`: cada livro folheado viraria uma entrada no
    // histórico, e aí o "✕ fechar" (que é router.back()) passaria a voltar
    // pro livro anterior em vez de pra sala — depois de folhear cinco livros
    // seriam cinco "voltar" pra sair. Com replace o histórico continua com
    // uma entrada só e fechar significa sempre "voltar pra sala".
    const folhear = useCallback((slug: string | null) => {
        if (slug) router.replace(`/livros/${slug}`);
    }, [router]);

    // Um único listener para os três contextos, na ordem em que as camadas
    // aparecem na tela: livro aberto > índice aberto > sala. Sem esse
    // escalonamento, a seta trocaria a cena por baixo de um livro aberto.
    useEffect(() => {
        const aoTeclar = (e: KeyboardEvent) => {
            if (openSlug) {
                if (e.key === 'Escape') fecharLivro();
                else if (e.key === 'ArrowLeft') folhear(vizinhos.anterior);
                else if (e.key === 'ArrowRight') folhear(vizinhos.proximo);
                return;
            }
            if (indiceAberto) {
                if (e.key === 'Escape') setIndiceAberto(false);
                return;
            }
            // Esc na estante sobe um nível antes de qualquer outra coisa:
            // quem está com um ano em foco espera sair do zoom, não trocar de
            // cena.
            if (e.key === 'Escape' && grupoFocado !== null) {
                setGrupoFocado(null);
                return;
            }
            // cenaVizinha vem de um .mjs sem tipos — o TS não estreita os
            // literais do union Viewpoint sozinho, daí o cast (mesmo caso de
            // deriveLivrosMode em RoomCanvasLoader).
            if (e.key === 'ArrowLeft') setManualViewpoint(cenaVizinha(manualViewpoint, -1) as Viewpoint);
            else if (e.key === 'ArrowRight') setManualViewpoint(cenaVizinha(manualViewpoint, 1) as Viewpoint);
        };
        window.addEventListener('keydown', aoTeclar);
        return () => window.removeEventListener('keydown', aoTeclar);
    }, [openSlug, indiceAberto, manualViewpoint, grupoFocado, vizinhos, folhear, fecharLivro]);

    useEffect(() => {
        const motivo = detectaMotivoDegradacao();
        if (motivo) {
            if (mode.kind === 'sala') {
                trackListFallback(motivo);
                router.replace('/livros/lista');
            } else {
                // Em /livros/<slug> a página SSR já é um fallback completo —
                // degradar aqui é só "não mostrar o 3D", nunca redirecionar
                // pra longe de um conteúdo que já funciona sozinho.
                setDegradado(true);
            }
            return;
        }

        const chave = chaveAtlas(shelfBooksBase);
        if (atlasCache && atlasCache.chave === chave) {
            setAtlas(atlasCache.atlas);
            trackRoomLoaded(0, window.innerWidth < 768);
            return;
        }

        const inicio = performance.now();
        let cancelado = false;
        buildSpineAtlas(shelfBooksBase).then((resultado) => {
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

    // O ResizeObserver do R3F às vezes perde a primeira medição do container
    // e o canvas fica preso no tamanho padrão (300x150). Isso não é só
    // cosmético: o R3F só cria o renderer quando o container mede > 0
    // (`containerRect.width > 0 && containerRect.height > 0` no Canvas dele),
    // então um canvas não medido significa cena preta E nenhum evento de
    // ponteiro — sem hover, sem clique.
    //
    // A condição observada aqui é a real ("o canvas já tem a largura do
    // container?"), não um proxy: medir o wrapper não serve, porque ele é
    // `fixed inset-0` e já nasce estável, o que faria a checagem passar
    // enquanto o canvas continua errado. Sai assim que a condição vira
    // verdadeira (normalmente 1-2 frames); o limite de tempo é só rede de
    // segurança pra não girar pra sempre.
    useEffect(() => {
        if (!atlas) return;
        const wrapper = canvasWrapperRef.current;
        if (!wrapper) return;

        const LIMITE_MS = 5000;
        const INTERVALO_MS = 100;
        let timeoutId: ReturnType<typeof setTimeout>;
        let cancelado = false;
        let inicio = Date.now();

        // A condição real: o canvas já tem a largura do container? Medir o
        // wrapper não serve como proxy — ele é `fixed inset-0` e já nasce
        // com o tamanho certo, então a checagem passaria enquanto o canvas
        // continua em 300x150.
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

        // setTimeout, NÃO requestAnimationFrame: rAF fica suspenso enquanto
        // o documento está oculto, e o ResizeObserver do R3F também não
        // entrega nada nesse estado. Quem abre /livros numa aba em segundo
        // plano ficaria com o canvas preso em 300x150 — e, como o R3F só cria
        // o renderer quando o container mede > 0, isso significa sala preta
        // e sem nenhum evento de ponteiro, não só um canvas do tamanho
        // errado. Timers continuam rodando com a aba oculta; o
        // visibilitychange abaixo cobre o caso de a aba voltar depois do
        // limite de tempo ter estourado.
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

    const viewpoint: Viewpoint = openSlug ? 'livro' : (indiceAberto ? 'indice' : manualViewpoint);

    const abrirIndice = () => {
        setIndiceAberto(true);
        trackIndexOpened(filtros.categoria, filtros.tag);
    };
    const fecharIndice = () => setIndiceAberto(false);
    const mudarOrdenacao = (criterio: string) => {
        setSortCriterio(criterio);
        trackShelfSorted(criterio);
    };

    return (
        <>
            {/*
              z-0, NÃO -z-10: com z-index negativo o canvas é pintado atrás do
              conteúdo in-flow do documento, e o `<main className="flex-grow">`
              do layout raiz — transparente, mas ocupando a viewport inteira —
              vira o alvo de todo hit-test. A cena aparecia normalmente (o
              main não tem fundo) mas o R3F nunca recebia pointer event
              nenhum: sem hover, sem clique em livro, sem clique na folha do
              índice. Quem precisa ficar acima da sala declara isso
              explicitamente (Footer, o card de /livros/[slug], os botões de
              viewpoint em z-10, os overlays em z-20).
            */}
            <div ref={canvasWrapperRef} className="fixed inset-0 z-0">
                <Canvas shadows camera={{fov: 50}} dpr={isMobile ? 1 : [1, 2]}>
                    <Room gruposDeAno={grupos.length}/>
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
                    {mode.kind === 'sala' && <IndexSheet onOpen={abrirIndice} isMobile={isMobile}/>}
                    <CameraRig
                        viewpoint={viewpoint}
                        animate={animateTransitions}
                        grupoFocado={grupoFocado}
                        totalGrupos={grupos.length}
                        cobertoEmbaixoPx={cobertoEmbaixoPx}
                    />
                    {/*
                      Ordem importa: N8AO primeiro, Bloom depois, Vignette por
                      último. O AO precisa rodar sobre a cena ainda "crua" —
                      se viesse depois do Bloom, ele leria o halo da luz como
                      geometria e escureceria em volta do brilho.

                      N8AO é oclusão de ambiente em espaço de tela: escurece
                      as frestas onde duas superfícies se encontram (perna de
                      mesa com o chão, livro com a prancha). É o que faz um
                      objeto parecer APOIADO em vez de colado por cima — sem
                      ele, uma cena de primitivas lê como adesivos flutuando,
                      por mais correta que a geometria esteja. `halfRes` roda
                      o efeito em meia resolução: o AO é um sinal suave e de
                      baixa frequência, então a perda é invisível e o custo
                      cai perto da metade.
                    */}
                    <EffectComposer>
                        {/*
                          aoRadius em METROS de mundo, não em pixels: 0.16 é
                          escolhido pra escala desta sala (livro de ~3cm de
                          lombada, mesa de 70cm). Em 0.45 o efeito existia mas
                          lia como um escurecimento geral e sujo, não como
                          contato — a fresta entre dois objetos e o meio de
                          uma parede vazia recebiam quase a mesma coisa.
                          `halfRes` fica só no mobile: com raio apertado, meia
                          resolução borra justamente a marca fina que a gente
                          quer.
                        */}
                        <N8AO
                            aoRadius={0.16}
                            distanceFalloff={0.6}
                            intensity={6}
                            quality={isMobile ? 'performance' : 'high'}
                            halfRes={isMobile}
                            color="#140c06"
                        />
                        <Bloom intensity={0.4} luminanceThreshold={0.6}/>
                        <Vignette darkness={0.45} offset={0.35}/>
                    </EffectComposer>
                </Canvas>
            </div>
            {mode.kind === 'sala' && !indiceAberto && (
                // `bottom` medido a partir da altura real do rodapé, não um
                // valor fixo: o rodapé tem ~123px no desktop e quase o dobro
                // no celular (o texto quebra em mais linhas), então um
                // `bottom-36` calibrado no desktop volta a ficar por baixo
                // dele em tela estreita. `z-20` os coloca acima do rodapé no
                // empilhamento (ambos estavam em z-10, e no empate quem vem
                // depois no DOM — o rodapé — vencia, deixando os botões
                // visíveis mas não clicáveis).
                <div
                    ref={barraRef}
                    style={{bottom: `${alturaRodape + 24}px`}}
                    className="fixed left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2"
                >
                    {/*
                      Sub-nível: só existe na cena da estante. Fica ACIMA da
                      linha de cenas porque é um nível abaixo dela na
                      navegação — a linha de baixo é onde você está, a de cima
                      é dentro de onde você está.
                    */}
                    {manualViewpoint === 'estante' && (
                        <div className="flex flex-wrap justify-center gap-2 px-4">
                            {grupos.map((grupo: {rotulo: string}, i: number) => {
                                const visiveis = livrosDoGrupo(grupo, shelfBooksVisiveis).length;
                                const total = livrosDoGrupo(grupo, shelfBooksBase).length;
                                const filtrado = visiveis !== total;
                                return (
                                    <button
                                        key={grupo.rotulo}
                                        onClick={() => selecionarGrupo(i)}
                                        disabled={visiveis === 0}
                                        aria-current={grupoFocado === i ? 'true' : undefined}
                                        className={`rounded-full px-3 py-1 text-xs font-semibold shadow-lg transition
                                                    disabled:cursor-not-allowed disabled:opacity-40 ${
                                            grupoFocado === i ? 'bg-white text-black' : 'bg-black/60 text-white'
                                        }`}
                                    >
                                        {grupo.rotulo}{filtrado && ` · ${visiveis}`}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex gap-2">
                        {CENAS.map((cena: {id: Viewpoint; rotulo: string}) => (
                            <button
                                key={cena.id}
                                onClick={() => setManualViewpoint(cena.id)}
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
              daquele lado — assim dá pra sentir onde o acervo começa e
              termina, em vez de dar a volta silenciosamente.

              Posição muda por LARGURA DE TELA, não por `isMobile`: o problema
              aqui é o card ocupar quase toda a largura, o que acontece
              igualmente numa janela de desktop estreita, onde `pointer:
              coarse` é falso.

              O corte é `lg` (1024px) e não `sm` por conta de uma continha: o
              card é `max-w-3xl` (768px) com 16px de respiro, e cada seta
              precisa de ~68px (16 de margem + 44 de largura + folga). Só sobra
              faixa livre nas laterais a partir de ~904px de viewport — em
              657px, por exemplo, a seta ainda cairia em cima do card.
              Abaixo disso elas descem para os cantos de baixo, na faixa que
              sobra sob o card (que é `max-h-[85vh]`). O rodapé não é
              atropelado aí porque o overlay `inset-0` já cobre a tela inteira
              enquanto o livro está aberto.
            */}
            {mode.kind === 'livro' && (vizinhos.anterior || vizinhos.proximo) && (
                <>
                    {vizinhos.anterior && (
                        <button
                            onClick={() => folhear(vizinhos.anterior)}
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
                            onClick={() => folhear(vizinhos.proximo)}
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
                    onFilterChange={setFiltros}
                    onClose={fecharIndice}
                />
            )}
        </>
    );
}
