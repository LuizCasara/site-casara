/**
 * Quem ocupa a parede do fundo, e a regra de que ninguém pode invadir ninguém.
 *
 * **Existe porque um quadro dentro de um móvel não quebra build nem teste, só
 * some** — a mesma classe de erro da mira da lanterna, que apontava para a quina
 * havia semanas sem ninguém notar.
 *
 * O que torna esta parede um problema de verdade é que ela tem um ocupante que
 * CRESCE SOZINHO: a estante do acervo ganha uma segunda cópia quando os grupos
 * de ano passam de cinco, uma terceira quando passam de dez, e o conjunto fica
 * centrado na parede — ou seja, cada estante nova empurra as bordas para os dois
 * lados, em cima dos quadros que estão lá. Nada nesse caminho pede permissão a
 * ninguém: o acervo cresce, os grupos se dividem, e um dia o quadro está dentro
 * da madeira.
 *
 * Este arquivo sabe a REGRA (nada se sobrepõe) e a geometria dos quadros. Quem
 * sabe ONDE as estantes estão é o `Room.tsx`, que já importa `posicaoDaEstante`
 * e monta a lista de ocupantes — assim nenhuma coordenada de móvel é copiada
 * para cá e nada depende de importar um `.tsx` de dentro de um `node --test`.
 */

/** A parede em si. Os quadros ficam 2cm à frente dela. */
export const PAREDE_DO_FUNDO_Z = -1.6;
export const QUADRO_Z = -1.58;

/**
 * O que está pendurado na parede do fundo, de um lado e do outro da estante.
 *
 * O Gorillaz é quadrado porque a arte é capa de disco — o formato do quadro
 * acompanha a imagem, não o contrário. O quadro de recados é o de canetão, com
 * bandeja, que abre o WhatsApp.
 *
 * **O que NÃO está aqui:** a prateleira aérea do canto de trabalho, que também
 * mora nesta parede (a partir de x ≈ 0,95). Ela ficou de fora porque as medidas
 * dela nascem da QUINA das paredes, dentro de `CantoDeTrabalho`, e trazê-las
 * para cá significaria copiar coordenada de móvel — exatamente o que este
 * arquivo existe para evitar. Quem mexer na largura dela precisa conferir a
 * folga contra a estante de olho.
 */
export const QUADROS_DO_FUNDO = {
    gorillaz: {x: -1.45, y: 1.6, larguraM: 0.5, alturaM: 0.5, rotationY: 0.04},
    recomendacoes: {x: 0.68, y: 1.36, larguraM: 0.44, alturaM: 0.43, rotationY: -0.03},
};

/**
 * A folga mínima entre dois vizinhos na parede.
 *
 * Não é zero: encostar não derruba nada, mas duas peças coladas leem como uma
 * só. **Três centímetros, e o número foi MEDIDO na sala, não escolhido** — o par
 * mais apertado que existe hoje e funciona é o quadro de recados contra a
 * estante, a 4,2cm. Um limiar de 5cm reprovaria a sala como ela está, o que
 * transformaria o teste em ruído no primeiro dia.
 */
export const FOLGA_MINIMA_M = 0.03;

/** O trecho de parede que uma peça ocupa em X: `[esquerda, direita]`. */
export function vaoDe({x, larguraM}) {
    return [x - larguraM / 2, x + larguraM / 2];
}

/**
 * Quanto dois vãos se invadem, em metros. Zero (ou negativo) quer dizer que
 * não se tocam — o negativo é a distância que sobra entre eles.
 */
export function sobreposicaoM([aEsq, aDir], [bEsq, bDir]) {
    return Math.min(aDir, bDir) - Math.max(aEsq, bEsq);
}

/**
 * Os pares de ocupantes que se invadem, ou que ficam mais perto que a folga.
 *
 * @param ocupantes `[{nome, vao: [esq, dir]}, …]`, na ordem que quiser.
 * @returns lista de `{a, b, sobreposicaoM}` — vazia quando a parede está bem
 *   dividida. Devolve a lista e não um booleano de propósito: a mensagem de
 *   falha do teste precisa dizer QUEM está em cima de quem e por quantos
 *   centímetros, senão descobrir isso vira uma sessão de conta na mão.
 */
export function colisoesNaParede(ocupantes, folgaM = FOLGA_MINIMA_M) {
    const achadas = [];
    for (let i = 0; i < ocupantes.length; i++) {
        for (let j = i + 1; j < ocupantes.length; j++) {
            const invasao = sobreposicaoM(ocupantes[i].vao, ocupantes[j].vao);
            if (invasao > -folgaM) {
                achadas.push({
                    a: ocupantes[i].nome,
                    b: ocupantes[j].nome,
                    sobreposicaoM: Number(invasao.toFixed(4)),
                });
            }
        }
    }
    return achadas;
}

/**
 * A lista de ocupantes da parede a partir dos vãos das estantes.
 *
 * Os quadros saem daqui; as estantes chegam de fora, porque quantas são depende
 * do acervo e onde cada uma fica é conta do `EstanteDoAcervo`.
 *
 * @param vaosDasEstantes `[[esq, dir], …]`, uma entrada por móvel.
 */
export function ocupantesDaParedeDoFundo(vaosDasEstantes) {
    return [
        ...Object.entries(QUADROS_DO_FUNDO).map(([nome, q]) => ({
            nome: `quadro-${nome}`,
            vao: vaoDe(q),
        })),
        ...vaosDasEstantes.map((vao, i) => ({nome: `estante-${i}`, vao})),
    ];
}
