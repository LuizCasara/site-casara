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

const WALL_X = -2.6;

// Os itens ficam na parede DO FUNDO (z=-1.6), não na lateral, apesar do nome
// do componente. Motivo: a câmera "geral" fica em z=2.6 olhando pra -z, então
// a parede lateral é vista quase de perfil — tudo pendurado nela comprime
// numa tira de poucos pixels e o canto de campismo simplesmente não existia
// pra quem abria a página. A parede lateral continua aqui, mas como fechamento
// da sala; quem carrega o tema é a faixa de parede de fundo à esquerda da
// estante de livros (que ocupa x de -1,3 a 1,3), entre -2,5 e -1,35.
const BACK_Z = -1.47;

/**
 * O canto de campismo/escotismo — o lado "campismo" do "misto entre tech e
 * campismo" pedido pro estilo da sala — mais a parede lateral esquerda, que
 * até a fase 5 não existia (a sala só tinha a parede de fundo).
 *
 * Puro cenário, mesmo espírito de Room.tsx: sem âncora, sem ninguém de fora
 * precisando saber que existe — por isso não recebe `position` por prop,
 * igual à parede de fundo.
 */
export default function CampingWall() {
    return (
        <group>
            {/* Parede lateral — fechamento da sala, sem itens */}
            <mesh position={[WALL_X, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[4.2, 3]}/>
                <meshStandardMaterial color={WALL_COLOR} roughness={1}/>
            </mesh>

            {/* Lampião pendurado, com uma luz quente própria */}
            <group position={[-2.35, 1.6, BACK_Z]}>
                <mesh position={[0, 0.16, 0]}>
                    <cylinderGeometry args={[0.005, 0.005, 0.3, 6]}/>
                    <meshStandardMaterial color={LANTERN_BODY_COLOR}/>
                </mesh>
                <mesh>
                    <cylinderGeometry args={[0.06, 0.07, 0.12, 8]}/>
                    <meshStandardMaterial color={LANTERN_BODY_COLOR} roughness={0.4} metalness={0.4}/>
                </mesh>
                <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[0.035, 8, 8]}/>
                    <meshStandardMaterial color={LANTERN_LIGHT_COLOR} emissive={LANTERN_LIGHT_COLOR} emissiveIntensity={1.5}/>
                </mesh>
                <pointLight position={[0, 0, 0.12]} color={LANTERN_LIGHT_COLOR} intensity={10} distance={3} decay={2}/>
            </group>

            {/* Mochila pendurada */}
            <group position={[-2.3, 1.15, BACK_Z]}>
                <mesh>
                    <boxGeometry args={[0.22, 0.36, 0.14]}/>
                    <meshStandardMaterial color={BACKPACK_COLOR} roughness={0.9}/>
                </mesh>
                <mesh position={[0, 0.16, 0.02]}>
                    <boxGeometry args={[0.2, 0.12, 0.15]}/>
                    <meshStandardMaterial color={BACKPACK_FLAP_COLOR} roughness={0.9}/>
                </mesh>
            </group>

            {/* Corda enrolada, pendurada num gancho */}
            <mesh position={[-1.95, 1.15, BACK_Z]}>
                <torusGeometry args={[0.12, 0.025, 8, 24]}/>
                <meshStandardMaterial color={ROPE_COLOR} roughness={0.9}/>
            </mesh>

            {/*
              Lenços de escoteiro, pendurados lado a lado. Estreitos e
              compridos (0,13 x 0,3), não quadrados: um retângulo quase
              quadrado colado na parede lê como cartaz, não como pano
              pendurado — a proporção é o que dá a leitura, já que a esta
              distância não há dobra nem textura pra ajudar.
            */}
            {SCARF_COLORS.map((cor, i) => (
                <mesh key={cor} position={[-1.66 + i * 0.17, 1.12 - i * 0.04, BACK_Z - 0.02]} rotation={[0, 0, 0.1 * (i === 0 ? 1 : -1)]}>
                    <boxGeometry args={[0.13, 0.3, 0.02]}/>
                    <meshStandardMaterial color={cor} roughness={0.8}/>
                </mesh>
            ))}

            {/* Faca decorativa, montada na parede */}
            <group position={[-1.6, 1.55, BACK_Z - 0.02]} rotation={[0, 0, Math.PI / 2]}>
                <mesh>
                    <boxGeometry args={[0.03, 0.16, 0.012]}/>
                    <meshStandardMaterial color={KNIFE_HANDLE_COLOR}/>
                </mesh>
                <mesh position={[0, 0.13, 0]}>
                    <boxGeometry args={[0.025, 0.1, 0.008]}/>
                    <meshStandardMaterial color={KNIFE_BLADE_COLOR} roughness={0.3} metalness={0.6}/>
                </mesh>
            </group>

            {/* Bastão de caminhada, encostado no canto */}
            <mesh position={[-2.5, 0.65, BACK_Z + 0.06]} rotation={[0, 0, 0.1]}>
                <cylinderGeometry args={[0.012, 0.016, 1.3, 8]}/>
                <meshStandardMaterial color={STAFF_COLOR} roughness={0.8}/>
            </mesh>
        </group>
    );
}
