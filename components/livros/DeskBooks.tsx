'use client';

import Book, {type ShelfBookData} from '@/components/livros/Book';
import {ROOM_ANCHORS} from '@/components/livros/Room';
import {layoutDeskBooks} from '@/lib/book-dimensions.mjs';
import type {SpineAtlas} from '@/lib/spine-canvas';

// A âncora `mesa` já é o topo do tampo, então y local 0 é a superfície de
// apoio — layoutDeskBooks devolve a altura de cada livro a partir dali.
// Uma folga mínima evita z-fighting entre a capa de baixo e a madeira.
const DESK_STACK_LIFT_M = 0.002;
// Pilha encostada à esquerda do tampo: o lado direito é da folha do índice
// (ver ROOM_ANCHORS.indice). Com as duas no centro, uma cobria a outra.
const DESK_STACK_OFFSET_X_M = -0.13;

type DeskBooksProps = {
    deskBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
    isMobile: boolean;
};

/**
 * Livros com status 'lendo' — empilhados deitados sobre a mesa, capa pra cima
 * (não de lombada como na estante). `atlasTexture`/`uvRange` ainda são
 * exigidos por Book.tsx (usados só na face da lombada, que aqui fica virada
 * pro lado), então passamos o mesmo atlas da estante e um UV qualquer;
 * nenhum atlas extra é gerado só pra isto.
 */
export default function DeskBooks({deskBooks, atlas, openSlug, animate, isMobile}: DeskBooksProps) {
    const anchor = ROOM_ANCHORS.mesa;
    // Passa os livros inteiros, não só os slugs: a altura de cada um na pilha
    // depende da espessura dos que estão embaixo.
    const layout = layoutDeskBooks(deskBooks);

    return (
        <group position={anchor.position} rotation={anchor.rotation}>
            {deskBooks.map((book) => {
                const slot = layout.find((l: {slug: string}) => l.slug === book.slug) as
                    {x: number; y: number; z: number; rotationY: number} | undefined;
                if (!slot) return null; // acervo com mais de 3 'lendo' — ver layoutDeskBooks
                return (
                    <Book
                        key={book.slug}
                        book={book}
                        position={[DESK_STACK_OFFSET_X_M + slot.x, DESK_STACK_LIFT_M + slot.y, slot.z]}
                        atlasTexture={atlas.texture}
                        uvRange={{u0: 0, u1: 1}}
                        isOpen={book.slug === openSlug}
                        animate={animate}
                        isMobile={isMobile}
                        anchor={anchor}
                        restVariant="capa"
                        restRotationY={slot.rotationY}
                    />
                );
            })}
        </group>
    );
}
