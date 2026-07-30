'use client';

import {CATEGORIES} from '@/lib/book-categories.mjs';
import {SORT_CRITERIA} from '@/lib/livros-shelf.mjs';
import {corDeTextoSobre} from '@/lib/contraste.mjs';

const SORT_LABELS: Record<string, string> = {
    padrao: 'Padrão',
    nota: 'Nota',
    ano: 'Ano',
    categoria: 'Categoria',
};

type IndiceFiltros = {categoria: string | null; tag: string | null};

type IndexPanelProps = {
    tags: string[];
    sortCriterio: string;
    onSortChange: (criterio: string) => void;
    filtros: IndiceFiltros;
    onFilterChange: (filtros: IndiceFiltros) => void;
    onClose: () => void;
};

export default function IndexPanel({tags, sortCriterio, onSortChange, filtros, onFilterChange, onClose}: IndexPanelProps) {
    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4">
            <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl
                            bg-black/70 p-6 shadow-2xl backdrop-blur-md">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-sm text-white/60 hover:text-white"
                    aria-label="Fechar"
                >
                    ✕ fechar
                </button>

                <h2 className="mb-4 text-lg font-bold text-white">Índice</h2>

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
                                        categoria: ativo ? null : c.id,
                                        tag: filtros.tag,
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

                {tags.length > 0 && (
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase text-white/50">Tags</p>
                        <div className="flex flex-wrap gap-2">
                            {tags.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => onFilterChange({
                                        categoria: filtros.categoria,
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
