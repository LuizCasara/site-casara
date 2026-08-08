'use client';

import {useEffect, useRef} from 'react';
import {CameraControls, CameraControlsImpl} from '@react-three/drei';
import {ROOM_ANCHORS, ANCORAS_DO_PC} from '@/components/livros/Room';
import {ESTANTE_ANCHOR, posicaoDaEstante} from '@/components/livros/decor/EstanteDoAcervo';
import {ESTANTE_AMARELA_ANCHOR, ESTANTE_AMARELA_ALTURA_M} from '@/components/livros/decor/YellowShelf';
import {NICHOS, NICHOS_POR_ESTANTE, BOOKSHELF_SIZE_M} from '@/lib/bookshelf-model.mjs';
import {contarEstantes} from '@/lib/shelf-years.mjs';

/**
 * `camping` é a estante AMARELA (a dos trecos de acampamento), não a do
 * acervo — essa continua sendo `estante`. Os ids ficaram assim porque o rótulo
 * que a pessoa lê no botão mudou depois: hoje `estante` aparece como "Livros"
 * e `camping` aparece como "Estante" (ver CENAS em lib/livros-cenas.mjs).
 * Renomear os ids arrastaria os eventos de analytics já gravados, os
 * viewpoints e os testes — o id é o nome interno, o rótulo é o da tela.
 */
export type Viewpoint = 'geral' | 'estante' | 'camping' | 'mesa' | 'pc' | 'retrato';

type ViewpointConfig = {
    camera: [number, number, number];
    target: [number, number, number];
    minAzimuth: number;
    maxAzimuth: number;
    minPolar: number;
    maxPolar: number;
};

const estanteZ = ESTANTE_ANCHOR.position[2];
const mesaPos = ROOM_ANCHORS.mesa.position;

const FOV_GRAUS = 50;
/** Respiro em volta do que está sendo enquadrado, para não ficar espremido. */
const RESPIRO = 1.08;
/** Altura do header, fixa pelo layout raiz. */
const HEADER_PX = 65;

/**
 * Onde pôr a câmera para caber `alturaM` **na faixa do canvas que não está
 * coberta**, e quanto o alvo precisa subir para essa faixa ficar centrada nela.
 *
 * O canvas é `fixed inset-0`, então header, rodapé e botões ficam POR CIMA
 * dele: enquadrar pela altura da tela inteira corta o que está nas pontas, e
 * como o rodapé é bem mais alto que o header, o corte é assimétrico. A faixa é
 * medida em vez de calibrada à mão, então o enquadramento se ajusta sozinho ao
 * rodapé mais alto do celular.
 */
function faixaLivre(cobertoEmbaixoPx: number) {
    const viewportPx = typeof window === 'undefined' ? 900 : window.innerHeight;
    const faixaPx = Math.max(120, viewportPx - HEADER_PX - cobertoEmbaixoPx);
    const centroFaixaPx = HEADER_PX + faixaPx / 2;

    return {
        /** Quanto da tela sobra livre, de 0 a 1. */
        fracaoVisivel: faixaPx / viewportPx,
        /**
         * O quanto o quadro precisa escorregar, em frações da altura visível,
         * para o que interessa ficar centrado na faixa livre em vez de na tela.
         *
         * O sinal é contra-intuitivo: a faixa livre fica ACIMA do meio da tela
         * (o rodapé come mais que o header), então este número é NEGATIVO — para
         * a cena subir na tela, a câmera precisa mirar mais baixo.
         */
        deslocamento: (centroFaixaPx - viewportPx / 2) / viewportPx,
    };
}

function enquadrar(alturaM: number, cobertoEmbaixoPx: number) {
    const {fracaoVisivel, deslocamento} = faixaLivre(cobertoEmbaixoPx);

    // Se a faixa visível é 60% da tela, a câmera precisa enquadrar a altura
    // desejada dividida por 0,6 para que ela caiba inteira lá dentro.
    const alturaEnquadradaM = (alturaM / fracaoVisivel) * RESPIRO;
    const distancia = alturaEnquadradaM / 2 / Math.tan((FOV_GRAUS * Math.PI) / 360);

    return {distancia, alvoDeslocadoM: deslocamento * alturaEnquadradaM};
}

