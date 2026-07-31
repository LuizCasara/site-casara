'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Canvas} from '@react-three/fiber';
import {EffectComposer, Bloom} from '@react-three/postprocessing';
import Room from '@/components/livros/Room';
import Bookshelf from '@/components/livros/Bookshelf';
import DeskBooks from '@/components/livros/DeskBooks';
import IndexSheet from '@/components/livros/IndexSheet';
import IndexPanel from '@/components/livros/IndexPanel';
import CameraRig, {type Viewpoint} from '@/components/livros/CameraRig';
import {useIsMobile} from '@/components/livros/use-is-mobile';
import {toShelfBooks, shelfWidthM} from '@/lib/book-dimensions.mjs';
import {sortShelfBooks, filterShelfBooks} from '@/lib/livros-shelf.mjs';
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
    const isMobile = useIsMobile();
    const canvasWrapperRef = useRef<HTMLDivElement>(null);

    // Base = todos os livros 'lido', na ordem que vieram do banco — o atlas
    // é gerado a partir desta lista (uma vez só, nunca refeito ao ordenar ou
    // filtrar). A lista visível na estante é derivada dela.
    const shelfBooksBase = useMemo(() => toShelfBooks(books), [books]);
    const deskShelfBooks = useMemo(() => toShelfBooks(deskBooks), [deskBooks]);
    const shelfBooksVisiveis = useMemo(
        () => sortShelfBooks(filterShelfBooks(shelfBooksBase, filtros), sortCriterio),
        [shelfBooksBase, filtros, sortCriterio],
    );
    const larguraEstanteM = useMemo(() => shelfWidthM(shelfBooksVisiveis), [shelfBooksVisiveis]);

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

    // Abrir um livro enquanto o índice está aberto não deveria deixar os
    // dois empilhados — nem deixar indiceAberto "verdadeiro" escondido no
    // estado depois que o livro fecha e mode volta a ser 'sala'.
    useEffect(() => {
        if (openSlug) setIndiceAberto(false);
    }, [openSlug]);

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
                    <Room/>
                    <Bookshelf shelfBooks={shelfBooksVisiveis} atlas={atlas} openSlug={openSlug} animate={animateTransitions} isMobile={isMobile}/>
                    <DeskBooks deskBooks={deskShelfBooks} atlas={atlas} openSlug={openSlug} animate={animateTransitions} isMobile={isMobile}/>
                    {mode.kind === 'sala' && <IndexSheet onOpen={abrirIndice} isMobile={isMobile}/>}
                    <CameraRig viewpoint={viewpoint} animate={animateTransitions} isMobile={isMobile} shelfWidthM={larguraEstanteM}/>
                    <EffectComposer>
                        <Bloom intensity={0.4} luminanceThreshold={0.6}/>
                    </EffectComposer>
                </Canvas>
            </div>
            {mode.kind === 'sala' && !indiceAberto && (
                // `bottom-36` levanta os botões acima do rodapé (≈123px de
                // altura), que antes ficava por cima deles; `z-20` os coloca
                // acima do rodapé no empilhamento (ambos estavam em z-10, e
                // no empate quem vem depois no DOM — o rodapé — vencia,
                // deixando os botões visíveis mas não clicáveis).
                <div className="fixed bottom-36 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                    <button
                        onClick={() => setManualViewpoint('geral')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${manualViewpoint === 'geral' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                    >
                        Sala
                    </button>
                    <button
                        onClick={() => setManualViewpoint('estante')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${manualViewpoint === 'estante' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                    >
                        Estante
                    </button>
                    <button
                        onClick={() => setManualViewpoint('mesa')}
                        className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${manualViewpoint === 'mesa' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                    >
                        Mesa
                    </button>
                </div>
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
