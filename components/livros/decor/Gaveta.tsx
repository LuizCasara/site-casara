'use client';

import {useMemo, useRef, useState} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {MathUtils} from 'three';
import type * as THREE from 'three';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import {deslocamentoDaGaveta, gavetaEmMetros} from '@/lib/gaveta-model.mjs';

/**
 * A gaveta da mesa em L, e o que mora dentro dela: um bloco de notas, uma caneta
 * e alguns post-its soltos.
 *
 * **A sala já diz o que foi lido, o que está sendo lido e o que se quer ler.
 * Faltava o que SOBROU de ter lido tudo isso** — e é o que está anotado no bloco
 * (ver `lib/bilhete.ts`). Uma gaveta é o lugar certo para isso: fechada por
 * padrão, embaixo da mesa de estudo, achável só por quem foi curioso o bastante
 * para abrir.
 *
 * **Este componente não desenha a gaveta.** Ela já vem no `desk-corner.glb` como
 * nó próprio (`drawer`), e quem monta a mesa é o `CantoDeTrabalho` — que também
 * é quem cria o ref e o entrega ao `articulados` do `KenneyModel`, porque o nó
 * vive dentro do clone da mesa e não existe fora dele. Daqui sai o movimento e o
 * conteúdo.
 *
 * É um componente CONTROLADO: `aberta` vem de fora, do `RoomCanvas`, pelo mesmo
 * princípio da lava lamp, do interruptor e da janela — controle mora lá, a sala
 * é cenário. A diferença é que aqueles três são montados direto no `RoomCanvas`
 * e este não pode ser, justamente por causa do nó dentro do clone.
 */

/** O λ do damp. Mais lento que o das luzes (3,2) e um pouco mais rápido que o da
 *  cortina (2,2): puxar uma gaveta é um gesto curto de mão, não um braço
 *  correndo um pano de ponta a ponta. */
const VELOCIDADE = 2.8;

/**
 * A partir de que abertura o conteúdo aparece.
 *
 * Não é economia de draw call (embora seja isso também): **a gaveta do Kenney é
 * um bloco MACIÇO, sem cavidade**, então tudo aqui dentro se apoia na face de
 * cima dela e é a bandeja abaixo que finge o vão. Com a gaveta fechada, essas
 * peças ficam no espaço entre o topo do bloco e o tampo — e se a carcaça do
 * móvel for oca ali, elas apareceriam flutuando sob a madeira. Sumir resolve o
 * caso sem depender de como o `.glb` foi modelado por dentro.
 */
const LIMIAR_VISIVEL = 0.02;

/** As paredinhas que transformam o bloco maciço em bandeja. Baixas de propósito:
 *  o que se quer é a borda que diz "isto tem dentro", não uma caixa alta que
 *  esconda o que está guardado quando a câmera olha de cima. */
const ALTURA_PAREDE = 0.025;
const ESPESSURA_PAREDE = 0.008;

const COR_MADEIRA = '#43301f';
/** O fundo da bandeja, mais escuro que as paredes. Uma gaveta vista de cima tem
 *  o interior na sombra, e sem esse degrau a bandeja lê como um tampo de madeira
 *  com moldura em vez de um vão. */
const COR_FUNDO = '#2a1d12';

/**
 * Tamanhos pedidos em metros, como todo modelo desta sala.
 *
 * Os dois `.glb` são PLANOS — a espessura é o menor eixo dos dois —, então
 * nascem deitados e são pedidos por `larguraAlvo`, do mesmo jeito que os
 * tapetes. Pedir `alturaAlvo` a um objeto de 5mm de espessura daria um bloco de
 * notas do tamanho de um armário.
 */
const NOTA_M = 0.14;
const CANETA_M = 0.135;
const POSTIT_M = 0.048;

/**
 * Cores dos dois modelos do poly.pizza.
 *
 * Os materiais deles são nomeados pelo próprio hexadecimal original (`FFEB3B`,
 * `795548`…), não semanticamente como os do Furniture Kit — então o nome não diz
 * qual peça é qual. **Os três valores de cada peça foram escolhidos para
 * funcionarem em qualquer atribuição**: todos saem da paleta da sala, de modo
 * que descobrir que o marrom era a capa e não a lombada não estraga nada.
 *
 * O azul de escritório da caneta (`039BE5`) vira a mesma terracota da cortina da
 * janela: é a única cor fria que entraria nesta gaveta, e ela brigaria com a
 * madeira em volta.
 */
