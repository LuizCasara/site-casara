'use client';

import {useEffect, useState} from 'react';

/**
 * Altura atual do `<footer>` do layout raiz, em pixels.
 *
 * Existe porque a UI flutuante da sala precisa ficar ACIMA do rodapé, e um
 * valor fixo não serve: o rodapé tem ~123px no desktop e quase o dobro no
 * celular, onde o texto quebra em mais linhas. Foi exatamente assim que os
 * botões de ponto de vista voltaram a ficar por cima do rodapé em tela
 * estreita depois de já terem sido "consertados" com um `bottom-36` calibrado
 * no desktop.
 *
 * Mede na montagem e a cada resize da janela — a altura do rodapé só muda
 * quando a largura da viewport muda. Sem ResizeObserver de propósito: as
 * notificações dele não são entregues enquanto o documento está oculto (a
 * mesma armadilha que deixou o canvas preso em 300x150), e aqui um valor
 * momentaneamente desatualizado só desloca um botão, então não vale a
 * complexidade extra.
 */
export function useAlturaRodape(): number {
    const [altura, setAltura] = useState(0);

    useEffect(() => {
        const medir = () => {
            const rodape = document.querySelector('footer');
            setAltura(rodape ? rodape.getBoundingClientRect().height : 0);
        };
        medir();
        window.addEventListener('resize', medir);
        return () => window.removeEventListener('resize', medir);
    }, []);

    return altura;
}

/**
 * Altura de um elemento medida pelo mesmo mecanismo, para quem precisa saber
 * quanto da tela um bloco flutuante está cobrindo.
 *
 * Usada pela barra de botões da sala: quantas linhas ela ocupa depende de
 * quantos anos o acervo tem e da largura da tela (no celular os anos quebram
 * em duas linhas), e é esse número que diz à câmera quanto do canvas está
 * tapado. Um valor fixo funcionava no desktop e enterrava o nicho de baixo
 * atrás dos botões em tela estreita — o mesmo erro que motivou o hook acima.
 *
 * `deps` força uma nova medição quando o conteúdo muda sem a janela mudar de
 * tamanho (um filtro que reduz os anos, por exemplo).
 */
export function useAlturaDoElemento(
    ref: React.RefObject<HTMLElement | null>,
    deps: unknown[] = [],
): number {
    const [altura, setAltura] = useState(0);

    useEffect(() => {
        const medir = () => setAltura(ref.current?.getBoundingClientRect().height ?? 0);
        medir();
        window.addEventListener('resize', medir);
        return () => window.removeEventListener('resize', medir);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return altura;
}
