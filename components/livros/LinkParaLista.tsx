'use client';

/**
 * Link para `/livros/lista` — um `<a>` comum, NÃO o `<Link>` do Next.
 *
 * Isto não é descuido: é a única forma de chegar na listagem sem cair na rota
 * interceptada do livro. Para `@livro/(.)[slug]`, o endereço `/livros/lista`
 * casa com `[slug] = "lista"`, e numa navegação suave dentro do layout de
 * `/livros` ela intercepta — o slot procura um livro chamado "lista", não acha,
 * e mostra "Livro não encontrado", enquanto o `children` congela na página
 * anterior (comportamento normal de rota interceptada: o conteúdo de trás fica
 * como estava, que é justamente o que faz o modal do livro funcionar).
 *
 * Tentei antes declarar o segmento estático dentro do slot
 * (`@livro/lista/page.tsx`); não resolve, porque a interceptação é resolvida
 * numa passada própria, antes da precedência entre estático e dinâmico.
 *
 * Uma navegação DURA não passa por interceptação nenhuma. O custo é recarregar
 * a página, e ele é aceitável aqui: sair da sala 3D para a grade em HTML é uma
 * troca de contexto, não a abertura de um modal — e a sala nem é montada do
 * outro lado.
 *
 * Se um dia a listagem sair de baixo de `/livros/` (virar `/acervo`, por
 * exemplo), a colisão deixa de existir e isto pode voltar a ser um `<Link>`.
 */
export default function LinkParaLista({
    query, className, children, onClick,
}: {
    /** Filtros a levar junto, sem os vazios. */
    query?: Record<string, string | null | undefined>;
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
}) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) if (v) params.set(k, v);
    const qs = params.toString();

    return (
        <a href={qs ? `/livros/lista?${qs}` : '/livros/lista'} onClick={onClick} className={className}>
            {children}
        </a>
    );
}
