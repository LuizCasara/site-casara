'use client';

import {useState} from 'react';
import {Html, useTexture} from '@react-three/drei';
import {useTexturaDeChuva} from '@/components/livros/decor/use-textura-de-chuva';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import ItensDeEstudo from '@/components/livros/decor/ItensDeEstudo';
import DeitadoNoTampo from '@/components/livros/decor/DeitadoNoTampo';
import PrateleiraAerea from '@/components/livros/decor/PrateleiraAerea';
import Quadro from '@/components/livros/decor/Quadro';
import StandDeEspadas from '@/components/livros/decor/StandDeEspadas';
import {useRadio, NIVEIS_DE_VOLUME} from '@/components/livros/decor/use-radio';
import {useTexturaDePlayer} from '@/components/livros/decor/use-textura-de-player';
import {trackRoomObjectClick} from '@/utils/analytics';

/**
 * O canto de trabalho, à direita da estante: mesa em L encaixada na quina das
 * duas paredes, cadeira, dois monitores acesos, teclado e um gabinete no chão.
 *
 * A mobília vem do mesmo Furniture Kit CC0 do resto da sala, o que garante que o
 * canto pertença visualmente ao cômodo em vez de parecer colado de outro
 * projeto. O gabinete é primitiva — o kit não tem um.
 *
 * **Não é território congelado**, ao contrário da estante e do canto de leitura.
 */

/** Altura do tampo. Como KenneyModel assenta a base em Y=0, é também o Y da superfície. */
const ALTURA_MESA = 0.74;
/**
 * O modelo é um L de verdade — o tampo ocupa três dos quatro quadrantes, com
 * o cotovelo em (-x, +z). Meia volta leva esse cotovelo para (+x, -z), que é a
 * quina entre a parede de fundo e a lateral direita. Sem isso a mesa abraça o
 * ar e vira as costas para a parede.
 */
const MESA_ROT_Y = Math.PI;
/** Pegada da mesa, quadrada por ser um L: 2,535 de largura por metro de altura. */
const MESA_LADO_M = ALTURA_MESA * 2.535;

const ALTURA_CADEIRA = 0.95;
const ALTURA_MONITOR = 0.42;
const LARGURA_TECLADO = 0.42;
const LADO_TAPETE_M = 2.0;
/** Altura do porta-retratos; a largura sai dela pela proporção 2:3 da foto. */
const ALTURA_RETRATO = 0.19;
const COMPRIMENTO_CELULAR_M = 0.15;
/**
 * Espessura dividida pelo comprimento, medida em cada .glb — é o que dá a
 * espessura real depois da escala, sem ter de abrir o arquivo em runtime. Ver
 * DeitadoNoTampo, que usa isto para pousar a peça em cima da madeira em vez de
 * metade dentro dela.
 *
 * Celular: 0,176 de 1,504. Headphone: 111,5 de 242,6 (o modelo vem em
 * unidades gigantes, mas o que importa aqui é a proporção).
 */
const RAZAO_ESPESSURA_CELULAR = 0.117;
const RAZAO_ESPESSURA_HEADPHONE = 0.46;

/**
 * Meia volta, somada à rotação de cada peça de mesa.
 *
 * **Os modelos deste kit apontam a frente para -z**, não para +z. Sem isto os
 * monitores e o teclado ficavam de costas, mostrando a traseira para a sala e
 * a tela para a parede. Confirmado medindo a cadeira: os vértices da parte
 * alta dela — o encosto — têm z médio positivo, ou seja, o encosto fica atrás
 * em +z e quem senta olha para -z.
 *
 * Cuidado ao mexer nos ângulos de convergência abaixo: depois da meia volta,
 * um ajuste POSITIVO gira a frente da peça para +x.
 */
const FRENTE_PARA_A_SALA = Math.PI;

