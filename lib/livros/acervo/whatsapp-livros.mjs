/**
 * Links de WhatsApp do acervo — a forma mais simples de receber recomendação de
 * livro e comentário sobre um livro.
 *
 * A alternativa era gravar essas mensagens numa tabela e exibi-las no site, e
 * ela foi descartada de propósito: conteúdo público de terceiros traz moderação
 * e spam, problema que este site inteiro não tem hoje. Um link de WhatsApp com
 * mensagem pronta entrega o mesmo — quem realmente quer falar, fala — sem
 * nenhuma superfície nova.
 *
 * .mjs e testado porque o que quebra aqui quebra calado: uma mensagem mal
 * escapada não dá erro, só chega torta do outro lado.
 */

/** O mesmo número usado em /about e /casamento. */
const NUMERO = '5545991119881';

export const MENSAGEM_SUGESTAO =
    'Olá, estava vendo seu site e gostaria de fazer uma sugestão de livro pra você... se chama: ';

/**
 * `encodeURIComponent` e não `encodeURI`: os títulos têm dois-pontos, aspas e
 * `&` ("Sapiens: Uma breve história"), que o `encodeURI` deixa passar por serem
 * caracteres válidos de URL — e aí o `&` corta a mensagem no meio, porque o
 * resto vira outro parâmetro da query.
 */
function linkPara(mensagem) {
    return `https://wa.me/${NUMERO}?text=${encodeURIComponent(mensagem)}`;
}

/** Recomendar um livro — o clique no quadro branco da parede. */
export function linkDeSugestao() {
    return linkPara(MENSAGEM_SUGESTAO);
}

/**
 * Comentar sobre um livro específico. O título entra na mensagem entre aspas
 * para sobreviver a nomes compridos com subtítulo, e o autor só aparece quando
 * existe — `author` é nullable na tabela.
 */
export function linkDeComentario(titulo, autor) {
    const de = autor ? `, de ${autor}` : '';
    return linkPara(
        `Olá, estava vendo seu site e gostaria de comentar sobre o livro "${titulo}"${de}: `,
    );
}
