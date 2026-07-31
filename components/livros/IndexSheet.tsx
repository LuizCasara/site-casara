'use client';

import {useState} from 'react';
import {ROOM_ANCHORS} from '@/components/livros/Room';

const SHEET_COLOR = '#e8e2d5';
const SHEET_HOVER_LIFT_M = 0.01;

/**
 * A folha do índice — objeto físico sobre a mesa (ver spec, "Interações").
 * Clicar chama `onOpen`; RoomCanvas.tsx decide o que isso significa (trocar
 * viewpoint pra 'indice' e mostrar o IndexPanel). Este componente não sabe
 * nada sobre filtros/ordenação — só é a superfície clicável.
 */
export default function IndexSheet({onOpen, isMobile}: {onOpen: () => void; isMobile: boolean}) {
    const anchor = ROOM_ANCHORS.indice;
    const [hovered, setHovered] = useState(false);
    const y = anchor.position[1] + (hovered ? SHEET_HOVER_LIFT_M : 0);

    return (
        <mesh
            position={[anchor.position[0], y, anchor.position[2]]}
            rotation={anchor.rotation}
            onPointerOver={(e) => {
                // Mesmo motivo do guard em Book.tsx: toque sintetiza
                // pointerover sem um pointerout correspondente, deixando a
                // folha presa "levantada" pra sempre num aparelho touch.
                if (isMobile) return;
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                if (isMobile) return;
                e.stopPropagation();
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
                e.stopPropagation();
                onOpen();
            }}
        >
            <planeGeometry args={[0.18, 0.24]}/>
            <meshStandardMaterial color={SHEET_COLOR} roughness={0.95}/>
        </mesh>
    );
}
