'use client';

import KenneyModel from '@/components/livros/decor/KenneyModel';

/**
 * Peça que o arquivo traz EM PÉ, pousada deitada sobre uma superfície.
 *
 * Deitar não é só girar. KenneyModel assenta a base da peça na origem do
 * grupo, então o quarto de volta em X joga metade da espessura para baixo da
 * madeira e estica a peça inteira para -z. As duas compensações — meia
 * espessura para cima, meio comprimento para a frente — devolvem o objeto ao
 * ponto pedido, apoiado.
 *
 * `razaoEspessura` é a espessura dividida pelo comprimento, medida no .glb.
 * Vem de fora porque só quem conhece o arquivo sabe esse número, e assim ele
 * continua certo quando o tamanho do objeto muda.
 *
 * O giro sobre a superfície é em Z, não em Y: a ordem Euler do three aplica X
 * por último, então o Z local é o que ainda vai ser deitado junto com a peça e
 * vira rotação no plano do apoio. Um giro em Y aconteceria ANTES da meia
 * volta, com a peça ainda de pé, e sairia como tombo para o lado.
 */
export default function DeitadoNoTampo({url, position, comprimento, razaoEspessura, giro = 0, cores}: {
    url: string;
    position: [number, number, number];
    comprimento: number;
    razaoEspessura: number;
    giro?: number;
    cores?: Record<string, string>;
}) {
    return (
        <group
            position={[
                position[0],
                position[1] + (comprimento * razaoEspessura) / 2,
                position[2] + comprimento / 2,
            ]}
            rotation={[-Math.PI / 2, 0, giro]}
        >
            <KenneyModel url={url} alturaAlvo={comprimento} cores={cores}/>
        </group>
    );
}
