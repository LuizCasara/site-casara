'use client';

import {BILHETE_TITULO, BILHETE_FRASES, BILHETE_FECHO, BILHETE_ASSINATURA} from '@/lib/bilhete';

/**
 * A folha que está dentro do bloco de notas da gaveta.
 *
 * **Painel DOM por cima do canvas, nunca texto dentro do 3D** — a regra da sala
 * é a mesma que vale para a ficha de um livro: texto como textura fica borrado,
 * não é selecionável e leitor de tela nenhum alcança. O objeto 3D fornece o
 * quadro; o conteúdo aparece aqui.
 *
 * O visual é de papel, mas a tipografia é a do site. Chegou a estar em mesa uma
 * família manuscrita, e ela caiu por causa do próprio conteúdo: letra de mão é
 * ótima em três linhas e cansativa nas treze desta lista — e ainda custaria uma
 * terceira fonte carregada só para esta tela. O "anotado à mão" vem do papel, da
 * margem vermelha e da folha torta, que são CSS e não pesam nada.
 *
 * O `Esc` NÃO é tratado aqui: o `RoomCanvas` tem um listener único para todas as
 * camadas da sala, na ordem em que elas aparecem na tela. Um segundo listener
 * daqui competiria com aquele em vez de se somar a ele.
 */

/** Cor da linha da margem e do destaque do fecho. É a terracota que a sala já
 *  usa nas cortinas da janela — a caneta vermelha de caderno, sem o vermelho
 *  puro que brigaria com o papel. */
const TERRACOTA = '#a8503c';

export default function BilheteOverlay({onClose}: {onClose: () => void}) {
    return (
        <div
            // z-30, a mesma camada do card de um livro aberto: os dois são
            // "conteúdo em foco sobre a sala", e nunca aparecem juntos.
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4
                       backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Anotações da gaveta"
        >
            <div
                // O clique no papel não fecha; só o clique no fundo. Sem isto,
                // selecionar uma frase para copiar fecharia a folha no meio do
                // gesto.
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg overflow-hidden rounded-sm px-7 py-8 shadow-2xl
                           sm:px-10 sm:py-10"
                style={{
                    // O papel é claro nos DOIS temas, de propósito: é um objeto
                    // físico dentro de uma gaveta, não uma superfície da
                    // interface. Uma folha que escurecesse com o tema do sistema
                    // deixaria de ser papel.
                    backgroundColor: '#f2ead6',
                    // Pauta de caderno. Bem fraca — ela não tenta alinhar-se com
                    // as linhas do texto (o que quebraria assim que uma frase
                    // ocupasse duas linhas), serve de textura.
                    backgroundImage:
                        'repeating-linear-gradient(to bottom, transparent 0 27px,' +
                        ' rgba(70,100,130,0.10) 27px 28px)',
                    // A folha caiu torta na gaveta. Meio grau é pouco de
                    // propósito: o suficiente para o olho registrar papel solto,
                    // pouco para não parecer erro de layout.
                    transform: 'rotate(-0.6deg)',
                }}
            >
                {/* A margem, à esquerda como em caderno. */}
                <div
                    className="pointer-events-none absolute inset-y-0 left-4 w-px sm:left-6"
                    style={{backgroundColor: TERRACOTA, opacity: 0.45}}
                />

                <button
                    onClick={onClose}
                    aria-label="Fechar as anotações"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center
                               rounded-full text-lg leading-none text-stone-500
                               transition hover:bg-stone-900/10 hover:text-stone-800"
                >
                    ×
                </button>

                <h2
                    className="mb-5 pr-6 text-[13px] font-bold uppercase tracking-wide text-stone-600"
                    // Space Mono por variável CSS: o Tailwind desta base mapeia
                    // `font-mono` para a pilha do sistema, e só `code`/`pre`
                    // recebem a fonte do site pelo globals.css.
                    style={{fontFamily: 'var(--font-space-mono), monospace'}}
                >
                    {BILHETE_TITULO}
                </h2>

                <ul className="space-y-2 text-[15px] leading-relaxed text-stone-800">
                    {BILHETE_FRASES.map((frase) => (
                        <li key={frase} className="flex gap-2.5">
                            <span aria-hidden="true" style={{color: TERRACOTA}}>•</span>
                            <span>{frase}</span>
                        </li>
                    ))}
                </ul>

                {/*
                  O fecho não é o décimo terceiro marcador: é a única frase
                  imperativa do bloco, e sai da lista para fechar a folha com
                  peso. O fundo é marca-texto, não caixa de aviso.
                */}
                <p className="mt-6 text-[15px] font-bold leading-relaxed text-stone-900">
                    <span
                        className="box-decoration-clone px-1 py-0.5"
                        style={{backgroundColor: 'rgba(216,201,111,0.55)'}}
                    >
                        {BILHETE_FECHO}
                    </span>
                </p>

                <p className="mt-6 text-right text-sm text-stone-500">{BILHETE_ASSINATURA}</p>
            </div>
        </div>
    );
}
