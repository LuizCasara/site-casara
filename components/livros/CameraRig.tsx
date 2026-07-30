'use client';

import {useEffect, useRef} from 'react';
import {CameraControls} from '@react-three/drei';
import {ROOM_ANCHORS} from '@/components/livros/Room';

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

const VIEWPOINTS: Record<Viewpoint, ViewpointConfig> = {
    geral: {
        camera: [0, 1.6, 2.6],
        target: [0, 1.1, estanteZ],
        minAzimuth: -0.5, maxAzimuth: 0.5,
        minPolar: 1.1, maxPolar: 1.6,
    },
    estante: {
        camera: [0, 1.1, 0.3],
        target: [0, 1.0, estanteZ],
        minAzimuth: -0.25, maxAzimuth: 0.25,
        minPolar: 1.3, maxPolar: 1.75,
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

export default function CameraRig({viewpoint, animate = true}: {viewpoint: Viewpoint; animate?: boolean}) {
    const controlsRef = useRef<CameraControls>(null);
    const v = VIEWPOINTS[viewpoint];

    useEffect(() => {
        controlsRef.current?.setLookAt(...v.camera, ...v.target, animate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewpoint]);

    return (
        <CameraControls
            ref={controlsRef}
            minAzimuthAngle={v.minAzimuth}
            maxAzimuthAngle={v.maxAzimuth}
            minPolarAngle={v.minPolar}
            maxPolarAngle={v.maxPolar}
            dollySpeed={0}
            truckSpeed={0}
        />
    );
}
