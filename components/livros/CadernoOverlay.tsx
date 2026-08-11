'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import {REMAP_HEADINGS} from '@/components/livros/markdown-headings';
import {
    MarcadorPdfContent, gerarMarcadorPdf, sortearFrasesDoMarcador,
} from '@/utils/marcador-pdf';
import {PERGUNTA_FINAL} from '@/lib/coisas-da-sala.mjs';
// `import type` e não import comum: isto some na compilação. Um import de
// valor a partir de um route handler arrastaria `node:fs` para dentro do bundle
// do navegador.
import type {PaginaDoCaderno} from '@/app/api/caderno/route';

/**
 * O caderno do braço da poltrona, aberto — o prêmio de quem achou as 17 coisas
 * da sala.
 *
 * **Papel claro nos dois temas**, como o bilhete da gaveta e a folha da mesa: é
 * um objeto físico dentro da sala, não uma superfície da interface. Um caderno
 * que escurecesse com o tema do sistema deixaria de ser caderno.
 *
 * **O conteúdo é carregado só quando ele abre** (`GET /api/caderno`), e não
 * embutido na página. Duas razões, e nenhuma delas é segredo: as páginas não
 * pesam no carregamento da sala para os 99% que nunca vão chegar aqui, e não
 * ficam no HTML inicial de todo mundo. Quem chamar a rota no DevTools lê tudo —
 * ver o cabeçalho de `app/api/caderno/route.ts`.
 *
 * **A última página é o MARCADOR**, e não uma página de Markdown: ela gera um PDF
 * para imprimir. É o que dá um fim ao folhear, em vez de pendurar um botão de
 * download sobre o conteúdo desde a primeira página.
 *
 * O `Esc` NÃO é tratado aqui: o `RoomCanvas` tem um listener único para todas as
 * camadas da sala.
 */

const TERRACOTA = '#a8503c';

/** Uma página a mais que as do Markdown: a do marcador, no fim. */
type Estado =
    | {fase: 'carregando'}
    | {fase: 'erro'}
    | {fase: 'pronto'; paginas: PaginaDoCaderno[]};

