'use client';

import dynamic from 'next/dynamic';
import {usePathname} from 'next/navigation';
import {deriveLivrosMode} from '@/lib/livros-routing.mjs';
import type {RoomCanvasProps, LivrosMode} from '@/components/livros/RoomCanvas';

const RoomCanvas = dynamic(() => import('@/components/livros/RoomCanvas'), {ssr: false});

/**
 * Ativa a sala 3D em /livros (modo 'sala') e em /livros/<slug> (modo 'livro',
 * livro pré-aberto) — nunca em /livros/lista. `deriveLivrosMode` decide isso
 * ANTES de renderizar <RoomCanvas/>, então o `dynamic()` nunca carrega o
 * chunk de three/r3f/drei fora dessas duas rotas.
 */
export default function RoomCanvasLoader(props: Omit<RoomCanvasProps, 'mode'>) {
    const pathname = usePathname();
    // deriveLivrosMode vem de um .mjs sem tipos — o TS não estreita os
    // literais 'sala'/'livro' sozinho, daí o cast.
    const mode = deriveLivrosMode(pathname) as LivrosMode | null;
    if (!mode) return null;
    return <RoomCanvas {...props} mode={mode}/>;
}
