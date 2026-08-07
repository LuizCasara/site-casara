/**
 * O slot do livro fica VAZIO em `/livros/lista`.
 *
 * Este arquivo existe por uma colisão de rotas: para a rota interceptada
 * `(.)[slug]`, o endereço `/livros/lista` casa com `[slug] = "lista"`. Numa
 * navegação client-side (clicar em "ver todos os livros" no Índice, ou em
 * "todos os livros" no card de um livro), ela interceptava, procurava um livro
 * de slug "lista", não achava, e o slot renderizava o "Livro não encontrado" por
 * cima de uma listagem que nem chegava a aparecer. Com F5 o problema sumia,
 * porque interceptação só acontece em navegação suave.
 *
 * Um segmento ESTÁTICO tem precedência sobre um dinâmico dentro do mesmo slot,
 * então declarar `lista` aqui é o que faz a interceptação parar de casar — e a
 * navegação volta a ser comum, com o `children` renderizando a listagem.
 *
 * Não dá para resolver isso em `default.tsx`: ele só entra quando NENHUMA rota
 * do slot casa, e o problema é justamente uma casar quando não devia.
 *
 * Consequência para o futuro: qualquer segmento estático novo sob `/livros/`
 * (um `/livros/sobre`, por exemplo) precisa de um arquivo irmão deste, senão
 * cai na mesma armadilha.
 */
export default function SemLivroNaLista() {
    return null;
}
