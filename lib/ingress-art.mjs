/**
 * Caminho público da arte de uma badge. Sem I/O e sem dependência de `node:*` —
 * pode ser importado por um client component (ao contrário de
 * `lib/ingress-catalog.mjs`, que lê o catálogo do disco).
 */

/**
 * @param {string} slug
 * @param {string|null|undefined} tier — um dos 5 tiers para badge core;
 *   `null`/`'single'`/`'none'` para badge de imagem única (evento/anomalia).
 */
export function artPath(slug, tier) {
    return !tier || tier === 'single' || tier === 'none'
        ? `/ingress/medals/${slug}.png`
        : `/ingress/medals/${slug}-${tier}.png`
}
