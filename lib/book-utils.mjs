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
