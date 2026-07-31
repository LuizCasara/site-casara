'use client';

import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';

const MONITOR_FRAME_COLOR = '#0d0d0d';
const MONITOR_SCREEN_COLOR = '#1a2a4a';
const NOTEBOOK_BASE_COLOR = '#2b2b2b';
const NOTEBOOK_SCREEN_COLOR = '#111111';

// Altura de mesa de trabalho. TAMPO_Y é a mesma medida porque
// KenneyModel assenta a base da peça em Y=0.
const ALTURA_MESA = 0.72;
const TAMPO_Y = ALTURA_MESA;
const LARGURA_TAMPO = 1.35;

/**
 * Mesa de trabalho — modelo do Kenney (CC0) com os 4 monitores e o notebook
 * montados por cima em primitivas. O Furniture Kit não tem monitor nenhum, e
 * é justamente a parede de telas que faz este canto ler como "escritório de
 * dev" em vez de "mesa de jantar".
 *
 * Puro cenário: nada fora deste arquivo sabe que ela existe (sem entrada em
 * ROOM_ANCHORS, diferente de estante/mesa/leitura/indice).
 */
export default function PcDesk({position}: {position: [number, number, number]}) {
    return (
        <group position={position}>
            <KenneyModel url={MODELOS.mesaTrabalho} alturaAlvo={ALTURA_MESA} cores={{wood: '#4a3323', metal: '#2f2a24'}}/>

            {/* Cadeira, puxada pra fora da mesa como quem levantou */}
            <KenneyModel
                url={MODELOS.cadeiraEscritorio}
                position={[-0.12, 0, 0.52]}
                rotation={[0, 2.9, 0]}
                alturaAlvo={0.82}
                cores={{carpet: '#2b2b2b', metalMedium: '#17171a'}}
            />

            {/* 4 monitores lado a lado, levemente curvados pra dentro */}
            {[-0.45, -0.15, 0.15, 0.45].map((x, i) => {
                const anguloY = (i - 1.5) * -0.12;
                return (
                    <group key={x} position={[x, TAMPO_Y + 0.23, -0.16]} rotation={[0, anguloY, 0]}>
                        <mesh>
                            <boxGeometry args={[0.26, 0.17, 0.015]}/>
                            <meshStandardMaterial color={MONITOR_FRAME_COLOR} roughness={0.4}/>
                        </mesh>
                        <mesh position={[0, 0, 0.009]}>
                            <planeGeometry args={[0.23, 0.14]}/>
                            <meshStandardMaterial color={MONITOR_SCREEN_COLOR} emissive={MONITOR_SCREEN_COLOR} emissiveIntensity={0.6}/>
                        </mesh>
                        <mesh position={[0, -0.115, 0]}>
                            <boxGeometry args={[0.02, 0.06, 0.02]}/>
                            <meshStandardMaterial color={MONITOR_FRAME_COLOR}/>
                        </mesh>
                    </group>
                );
            })}

            {/* Notebook aberto, na ponta esquerda do tampo */}
            <group position={[-LARGURA_TAMPO / 2 + 0.24, TAMPO_Y + 0.01, 0.06]}>
                <mesh>
                    <boxGeometry args={[0.26, 0.015, 0.18]}/>
                    <meshStandardMaterial color={NOTEBOOK_BASE_COLOR} roughness={0.5} metalness={0.3}/>
                </mesh>
                <mesh position={[0, 0.09, -0.08]} rotation={[-0.35, 0, 0]}>
                    <boxGeometry args={[0.26, 0.17, 0.01]}/>
                    <meshStandardMaterial color={NOTEBOOK_SCREEN_COLOR} emissive="#264d73" emissiveIntensity={0.3}/>
                </mesh>
            </group>
        </group>
    );
}
