'use client';

import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';

/**
 * Amarelo deliberadamente abafado, não o amarelo saturado de tinta que
 * aparece na foto: a sala é iluminada como fim de tarde e passa por um
 * `<Bloom luminanceThreshold={0.6}>`, então um amarelo puro estouraria em
 * halo. Este tom lê como a mesma estante sob luz quente de abajur.
 */
const SHELF_COLOR = '#d9a441';

// Estante de pé, não de mesa.
const ALTURA = 1.7;

/**
 * Estante amarela aberta — o acento de cor do escritório real, e a única peça
 * de mobília da sala que não é marrom/madeira. Vive na parede lateral
 * esquerda (ver o porquê em Room.tsx), de lado para a câmera; por ter
 * profundidade de verdade ela continua lendo como estante nesse ângulo.
 *
 * Não confundir com a estante do acervo (`Bookshelf.tsx`): esta é cenário
 * puro, não tem livro nenhum do banco dentro. Os livros aqui são um modelo
 * decorativo, sem título nem clique.
 */
export default function YellowShelf({position, rotationY = 0}: {position: [number, number, number]; rotationY?: number}) {
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* O modelo tem um material só (`wood`) — recolorir é uma linha */}
            <KenneyModel url={MODELOS.estanteAmarela} alturaAlvo={ALTURA} cores={{wood: SHELF_COLOR}}/>

            {/* Trecos guardados, em duas prateleiras diferentes */}
            <KenneyModel
                url={MODELOS.livrosDecorativos}
                position={[-0.12, 0.52, 0.02]}
                alturaAlvo={0.16}
                cores={{carpetDarker: '#3f5f8a', carpetWhite: '#e8dcc8', plant: '#4a6b45', metal: '#8a3b3b'}}
            />
            <KenneyModel
                url={MODELOS.livrosDecorativos}
                position={[0.1, 1.08, 0.02]}
                rotation={[0, 0.4, 0]}
                alturaAlvo={0.16}
                cores={{carpetDarker: '#7a5a8a', carpetWhite: '#d9c9a8', plant: '#8a6a3b', metal: '#3b5f5a'}}
            />
        </group>
    );
}
