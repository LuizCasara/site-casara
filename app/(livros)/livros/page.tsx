/**
 * A sala 3D não mora aqui: ela é montada por `layout.tsx`, que sobrevive à
 * navegação para `/livros/<slug>` — numa page o <Canvas> desmontaria a cada
 * clique em livro e o efeito inteiro se perderia.
 *
 * Sobra para esta page só o caminho de quem não roda script: o <noscript> manda
 * para a listagem em HTML puro.
 */
export default function LivrosPage() {
    return (
        <noscript>
            <meta httpEquiv="refresh" content="0;url=/livros/lista"/>
        </noscript>
    );
}
