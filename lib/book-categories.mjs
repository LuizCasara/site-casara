/**
 * Taxonomia fechada de categorias.
 *
 * Um livro tem UMA categoria (define onde ele mora na estante e sua cor) e N
 * tags livres (o eixo transversal de busca). Se um livro pudesse ter várias
 * categorias, sua posição na prateleira seria ambígua.
 *
 * Esta lista foi DERIVADA do acervo real (scripts/seed/acervo.json), agrupando
 * os 51 livros e nomeando os agrupamentos — não foi inventada antes dos dados.
 * A quantidade ao lado de cada uma é a contagem no acervo inicial.
 *
 * Não existe categoria "Fantasia": os dois livros que cairiam nela (O Hobbit,
 * As Cavernas de Aço) ficam em Ficção com as tags "fantasia" e "ficção
 * científica". Uma categoria de dois itens não justifica uma prateleira.
 */
export const CATEGORIES = [
    {id: 'desenvolvimento-pessoal', nome: 'Desenvolvimento Pessoal', cor: '#ec4899'}, // 19
    {id: 'ficcao', nome: 'Ficção', cor: '#6366f1'},                                   //  9
    {id: 'negocios-financas', nome: 'Negócios e Finanças', cor: '#10b981'},           //  7
    {id: 'lideranca-estrategia', nome: 'Liderança e Estratégia', cor: '#ef4444'},     //  4
    {id: 'filosofia', nome: 'Filosofia', cor: '#8b5cf6'},                             //  4
    {id: 'ciencia-sociedade', nome: 'Ciência e Sociedade', cor: '#06b6d4'},           //  4
    {id: 'tecnologia', nome: 'Tecnologia', cor: '#f59e0b'},                           //  2
    {id: 'espiritualidade', nome: 'Espiritualidade', cor: '#84cc16'},                 //  2
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getCategory(id) {
    return CATEGORIES.find((c) => c.id === id) ?? null;
}
