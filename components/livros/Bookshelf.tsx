'use client';

import Book, {type ShelfBookData} from '@/components/livros/Book';
import {ROOM_ANCHORS, posicaoDaEstante} from '@/components/livros/Room';
import {shelfWidthM, SHELF_GAP_M} from '@/lib/book-dimensions.mjs';
import {NICHOS, NICHOS_POR_ESTANTE, NICHO_CAPACIDADE_M} from '@/lib/bookshelf-model.mjs';
import {agruparPorAnoDeLeitura, livrosDoGrupo, contarEstantes} from '@/lib/shelf-years.mjs';
import type {SpineAtlas} from '@/lib/spine-canvas';

type BookshelfProps = {
    /** Acervo INTEIRO — define o agrupamento, que não pode mudar ao filtrar. */
    todosOsLivros: ShelfBookData[];
    /** O que está visível agora (já ordenado e filtrado pelo Índice). */
    shelfBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
    isMobile: boolean;
};

export default function Bookshelf({todosOsLivros, shelfBooks, atlas, openSlug, animate, isMobile}: BookshelfProps) {
    // O agrupamento sai do acervo COMPLETO: filtrar esconde livros, nunca
    // muda de que ano é cada nicho (ver spec, D6).
    const grupos = agruparPorAnoDeLeitura(todosOsLivros, NICHO_CAPACIDADE_M);
    const totalEstantes = contarEstantes(grupos.length, NICHOS_POR_ESTANTE);

    // Casar por slug, não por índice: shelfBooks pode chegar reordenado
    // (ordenação) ou como subconjunto (filtro), mas o atlas é gerado uma vez
    // só, na ordem original.
    const spineBySlug = new Map<string, {u0: number; u1: number}>(
        atlas.layout.spines.map((s: {slug: string; u0: number; u1: number}) => [s.slug, s]),
    );

    return (
        <>
            {grupos.map((grupo: {anos: number[]; rotulo: string; temSemData: boolean}, iGrupo: number) => {
                const iEstante = Math.floor(iGrupo / NICHOS_POR_ESTANTE);
                const nicho = NICHOS[iGrupo % NICHOS_POR_ESTANTE];
                const base = posicaoDaEstante(iEstante, totalEstantes);

                const livros: ShelfBookData[] = livrosDoGrupo(grupo, shelfBooks);
                // Fila centrada dentro do nicho, não colada à esquerda: um ano
                // com poucos livros num nicho largo lê melhor centralizado do
                // que empurrado pra um canto.
                const largura = shelfWidthM(livros);
                let xAtual = -largura / 2;

                return (
                    <group key={grupo.rotulo}>
                        {livros.map((book) => {
                            const spine = spineBySlug.get(book.slug);
                            if (!spine) return null; // não deveria acontecer — o atlas cobre todo livro 'lido'
                            const x = xAtual + book.thicknessM / 2;
                            xAtual += book.thicknessM + SHELF_GAP_M;
                            return (
                                <Book
                                    key={book.slug}
                                    book={book}
                                    position={[
                                        base[0] + nicho.offsetX + x,
                                        base[1] + nicho.pisoY + book.heightM / 2,
                                        base[2],
                                    ]}
                                    atlasTexture={atlas.texture}
                                    uvRange={{u0: spine.u0, u1: spine.u1}}
                                    isOpen={book.slug === openSlug}
                                    animate={animate}
                                    isMobile={isMobile}
                                    anchor={ROOM_ANCHORS.estante}
                                />
                            );
                        })}
                    </group>
                );
            })}
        </>
    );
}