/**
 * Desce a cena inteira (câmera e alvo juntos) até ela ficar centrada na faixa
 * livre da tela. Serve às cenas de composição fixa — 'geral' e 'mesa' —, onde
 * a distância e o ângulo já são o que se quer e só a altura estava errada: o
 * rodapé do site é `fixed` por cima do canvas, e o que estivesse na parte de
 * baixo do quadro (a mesa de centro, o tapete) ficava atrás dele.
 *
 * Move os dois pontos pelo mesmo tanto de propósito. Baixar só o alvo também
 * subiria a cena, mas inclinando a câmera — a sala ganharia chão e perderia
 * parede. Assim o enquadramento é o mesmo, um pouco mais abaixo.
 */
function subirParaFaixaLivre(v: ViewpointConfig, cobertoEmbaixoPx: number): ViewpointConfig {
    const distancia = Math.hypot(
        v.camera[0] - v.target[0],
        v.camera[1] - v.target[1],
        v.camera[2] - v.target[2],
    );
    const alturaVisivelM = 2 * distancia * Math.tan((FOV_GRAUS * Math.PI) / 360);
    const dy = faixaLivre(cobertoEmbaixoPx).deslocamento * alturaVisivelM;

    return {
        ...v,
        camera: [v.camera[0], v.camera[1] + dy, v.camera[2]],
        target: [v.target[0], v.target[1] + dy, v.target[2]],
    };
}

/** Centro geométrico da estante — usado por quem só precisa olhar na direção dela. */
const estanteCentroY = ESTANTE_ANCHOR.position[1] + BOOKSHELF_SIZE_M.alturaM / 2;

/**
 * Os pontos de vista que não dependem do tamanho da janela. `estante` não
 * está aqui: ela é calculada em runtime (ver `viewpointDaEstante`), porque
 * enquadrar o móvel inteiro depende de quanto o rodapé está cobrindo.
 */
const VIEWPOINTS: Record<Exclude<Viewpoint, 'estante' | 'camping'>, ViewpointConfig> = {
    geral: {
        camera: [0, 1.75, 2.6],
        target: [0, estanteCentroY, estanteZ],
        minAzimuth: -0.5, maxAzimuth: 0.5,
        minPolar: 1.1, maxPolar: 1.6,
    },
    mesa: {
        camera: [mesaPos[0] + 0.5, mesaPos[1] + 0.5, mesaPos[2] + 0.7],
        target: [mesaPos[0], mesaPos[1], mesaPos[2]],
        minAzimuth: -0.4, maxAzimuth: 0.4,
        minPolar: 1.1, maxPolar: 1.6,
    },
    /*
      O canto de trabalho, visto de três quartos: de frente ele viraria uma
      parede de monitores, e o que faz o canto ser um canto são as duas asas do
      L — a das telas e a da bíblia aberta. Daqui as duas aparecem.

      A câmera fica dentro da sala (a parede direita está em x=2.6) e um pouco
      acima da linha do tampo, para o que está SOBRE a mesa não sumir atrás da
      borda dela.

      **Esta é a parada ABERTA do canto — o plano de apresentação.** Ela não
      tenta deixar nada legível, e é por isso que pode ser larga: os quatro
      objetos com ação viraram sub-paradas próprias (ver VIEWPOINTS_DO_PC), cada
      uma com o close que merece.

      Houve uma tentativa intermediária de resolver tudo aqui, fechando o quadro
      sobre quadro de recados, telas e bíblia ao mesmo tempo. Não funciona: são
      um metro e meio de distância entre as pontas, então o enquadramento que
      cabe os três deixa a tela do monitor pequena demais para se ler o que
      toca. Uma parada não consegue ser plano geral e close ao mesmo tempo.

      O alvo fica um pouco acima do tampo (1.10, não 0.95) para a prateleira
      aérea entrar no quadro — ela faz parte do canto e some se o alvo mirar só
      a mesa.
    */
    pc: {
        camera: [0.70, 1.72, 1.30],
        target: [1.72, 1.10, -0.85],
        minAzimuth: -0.75, maxAzimuth: -0.15,
        minPolar: 1.05, maxPolar: 1.55,
    },
    /*
      Close no porta-retratos da mesa do PC. NÃO é uma parada do trilho: só se
      chega aqui clicando no objeto, e sai-se com Esc ou clicando de novo — do
      mesmo jeito que o índice.

      As coordenadas seguem o retrato, que fica sobre o tampo (0,74m) no braço do
      fundo da mesa. A câmera para a 35cm dele, na altura dos olhos de quem
      estivesse sentado, e o giro é apertado para não haver como perder a foto de
      vista enquanto se olha.
    */
    retrato: {
        camera: [2.124, 0.944, -1.018],
        target: [2.34, 0.83, -1.27],
        minAzimuth: -1.1, maxAzimuth: -0.4,
        minPolar: 1.25, maxPolar: 1.7,
    },
};

