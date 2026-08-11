import React, {RefObject} from 'react';
import {renderElementToPdf} from '@/utils/pdf-generator';
import {PERGUNTA_FINAL} from '@/lib/coisas-da-sala.mjs';
import {BILHETE_FRASES} from '@/lib/bilhete';

/**
 * O marcador de livro para imprimir — a última página do caderno de `/livros`.
 *
 * **É página do caderno, não botão flutuante no canto.** Quem folheia até o fim
 * encontra uma página que manda arrancar aquela; isso mantém tudo dentro do
 * objeto e dá um fim ao folhear, em vez de pendurar um "baixar PDF" sobre o
 * conteúdo desde a primeira página.
 *
 * Reusa o `renderElementToPdf` de `utils/pdf-generator.tsx` (html2canvas →
 * jsPDF), o mesmo motor dos dois testes de personalidade. Só o componente de
 * conteúdo e o nome do arquivo mudam — que é exatamente o que aquele motor foi
 * extraído para permitir.
 *
 * **Sem formulário de nome**, ao contrário do PDF do teste de temperamento. O
 * prêmio de um caderno de anotações ser um papel que PEDE para ser escrito à mão
 * fecha o círculo, e evita a fricção de um campo de texto antes do download.
 */

/**
 * Estilo inline em tudo, como nos outros PDFs do projeto.
 *
 * Não é preguiça: o `html2canvas` rasteriza o elemento com o CSS que ele
 * consegue resolver, e classes do Tailwind com variáveis de tema (`--font-…`,
 * cores em `oklch`) chegam nele como valores que ele às vezes não sabe pintar. O
 * que está escrito aqui é o que sai impresso.
 */
const TINTA = '#1c1917';
const TERRACOTA = '#a8503c';
const PAPEL = '#ffffff';

/**
 * Medidas do marcador em pixels da captura. 5 × 15cm é o formato clássico, e a
 * proporção é o que importa — o motor escala a folha inteira para a largura de
 * um A4.
 *
 * Os 240px vieram de um defeito real: a 190 a linha de "encontrado por" saía do
 * tracejado. **Alargar foi a metade da correção**; a outra é que as linhas de
 * preencher deixaram de ser underscores e viraram `borderBottom` (ver
 * `LinhaParaPreencher`). Uma fila de `_` tem a largura da FONTE, não do papel, e
 * qualquer ajuste de corpo a estoura de novo, em silêncio, dentro de um PDF que
 * ninguém revisa.
 */
const LARGURA_PX = 240;
const ALTURA_PX = 720;
const PADDING_PX = 24;

const CORTE: React.CSSProperties = {
    width: `${LARGURA_PX}px`,
    height: `${ALTURA_PX}px`,
    border: `1px dashed ${TERRACOTA}`,
    backgroundColor: PAPEL,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    padding: `${PADDING_PX + 8}px ${PADDING_PX}px`,
};

/** Quantas frases do bloco de notas vão para o verso. Duas: uma só fica solta
 *  no meio do papel, e três já competem com a linha de preencher. */
const FRASES_NO_VERSO = 2;

/**
 * Sorteia as frases que vão no verso deste marcador.
 *
 * São doze no bloco de notas da gaveta (`lib/bilhete.ts`) e não cabem num papel
 * de 5cm — então **cada marcador leva as suas**. Isso é feature e não limitação:
 * dois marcadores impressos em dias diferentes não são o mesmo papel.
 *
 * `Math.random()` sem cerimônia, pela mesma razão do sorteio de `lib/sorteio.ts`:
 * isto não é rifa paga, é qual frase sai impressa num marca-página.
 *
 * **Chamada uma vez por abertura do caderno, nunca durante o render**: um sorteio
 * dentro do componente daria uma frase diferente a cada re-render, e o papel
 * mudaria de conteúdo entre olhar e clicar em baixar.
 */
export function sortearFrasesDoMarcador(): string[] {
    const embaralhadas = [...BILHETE_FRASES];
    for (let i = embaralhadas.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [embaralhadas[i], embaralhadas[j]] = [embaralhadas[j], embaralhadas[i]];
    }
    return embaralhadas.slice(0, FRASES_NO_VERSO);
}

/** Rótulo pequeno em caixa alta — o que identifica cada campo do verso. */
const ROTULO: React.CSSProperties = {
    margin: 0,
    fontSize: '9px',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: '#a8a29e',
    fontFamily: 'Arial, sans-serif',
};

