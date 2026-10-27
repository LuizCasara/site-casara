'use client';

import {Suspense} from 'react';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import {BOOKSHELF_SIZE_M, NICHOS_POR_ESTANTE} from '@/lib/livros/sala/bookshelf-model.mjs';
import {contarEstantes} from '@/lib/livros/sala/shelf-years.mjs';

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
 * Folga entre duas estantes vizinhas. **Zero desde 27/10/2026**: com a vizinha
 * espelhada (ver `ladoDaEstante`), os nichos das duas se encontram no meio e as
 * laterais encostam — o conjunto lê como um móvel só. Era 0,06.
 */
const ESTANTE_GAP_M = 0;

/**
 * Quanto o conjunto escorrega para a esquerda do centro da parede.
 *
 * **Existe por causa da mesa do PC**, cuja pegada começa em x ≈ 0,72 (quina da
 * parede lateral menos o lado do L). Centrado, o conjunto de duas estantes
 * terminava em x = 0,87 — 14cm dentro da mesa —, e encostar as duas sozinho
 * só recuperava 3. Com este desvio a borda direita fica em ≈ 0,70. À esquerda
 * sobra folga: o Gorillaz estava a 33,5cm.
 */
const DESVIO_DO_CONJUNTO_X = -0.135;

/**
 * Ponto do chão sob o centro da estante `indice`, com o conjunto todo
 * centralizado na parede (menos `DESVIO_DO_CONJUNTO_X`). Com uma estante só
 * devolve a âncora deslocada; com duas, uma vai pra esquerda e outra pra direita.
 */
export function posicaoDaEstante(indice: number, total: number): [number, number, number] {
    const passo = BOOKSHELF_SIZE_M.larguraM + ESTANTE_GAP_M;
    const x = (indice - (total - 1) / 2) * passo + DESVIO_DO_CONJUNTO_X;
    const base = ESTANTE_ANCHOR.position;
    return [base[0] + x, base[1], base[2]];
}

/**
 * `1` para a estante como o arquivo veio, `-1` para a espelhada em X. Estantes
 * de índice ímpar são espelhadas, para que o zigue-zague de uma responda ao da
 * vizinha e os nichos se encontrem no meio em vez de repetir o mesmo desenho.
 *
 * Quem posiciona algo por nicho (`offsetX`, `vitrineOffsetX`) multiplica por
 * isto — o deslocamento do nicho é relativo ao centro do móvel, então espelhar
 * o móvel é só trocar o sinal.
 */
export function ladoDaEstante(indice: number): 1 | -1 {
    return indice % 2 === 1 ? -1 : 1;
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
            {/*
              O espelho é escala -1 num <group> por fora, e não dentro do
              KenneyModel: ele já centraliza a peça pela bounding box, então o
              eixo do espelho cai no centro do móvel. O three inverte o winding
              das faces sozinho quando o determinante da matriz é negativo.
            */}
            {Array.from({length: total}, (_, i) => (
                <group key={i} position={posicaoDaEstante(i, total)} scale={[ladoDaEstante(i), 1, 1]}>
                    <KenneyModel
                        url={MODELOS.estanteLivros}
                        position={[0, 0, 0]}
                        alturaAlvo={BOOKSHELF_SIZE_M.alturaM}
                    />
                </group>
            ))}
        </Suspense>
    );
}
