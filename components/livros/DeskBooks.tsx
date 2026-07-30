'use client';

import Book, {type ShelfBookData} from '@/components/livros/Book';
import {ROOM_ANCHORS} from '@/components/livros/Room';
import {layoutDeskBooks} from '@/lib/book-dimensions.mjs';
import type {SpineAtlas} from '@/lib/spine-canvas';

// Altura do centro do livro deitado acima do tampo — metade da espessura do
// tampo (0.02m) mais uma folga pequena pra não cravar dentro da madeira.
const DESK_BOOK_Y_OFFSET_M = 0.05;

type DeskBooksProps = {
    deskBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
    isMobile: boolean;
};

/**
 * Livros com status 'lendo' — soltos sobre a mesa, de capa virada (não de
 * lombada como na estante). `atlasTexture`/`uvRange` ainda são exigidos por
 * Book.tsx (usados só na face da lombada, que aqui nunca fica visível de
 * propósito — o livro descansa virado de capa pra cima), então passamos o
 * mesmo atlas da estante e um UV qualquer; nenhum atlas extra é gerado só
 * pra isto.
 */
export default function DeskBooks({deskBooks, atlas, openSlug, animate, isMobile}: DeskBooksProps) {
    const anchor = ROOM_ANCHORS.mesa;
    const layout = layoutDeskBooks(deskBooks.map((b) => b.slug));

    return (
        <group position={anchor.position} rotation={anchor.rotation}>
            {deskBooks.map((book) => {
                const slot = layout.find((l: {slug: string}) => l.slug === book.slug);
                if (!slot) return null; // acervo com mais de 3 'lendo' — ver layoutDeskBooks
                return (
                    <Book
                        key={book.slug}
                        book={book}
                        position={[slot.x, DESK_BOOK_Y_OFFSET_M, slot.z]}
                        atlasTexture={atlas.texture}
                        uvRange={{u0: 0, u1: 1}}
                        isOpen={book.slug === openSlug}
                        animate={animate}
                        isMobile={isMobile}
                        restVariant="capa"
                        restRotationY={slot.rotationY}
                    />
                );
            })}
        </group>
    );
}
