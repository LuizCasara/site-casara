'use client';

import {useEffect, useState} from 'react';
import {CATEGORIES} from '@/lib/book-categories.mjs';
import {SORT_CRITERIA} from '@/lib/livros-shelf.mjs';
import {corDeTextoSobre} from '@/lib/contraste.mjs';
import {useDebounce} from '@/components/livros/use-debounce';
import LinkParaLista from '@/components/livros/LinkParaLista';

const SORT_LABELS: Record<string, string> = {
    padrao: 'Padrão',
    nota: 'Nota',
    ano: 'Ano',
    categoria: 'Categoria',
};

type IndiceFiltros = {categoria: string | null; tag: string | null; busca: string};

type IndexPanelProps = {
    tags: string[];
    sortCriterio: string;
    onSortChange: (criterio: string) => void;
    filtros: IndiceFiltros;
    onFilterChange: (filtros: IndiceFiltros) => void;
    onClose: () => void;
    /** Quantos livros sobraram na estante com os filtros de agora. */
    visiveis: number;
    total: number;
};

export default function IndexPanel({
    tags, sortCriterio, onSortChange, filtros, onFilterChange, onClose, visiveis, total,
}: IndexPanelProps) {
    // O campo é controlado localmente e só o valor ATRASADO sobe para quem
    // filtra a estante: digitar precisa responder na hora, mas reposicionar
    // cinquenta livros no 3D a cada tecla é trabalho jogado fora.
    const [termo, setTermo] = useState(filtros.busca);
    const termoAtrasado = useDebounce(termo, 300);

    useEffect(() => {
        if (termoAtrasado !== filtros.busca) onFilterChange({...filtros, busca: termoAtrasado});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [termoAtrasado]);

    return (
        // Encostado num canto, NÃO centralizado: a estante fica no meio da
        // tela, e o painel por cima dela escondia justamente o que muda quando
        // se filtra ou reordena. Em tela larga ele vai pra esquerda (onde fica
        // o canto de leitura); em tela estreita, pro rodapé, que é o único
        // lugar que sobra sem cobrir os livros.
        //
        // `pointer-events-none` no envelope: ele cobre a viewport inteira e,
        // opaco a cliques, engoliria o clique nos livros e nas etiquetas de
        // ano que continuam à vista atrás dele. O card devolve os eventos pra
        // si.
        <div className="pointer-events-none fixed inset-0 z-30 flex items-end justify-center p-4
                        md:items-center md:justify-start md:p-8">
            <div className="pointer-events-auto relative max-h-[70vh] w-full max-w-md overflow-y-auto
                            rounded-2xl bg-black/70 p-6 shadow-2xl backdrop-blur-md
                            md:max-h-[85vh]">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-sm text-white/60 hover:text-white"
                    aria-label="Fechar"
                >
                    ✕ fechar
                </button>

                <h2 className="mb-4 text-lg font-bold text-white">Índice</h2>

                <div className="mb-5">
                    <input
                        type="search"
                        value={termo}
                        onChange={(e) => setTermo(e.target.value)}
                        placeholder="Buscar por título ou autor"
                        aria-label="Buscar por título ou autor"
                        className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white
                                   placeholder:text-white/40 focus:bg-white/15 focus:outline-none"
                    />
                    <p className="mt-2 text-xs text-white/50" aria-live="polite">
                        {visiveis === total
                            ? `${total} livros na estante`
                            : `${visiveis} de ${total} livros`}
                    </p>
                </div>

                <div className="mb-5">
                    <p className="mb-2 text-xs font-bold uppercase text-white/50">Ordenar por</p>
                    <div className="flex flex-wrap gap-2">
                        {SORT_CRITERIA.map((criterio: string) => (
                            <button
                                key={criterio}
                                onClick={() => onSortChange(criterio)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                    sortCriterio === criterio
                                        ? 'bg-white text-black'
                                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                                }`}
                            >
                                {SORT_LABELS[criterio]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-5">
                    <p className="mb-2 text-xs font-bold uppercase text-white/50">Categoria</p>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((c: {id: string; nome: string; cor: string}) => {
                            const ativo = filtros.categoria === c.id;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => onFilterChange({
                                        ...filtros,
                                        categoria: ativo ? null : c.id,
                                    })}
                                    className="rounded-full px-3 py-1 text-xs font-medium transition"
                                    style={ativo
                                        ? {backgroundColor: c.cor, color: corDeTextoSobre(c.cor)}
                                        : {backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)'}}
                                >
                                    {c.nome}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mb-5">
                    {/* A mesma coisa vista de outro jeito: a estante mostra o
                        acervo em 3D, a listagem mostra em grade, com as capas.
                        Leva os filtros junto para a troca não perder o
                        contexto de quem já filtrou aqui. */}
                    <LinkParaLista
                        query={{categoria: filtros.categoria, tag: filtros.tag, busca: filtros.busca}}
                        className="inline-flex items-center gap-1 text-xs font-medium text-white/70
                                   underline underline-offset-2 hover:text-white"
                    >
                        Ver todos os livros em lista →
                    </LinkParaLista>
                </div>

                {tags.length > 0 && (
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase text-white/50">Tags</p>
                        <div className="flex flex-wrap gap-2">
                            {tags.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => onFilterChange({
                                        ...filtros,
                                        tag: filtros.tag === t ? null : t,
                                    })}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                        filtros.tag === t
                                            ? 'bg-sky-500 text-white'
                                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
