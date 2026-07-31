'use client';

const POT_COLOR = '#a05a3a';
const LEAF_COLOR = '#3f7a4a';
const BOARD_GAME_COLOR = '#8a3b2e';
const BOARD_GAME_LID_COLOR = '#c9a24a';
const CONTROLLER_COLOR = '#2b2b2b';
const HEADPHONE_COLOR = '#1a1a1a';
const VINYL_COLOR = '#111111';
const VINYL_LABEL_COLOR = '#c9432e';

type PropPosition = {position: [number, number, number]};

export function Planta({position}: PropPosition) {
    return (
        <group position={position}>
            <mesh position={[0, 0.06, 0]}>
                <cylinderGeometry args={[0.06, 0.05, 0.1, 10]}/>
                <meshStandardMaterial color={POT_COLOR} roughness={0.9}/>
            </mesh>
            <mesh position={[0, 0.16, 0]}>
                <icosahedronGeometry args={[0.08, 0]}/>
                <meshStandardMaterial color={LEAF_COLOR} roughness={0.8} flatShading/>
            </mesh>
        </group>
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

export function ControleDeVideogame({position}: PropPosition) {
    return (
        <group position={position}>
            <mesh>
                <boxGeometry args={[0.14, 0.03, 0.08]}/>
                <meshStandardMaterial color={CONTROLLER_COLOR} roughness={0.5}/>
            </mesh>
            {[-0.04, 0.04].map((x) => (
                <mesh key={x} position={[x, 0, 0.03]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.02, 8]}/>
                    <meshStandardMaterial color="#555555"/>
                </mesh>
            ))}
        </group>
    );
}

export function FoneDeOuvido({position}: PropPosition) {
    return (
        <group position={position}>
            <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.07, 0.008, 8, 16, Math.PI]}/>
                <meshStandardMaterial color={HEADPHONE_COLOR}/>
            </mesh>
            {[-0.07, 0.07].map((x) => (
                <mesh key={x} position={[x, 0.05, 0]}>
                    <cylinderGeometry args={[0.025, 0.025, 0.03, 12]}/>
                    <meshStandardMaterial color={HEADPHONE_COLOR}/>
                </mesh>
            ))}
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
