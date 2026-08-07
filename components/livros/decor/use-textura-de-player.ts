'use client';

import {useEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {ESTACAO, tempoCurto} from '@/lib/radio';
import {BINS_DO_ESPECTRO, type RadioDaSala} from '@/components/livros/decor/use-radio';

/**
 * A tela do monitor quando a rádio está tocando: capa, faixa, barra de
 * progresso e espectro — um player de verdade, desenhado quadro a quadro num
 * `<canvas>`.
 *
 * Irmão do `use-textura-de-chuva.ts`, de propósito: mesmo tamanho, mesma
 * `CanvasTexture`, mesmo "só desenha quando `ativa`". O que muda é que aqui o
 * desenho lê dados de fora (o que toca, onde está, o espectro) em vez de
 * simular partículas.
 *
 * **Nada disso é estado do React.** A posição da faixa e o espectro são lidos
 * por função a cada quadro; guardá-los em `useState` re-renderizaria a sala
 * inteira 60 vezes por segundo para mexer em pixels que só esta textura vê.
 */

const LARGURA = 512;
const ALTURA = 288;
const MARGEM = 22;

const COR_FUNDO_TOPO = '#0b1020';
const COR_FUNDO_BASE = '#171029';
const COR_TEXTO = '#e8eef7';
const COR_APAGADA = '#7d8aa3';
/** O mesmo azul frio de `COR_TELA` no CantoDeTrabalho: a tela do player não
 *  pode parecer de outra sala que a luz que ela joga na mesa. */
const COR_DESTAQUE = '#8fd0f5';
const COR_QUENTE = '#f0abfc';

/** Barras do espectro. Menos que os 64 bins porque as frequências altas de uma
 *  música ficam quase sempre vazias — agrupar os graves e cortar o topo dá um
 *  gráfico que se mexe, em vez de um monte de barras mortas à direita. */
const BARRAS = 28;
const BINS_USADOS = 44;

/** Pausa nas pontas do vai-e-vem do título longo, em segundos. Sem ela o texto
 *  inverte no instante em que chega ao fim e não dá tempo de ler a última
 *  palavra. */
const PAUSA_MARQUEE_S = 1.4;
const VELOCIDADE_MARQUEE = 34; // px/s

function fundo(ctx: CanvasRenderingContext2D) {
    const gradiente = ctx.createLinearGradient(0, 0, 0, ALTURA);
    gradiente.addColorStop(0, COR_FUNDO_TOPO);
    gradiente.addColorStop(1, COR_FUNDO_BASE);
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, LARGURA, ALTURA);
}

function cabecalho(ctx: CanvasRenderingContext2D, ouvintes: number, tocando: boolean) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 0, LARGURA, 34);

    ctx.font = '700 15px Quicksand, sans-serif';
    ctx.fillStyle = COR_TEXTO;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(ESTACAO.nome.toUpperCase(), MARGEM, 18);

    if (tocando) {
        ctx.fillStyle = COR_QUENTE;
        ctx.beginPath();
        ctx.arc(LARGURA - MARGEM - 62, 18, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '700 12px Quicksand, sans-serif';
        ctx.fillText('AO VIVO', LARGURA - MARGEM - 52, 18);
    }

    if (ouvintes > 0) {
        ctx.textAlign = 'right';
        ctx.font = '400 12px "Space Mono", monospace';
        ctx.fillStyle = COR_APAGADA;
        ctx.fillText(String(ouvintes), LARGURA - MARGEM, 18);
    }
    ctx.textAlign = 'left';
}

/** Moldura da capa. Desenhada mesmo sem imagem: o retângulo vazio diz "aqui vai
 *  a capa, ela ainda não chegou", enquanto o nada diz que o layout quebrou. */