/**
 * Uma parada olhando para UM objeto, a partir de uma direção e uma distância.
 *
 * Os limites de giro saem da própria direção, com uma folga fixa em volta —
 * não são escritos à mão. Calculá-los na mão para quatro paradas é quatro
 * chances de errar um `atan2` em silêncio: o sintoma seria a câmera nascer
 * fora do próprio limite e dar um salto no primeiro toque, que é exatamente o
 * tipo de defeito que ninguém associa a um número no meio do arquivo.
 *
 * @param direcao do ALVO para a câmera; o comprimento é ignorado (normalizado).
 */
function focoDeObjeto(
    alvo: [number, number, number],
    direcao: [number, number, number],
    distancia: number,
    folgaAzimute = 0.34,
    folgaPolar = 0.26,
): ViewpointConfig {
    const norma = Math.hypot(...direcao) || 1;
    const [dx, dy, dz] = direcao.map((c) => (c / norma) * distancia);

    return {
        camera: [alvo[0] + dx, alvo[1] + dy, alvo[2] + dz],
        target: alvo,
        // Azimute conta a partir de +z; polar, a partir de +y. É a convenção do
        // CameraControls, e é por isso que o polar usa a distância HORIZONTAL
        // contra o dy, e não o contrário.
        minAzimuth: Math.atan2(dx, dz) - folgaAzimute,
        maxAzimuth: Math.atan2(dx, dz) + folgaAzimute,
        minPolar: Math.atan2(Math.hypot(dx, dz), dy) - folgaPolar,
        maxPolar: Math.atan2(Math.hypot(dx, dz), dy) + folgaPolar,
    };
}

/**
 * As cinco sub-paradas do canto de trabalho, na ordem de FOCOS_DO_PC
 * (recomendações → gaveta → monitores → alto-falante → bíblia), varrendo o canto
 * da esquerda para a direita como o trilho principal varre a sala.
 *
 * São cinco aqui e quatro no trilho: a gaveta tem enquadramento como qualquer
 * outra, mas ninguém a atravessa navegando — só o clique nela leva a câmera até
 * aqui (ver `foraDoTrilho` em lib/livros-cenas.mjs). O índice dela continua
 * valendo, e é por isso que ela segue nesta lista em vez de ser removida.
 *
 * As distâncias são o que separa uma parada útil de um close inútil: o quadro
 * de recados e a bíblia pedem folga para se lerem inteiros, enquanto a caixa de
 * som tem 10cm e some se a câmera parar longe. Nenhuma delas tenta enquadrar
 * duas coisas ao mesmo tempo — foi justamente isso que a parada única do "PC"
 * fazia, e o custo era a tela do monitor pequena demais para se ler.
 */
const VIEWPOINTS_DO_PC: ViewpointConfig[] = [
    // Quadro de recados: quase de frente, com um leve deslocamento lateral para
    // não virar uma foto chapada de um retângulo branco.
    focoDeObjeto(ANCORAS_DO_PC.recomendacoes, [0.18, -0.04, 0.98], 0.85),
    /*
      Gaveta: a única parada do canto que olha de BAIXO da linha do tampo. As
      outras quatro miram de cima, e qualquer uma delas esconderia a gaveta atrás
      da própria mesa — ela fica a 62cm do chão, com 12cm de madeira por cima.

      **A aproximação vem pela esquerda, e isso não é composição: é desvio.** A
      cadeira está no vão do L e tem 95cm de altura; uma câmera que se aproxime
      pela frente-centro atravessa o encosto. Ela já foi empurrada para trás
      (`RECUO_DA_CADEIRA` em CantoDeTrabalho) justamente para abrir este caminho,
      e o x negativo aqui é a outra metade da solução. Mexer neste vetor sem
      olhar a cadeira é como o defeito volta.

      Um pouco de cima ainda assim (y positivo), porque o que interessa está
      DEITADO no fundo da gaveta: na altura dos olhos ver-se-ia a borda da
      bandeja e quase nada do bloco de notas.
    */
    focoDeObjeto(ANCORAS_DO_PC.gaveta, [-0.55, 0.62, 0.56], 0.75),
    // Monitores: de três quartos, na altura das telas. A tela da direita é o
    // player, e é ela que precisa estar legível aqui.
    focoDeObjeto(ANCORAS_DO_PC.monitores, [-0.15, 0.24, 0.96], 0.95),
    // Alto-falante: perto, mas não colado — a prateleira em volta é o que dá a
    // escala da caixinha.
    focoDeObjeto(ANCORAS_DO_PC.caixaDeSom, [-0.12, 0.16, 0.98], 0.70),
    // Bíblia: de cima, porque ela está DEITADA no tampo. Uma câmera na altura
    // dos olhos veria a lombada de canto e quase nada da página aberta.
    focoDeObjeto(ANCORAS_DO_PC.biblia, [-0.45, 0.62, 0.64], 0.85),
];

