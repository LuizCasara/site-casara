/**
 * O que está escrito no bloco de notas dentro da gaveta da mesa do PC.
 *
 * **Fica num arquivo só, e separado do componente que o desenha, porque esta
 * lista cresce.** Acrescentar uma frase tem que ser mexer num array, não caçar
 * um `<li>` no meio de JSX — e quem edita isto é o dono do acervo, não quem
 * mexe em layout.
 *
 * Sem banco e sem rota de admin, pela mesma razão do acervo inteiro (ver
 * `CLAUDE.md`): não se cria superfície pública de escrita para um site pessoal.
 * É conteúdo, e conteúdo desta sala mora no código.
 */

export const BILHETE_TITULO = 'Resumo de todos os livros… Não esquecer:';

export const BILHETE_FRASES = [
    'O ambiente é a mão invisível que controla o mundo',
    'Questionamento aponta a direção',
    'Comparação gera frustração',
    'Foco significa abrir mão',
    'Quem é bom em dar desculpas, não é bom em mais nada',
    'Pouco, mas constante',
    'Não gaste energia com o que você não controla',
    'O que aconteceria se você não desistisse?',
    'A ausência de evidência NÃO é evidência de ausência',
    'Quem tem um porquê aceita quase qualquer como',
    'Quem aprende não depende',
    'Não falta oportunidade, falta atitude',
];

/**
 * A última linha, destacada.
 *
 * Separada do array porque ela **não é mais uma da lista**: é a única frase
 * imperativa do bloco, e fecha a folha com peso em vez de virar o décimo
 * terceiro marcador de uma enumeração.
 */
export const BILHETE_FECHO = 'Coma a metade, corra o dobro e sorria o triplo!';

export const BILHETE_ASSINATURA = '— Luiz';