function capa(ctx: CanvasRenderingContext2D, imagem: HTMLImageElement | null, x: number, y: number, lado: number) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, y, lado, lado);
    if (imagem && imagem.complete && imagem.naturalWidth > 0) {
        ctx.drawImage(imagem, x, y, lado, lado);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, lado - 1, lado - 1);
}

/**
 * Título que não cabe vai e volta em vez de ser cortado com reticências.
 *
 * É o que um player de verdade faz, e aqui tem um motivo a mais: o nome da
 * faixa é o conteúdo principal da tela, e um `…` numa tela de 512px esconderia
 * justamente a parte que identifica a música.
 */
function tituloRolante(
    ctx: CanvasRenderingContext2D,
    texto: string,
    x: number,
    y: number,
    largura: number,
    tempoS: number,
) {
    ctx.font = '700 23px Quicksand, sans-serif';
    const excesso = ctx.measureText(texto).width - largura;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y - 18, largura, 34);
    ctx.clip();

    let deslocamento = 0;
    if (excesso > 0) {
        const travessiaS = excesso / VELOCIDADE_MARQUEE;
        const cicloS = (travessiaS + PAUSA_MARQUEE_S) * 2;
        const t = tempoS % cicloS;
        // Vai, pausa, volta, pausa — o `min/max` é o que segura nas pontas.
        const ida = Math.min(travessiaS, Math.max(0, t));
        const volta = Math.min(travessiaS, Math.max(0, t - travessiaS - PAUSA_MARQUEE_S));
        deslocamento = (ida - volta) * VELOCIDADE_MARQUEE;
    }

    ctx.fillStyle = COR_TEXTO;
    ctx.fillText(texto, x - deslocamento, y);
    ctx.restore();
}

function espectro(ctx: CanvasRenderingContext2D, dados: Uint8Array, y: number, altura: number) {
    const largura = LARGURA - MARGEM * 2;
    const passo = largura / BARRAS;
    const grossura = passo * 0.62;

    for (let i = 0; i < BARRAS; i++) {
        // Distribuição não-linear: os bins graves, onde mora quase toda a
        // energia de uma música, seriam esmagados num punhado de barras se o
        // mapeamento fosse direto. A potência 1.6 abre os graves e comprime os
        // agudos, que é o que um analisador de áudio faz.
        const inicio = Math.floor((i / BARRAS) ** 1.6 * BINS_USADOS);
        const fim = Math.max(inicio + 1, Math.floor(((i + 1) / BARRAS) ** 1.6 * BINS_USADOS));
        let soma = 0;
        for (let b = inicio; b < fim && b < dados.length; b++) soma += dados[b];
        const media = soma / (fim - inicio) / 255;

        const h = Math.max(2, media * altura);
        const x = MARGEM + i * passo + (passo - grossura) / 2;
        // Do azul da tela ao magenta conforme a barra sobe: a cor vira uma
        // segunda leitura da intensidade, além da altura.
        ctx.fillStyle = media > 0.62 ? COR_QUENTE : COR_DESTAQUE;
        ctx.globalAlpha = 0.35 + media * 0.65;
        ctx.fillRect(x, y + altura - h, grossura, h);
    }
    ctx.globalAlpha = 1;
}

function progresso(ctx: CanvasRenderingContext2D, atualS: number, totalS: number, y: number) {
    const largura = LARGURA - MARGEM * 2;
    const fracao = totalS > 0 ? Math.min(1, atualS / totalS) : 0;

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(MARGEM, y, largura, 5);
    ctx.fillStyle = COR_DESTAQUE;
    ctx.fillRect(MARGEM, y, largura * fracao, 5);

    ctx.font = '400 12px "Space Mono", monospace';
    ctx.fillStyle = COR_APAGADA;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(tempoCurto(atualS), MARGEM, y + 12);
    if (totalS > 0) {
        ctx.textAlign = 'right';
        ctx.fillText(tempoCurto(totalS), LARGURA - MARGEM, y + 12);
        ctx.textAlign = 'left';
    }
    ctx.textBaseline = 'middle';
}

