'use client';

const WALL_COLOR = '#2b2320'; // mesmo tom da parede de fundo, pra ler como a mesma sala

const WALL_X = -2.6;

/**
 * Parede lateral esquerda — até a fase 5 a sala só tinha a parede de fundo,
 * e sem esta o canto de leitura ficava aberto pro vazio.
 *
 * **Já teve itens de campismo pendurados (mochila, lampião, corda, lenços,
 * faca, bastão) e não tem mais.** Sem sombra projetada nem batente visível, um
 * objeto pequeno colado numa parede escura não lê como pendurado — lê como
 * flutuando na frente dela, e era exatamente essa a impressão. Um objeto de
 * parede só funciona nesta sala se tiver volume próprio (a estante amarela) ou
 * se a parede ganhar sombra de verdade, que o spec descarta por custo.
 *
 * Puro cenário, mesmo espírito de Room.tsx: sem âncora, sem ninguém de fora
 * precisando saber que existe — por isso não recebe `position` por prop,
 * igual à parede de fundo.
 */
export default function CampingWall() {
    return (
        <mesh position={[WALL_X, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[4.2, 3]}/>
            <meshStandardMaterial color={WALL_COLOR} roughness={1}/>
        </mesh>
    );
}
