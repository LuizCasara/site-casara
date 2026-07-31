'use client';

import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';

const MAKER_BODY_COLOR = '#2b2b2b';
const MAKER_JUG_COLOR = '#8a6a4a';
const MAKER_LIGHT_COLOR = '#ff6a3d';

// Altura de mesa de canto. TAMPO_Y é a MESMA medida: como KenneyModel
// assenta a base em Y=0, a altura pedida é exatamente onde fica o tampo.
const ALTURA_MESINHA = 0.55;
const TAMPO_Y = ALTURA_MESINHA;

/**
 * Mesinha de canto (modelo do Kenney, CC0) com a cafeteira por cima. A
 * cafeteira continua sendo primitiva porque o Furniture Kit não tem uma — e
 * um cilindro escuro com um pontinho laranja aceso resolve bem a esta
 * distância.
 *
 * Puro cenário, sem âncora e sem estado.
 */
export default function CafeCorner({position}: {position: [number, number, number]}) {
    return (
        <group position={position}>
            <KenneyModel url={MODELOS.mesinha} alturaAlvo={ALTURA_MESINHA} cores={{wood: '#4a3323', _defaultMat: '#3a2a1e'}}/>

            {/*
              A origem do grupo é a SUPERFÍCIE do tampo, não o chão: assim cada
              peça só precisa dizer o quanto sobe a partir dele, em vez de
              carregar a altura da mesa na conta e acabar afundada nela.
            */}
            <group position={[0.06, TAMPO_Y, -0.02]}>
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
