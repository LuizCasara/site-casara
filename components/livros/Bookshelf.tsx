'use client';

import Book, {type ShelfBookData} from '@/components/livros/Book';
import {ROOM_ANCHORS} from '@/components/livros/Room';
import type {SpineAtlas} from '@/lib/spine-canvas';

const GAP_M = 0.003;

type BookshelfProps = {
    shelfBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
};

export default function Bookshelf({shelfBooks, atlas, openSlug, animate}: BookshelfProps) {
    const larguraTotal = shelfBooks.reduce((soma, b) => soma + b.thicknessM + GAP_M, 0) - GAP_M;

    let xAtual = -larguraTotal / 2;
    const posicoes = shelfBooks.map((b) => {
        const x = xAtual + b.thicknessM / 2;
        xAtual += b.thicknessM + GAP_M;
        return x;
    });

    const anchor = ROOM_ANCHORS.estante;

    return (
        <group position={anchor.position} rotation={anchor.rotation}>
            {shelfBooks.map((book, i) => (
                <Book
                    key={book.slug}
                    book={book}
                    position={[posicoes[i], book.heightM / 2, 0]}
                    atlasTexture={atlas.texture}
                    uvRange={{u0: atlas.layout.spines[i].u0, u1: atlas.layout.spines[i].u1}}
                    isOpen={book.slug === openSlug}
                    animate={animate}
                />
            ))}
        </group>
    );
}
