'use client';

import Poltrona from '@/components/livros/decor/Poltrona';
import MesaDeCentro, {ALTURA_MESA_CENTRO} from '@/components/livros/decor/MesaDeCentro';

/**
 * **CONGELADO** — aprovado pelo dono do acervo em 06/08/2026, e vale para as
 * três peças do conjunto: a poltrona, a luminária (que mora em Poltrona.tsx,
 * junto com a luz dela) e a mesa de centro (MesaDeCentro.tsx). Posição, ângulo,
 * escala e distância entre elas estão do jeito que ele quer. Só mexer com pedido
 * explícito. Segundo território congelado da sala, ao lado de EstanteDoAcervo.
 *
 * De fora do congelamento, de propósito: o que POUSA no tampo — a pilha de
 * "lendo agora" (DeskBooks.tsx), que se posiciona a partir do `MESA_ANCHOR`
 * publicado aqui e continua ajustável sem tocar no móvel.
 */

const POLTRONA_CHAO: [number, number, number] = [-1.45, 0, -0.55];
// +Math.PI: com só `0.7` a poltrona fica de costas pra câmera.
const POLTRONA_ROT_Y = 0.7 + Math.PI;
/**
 * Vetor (x, z) pra onde a poltrona olha. O modelo aponta pra -z local, daí os
 * dois sinais negativos. Existe para a mesa se posicionar A PARTIR da poltrona:
 * com números escritos à mão, girar a poltrona deixaria a mesa de centro
 * atravessada na frente dela sem ninguém perceber.
 */
const POLTRONA_FRENTE: [number, number] = [-Math.sin(POLTRONA_ROT_Y), -Math.cos(POLTRONA_ROT_Y)];

/** Distância da mesa de centro à poltrona, medida na frente dela. */
const MESA_DISTANCIA_M = 0.65;
const MESA_CHAO: [number, number, number] = [
    POLTRONA_CHAO[0] + POLTRONA_FRENTE[0] * MESA_DISTANCIA_M,
    0,
    POLTRONA_CHAO[2] + POLTRONA_FRENTE[1] * MESA_DISTANCIA_M,
];
// Mesma orientação da poltrona (menos o meio giro que faz o modelo dela olhar
// pra câmera): o tampo fica paralelo ao encosto, e a pilha de livros, que herda
// esta rotação, fica de frente pra quem senta.
const MESA_ROT_Y = POLTRONA_ROT_Y - Math.PI;

/**
 * O TOPO do tampo — é sobre ele que a pilha de DeskBooks.tsx assenta, e é o
 * alvo da cena "Mesa".
 */
export const MESA_ANCHOR = {
    position: [MESA_CHAO[0], ALTURA_MESA_CENTRO, MESA_CHAO[2]] as [number, number, number],
    rotation: [0, MESA_ROT_Y, 0] as [number, number, number],
};

/**
 * Ponto sobre o tampo, dado um deslocamento no espaço local da mesa (já
 * rotacionado). Publicado para quem POUSA coisas nela: o móvel está congelado, o
 * que se apoia nele não.
 */
export function pontoNoTampo(lx: number, lz: number): [number, number, number] {
    const cos = Math.cos(MESA_ROT_Y);
    const sin = Math.sin(MESA_ROT_Y);
    return [
        MESA_ANCHOR.position[0] + lx * cos + lz * sin,
        MESA_ANCHOR.position[1],
        MESA_ANCHOR.position[2] - lx * sin + lz * cos,
    ];
}

/**
 * Poltrona, luminária e mesa de centro — o canto de leitura, à esquerda da
 * sala.
 *
 * O conjunto fica empurrado pro fundo (z≈-0.55). A câmera "geral" fica em
 * z=2.6 e olha levemente pra baixo, então tudo com z acima de ~0 cai na faixa
 * inferior do quadro e é cortado pela borda de baixo; em z=0.3 a poltrona
 * virava um borrão de primeiro plano tomando um quarto da tela.
 */
export default function CantoDeLeitura() {
    return (
        <>
            <Poltrona position={POLTRONA_CHAO} rotationY={POLTRONA_ROT_Y}/>
            <MesaDeCentro position={MESA_CHAO} rotationY={MESA_ROT_Y}/>
        </>
    );
}
