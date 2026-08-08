'use client';

import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';

/** Objetos pessoais espalhados pela sala. */

type PropPosition = {position: [number, number, number]};

/**
 * Planta em vaso — modelo do Kenney (CC0).
 *
 * A altura é prop porque o mesmo vaso serve de dois jeitos: ~42cm em cima de um
 * móvel (mais que isso passa da cabeça de quem senta na poltrona ao lado) e
 * ~90cm como planta de chão, onde 42cm sumiria atrás do primeiro móvel. O
 * default é o tamanho de mesa, o mais restritivo.
 */
export function Planta({position, alturaM = 0.42}: PropPosition & {alturaM?: number}) {
    return (
        <KenneyModel
            url={MODELOS.planta}
            position={position}
            alturaAlvo={alturaM}
            cores={{wood: '#a05a3a', woodDark: '#7a3f28', plant: '#3f7a4a'}}
        />
    );
}