const CORES_DA_NOTA = {
    'FFEB3B': '#d8cba4', // papel envelhecido, no lugar do amarelo de marca-texto
    '795548': '#4a3626',
    'F44336': '#a8503c',
};
const CORES_DA_CANETA = {
    '1A1A1A': '#1b1f20',
    '455A64': '#59626b',
    '039BE5': '#a8503c',
};

/**
 * A partir de que `z` local o conteúdo é de fato VISTO.
 *
 * **O tampo continua por cima de parte da bandeja mesmo com a gaveta aberta**, e
 * isso foi medido, não estimado: o tampo avança 1,9cm além da frente da gaveta
 * fechada, e o curso de 22cm não chega a tirar os 31,6cm de profundidade inteiros
 * de baixo dele. Da parada da câmera (ver `VIEWPOINTS_DO_PC` em CameraRig), a
 * linha de visão passa raspando a borda da madeira e alcança daqui para a
 * frente — os últimos ~7cm do fundo ficam na sombra do tampo.
 *
 * Por isso tudo que está guardado aqui mora na METADE DA FRENTE. Não é só
 * conveniência de enquadramento: é o que acontece com uma gaveta de verdade
 * quando se puxa, as coisas escorregam para a frente.
 *
 * Baixar a câmera resolveria também, e foi testado — mas a 0,96m ela entra na
 * altura do encosto da cadeira, e o remédio ficaria pior que a doença.
 */
const FRENTE_VISIVEL_Z = -0.06;

/**
 * Os post-its são PRIMITIVAS, e não um quarto `.glb`.
 *
 * Um post-it é literalmente um quadrado de cinco centímetros: a esta distância,
 * três planos girados resolvem igual a um modelo baixado, e poupam um download,
 * uma pré-carga e uma terceira atribuição CC BY. Se algum dia ficarem pobres na
 * tela, trocar por modelo é uma linha; o caminho contrário — descobrir tarde que
 * se pagou por nada — é o caro.
 *
 * As cores são de bloquinho, mas rebaixadas: no tom de papelaria elas cruzariam
 * o `luminanceThreshold` do `<Bloom>` e três quadradinhos de 5cm virariam a
 * coisa mais acesa de uma sala de fim de tarde.
 *
 * O `y` escalonado evita que dois papéis empilhados disputem o mesmo pixel.
 */
const POSTITS = [
    {x: 0.100, z: FRENTE_VISIVEL_Z + 0.005, giro: 0.35, y: 0.0016, cor: '#c9b96f'},
    {x: 0.128, z: FRENTE_VISIVEL_Z + 0.036, giro: -0.22, y: 0.0026, cor: '#bf8a92'},
    {x: 0.079, z: FRENTE_VISIVEL_Z + 0.048, giro: 0.62, y: 0.0036, cor: '#8fa9b2'},
];

type GavetaProps = {
    /**
     * O nó `drawer` dentro do clone da mesa. Vem de fora porque ele só existe
     * dentro daquele clone — ver o cabeçalho.
     */
    no: React.RefObject<THREE.Object3D | null>;
    /** Centro da mesa no mundo, no mesmo contrato do `KenneyModel`. */
    centroDaMesa: [number, number, number];
    /** A altura pedida à mesa. É dela que saem TODAS as medidas em metros — ver
     *  `gavetaEmMetros`. Nada aqui é escrito em coordenada absoluta. */
    alturaDaMesa: number;
    aberta: boolean;
    /** Ausente = enfeite: sem clique e sem etiqueta, como o interruptor e a lava
     *  lamp quando há um livro aberto. */
    onAlternar?: () => void;
    onAbrirBilhete?: () => void;
    isMobile?: boolean;
};