export default function CadernoOverlay({onClose}: {onClose: () => void}) {
    const [estado, setEstado] = useState<Estado>({fase: 'carregando'});
    const [indice, setIndice] = useState(0);
    const [gerando, setGerando] = useState(false);
    /**
     * As frases do bloco de notas que vão no verso deste marcador.
     *
     * Sorteadas **uma vez por abertura do caderno** (inicializador preguiçoso do
     * `useState`, não no corpo do render): sorteando a cada render, o papel
     * mudaria de conteúdo entre a pessoa ler a página e clicar em baixar. E o
     * sorteio acontece só aqui, no cliente — este componente nunca é renderizado
     * no servidor, então não há HTML de servidor com que divergir.
     */
    const [frasesDoMarcador] = useState(sortearFrasesDoMarcador);
    const pdfRef = useRef<HTMLDivElement>(null);
    const corpoRef = useRef<HTMLDivElement>(null);

    /**
     * Quantas vezes já se pediu as páginas. Trocar este número é o que faz o
     * efeito abaixo rodar de novo — é o botão "Tentar de novo" da tela de erro.
     *
     * Um contador e não um `boolean`: com bandeira, a segunda tentativa depois de
     * um segundo erro não mudaria o estado e o efeito não rodaria. Tentar três
     * vezes tem que ser possível.
     */
    const [tentativa, setTentativa] = useState(0);

    useEffect(() => {
        let cancelado = false;
        setEstado({fase: 'carregando'});
        fetch('/api/caderno')
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((dados: {paginas: PaginaDoCaderno[]}) => {
                if (!cancelado) setEstado({fase: 'pronto', paginas: dados.paginas ?? []});
            })
            .catch(() => {
                if (!cancelado) setEstado({fase: 'erro'});
            });
        return () => {
            cancelado = true;
        };
    }, [tentativa]);

    const textos = estado.fase === 'pronto' ? estado.paginas : [];
    // +1: o marcador é sempre a última, mesmo que não haja nenhuma página de
    // texto. Ele é o objeto que se leva embora, e não depende de conteúdo.
    const total = textos.length + 1;
    const noMarcador = indice === textos.length;

    // Trocar de página volta o rolamento ao topo. Sem isto, sair de uma página
    // longa no meio dela deixa a próxima começando do parágrafo três — o mesmo
    // defeito de um livro que abrisse sempre na página em que se estava.
    useEffect(() => {
        corpoRef.current?.scrollTo({top: 0});
    }, [indice]);

    const folhear = useCallback((direcao: -1 | 1) => {
        // Para nas pontas, e não dá a volta: um caderno tem começo e fim, e é
        // isso que a última página existe para marcar. Trilho de cena é que anda
        // em loop — ver `paradaVizinha` em lib/livros-cenas.mjs.
        setIndice((atual) => Math.min(total - 1, Math.max(0, atual + direcao)));
    }, [total]);

    return (
        <div
            // z-30, a mesma camada do bilhete, da carteira, da folha e do card de
            // um livro aberto: são todos "conteúdo em foco sobre a sala".
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4
                       backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="O caderno"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative flex max-h-[86vh] w-full max-w-2xl flex-col rounded-sm
                           shadow-2xl"
                style={{
                    backgroundColor: '#f5eedd',
                    backgroundImage:
                        'repeating-linear-gradient(to bottom, transparent 0 27px,' +
                        ' rgba(70,100,130,0.09) 27px 28px)',
                }}
            >
                {/* A margem do caderno, à esquerda — a mesma das outras folhas da
                    sala, e o que amarra os três papéis como sendo do mesmo lugar. */}
                <div
                    className="pointer-events-none absolute inset-y-0 left-5 w-px sm:left-8"
                    style={{backgroundColor: TERRACOTA, opacity: 0.4}}
                />

                <button
                    onClick={onClose}
                    aria-label="Fechar o caderno"
                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center
                               rounded-full text-lg leading-none text-stone-500
                               transition hover:bg-stone-900/10 hover:text-stone-800"
                >
                    ×
                </button>

                <div
                    ref={corpoRef}
                    className="min-h-[16rem] flex-1 overflow-y-auto px-9 py-8 sm:px-12 sm:py-10"
                >
                    {estado.fase === 'carregando' && (
                        <p className="text-[15px] italic text-stone-500">Abrindo…</p>
                    )}

                    {/*
                      A tela de erro diz O QUE FALHOU, e não uma frase gentil que
                      não informa nada.

                      A primeira versão era "O caderno não abriu agora. Tente de
                      novo daqui a pouco" — o dono do site leu isso e teve que
                      perguntar o que significava, o que é o defeito inteiro de
                      uma mensagem de erro. Nomear a causa (as páginas não
                      chegaram) e oferecer o gesto (tentar de novo) resolve as
                      duas coisas: quem entende de rede sabe onde olhar, e quem
                      não entende tem um botão em vez de um conselho de esperar.
                    */}
                    {estado.fase === 'erro' && (
                        <div>
                            <p className="text-[15px] leading-relaxed text-stone-700">
                                As páginas do caderno não chegaram — a sala não conseguiu
                                buscá-las agora.
                            </p>
                            <button
                                onClick={() => setTentativa((n) => n + 1)}
                                className="mt-5 rounded-full px-5 py-2.5 text-sm font-semibold
                                           text-white shadow transition hover:brightness-110"
                                style={{backgroundColor: TERRACOTA}}
                            >
                                Tentar de novo
                            </button>
                        </div>
                    )}

                    {estado.fase === 'pronto' && noMarcador && (
                        <Marcador
                            gerando={gerando}
                            onGerar={() => gerarMarcadorPdf(pdfRef, setGerando)}
                        />
                    )}

                    {estado.fase === 'pronto' && !noMarcador && textos[indice] && (
                        <article>
                            {textos[indice].titulo && (
                                <h2 className="mb-4 pr-8 text-xl font-bold text-stone-800">
                                    {textos[indice].titulo}
                                </h2>
                            )}
                            {/*
                              `prose` do @tailwindcss/typography com a paleta
                              forçada em tons de pedra: o tema padrão dele
                              acompanha o modo escuro do sistema, e aqui o papel é
                              claro nos dois. Mesmo `REMAP_HEADINGS` das resenhas
                              — o caderno é seção da página, não documento à
                              parte, e um `#` dentro dele não pode virar um
                              segundo `<h1>`.
                            */}
                            <div className="prose prose-sm max-w-none prose-headings:text-stone-800
                                            prose-p:text-stone-700 prose-strong:text-stone-900
                                            prose-li:text-stone-700 prose-a:text-stone-900">
                                <ReactMarkdown components={REMAP_HEADINGS}>
                                    {textos[indice].corpo}
                                </ReactMarkdown>
                            </div>
                        </article>
                    )}
                </div>

                {estado.fase === 'pronto' && total > 1 && (
                    <footer className="flex items-center justify-between gap-3 border-t
                                       border-stone-900/10 px-6 py-3 sm:px-8">
                        <BotaoDeFolhear
                            rotulo="Página anterior"
                            seta="‹"
                            desabilitado={indice === 0}
                            onClick={() => folhear(-1)}
                        />
                        <span className="text-[12px] tabular-nums text-stone-500">
                            {indice + 1} de {total}
                        </span>
                        <BotaoDeFolhear
                            rotulo="Próxima página"
                            seta="›"
                            desabilitado={indice === total - 1}
                            onClick={() => folhear(1)}
                        />
                    </footer>
                )}
            </div>

            {/* A folha do PDF, fora da tela até a hora da captura. */}
            <MarcadorPdfContent ref={pdfRef} frases={frasesDoMarcador}/>
        </div>
    );
}