/**
 * Nível 1: o móvel inteiro em quadro. A distância vem da altura dele e da
 * faixa livre da tela, não de um número calibrado à mão — trocar o modelo por
 * outro, ou abrir num celular de rodapé alto, reenquadra sozinho. Quem quer
 * ler lombada não para aqui: escolhe um ano e desce para o nível 2.
 */
function viewpointDaEstante(cobertoEmbaixoPx: number): ViewpointConfig {
    const {distancia, alvoDeslocadoM} = enquadrar(BOOKSHELF_SIZE_M.alturaM, cobertoEmbaixoPx);
    const alvoY = estanteCentroY + alvoDeslocadoM;
    return {
        camera: [0, alvoY, estanteZ + distancia],
        target: [0, alvoY, estanteZ],
        minAzimuth: -0.25, maxAzimuth: 0.25,
        minPolar: 1.3, maxPolar: 1.75,
    };
}

/**
 * A estante amarela (trecos de camping) de frente.
 *
 * Enquadrada como a do acervo — pela altura do móvel e pela faixa livre da
 * tela, não por números calibrados à mão —, mas com uma diferença: aquela está
 * de frente para a câmera na parede do fundo, e esta fica de perfil na parede
 * lateral. Por isso a câmera é posta na NORMAL do móvel, girando a distância
 * pelo mesmo `rotationY` com que ele é desenhado. Assim, mover a estante de
 * lugar ou mudar o giro dela reenquadra sozinho, em vez de deixar a câmera
 * apontada para o vazio onde ela estava.
 *
 * Os limites de giro também saem do ângulo em vez de serem constantes: um
 * `minAzimuth` fixo aqui apontaria para a direção errada — as outras cenas
 * podem usar valores em torno de zero porque olham o fundo da sala, esta olha
 * para o lado.
 */
const GIRO_LIVRE_RAD = 0.25;

function viewpointDaEstanteAmarela(cobertoEmbaixoPx: number): ViewpointConfig {
    const {distancia, alvoDeslocadoM} = enquadrar(ESTANTE_AMARELA_ALTURA_M, cobertoEmbaixoPx);
    const [x, , z] = ESTANTE_AMARELA_ANCHOR.position;
    const angulo = ESTANTE_AMARELA_ANCHOR.rotationY;

    // O móvel é desenhado girado em Y, então a direção que sai da frente dele é
    // (sin, cos) desse mesmo ângulo — a câmera recua por ali.
    const camX = x + distancia * Math.sin(angulo);
    const camZ = z + distancia * Math.cos(angulo);
    const alvoY = ESTANTE_AMARELA_ALTURA_M / 2 + alvoDeslocadoM;

    return {
        camera: [camX, alvoY, camZ],
        target: [x, alvoY, z],
        minAzimuth: angulo - GIRO_LIVRE_RAD, maxAzimuth: angulo + GIRO_LIVRE_RAD,
        minPolar: 1.35, maxPolar: 1.75,
    };
}

/**
 * Nível 2: um nicho preenchendo o quadro, com as bordas dos vizinhos ainda
 * aparecendo — só a câmera se move, nada escurece nem muda de cor. A margem
 * somada à altura do vão é justamente o que deixa o vizinho espiando, que é o
 * que mantém a noção de onde aquele ano fica dentro da estante.
 */
