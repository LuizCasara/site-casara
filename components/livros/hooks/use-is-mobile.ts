'use client';

import {useState} from 'react';

/**
 * Detecta dispositivo touch-primário via `pointer: coarse` — o sinal certo pro
 * problema real (hover não existe, arrastar compete com scroll), não o tamanho
 * de tela: um notebook de tela estreita não deve ganhar comportamento de toque.
 *
 * Lido uma vez só, na inicialização: o tipo de ponteiro de um aparelho não muda
 * no meio de uma sessão.
 */
export function useIsMobile(): boolean {
    const [isMobile] = useState(
        () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true,
    );
    return isMobile;
}
