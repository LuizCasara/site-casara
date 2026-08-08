'use client';

import {useState} from 'react';
import {Html, useTexture} from '@react-three/drei';

/**
 * Quadro emoldurado, para pendurar na parede ou apoiar sobre um móvel.
 *
 * Uma moldura é um retângulo de madeira com uma imagem à frente — geometria
 * demais para valer um .glb, e nenhum modelo pronto teria a proporção da foto
 * que vai dentro. A imagem entra como textura, e o `pé` opcional transforma o
 * mesmo componente num porta-retratos de mesa.
 */

const COR_MOLDURA = '#43301f';
const PROFUNDIDADE_M = 0.03;
/** Quanto de madeira aparece em volta da imagem, de cada lado. */
const BORDA_M = 0.025;

type QuadroProps = {
    /** Centro do quadro. Numa parede, é a própria parede: o componente afasta. */
    position: [number, number, number];
    /** Caminho da imagem em `public/`. */
    imagem: string;
    larguraM: number;
    alturaM: number;
    /**
     * Parede em que ele está pendurado, se estiver: -1 para a da direita (cuja
     * normal aponta para -x), +1 para a da esquerda. Sem isso, o quadro fica
     * de frente para a câmera, que é o caso de quem está sobre um móvel na
     * parede do fundo.
     */
    parede?: -1 | 1;
    /** Giro em torno do eixo vertical, para quadros que não estão de frente. */
    rotationY?: number;
    /** Pé de porta-retratos: uma haste inclinada atrás, para ele parar em pé. */
    comPe?: boolean;
    /** Madeira por padrão; um quadro branco pede alumínio. */
    corMoldura?: string;
    /** Bandeja de canetão sob a moldura — é o que faz um retângulo branco na
     *  parede ler como quadro em vez de folha gigante. */
    comBandeja?: boolean;
    /** Quando presente, o quadro vira clicável e ganha etiqueta no hover. */
    onClick?: () => void;
    rotulo?: string;
    isMobile?: boolean;
};

export default function Quadro({
    position, imagem, larguraM, alturaM, parede, rotationY = 0, comPe = false,
    corMoldura = COR_MOLDURA, comBandeja = false, onClick, rotulo, isMobile = false,
}: QuadroProps) {
    const textura = useTexture(imagem);
    const [hovered, setHovered] = useState(false);
    const clicavel = onClick !== undefined;
    // Numa parede lateral o quadro gira um quarto de volta e se afasta do
    // reboco; sem parede, ele só recebe o giro que quem monta pediu.
    const giro = parede ? (parede * Math.PI) / 2 : rotationY;
    const deslocado: [number, number, number] = parede
        ? [position[0] + parede * PROFUNDIDADE_M, position[1], position[2]]
        : position;

    return (
        <group
            position={deslocado}
            rotation={[0, giro, 0]}
            onPointerOver={clicavel ? (e) => {
                if (isMobile) return;
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            } : undefined}
            onPointerOut={clicavel ? (e) => {
                if (isMobile) return;
                e.stopPropagation();
                setHovered(false);
                document.body.style.cursor = 'auto';
            } : undefined}
            onClick={clicavel ? (e) => {
                e.stopPropagation();
                onClick();
            } : undefined}
        >
            <mesh castShadow>
                <boxGeometry args={[larguraM, alturaM, PROFUNDIDADE_M]}/>
                <meshStandardMaterial
                    color={corMoldura}
                    roughness={0.75}
                    // Realce de hover pelo emissivo, e não trocando a cor: a
                    // moldura pode ser escura (madeira) ou clara (alumínio), e
                    // uma cor fixa de destaque some numa das duas.
                    emissive="#ffffff"
                    emissiveIntensity={hovered && !isMobile ? 0.18 : 0}
                />
            </mesh>
            {comBandeja && (
                // Calha rasa logo abaixo da moldura, adiantada em relação a
                // ela — é onde o canetão fica.
                <mesh position={[0, -alturaM / 2 - 0.015, PROFUNDIDADE_M / 2]} castShadow>
                    <boxGeometry args={[larguraM * 0.5, 0.018, 0.05]}/>
                    <meshStandardMaterial color={corMoldura} roughness={0.6} metalness={0.4}/>
                </mesh>
            )}
            {/* A imagem, um fio à frente da madeira para não disputar pixel
                com ela (z-fighting). */}
            <mesh position={[0, 0, PROFUNDIDADE_M / 2 + 0.002]}>
                <planeGeometry args={[larguraM - BORDA_M * 2, alturaM - BORDA_M * 2]}/>
                <meshStandardMaterial map={textura} roughness={0.85}/>
            </mesh>
            {rotulo && hovered && !isMobile && (
                <Html position={[0, alturaM / 2 + 0.05, 0.02]} center style={{pointerEvents: 'none'}}>
                    <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                     text-[11px] font-semibold text-white shadow-lg">
                        {rotulo}
                    </span>
                </Html>
            )}
            {comPe && (
                // Haste atrás, inclinada — é o que faz um porta-retratos ficar
                // de pé em vez de parecer flutuando sobre a mesa.
                <mesh position={[0, -alturaM * 0.18, -PROFUNDIDADE_M / 2 - 0.03]} rotation={[0.35, 0, 0]}>
                    <boxGeometry args={[0.03, alturaM * 0.6, 0.008]}/>
                    <meshStandardMaterial color={COR_MOLDURA} roughness={0.8}/>
                </mesh>
            )}
        </group>
    );
}