const MARGEM_VIZINHOS_M = 0.16;

function viewpointDoGrupo(indiceGrupo: number, totalGrupos: number, cobertoEmbaixoPx: number): ViewpointConfig {
    const totalEstantes = contarEstantes(totalGrupos, NICHOS_POR_ESTANTE);
    const nicho = NICHOS[indiceGrupo % NICHOS_POR_ESTANTE];
    const base = posicaoDaEstante(Math.floor(indiceGrupo / NICHOS_POR_ESTANTE), totalEstantes);

    const {distancia, alvoDeslocadoM} = enquadrar(nicho.alturaUtilM + MARGEM_VIZINHOS_M, cobertoEmbaixoPx);
    const alvoX = base[0] + nicho.offsetX;
    const alvoY = base[1] + nicho.pisoY + nicho.alturaUtilM / 2 + alvoDeslocadoM;

    return {
        camera: [alvoX, alvoY, base[2] + distancia],
        target: [alvoX, alvoY, base[2]],
        minAzimuth: -0.15, maxAzimuth: 0.15,
        minPolar: 1.4, maxPolar: 1.7,
    };
}

type CameraRigProps = {
    viewpoint: Viewpoint;
    animate?: boolean;
    /** Índice do grupo de ano em foco. Só tem efeito no viewpoint 'estante'. */
    grupoFocado?: number | null;
    totalGrupos?: number;
    /** Índice em FOCOS_DO_PC. Só tem efeito no viewpoint 'pc'. */
    focoDoPC?: number | null;
    /**
     * Quantos pixels da base do canvas estão cobertos (rodapé + a barra de
     * botões), medidos por quem renderiza. Entra no enquadramento da estante:
     * no celular o rodapé quase dobra de altura E os anos quebram em duas
     * linhas, e um valor fixo aqui enterra o nicho de baixo atrás dos botões.
     */
    cobertoEmbaixoPx?: number;
};

export default function CameraRig({
    viewpoint, animate = true, grupoFocado = null, totalGrupos = 0,
    focoDoPC = null, cobertoEmbaixoPx = 0,
}: CameraRigProps) {
    const controlsRef = useRef<CameraControls>(null);

    let v: ViewpointConfig;
    if (viewpoint === 'estante') {
        v = grupoFocado !== null
            ? viewpointDoGrupo(grupoFocado, totalGrupos, cobertoEmbaixoPx)
            : viewpointDaEstante(cobertoEmbaixoPx);
    } else if (viewpoint === 'pc' && focoDoPC !== null && VIEWPOINTS_DO_PC[focoDoPC]) {
        // Sem `subirParaFaixaLivre`: essas paradas já miram o CENTRO de um
        // objeto pequeno com folga em volta, e empurrar o alvo para cima
        // tiraria justamente ele do meio do quadro. A correção do rodapé existe
        // para enquadrar móveis inteiros, não para closes.
        v = VIEWPOINTS_DO_PC[focoDoPC];
    } else if (viewpoint === 'camping') {
        // Também calculada em runtime, pela mesma razão da estante do acervo:
        // enquadrar o móvel inteiro depende de quanto o rodapé está cobrindo.
        v = viewpointDaEstanteAmarela(cobertoEmbaixoPx);
    } else {
        // Toda cena de composição fixa passa pela correção do rodapé — ele é
        // `fixed` por cima do canvas e come a base do quadro em qualquer uma
        // delas.
        v = subirParaFaixaLivre(VIEWPOINTS[viewpoint], cobertoEmbaixoPx);
    }

    useEffect(() => {
        controlsRef.current?.setLookAt(...v.camera, ...v.target, animate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewpoint, grupoFocado, focoDoPC, cobertoEmbaixoPx]);

    // Sem trilho de arrasto (`truckSpeed={0}`): a estante é vertical e cabe
    // inteira no quadro, e navegar é escolher um ano — mais preciso no toque do
    // que arrastar até achar.
    return (
        <CameraControls
            ref={controlsRef}
            minAzimuthAngle={v.minAzimuth}
            maxAzimuthAngle={v.maxAzimuth}
            minPolarAngle={v.minPolar}
            maxPolarAngle={v.maxPolar}
            dollySpeed={0}
            truckSpeed={0}
            touches-one={CameraControlsImpl.ACTION.TOUCH_ROTATE}
        />
    );
}
