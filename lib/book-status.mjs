/**
 * Rótulos de status do livro — "Lido em 2025", "Quero ler", "Lendo · 45%".
 *
 * Duas telas mostram isso com necessidades diferentes de espaço: o selo da
 * visualização aberta (`components/livros/SeloDeStatus.tsx`) tem uma linha
 * inteira, e o balão de hover da sala 3D divide uma faixa estreita com título,
 * autor e estrelas. Daí as duas variantes.
 *
 * As funções recebem os campos soltos, não um objeto: `lib/books.ts` usa
 * snake_case (`progress_pct`, `finished_at`) e o `ShelfBookData` da sala usa
 * camelCase (`progressPct`, `finishedAt`). Aceitar um "objeto livro" exigiria
 * que uma das duas convertesse antes de chamar, ou que esta função conhecesse
 * os dois formatos — passar os valores nomeados evita as duas coisas.
 *
 * .mjs pelo mesmo motivo de lib/shelf-years.mjs: `node --test` roda isto sem
 * etapa de build.
 */
import {anoDeLeitura} from './shelf-years.mjs';

/**
 * Rótulo por extenso, para o selo da visualização aberta.
 *
 * "Lido" sem ano é caminho normal, não defeito: `finished_at` é opcional no
 * schema, e um livro importado sem data continua sendo um livro lido.
 */
export function rotuloDeStatus(status, {progressPct = null, finishedAt = null} = {}) {
    switch (status) {
        case 'lendo':
            return progressPct !== null ? `Lendo · ${progressPct}%` : 'Lendo agora';
        case 'lido': {
            const ano = anoDeLeitura(finishedAt);
            return ano ? `Lido em ${ano}` : 'Lido';
        }
        case 'quero-ler':
            return 'Quero ler';
        case 'referencia':
            return 'Referência';
        default:
            return '';
    }
}

/**
 * Rótulo curto, para o balão de hover da sala 3D: "LIDO 2025", "LENDO 45%",
 * "QUERO LER". Sem a preposição e sem o separador — cada caractere ali disputa
 * espaço com o título e o autor na mesma faixa, que não pode quebrar linha.
 *
 * Devolve em maiúsculas no próprio texto, não via CSS `uppercase`: o balão usa
 * `truncate`, e um texto que só vira maiúscula na renderização mede diferente
 * do que o navegador corta.
 */
export function rotuloCompactoDeStatus(status, {progressPct = null, finishedAt = null} = {}) {
    switch (status) {
        case 'lendo':
            return progressPct !== null ? `LENDO ${progressPct}%` : 'LENDO';
        case 'lido': {
            const ano = anoDeLeitura(finishedAt);
            return ano ? `LIDO ${ano}` : 'LIDO';
        }
        case 'quero-ler':
            return 'QUERO LER';
        case 'referencia':
            return 'REFERÊNCIA';
        default:
            return '';
    }
}

/**
 * A cor do ponto que precede o rótulo, igual nas duas telas — é o que faz o
 * status ser reconhecido antes de ser lido. Hex cru, não classe do Tailwind:
 * o balão da sala 3D renderiza dentro de um `<Html>` do drei, e a cor também
 * precisa servir a quem monta estilo inline.
 */
export const COR_DO_STATUS = {
    lendo: '#34d399',
    lido: '#38bdf8',
    'quero-ler': '#fbbf24',
    referencia: '#e879f9',
};
