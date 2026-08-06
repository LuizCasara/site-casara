'use client';

import {usePathname} from 'next/navigation';
import {useFecharLivro} from '@/components/livros/use-fechar-livro';
import {trackBookClosed} from '@/utils/analytics';

/**
 * Botão "✕ fechar" do overlay. A regra de como voltar pra sala vive em
 * `useFecharLivro` porque a tecla Esc (tratada em RoomCanvas) faz a mesma
 * coisa — ver o comentário lá. O evento fica nos dois lugares, com `via`
 * separando-os: são gestos diferentes, e saber qual as pessoas usam é o motivo
 * de medir.
 *
 * O slug sai do pathname porque este botão é montado pela rota do livro e não
 * recebe prop nenhuma — a URL é a fonte da verdade aqui de qualquer jeito.
 */
export default function CloseBookButton() {
    const fechar = useFecharLivro();
    const pathname = usePathname();

    return (
        <button
            onClick={() => {
                trackBookClosed(pathname.replace('/livros/', ''), 'botao');
                fechar();
            }}
            className="absolute right-4 top-4 text-sm text-white/60 hover:text-white"
            aria-label="Fechar"
        >
            ✕ fechar
        </button>
    );
}
