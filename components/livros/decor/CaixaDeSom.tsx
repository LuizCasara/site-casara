'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import type * as THREE from 'three';
import {
    NIVEIS_DE_VOLUME, BINS_DO_ESPECTRO, GRAVE_PRIMEIRO_BIN, GRAVE_ULTIMO_BIN,
} from '@/components/livros/decor/use-radio';

/**
 * A caixa de som da prateleira aérea: controle de volume da sala e, sobretudo,
 * o sinal de que a sala TEM som.
 *
 * **O LED é a razão principal de ela existir.** O controle do que toca está no
 * monitor, mas um monitor mostrando um player não avisa que há áudio saindo do
 * computador de alguém — quem chega na sala com o som desligado não tem por que
 * imaginar que ele existe. Uma caixinha com o LED pulsando no ritmo da música
 * resolve isso sem nenhum texto na tela.
 *
 * **Clique cicla o volume; não há mute.** Mutar já é desligar a tela, e dois
 * caminhos para o mesmo silêncio seriam dois modelos mentais disputando o mesmo
 * resultado. E são três níveis discretos em vez de um slider porque arrastar
 * dentro da cena disputa o gesto com o OrbitControls, num alvo de 10cm no fundo
 * da prateleira — clique não tem esse problema, e funciona igual no celular,
 * que não tem hover.
 *
 * Primitivas, e não um `.glb`: o Furniture Kit não tem caixa de som, e nesta
 * escala uma caixa é um paralelepípedo com dois círculos na frente. Mesma
 * decisão dos troféus ao lado e do gabinete embaixo da mesa.
 */

const LARGURA = 0.10;
const ALTURA = 0.155;
const PROFUNDIDADE = 0.09;

const COR_CORPO = '#1d2126';
const COR_FRENTE = '#15181c';
const COR_CONE = '#0c0e11';
const COR_ARO = '#333b44';

/**
 * O LED conta DUAS coisas ao mesmo tempo: a cor diz em que volume está, e o
 * brilho pulsa na batida.
 *
 * Vermelho parado é standby, como em qualquer aparelho de som de verdade — e é
 * o que garante que a caixa se apresente mesmo com tudo desligado, que é
 * justamente quando ninguém teria motivo para imaginar que a sala tem áudio.
 * Ligada, vai do verde apagado ao verde vivo.
 *
 * Os brilhos são altos de propósito nos níveis de cima: acima de ~0.6 de
 * luminância o ponto cruza o `luminanceThreshold` do <Bloom> da cena e ganha
 * halo, que é o que faz um LED de 5mm ser notado do outro lado da sala.
 *
 * `minimo` é o piso com som tocando — o LED nunca apaga de todo enquanto há
 * música, senão uma passagem silenciosa leria como "desligou".
 */
const LED_STANDBY = {cor: '#e5484d', minimo: 0.22, maximo: 0.22};
const LED_POR_NIVEL = [
    {cor: '#2f8f52', minimo: 0.18, maximo: 1.0},
    {cor: '#2fd36f', minimo: 0.32, maximo: 2.1},
    {cor: '#63ffa6', minimo: 0.5, maximo: 3.4},
] as const;

/**
 * Excursão máxima do cone, em metros.
 *
 * 10mm num alto-falante de 10cm é exagero — um woofer de verdade nesta escala
 * mal passaria de 2mm. É deliberado: a caixa é vista de quase dois metros e
 * ocupa uns poucos por cento da tela, e um deslocamento fisicamente correto
 * seria matematicamente presente e visualmente inexistente. A esta distância,
 * 10mm rendem uns 5 pixels de vaivém — pouco, mas perceptível.
 */
const EXCURSAO_M = 0.010;

export type CaixaDeSomProps = {
    /** Ponto do chão da prateleira sob o centro da caixa — mesmo contrato de
     *  posicionamento do KenneyModel, para não haver duas convenções na mesma
     *  prateleira. */
    position: [number, number, number];
    rotationY?: number;
    /** Índice em NIVEIS_DE_VOLUME. */
    nivel: number;
    onCiclarVolume: () => void;
    /** Há som saindo agora? Desligado, o LED apaga. */
    tocando: boolean;
    lerEspectro: (alvo: Uint8Array) => boolean;
    isMobile?: boolean;
};

