'use client';

import {useMemo, useRef, useState} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import type * as THREE from 'three';
import {NIVEIS_DE_VOLUME, BINS_DO_ESPECTRO} from '@/components/livros/decor/use-radio';

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
const COR_LED = '#8fd0f5';

/** Quanto o LED chega a brilhar no pico. Acima de ~0.6 de luminância ele cruza
 *  o `luminanceThreshold` do <Bloom> da cena e ganha halo — que é o que faz um
 *  ponto de 5mm ser notado do outro lado da sala. */
const BRILHO_MAXIMO = 2.6;
/** Piso com o som ligado: o LED nunca apaga de todo enquanto toca, senão uma
 *  passagem silenciosa da música leria como "desligou". */
const BRILHO_MINIMO = 0.35;

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
    const dados = useMemo(() => new Uint8Array(BINS_DO_ESPECTRO), []);
    /** O brilho perseguido quadro a quadro, e não atribuído direto: o espectro
     *  bruto salta demais entre quadros e o LED viraria estroboscópio. */
    const brilhoRef = useRef(0);

    useFrame((_, delta) => {
        const material = ledRef.current;
        if (!material) return;

        let alvo = 0;
        if (tocando) {
            // Só os graves: é onde está a batida, e é a batida que a pessoa
            // reconhece como "a música pulsando". Somando o espectro inteiro o
            // LED acompanharia o volume geral, que quase não varia.
            const GRAVES = 12;
            let soma = 0;
            if (lerEspectro(dados)) {
                for (let i = 0; i < GRAVES; i++) soma += dados[i];
                alvo = BRILHO_MINIMO + (soma / GRAVES / 255) * (BRILHO_MAXIMO - BRILHO_MINIMO);
            } else {
                // Sem espectro (o caminho sem CORS, ou a chuva antes do
                // primeiro quadro): aceso e parado ainda diz "tem som".
                alvo = BRILHO_MINIMO * 2;
            }
        }

        // Sobe rápido, desce devagar — é assim que um VU meter se comporta, e é
        // o que faz a batida "bater" em vez de tremer.
        const velocidade = alvo > brilhoRef.current ? 22 : 6;
        brilhoRef.current += (alvo - brilhoRef.current) * Math.min(1, delta * velocidade);
        material.emissiveIntensity = brilhoRef.current;
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

            {/* Woofer e tweeter. `circleGeometry` já nasce virado para +z, que
                é o lado da sala — nenhuma rotação necessária. */}
            {[
                {y: ALTURA * 0.32, raio: 0.028},
                {y: ALTURA * 0.68, raio: 0.013},
            ].map(({y, raio}) => (
                <group key={y} position={[0, y, frente + 0.001]}>
                    <mesh>
                        <circleGeometry args={[raio, 20]}/>
                        <meshStandardMaterial color={COR_CONE} roughness={0.95}/>
                    </mesh>
                    {/* Aro claro: dá a borda do alto-falante, que é o que faz o
                        círculo escuro parecer um cone e não um furo. */}
                    <mesh position={[0, 0, 0.0005]}>
                        <ringGeometry args={[raio, raio + 0.004, 20]}/>
                        <meshStandardMaterial color={COR_ARO} roughness={0.5} metalness={0.4}/>
                    </mesh>
                </group>
            ))}

            {/* O LED. */}
            <mesh position={[LARGURA * 0.32, ALTURA * 0.12, frente + 0.001]}>
                <circleGeometry args={[0.005, 12]}/>
                <meshStandardMaterial ref={ledRef} color={COR_LED} emissive={COR_LED} emissiveIntensity={0}/>
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
