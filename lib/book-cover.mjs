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
import {corDeTextoSobre} from './contraste.mjs';

const LARGURA_MAX = 400;
const LARGURA_SVG = 400;
const ALTURA_SVG = 600;

/**
 * Respostas menores que isto não são capa de verdade — a Open Library devolve
 * um pixel transparente quando não tem a imagem, em vez de dar 404.
 */
const BYTES_MINIMOS = 3000;

function rgbParaHex({r, g, b}) {
    const h = (n) => Math.round(n).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Escapa um texto para ser inserido com segurança dentro de um SVG (XML).
 * Necessário porque o texto agora é o TÍTULO real do livro, não mais o slug
 * (que só tinha `[a-z0-9-]` e nunca precisou disso) — um título com "&", "<",
 * ">" ou aspas sem escape gera XML inválido e derruba o `sharp` com exceção.
 */
export function escapeXml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Quebra `titulo` em linhas de até `maxCaracteres`, sem cortar palavras ao
 * meio, com no máximo `maxLinhas` linhas. Se o título não couber nesse
 * limite, a última linha é truncada com "…" — melhor um título cortado no
 * fim, de forma visível, do que cortado nas duas pontas como acontecia antes.
 *
 * Devolve `{linhas, truncado}`: `truncado` deixa o chamador decidir se tenta
 * um layout com fonte menor (mais caracteres por linha) antes de aceitar o
 * corte.
 */
export function quebrarLinhas(titulo, maxCaracteres, maxLinhas) {
    const palavras = String(titulo).split(/\s+/).filter(Boolean);
    const linhas = [];
    let atual = '';
    let indice = 0;

    while (indice < palavras.length) {
        const palavra = palavras[indice];
        const candidata = atual ? `${atual} ${palavra}` : palavra;
        if (candidata.length <= maxCaracteres || !atual) {
            atual = candidata;
            indice++;
        } else {
            linhas.push(atual);
            atual = '';
            if (linhas.length >= maxLinhas) break;
        }
    }
    if (atual && linhas.length < maxLinhas) {
        linhas.push(atual);
    }

    const truncado = indice < palavras.length;
    if (truncado) {
        let ultima = linhas[linhas.length - 1] ?? '';
        while (ultima.length > Math.max(0, maxCaracteres - 1)) {
            ultima = ultima.slice(0, -1);
        }
        linhas[linhas.length - 1] = `${ultima.trimEnd()}…`;
    }

    return {linhas, truncado};
}

/**
 * Níveis de tamanho de fonte, do maior para o menor. `caracteres` é o limite
 * por linha estimado para caber nos 400px de largura do SVG (~0.55 * fonte
 * por caractere em sans-serif, com folga para letras largas/maiúsculas).
 * `linhas` é o máximo de linhas tentado nesse nível antes de cair para o
 * próximo (fonte menor = mais linhas cabem na altura de 600px).
 */
const NIVEIS_FONTE = [
    {fonte: 28, alturaLinha: 34, caracteres: 20, linhas: 4},
    {fonte: 24, alturaLinha: 29, caracteres: 24, linhas: 5},
    {fonte: 20, alturaLinha: 24, caracteres: 28, linhas: 6},
];

/**
 * Escolhe o maior nível de fonte cujo texto quebrado cabe sem truncar; se
 * nem o menor nível couber, usa o menor mesmo assim (já truncado com "…" por
 * `quebrarLinhas`) — títulos absurdamente longos não podem travar a geração.
 */
function escolherLayoutTexto(titulo) {
    for (let i = 0; i < NIVEIS_FONTE.length; i++) {
        const nivel = NIVEIS_FONTE[i];
        const ultimoNivel = i === NIVEIS_FONTE.length - 1;
        const {linhas, truncado} = quebrarLinhas(titulo, nivel.caracteres, nivel.linhas);
        if (!truncado || ultimoNivel) {
            return {linhas, fonte: nivel.fonte, alturaLinha: nivel.alturaLinha};
        }
    }
    // Inatingível (o loop sempre devolve no último nível), só para o linter.
    return {linhas: [String(titulo)], fonte: NIVEIS_FONTE[0].fonte, alturaLinha: NIVEIS_FONTE[0].alturaLinha};
}

/**
 * Capa placeholder: retângulo na cor da categoria com o TÍTULO do livro
 * escrito, quebrado em várias linhas e centralizado verticalmente.
 *
 * A cor do texto nunca é fixa — `corDeTextoSobre` escolhe preto ou branco
 * conforme a cor de fundo, para que todo par passe WCAG AA (mesmo defeito já
 * corrigido nos componentes React na Task 9, agora corrigido aqui também).
 */
async function gerarPlaceholder(titulo, categoryId, destino) {
    const cor = getCategory(categoryId)?.cor ?? '#64748b';
    const corTexto = corDeTextoSobre(cor);
    const {linhas, fonte, alturaLinha} = escolherLayoutTexto(titulo);

    const centroY = ALTURA_SVG / 2;
    const yInicial = centroY - ((linhas.length - 1) * alturaLinha) / 2;
    const tspans = linhas
        .map((linha, i) => `<tspan x="${LARGURA_SVG / 2}" y="${yInicial + i * alturaLinha}">${escapeXml(linha)}</tspan>`)
        .join('\n        ');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA_SVG}" height="${ALTURA_SVG}">
  <rect width="${LARGURA_SVG}" height="${ALTURA_SVG}" fill="${cor}"/>
  <text font-family="sans-serif" font-size="${fonte}" fill="${corTexto}" text-anchor="middle">
        ${tspans}
  </text>
</svg>`;
    await sharp(Buffer.from(svg)).jpeg({quality: 82}).toFile(destino);
    return cor;
}

/**
 * Devolve { coverPath, spineColor, placeholder }.
 * `coverPath` é o caminho público (/livros/capas/<slug>.jpg), não o do disco.
 * `titulo` é usado só para o texto do placeholder (quando a capa real falha
 * ou não existe) — `slug` continua sendo o nome do arquivo no disco.
 */
export async function baixarCapa(coverUrl, slug, categoryId, root, titulo) {
    const pasta = join(root, 'public', 'livros', 'capas');
    await mkdir(pasta, {recursive: true});
    const destino = join(pasta, `${slug}.jpg`);
    const coverPath = `/livros/capas/${slug}.jpg`;

    if (!coverUrl) {
        const cor = await gerarPlaceholder(titulo ?? slug, categoryId, destino);
        return {coverPath, spineColor: cor, placeholder: true};
    }

    let buffer;
    try {
        const res = await fetch(coverUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        buffer = Buffer.from(await res.arrayBuffer());
    } catch {
        const cor = await gerarPlaceholder(titulo ?? slug, categoryId, destino);
        return {coverPath, spineColor: cor, placeholder: true};
    }

    if (buffer.length < BYTES_MINIMOS) {
        const cor = await gerarPlaceholder(titulo ?? slug, categoryId, destino);
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
        const cor = await gerarPlaceholder(titulo ?? slug, categoryId, destino);
        return {coverPath, spineColor: cor, placeholder: true};
    }
}