export default function CaixaDeSom({
    position, rotationY = 0, nivel, onCiclarVolume, tocando, lerEspectro, isMobile = false,
}: CaixaDeSomProps) {
    const [hover, setHover] = useState(false);
    const ledRef = useRef<THREE.MeshStandardMaterial>(null);
    const coneRef = useRef<THREE.Group>(null);
    const dados = useMemo(() => new Uint8Array(BINS_DO_ESPECTRO), []);
    /** O brilho perseguido quadro a quadro, e não atribuído direto: o espectro
     *  bruto salta demais entre quadros e o LED viraria estroboscópio. */
    const brilhoRef = useRef(0);
    /** Teto e piso do auto-ajuste de faixa — ver o useFrame. */
    const tetoRef = useRef(0);
    const pisoRef = useRef(1);

    const led = tocando ? (LED_POR_NIVEL[nivel] ?? LED_POR_NIVEL[1]) : LED_STANDBY;

    // A COR muda por estado, não por quadro: ela codifica o volume, que só
    // muda no clique. Só o brilho é animado.
    useEffect(() => {
        const material = ledRef.current;
        if (!material) return;
        material.color.set(led.cor);
        material.emissive.set(led.cor);
    }, [led.cor]);

    useFrame((_, delta) => {
        const material = ledRef.current;
        if (!material) return;

        // Só os graves: é onde está a batida, e é a batida que a pessoa
        // reconhece como "a música pulsando". Somando o espectro inteiro, o
        // LED acompanharia o volume geral, que quase não varia.
        let intensidadeDoGrave = 0;
        let temSinal = false;
        if (tocando && lerEspectro(dados)) {
            let soma = 0;
            for (let i = GRAVE_PRIMEIRO_BIN; i <= GRAVE_ULTIMO_BIN; i++) soma += dados[i];
            const media = soma / (GRAVE_ULTIMO_BIN - GRAVE_PRIMEIRO_BIN + 1) / 255;

            // AUTO-AJUSTE DE FAIXA. Sem isto, uma faixa comprimida (e a chuva,
            // que é ruído quase constante) manteria a média parada num valor
            // qualquer e o LED voltaria a não pulsar, mesmo com a resolução
            // certa. Piso e teto perseguem o sinal devagar, então a diferença
            // entre o mais alto e o mais baixo dos últimos segundos é sempre
            // remapeada para 0..1 — seja ela grande ou pequena.
            //
            // Expandem na hora e encolhem devagar: reagir de imediato aos dois
            // lados faria a faixa colapsar em cima do sinal atual e zerar a
            // dinâmica de novo.
            const RECUO_POR_S = 0.14;
            tetoRef.current = Math.max(media, tetoRef.current - delta * RECUO_POR_S);
            pisoRef.current = Math.min(media, pisoRef.current + delta * RECUO_POR_S);
            // Piso de amplitude: sem ele, silêncio absoluto viraria uma divisão
            // por quase zero e o LED tremeria com ruído numérico.
            const amplitude = Math.max(0.06, tetoRef.current - pisoRef.current);
            intensidadeDoGrave = Math.min(1, Math.max(0, (media - pisoRef.current) / amplitude));
            temSinal = true;
        } else if (tocando) {
            // Sem espectro (o caminho sem CORS): aceso e parado ainda diz
            // "tem som".
            intensidadeDoGrave = 0.3;
        }

        const alvo = led.minimo + intensidadeDoGrave * (led.maximo - led.minimo);
        // Sobe rápido, desce devagar — é assim que um VU meter se comporta, e é
        // o que faz a batida "bater" em vez de tremer.
        const velocidade = alvo > brilhoRef.current ? 22 : 6;
        brilhoRef.current += (alvo - brilhoRef.current) * Math.min(1, delta * velocidade);
        material.emissiveIntensity = brilhoRef.current;

        // O cone acompanha a mesma batida. Sem sinal ele volta ao repouso em
        // vez de congelar meio empurrado, que leria como peça quebrada.
        if (coneRef.current) {
            const excursaoAlvo = temSinal ? intensidadeDoGrave * EXCURSAO_M : 0;
            const z = coneRef.current.position.z;
            coneRef.current.position.z += (excursaoAlvo - z) * Math.min(1, delta * velocidade);
        }
    });

    const frente = PROFUNDIDADE / 2 + 0.001;

    return (
        <group
            position={position}
            rotation={[0, rotationY, 0]}
            onPointerOver={(e) => {
                if (isMobile) return;
                e.stopPropagation();
                setHover(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                if (isMobile) return;
                e.stopPropagation();
                setHover(false);
                document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
                e.stopPropagation();
                onCiclarVolume();
            }}
        >
            {/* Corpo */}
            <mesh position={[0, ALTURA / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[LARGURA, ALTURA, PROFUNDIDADE]}/>
                <meshStandardMaterial color={COR_CORPO} roughness={0.65}/>
            </mesh>

            {/* Painel frontal, um tom mais escuro: sem ele a caixa é um bloco
                liso e não se lê de que lado ela toca. */}
            <mesh position={[0, ALTURA / 2, frente]}>
                <planeGeometry args={[LARGURA * 0.88, ALTURA * 0.9]}/>
                <meshStandardMaterial color={COR_FRENTE} roughness={0.9}/>
            </mesh>

            {/*
              Woofer e tweeter. `circleGeometry` já nasce virado para +z, que é
              o lado da sala — nenhuma rotação necessária.

              O woofer tem um grupo A MAIS por dentro, e é ele que se move: o
              de fora carrega a posição na caixa, o de dentro nasce em zero e
              só recebe a excursão. Animar o de fora sobrescreveria a posição
              e jogaria o cone para dentro do gabinete.

              O ARO fica de fora do grupo que se move: num alto-falante de
              verdade a borda é presa ao gabinete e só a membrana anda. Movendo
              os dois juntos, a peça inteira pareceria solta.
            */}
            <group position={[0, ALTURA * 0.32, frente + 0.001]}>
                <mesh position={[0, 0, 0.0005]}>
                    <ringGeometry args={[0.028, 0.032, 20]}/>
                    <meshStandardMaterial color={COR_ARO} roughness={0.5} metalness={0.4}/>
                </mesh>
                <group ref={coneRef}>
                    <mesh>
                        <circleGeometry args={[0.028, 20]}/>
                        <meshStandardMaterial color={COR_CONE} roughness={0.95}/>
                    </mesh>
                    {/* Calota central, um tom acima: sem ela o cone é um disco
                        chapado e o movimento não tem em que ser lido. */}
                    <mesh position={[0, 0, 0.001]}>
                        <circleGeometry args={[0.009, 14]}/>
                        <meshStandardMaterial color="#20262d" roughness={0.4} metalness={0.5}/>
                    </mesh>
                </group>
            </group>

            <group position={[0, ALTURA * 0.68, frente + 0.001]}>
                <mesh>
                    <circleGeometry args={[0.013, 16]}/>
                    <meshStandardMaterial color={COR_CONE} roughness={0.95}/>
                </mesh>
                <mesh position={[0, 0, 0.0005]}>
                    <ringGeometry args={[0.013, 0.017, 16]}/>
                    <meshStandardMaterial color={COR_ARO} roughness={0.5} metalness={0.4}/>
                </mesh>
            </group>

            {/* O LED. Cor e brilho são escritos pelo useFrame/useEffect acima;
                os valores aqui só existem para o primeiro quadro. */}
            <mesh position={[LARGURA * 0.32, ALTURA * 0.12, frente + 0.001]}>
                <circleGeometry args={[0.005, 12]}/>
                <meshStandardMaterial
                    ref={ledRef}
                    color={LED_STANDBY.cor}
                    emissive={LED_STANDBY.cor}
                    emissiveIntensity={LED_STANDBY.minimo}
                />
            </mesh>

            {/*
              Alvo de clique com folga, e não a malha da caixa: ela tem 10cm e
              fica no fundo da prateleira, então acertar o corpo dela com o mouse
              seria mira de precisão. Mesma solução da tela do monitor.
            */}
            <mesh position={[0, ALTURA / 2, PROFUNDIDADE * 0.3]}>
                <boxGeometry args={[LARGURA * 2.1, ALTURA * 1.35, PROFUNDIDADE * 1.9]}/>
                <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
            </mesh>

            {hover && !isMobile && (
                <Html position={[0, ALTURA + 0.05, 0]} center style={{pointerEvents: 'none'}}>
                    <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                     text-[11px] font-semibold text-white shadow-lg">
                        {(NIVEIS_DE_VOLUME[nivel] ?? NIVEIS_DE_VOLUME[1]).rotulo}
                    </span>
                </Html>
            )}
        </group>
    );
}
