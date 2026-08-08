'use client';

import {useEffect, useRef, useState} from 'react';
import {Html} from '@react-three/drei';
import type * as THREE from 'three';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import DeitadoNoTampo from '@/components/livros/decor/DeitadoNoTampo';
import {useLuzSuave} from '@/components/livros/decor/use-luz-suave';
import {ALVO_DO_FEIXE, FEIXE, paraLocal, giroParaMirar} from '@/lib/lanterna.mjs';

/**
 * Amarelo deliberadamente abafado, não o saturado de tinta que aparece na foto:
 * a sala é iluminada como fim de tarde e passa por um <Bloom>, então um amarelo
 * puro estouraria em halo. Este tom lê como a mesma estante sob luz de abajur.
 */
const SHELF_COLOR = '#d9a441';

/** Estante de pé, não de mesa — mas sem disputar altura com a do acervo: o papel
 *  dela é ser detalhe de borda. */
const ALTURA = 1.45;

/**
 * Onde o móvel está na sala, e qual a altura dele.
 *
 * Exportados pelo mesmo motivo de `ESTANTE_ANCHOR` em EstanteDoAcervo.tsx: a
 * cena "Estante" do trilho precisa enquadrá-lo, e o CameraRig calcular isso a
 * partir de números copiados à mão daria uma câmera apontada para o lugar
 * errado no dia em que a estante mudar de parede.
 *
 * `rotationY` é quase π/2 (encarando o centro da sala), mas não exatamente —
 * ver o comentário em Room.tsx. É essa diferença que o viewpoint usa para pôr
 * a câmera na frente do móvel, e não na frente da parede.
 */
export const ESTANTE_AMARELA_ANCHOR = {
    // O Z já foi -0.45, e a estante ficava atrás da poltrona (que está em
    // z=-0.55) quando vista pela cena "Estante": a linha entre a câmera e o
    // móvel atravessava o encosto. Trazida para o meio da parede, a poltrona
    // sai da frente sem que nenhuma das duas precise mudar de lugar na sala.
    // O escudo escoteiro acompanhou o mesmo deslocamento, em Room.tsx.
    position: [-2.35, 0, 0] as [number, number, number],
    rotationY: Math.PI / 2 - 0.12,
};
export const ESTANTE_AMARELA_ALTURA_M = ALTURA;

/**
 * Altura do TOPO de cada prateleira, medida no .glb e já escalada para os 1,45m
 * do móvel — é sobre elas que os trecos assentam. Chutar esses números põe as
 * peças flutuando no vão, que foi o que aconteceu com os enfeites anteriores.
 */
const PRATELEIRAS = [0.214, 0.610, 1.005, 1.401];
/** Espessura sobre comprimento da mochila, medida no .glb: 1,746 de 3,119. */
const RAZAO_ESPESSURA_MOCHILA = 0.56;
/** Meia largura útil entre as laterais — o móvel tem 0,66m de fora a fora. */
const MEIA_LARGURA = 0.28;

/** Comprimento da lanterna, e onde ela pousa na prateleira do meio. */
const LANTERNA_COMPRIMENTO_M = 0.2;
const LANTERNA_LOCAL: [number, number, number] = [0.13, PRATELEIRAS[1], 0.02];
/**
 * Quanto a fonte de luz adianta em relação ao centro da peça: um pouco além da
 * lente, senão o cone nasce dentro do próprio corpo da lanterna e o primeiro
 * palmo do facho fica comido pela malha dela.
 */
const LANTERNA_SAIDA_M = LANTERNA_COMPRIMENTO_M / 2 + 0.01;
/**
 * Os dois materiais transparentes do `.glb` são a lente — os únicos que devem
 * acender. O terceiro (`0.ReflectiveMaterial`) é o corpo de metal, e acendê-lo
 * faria a lanterna inteira virar uma barra de luz.
 */
const LENTES = ['1.ReflectiveTransparentMaterial', '2.ReflectiveTransparentMaterial'];
const LENTE_ACESA = {cor: '#fff3d6', intensidade: 1.4};

/**
 * Estante amarela aberta — o acento de cor do escritório real, e a única peça de
 * mobília da sala que não é marrom/madeira. Vive na parede lateral esquerda (ver
 * o porquê em Room.tsx), de lado para a câmera.
 *
 * Guarda trecos de sobrevivência e acampamento, escolhidos um a um pelo dono do
 * acervo: corda e primeiros socorros embaixo, lampião e lanterna no meio, rádio
 * e isqueiro em cima, mochila no topo e saco de dormir no chão ao lado. Vários
 * são CC BY e exigem crédito — ver LICENSE.md.
 *
 * Não confundir com a estante do acervo (Bookshelf.tsx): esta é cenário puro,
 * sem livro nenhum do banco dentro nem nada clicável.
 */
