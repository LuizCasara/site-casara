'use client';

import {Html} from '@react-three/drei';
import Book, {type ShelfBookData} from '@/components/livros/sala/Book';
import {ESTANTE_ANCHOR, ladoDaEstante, posicaoDaEstante} from '@/components/livros/decor/EstanteDoAcervo';
import {NICHOS, NICHOS_POR_ESTANTE, NICHO_CAPACIDADE_M, BOOKSHELF_SIZE_M} from '@/lib/livros/sala/bookshelf-model.mjs';
import {agruparPorAnoDeLeitura, livrosDoGrupo, contarEstantes, posicoesNoNicho} from '@/lib/livros/sala/shelf-years.mjs';
import type {SpineAtlas} from '@/lib/livros/sala/spine-canvas';

type BookshelfProps = {
    /** Acervo INTEIRO — define o agrupamento, que não pode mudar ao filtrar. */
    todosOsLivros: ShelfBookData[];
    /** O que está visível agora (já ordenado e filtrado pelo Índice). */
    shelfBooks: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
    isMobile: boolean;
    /** Índice do grupo em foco, ou null na visão da estante inteira. */
    grupoFocado: number | null;
    onSelecionarGrupo: (indice: number) => void;
    /**
     * As etiquetas de ano só aparecem na cena da estante. Como elas têm
     * tamanho fixo em pixels, deixá-las ligadas na visão "Sala" encheria de
     * balões um móvel que ali é do tamanho de um selo.
     */
    mostrarEtiquetas: boolean;
};

export default function Bookshelf({
    todosOsLivros, shelfBooks, atlas, openSlug, animate, isMobile,
    grupoFocado, onSelecionarGrupo, mostrarEtiquetas,
}: BookshelfProps) {
    // O agrupamento sai do acervo COMPLETO: filtrar esconde livros, nunca muda
    // de que ano é cada nicho — senão os anos trocariam de prateleira debaixo do
    // dedo de quem está filtrando.
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
                const nichoX = base[0] + ladoDaEstante(iEstante) * nicho.offsetX;

                const livros: ShelfBookData[] = livrosDoGrupo(grupo, shelfBooks);
                // Um ano: fila centrada. Dois: cada ano encosta numa lateral —
                // ver posicoesNoNicho.
                const posicoes = posicoesNoNicho(grupo, livros, nicho.larguraUtilM);

                // Com filtro ativo a etiqueta vira contador ("2023 · 4") e o ano
                // que zerou fica apagado e sem clique — não faria sentido dar
                // zoom num nicho vazio.
                const totalDoGrupo = livrosDoGrupo(grupo, todosOsLivros).length;
                const filtrado = livros.length !== totalDoGrupo;
                const vazio = livros.length === 0;

                return (
                    <group key={grupo.rotulo}>
                        {/*
                          Etiqueta do ano, na borda frontal da prateleira. Ela
                          acumula as duas funções: diz que ano é aquela
                          prateleira E é o botão que dá zoom nele.

                          Sem `distanceFactor` nem `occlude`, pelos mesmos
                          motivos do balão de hover do livro (ver Book.tsx): ela
                          é vista tanto de 2,7m quanto de 0,6m, e sumir atrás da
                          poltrona faria o ano do nicho de baixo desaparecer.
                        */}
                        {mostrarEtiquetas && (
                            <Html
                                position={[
                                    nichoX,
                                    base[1] + nicho.pisoY - 0.035,
                                    base[2] + BOOKSHELF_SIZE_M.profundidadeM / 2,
                                ]}
                                center
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelecionarGrupo(iGrupo);
                                    }}
                                    disabled={vazio}
                                    aria-current={grupoFocado === iGrupo ? 'true' : undefined}
                                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px]
                                                font-semibold shadow transition
                                                disabled:cursor-not-allowed disabled:opacity-40 ${
                                        grupoFocado === iGrupo
                                            ? 'bg-white text-black'
                                            : 'bg-black/70 text-white/90 hover:bg-black/90'
                                    }`}
                                >
                                    {grupo.rotulo}{filtrado && ` · ${livros.length}`}
                                </button>
                            </Html>
                        )}
                        {posicoes.map(({livro: book, x}) => {
                            const spine = spineBySlug.get(book.slug);
                            if (!spine) return null; // não deveria acontecer — o atlas cobre todo livro 'lido'
                            return (
                                <Book
                                    key={book.slug}
                                    book={book}
                                    position={[
                                        nichoX + x,
                                        base[1] + nicho.pisoY + book.heightM / 2,
                                        base[2],
                                    ]}
                                    atlasTexture={atlas.texture}
                                    uvRange={{u0: spine.u0, u1: spine.u1}}
                                    isOpen={book.slug === openSlug}
                                    animate={animate}
                                    isMobile={isMobile}
                                    anchor={ESTANTE_ANCHOR}
                                />
                            );
                        })}
                    </group>
                );
            })}
        </>
    );
}