/**
 * As setas de folhear.
 *
 * Ficam VISÍVEIS e desabilitadas nas pontas, em vez de sumirem como as do acervo
 * (ver RoomCanvas): lá elas são o jeito de sentir onde a estante começa e
 * termina, e aqui o rodapé tem três coisas numa linha — uma seta que some
 * reposiciona as outras duas a cada página.
 */
function BotaoDeFolhear({rotulo, seta, desabilitado, onClick}: {
    rotulo: string;
    seta: string;
    desabilitado: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={desabilitado}
            aria-label={rotulo}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none
                       text-stone-600 transition hover:bg-stone-900/10 hover:text-stone-900
                       disabled:pointer-events-none disabled:opacity-25"
        >
            {seta}
        </button>
    );
}

function Marcador({gerando, onGerar}: {gerando: boolean; onGerar: () => void}) {
    return (
        <div className="text-stone-700">
            <h2 className="mb-4 pr-8 text-xl font-bold text-stone-800">
                Arranque esta página
            </h2>
            <p className="text-[15px] leading-relaxed">
                A última folha do caderno é um marcador de livro. Imprima, recorte pelo
                tracejado e deixe dentro do próximo — frente e verso saem na mesma folha.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed">
                No verso vão duas frases do bloco de notas da gaveta, sorteadas para o
                seu — são doze lá, e não cabem num papel de cinco centímetros. Abaixo
                delas, uma linha em branco: é para preencher à mão, que é como um caderno
                de anotações termina.
            </p>

            {/* A pergunta que atravessa as três peças — está na folha da mesa,
                está impressa no marcador, e é o que este caderno responde. */}
            <p className="mt-6 text-[15px] font-bold leading-relaxed text-stone-900">
                <span
                    className="box-decoration-clone px-1 py-0.5"
                    style={{backgroundColor: 'rgba(216,201,111,0.55)'}}
                >
                    {PERGUNTA_FINAL}
                </span>
            </p>

            <button
                onClick={onGerar}
                disabled={gerando}
                className="mt-7 rounded-full px-5 py-2.5 text-sm font-semibold text-white
                           shadow transition hover:brightness-110 disabled:opacity-60"
                style={{backgroundColor: TERRACOTA}}
            >
                {gerando ? 'Gerando…' : 'Baixar o marcador (PDF)'}
            </button>
        </div>
    );
}
