/**
 * O texto fixo da carteira de caçador — a parte que NÃO vem do acervo.
 *
 * Arquivo próprio, e separado do componente que o desenha, pela mesma razão do
 * `lib/bilhete.ts`: quem edita isto é o dono do acervo, não quem mexe em
 * layout, e trocar uma frase tem que ser mexer numa constante e não caçar um
 * `<p>` no meio de JSX.
 *
 * Os NÚMEROS da ficha (livros lidos, páginas, desde quando, categoria mais
 * lida, nota média) não estão aqui de propósito — eles saem de
 * `lib/ficha-do-acervo.mjs`, calculados sobre os livros que a sala já carregou.
 * Escrevê-los à mão significaria vir corrigir este arquivo a cada livro
 * cadastrado, e errar em silêncio quando alguém esquecesse.
 *
 * Sem banco e sem rota de admin, como todo conteúdo desta sala (ver
 * `CLAUDE.md`): não se cria superfície pública de escrita num site pessoal.
 */

export const CARTEIRA_TITULO = 'Licença Hunter';
export const CARTEIRA_SUBTITULO = 'Associação de Caçadores · Filial Leitura';
export const CARTEIRA_NOME = 'Luiz Casara';

/**
 * O lema impresso no verso, e de quem ele é.
 *
 * Uma linha só porque é isso que a carteira comporta: o painel foi dimensionado
 * para uma frase curta, e um parágrafo empurraria a ficha para fora do cartão.
 * Se um dia virar duas frases, este arquivo e o `CarteiraOverlay` mudam juntos.
 *
 * O autor é campo separado, e não parte da string, para o painel poder
 * tipografá-lo diferente da frase — citação e assinatura não são a mesma coisa.
 */
export const CARTEIRA_LEMA =
    'Um pedido de desculpas é uma promessa de fazer as coisas de maneira diferente da próxima vez.';
export const CARTEIRA_LEMA_AUTOR = 'Ging Freecss';

/**
 * A licença é privilégio de quem passou no exame — no anime, e aqui também.
 * Estas linhas são a piada interna do objeto: o que a "licença" dá direito de
 * fazer nesta sala.
 */
export const CARTEIRA_PRIVILEGIOS = [
    'Acesso irrestrito às estantes',
    'Direito de recomendar sem ser perguntado',
    'Isenção de culpa por comprar mais um',
];

export const CARTEIRA_RODAPE = 'Válida enquanto houver o que ler.';
