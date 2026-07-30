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
import {toShelfBooks} from '@/lib/book-dimensions.mjs';
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

    // Base = todos os livros 'lido', na ordem que vieram do banco — o atlas
    // é gerado a partir desta lista (uma vez só, nunca refeito ao ordenar ou
    // filtrar). A lista visível na estante é derivada dela.
    const shelfBooksBase = useMemo(() => toShelfBooks(books), [books]);
    const deskShelfBooks = useMemo(() => toShelfBooks(deskBooks), [deskBooks]);
    const shelfBooksVisiveis = useMemo(
        () => sortShelfBooks(filterShelfBooks(shelfBooksBase, filtros), sortCriterio),
        [shelfBooksBase, filtros, sortCriterio],
    );

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

        const inicio = performance.now();
        let cancelado = false;
        buildSpineAtlas(shelfBooksBase).then((resultado) => {
            if (cancelado) return;
            setAtlas(resultado);
            trackRoomLoaded(Math.round(performance.now() - inicio), window.innerWidth < 768);
        });
        return () => {
            cancelado = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // O <Canvas> às vezes monta antes do layout do `fixed inset-0` acima
    // estabilizar, e o ResizeObserver do R3F perde essa primeira medição —
    // o canvas fica preso no tamanho padrão (300x150) até algo mais disparar
    // um resize de verdade. Um `requestAnimationFrame` sozinho dispara cedo
    // demais (o observer ainda não tinha se conectado); alguns retries com
    // atraso crescente cobrem a janela real sem custo perceptível quando o
    // tamanho já estava certo desde o início.
    useEffect(() => {
        if (!atlas) return;
        const atrasos = [0, 100, 300, 600];
        const ids = atrasos.map((ms) => setTimeout(() => window.dispatchEvent(new Event('resize')), ms));
        return () => ids.forEach(clearTimeout);
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
            <div className="fixed inset-0 -z-10">
                <Canvas shadows camera={{fov: 50}}>
                    <Room/>
                    <Bookshelf shelfBooks={shelfBooksVisiveis} atlas={atlas} openSlug={openSlug} animate={animateTransitions}/>
                    <DeskBooks deskBooks={deskShelfBooks} atlas={atlas} openSlug={openSlug} animate={animateTransitions}/>
                    {mode.kind === 'sala' && <IndexSheet onOpen={abrirIndice}/>}
                    <CameraRig viewpoint={viewpoint} animate={animateTransitions}/>
                    <EffectComposer>
                        <Bloom intensity={0.4} luminanceThreshold={0.6}/>
                    </EffectComposer>
                </Canvas>
            </div>
            {mode.kind === 'sala' && !indiceAberto && (
                <div className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
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
            {indiceAberto && (
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
