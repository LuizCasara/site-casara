'use client';

import dynamic from 'next/dynamic';
import {usePathname} from 'next/navigation';
import {deriveLivrosMode} from '@/lib/livros-routing.mjs';
import {useSalaMontada} from '@/components/livros/ContextoDaSala';
import type {RoomCanvasProps, LivrosMode} from '@/components/livros/RoomCanvas';

const RoomCanvas = dynamic(() => import('@/components/livros/RoomCanvas'), {ssr: false});

/**
 * Ativa a sala 3D em /livros (modo 'sala') e em /livros/<slug> (modo 'livro',
 * livro pré-aberto) — nunca em /livros/lista, e nunca num livro aberto A PARTIR
 * da listagem, que abre como modal sobre a grade (ver ContextoDaSala).
 *
 * As duas checagens acontecem ANTES de renderizar <RoomCanvas/>, então o
 * `dynamic()` nunca chega a baixar o chunk de three/r3f/drei fora das rotas em
 * que a cena aparece de verdade.
 */
export default function RoomCanvasLoader(props: Omit<RoomCanvasProps, 'mode'>) {
    const pathname = usePathname();
    const salaMontada = useSalaMontada();
    // deriveLivrosMode vem de um .mjs sem tipos — o TS não estreita os
    // literais 'sala'/'livro' sozinho, daí o cast.
    const mode = deriveLivrosMode(pathname) as LivrosMode | null;
    if (!mode || !salaMontada) return null;
    return <RoomCanvas {...props} mode={mode}/>;
}
