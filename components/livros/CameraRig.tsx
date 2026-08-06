'use client';

import {useEffect, useRef} from 'react';
import {CameraControls, CameraControlsImpl} from '@react-three/drei';
import {ROOM_ANCHORS, posicaoDaEstante} from '@/components/livros/Room';
import {NICHOS, NICHOS_POR_ESTANTE, BOOKSHELF_SIZE_M} from '@/lib/bookshelf-model.mjs';
import {contarEstantes} from '@/lib/shelf-years.mjs';

export type Viewpoint = 'geral' | 'estante' | 'mesa' | 'livro' | 'indice';

type ViewpointConfig = {
    camera: [number, number, number];
    target: [number, number, number];
    minAzimuth: number;
    maxAzimuth: number;
    minPolar: number;
    maxPolar: number;
};

const estanteZ = ROOM_ANCHORS.estante.position[2];
const leitura = ROOM_ANCHORS.leitura.position;
const mesaPos = ROOM_ANCHORS.mesa.position;
const indicePos = ROOM_ANCHORS.indice.position;

const FOV_GRAUS = 50;
/** Respiro em volta do que está sendo enquadrado, para não ficar espremido. */
const RESPIRO = 1.08;
/** Altura do header, fixa pelo layout raiz. */
const HEADER_PX = 65;
/**
 * O que os botões de cena ocupam acima do rodapé: as duas linhas (anos +
 * cenas) mais o afastamento de 24px que RoomCanvas aplica.
 */
const BOTOES_PX = 96;

/**
 * Onde pôr a câmera para caber `alturaM` **na faixa do canvas que não está
 * coberta**, e quanto o alvo precisa subir para essa faixa ficar centrada
 * nela.
 *
 * O canvas é `fixed inset-0`, então header, rodapé e botões ficam POR CIMA
 * dele: enquadrar pela altura da tela inteira corta o que está nas pontas, e
 * como o rodapé é bem mais alto que o header, o corte é assimétrico — o nicho
 * de baixo desaparecia atrás dos botões. Era isso que a antiga "folga de
 * 1,25m contra os 0,95m da conta" remendava com um número calibrado à mão;
 * aqui a faixa é medida, então o enquadramento se ajusta sozinho ao rodapé
 * mais alto do celular.
 */
function enquadrar(alturaM: number, alturaRodapePx: number) {
    const viewportPx = typeof window === 'undefined' ? 900 : window.innerHeight;
    const cobertoEmbaixo = alturaRodapePx + BOTOES_PX;
    const faixaPx = Math.max(120, viewportPx - HEADER_PX - cobertoEmbaixo);

    // Se a faixa visível é 60% da tela, a câmera precisa enquadrar a altura
    // desejada dividida por 0,6 para que ela caiba inteira lá dentro.
    const alturaEnquadradaM = (alturaM / (faixaPx / viewportPx)) * RESPIRO;
    const distancia = alturaEnquadradaM / 2 / Math.tan((FOV_GRAUS * Math.PI) / 360);

    // Centro da faixa livre contra o centro da tela, convertido de px para
    // metros pela mesma régua do enquadramento.
    //
    // O sinal importa e é contra-intuitivo: a faixa livre fica ACIMA do meio
    // da tela (o rodapé come mais que o header), e para o objeto subir na
    // tela a câmera precisa mirar mais BAIXO, não mais alto. Mirar alto
    // empurra a cena para baixo — foi o que aconteceu na primeira tentativa,
    // que enterrou ainda mais o nicho de baixo atrás dos botões.
    const centroFaixaPx = HEADER_PX + faixaPx / 2;
    const alvoDeslocadoM = ((centroFaixaPx - viewportPx / 2) / viewportPx) * alturaEnquadradaM;

    return {distancia, alvoDeslocadoM};
}

/** Centro geométrico da estante — usado por quem só precisa olhar na direção dela. */
const estanteCentroY = ROOM_ANCHORS.estante.position[1] + BOOKSHELF_SIZE_M.alturaM / 2;

/**
 * Os pontos de vista que não dependem do tamanho da janela. `estante` não
 * está aqui: ela é calculada em runtime (ver `viewpointDaEstante`), porque
 * enquadrar o móvel inteiro depende de quanto o rodapé está cobrindo.
 */