const COR_MADEIRA = '#43301f';
const COR_METAL = '#59626b';
const COR_METAL_ESCURO = '#1b1f20';
const COR_ESTOFADO = '#3c4450';
/** Mais frio e escuro que o tapete do canto de leitura: são dois ambientes. */
const COR_TAPETE = '#4a4f57';
const COR_TAPETE_ESCURO = '#3a3f45';
/** Azul frio de tela ligada — o contraponto ao verde da lava lamp do outro lado. */
const COR_TELA = '#8fd0f5';
/**
 * Duas medidas diferentes: o quanto a tela BRILHA (aqui) e o quanto ela ILUMINA
 * em volta (LUZ_DAS_TELAS, abaixo). Ambas são baixas de propósito — em ~0.85 e
 * ~2.2 as telas estouravam em branco no <Bloom> e lavavam a mesa inteira de
 * azul, virando a coisa mais clara de uma cena que é de fim de tarde com abajur.
 */
const BRILHO_DA_TELA = 0.42;

/**
 * Os três estados do monitor da direita, na ordem em que o clique os percorre.
 * `desligada` não tem textura nenhuma: a tela fica preta E para de emitir luz,
 * que é o que separa um monitor apagado de um monitor mostrando preto.
 *
 * **`rotulo` é o que o clique FAZ estando neste estado**, não o nome do estado
 * — por isso a etiqueta usa o índice atual e não o seguinte. Somar +1 aqui
 * aplica o deslocamento duas vezes e a etiqueta passa a anunciar o estado
 * depois do próximo.
 *
 * **A sala abre em `desligada`, e isso não é escolha estética.** Desde que a
 * tela passou a mandar no ÁUDIO também, começar em `lofi` seria prometer um som
 * que nenhum navegador deixaria tocar sem um gesto da pessoa — a tela mostraria
 * um player e não sairia nada. Nascendo apagada, cada estado quer dizer
 * exatamente o que se vê e se ouve, e o primeiro clique não precisa ser um caso
 * especial. O monitor da ESQUERDA continua aceso, então o canto não fica morto.
 */
const ESTADOS_DA_TELA = [
    {id: 'desligada', rotulo: 'Ligar o som'},
    {id: 'lofi', rotulo: 'Chuva'},
    {id: 'chuva', rotulo: 'Desligar'},
] as const;

/** Volume inicial: o médio de NIVEIS_DE_VOLUME. Som ambiente que chega alto na
 *  primeira vez é som que a pessoa desliga em vez de ajustar. */
const VOLUME_INICIAL = 1;
const LUZ_DAS_TELAS = 0.9;
const COR_LED = '#4da3ff';

type CantoDeTrabalhoProps = {
    /** Quina que a mesa abraça: canto do fundo à direita. */
    quina: [number, number];
    /** Clique no porta-retratos — quem decide o que fazer é RoomCanvas.tsx. */
    onAbrirRetrato?: () => void;
    isMobile?: boolean;
};

/**
 * @param quina [x, z] da quina das paredes. A mesa se posiciona a partir dela,
 *   e não com o centro escrito à mão, porque o que define este canto é estar
 *   encaixado nas duas paredes — mover uma parede sem mover a mesa junto
 *   deixaria uma fresta ou enfiaria o tampo na alvenaria.
 */
