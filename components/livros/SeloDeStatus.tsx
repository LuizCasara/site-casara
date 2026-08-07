import {rotuloDeStatus} from '@/lib/book-status.mjs';
import type {Book} from '@/lib/books';

/**
 * O selo de status do livro — "Lido em 2025", "Quero ler", "Lendo · 45%".
 *
 * Existe porque o status era a informação que o acervo mais escondia: na
 * visualização aberta ele só aparecia como a frase "Lendo agora — 45%", e só
 * para quem estava lendo. Quem abria um livro não tinha como saber, num
 * relance, se aquilo já tinha sido lido ou ainda era um plano.
 *
 * Deliberadamente NÃO usa cor sólida como as pills de categoria e tag que
 * ficam logo abaixo: quatro das oito cores de categoria (emerald, violet,
 * amber, cyan) são exatamente as que fariam sentido para status, e dois pills
 * sólidos lado a lado com significados diferentes viram ruído. O selo se
 * distingue por FORMA — maior, em maiúsculas, com ponto colorido e anel — não
 * por competir na mesma dimensão de cor.
 *
 * Sem "use client": só transforma props em JSX. Nenhum hook, nenhum evento.
 */

const ESTILOS: Record<Book['status'], {ponto: string; caixa: string}> = {
    lendo: {ponto: 'bg-emerald-400', caixa: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'},
    lido: {ponto: 'bg-sky-400', caixa: 'bg-sky-500/15 text-sky-300 ring-sky-400/30'},
    'quero-ler': {ponto: 'bg-amber-400', caixa: 'bg-amber-500/15 text-amber-300 ring-amber-400/30'},
    referencia: {ponto: 'bg-fuchsia-400', caixa: 'bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/30'},
};

/**
 * Variante para a página /livros/[slug], cujo card é `bg-white/90` no tema
 * claro e `dark:bg-black/70` no escuro — por isso cada entrada carrega os dois
 * conjuntos. O overlay não precisa disso: ele é sempre escuro, tanto sobre a
 * sala 3D quanto sobre o fundo do modal da listagem.
 */
const ESTILOS_CLAROS: Record<Book['status'], string> = {
    lendo: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 '
        + 'dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30',
    lido: 'bg-sky-50 text-sky-800 ring-sky-600/20 '
        + 'dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/30',
    'quero-ler': 'bg-amber-50 text-amber-900 ring-amber-600/20 '
        + 'dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30',
    referencia: 'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-600/20 '
        + 'dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-400/30',
};

export default function SeloDeStatus({livro, tom = 'escuro'}: {
    livro: Pick<Book, 'status' | 'progress_pct' | 'finished_at'>;
    tom?: 'escuro' | 'claro';
}) {
    const caixa = tom === 'claro' ? ESTILOS_CLAROS[livro.status] : ESTILOS[livro.status].caixa;

    return (
        <span className={`inline-flex w-fit items-center gap-2 rounded-lg px-3 py-1.5 text-xs
                          font-bold uppercase tracking-wider ring-1 ${caixa}`}>
            <span className={`h-2 w-2 rounded-full ${ESTILOS[livro.status].ponto}`} aria-hidden/>
            {rotuloDeStatus(livro.status, {
                progressPct: livro.progress_pct,
                finishedAt: livro.finished_at,
            })}
        </span>
    );
}
