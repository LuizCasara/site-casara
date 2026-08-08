import CloseBookButton from '@/components/livros/CloseBookButton';

/**
 * Sem isso, `notFound()` chamado dentro de `(.)[slug]/page.tsx` (slug
 * inexistente, ex.: link obsoleto) escala pro not-found padrão do Next no
 * segmento mais próximo acima — que sem este arquivo seria o da raiz do
 * app, levando junto o slot `children` desta mesma `app/livros/layout.tsx`
 * (a sala 3D persistente). Este arquivo mantém o "não encontrado" contido
 * só dentro do slot `@livro`, exatamente como `default.tsx` mantém esse
 * slot em silêncio quando não há rota interceptada ativa.
 */
export default function LivroNaoEncontrado() {
    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
            <div className="relative max-w-sm rounded-2xl bg-black/70 p-8 text-center
                            shadow-2xl backdrop-blur-md">
                <CloseBookButton/>
                <p className="text-lg font-bold text-white">Livro não encontrado</p>
                <p className="mt-2 text-sm text-white/70">
                    Esse link pode estar desatualizado.
                </p>
            </div>
        </div>
    );
}
