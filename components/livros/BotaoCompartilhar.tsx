'use client';

import {useState} from 'react';
import {trackBookShared} from '@/utils/analytics';

/**
 * Compartilhar o link do livro.
 *
 * Usa a Web Share API quando existe: no celular ela abre a folha do sistema, com
 * WhatsApp, Telegram, e-mail e tudo mais que a pessoa tenha instalado — muito
 * melhor do que eu escolher por ela uma lista de botõezinhos de rede social, que
 * envelhece e nunca cobre o app que ela realmente usa. No desktop, onde a API
 * quase não existe, cai para copiar o link, que é o gesto equivalente.
 *
 * O link é montado do slug, e não lido de `window.location.href`: a URL da vez
 * pode carregar query params (`?tag=...` de uma navegação anterior) e o que se
 * compartilha tem de ser o endereço limpo do livro.
 */
export default function BotaoCompartilhar({slug, titulo, autor, tom = 'claro'}: {
    slug: string;
    titulo: string;
    autor: string | null;
    /** 'claro' = sobre o card escuro da sala; 'escuro' = sobre a página SSR. */
    tom?: 'claro' | 'escuro';
}) {
    const [copiado, setCopiado] = useState(false);

    const cores = tom === 'claro'
        ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700';

    const compartilhar = async () => {
        const url = `${window.location.origin}/livros/${slug}`;
        const texto = autor ? `${titulo}, de ${autor}` : titulo;

        // `navigator.share` só funciona a partir de um gesto do usuário e só em
        // contexto seguro (https ou localhost) — daí o try/catch em vez de
        // confiar na checagem de existência sozinha.
        if (navigator.share) {
            try {
                await navigator.share({title: titulo, text: texto, url});
                trackBookShared(slug, 'share');
                return;
            } catch (erro) {
                // Fechar a folha de compartilhamento sem escolher nada rejeita a
                // promessa com AbortError. Isso é a pessoa desistindo, não uma
                // falha: não vale cair para o clipboard e copiar um link que ela
                // acabou de decidir não compartilhar.
                if ((erro as Error)?.name === 'AbortError') return;
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            trackBookShared(slug, 'clipboard');
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            // Clipboard bloqueado por permissão ou por contexto inseguro. Sem
            // alerta: o botão simplesmente não confirma, e a URL da barra de
            // endereços já é o link do livro de qualquer forma.
        }
    };

    return (
        <button
            type="button"
            onClick={compartilhar}
            aria-label="Compartilhar o link deste livro"
            className={`group relative inline-flex items-center gap-1.5 self-start rounded-full
                        px-3 py-1.5 text-xs font-medium transition ${cores}`}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round"
                 className="h-4 w-4 shrink-0" aria-hidden="true">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/>
                <line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/>
            </svg>
            <span className="sm:hidden">{copiado ? 'Copiado!' : 'Compartilhar'}</span>
            {/* Balão no hover, como no botão de comentário. `aria-live` para o
                "Link copiado!" ser anunciado por leitor de tela — é a única
                confirmação de que o clique fez alguma coisa. */}
            <span
                aria-live="polite"
                className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden
                           -translate-x-1/2 whitespace-nowrap rounded-full bg-black/85 px-2 py-0.5
                           text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity
                           group-hover:opacity-100 sm:block"
                style={copiado ? {opacity: 1} : undefined}
            >
                {copiado ? 'Link copiado!' : 'Compartilhar este livro'}
            </span>
        </button>
    );
}
