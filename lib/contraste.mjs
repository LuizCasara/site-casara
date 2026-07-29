/**
 * Contraste WCAG entre cores — lógica pura, sem dependências.
 *
 * Este arquivo é .mjs de propósito, mesma razão de lib/book-utils.mjs: é
 * lógica compartilhável que qualquer script Node (CLI, testes) importa sem
 * etapa de build, e o import .mjs dentro de .tsx já funciona neste projeto
 * (moduleResolution "bundler" + allowJs no tsconfig).
 */

/** "#ec4899" -> [236, 72, 153]. Aceita com ou sem "#". */
function hexParaRgb(hex) {
    const limpo = String(hex).replace('#', '');
    return [
        parseInt(limpo.slice(0, 2), 16),
        parseInt(limpo.slice(2, 4), 16),
        parseInt(limpo.slice(4, 6), 16),
    ];
}

/** Linearização sRGB de um canal 0-255, conforme a fórmula WCAG. */
function linearizarCanal(canal255) {
    const c = canal255 / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa WCAG de uma cor hex, 0 (preto) a 1 (branco). */
export function luminanciaRelativa(hex) {
    const [r, g, b] = hexParaRgb(hex).map(linearizarCanal);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Razão de contraste WCAG entre duas cores, de 1 (idênticas) a 21
 * (preto vs. branco).
 */
export function razaoDeContraste(hexA, hexB) {
    const lA = luminanciaRelativa(hexA);
    const lB = luminanciaRelativa(hexB);
    const maisClara = Math.max(lA, lB);
    const maisEscura = Math.min(lA, lB);
    return (maisClara + 0.05) / (maisEscura + 0.05);
}

/**
 * Cor de texto ('#000000' ou '#ffffff') com maior contraste sobre o fundo
 * dado — nunca fixa, calculada por cor, para que todo par passe WCAG AA.
 */
export function corDeTextoSobre(hexFundo) {
    const contrastePreto = razaoDeContraste(hexFundo, '#000000');
    const contrasteBranco = razaoDeContraste(hexFundo, '#ffffff');
    return contrastePreto >= contrasteBranco ? '#000000' : '#ffffff';
}
