import type {Components} from 'react-markdown';

/**
 * Desce um degrau todos os headings do Markdown da resenha (h1→h2, …, h5→h6).
 *
 * O CLI de cadastro (scripts/livros.mjs) abre a resenha já com `# <título>`, ou
 * seja, todo review real começa num heading nível 1. Sem remapear, isso vira um
 * segundo `<h1>` na página — o primeiro é o título do livro — e quebra a
 * hierarquia semântica. A resenha é uma seção da página, não um documento à
 * parte.
 *
 * Compartilhado pelos dois lugares que renderizam `review`: a página SSR
 * (`app/livros/[slug]/page.tsx`) e o card sobre a sala 3D (`BookOverlay.tsx`).
 */
export const REMAP_HEADINGS: Components = {
    // `node` é o nó hast que o react-markdown injeta em toda prop de componente;
    // descartado de propósito para não vazar como um atributo
    // `node="[object Object]"` inválido no HTML renderizado.
    /* eslint-disable @typescript-eslint/no-unused-vars */
    h1: ({node, ...props}) => <h2 {...props}/>,
    h2: ({node, ...props}) => <h3 {...props}/>,
    h3: ({node, ...props}) => <h4 {...props}/>,
    h4: ({node, ...props}) => <h5 {...props}/>,
    h5: ({node, ...props}) => <h6 {...props}/>,
    h6: ({node, ...props}) => <h6 {...props}/>,
    /* eslint-enable @typescript-eslint/no-unused-vars */
};
