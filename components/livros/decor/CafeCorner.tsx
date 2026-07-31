'use client';

const TABLE_COLOR = '#4a3323';
const MAKER_BODY_COLOR = '#2b2b2b';
const MAKER_JUG_COLOR = '#8a6a4a';
const MAKER_LIGHT_COLOR = '#ff6a3d';

/**
 * Mesinha redonda com cafeteira — puro cenário, sem âncora e sem estado.
 * Fica ao lado da poltrona, formando o canto de leitura.
 */
export default function CafeCorner({position}: {position: [number, number, number]}) {
    return (
        <group position={position}>
            <mesh position={[0, 0.42, 0]}>
                <cylinderGeometry args={[0.26, 0.26, 0.03, 16]}/>
                <meshStandardMaterial color={TABLE_COLOR} roughness={0.6}/>
            </mesh>
            <mesh position={[0, 0.21, 0]}>
                <cylinderGeometry args={[0.04, 0.06, 0.42, 12]}/>
                <meshStandardMaterial color={TABLE_COLOR} roughness={0.7}/>
            </mesh>

            {/*
              Cafeteira, com uma lucezinha quente ligada — detalhe de aconchego.
              A origem do grupo é a SUPERFÍCIE do tampo (0.42 do centro + 0.015
              de meia-espessura), não o centro da mesinha: assim cada peça só
              precisa dizer o quanto sobe a partir do tampo, em vez de carregar
              a espessura da mesa na conta e acabar afundada nele.
            */}
            <group position={[0.08, 0.435, -0.05]}>
                <mesh position={[0, 0.07, 0]}>
                    <cylinderGeometry args={[0.05, 0.06, 0.14, 12]}/>
                    <meshStandardMaterial color={MAKER_BODY_COLOR} roughness={0.4} metalness={0.3}/>
                </mesh>
                <mesh position={[0, 0.04, 0.09]}>
                    <cylinderGeometry args={[0.045, 0.045, 0.08, 12]}/>
                    <meshStandardMaterial color={MAKER_JUG_COLOR} roughness={0.3} transparent opacity={0.85}/>
                </mesh>
                <mesh position={[0, 0.15, 0]}>
                    <sphereGeometry args={[0.008, 8, 8]}/>
                    <meshStandardMaterial color={MAKER_LIGHT_COLOR} emissive={MAKER_LIGHT_COLOR} emissiveIntensity={1.2}/>
                </mesh>
            </group>
        </group>
    );
}
