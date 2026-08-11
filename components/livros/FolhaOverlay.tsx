'use client';

import {COISAS, TOTAL_DE_COISAS, PERGUNTA_FINAL} from '@/lib/coisas-da-sala.mjs';

/**
 * A folha de anotações da mesa do PC: a lista das coisas que respondem ao clique
 * nesta sala.
 *
 * **Irmã do [BilheteOverlay](./BilheteOverlay.tsx)**, e de propósito: os dois são
 * papel dentro da mesma sala, então dividem o fundo claro nos dois temas, a
 * margem terracota e a folha torta. Um segundo visual para o segundo papel só
 * diria que eles não são a mesma coisa — e são.
 *
 * **Isto não é fechadura.** Nada na sala fica trancado enquanto esta lista está
 * incompleta: a gaveta abre no primeiro clique de quem chegou agora, e o bilhete
 * dela continua onde está. O que a lista faz é dar nome ao que já estava lá.
 *
 * O `Esc` NÃO é tratado aqui: o `RoomCanvas` tem um listener único para todas as
 * camadas da sala, na ordem em que elas aparecem na tela. Um segundo listener
 * daqui competiria com aquele em vez de se somar a ele.
 */

/** A mesma terracota do bilhete — a caneta vermelha de caderno da sala. */
const TERRACOTA = '#a8503c';

/**
 * O bloco censurado tem o COMPRIMENTO do texto que esconde.
 *
 * Uma barra de tamanho fixo em toda linha viraria uma parede de blocos idênticos,
 * que não é o que uma lista rasurada parece — e o tamanho é justamente a única
 * coisa que uma tarja deixa escapar de propósito, em qualquer documento censurado.
 * Sai do texto e não de aleatório porque este componente renderiza no servidor
 * antes de renderizar no cliente, e um `Math.random()` aqui daria dois HTMLs
 * diferentes para a mesma linha.
 */
function tarja(texto: string) {
    return '█'.repeat(Math.max(4, Math.round(texto.length * 0.62)));
}

type FolhaOverlayProps = {
    /** Os ids já encontrados. Só os que existem na sala de hoje — quem filtra é
     *  `achadosValidos`, em lib/coisas-da-sala.mjs. */
    achados: string[];
    onClose: () => void;
};

export default function FolhaOverlay({achados, onClose}: FolhaOverlayProps) {
    const encontrados = new Set(achados);
    const quantos = COISAS.filter((c) => encontrados.has(c.id)).length;

    return (
        <div
            // z-30, a mesma camada do bilhete, da carteira e do card de um livro
            // aberto: são todos "conteúdo em foco sobre a sala", e nunca aparecem
            // juntos.
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4
                       backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Coisas que ninguém repara"
        >
            <div
                // O clique no papel não fecha; só o clique no fundo. Sem isto,
                // selecionar uma linha para copiar fecharia a folha no meio do
                // gesto — mesma correção do bilhete.
                onClick={(e) => e.stopPropagation()}
                className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-sm px-7
                           py-8 shadow-2xl sm:px-10 sm:py-10"
                style={{
                    // Claro nos DOIS temas, como o bilhete: é um objeto físico
                    // sobre uma mesa, não uma superfície da interface.
                    backgroundColor: '#f2ead6',
                    backgroundImage:
                        'repeating-linear-gradient(to bottom, transparent 0 27px,' +
                        ' rgba(70,100,130,0.10) 27px 28px)',
                    // Torta como a do bilhete, mas para o outro lado: as duas
                    // folhas inclinadas igual leriam como o mesmo papel reaberto.
                    transform: 'rotate(0.5deg)',
                }}
            >
                <div
                    className="pointer-events-none absolute inset-y-0 left-4 w-px sm:left-6"
                    style={{backgroundColor: TERRACOTA, opacity: 0.45}}
                />

                <button
                    onClick={onClose}
                    aria-label="Fechar a lista"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center
                               rounded-full text-lg leading-none text-stone-500
                               transition hover:bg-stone-900/10 hover:text-stone-800"
                >
                    ×
                </button>

                <header className="mb-5 pr-6">
                    <h2
                        className="text-[13px] font-bold uppercase tracking-wide text-stone-600"
                        // Space Mono por variável CSS, como no bilhete: o Tailwind
                        // desta base mapeia `font-mono` para a pilha do sistema.
                        style={{fontFamily: 'var(--font-space-mono), monospace'}}
                    >
                        Coisas que ninguém repara
                    </h2>
                    {/*
                      O contador é `n de 17` e não uma barra de progresso: uma
                      barra promete uma tarefa com fim obrigatório, e isto é uma
                      lista de observação. O total sai de `TOTAL_DE_COISAS`, então
                      um item 18 muda este número sozinho.
                    */}
                    <p className="mt-1 text-[13px] text-stone-500">
                        {quantos} de {TOTAL_DE_COISAS}
                    </p>
                </header>

                <ol className="space-y-2.5 text-[15px] leading-relaxed text-stone-800">
                    {COISAS.map((coisa) => {
                        const achou = encontrados.has(coisa.id);
                        return (
                            <li key={coisa.id} className="flex gap-2.5">
                                <span
                                    aria-hidden="true"
                                    className="select-none"
                                    style={{color: TERRACOTA}}
                                >
                                    {achou ? '✓' : '•'}
                                </span>
                                <span className="min-w-0">
                                    {achou ? (
                                        <span className="line-through decoration-stone-500">
                                            {coisa.texto}
                                        </span>
                                    ) : (
                                        <>
                                            {/*
                                              A tarja é decoração: um leitor de
                                              tela lendo dezessete blocos de
                                              caracteres cheios não informa nada.
                                              O que ele lê é a linha abaixo, que
                                              diz o que a tarja significa, e
                                              depois a dica — que é a informação
                                              de verdade desta linha.
                                            */}
                                            <span
                                                aria-hidden="true"
                                                className="block select-none break-all leading-tight
                                                           tracking-tighter text-stone-400"
                                            >
                                                {tarja(coisa.texto)}
                                            </span>
                                            <span className="sr-only">ainda não encontrado.</span>
                                            <span className="mt-0.5 block text-[12px] leading-snug text-stone-500">
                                                {coisa.dica}
                                            </span>
                                        </>
                                    )}
                                </span>
                            </li>
                        );
                    })}
                </ol>

                {/*
                  A última linha fica FORA da contagem — ela não é tarefa, e por
                  isso não tem tarja nem dica. É a única que faz pergunta, e é o
                  que aponta para o prêmio sem nomeá-lo. Marca-texto e não caixa
                  de aviso, como o fecho do bilhete.
                */}
                <p className="mt-7 text-[15px] font-bold leading-relaxed text-stone-900">
                    <span
                        className="box-decoration-clone px-1 py-0.5"
                        style={{backgroundColor: 'rgba(216,201,111,0.55)'}}
                    >
                        {PERGUNTA_FINAL}
                    </span>
                </p>
            </div>
        </div>
    );
}
