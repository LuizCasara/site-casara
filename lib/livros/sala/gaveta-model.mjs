/**
 * As medidas da gaveta do `desk-corner.glb` e a cinemática de abrir.
 *
 * **Todos os números aqui foram LIDOS dos vértices do arquivo**, não estimados —
 * mesmo tratamento dos nichos da estante (`bookshelf-model.mjs`), do vão do
 * relógio (`relogio-model.mjs`) e das cortinas (`janela-model.mjs`), e pelo
 * mesmo motivo: trocar o `.glb` sem atualizar esta tabela quebra o teste, em vez
 * de deixar a gaveta abrindo para dentro da parede ou o bloco de notas flutuando
 * dez centímetros acima do fundo.
 *
 * **A mesa em L já vem com a gaveta pronta**, e é isso que torna a coisa toda
 * barata: o arquivo tem três nós — `deskCorner`, `deskCorner_1` e `drawer` —,
 * então a gaveta não precisou ser construída, só transladada. Sem esse nó, o
 * caminho seria modelar uma peça nova e casá-la com o vão do móvel na mão.
 *
 * As unidades são as do MODELO, não metros, pela mesma razão da janela: o
 * `KenneyModel` escala a peça inteira para o tamanho pedido, e um curso escrito
 * em centímetros precisaria saber por quanto a mesa foi escalada. Quem precisa
 * de metros chama `gavetaEmMetros()`, no fim do arquivo.
 */

/** Caixa envolvente da mesa inteira, em unidades do modelo. É o que o
 *  `KenneyModel` mede para calcular a escala, e o que define onde fica o centro
 *  a partir do qual a gaveta se desloca. */
export const MESA_NATIVA = {
    minX: -0.9745, maxX: 0,
    minY: 0, maxY: 0.3844,
    minZ: 0, maxZ: 0.9745,
};

/**
 * A gaveta: um nó próprio do `.glb`, chamado `drawer`.
 *
 * Ao contrário das cortinas da janela — cujos nomes de nó são lixo gerado pelo
 * conversor (`group1329612974`) — este nome é semântico, porque o Furniture Kit
 * do Kenney nomeia as coisas. Um raro caso em que o arquivo colabora.
 *
 * `minZ`/`maxZ` são os da CAIXA da gaveta, sem o puxador. O puxador avança um
 * pouco mais (ver `PUXADOR_Z`), e é ele que primeiro sai do móvel ao abrir.
 */
export const GAVETA = {
    no: 'drawer',
    minX: -0.2468, maxX: -0.0500,
    minY: 0.2744, maxY: 0.3244,
    minZ: 0.5945, maxZ: 0.7585,
};

/**
 * A ponta do puxador, no eixo em que a gaveta corre.
 *
 * **É o que diz para que lado ela abre**, e não dá para adivinhar: o puxador
 * fica no z MENOR que a caixa, ou seja, a gaveta sai no sentido -z do modelo.
 * Como a mesa é montada com meia volta (`MESA_ROT_Y`), esse -z local vira o +z
 * do mundo — a direção da sala e da câmera. Se algum dia a mesa perder a meia
 * volta, a gaveta passa a abrir para dentro da parede, e é este comentário que
 * explica por quê.
 */
export const PUXADOR_Z = 0.5822;

/**
 * Quanto ela abre, como fração da própria profundidade.
 *
 * Escrito em fração e não em centímetros para não depender do tamanho que a mesa
 * tem hoje. 70% expõe o conteúdo inteiro; aberta até o batente, uma gaveta
 * parece prestes a cair da corrediça, que é o oposto do que se quer mostrar.
 */
export const FRACAO_ABERTA = 0.70;

/** O curso em unidades do modelo. */
export const CURSO = (GAVETA.maxZ - GAVETA.minZ) * FRACAO_ABERTA;

/**
 * O deslocamento do nó `drawer` no eixo Z LOCAL do modelo, para um grau de
 * abertura.
 *
 * Negativo porque abrir é caminhar no sentido do puxador (ver `PUXADOR_Z`). É
 * exatamente o que vai em `node.position.z`, e é por isso que a conta pode ser
 * feita aqui, sem cena nenhuma montada, e conferida por teste.
 *
 * @param abertura 0 = fechada, 1 = aberta
 */
export function deslocamentoDaGaveta(abertura) {
    const t = Math.min(1, Math.max(0, abertura));
    // O ramo do zero existe só para não devolver `-0`, que é o que `-CURSO * 0`
    // produz. Como posição dá exatamente no mesmo lugar; como valor de uma API
    // pública, é o tipo de coisa que reaparece meses depois virando a string
    // "-0" numa etiqueta ou derrubando uma comparação por `Object.is`.
    return t === 0 ? 0 : -CURSO * t;
}

/**
 * A gaveta em METROS, relativa à origem que o `KenneyModel` dá à mesa — o ponto
 * do chão sob o centro dela — e **antes da meia volta** com que a mesa é
 * montada.
 *
 * Antes da rotação de propósito: quem sabe como a mesa está girada é o
 * `CantoDeTrabalho`, e é lá que a meia volta se aplica (que, sendo π, é só
 * trocar o sinal de X e Z). Aplicá-la aqui obrigaria este arquivo a conhecer o
 * layout da sala para calcular uma medida do arquivo `.glb`.
 *
 * `fundoY` é a face de CIMA do bloco da gaveta. A peça do Kenney é maciça, sem
 * cavidade nenhuma — quem faz dela uma gaveta de verdade são as paredinhas que o
 * `Gaveta.tsx` levanta neste plano, e é sobre ele que o bloco de notas, a caneta
 * e os post-its se apoiam.
 *
 * @param alturaDaMesaM a altura pedida ao `KenneyModel` (`alturaAlvo`)
 */
export function gavetaEmMetros(alturaDaMesaM) {
    const escala = alturaDaMesaM / (MESA_NATIVA.maxY - MESA_NATIVA.minY);
    const centroMesaX = (MESA_NATIVA.minX + MESA_NATIVA.maxX) / 2;
    const centroMesaZ = (MESA_NATIVA.minZ + MESA_NATIVA.maxZ) / 2;

    return {
        escala,
        /** Deslocamento do centro da gaveta em relação ao centro da mesa. */
        dx: ((GAVETA.minX + GAVETA.maxX) / 2 - centroMesaX) * escala,
        dz: ((GAVETA.minZ + GAVETA.maxZ) / 2 - centroMesaZ) * escala,
        fundoY: GAVETA.maxY * escala,
        largura: (GAVETA.maxX - GAVETA.minX) * escala,
        profundidade: (GAVETA.maxZ - GAVETA.minZ) * escala,
        curso: CURSO * escala,
        /** Quanto espaço livre existe entre o fundo da gaveta e o tampo. É o teto
         *  do que cabe lá dentro — e o que impede as paredinhas de atravessarem
         *  a madeira por cima. */
        alturaLivre: (MESA_NATIVA.maxY - GAVETA.maxY) * escala,
    };
}
