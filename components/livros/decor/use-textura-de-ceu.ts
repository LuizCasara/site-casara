'use client';

import {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {climaDaHora, posicaoDoAstro} from '@/lib/luz-do-dia.mjs';
import {VIDRO_PROPORCAO} from '@/lib/janela-model.mjs';

/**
 * O lado de fora da janela, desenhado num `<canvas>` — quinta tela desenhada
 * desta sala, irmã da chuva, do player, do relógio e das lombadas.
 *
 * **Nenhum arquivo de imagem entrou no repositório por causa disto**, e é a
 * mesma decisão da chuva sintetizada e do ruído do aguaceiro: uma foto de
 * paisagem custaria peso, licença e — o que decide — chegaria como um retângulo
 * chapado, exatamente o defeito que a sala já aprendeu três vezes a evitar em
 * objeto de parede. Desenhado, o céu muda de cor com a hora sem baixar nada.
 *
 * A textura vai para o material `mat25` do `.glb`, que é o PRÓPRIO VIDRO — não
 * há plano colado na frente da janela. É a mesma regra da tela do monitor:
 * acender é pintar o material que já existe.
 */

/** A largura sai da proporção medida do vidro, não de um número redondo: um
 *  canvas com outra proporção chega esticado no vão. */
const LARGURA = 384;
const ALTURA = Math.round(LARGURA / VIDRO_PROPORCAO);

/** Onde termina o céu e começa o chão lá fora. Alto de propósito: o que vale
 *  ver pela janela é o céu, e a silhueta serve só para dar fundo a ele. */
const HORIZONTE = ALTURA * 0.82;

/** Quantidade de estrelas, e o gerador que as posiciona. */
const ESTRELAS = 70;

/**
 * PRNG determinístico (mulberry32). As estrelas precisam nascer sempre nos
 * mesmos lugares: com `Math.random()` elas dançariam pelo céu a cada minuto,
 * quando o canvas é redesenhado.
 */
function gerador(semente: number) {
    let a = semente;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const CEU_ESTRELADO = (() => {
    const aleatorio = gerador(20260807);
    return Array.from({length: ESTRELAS}, () => ({
        x: aleatorio(),
        // Só no terço superior e médio: estrela rente ao horizonte fica dentro
        // da silhueta e some.
        y: aleatorio() * 0.72,
        raio: 0.6 + aleatorio() * 1.1,
        brilho: 0.35 + aleatorio() * 0.65,
    }));
})();

/** A silhueta do horizonte: morros ao fundo e uma fila de coníferas. Fixa e
 *  desenhada em fração da largura, para acompanhar qualquer tamanho de canvas. */
const MORROS = [
    {centro: 0.22, largura: 0.62, altura: 0.11},
    {centro: 0.74, largura: 0.54, altura: 0.08},
];
const ARVORES = (() => {
    const aleatorio = gerador(99);
    return Array.from({length: 14}, (_, i) => ({
        x: (i + 0.5) / 14 + (aleatorio() - 0.5) * 0.05,
        altura: 0.045 + aleatorio() * 0.045,
        largura: 0.018 + aleatorio() * 0.012,
    }));
})();

const rgb = (c: number[], alfa = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alfa})`;

/** Luminância percebida, para decidir o quanto de noite o céu está. */
function luminancia([r, g, b]: number[]) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function desenharAstro(
    ctx: CanvasRenderingContext2D,
    hora: number,
    corDoCeu: number[],
) {
    const {tipo, x, altura} = posicaoDoAstro(hora);
    const cx = x * LARGURA;
    // altura 0 é o horizonte, 1 é o topo do vão — com uma margem em cima para o
    // disco não encostar na travessa do caixilho.
    const cy = HORIZONTE - altura * (HORIZONTE - ALTURA * 0.12);
    const raio = tipo === 'sol' ? LARGURA * 0.062 : LARGURA * 0.045;
    const corpo = tipo === 'sol' ? [255, 246, 214] : [226, 232, 244];

    // O halo primeiro, por baixo: é ele que faz o disco parecer luz e não
    // adesivo. Raio bem maior que o corpo, caindo a zero nas bordas.
    const halo = ctx.createRadialGradient(cx, cy, raio * 0.6, cx, cy, raio * 4.5);
    halo.addColorStop(0, rgb(corpo, tipo === 'sol' ? 0.5 : 0.28));
    halo.addColorStop(1, rgb(corpo, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    ctx.fillStyle = rgb(corpo);
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.fill();

    // A lua vira crescente por SUBTRAÇÃO: um segundo disco, na cor do céu,
    // deslocado por cima do primeiro. Disco cheio e pálido leria como sol
    // desbotado, que é justamente a confusão a evitar às três da manhã.
    if (tipo === 'lua') {
        ctx.fillStyle = rgb(corDoCeu);
        ctx.beginPath();
        ctx.arc(cx + raio * 0.62, cy - raio * 0.28, raio * 0.94, 0, Math.PI * 2);
        ctx.fill();
    }
}

function desenharSilhueta(ctx: CanvasRenderingContext2D, corDaBase: number[]) {
    // A silhueta é a cor do céu no horizonte, bem escurecida — e não um preto
    // fixo: ao entardecer o morro contra um céu laranja tem que ficar marrom
    // arroxeado, não um recorte preto de cartolina.
    const escuro = corDaBase.map((c) => Math.round(c * 0.22));

    for (const morro of MORROS) {
        ctx.fillStyle = rgb(escuro, 0.75);
        ctx.beginPath();
        ctx.ellipse(
            morro.centro * LARGURA, HORIZONTE,
            (morro.largura * LARGURA) / 2, morro.altura * ALTURA,
            0, Math.PI, 0,
        );
        ctx.fill();
    }

    ctx.fillStyle = rgb(escuro);
    ctx.fillRect(0, HORIZONTE, LARGURA, ALTURA - HORIZONTE);

    for (const arvore of ARVORES) {
        const x = arvore.x * LARGURA;
        const h = arvore.altura * ALTURA;
        const w = arvore.largura * LARGURA;
        ctx.beginPath();
        ctx.moveTo(x, HORIZONTE - h);
        ctx.lineTo(x + w, HORIZONTE + 2);
        ctx.lineTo(x - w, HORIZONTE + 2);
        ctx.closePath();
        ctx.fill();
    }
}

function desenhar(ctx: CanvasRenderingContext2D, hora: number) {
    const {ceuTopo, ceuBase} = climaDaHora(hora);

    const degrade = ctx.createLinearGradient(0, 0, 0, HORIZONTE);
    degrade.addColorStop(0, rgb(ceuTopo));
    degrade.addColorStop(1, rgb(ceuBase));
    ctx.fillStyle = degrade;
    ctx.fillRect(0, 0, LARGURA, ALTURA);

    // As estrelas aparecem por quanto o céu está escuro, e não por um horário:
    // assim elas surgem e somem junto com a cor, sem um instante em que o céu
    // já está preto e o firmamento vazio.
    const noturnidade = Math.min(1, Math.max(0, (60 - luminancia(ceuTopo)) / 50));
    if (noturnidade > 0.01) {
        for (const estrela of CEU_ESTRELADO) {
            ctx.fillStyle = `rgba(255, 255, 255, ${estrela.brilho * noturnidade})`;
            ctx.beginPath();
            ctx.arc(estrela.x * LARGURA, estrela.y * ALTURA, estrela.raio, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    desenharAstro(ctx, hora, ceuTopo);
    desenharSilhueta(ctx, ceuBase);
}

export function useTexturaDeCeu(hora: number) {
    const {textura, ctx} = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = LARGURA;
        canvas.height = ALTURA;
        const contexto = canvas.getContext('2d')!;

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return {textura: tex, ctx: contexto};
    }, []);

    // Redesenha quando a HORA muda, não a cada quadro — quem conta o tempo é o
    // `useHoraDoDia`, de minuto em minuto.
    useEffect(() => {
        desenhar(ctx, hora);
        textura.needsUpdate = true;
    }, [ctx, textura, hora]);

    // Textura criada em código não é descartada pelo R3F ao desmontar — mesmo
    // cuidado do relógio e da chuva.
    useEffect(() => () => textura.dispose(), [textura]);

    return textura;
}
