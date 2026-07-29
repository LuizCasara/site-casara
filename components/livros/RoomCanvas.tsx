'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Canvas} from '@react-three/fiber';
import {EffectComposer, Bloom} from '@react-three/postprocessing';
import Room from '@/components/livros/Room';
import Bookshelf from '@/components/livros/Bookshelf';
import CameraRig, {type Viewpoint} from '@/components/livros/CameraRig';
import {toShelfBooks} from '@/lib/book-dimensions.mjs';
import {buildSpineAtlas, type SpineAtlas} from '@/lib/spine-canvas';
import {trackRoomLoaded, trackListFallback} from '@/utils/analytics';

export type ShelvedBookInput = {
    slug: string;
    title: string;
    author: string | null;
    rating: string | null;
    pages: number | null;
    spine_color: string | null;
};

export type RoomCanvasProps = {
    books: ShelvedBookInput[];
};

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

export default function RoomCanvas({books}: RoomCanvasProps) {
    const router = useRouter();
    const [viewpoint, setViewpoint] = useState<Viewpoint>('geral');
    const [atlas, setAtlas] = useState<SpineAtlas | null>(null);

    const shelfBooks = useMemo(() => toShelfBooks(books), [books]);

    useEffect(() => {
        const motivo = detectaMotivoDegradacao();
        if (motivo) {
            trackListFallback(motivo);
            router.replace('/livros/lista');
            return;
        }

        const inicio = performance.now();
        let cancelado = false;
        buildSpineAtlas(shelfBooks).then((resultado) => {
            if (cancelado) return;
            setAtlas(resultado);
            trackRoomLoaded(Math.round(performance.now() - inicio), window.innerWidth < 768);
        });
        return () => {
            cancelado = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!atlas) return null;

    return (
        <>
            <div className="fixed inset-0 -z-10">
                <Canvas shadows camera={{fov: 50}}>
                    <Room/>
                    <Bookshelf shelfBooks={shelfBooks} atlas={atlas}/>
                    <CameraRig viewpoint={viewpoint}/>
                    <EffectComposer>
                        <Bloom intensity={0.4} luminanceThreshold={0.6}/>
                    </EffectComposer>
                </Canvas>
            </div>
            <div className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
                <button
                    onClick={() => setViewpoint('geral')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${viewpoint === 'geral' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                >
                    Sala
                </button>
                <button
                    onClick={() => setViewpoint('estante')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${viewpoint === 'estante' ? 'bg-white text-black' : 'bg-black/60 text-white'}`}
                >
                    Estante
                </button>
            </div>
        </>
    );
}
