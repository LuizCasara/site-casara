'use client';

const WALL_COLOR = '#2b2320'; // mesmo tom da parede de fundo, pra ler como a mesma sala
const BACKPACK_COLOR = '#5a6b3f';
const BACKPACK_FLAP_COLOR = '#48592f';
const LANTERN_BODY_COLOR = '#3a3a3a';
const LANTERN_LIGHT_COLOR = '#ffcf8a';
const ROPE_COLOR = '#b89968';
const SCARF_COLORS = ['#d97b3f', '#3f6fd9'];
const STAFF_COLOR = '#5c4326';
const KNIFE_HANDLE_COLOR = '#4a3323';
const KNIFE_BLADE_COLOR = '#c9c9c9';

const WALL_X = -2.9;

/**
 * Parede lateral nova — até a fase 5 a sala só tinha a parede de fundo (atrás
 * da estante). Dedicada aos itens de campismo/escotismo, o lado "campismo"
 * do "misto entre tech e campismo" pedido pro estilo da sala. Puro cenário,
 * mesmo espírito de Room.tsx: sem âncora, sem ninguém de fora precisando
 * saber que existe — por isso não recebe `position` por prop, igual à
 * parede de fundo.
 */
export default function CampingWall() {
    return (
        <group>
            <mesh position={[WALL_X, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[4.2, 3]}/>
                <meshStandardMaterial color={WALL_COLOR} roughness={1}/>
            </mesh>

            {/* Mochila encostada no canto */}
            <group position={[WALL_X + 0.18, 0.22, -1.2]}>
                <mesh>
                    <boxGeometry args={[0.22, 0.36, 0.14]}/>
                    <meshStandardMaterial color={BACKPACK_COLOR} roughness={0.9}/>
                </mesh>
                <mesh position={[0, 0.16, 0.02]}>
                    <boxGeometry args={[0.2, 0.12, 0.15]}/>
                    <meshStandardMaterial color={BACKPACK_FLAP_COLOR} roughness={0.9}/>
                </mesh>
            </group>

            {/* Lampião pendurado, com uma luz quente própria */}
            <group position={[WALL_X + 0.15, 1.7, -0.6]}>
                <mesh position={[0, 0.15, 0]}>
                    <cylinderGeometry args={[0.005, 0.005, 0.3, 6]}/>
                    <meshStandardMaterial color={LANTERN_BODY_COLOR}/>
                </mesh>
                <mesh>
                    <cylinderGeometry args={[0.06, 0.07, 0.12, 8]}/>
                    <meshStandardMaterial color={LANTERN_BODY_COLOR} roughness={0.4} metalness={0.4}/>
                </mesh>
                <pointLight position={[0, -0.02, 0]} color={LANTERN_LIGHT_COLOR} intensity={8} distance={2.5} decay={2}/>
            </group>

            {/* Corda enrolada no canto do chão */}
            <mesh position={[WALL_X + 0.15, 0.03, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.12, 0.025, 8, 24]}/>
                <meshStandardMaterial color={ROPE_COLOR} roughness={0.9}/>
            </mesh>

            {/* Lenços de escoteiro, pendurados */}
            {SCARF_COLORS.map((cor, i) => (
                <mesh key={cor} position={[WALL_X + 0.08, 1.3 - i * 0.14, 0.2]} rotation={[0.15, 0, 0.1 * (i === 0 ? 1 : -1)]}>
                    <boxGeometry args={[0.02, 0.16, 0.22]}/>
                    <meshStandardMaterial color={cor} roughness={0.8}/>
                </mesh>
            ))}

            {/* Bastão de caminhada, encostado no canto */}
            <mesh position={[WALL_X + 0.1, 0.65, -1.35]} rotation={[0, 0, 0.12]}>
                <cylinderGeometry args={[0.012, 0.016, 1.3, 8]}/>
                <meshStandardMaterial color={STAFF_COLOR} roughness={0.8}/>
            </mesh>

            {/* Faca decorativa, montada na parede */}
            <group position={[WALL_X + 0.08, 1.0, 0.55]} rotation={[0, 0, Math.PI / 2]}>
                <mesh>
                    <boxGeometry args={[0.03, 0.16, 0.01]}/>
                    <meshStandardMaterial color={KNIFE_HANDLE_COLOR}/>
                </mesh>
                <mesh position={[0, 0.13, 0]}>
                    <boxGeometry args={[0.025, 0.1, 0.006]}/>
                    <meshStandardMaterial color={KNIFE_BLADE_COLOR} roughness={0.3} metalness={0.6}/>
                </mesh>
            </group>
        </group>
    );
}
