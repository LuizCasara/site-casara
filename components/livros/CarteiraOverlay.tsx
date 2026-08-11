'use client';

import {getCategory} from '@/lib/book-categories.mjs';
import {
    CARTEIRA_TITULO, CARTEIRA_SUBTITULO, CARTEIRA_NOME, CARTEIRA_LEMA,
    CARTEIRA_LEMA_AUTOR, CARTEIRA_PRIVILEGIOS, CARTEIRA_RODAPE,
} from '@/lib/carteira';

/**
 * A carteira de caçador, aberta.
 *
 * **Painel DOM por cima do canvas, nunca texto dentro do 3D** — a mesma regra do
 * bilhete da gaveta e da ficha de um livro: texto como textura fica borrado, não
 * é selecionável e leitor de tela nenhum alcança. O cartão de 10cm na vitrine
 * fornece o objeto; o conteúdo aparece aqui.
 *
 * É por existir este painel que o clique na carteira NÃO mexe na câmera: ele já
 * entrega a arte em tamanho de leitura, e um zoom acontecendo atrás de um painel
 * que o tapa seria trabalho invisível brigando com o que se vê.
 *
 * O `Esc` NÃO é tratado aqui: o `RoomCanvas` tem um listener único para todas as
 * camadas da sala, na ordem em que elas aparecem na tela. Um segundo listener
 * daqui competiria com aquele em vez de se somar a ele.
 */

/** O ciano do cartão. É a cor da arte, e o que amarra painel e objeto. */
const CIANO = '#7ec8e3';

export type FichaDoAcervo = {
    lidos: number;
    paginas: number;
    semPaginas: number;
    desde: number | null;
    categoriaTop: {categoria: string; quantos: number} | null;
    notaMedia: number | null;
};

type CarteiraOverlayProps = {
    ficha: FichaDoAcervo;
    onClose: () => void;
};

/**
 * Um número da ficha, no formato de stat tile.
 *
 * **São quatro grandezas independentes, sem escala em comum** — livros, páginas,
 * um ano e uma nota. Isso é uma fileira de KPI, não um gráfico: não há o que
 * comparar entre elas, e qualquer forma que as pusesse lado a lado numa mesma
 * régua estaria inventando uma relação que não existe.
 *
 * O valor é semibold em TINTA, nunca em cor: cor aqui codificaria identidade, e
 * a única identidade deste painel é a categoria — que ganha o ponto colorido
 * logo abaixo, e é a única coisa colorida da ficha por isso mesmo.
 *
 * Sem `tabular-nums`: ele dá a todo dígito a largura de um `0`, o que é certo
 * numa COLUNA de números que precisa alinhar e errado num valor grande e
 * solto, onde deixa o número frouxo.
 *
 * `null` some com o quadrinho inteiro — ver `lib/ficha-do-acervo.mjs`, que
 * devolve `null` em vez de inventar valor quando o dado não existe.
 */
function Numero({rotulo, valor}: {rotulo: string; valor: string | null}) {
    if (valor === null) return null;
    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <div className="text-lg font-semibold leading-none text-white">{valor}</div>
            {/* Sentence case e sem dois-pontos: é rótulo de tile, não label de
                formulário. */}
            <div className="mt-1.5 text-[10px] leading-none text-white/45">{rotulo}</div>
        </div>
    );
}

