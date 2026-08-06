'use client';

import {useMemo, useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Chuva animada para a tela do monitor, desenhada num `<canvas>` quadro a
 * quadro — não é um vídeo.
 *
 * O pedido original era um mp4 curto em loop. Um vídeo procedural resolve o
 * mesmo efeito e é melhor aqui por três motivos: não há arquivo para baixar
 * (um mp4 de 4s pesaria centenas de KB, mais que a sala 3D inteira), o loop
 * não tem emenda visível, e nada precisa ser regravado se um dia a cor ou a
 * densidade da chuva mudar — é meia dúzia de números.
 *
 * Só desenha quando `ativa`. Parada, a textura fica congelada no último
 * quadro e o `useFrame` sai na primeira linha, sem custo.
 */

const LARGURA = 512;
const ALTURA = 288;
const GOTAS = 150;
const COR_FUNDO = '#0b1218';
/** Velocidade em pixels por segundo — sempre multiplicada pelo delta do frame,
 *  para a chuva cair no mesmo ritmo em 60Hz e em 144Hz. */
const VELOCIDADE_MIN = 320;
const VELOCIDADE_MAX = 900;

type Gota = {x: number; y: number; comprimento: number; velocidade: number; alpha: number};

function novaGota(alturaInicial?: number): Gota {
    const profundidade = Math.random(); // 0 = longe (fina e lenta), 1 = perto
    return {
        x: Math.random() * LARGURA,
        y: alturaInicial ?? -Math.random() * ALTURA,
        comprimento: 8 + profundidade * 26,
        velocidade: VELOCIDADE_MIN + profundidade * (VELOCIDADE_MAX - VELOCIDADE_MIN),
        alpha: 0.15 + profundidade * 0.45,
    };
}

export function useTexturaDeChuva(ativa: boolean) {
    const {textura, ctx, gotas} = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = LARGURA;
        canvas.height = ALTURA;
        const contexto = canvas.getContext('2d')!;
        contexto.fillStyle = COR_FUNDO;
        contexto.fillRect(0, 0, LARGURA, ALTURA);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return {
            textura: tex,
            ctx: contexto,
            gotas: Array.from({length: GOTAS}, () => novaGota(Math.random() * ALTURA)),
        };
    }, []);

    // Texturas criadas em código não são descartadas pelo R3F ao desmontar —
    // mesmo cuidado das geometrias em Book.tsx.
    useEffect(() => () => textura.dispose(), [textura]);

    useFrame((_, delta) => {
        if (!ativa) return;

        // Fundo semitransparente em vez de opaco: o quadro anterior fica um
        // pouco por baixo, o que dá o rastro de gota caindo sem precisar
        // desenhar borrão nenhum.
        ctx.fillStyle = 'rgba(11, 18, 24, 0.35)';
        ctx.fillRect(0, 0, LARGURA, ALTURA);
        ctx.lineWidth = 1.6;

        for (const gota of gotas) {
            ctx.strokeStyle = `rgba(174, 208, 235, ${gota.alpha})`;
            ctx.beginPath();
            ctx.moveTo(gota.x, gota.y);
            ctx.lineTo(gota.x, gota.y + gota.comprimento);
            ctx.stroke();

            gota.y += gota.velocidade * delta;
            if (gota.y > ALTURA) Object.assign(gota, novaGota(-gota.comprimento));
        }

        textura.needsUpdate = true;
    });

    return textura;
}
