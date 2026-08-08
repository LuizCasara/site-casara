'use client';

import {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {
    RELOGIO_DISPLAY, RELOGIO_NATIVO, SEGMENTOS_POR_DIGITO,
    digitosDoHorario, pontosAcesos, msAteOProximoQuadro,
} from '@/lib/relogio-model.mjs';

/**
 * O display do relógio da prateleira, desenhado num `<canvas>` — a hora do
 * relógio de quem está vendo, atualizada de verdade.
 *
 * **Não usa `useFrame`**, ao contrário das outras duas telas da sala. A chuva e
 * o player mudam a cada quadro e por isso pertencem ao laço de render; um
 * relógio muda duas vezes por segundo (o pisca dos pontos) e uma vez por minuto
 * (os algarismos). Pendurá-lo no `useFrame` seria pedir 60 verificações por
 * segundo para descartar 59 — e ainda daria um pisca fora de compasso, porque o
 * intervalo entre quadros não é constante. Um `setTimeout` mirando a próxima
 * borda de meio segundo faz o mesmo trabalho e chega na hora certa.
 *
 * Os algarismos são sete segmentos desenhados à mão, não texto com fonte. Dois
 * motivos: é o que um relógio digital de cabeceira de fato tem, e evita a
 * corrida com o carregamento da fonte — um `fillText` em Quicksand antes de a
 * fonte chegar desenharia a hora na fonte de sistema e nunca mais redesenharia,
 * porque nada nesta tela força um quadro novo.
 */

const LARGURA = 320;
/**
 * Sai da proporção real do vão medido no `.glb`, e não de um número escolhido:
 * um canvas com outra proporção seria esticado pela textura e os algarismos
 * chegariam gordos ou espremidos na prateleira.
 */
const ALTURA = Math.round(
    LARGURA
    * (RELOGIO_DISPLAY.altura * RELOGIO_NATIVO.altura)
    / (RELOGIO_DISPLAY.largura * RELOGIO_NATIVO.largura),
);

const COR_FUNDO = '#050a10';
/** O mesmo azul dos LEDs da sala (COR_LED do canto de trabalho). */
const COR_ACESA = '#4da3ff';
/**
 * O segmento apagado não é invisível: um display de verdade mostra o desenho
 * inteiro do "8" de fundo, e é isso que faz o objeto ler como display em vez de
 * quatro números pairando num retângulo preto.
 */
const COR_APAGADA = 'rgba(77, 163, 255, 0.07)';

/** Proporções da célula de um algarismo, todas derivadas da altura do vão. */
const ALTURA_DIGITO = ALTURA * 0.7;
const LARGURA_DIGITO = ALTURA_DIGITO * 0.52;
const ESPESSURA = ALTURA_DIGITO * 0.15;
/** Respiro entre os dois algarismos de um par, e de cada par para os pontos. */
const VAO_INTERNO = LARGURA_DIGITO * 0.18;
const VAO_DOS_PONTOS = LARGURA_DIGITO * 0.22;
const LARGURA_PONTOS = LARGURA_DIGITO * 0.25;

const LARGURA_TOTAL =
    4 * LARGURA_DIGITO + 2 * VAO_INTERNO + 2 * VAO_DOS_PONTOS + LARGURA_PONTOS;

/**
 * Retângulos dos sete segmentos dentro de uma célula, em coordenadas relativas
 * ao canto superior esquerdo dela.
 *
 * As barras horizontais recuam meia espessura de cada lado para não invadir as
 * verticais — sem isso os cantos ficam com um quadradinho de espessura dupla,
 * que é exatamente o defeito que denuncia um sete-segmentos improvisado.
 */
function segmentos(dw: number, dh: number, t: number) {
    const barra = dw - t;
    const coluna = dh / 2 - t;
    return {
        a: [t / 2, 0, barra, t],
        b: [dw - t, t / 2, t, coluna],
        c: [dw - t, dh / 2 + t / 2, t, coluna],
        d: [t / 2, dh - t, barra, t],
        e: [0, dh / 2 + t / 2, t, coluna],
        f: [0, t / 2, t, coluna],
        g: [t / 2, dh / 2 - t / 2, barra, t],
    } as Record<string, [number, number, number, number]>;
}

const SEGMENTOS = segmentos(LARGURA_DIGITO, ALTURA_DIGITO, ESPESSURA);

function desenhar(ctx: CanvasRenderingContext2D, agora: Date) {
    ctx.fillStyle = COR_FUNDO;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    const digitos = digitosDoHorario(agora);
    const topo = (ALTURA - ALTURA_DIGITO) / 2;
    let x = (LARGURA - LARGURA_TOTAL) / 2;

    // O halo é desenhado aqui dentro, e não deixado para o <Bloom> da cena: o
    // display tem 3cm na prateleira e o efeito de tela só se lê de perto se o
    // brilho estiver na própria textura.
    ctx.shadowColor = COR_ACESA;

    digitos.forEach((digito, indice) => {
        const acesos = SEGMENTOS_POR_DIGITO[digito];
        for (const [nome, [dx, dy, w, h]] of Object.entries(SEGMENTOS)) {
            const aceso = acesos.includes(nome);
            ctx.fillStyle = aceso ? COR_ACESA : COR_APAGADA;
            ctx.shadowBlur = aceso ? ESPESSURA : 0;
            ctx.fillRect(x + dx, topo + dy, w, h);
        }
        x += LARGURA_DIGITO;
        // Depois do segundo algarismo entram os dois pontos; entre os pares, só
        // o respiro estreito.
        x += indice === 1 ? VAO_DOS_PONTOS + LARGURA_PONTOS + VAO_DOS_PONTOS : VAO_INTERNO;
    });

    const pontos = pontosAcesos(agora);
    ctx.fillStyle = pontos ? COR_ACESA : COR_APAGADA;
    ctx.shadowBlur = pontos ? ESPESSURA : 0;
    const xPontos = (LARGURA - LARGURA_PONTOS) / 2 + (LARGURA_PONTOS - ESPESSURA) / 2;
    for (const fracao of [0.3, 0.7]) {
        ctx.fillRect(xPontos, topo + ALTURA_DIGITO * fracao - ESPESSURA / 2, ESPESSURA, ESPESSURA);
    }
    ctx.shadowBlur = 0;
}

export function useTexturaDeRelogio() {
    const {textura, ctx} = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = LARGURA;
        canvas.height = ALTURA;
        const contexto = canvas.getContext('2d')!;
        desenhar(contexto, new Date());

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return {textura: tex, ctx: contexto};
    }, []);

    useEffect(() => {
        // Encadeado em vez de setInterval: cada passo mira a próxima borda de
        // meio segundo, então o atraso de um disparo não se soma ao seguinte.
        let agendamento: ReturnType<typeof setTimeout>;
        const tique = () => {
            const agora = new Date();
            desenhar(ctx, agora);
            textura.needsUpdate = true;
            agendamento = setTimeout(tique, msAteOProximoQuadro(agora));
        };
        tique();
        return () => clearTimeout(agendamento);
    }, [ctx, textura]);

    // Textura criada em código não é descartada pelo R3F ao desmontar — mesmo
    // cuidado da chuva e das geometrias em Book.tsx.
    useEffect(() => () => textura.dispose(), [textura]);

    return textura;
}
