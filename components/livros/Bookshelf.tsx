'use client';

import Book, {type ShelfBookData} from '@/components/livros/Book';
import {ROOM_ANCHORS} from '@/components/livros/Room';
import {shelfWidthM, splitShelfRows, SHELF_GAP_M, SHELF_ROW_SPACING_M} from '@/lib/book-dimensions.mjs';
import type {SpineAtlas} from '@/lib/spine-canvas';

type BookshelfProps = {
    shelfBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
    isMobile: boolean;
};

export default function Bookshelf({shelfBooks, atlas, openSlug, animate, isMobile}: BookshelfProps) {
    // Duas fileiras, não uma: com o acervo inteiro em fila única a estante
    // passava de 2,5m de largura, e o enquadramento que deixa a lombada
    // legível (câmera a ~1m) só alcançava o miolo — os livros das pontas
    // ficavam fora de quadro. Partindo ao meio, cada fileira cabe na tela.
    const fileiras: ShelfBookData[][] = splitShelfRows(shelfBooks);

    const anchor = ROOM_ANCHORS.estante;
    // Casar por slug, não por índice: shelfBooks pode chegar reordenado
    // (ordenação) ou como subconjunto (filtro), mas o atlas é gerado uma vez
    // só, na ordem original.
    const spineBySlug = new Map<string, {u0: number; u1: number}>(
        atlas.layout.spines.map((s: {slug: string; u0: number; u1: number}) => [s.slug, s]),
    );

    return (
        <group position={anchor.position} rotation={anchor.rotation}>
            {fileiras.map((fileira, indiceFileira) => {
                // A âncora da estante é o topo da prancha de BAIXO, então a
                // fileira 0 (a de cima) é a que sobe. Deriva de
                // `fileiras.length` e não de SHELF_ROWS pra continuar certo se
                // splitShelfRows devolver uma fileira só (acervo vazio).
                const y = (fileiras.length - 1 - indiceFileira) * SHELF_ROW_SPACING_M;

                const larguraFileira = shelfWidthM(fileira);
                let xAtual = -larguraFileira / 2;
                const posicoes = fileira.map((b) => {
                    const x = xAtual + b.thicknessM / 2;
                    xAtual += b.thicknessM + SHELF_GAP_M;
                    return x;
                });

                return fileira.map((book, i) => {
                    const spine = spineBySlug.get(book.slug);
                    if (!spine) return null; // não deveria acontecer — o atlas cobre todo livro 'lido'
                    return (
                        <Book
                            key={book.slug}
                            book={book}
                            position={[posicoes[i], y + book.heightM / 2, 0]}
                            atlasTexture={atlas.texture}
                            uvRange={{u0: spine.u0, u1: spine.u1}}
                            isOpen={book.slug === openSlug}
                            animate={animate}
                            isMobile={isMobile}
                            anchor={anchor}
                        />
                    );
                });
            })}
        </group>
    );
}
