'use client';

import {Suspense} from 'react';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import {BOOKSHELF_SIZE_M, NICHOS_POR_ESTANTE} from '@/lib/bookshelf-model.mjs';
import {contarEstantes} from '@/lib/shelf-years.mjs';

/**
 * **CONGELADO** — posição, escala, quantidade e divisão em nichos aprovadas pelo
 * dono do acervo em 06/08/2026. Este arquivo existe para que as rodadas de
 * layout da sala aconteçam em Room.tsx SEM tocar aqui. Só mexer com pedido
 * explícito.
 *
 * O móvel — os LIVROS dentro dele são assunto de Bookshelf.tsx, que se posiciona
 * a partir de `ESTANTE_ANCHOR` e `posicaoDaEstante` publicados aqui: cenário não
 * sabe o que é um livro.
 */

/**
 * Ponto do CHÃO sob o centro da primeira estante (o contrato de posicionamento
 * do KenneyModel): o móvel assenta no piso e encosta na parede de fundo
 * (-1.6 mais metade da profundidade dele).
 */
export const ESTANTE_ANCHOR = {
    position: [0, 0, -1.6 + BOOKSHELF_SIZE_M.profundidadeM / 2] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
};

/**
 * Folga entre duas estantes vizinhas. Pequena de propósito: elas leem como um
 * conjunto, não como dois móveis que por acaso estão na mesma parede.
 */
const ESTANTE_GAP_M = 0.06;

/**
 * Ponto do chão sob o centro da estante `indice`, com o conjunto todo
 * centralizado na parede. Com uma estante só devolve a âncora; com duas, uma
 * vai pra esquerda e outra pra direita.
 */
export function posicaoDaEstante(indice: number, total: number): [number, number, number] {
    const passo = BOOKSHELF_SIZE_M.larguraM + ESTANTE_GAP_M;
    const x = (indice - (total - 1) / 2) * passo;
    const base = ESTANTE_ANCHOR.position;
    return [base[0] + x, base[1], base[2]];
}

/**
 * A estante do acervo — modelo GLB (CC0), não pranchas geradas em código.
 *
 * Tem o SEU PRÓPRIO <Suspense>, separado do que embrulha o resto da mobília:
 * ela é o motivo da sala existir, e compartilhar a fronteira faria a chegada
 * de uma poltrona qualquer segurar a aparição do acervo.
 *
 * Uma segunda estante só é montada quando os grupos de ano não cabem na
 * primeira — ver contarEstantes.
 */
export default function EstanteDoAcervo({gruposDeAno}: {gruposDeAno: number}) {
    const total = contarEstantes(gruposDeAno, NICHOS_POR_ESTANTE);

    return (
        <Suspense fallback={null}>
            {Array.from({length: total}, (_, i) => (
                <KenneyModel
                    key={i}
                    url={MODELOS.estanteLivros}
                    position={posicaoDaEstante(i, total)}
                    alturaAlvo={BOOKSHELF_SIZE_M.alturaM}
                />
            ))}
        </Suspense>
    );
}
