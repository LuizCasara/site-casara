/**
 * Da cor crua da capa para a cor com que a lombada é pintada na sala.
 *
 * A cor que vem do banco (`spine_color`) é o tom dominante da capa, extraído
 * pelo `sharp` no cadastro. Ela serve para identificar o livro, mas é péssima
 * como pintura de um objeto numa sala escura: capas de fundo branco viram
 * lombadas quase brancas, que na cena passam do limiar do <Bloom> e brilham
 * como se fossem fonte de luz — com o título sumindo dentro do próprio halo.
 *
 * Duas correções, nesta ordem:
 *
 * 1. **Mistura com creme.** Puxa toda a paleta para o mesmo lado quente e tira
 *    saturação, que é o que faz uma cor virar pastel. Como a mistura é com uma
 *    cor clara, ela ACLARA os tons escuros — daí o passo seguinte não ser
 *    opcional.
 * 2. **Teto de luminância.** O que passar do teto é escurecido
 *    proporcionalmente nos três canais, o que baixa o brilho preservando o
 *    matiz (escurecer só um canal mudaria a cor).
 *
 * .mjs e testado porque um erro aqui repinta o acervo inteiro de uma vez.
 */

import {hexParaRgb, luminanciaRelativa} from './contraste.mjs';

/** O tom para onde toda lombada é puxada: creme quente, cor de papel velho. */
const CREME = [232, 217, 192];
/** Quanto do creme entra na mistura. Mais que isso e os livros ficam iguais. */
const MISTURA = 0.38;
/**
 * Luminância relativa (WCAG) máxima de uma lombada. 0.42 fica bem abaixo do
 * `luminanceThreshold` do <Bloom> da cena, que é o ponto em que a superfície
 * começa a virar halo.
 */
const LUMINANCIA_MAXIMA = 0.42;
/** Passos da busca pelo fator de escurecimento. 24 chegam à precisão do byte. */
const PASSOS_DA_BUSCA = 24;

function paraHex([r, g, b]) {
    const canal = (c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
    return `#${canal(r)}${canal(g)}${canal(b)}`;
}

/**
 * Cor pastel e quente com que a lombada é pintada. Determinística: a mesma
 * entrada dá sempre a mesma saída, então o acervo não muda de cara entre dois
 * carregamentos.
 */
export function corDeLombada(hex) {
    const cru = hexParaRgb(hex);
    if (cru.some((c) => Number.isNaN(c))) return paraHex(CREME);

    const misturada = cru.map((c, i) => c * (1 - MISTURA) + CREME[i] * MISTURA);
    const luz = luminanciaRelativa(paraHex(misturada));
    if (luz <= LUMINANCIA_MAXIMA) return paraHex(misturada);

    // Busca binária pelo fator que leva a luminância ao teto, em vez de
    // inverter a curva sRGB na mão: a fórmula da WCAG tem um trecho linear e
    // um offset, então o `(alvo/atual)^(1/2.4)` que parece resolver erra por
    // pouco — e o "por pouco" caía do lado errado do teto (0.439 contra 0.42).
    // Isto roda uma vez por livro, na montagem do atlas.
    let baixo = 0;
    let alto = 1;
    for (let i = 0; i < PASSOS_DA_BUSCA; i++) {
        const meio = (baixo + alto) / 2;
        const luzDoMeio = luminanciaRelativa(paraHex(misturada.map((c) => c * meio)));
        if (luzDoMeio > LUMINANCIA_MAXIMA) alto = meio;
        else baixo = meio;
    }
    return paraHex(misturada.map((c) => c * baixo));
}
