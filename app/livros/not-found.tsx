import Link from 'next/link';

/**
 * Cobre o segmento `/livros/*` inteiro — sem isso, `notFound()` chamado em
 * `[slug]/page.tsx` (slug inexistente) caía no not-found padrão do Next,
 * genérico e fora do estilo do site. `app/livros/@livro/not-found.tsx` é o
 * equivalente pra rota interceptada; este aqui cobre o acesso direto/SSR.
 */
export default function LivrosNaoEncontrado() {
    return (
        <div className="container mx-auto px-4 py-24 text-center sm:px-6 lg:px-8">
            <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                Livro não encontrado
            </h1>
            <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
                Esse link pode estar desatualizado.
            </p>
            <Link href="/livros/lista"
                  className="text-sm text-gray-500 underline hover:text-gray-800
                             dark:hover:text-gray-200">
                ← todos os livros
            </Link>
        </div>
    );
}
