/**
 * As medidas do braço da poltrona do `lounge-chair.glb`.
 *
 * **Todos os números aqui foram LIDOS dos vértices do arquivo**, não estimados —
 * mesmo tratamento da gaveta (`gaveta-model.mjs`), das cortinas
 * (`janela-model.mjs`) e do vão do relógio (`relogio-model.mjs`), e pelo mesmo
 * motivo: trocar o `.glb` sem atualizar esta tabela quebra o teste, em vez de
 * deixar um caderno flutuando no ar ao lado de uma poltrona que encolheu.
 *
 * Existe por causa do prêmio de "Coisas que ninguém repara": o caderno e a caneta
 * pousam no braço da poltrona, e um braço de 11cm não perdoa chute — dois
 * centímetros para o lado e o objeto atravessa o estofado ou fica boiando fora
 * dele.
 *
 * As unidades são as do MODELO, não metros, pela mesma razão da gaveta: o
 * `KenneyModel` escala a peça inteira para a altura pedida, e uma coordenada
 * escrita em centímetros precisaria saber por quanto a poltrona foi escalada.
 * Quem precisa de metros chama `bracoEmMetros()`, no fim do arquivo.
 */

/** Caixa envolvente da poltrona inteira, em unidades do modelo. É o que o
 *  `KenneyModel` mede para calcular a escala e para recentrar a peça. */
export const POLTRONA_NATIVA = {
    minX: -0.49, maxX: 0,
    minY: 0, maxY: 0.63,
    minZ: 0, maxZ: 0.6747,
};

/**
 * O braço do lado +x local — o mesmo lado em que o abajur NÃO está.
 *
 * A poltrona tem dois braços simétricos, e a escolha do +x não é estética: o
 * abajur é montado em `Poltrona.tsx` no x local negativo, e um caderno do mesmo
 * lado ficaria embaixo da cúpula. Além disso, com a rotação com que a poltrona é
 * posta na sala, este é o braço que fica mais perto da câmera.
 *
 * `zDe`/`zAte` delimitam o PLATÔ — o trecho em que a face de cima é plana e tem a
 * largura inteira. Fora dele o braço desce para 0,33 na frente e afina para trás,
 * e nos dois casos um objeto apoiado ficaria torto ou pela metade no ar.
 */
export const BRACO_NATIVO = {
    minX: -0.0902, maxX: 0,
    topoY: 0.37,
    zDe: 0.2647, zAte: 0.5245,
};

/**
 * O braço em METROS, no espaço LOCAL do grupo da poltrona — o mesmo espaço em que
 * o abajur é posicionado, ou seja, antes da posição e da rotação do móvel na
 * sala. Quem converte para o mundo é `pontoNoBraco`, em `CantoDeLeitura.tsx`.
 *
 * O X e o Z saem RECENTRADOS e o Y sai a partir da base, porque é esse o contrato
 * do `KenneyModel`: ele recentra a peça em X/Z e assenta a base em Y=0, de modo
 * que `position` sempre signifique o ponto do chão sob o centro do móvel.
 *
 * @param alturaAlvo a altura pedida à poltrona, em metros.
 */
export function bracoEmMetros(alturaAlvo) {
    const escala = alturaAlvo / (POLTRONA_NATIVA.maxY - POLTRONA_NATIVA.minY);
    const centroX = (POLTRONA_NATIVA.minX + POLTRONA_NATIVA.maxX) / 2;
    const centroZ = (POLTRONA_NATIVA.minZ + POLTRONA_NATIVA.maxZ) / 2;
    const centroDoBracoX = (BRACO_NATIVO.minX + BRACO_NATIVO.maxX) / 2;
    const centroDoPlatoZ = (BRACO_NATIVO.zDe + BRACO_NATIVO.zAte) / 2;

    return {
        /** Centro do braço no eixo X local, já recentrado. */
        x: (centroDoBracoX - centroX) * escala,
        /** Altura da face de cima, a partir do chão. */
        y: (BRACO_NATIVO.topoY - POLTRONA_NATIVA.minY) * escala,
        /** Centro do platô no eixo Z local, já recentrado. */
        z: (centroDoPlatoZ - centroZ) * escala,
        /** Largura útil: o que cabe atravessado no braço sem sobrar para fora. */
        largura: (BRACO_NATIVO.maxX - BRACO_NATIVO.minX) * escala,
        /** Comprimento do platô: o que cabe enfileirado ao longo do braço. */
        comprimento: (BRACO_NATIVO.zAte - BRACO_NATIVO.zDe) * escala,
    };
}