export default function CantoDeTrabalho({quina, onAbrirRetrato, isMobile = false}: CantoDeTrabalhoProps) {
    // A imagem da tela da esquerda, que é fixa. Carregada aqui, e não dentro do
    // KenneyModel, porque quem carrega é quem suspende — e o modelo já suspende
    // pelo próprio .glb. A da direita não é mais imagem: é o player desenhado
    // quadro a quadro (ver use-textura-de-player.ts).
    const telaEsquerda = useTexture('/livros/tela-factorio.jpg');
    const [estadoDaTela, setEstadoDaTela] = useState(0);
    const [telaHover, setTelaHover] = useState(false);
    const [volume, setVolume] = useState(VOLUME_INICIAL);
    const estadoAtual = ESTADOS_DA_TELA[estadoDaTela].id;

    // O áudio da sala inteira sai daqui: o monitor escolhe O QUE toca e a caixa
    // de som da prateleira, QUÃO ALTO. Os dois moram neste componente porque a
    // PrateleiraAerea já é montada por ele — nenhum contexto novo é necessário.
    const radio = useRadio(estadoAtual, volume);

    // As duas telas dinâmicas só são desenhadas no estado delas; fora dele o
    // hook devolve a mesma textura, congelada no último quadro e sem custo.
    const chuva = useTexturaDeChuva(estadoAtual === 'chuva');
    const player = useTexturaDePlayer(estadoAtual === 'lofi', radio);
    const telaAtual = {lofi: player, chuva, desligada: null}[estadoAtual];
    const meio = MESA_LADO_M / 2;
    const centro: [number, number, number] = [quina[0] - meio, 0, quina[1] + meio];
    // O braço da mesa que corre junto à parede de fundo, onde ficam as telas.
    const zDoFundo = quina[1] + 0.28;
    const tampo = ALTURA_MESA;

    return (
        <group>
            {/* Tapete sob o conjunto todo. y=0.004 pelo mesmo z-fighting do
                tapete do canto de leitura (ver Room.tsx). */}
            <KenneyModel
                url={MODELOS.tapeteQuadrado}
                position={[centro[0] - 0.28, 0.004, centro[2] + 0.30]}
                larguraAlvo={LADO_TAPETE_M}
                cores={{carpet: COR_TAPETE, carpetDarker: COR_TAPETE_ESCURO}}
            />

            <KenneyModel
                url={MODELOS.mesaEmL}
                position={centro}
                rotation={[0, MESA_ROT_Y, 0]}
                alturaAlvo={ALTURA_MESA}
                cores={{wood: COR_MADEIRA, metal: COR_METAL}}
            />

            {/*
              Cadeira no VÃO do L, o único quadrante que o tampo não ocupa
              (frente-esquerda, depois da meia volta da mesa) — em qualquer outro
              ela atravessa a madeira.

              Virada para os monitores, que é o que a pessoa sentada estaria
              olhando: de costas para quem entra na sala, e o encosto é
              justamente o lado interessante de uma cadeira de escritório.
            */}
            <KenneyModel
                url={MODELOS.cadeiraDeEscritorio}
                position={[centro[0] - 0.45, 0, centro[2] + 0.45]}
                rotation={[0, -0.3, 0]}
                alturaAlvo={ALTURA_CADEIRA}
                cores={{metalMedium: COR_METAL_ESCURO, carpet: COR_ESTOFADO}}
            />

            {/*
              Dois monitores, levemente convergentes — paralelos ficariam com
              cara de vitrine de loja.

              A TELA é um material próprio do modelo (`metal`, o painel dentro
              da moldura), então acender é recolorir e pôr emissivo nele — sem
              plano extra por cima, que sempre aparece como adesivo desalinhado.
              O <Bloom> da cena faz o resto do halo.
            */}
            <KenneyModel
                url={MODELOS.monitor}
                position={[centro[0] - 0.34, tampo, zDoFundo]}
                rotation={[0, FRENTE_PARA_A_SALA + 0.22, 0]}
                alturaAlvo={ALTURA_MONITOR}
                cores={{metalDark: COR_METAL_ESCURO}}
                texturas={{metal: telaEsquerda}}
                emissivos={{metal: {cor: '#ffffff', intensidade: BRILHO_DA_TELA}}}
            />

            {/*
              O monitor da direita CICLA a cada clique: lofi → chuva →
              desligado → lofi. A chuva é desenhada quadro a quadro (ver
              use-textura-de-chuva.ts) e só roda quando está em cena.

              A área de clique é uma caixa invisível na frente da tela, e não o
              modelo: a tela é fina e fica atrás de uma moldura, então acertar
              a malha dela com o mouse seria mira de precisão.
            */}
            <group
                onPointerOver={(e) => {
                    if (isMobile) return;
                    e.stopPropagation();
                    setTelaHover(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                    if (isMobile) return;
                    e.stopPropagation();
                    setTelaHover(false);
                    document.body.style.cursor = 'auto';
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    setEstadoDaTela((atual) => {
                        const proximo = (atual + 1) % ESTADOS_DA_TELA.length;
                        // O estado de DESTINO, não o de origem: é o que a
                        // pessoa quis ver ao clicar.
                        trackRoomObjectClick('monitor', ESTADOS_DA_TELA[proximo].id);
                        return proximo;
                    });
                }}
            >
                <KenneyModel
                    url={MODELOS.monitor}
                    position={[centro[0] + 0.36, tampo, zDoFundo]}
                    rotation={[0, FRENTE_PARA_A_SALA - 0.16, 0]}
                    alturaAlvo={ALTURA_MONITOR}
                    cores={{metalDark: COR_METAL_ESCURO, ...(telaAtual ? {} : {metal: '#05070a'})}}
                    texturas={telaAtual ? {metal: telaAtual} : undefined}
                    emissivos={{
                        metal: {
                            cor: '#ffffff',
                            // Desligada não emite NADA: é o que diferencia
                            // "tela preta" de "tela mostrando preto".
                            intensidade: telaAtual ? BRILHO_DA_TELA : 0,
                        },
                    }}
                />
                <mesh position={[centro[0] + 0.36, tampo + ALTURA_MONITOR * 0.6, zDoFundo + 0.02]}>
                    <boxGeometry args={[0.56, ALTURA_MONITOR * 0.75, 0.12]}/>
                    <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
                </mesh>
                {telaHover && !isMobile && (
                    <Html
                        position={[centro[0] + 0.36, tampo + ALTURA_MONITOR + 0.06, zDoFundo]}
                        center
                        style={{pointerEvents: 'none'}}
                    >
                        <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                         text-[11px] font-semibold text-white shadow-lg">
                            {ESTADOS_DA_TELA[estadoDaTela].rotulo}
                        </span>
                    </Html>
                )}
            </group>
            {/* A luz das telas. Sem ela as duas brilhariam com a mesa e a parede
                atrás continuando marrons — mesmo motivo da pointLight da lava
                lamp. Fria e de alcance curto, para ler como monitor. */}
            <pointLight
                position={[centro[0], tampo + 0.35, zDoFundo + 0.3]}
                color={COR_TELA}
                intensity={LUZ_DAS_TELAS}
                distance={1.6}
                decay={2}
            />

            <KenneyModel
                url={MODELOS.teclado}
                position={[centro[0] - 0.06, tampo, zDoFundo + 0.42]}
                rotation={[0, FRENTE_PARA_A_SALA + 0.05, 0]}
                larguraAlvo={LARGURA_TECLADO}
                cores={{metalDark: COR_METAL_ESCURO, metalMedium: '#2a3033'}}
            />

            {/*
              Mouse e mousepad à direita do teclado — direita de quem SENTA,
              que olha para -z, e portanto +x na sala.

              Primitivas: o kit não tem mouse. Um mousepad é um retângulo fino
              por definição, e o mouse é uma esfera achatada e esticada.
            */}
            <group position={[centro[0] + 0.33, tampo, zDoFundo + 0.42]} rotation={[0, 0.05, 0]}>
                <mesh position={[0, 0.002, 0]} receiveShadow>
                    <boxGeometry args={[0.22, 0.004, 0.17]}/>
                    <meshStandardMaterial color="#23262a" roughness={0.9}/>
                </mesh>
                <mesh position={[0, 0.021, -0.01]} scale={[1, 0.55, 1.5]} castShadow>
                    <sphereGeometry args={[0.032, 12, 8]}/>
                    <meshStandardMaterial color={COR_METAL_ESCURO} roughness={0.4}/>
                </mesh>
            </group>

            {/*
              Porta-retratos, entre os monitores e a quina — o lugar em que ele
              fica virado para quem senta sem tapar tela nenhuma.

              A altura soma meia altura do retrato ao tampo porque o Quadro se
              posiciona pelo CENTRO, e não pela base como os modelos .glb.
            */}
            <Quadro
                position={[centro[0] + 0.72, tampo + ALTURA_RETRATO / 2, zDoFundo + 0.05]}
                imagem="/livros/porta-retrato.jpg"
                larguraM={ALTURA_RETRATO * (2 / 3)}
                alturaM={ALTURA_RETRATO}
                rotationY={-0.55}
                comPe
                onClick={onAbrirRetrato}
                rotulo="Ver de perto"
                isMobile={isMobile}
            />

            {/* Celular à esquerda do teclado, de bruços na madeira. */}
            <DeitadoNoTampo
                url={MODELOS.telefone}
                position={[centro[0] - 0.42, tampo, zDoFundo + 0.40]}
                comprimento={COMPRIMENTO_CELULAR_M}
                razaoEspessura={RAZAO_ESPESSURA_CELULAR}
                giro={-0.35}
            />

            {/* Headphone largado ao lado, mais para o fundo — deitado como o
                celular, e não de pé como um manequim de vitrine. */}
            <DeitadoNoTampo
                url={MODELOS.headphone}
                position={[centro[0] - 0.62, tampo, zDoFundo + 0.15]}
                comprimento={0.22}
                razaoEspessura={RAZAO_ESPESSURA_HEADPHONE}
                giro={0.5}
                cores={{blinn5SG: '#1b1f20', blinn1SG: COR_METAL}}
            />

            {/*
              O braço direito do L não é mais mesa de computador: é a bancada
              de estudo (bíblia aberta, anotações, canetas). Os dois usos
              dividem o mesmo móvel sem se atropelar porque cada um ficou num
              braço — telas no do fundo, papel no da direita.
            */}
            <ItensDeEstudo origem={[quina[0] - 0.38, tampo, quina[1] + 1.25]} isMobile={isMobile}/>

            {/*
              Dois kettlebells no chão, na ponta ESQUERDA da mesa — junto ao
              fim do braço do fundo, longe da cadeira e do gabinete (que ocupa
              o lado direito). Tamanhos diferentes e um deles girado: um par
              idêntico e alinhado leria como item de catálogo.
            */}
            {[
                {x: -0.76, z: 0.02, altura: 0.22, giro: 0.4},
                {x: -0.63, z: 0.16, altura: 0.17, giro: -0.9},
            ].map(({x, z, altura, giro}) => (
                <KenneyModel
                    key={altura}
                    url={MODELOS.kettlebell}
                    position={[centro[0] + x, 0, centro[2] + z]}
                    rotation={[0, giro, 0]}
                    alturaAlvo={altura}
                    cores={{phong1SG: '#2b3036'}}
                />
            ))}

            {/*
              Nas paredes: a prateleira acima das telas (parede de fundo) e as
              espadas na lateral. As duas alturas são folgadas de propósito —
              1,55m deixa 39cm livres sobre os monitores, e 1,72m põe as
              espadas acima da linha de quem estivesse sentado.
            */}
            <PrateleiraAerea
                position={[quina[0] - 0.9, 1.55, quina[1]]}
                larguraM={1.5}
                caixaDeSom={{
                    nivel: volume,
                    onCiclarVolume: () => setVolume((atual) => {
                        const proximo = (atual + 1) % NIVEIS_DE_VOLUME.length;
                        trackRoomObjectClick('caixa-de-som', NIVEIS_DE_VOLUME[proximo].id);
                        return proximo;
                    }),
                    tocando: estadoAtual !== 'desligada' && !radio.foraDoAr,
                    lerEspectro: radio.lerEspectro,
                    isMobile,
                }}
            />
            <StandDeEspadas position={[quina[0], 1.72, quina[1] + 1.5]}/>

            {/* Gabinete no chão, sob o braço lateral da mesa: uma caixa escura
                com uma fresta acesa resolve nesta distância. */}
            <group position={[quina[0] - 0.32, 0, quina[1] + 1.15]}>
                <mesh position={[0, 0.22, 0]} castShadow>
                    <boxGeometry args={[0.2, 0.44, 0.44]}/>
                    <meshStandardMaterial color="#23262a" roughness={0.5} metalness={0.3}/>
                </mesh>
                {/* Faixa de LED na face que olha para a sala (+z, o lado da
                    câmera): um plano sem rotação já nasce virado para lá. */}
                <mesh position={[0, 0.34, 0.221]}>
                    <planeGeometry args={[0.14, 0.012]}/>
                    <meshStandardMaterial color={COR_LED} emissive={COR_LED} emissiveIntensity={1.6}/>
                </mesh>
            </group>
        </group>
    );
}
