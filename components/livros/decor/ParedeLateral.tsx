'use client';

const WALL_COLOR = '#2b2320'; // mesmo tom da parede de fundo, pra ler como a mesma sala

/** Distância do centro da sala até cada parede lateral. */
export const PAREDE_LATERAL_X = 2.6;

/**
 * As paredes laterais do cômodo. Sem a da esquerda o canto de leitura fica
 * aberto pro vazio; a da direita existe porque o canto de trabalho é uma mesa em
 * L e precisa de duas paredes para encaixar.
 *
 * Puro cenário, mesmo espírito de Room.tsx: sem âncora, sem ninguém de fora
 * precisando saber que existe.
 */
export default function ParedeLateral({lado}: {lado: 'esquerda' | 'direita'}) {
    const sinal = lado === 'esquerda' ? -1 : 1;
    return (
        <mesh position={[sinal * PAREDE_LATERAL_X, 1.5, 0]} rotation={[0, sinal * -Math.PI / 2, 0]}>
            <planeGeometry args={[4.2, 3]}/>
            <meshStandardMaterial color={WALL_COLOR} roughness={1}/>
        </mesh>
    );
}
