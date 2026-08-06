'use client';

import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';

/**
 * Altura do tampo em metros. Como KenneyModel assenta a base em Y=0, este número
 * É a altura do tampo — e é o que ROOM_ANCHORS.mesa usa como Y.
 */
export const ALTURA_MESA_CENTRO = 0.26;

/**
 * Largura do tampo, pedida SEPARADA da altura ao KenneyModel: o modelo é uma
 * mesa de canto (alta e estreita) fazendo papel de mesa de centro (baixa e
 * larga), então escalar proporcionalmente não serve — na altura certa o tampo
 * ficaria com 35cm, e um livro deitado tem 0,30 x 0,20m nesta escala. O
 * resultado é o mesmo móvel com as pernas achatadas.
 */
export const LARGURA_MESA_CENTRO = 0.78;

/**
 * Mesa de centro à frente da poltrona (modelo do Kenney, CC0).
 *
 * **Nada em cima que seja cenário**: o tampo é da pilha de "lendo agora"
 * (DeskBooks.tsx), e enfeite ali competiria com ela por um tampo pequeno. A
 * xícara é a exceção, e mora em Room.tsx.
 *
 * Puro cenário: sem estado e sem clique.
 */
export default function MesaDeCentro({position, rotationY = 0}: {position: [number, number, number]; rotationY?: number}) {
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <KenneyModel
                url={MODELOS.mesinha}
                alturaAlvo={ALTURA_MESA_CENTRO}
                larguraAlvo={LARGURA_MESA_CENTRO}
                cores={{wood: '#4a3323', _defaultMat: '#3a2a1e'}}
            />
        </group>
    );
}
