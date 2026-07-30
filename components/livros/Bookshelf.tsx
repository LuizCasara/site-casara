'use client';

import Book, {type ShelfBookData} from '@/components/livros/Book';
import {ROOM_ANCHORS} from '@/components/livros/Room';
import {shelfWidthM, SHELF_GAP_M} from '@/lib/book-dimensions.mjs';
import type {SpineAtlas} from '@/lib/spine-canvas';

type BookshelfProps = {
    shelfBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
    isMobile: boolean;
};

export default function Bookshelf({shelfBooks, atlas, openSlug, animate, isMobile}: BookshelfProps) {
    const larguraTotal = shelfWidthM(shelfBooks);

    let xAtual = -larguraTotal / 2;
    const posicoes = shelfBooks.map((b) => {
        const x = xAtual + b.thicknessM / 2;
        xAtual += b.thicknessM + SHELF_GAP_M;
        return x;
    });

    const anchor = ROOM_ANCHORS.estante;
    // Casar por slug, não por índice: shelfBooks pode chegar reordenado
    // (ordenação) ou como subconjunto (filtro), mas o atlas é gerado uma vez
    // só, na ordem original.
    const spineBySlug = new Map<string, {u0: number; u1: number}>(
        atlas.layout.spines.map((s: {slug: string; u0: number; u1: number}) => [s.slug, s]),
    );

    return (
        <group position={anchor.position} rotation={anchor.rotation}>
            {shelfBooks.map((book, i) => {
                const spine = spineBySlug.get(book.slug);
                if (!spine) return null; // não deveria acontecer — o atlas cobre todo livro 'lido'
                return (
                    <Book
                        key={book.slug}
                        book={book}
                        position={[posicoes[i], book.heightM / 2, 0]}
                        atlasTexture={atlas.texture}
                        uvRange={{u0: spine.u0, u1: spine.u1}}
                        isOpen={book.slug === openSlug}
                        animate={animate}
                        isMobile={isMobile}
                    />
                );
            })}
        </group>
    );
}