export default function CarteiraOverlay({ficha, onClose}: CarteiraOverlayProps) {
    const categoria = ficha.categoriaTop ? getCategory(ficha.categoriaTop.categoria) : null;

    return (
        <div
            // z-30, a mesma camada do bilhete e do card de um livro aberto: os
            // três são "conteúdo em foco sobre a sala" e nunca aparecem juntos.
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4
                       backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Licença Hunter"
        >
            <div
                // O clique no cartão não fecha; só o clique no fundo. Sem isto,
                // selecionar um número para copiar fecharia o painel no meio do
                // gesto — mesma correção do bilhete.
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl overflow-hidden rounded-xl border
                           border-white/15 shadow-2xl"
                style={{
                    // Escuro nos DOIS temas, de propósito, pelo mesmo motivo que
                    // o papel do bilhete é claro nos dois: é um objeto físico
                    // dentro da sala, não uma superfície da interface. Um cartão
                    // que clareasse com o tema do sistema deixaria de ser cartão.
                    backgroundColor: '#12171d',
                    backgroundImage:
                        'radial-gradient(120% 100% at 0% 0%, rgba(126,200,227,0.16), transparent 60%)',
                }}
            >
                <button
                    onClick={onClose}
                    aria-label="Fechar a licença"
                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center
                               rounded-full text-lg leading-none text-white/50
                               transition hover:bg-white/10 hover:text-white"
                >
                    ×
                </button>

                <div className="p-6 sm:p-8">
                    {/*
                      Cabeçalho ATRAVESSANDO o topo, e não dentro de uma das
                      colunas: é o que identifica o documento inteiro, então ele
                      manda nas duas metades em vez de pertencer a uma. É também
                      o que impede o painel de virar uma coluna cheia ao lado de
                      uma imagem solta.
                    */}
                    <header className="pr-10">
                        <p
                            className="text-[10px] uppercase tracking-[0.25em]"
                            style={{fontFamily: 'var(--font-space-mono), monospace', color: CIANO}}
                        >
                            {CARTEIRA_TITULO}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/40">{CARTEIRA_SUBTITULO}</p>
                        <h2 className="mt-2 text-2xl font-bold text-white">{CARTEIRA_NOME}</h2>
                    </header>

                    <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:gap-7">
                        <div className="sm:w-[44%] sm:shrink-0">
                            {/*
                              A arte do cartão. `img` comum e não `next/image`: o
                              arquivo é servido de `public/` num tamanho só, já é
                              o mesmo bitmap que a textura do objeto 3D usa, e
                              passar pelo otimizador renderia uma variante a mais
                              para nada.
                            */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/livros/carteira-hunter.png"
                                alt="Licença Hunter, um cartão com inscrições em runas"
                                className="w-full rounded-lg shadow-lg ring-1 ring-white/10"
                            />

                            {/*
                              Os quatro números do acervo, EMBAIXO da imagem —
                              é o lado do documento que carrega o dado carimbado,
                              enquanto o outro carrega o que está escrito nele.

                              Grade e não lista de linhas: são quatro grandezas
                              INDEPENDENTES, sem escala em comum (livros, páginas,
                              um ano, uma nota). Empilhá-las com rótulo à esquerda
                              e valor à direita as fazia parecer as linhas de uma
                              mesma tabela, sugerindo uma comparação que não
                              existe. Cada quadrinho some sozinho quando não há
                              dado — ver `lib/ficha-do-acervo.mjs`.
                            */}
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <Numero rotulo="Livros lidos" valor={String(ficha.lidos)}/>
                                <Numero
                                    rotulo="Páginas"
                                    valor={ficha.paginas > 0
                                        ? ficha.paginas.toLocaleString('pt-BR')
                                        : null}
                                />
                                <Numero
                                    rotulo="Caçando desde"
                                    valor={ficha.desde === null ? null : String(ficha.desde)}
                                />
                                <Numero
                                    rotulo="Nota média"
                                    valor={ficha.notaMedia === null
                                        ? null
                                        : ficha.notaMedia.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 1,
                                        })}
                                />
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            {/* `blockquote` + `cite`, e não dois `<p>`: é uma
                                citação de terceiro, e a assinatura é tipografada
                                diferente da frase justamente para não se
                                confundir com ela. */}
                            <blockquote className="border-l-2 pl-3" style={{borderColor: CIANO}}>
                                <p className="text-sm italic leading-relaxed text-white/70">
                                    {CARTEIRA_LEMA}
                                </p>
                                <cite className="mt-1 block text-[11px] not-italic text-white/40">
                                    — {CARTEIRA_LEMA_AUTOR}
                                </cite>
                            </blockquote>

                            {/*
                              A categoria mais lida é a ÚNICA coisa colorida da
                              ficha, e é de propósito: cor aqui codifica
                              identidade, e esta é a única identidade do painel.
                              A cor vem da taxonomia (lib/book-categories.mjs), a
                              mesma que pinta a categoria no card do livro — não é
                              um tom escolhido para este painel.

                              O nome acompanha o ponto, então a identidade nunca
                              depende só da cor.
                            */}
                            {categoria && (
                                <div className="mt-5">
                                    <div className="text-[10px] uppercase tracking-widest text-white/45">
                                        Especialidade
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <span
                                            aria-hidden="true"
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{backgroundColor: categoria.cor}}
                                        />
                                        <span className="truncate text-sm font-semibold text-white/90">
                                            {categoria.nome}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <ul className="mt-5 space-y-1.5">
                                {CARTEIRA_PRIVILEGIOS.map((p) => (
                                    <li key={p} className="flex gap-2 text-[13px] leading-snug text-white/65">
                                        <span aria-hidden="true" style={{color: CIANO}}>✦</span>
                                        <span>{p}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Rodapé do documento, atravessando como o cabeçalho — é o
                        carimbo de validade da licença, não legenda da imagem. */}
                    <p
                        className="mt-6 border-t border-white/10 pt-4 text-center text-[10px]
                                   uppercase tracking-[0.2em] text-white/35"
                        style={{fontFamily: 'var(--font-space-mono), monospace'}}
                    >
                        {CARTEIRA_RODAPE}
                    </p>
                </div>
            </div>
        </div>
    );
}
