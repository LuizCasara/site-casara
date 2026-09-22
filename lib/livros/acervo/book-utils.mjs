/**
 * Lógica pura do acervo de livros — sem dependências, sem I/O.
 *
 * Este arquivo é .mjs de propósito: ele é importado tanto pelo CLI
 * (scripts/livros.mjs, Node puro) quanto pelo Next. Um .ts não pode ser
 * importado por um script Node sem etapa de build, e este projeto não tem uma.
 */

/** Remove acentos: decompõe em base + diacrítico e joga os diacríticos fora. */
function semAcento(texto) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** "A Revolta de Atlas" -> "a-revolta-de-atlas". Nunca devolve vazio. */
export function slugify(texto) {
    const slug = semAcento(String(texto))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'livro';
}

/** Forma de exibição da tag: minúscula, sem espaço sobrando, acento preservado. */
export function normalizeTag(tag) {
    return String(tag).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Chave de comparação da tag: sem acento, para que "política" e "politica"
 * sejam reconhecidas como a mesma tag e o autocomplete do CLI evite duplicatas.
 */
export function tagKey(tag) {
    return semAcento(normalizeTag(tag)).replace(/[^a-z0-9 ]/g, '');
}

/**
 * Extrai o ano de publicação. A Open Library devolve esse campo como texto
 * livre — "2009", "March 2009", "1st ed. 1985, reprint 2001" são todos reais.
 * Pega o primeiro ano plausível encontrado.
 */
export function extractYear(publishDate) {
    if (!publishDate) return null;
    const m = String(publishDate).match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    return m ? Number(m[1]) : null;
}

/**
 * ISBN-13 -> ISBN-10, recalculando o dígito verificador (que é outro: o do
 * ISBN-13 é módulo 10 com pesos 1/3, o do ISBN-10 é módulo 11 com pesos 10..2,
 * e pode dar "X"). Não é truncar os 3 primeiros dígitos e o último.
 *
 * Existe porque o ISBN-10 é o ASIN da Amazon para livros, e é assim que se
 * chega na capa deles a partir do ISBN que temos gravado — ver `capaDaAmazon`
 * em book-cover.mjs. Só o prefixo 978 converte: 979 não tem ISBN-10
 * equivalente (não há espaço no formato de 10 dígitos), e nesse caso devolve
 * null em vez de um código inválido de aparência plausível.
 */
export function isbn13Para10(isbn13) {
    const digitos = String(isbn13 ?? '').replace(/[^0-9Xx]/g, '');
    if (digitos.length !== 13 || !digitos.startsWith('978')) return null;

    const corpo = digitos.slice(3, 12);
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(corpo[i]) * (10 - i);
    const resto = (11 - (soma % 11)) % 11;
    return corpo + (resto === 10 ? 'X' : String(resto));
}
