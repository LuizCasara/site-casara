'use client';

import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';

const BOARD_GAME_COLOR = '#8a3b2e';
const BOARD_GAME_LID_COLOR = '#c9a24a';
const VINYL_COLOR = '#111111';
const VINYL_LABEL_COLOR = '#c9432e';

type PropPosition = {position: [number, number, number]};

/**
 * Planta em vaso — modelo do Kenney (CC0). 42cm de altura porque ela fica EM CIMA
 * da mesinha: no tamanho de planta de chão passaria da cabeça de quem
 * estivesse sentado na poltrona ao lado.
 */
export function Planta({position}: PropPosition) {
    return (
        <KenneyModel
            url={MODELOS.planta}
            position={position}
            alturaAlvo={0.42}
            cores={{wood: '#a05a3a', woodDark: '#7a3f28', plant: '#3f7a4a'}}
        />
    );
}

export function JogoDeTabuleiro({position}: PropPosition) {
    return (
        <group position={position}>
            <mesh>
                <boxGeometry args={[0.2, 0.04, 0.28]}/>
                <meshStandardMaterial color={BOARD_GAME_COLOR} roughness={0.7}/>
            </mesh>
            <mesh position={[0, 0.021, 0]}>
                <boxGeometry args={[0.16, 0.002, 0.22]}/>
                <meshStandardMaterial color={BOARD_GAME_LID_COLOR} roughness={0.6}/>
            </mesh>
        </group>
    );
}

/**
 * Rotação em X, não em Z: o eixo do `cylinderGeometry` é Y, então girar em Z
 * deixaria a normal do disco apontando pro lado — visto da câmera da sala, um
 * vinil "de perfil" é uma listra de 4mm, praticamente invisível. Girando em X
 * a face do disco encara a câmera, e o -0.15 dá a inclinação de quem deixou o
 * disco encostado num móvel.
 */
export function Vinil({position}: PropPosition) {
    return (
        <group position={position} rotation={[Math.PI / 2 - 0.15, 0, 0]}>
            <mesh>
                <cylinderGeometry args={[0.09, 0.09, 0.004, 24]}/>
                <meshStandardMaterial color={VINYL_COLOR} roughness={0.3}/>
            </mesh>
            <mesh position={[0, 0.003, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.006, 16]}/>
                <meshStandardMaterial color={VINYL_LABEL_COLOR}/>
            </mesh>
        </group>
    );
}
