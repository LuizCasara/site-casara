'use client';

import Book, {type ShelfBookData} from '@/components/livros/Book';
import {posicaoDaEstante} from '@/components/livros/decor/EstanteDoAcervo';
import {BOOKSHELF_SIZE_M, NICHOS_POR_ESTANTE} from '@/lib/bookshelf-model.mjs';
import {contarEstantes} from '@/lib/shelf-years.mjs';
import {layoutTorreDeLivros} from '@/lib/book-dimensions.mjs';
import type {SpineAtlas} from '@/lib/spine-canvas';

/**
 * A fila de leitura: os livros com status 'quero-ler', deitados uns sobre os
 * outros numa torre no chão, à esquerda da estante do acervo.
 *
 * São livros completos, não cenário — hover com título e nota, clique que abre
 * a página, a mesma animação de abertura de qualquer volume. A diferença é só
 * onde eles esperam a vez.
 *
 * A torre fica RENTE à lateral da estante e um pouco à frente dela, para não
 * sumir atrás do móvel na visão geral da sala.
 */

/** Folga entre a lateral da estante e o eixo da torre. */
const AFASTAMENTO_M = 0.26;
/** O quanto a torre se adianta em relação ao plano da estante. */
const AVANCO_M = 0.1;

type TorreQueroLerProps = {
    livros: ShelfBookData[];
    atlas: SpineAtlas;
    openSlug: string | null;
    animate: boolean;
    isMobile: boolean;
    /** Quantos grupos de ano existem — define quantas estantes há na parede. */
    gruposDeAno: number;
};

export default function TorreQueroLer({
    livros, atlas, openSlug, animate, isMobile, gruposDeAno,
}: TorreQueroLerProps) {
    if (livros.length === 0) return null;

    // A partir da PRIMEIRA estante, não da âncora do conjunto: as duas coincidem
    // enquanto há um móvel só, mas quando o acervo transborda para o segundo a
    // âncora continua no centro da parede e a estante da esquerda anda meio
    // passo — a torre ficaria atrás dela. Mesmo cuidado de `posicaoDaLavaLamp`.
    const base = posicaoDaEstante(0, contarEstantes(gruposDeAno, NICHOS_POR_ESTANTE));
    const ancora = {
        position: [
            base[0] - BOOKSHELF_SIZE_M.larguraM / 2 - AFASTAMENTO_M,
            0,
            base[2] + AVANCO_M,
        ] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    };

    const layout = layoutTorreDeLivros(livros);
    // Casar por slug, não por índice: o atlas é gerado uma vez, na ordem
    // original, e esta lista pode chegar reordenada.
    const spineBySlug = new Map<string, {u0: number; u1: number}>(
        atlas.layout.spines.map((s: {slug: string; u0: number; u1: number}) => [s.slug, s]),
    );

    return (
        <group position={ancora.position}>
            {livros.map((book) => {
                const slot = layout.find((l: {slug: string}) => l.slug === book.slug) as
                    {x: number; y: number; z: number; rotationY: number} | undefined;
                const spine = spineBySlug.get(book.slug);
                if (!slot || !spine) return null;
                return (
                    <Book
                        key={book.slug}
                        book={book}
                        position={[slot.x, slot.y, slot.z]}
                        atlasTexture={atlas.texture}
                        uvRange={{u0: spine.u0, u1: spine.u1}}
                        isOpen={book.slug === openSlug}
                        animate={animate}
                        isMobile={isMobile}
                        anchor={ancora}
                        restVariant="capa"
                        restRotationY={slot.rotationY}
                    />
                );
            })}
        </group>
    );
}