/**
 * Uma linha para escrever à mão.
 *
 * `borderBottom` num bloco de largura declarada, e **nunca uma fila de `_`**: o
 * underscore mede o que a fonte diz, o papel mede o que o corte diz, e foi
 * justamente esse descompasso que fez a linha vazar para fora do tracejado.
 * Assim ela cabe por construção, em qualquer corpo de texto.
 */
function LinhaParaPreencher({largura}: {largura: string}) {
    return (
        <span style={{
            display: 'inline-block',
            width: largura,
            height: '18px',
            borderBottom: `1px solid ${TINTA}`,
        }}/>
    );
}

/**
 * A folha que vai para o PDF: frente e verso lado a lado, para recortar e colar
 * (ou dobrar) num marcador só.
 *
 * Fica escondida (`display: none`) até a hora da captura, e é o motor quem a
 * mostra fora da tela — mesmo arranjo do `PdfContent` do teste de temperamento.
 */
export const MarcadorPdfContent = React.forwardRef<HTMLDivElement, {frases: string[]}>(({frases}, ref) => (
    <div
        ref={ref}
        style={{
            width: '800px',
            padding: '60px 40px',
            backgroundColor: PAPEL,
            fontFamily: 'Georgia, "Times New Roman", serif',
            display: 'none',
        }}
    >
        <p style={{
            margin: '0 0 34px', textAlign: 'center', fontSize: '11px',
            letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a8a29e',
            fontFamily: 'Arial, sans-serif',
        }}>
            recorte pelo tracejado · frente e verso
        </p>

        <div style={{display: 'flex', gap: '40px', justifyContent: 'center'}}>
            {/*
              FRENTE: a pergunta, e nada mais.

              Tipografia grande com muito branco em volta, e nenhum detalhe fino:
              isto vai sair de uma impressora doméstica em papel comum, e traço
              de meio ponto morre nesse caminho. Pouca tinta também é escolha —
              um marcador chapado de cor gasta o cartucho de quem imprimiu por
              gentileza.
            */}
            <div style={{...CORTE, justifyContent: 'center'}}>
                <p style={{
                    margin: 0, fontSize: '30px', lineHeight: 1.28, color: TINTA,
                    fontStyle: 'italic',
                }}>
                    {PERGUNTA_FINAL}
                </p>
                <div style={{
                    marginTop: '26px', width: '46px', height: '2px',
                    backgroundColor: TERRACOTA,
                }}/>
            </div>

            {/*
              VERSO: uma ou duas frases do bloco de notas da gaveta, a linha para
              preencher à mão e o endereço do site no pé.

              As frases são o que o marcador leva da sala para o mundo — são doze
              no bloco (`lib/bilhete.ts`) e não caberiam nem duas de cada tipo num
              papel de 5cm, então **cada marcador sai com um sorteio próprio**.
              Isso é feature e não limitação: dois marcadores impressos em dias
              diferentes não são o mesmo papel.

              A linha é o motivo de o marcador existir — um caderno de anotações
              que termina num papel pedindo para ser escrito é o círculo se
              fechando.
            */}
            <div style={{...CORTE, justifyContent: 'space-between'}}>
                <p style={ROTULO}>Coisas que ninguém repara</p>

                <div>
                    {frases.map((frase) => (
                        <p key={frase} style={{
                            margin: '0 0 18px', fontSize: '15px', lineHeight: 1.42,
                            color: TINTA, fontStyle: 'italic',
                        }}>
                            {frase}
                        </p>
                    ))}
                    <div style={{width: '34px', height: '2px', backgroundColor: TERRACOTA}}/>
                </div>

                <div>
                    <p style={{...ROTULO, marginBottom: '2px'}}>encontrado por</p>
                    <LinhaParaPreencher largura="100%"/>
                    <p style={{...ROTULO, margin: '10px 0 2px'}}>em</p>
                    <div style={{fontSize: '13px', color: '#a8a29e', whiteSpace: 'nowrap'}}>
                        <LinhaParaPreencher largura="42px"/>
                        {' / '}
                        <LinhaParaPreencher largura="42px"/>
                        {' / '}
                        <LinhaParaPreencher largura="60px"/>
                    </div>
                    <p style={{...ROTULO, marginTop: '18px', letterSpacing: '0.08em'}}>
                        luizcasara.com/livros
                    </p>
                </div>
            </div>
        </div>
    </div>
));

MarcadorPdfContent.displayName = 'MarcadorPdfContent';

export const gerarMarcadorPdf = async (
    ref: RefObject<HTMLDivElement>,
    setCarregando: (carregando: boolean) => void,
) => renderElementToPdf(ref, 'marcador-coisas-que-ninguem-repara', setCarregando);
