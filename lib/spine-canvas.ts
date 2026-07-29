import * as THREE from 'three';
import {layoutSpineAtlas} from '@/lib/book-dimensions.mjs';
import {corDeTextoSobre} from '@/lib/contraste.mjs';

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
    const cor = book.spineColor || FALLBACK_SPINE_COLOR;
    ctx.fillStyle = cor;
    ctx.fillRect(xPx, 0, widthPx, heightPx);

    const corTexto = corDeTextoSobre(cor);
    ctx.save();
    ctx.translate(xPx + widthPx / 2, heightPx - 24);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = corTexto;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const maxLargura = heightPx - 48;
    const tamanhoTitulo = Math.min(28, Math.max(14, widthPx * 0.45));
    ctx.font = `700 ${tamanhoTitulo}px Quicksand, sans-serif`;
    ctx.fillText(truncarParaLargura(ctx, book.title, maxLargura), 0, 0);

    if (book.author) {
        ctx.font = `400 ${tamanhoTitulo * 0.7}px Quicksand, sans-serif`;
        ctx.fillText(truncarParaLargura(ctx, book.author, maxLargura), 0, tamanhoTitulo + 10);
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