const VIEWPOINTS: Record<Exclude<Viewpoint, 'estante'>, ViewpointConfig> = {
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
    livro: {
        camera: [leitura[0], leitura[1] + 0.05, leitura[2] + 0.9],
        target: [leitura[0], leitura[1], leitura[2]],
        minAzimuth: -0.2, maxAzimuth: 0.2,
        minPolar: 1.35, maxPolar: 1.6,
    },
    // Câmera mais "de cima" que as outras (minPolar/maxPolar menores) porque
    // a folha está deitada no tampo — olhar quase reto pra baixo é o único
    // jeito de ler algo escrito nela.
    indice: {
        camera: [indicePos[0], indicePos[1] + 0.35, indicePos[2] + 0.3],
        target: [indicePos[0], indicePos[1], indicePos[2]],
        minAzimuth: -0.15, maxAzimuth: 0.15,
        minPolar: 0.9, maxPolar: 1.2,
    },
};

/**
 * Nível 1: o móvel inteiro em quadro. A distância vem da altura dele e da
 * faixa livre da tela, não de um número calibrado à mão — trocar o modelo por
 * outro, ou abrir num celular de rodapé alto, reenquadra sozinho. Quem quer
 * ler lombada não para aqui: escolhe um ano e desce para o nível 2.
 */
function viewpointDaEstante(alturaRodapePx: number): ViewpointConfig {
    const {distancia, alvoDeslocadoM} = enquadrar(BOOKSHELF_SIZE_M.alturaM, alturaRodapePx);
    const alvoY = estanteCentroY + alvoDeslocadoM;
    return {
        camera: [0, alvoY, estanteZ + distancia],
        target: [0, alvoY, estanteZ],
        minAzimuth: -0.25, maxAzimuth: 0.25,
        minPolar: 1.3, maxPolar: 1.75,
    };
}

/**
 * Nível 2: um nicho preenchendo o quadro, com as bordas dos vizinhos ainda
 * aparecendo — só a câmera se move, nada escurece nem muda de cor (spec, D4).
 * A margem somada à altura do vão é justamente o que deixa o vizinho espiando.
 */
const MARGEM_VIZINHOS_M = 0.16;

function viewpointDoGrupo(indiceGrupo: number, totalGrupos: number, alturaRodapePx: number): ViewpointConfig {
    const totalEstantes = contarEstantes(totalGrupos, NICHOS_POR_ESTANTE);
    const nicho = NICHOS[indiceGrupo % NICHOS_POR_ESTANTE];
    const base = posicaoDaEstante(Math.floor(indiceGrupo / NICHOS_POR_ESTANTE), totalEstantes);

    const {distancia, alvoDeslocadoM} = enquadrar(nicho.alturaUtilM + MARGEM_VIZINHOS_M, alturaRodapePx);
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
    /**
     * Altura do rodapé em px, medida por quem renderiza. Entra no
     * enquadramento da estante: é a maior parte do canvas que fica coberta, e
     * ela quase dobra no celular.
     */
    alturaRodapePx?: number;
};

export default function CameraRig({
    viewpoint, animate = true, grupoFocado = null, totalGrupos = 0, alturaRodapePx = 0,
}: CameraRigProps) {
    const controlsRef = useRef<CameraControls>(null);

    let v: ViewpointConfig;
    if (viewpoint === 'estante') {
        v = grupoFocado !== null
            ? viewpointDoGrupo(grupoFocado, totalGrupos, alturaRodapePx)
            : viewpointDaEstante(alturaRodapePx);
    } else {
        v = VIEWPOINTS[viewpoint];
    }

    useEffect(() => {
        controlsRef.current?.setLookAt(...v.camera, ...v.target, animate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewpoint, grupoFocado, alturaRodapePx]);

    // Sem trilho de arrasto: ele existia porque a fila de livros era mais
    // larga que a tela. A estante agora é vertical e cabe inteira no quadro,
    // e navegar é escolher um ano — mais preciso no toque do que arrastar até
    // achar (spec, D9).
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
