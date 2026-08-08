/**
 * Medidas do `relogio.glb` e a lógica de virar um horário em segmentos acesos.
 *
 * **Os dígitos do modelo são GEOMETRIA, não textura.** O material azul
 * (`blinn11SG`) não é um painel liso esperando uma imagem: são 5 blocos
 * extrudados — dois numerais completos, os dois pontos e uma barra vertical —
 * que desenham um horário fixo dentro do plástico. Não há como formar "14:37"
 * com eles, então a peça entra na sala como CARCAÇA: o material dos dígitos é
 * escondido e um display próprio ocupa o mesmo vão, desenhado quadro a quadro.
 *
 * As frações abaixo são o que torna esse vão localizável sem abrir o arquivo em
 * runtime. Foram LIDAS dos vértices do `.glb`, não estimadas, e
 * `relogio-model.test.mjs` refaz a leitura a cada `npm test` — trocar o arquivo
 * sem atualizar a tabela quebra o teste em vez de deixar um retângulo aceso
 * flutuando ao lado do relógio.
 *
 * **O arquivo é Z-up.** O "para cima" dele é +Z, e não +Y como todo o resto da
 * sala: o display mede 77,7 no eixo Y por 35,2 no Z, e um display de relógio é
 * deitado, não retrato. Quem corrige isso é o RelogioDigital.tsx; aqui os nomes
 * já falam da peça montada (largura, altura, profundidade), não dos eixos do
 * arquivo.
 */

/** Nome do material dos dígitos moldados, o que é escondido na montagem. */
export const MATERIAL_DOS_DIGITOS = 'blinn11SG';

/**
 * Vãos do modelo em unidades do arquivo, já traduzidos para os eixos da peça
 * em pé: largura é o Y do arquivo, altura é o Z, profundidade é o X.
 *
 * Servem para converter uma medida em metros na outra — pedir 12cm de largura e
 * saber que altura sai disso — sem ninguém remedir nada.
 */
export const RELOGIO_NATIVO = {
    largura: 137.586669921875,
    altura: 54.49795150756836,
    profundidade: 64.70722961425781,
};

/**
 * Onde fica o display, em FRAÇÕES do tamanho final do relógio — nunca em
 * metros. Assim mudar `LARGURA_RELOGIO` lá no componente reposiciona a tela
 * sozinho, em vez de exigir que alguém refaça cinco contas na mão.
 *
 * A origem é a mesma que o KenneyModel entrega: centro em X/Z, base em Y=0.
 * `frenteX` é negativo porque a face do display olha para -X antes do giro que
 * põe o relógio virado para a sala.
 */
export const RELOGIO_DISPLAY = {
    /** Fração da profundidade: onde a face acesa fica, a partir do centro. */
    frenteX: -0.413708,
    /** Fração da largura: o display não é centrado, sobra mais plástico de um lado. */
    centroZ: 0.025773,
    /** Fração da altura, medida da base — o display fica acima do meio. */
    centroY: 0.477164,
    /** Fração da largura e da altura ocupadas pelo vão aceso. */
    largura: 0.564943,
    altura: 0.645714,
};

/**
 * Os sete segmentos de cada algarismo, na nomenclatura de sempre:
 *
 * ```
 *   aaa
 *  f   b
 *   ggg
 *  e   c
 *   ddd
 * ```
 */
export const SEGMENTOS_POR_DIGITO = {
    0: 'abcdef',
    1: 'bc',
    2: 'abdeg',
    3: 'abcdg',
    4: 'bcfg',
    5: 'acdfg',
    6: 'acdefg',
    7: 'abc',
    8: 'abcdefg',
    9: 'abcdfg',
};

/**
 * O horário em quatro algarismos, 24 horas, com zero à esquerda.
 *
 * Devolve os dígitos separados, e não uma string "14:37", porque quem desenha
 * precisa posicionar cada algarismo numa célula própria — um `split` na string
 * daria o mesmo resultado com um passo a mais e um caractere (`:`) que não é
 * algarismo no meio.
 */
export function digitosDoHorario(data) {
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    return [...horas, ...minutos].map(Number);
}

/**
 * Os dois pontos piscam uma vez por segundo, acesos na primeira metade.
 *
 * É o único detalhe que separa um relógio funcionando de uma foto de relógio:
 * entre 14:37 e 14:38 nada mais na tela se mexe por sessenta segundos, e quem
 * passa os olhos não tem como saber que aquilo está andando.
 */
export function pontosAcesos(data) {
    return data.getMilliseconds() < 500;
}

/**
 * Quanto falta para o próximo quadro do relógio mudar alguma coisa.
 *
 * Meio segundo é o passo do pisca, mas o que se agenda é a distância até a
 * próxima BORDA de meio segundo, não 500ms corridos: um `setInterval(500)`
 * acumula o atraso de cada disparo e em alguns minutos o pisca deixa de bater
 * com o segundo real, virando dois pontos tremendo fora do compasso.
 */
export function msAteOProximoQuadro(data) {
    return 500 - (data.getTime() % 500);
}
