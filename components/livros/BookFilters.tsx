import Link from 'next/link';
import type {BookFilters as Filtros} from '@/lib/books';

type Categoria = {id: string; nome: string; cor: string};

/** Monta a query string preservando os outros filtros ativos. */
function href(ativos: Filtros, campo: keyof Filtros, valor: string | null) {
    const params = new URLSearchParams();
    const proximo = {...ativos, [campo]: valor ?? undefined};
    for (const [k, v] of Object.entries(proximo)) if (v) params.set(k, String(v));
    const qs = params.toString();
    return qs ? `/livros/lista?${qs}` : '/livros/lista';
}

function Chip({ativo, children, url, cor}: {
    ativo: boolean; children: React.ReactNode; url: string; cor?: string;
}) {
    return (
        <Link href={url}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  ativo
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 ' +
                        'dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              style={ativo && cor ? {backgroundColor: cor} : undefined}>
            {children}
        </Link>
    );
}

export default function BookFilters({categorias, tags, ativos}: {
    categorias: Categoria[];
    tags: string[];
    ativos: Filtros;
}) {
    const temFiltro = Boolean(ativos.categoria || ativos.tag || ativos.status);

    return (
        <div className="mb-8 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-400">Status</span>
                <Chip ativo={ativos.status === 'lendo'} cor="#059669"
                      url={href(ativos, 'status', ativos.status === 'lendo' ? null : 'lendo')}>
                    Lendo agora
                </Chip>
                <Chip ativo={ativos.status === 'lido'} cor="#475569"
                      url={href(ativos, 'status', ativos.status === 'lido' ? null : 'lido')}>
                    Já li
                </Chip>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase text-gray-400">Categoria</span>
                {categorias.map((c) => (
                    <Chip key={c.id} ativo={ativos.categoria === c.id} cor={c.cor}
                          url={href(ativos, 'categoria', ativos.categoria === c.id ? null : c.id)}>
                        {c.nome}
                    </Chip>
                ))}
            </div>

            {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase text-gray-400">Tags</span>
                    {tags.map((t) => (
                        <Chip key={t} ativo={ativos.tag === t} cor="#0ea5e9"
                              url={href(ativos, 'tag', ativos.tag === t ? null : t)}>
                            {t}
                        </Chip>
                    ))}
                </div>
            )}

            {temFiltro && (
                <Link href="/livros/lista"
                      className="self-start text-xs text-gray-500 underline hover:text-gray-800
                                 dark:hover:text-gray-200">
                    limpar filtros
                </Link>
            )}
        </div>
    );
}
