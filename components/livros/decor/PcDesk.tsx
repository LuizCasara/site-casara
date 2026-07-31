'use client';

const DESK_TOP_COLOR = '#4a3323';
const DESK_LEG_COLOR = '#241a12';
const TOWER_COLOR = '#1a1a1a';
const MONITOR_FRAME_COLOR = '#0d0d0d';
const MONITOR_SCREEN_COLOR = '#1a2a4a';
const NOTEBOOK_BASE_COLOR = '#2b2b2b';
const NOTEBOOK_SCREEN_COLOR = '#111111';

const DESK_TOP_Y = 0.72;
const DESK_WIDTH = 1.3;
const DESK_DEPTH = 0.55;

/**
 * Mesa de trabalho decorativa — PC com 4 monitores + notebook. Puro
 * cenário: nada fora deste arquivo sabe que ela existe (sem entrada em
 * ROOM_ANCHORS, diferente de estante/mesa/leitura/indice).
 */
export default function PcDesk({position}: {position: [number, number, number]}) {
    return (
        <group position={position}>
            <mesh position={[0, DESK_TOP_Y, 0]}>
                <boxGeometry args={[DESK_WIDTH, 0.03, DESK_DEPTH]}/>
                <meshStandardMaterial color={DESK_TOP_COLOR} roughness={0.6}/>
            </mesh>

            {[-DESK_WIDTH / 2 + 0.05, DESK_WIDTH / 2 - 0.05].map((x) => (
                <mesh key={x} position={[x, DESK_TOP_Y / 2, DESK_DEPTH / 2 - 0.05]}>
                    <boxGeometry args={[0.04, DESK_TOP_Y, 0.04]}/>
                    <meshStandardMaterial color={DESK_LEG_COLOR} roughness={0.8}/>
                </mesh>
            ))}

            {/* Gabinete no chão, ao lado da mesa */}
            <mesh position={[DESK_WIDTH / 2 + 0.12, 0.2, DESK_DEPTH / 2 - 0.1]}>
                <boxGeometry args={[0.16, 0.4, 0.35]}/>
                <meshStandardMaterial color={TOWER_COLOR} roughness={0.5} metalness={0.2}/>
            </mesh>

            {/* 4 monitores lado a lado, levemente curvados pra dentro */}
            {[-0.42, -0.14, 0.14, 0.42].map((x, i) => {
                const anguloY = (i - 1.5) * -0.12;
                return (
                    <group key={x} position={[x, DESK_TOP_Y + 0.22, -DESK_DEPTH / 2 + 0.08]} rotation={[0, anguloY, 0]}>
                        <mesh>
                            <boxGeometry args={[0.24, 0.16, 0.015]}/>
                            <meshStandardMaterial color={MONITOR_FRAME_COLOR} roughness={0.4}/>
                        </mesh>
                        <mesh position={[0, 0, 0.009]}>
                            <planeGeometry args={[0.21, 0.13]}/>
                            <meshStandardMaterial color={MONITOR_SCREEN_COLOR} emissive={MONITOR_SCREEN_COLOR} emissiveIntensity={0.6}/>
                        </mesh>
                        <mesh position={[0, -0.11, 0]}>
                            <boxGeometry args={[0.02, 0.06, 0.02]}/>
                            <meshStandardMaterial color={MONITOR_FRAME_COLOR}/>
                        </mesh>
                    </group>
                );
            })}

            {/* Notebook aberto, do lado do teclado */}
            <group position={[-DESK_WIDTH / 2 + 0.22, DESK_TOP_Y + 0.015, DESK_DEPTH / 2 - 0.15]}>
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
