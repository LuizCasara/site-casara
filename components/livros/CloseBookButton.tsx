'use client';

import {useFecharLivro} from '@/components/livros/use-fechar-livro';

/**
 * Botão "✕ fechar" do overlay. A regra de como voltar pra sala vive em
 * `useFecharLivro` porque a tecla Esc (tratada em RoomCanvas) faz a mesma
 * coisa — ver o comentário lá.
 */
export default function CloseBookButton() {
    const fechar = useFecharLivro();

    return (
        <button
            onClick={fechar}
            className="absolute right-4 top-4 text-sm text-white/60 hover:text-white"
            aria-label="Fechar"
        >
            ✕ fechar
        </button>
    );
}
