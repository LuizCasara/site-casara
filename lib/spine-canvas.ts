import * as THREE from 'three';
import {layoutSpineAtlas} from '@/lib/book-dimensions.mjs';
import {corDeTextoSobre} from '@/lib/contraste.mjs';
import {corDeLombada} from '@/lib/cor-lombada.mjs';

export type SpineSourceBook = {
    slug: string;
    title: string;
    author: string | null;
    spineColor: string | null;
    thicknessM: number;
};

export type SpineAtlas = {
    texture: THREE.CanvasTexture;
    layout: ReturnType<typeof layoutSpineAtlas>;
};

const FALLBACK_SPINE_COLOR = '#4b4b4b';

function truncarParaLargura(ctx: CanvasRenderingContext2D, texto: string, maxLargura: number): string {
    if (ctx.measureText(texto).width <= maxLargura) return texto;
    let truncado = texto;
    while (truncado.length > 1 && ctx.measureText(truncado + '…').width > maxLargura) {
        truncado = truncado.slice(0, -1);
    }
    return truncado + '…';
}

function desenharLombada(
    ctx: CanvasRenderingContext2D,
    book: SpineSourceBook,
    xPx: number,
    widthPx: number,
    heightPx: number,
) {
    // A cor crua da capa passa pela paleta da sala antes de virar tinta —
    // pastel e quente, com teto de brilho (ver lib/cor-lombada.mjs). O texto é
    // calculado sobre a cor JÁ corrigida, senão o contraste seria decidido
    // contra uma cor que ninguém vai ver.
    const cor = corDeLombada(book.spineColor || FALLBACK_SPINE_COLOR);
    ctx.fillStyle = cor;
    ctx.fillRect(xPx, 0, widthPx, heightPx);

    const corTexto = corDeTextoSobre(cor);
    ctx.save();
    ctx.translate(xPx + widthPx / 2, heightPx - 24);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = corTexto;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Depois do rotate(-90°), o eixo `y` local corre na LARGURA da lombada:
    // um deslocamento em y aqui é um deslocamento horizontal dentro da fatia
    // deste livro no atlas, e a fatia vai de -widthPx/2 a +widthPx/2 a
    // partir daqui. O código antigo colocava o autor em `tamanhoTitulo + 10`,
    // que estoura essa metade em lombadas finas e ia desenhar por cima da
    // fatia do livro VIZINHO. Por isso os tamanhos e as posições abaixo são
    // todos frações de widthPx, e a soma delas cabe dentro de 1.
    const maxLargura = heightPx - 48;
    const temAutor = Boolean(book.author);

    // Sem teto, uma lombada grossa (ex.: 1232 páginas) gerava uma fonte tão
    // grande que o título estourava `maxLargura` em poucos caracteres — "A
    // Revolta de Atlas" virava "A revo…". O piso de 16 continua evitando
    // texto ilegível em lombadas finas; o teto agora evita o oposto.
    const tamanhoTitulo = Math.min(40, Math.max(16, widthPx * 0.40));
    const tamanhoAutor = tamanhoTitulo * 0.6;
    const respiro = tamanhoTitulo * 0.15;
    const alturaBloco = temAutor ? tamanhoTitulo + respiro + tamanhoAutor : tamanhoTitulo;

    const centroTitulo = -alturaBloco / 2 + tamanhoTitulo / 2;
    ctx.font = `700 ${tamanhoTitulo}px Quicksand, sans-serif`;
    ctx.fillText(truncarParaLargura(ctx, book.title, maxLargura), 0, centroTitulo);

    if (book.author) {
        const centroAutor = centroTitulo + tamanhoTitulo / 2 + respiro + tamanhoAutor / 2;
        ctx.font = `400 ${tamanhoAutor}px Quicksand, sans-serif`;
        ctx.fillText(truncarParaLargura(ctx, book.author, maxLargura), 0, centroAutor);
    }
    ctx.restore();
}

/**
 * Espera as fontes carregarem antes de desenhar — a textura é gerada uma vez
 * só e fica gravada; se desenhar cedo demais, a fonte errada fica gravada
 * pro resto da sessão (diferente de texto em DOM, que reflui sozinho).
 */
export async function buildSpineAtlas(books: SpineSourceBook[]): Promise<SpineAtlas> {
    const layout = layoutSpineAtlas(books.map((b) => ({slug: b.slug, thicknessM: b.thicknessM})));

    if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready;
    }

    const canvas = document.createElement('canvas');
    canvas.width = layout.atlasWidthPx;
    canvas.height = layout.atlasHeightPx;
    const ctx = canvas.getContext('2d')!;

    books.forEach((book, i) => {
        const spine = layout.spines[i];
        desenharLombada(ctx, book, spine.xPx, spine.widthPx, layout.atlasHeightPx);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return {texture, layout};
}
