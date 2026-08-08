'use client';

import {useMemo, useState} from 'react';
import type {Book} from '@/lib/books';
import {filtrarPorBusca} from '@/lib/busca-livros.mjs';
import {CATEGORIES} from '@/lib/book-categories.mjs';
import {useDebounce} from '@/components/livros/use-debounce';
import {trackBookFilter} from '@/utils/analytics';
import BookCard from '@/components/livros/BookCard';
import BookFilters from '@/components/livros/BookFilters';

/**
 * A grade de `/livros/lista`, com os filtros aplicados NO CLIENTE.
 *
 * Antes cada chip era um `<Link>` que recarregava a página com a query nova, e
 * o servidor devolvia a lista já filtrada. Duas coisas quebravam:
 *
 * 1. O Router Cache do Next reaproveita a entrada da mesma rota quando só a
 *    query string muda, então clicar num filtro podia devolver a lista
 *    anterior. Ficou visível quando `staleTimes.dynamic` subiu de zero para
 *    poder folhear os livros sem refazer request.
 * 2. Uma busca por texto exigiria uma navegação por tecla digitada.
 *
 * O acervo inteiro cabe numa página (~50 livros, e o server já os manda todos),
 * então filtrar em memória é instantâneo e não toca a rede. O servidor continua
 * entregando a lista COMPLETA no HTML — melhor para indexação do que um
 * subconjunto filtrado.
 *
 * A URL continua espelhando o estado — `/livros/lista?tag=x` abre já filtrado e
 * continua compartilhável —, mas por `history.replaceState`, sem envolver o
 * router: ver `sincronizarUrl`. `replace` e não `push` porque cada tecla
 * digitada viraria uma entrada no histórico, e sair da página exigiria apertar
 * "voltar" uma vez por caractere.
 */
export default function ListaFiltravel({livros, tags, iniciais}: {
    livros: Book[];
    tags: string[];
    iniciais: {categoria?: string; tag?: string; status?: string; busca?: string};
}) {
    const [filtros, setFiltros] = useState(iniciais);
    const [termo, setTermo] = useState(iniciais.busca ?? '');
    const termoAtrasado = useDebounce(termo, 300);

    const visiveis = useMemo(() => {
        const porCampos = livros.filter((l) => {
            if (filtros.categoria && l.category !== filtros.categoria) return false;
            if (filtros.tag && !l.tags.includes(filtros.tag)) return false;
            if (filtros.status && l.status !== filtros.status) return false;
            return true;
        });
        return filtrarPorBusca(porCampos, termoAtrasado) as Book[];
    }, [livros, filtros, termoAtrasado]);

    /**
     * Reescreve a barra de endereços, só isso — é para o filtro poder ser
     * compartilhado, não para navegar.
     *
     * `history.replaceState` e NÃO `router.replace`: o router dispararia uma
     * navegação do Next para `/livros/lista`, que é interceptada pela rota do
     * livro (ver LinkParaLista) e derrubaria a listagem a cada clique num
     * filtro. Aqui não há nada a buscar — a filtragem já aconteceu em memória.
     */
    const sincronizarUrl = (proximos: typeof filtros, busca: string) => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries({...proximos, busca})) if (v) params.set(k, String(v));
        const qs = params.toString();
        window.history.replaceState(null, '', qs ? `/livros/lista?${qs}` : '/livros/lista');
    };

    const mudarFiltro = (campo: 'categoria' | 'tag' | 'status', valor: string | null) => {
        const proximos = {...filtros, [campo]: valor ?? undefined};
        trackBookFilter(campo, valor ?? '');
        setFiltros(proximos);
        sincronizarUrl(proximos, termo);
    };

    const limpar = () => {
        trackBookFilter('limpar', '');
        setFiltros({});
        setTermo('');
        sincronizarUrl({}, '');
    };

    const mudarTermo = (valor: string) => {
        setTermo(valor);
        sincronizarUrl(filtros, valor);
    };

    return (
        <>
            <div className="mb-6">
                <input
                    type="search"
                    value={termo}
                    onChange={(e) => mudarTermo(e.target.value)}
                    placeholder="Buscar por título ou autor"
                    aria-label="Buscar por título ou autor"
                    className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-3 py-2
                               text-sm text-gray-900 placeholder:text-gray-400
                               focus:border-gray-400 focus:outline-none
                               dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
            </div>

            <BookFilters
                categorias={CATEGORIES}
                tags={tags}
                ativos={filtros}
                onFiltrar={mudarFiltro}
                onLimpar={limpar}
            />

            {/* O contador é a resposta imediata de que o filtro pegou — sem ele,
                uma busca que não acha nada é indistinguível de uma página
                quebrada. `aria-live` porque ele muda sem a página recarregar. */}
            <p className="mb-6 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
                {visiveis.length === livros.length
                    ? `${livros.length} ${livros.length === 1 ? 'livro' : 'livros'}`
                    : `${visiveis.length} de ${livros.length} livros`}
            </p>

            {visiveis.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-500">
                    Nenhum livro com esses filtros.
                </p>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {visiveis.map((l, i) => <BookCard key={l.slug} livro={l} posicao={i + 1}/>)}
                </div>
            )}
        </>
    );
}