export default function YellowShelf({position, rotationY = 0, lanternaAcesa = false, onAlternarLanterna, isMobile = false}: {
    position: [number, number, number];
    rotationY?: number;
    lanternaAcesa?: boolean;
    /** Ausente = a lanterna vira cenário: sem etiqueta e sem clique. */
    onAlternarLanterna?: () => void;
    isMobile?: boolean;
}) {
    const [hover, setHover] = useState(false);
    const feixe = useRef<THREE.SpotLight>(null);
    const alvoDoFeixe = useRef<THREE.Object3D>(null);
    const interativo = Boolean(onAlternarLanterna);

    /**
     * A mira sai de ONDE O FACHO DEVE CAIR, não de um ângulo escolhido a olho —
     * ver o cabeçalho de lib/lanterna.mjs. O alvo é um ponto da parede do fundo,
     * em coordenadas do mundo; aqui ele é trazido para o espaço da estante,
     * porque é dentro dele que a lanterna e a luz vivem.
     *
     * Consequência que é o ponto todo: mover a estante de parede re-mira o facho
     * sozinho, em vez de mandá-lo para a quina sem ninguém perceber.
     */
    const alvoLocal = paraLocal(ALVO_DO_FEIXE, position, rotationY);
    const giroDaLanterna = giroParaMirar(LANTERNA_LOCAL, alvoLocal);
    const posicaoDaLuz: [number, number, number] = [
        LANTERNA_LOCAL[0] + Math.sin(giroDaLanterna) * LANTERNA_SAIDA_M,
        LANTERNA_LOCAL[1] + 0.02,
        LANTERNA_LOCAL[2] + Math.cos(giroDaLanterna) * LANTERNA_SAIDA_M,
    ];

    // O `target` de uma spotLight é um Object3D, e o padrão do three nasce solto
    // na origem, FORA da cena — uma luz apontada para lá ilumina o pé da estante
    // em vez da parede. Casar com um objeto que está na cena é o que faz a mira
    // valer, e como os dois vivem no mesmo grupo, o alvo já vem no espaço certo.
    useEffect(() => {
        if (feixe.current && alvoDoFeixe.current) feixe.current.target = alvoDoFeixe.current;
    }, []);

    useLuzSuave(feixe, lanternaAcesa ? FEIXE.intensidade : 0);

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* O modelo tem um material só (`wood`) — recolorir é uma linha */}
            <KenneyModel url={MODELOS.estanteAmarela} alturaAlvo={ALTURA} cores={{wood: SHELF_COLOR}}/>

            {/* PRATELEIRA DE BAIXO — o que se pega com mais frequência. */}
            <KenneyModel
                url={MODELOS.kitPrimeirosSocorros}
                position={[-0.16, PRATELEIRAS[0], 0]}
                rotation={[0, 0.15, 0]}
                alturaAlvo={0.17}
                cores={{Red: '#b53b3b', White: '#e8e2d5'}}
            />
            {/* Rolo de corda deitado: a maior dimensão dele é a largura, então
                é por ela que se pede o tamanho, não pela altura. */}
            <KenneyModel
                url={MODELOS.corda}
                position={[0.13, PRATELEIRAS[0], 0.01]}
                rotation={[0, -0.3, 0]}
                larguraAlvo={0.22}
                cores={{Rope: '#b09a6a'}}
            />

            {/* PRATELEIRA DO MEIO — a luz. */}
            <KenneyModel
                url={MODELOS.lampiao}
                position={[-0.15, PRATELEIRAS[1], 0]}
                rotation={[0, 0.4, 0]}
                alturaAlvo={0.24}
            />
            {/*
              Lanterna deitada, e o terceiro interruptor da sala. O modelo é um
              tubo cujo comprimento corre em Z, com a lente na ponta +Z — medido
              no `.glb`: aquela ponta tem raio 0,104 e guarda os dois materiais
              transparentes, contra 0,068 da ponta fina.

              **O giro não é mais decorativo.** Ele é derivado do alvo do facho
              (ver acima), o que trocou o `π/2 + 0.25` escrito à mão por uma
              conta — e de passagem corrigiu a mira: com o ângulo antigo o facho
              batia a 9cm da quina, e metade da poça dobrava no canto.
            */}
            <group
                onPointerOver={(e) => {
                    if (isMobile || !interativo) return;
                    e.stopPropagation();
                    setHover(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                    if (isMobile || !interativo) return;
                    e.stopPropagation();
                    setHover(false);
                    document.body.style.cursor = 'auto';
                }}
                onClick={(e) => {
                    if (!interativo) return;
                    e.stopPropagation();
                    onAlternarLanterna?.();
                }}
            >
                <KenneyModel
                    url={MODELOS.lanterna}
                    position={LANTERNA_LOCAL}
                    rotation={[0, giroDaLanterna, 0]}
                    larguraAlvo={LANTERNA_COMPRIMENTO_M}
                    emissivos={lanternaAcesa
                        ? Object.fromEntries(LENTES.map((nome) => [nome, LENTE_ACESA]))
                        : undefined}
                />
                {/* Caixa de clique: a lanterna tem 20cm e fica numa prateleira
                    vista de longe, então acertar o tubo com o mouse seria mira
                    de precisão — mesma solução da tela do monitor. */}
                <mesh position={[LANTERNA_LOCAL[0], LANTERNA_LOCAL[1] + 0.04, LANTERNA_LOCAL[2]]}>
                    <boxGeometry args={[0.26, 0.12, 0.14]}/>
                    <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
                </mesh>
                {hover && !isMobile && (
                    <Html
                        position={[LANTERNA_LOCAL[0], LANTERNA_LOCAL[1] + 0.14, LANTERNA_LOCAL[2]]}
                        center
                        style={{pointerEvents: 'none'}}
                    >
                        <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                         text-[11px] font-semibold text-white shadow-lg">
                            {lanternaAcesa ? 'Apagar a lanterna' : 'Acender a lanterna'}
                        </span>
                    </Html>
                )}
            </group>

            {/*
              O facho. Nasce na ponta da lente e mira o objeto invisível logo
              abaixo, que está sobre a parede do fundo — as duas posições saem da
              mesma conta, então não há como a luz e a peça discordarem de para
              onde a lanterna aponta.

              `penumbra` alta é o que separa lanterna de holofote de teatro: sem
              ela a poça sai com a borda dura de um cone matemático.
            */}
            <spotLight
                ref={feixe}
                position={posicaoDaLuz}
                color="#ffeec9"
                /* Zero fixo, e não `lanternaAcesa ? … : 0`: daqui para a frente
                   quem manda na intensidade é o useLuzSuave, e um valor que
                   MUDA entre renders seria reaplicado pelo R3F a cada toggle,
                   atropelando a suavização com um corte seco. A sala abre com a
                   lanterna apagada, então zero é o estado inicial correto. */
                intensity={0}
                angle={FEIXE.abertura}
                penumbra={FEIXE.penumbra}
                distance={FEIXE.alcance}
                decay={2}
            />
            <object3D ref={alvoDoFeixe} position={alvoLocal as [number, number, number]}/>

            {/* PRATELEIRA DE CIMA — o que é pequeno e some se ficar embaixo.
                O rádio substituiu um walkie-talkie que sozinho tinha 2,4MB e
                111 mil vértices, quase dois terços do peso de todos os modelos
                da sala. Este tem 48KB e é do mesmo Furniture Kit da mobília,
                então recolore por nome de material como o resto. */}
            <KenneyModel
                url={MODELOS.radio}
                position={[-0.13, PRATELEIRAS[2], 0]}
                rotation={[0, 0.2, 0]}
                larguraAlvo={0.20}
                cores={{wood: '#4a3323', metal: '#59626b', metalMedium: '#2b3036'}}
            />
            <KenneyModel
                url={MODELOS.isqueiro}
                position={[0.13, PRATELEIRAS[2], 0.01]}
                rotation={[0, -0.5, 0]}
                alturaAlvo={0.075}
            />

            {/* Mochila deitada na quarta prateleira. Deitada e não em pé: uma
                mochila em pé numa prateleira lê como manequim de vitrine. */}
            <DeitadoNoTampo
                url={MODELOS.mochila}
                position={[-0.02, PRATELEIRAS[3], -0.02]}
                comprimento={0.34}
                razaoEspessura={RAZAO_ESPESSURA_MOCHILA}
                giro={0.25}
            />

            {/*
              Saco de dormir no CHÃO, encostado na lateral: ele tem 55cm enrolado
              e ocuparia um vão inteiro sozinho.

              Posicionado no espaço local da estante, e não no da sala, de
              propósito: assim acompanha o móvel se ele girar ou mudar de parede,
              em vez de ficar para trás no meio do cômodo.
            */}
            <KenneyModel
                url={MODELOS.sacoDeDormir}
                position={[-MEIA_LARGURA - 0.16, 0, 0.04]}
                rotation={[0, 0.12, 0]}
                larguraAlvo={0.55}
            />
        </group>
    );
}
