/**
 * Esqueleto do card enquanto o livro é buscado no banco.
 *
 * Com o prefetch dos vizinhos e o `staleTimes` do next.config, folhear o acervo
 * quase nunca chega aqui — o conteúdo já está no Router Cache. Isto cobre o que
 * sobra: o primeiro livro aberto na sessão, uma conexão ruim, ou um salto para
 * um livro que não é vizinho de nenhum aberto antes.
 *
 * O desenho copia o card de verdade (capa 2:3 à esquerda, texto à direita)
 * porque um spinner centralizado faria o layout pular quando o conteúdo
 * chegasse. Sem animação de pulso: o card já entra com a animação
 * `entrada-do-livro`, e duas coisas se mexendo ao mesmo tempo no mesmo elemento
 * lê como falha de carregamento, não como carregamento.
 */
export default function CarregandoLivro() {
    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
            <div className="relative max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl
                            bg-black/70 p-8 shadow-2xl backdrop-blur-md">
                <div className="grid gap-8 sm:grid-cols-[220px_1fr]">
                    <div className="flex flex-col gap-3">
                        <div className="aspect-[2/3] w-full rounded bg-white/10"/>
                        <div className="h-6 w-3/4 rounded bg-white/10"/>
                        <div className="h-4 w-1/2 rounded bg-white/10"/>
                    </div>
                    <div className="flex flex-col gap-3">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="h-4 rounded bg-white/10"
                                // A última linha mais curta, como um parágrafo
                                // de verdade termina.
                                style={{width: i === 5 ? '45%' : '100%'}}
                            />
                        ))}
                    </div>
                </div>
                <span className="sr-only">Carregando o livro…</span>
            </div>
        </div>
    );
}
