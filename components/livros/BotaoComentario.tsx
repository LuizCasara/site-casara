'use client';

import {linkDeComentario} from '@/lib/whatsapp-livros.mjs';
import {trackBookComment} from '@/utils/analytics';

/**
 * "Comentar sobre este livro" — abre o WhatsApp com o título já na mensagem.
 *
 * Um `<a>` de verdade, não um `<button>` com `window.open`: é uma navegação
 * para fora, então merece o menu de contexto, o "abrir em nova aba" e o
 * cursor que qualquer link tem. `rel="noopener"` porque sem ele a página aberta
 * recebe referência a esta pelo `window.opener`.
 *
 * Ícone só, com o texto aparecendo num balão no hover — o mesmo gesto dos
 * objetos clicáveis da sala 3D. O balão é um `<span>` com `group-hover`, e não
 * o atributo `title`: o nativo demora ~1s para aparecer e aparelho de toque
 * nunca o mostra.
 *
 * No celular o rótulo fica inline, sem balão. Sem hover para revelar a intenção,
 * um ícone sozinho vira adivinhação — e é justamente ali que o balão nunca
 * apareceria.
 *
 * Vive nos dois lugares que mostram um livro: o card sobre a sala 3D
 * (BookOverlay) e a página SSR (`/livros/[slug]`).
 */
export default function BotaoComentario({slug, titulo, autor, tom = 'claro'}: {
    slug: string;
    titulo: string;
    autor: string | null;
    /** 'claro' = sobre o card escuro da sala; 'escuro' = sobre a página SSR. */
    tom?: 'claro' | 'escuro';
}) {
    const cores = tom === 'claro'
        ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700';

    return (
        <a
            href={linkDeComentario(titulo, autor)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackBookComment(slug)}
            aria-label="Fazer um comentário sobre o livro"
            className={`group relative inline-flex items-center gap-1.5 self-start rounded-full
                        px-3 py-1.5 text-xs font-medium transition ${cores}`}
        >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2Zm5.5 14.1c-.2.6-1.3 1.2-1.8 1.2-.5 0-.6.4-3.5-.9-2.9-1.3-4.6-4.4-4.7-4.6-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-1.9 1-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.5l-.4.5c-.1.1-.3.3-.1.6.1.3.7 1.3 1.6 2.1 1.1 1 2 1.3 2.3 1.4.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l2 .9c.2.1.4.2.4.3.1.1.1.6-.1 1.2Z"/>
            </svg>
            {/* Rótulo inline só no toque, onde o balão nunca apareceria. */}
            <span className="sm:hidden">Comentar</span>
            {/* O balão. `pointer-events-none` para ele não roubar o hover do
                próprio link e ficar piscando quando o mouse encosta na borda. */}
            <span
                className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden
                           -translate-x-1/2 whitespace-nowrap rounded-full bg-black/85 px-2 py-0.5
                           text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity
                           group-hover:opacity-100 sm:block"
            >
                Fazer um comentário sobre o livro
            </span>
        </a>
    );
}