export default function Gaveta({
    no, centroDaMesa, alturaDaMesa, aberta, onAlternar, onAbrirBilhete, isMobile = false,
}: GavetaProps) {
    const [hoverGaveta, setHoverGaveta] = useState(false);
    const [hoverNota, setHoverNota] = useState(false);
    const interativo = Boolean(onAlternar);

    const movel = useRef<THREE.Group>(null);
    const conteudo = useRef<THREE.Group>(null);
    /** A abertura ANIMADA, num ref e não em estado: ela muda a cada quadro, e um
     *  `useState` aqui re-renderizaria a árvore 60 vezes por segundo. Mesma
     *  regra da cortina da janela. */
    const abertura = useRef(0);

    const g = useMemo(() => gavetaEmMetros(alturaDaMesa), [alturaDaMesa]);

    /**
     * Onde a gaveta está no mundo, com ela fechada.
     *
     * O sinal trocado em X e Z **é a meia volta da mesa** (`MESA_ROT_Y`, que é
     * π): `gavetaEmMetros` devolve o deslocamento no referencial do arquivo, sem
     * saber como a peça foi posta na sala, e girar π é exatamente negar os dois
     * eixos. Se a mesa algum dia parar de levar meia volta, é esta linha que
     * muda — e a gaveta passaria a abrir para dentro da parede.
     */
    const zFechada = centroDaMesa[2] - g.dz;
    const posicao: [number, number, number] = [centroDaMesa[0] - g.dx, g.fundoY, zFechada];

    useFrame((_, delta) => {
        // `delta` capado pelo mesmo motivo do `useLuzSuave` e da cortina: uma aba
        // que volta do segundo plano entrega um salto de vários segundos, e o
        // damp viraria corte seco — a gaveta apareceria já aberta, sem o gesto.
        abertura.current = MathUtils.damp(
            abertura.current, aberta ? 1 : 0, VELOCIDADE, Math.min(delta, 0.1),
        );

        // Duas coisas se movem em sincronia, e em ESPAÇOS DIFERENTES: o nó vive
        // dentro do clone escalado da mesa (unidades do modelo), o conteúdo vive
        // na cena (metros). Escrever o mesmo número nos dois é o erro óbvio a
        // evitar aqui, e é por isso que a escala aparece explícita nas duas
        // funções de `gaveta-model.mjs`.
        if (no.current) no.current.position.z = deslocamentoDaGaveta(abertura.current);
        if (movel.current) movel.current.position.z = zFechada + abertura.current * g.curso;
        if (conteudo.current) conteudo.current.visible = abertura.current > LIMIAR_VISIVEL;
    });

    const meiaLargura = g.largura / 2;
    const meiaProfundidade = g.profundidade / 2;
    const meiaParede = ESPESSURA_PAREDE / 2;

    return (
        <group
            ref={movel}
            position={posicao}
            onPointerOver={(e) => {
                if (isMobile || !interativo) return;
                e.stopPropagation();
                setHoverGaveta(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                if (isMobile || !interativo) return;
                e.stopPropagation();
                setHoverGaveta(false);
                document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
                if (!interativo) return;
                e.stopPropagation();
                onAlternar?.();
            }}
        >
            {/*
              Alvo de clique da gaveta, cobrindo o bloco inteiro — mesma razão da
              caixa na frente do monitor e do interruptor. O modelo tem puxador
              modelado, e acertá-lo com o mouse a esta distância seria mira de
              precisão.

              Fica FORA do grupo do conteúdo de propósito: aquele some com a
              gaveta fechada, e um alvo invisível junto tornaria impossível
              abri-la de novo.

              O `y` negativo desce até o meio do bloco: a origem deste grupo é a
              face de CIMA da gaveta, e o corpo dela está abaixo.
            */}
            <mesh position={[0, -g.fundoY * 0.08, 0]}>
                <boxGeometry args={[g.largura, 0.10, g.profundidade]}/>
                <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
            </mesh>

            <group ref={conteudo} visible={false}>
                {/* O fundo. Um plano fino sobre a face maciça, só para o
                    interior ter cor de dentro de gaveta. */}
                <mesh position={[0, 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[g.largura, g.profundidade]}/>
                    <meshStandardMaterial color={COR_FUNDO} roughness={0.95}/>
                </mesh>

                {/*
                  As quatro paredinhas. Escritas como uma lista e não como quatro
                  <mesh> soltos porque são a mesma peça em quatro posições — e
                  porque assim mudar a espessura é mudar uma constante, não
                  quatro números que se desencontram.
                */}
                {[
                    {p: [0, 0, meiaProfundidade - meiaParede], l: g.largura, c: ESPESSURA_PAREDE},
                    {p: [0, 0, -meiaProfundidade + meiaParede], l: g.largura, c: ESPESSURA_PAREDE},
                    {p: [meiaLargura - meiaParede, 0, 0], l: ESPESSURA_PAREDE, c: g.profundidade},
                    {p: [-meiaLargura + meiaParede, 0, 0], l: ESPESSURA_PAREDE, c: g.profundidade},
                ].map(({p, l, c}) => (
                    <mesh key={`${p[0]}:${p[2]}`} position={[p[0], ALTURA_PAREDE / 2, p[2]]} castShadow>
                        <boxGeometry args={[l, ALTURA_PAREDE, c]}/>
                        <meshStandardMaterial color={COR_MADEIRA} roughness={0.8}/>
                    </mesh>
                ))}

                {POSTITS.map(({x, z, giro, y, cor}) => (
                    <mesh key={cor} position={[x, y, z]} rotation={[-Math.PI / 2, 0, giro]}>
                        <planeGeometry args={[POSTIT_M, POSTIT_M]}/>
                        <meshStandardMaterial color={cor} roughness={1}/>
                    </mesh>
                ))}

                {/* A caneta, atravessada na frente do bloco. O giro é o que a
                    faz parecer largada em vez de guardada em paralelo. */}
                <KenneyModel
                    url={MODELOS.caneta}
                    position={[0.045, 0.001, 0.052]}
                    rotation={[0, 0.95, 0]}
                    larguraAlvo={CANETA_M}
                    cores={CORES_DA_CANETA}
                />

                {/*
                  O bloco de notas, com alvo de clique próprio.

                  O alvo é uma caixa e não o modelo: o bloco tem 5mm de espessura
                  depois da escala, e é o objeto mais importante da gaveta —
                  acertar 5mm com o dedo num celular não é interação, é sorte.
                */}
                <group
                    onPointerOver={(e) => {
                        if (isMobile || !aberta || !onAbrirBilhete) return;
                        e.stopPropagation();
                        setHoverNota(true);
                        document.body.style.cursor = 'pointer';
                    }}
                    onPointerOut={(e) => {
                        if (isMobile || !aberta || !onAbrirBilhete) return;
                        e.stopPropagation();
                        setHoverNota(false);
                        document.body.style.cursor = 'auto';
                    }}
                    onClick={(e) => {
                        // O `aberta` no guarda não é redundante com o
                        // `visible={false}` do grupo: a versão do three decide se
                        // um nó invisível ainda entra no raycast, e depender
                        // disso é depender de um detalhe que muda entre versões
                        // sem aviso. Aqui o pior caso vira "clique sem efeito"
                        // em vez de "bilhete abre com a gaveta fechada".
                        if (!aberta || !onAbrirBilhete) return;
                        e.stopPropagation();
                        onAbrirBilhete();
                    }}
                >
                    <KenneyModel
                        url={MODELOS.nota}
                        position={[-0.085, 0.001, 0.020]}
                        rotation={[0, 0.12, 0]}
                        larguraAlvo={NOTA_M}
                        cores={CORES_DA_NOTA}
                    />
                    <mesh position={[-0.085, 0.014, 0.020]} rotation={[0, 0.12, 0]}>
                        <boxGeometry args={[NOTA_M * 0.78, 0.026, NOTA_M]}/>
                        <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
                    </mesh>
                    {hoverNota && aberta && !isMobile && (
                        <Html position={[-0.085, 0.055, 0.020]} center style={{pointerEvents: 'none'}}>
                            <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                             text-[11px] font-semibold text-white shadow-lg">
                                Ler
                            </span>
                        </Html>
                    )}
                </group>
            </group>

            {/* A etiqueta da gaveta some enquanto a da nota está no ar: duas
                bolhas empilhadas no mesmo palmo de tela viram ruído, e a de
                dentro é a que interessa naquele momento. */}
            {hoverGaveta && !hoverNota && !isMobile && (
                <Html position={[0, 0.11, meiaProfundidade]} center style={{pointerEvents: 'none'}}>
                    <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                     text-[11px] font-semibold text-white shadow-lg">
                        {/* O que o clique FAZ, não o estado atual — mesma regra
                            das etiquetas do monitor, da janela e do interruptor. */}
                        {aberta ? 'Fechar' : 'Abrir a gaveta'}
                    </span>
                </Html>
            )}
        </group>
    );
}
