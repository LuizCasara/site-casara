'use client';

import {Sparkles} from '@react-three/drei';

export const ROOM_ANCHORS = {
    estante: {
        position: [0, 0.9, -1.4] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
};

const FLOOR_COLOR = '#3a2f2b';
const WALL_COLOR = '#2b2320';
const SHELF_BOARD_COLOR = '#1f1713';

/**
 * Cenário puro — não sabe que livros existem. Publica ROOM_ANCHORS
 * (posição/rotação) para que Bookshelf.tsx e CameraRig.tsx se posicionem a
 * partir daqui, sem nenhuma lógica de livro vazar para este arquivo.
 */
export default function Room() {
    const estante = ROOM_ANCHORS.estante;

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[6, 6]}/>
                <meshStandardMaterial color={FLOOR_COLOR} roughness={0.9}/>
            </mesh>

            <mesh position={[0, 1.5, -1.6]}>
                <planeGeometry args={[6, 3]}/>
                <meshStandardMaterial color={WALL_COLOR} roughness={1}/>
            </mesh>

            {/* Prancha física da prateleira — os livros assentam no topo dela. */}
            <mesh position={[estante.position[0], estante.position[1] - 0.02, estante.position[2]]}>
                <boxGeometry args={[1.4, 0.04, 0.2]}/>
                <meshStandardMaterial color={SHELF_BOARD_COLOR} roughness={0.6}/>
            </mesh>

            {/*
              Intensidades em candela — o three.js (r155+) usa luz fisicamente
              correta por padrão, então os valores "de sensação" de versões
              antigas (ex.: 3-6) ficam quase invisíveis. 40/25 aqui é o que
              realmente ilumina uma sala pequena a poucos metros de distância.
            */}
            <pointLight position={[1.3, 1.7, 0.6]} color="#ffb877" intensity={40} distance={6} decay={2}/>
            <pointLight position={[0, 2.1, -1.55]} color="#9fd8ff" intensity={25} distance={5} decay={2}/>
            <hemisphereLight color="#8899aa" groundColor="#1a1410" intensity={0.6}/>
            <ambientLight intensity={0.15}/>

            <Sparkles count={40} scale={[2, 2, 2]} position={[1, 1.5, 0.3]} size={2} speed={0.15} color="#ffd9a0" opacity={0.35}/>
        </group>
    );
}
