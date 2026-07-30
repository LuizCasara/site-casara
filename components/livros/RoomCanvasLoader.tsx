'use client';

import dynamic from 'next/dynamic';
import {usePathname} from 'next/navigation';
import type {RoomCanvasProps} from '@/components/livros/RoomCanvas';

const RoomCanvas = dynamic(() => import('@/components/livros/RoomCanvas'), {ssr: false});

/**
 * Só a rota exata /livros ativa a sala nesta fase — /livros/lista e
 * /livros/[slug] continuam 100% SSR, sem pagar o bundle de three/r3f/drei.
 * A checagem de pathname acontece ANTES de renderizar <RoomCanvas/>, então o
 * `dynamic()` nunca dispara o carregamento do chunk fora de /livros.
 */
export default function RoomCanvasLoader(props: RoomCanvasProps) {
    const pathname = usePathname();
    if (pathname !== '/livros') return null;
    return <RoomCanvas {...props}/>;
}
