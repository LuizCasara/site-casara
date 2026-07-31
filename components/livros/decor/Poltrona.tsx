'use client';

import {DoubleSide} from 'three';

const POLTRONA_COLOR = '#c9b9a3';
const LEG_COLOR = '#5c4326';
const ALMOFADA_A_COLOR = '#d9724c';
const ALMOFADA_B_COLOR = '#2f3e57';
const LAMP_POLE_COLOR = '#2b2320';
const LAMP_SHADE_COLOR = '#e8d9b5';
const LAMP_LIGHT_COLOR = '#ffb877';

const LARGURA = 0.8;
const PROFUNDIDADE = 0.7;
const ALTURA_ASSENTO = 0.28;
const ALTURA_PERNA = 0.14;

/**
 * Poltrona de leitura com abajur ao lado. Substitui o "sofá terracota" que o
 * plano original previa: as fotos do escritório real mostram uma poltrona
 * única, creme, com uma almofada geométrica colorida — que acaba sendo o
 * único ponto de cor viva da sala fora do amarelo da estante, e por isso vale
 * mais como acento do que um sofá inteiro na mesma cor da parede.
 *
 * Puro cenário: sem âncora em ROOM_ANCHORS, sem clique, sem estado.
 */
export default function Poltrona({position, rotationY = 0}: {position: [number, number, number]; rotationY?: number}) {
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* Assento */}
            <mesh position={[0, ALTURA_PERNA + ALTURA_ASSENTO / 2, 0]}>
                <boxGeometry args={[LARGURA, ALTURA_ASSENTO, PROFUNDIDADE]}/>
                <meshStandardMaterial color={POLTRONA_COLOR} roughness={0.95}/>
            </mesh>

            {/* Encosto */}
            <mesh position={[0, ALTURA_PERNA + 0.44, -PROFUNDIDADE / 2 + 0.07]}>
                <boxGeometry args={[LARGURA, 0.5, 0.14]}/>
                <meshStandardMaterial color={POLTRONA_COLOR} roughness={0.95}/>
            </mesh>

            {/* Braços */}
            {[-LARGURA / 2 - 0.06, LARGURA / 2 + 0.06].map((x) => (
                <mesh key={x} position={[x, ALTURA_PERNA + 0.26, 0]}>
                    <boxGeometry args={[0.12, 0.24, PROFUNDIDADE]}/>
                    <meshStandardMaterial color={POLTRONA_COLOR} roughness={0.95}/>
                </mesh>
            ))}

            {/* Pernas finas de madeira, como na foto */}
            {[
                [-LARGURA / 2 + 0.06, PROFUNDIDADE / 2 - 0.06],
                [LARGURA / 2 - 0.06, PROFUNDIDADE / 2 - 0.06],
                [-LARGURA / 2 + 0.06, -PROFUNDIDADE / 2 + 0.06],
                [LARGURA / 2 - 0.06, -PROFUNDIDADE / 2 + 0.06],
            ].map(([x, z]) => (
                <mesh key={`${x},${z}`} position={[x, ALTURA_PERNA / 2, z]}>
                    <cylinderGeometry args={[0.018, 0.014, ALTURA_PERNA, 8]}/>
                    <meshStandardMaterial color={LEG_COLOR} roughness={0.7}/>
                </mesh>
            ))}

            {/*
              Almofada geométrica — dois blocos sobrepostos e levemente
              girados entre si sugerem o padrão de losangos da almofada real
              sem precisar de textura nenhuma.
            */}
            <group position={[0.04, ALTURA_PERNA + 0.34, -0.14]} rotation={[-0.35, 0.12, 0]}>
                <mesh>
                    <boxGeometry args={[0.32, 0.3, 0.09]}/>
                    <meshStandardMaterial color={ALMOFADA_A_COLOR} roughness={0.9}/>
                </mesh>
                <mesh position={[-0.02, -0.03, 0.048]} rotation={[0, 0, 0.7]}>
                    <boxGeometry args={[0.17, 0.17, 0.01]}/>
                    <meshStandardMaterial color={ALMOFADA_B_COLOR} roughness={0.9}/>
                </mesh>
            </group>

            {/*
              Abajur de leitura — mesma cor quente da luz perto da estante.
              Fica no lado de FORA da poltrona (x negativo, longe do centro da
              sala) de propósito: com 1,2m de altura, plantado do lado de
              dentro ele entrava na linha de visão entre a câmera "geral" e a
              estante de livros, tapando parte do acervo — que é justamente o
              motivo da sala existir.
            */}
            <group position={[-LARGURA / 2 - 0.3, 0, 0.1]}>
                <mesh position={[0, 0.6, 0]}>
                    <cylinderGeometry args={[0.015, 0.02, 1.2, 8]}/>
                    <meshStandardMaterial color={LAMP_POLE_COLOR}/>
                </mesh>
                <mesh position={[0, 1.22, 0]}>
                    <coneGeometry args={[0.16, 0.2, 16, 1, true]}/>
                    {/* DoubleSide: o cone é aberto (`openEnded`), então sem
                        isso a cúpula some quando vista de baixo. */}
                    <meshStandardMaterial color={LAMP_SHADE_COLOR} emissive={LAMP_LIGHT_COLOR} emissiveIntensity={0.4} side={DoubleSide}/>
                </mesh>
                <pointLight position={[0, 1.15, 0]} color={LAMP_LIGHT_COLOR} intensity={12} distance={3} decay={2}/>
            </group>
        </group>
    );
}