/** Tela sem música: sintonizando ou fora do ar. Centralizada, sem layout de
 *  player — meia tela de player com campos vazios pareceria defeito. */
function recado(ctx: CanvasRenderingContext2D, texto: string, detalhe: string) {
    ctx.textAlign = 'center';
    ctx.font = '700 20px Quicksand, sans-serif';
    ctx.fillStyle = COR_TEXTO;
    ctx.fillText(texto, LARGURA / 2, ALTURA / 2 - 10);
    ctx.font = '400 14px Quicksand, sans-serif';
    ctx.fillStyle = COR_APAGADA;
    ctx.fillText(detalhe, LARGURA / 2, ALTURA / 2 + 18);
    ctx.textAlign = 'left';
}

export function useTexturaDePlayer(ativa: boolean, radio: RadioDaSala) {
    const {textura, ctx, dados} = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = LARGURA;
        canvas.height = ALTURA;
        const contexto = canvas.getContext('2d')!;
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return {textura: tex, ctx: contexto, dados: new Uint8Array(BINS_DO_ESPECTRO)};
    }, []);

    useEffect(() => () => textura.dispose(), [textura]);

    // A capa é uma <img> comum porque o proxy a serve da NOSSA origem — se
    // viesse de i.plaza.one direto, o canvas ficaria "contaminado" e a textura
    // seria recusada pelo WebGL. Ver app/api/livros/capa-radio/route.ts.
    const imagemRef = useRef<HTMLImageElement | null>(null);
    const urlDaCapa = radio.faixa?.capa ?? null;
    useEffect(() => {
        if (!urlDaCapa) {
            imagemRef.current = null;
            return;
        }
        const img = new Image();
        img.src = urlDaCapa;
        imagemRef.current = img;
        // Sem cleanup cancelando o download: ele é pequeno, cacheado
        // imutavelmente, e abortar no meio só desperdiçaria o que já veio.
    }, [urlDaCapa]);

    const tempoRef = useRef(0);

    useFrame((_, delta) => {
        if (!ativa) return;
        tempoRef.current += delta;

        fundo(ctx);

        const faixa = radio.faixa;
        if (radio.foraDoAr) {
            cabecalho(ctx, 0, false);
            recado(ctx, 'Estação fora do ar', 'Clique para ouvir chuva');
        } else if (!faixa) {
            cabecalho(ctx, 0, false);
            recado(ctx, radio.conectando ? 'Sintonizando…' : 'Sem informação', ESTACAO.site.replace('https://', ''));
        } else {
            cabecalho(ctx, faixa.ouvintes, true);

            const LADO_CAPA = 96;
            const yCapa = 52;
            capa(ctx, imagemRef.current, MARGEM, yCapa, LADO_CAPA);

            const xTexto = MARGEM + LADO_CAPA + 18;
            const larguraTexto = LARGURA - xTexto - MARGEM;
            tituloRolante(ctx, faixa.titulo, xTexto, yCapa + 22, larguraTexto, tempoRef.current);

            ctx.font = '600 17px Quicksand, sans-serif';
            ctx.fillStyle = COR_DESTAQUE;
            ctx.fillText(faixa.artista, xTexto, yCapa + 54);

            if (faixa.album) {
                ctx.font = '400 13px Quicksand, sans-serif';
                ctx.fillStyle = COR_APAGADA;
                ctx.fillText(faixa.album, xTexto, yCapa + 78);
            }

            // Sem espectro (o caminho sem CORS), o espaço vira folga em vez de
            // um retângulo vazio — a tela continua equilibrada.
            if (!radio.semEspectro && radio.lerEspectro(dados)) {
                espectro(ctx, dados, 168, 48);
            }

            progresso(ctx, radio.posicaoAtualS(), faixa.duracaoS, 232);
        }

        textura.needsUpdate = true;
    });

    return textura;
}
