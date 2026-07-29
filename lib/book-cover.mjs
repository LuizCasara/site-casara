/**
 * Baixa, redimensiona e analisa a capa do livro.
 *
 * A capa é BAIXADA, não linkada: a API de covers da Open Library tem rate
 * limit, e linkar direto faria cada visitante bater no servidor deles.
 * Baixando, next/image funciona e a capa não some se eles mudarem de ideia.
 */
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {getCategory} from './book-categories.mjs';

const LARGURA_MAX = 400;

/**
 * Respostas menores que isto não são capa de verdade — a Open Library devolve
 * um pixel transparente quando não tem a imagem, em vez de dar 404.
 */
const BYTES_MINIMOS = 3000;

function rgbParaHex({r, g, b}) {
    const h = (n) => Math.round(n).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
}

/** Capa placeholder: retângulo na cor da categoria com o título escrito. */
async function gerarPlaceholder(slug, categoryId, destino) {
    const cor = getCategory(categoryId)?.cor ?? '#64748b';
    const titulo = slug.replace(/-/g, ' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
  <rect width="400" height="600" fill="${cor}"/>
  <text x="200" y="300" font-family="sans-serif" font-size="28" fill="#ffffff"
        text-anchor="middle" dominant-baseline="middle">${titulo}</text>
</svg>`;
    await sharp(Buffer.from(svg)).jpeg({quality: 82}).toFile(destino);
    return cor;
}

/**
 * Devolve { coverPath, spineColor, placeholder }.
 * `coverPath` é o caminho público (/livros/capas/<slug>.jpg), não o do disco.
 */
export async function baixarCapa(coverUrl, slug, categoryId, root) {
    const pasta = join(root, 'public', 'livros', 'capas');
    await mkdir(pasta, {recursive: true});
    const destino = join(pasta, `${slug}.jpg`);
    const coverPath = `/livros/capas/${slug}.jpg`;

    if (!coverUrl) {
        const cor = await gerarPlaceholder(slug, categoryId, destino);
        return {coverPath, spineColor: cor, placeholder: true};
    }

    let buffer;
    try {
        const res = await fetch(coverUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        buffer = Buffer.from(await res.arrayBuffer());
    } catch {
        const cor = await gerarPlaceholder(slug, categoryId, destino);
        return {coverPath, spineColor: cor, placeholder: true};
    }

    if (buffer.length < BYTES_MINIMOS) {
        const cor = await gerarPlaceholder(slug, categoryId, destino);
        return {coverPath, spineColor: cor, placeholder: true};
    }

    try {
        // stats().dominant é a cor dominante calculada pelo próprio sharp.
        const {dominant} = await sharp(buffer).stats();
        await sharp(buffer)
            .resize(LARGURA_MAX, null, {fit: 'inside', withoutEnlargement: true})
            .jpeg({quality: 82})
            .toFile(destino);

        return {coverPath, spineColor: rgbParaHex(dominant), placeholder: false};
    } catch {
        const cor = await gerarPlaceholder(slug, categoryId, destino);
        return {coverPath, spineColor: cor, placeholder: true};
    }
}
