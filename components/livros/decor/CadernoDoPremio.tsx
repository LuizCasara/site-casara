'use client';

import {useRef, useState} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {MathUtils} from 'three';
import type * as THREE from 'three';

/**
 * O caderno encadernado que aparece no braço da poltrona quando alguém acha as 17
 * coisas da sala (ver `lib/coisas-da-sala.mjs`).
 *
 * **PRIMITIVAS, e não um `.glb`.** Um caderno fechado é literalmente uma capa, um
 * bloco de páginas e um elástico — três caixas, à distância em que este objeto é
 * visto. Baixar um modelo custaria um download novo na primeira carga da sala,
 * uma pré-carga a mais e, provavelmente, uma atribuição CC BY no rodapé, tudo
 * isso para um objeto de 15cm. É o mesmo raciocínio que deixou os post-its da
 * gaveta como planos e o gabinete do PC como caixa. Trocar por modelo depois é
 * uma linha; descobrir tarde que se pagou por nada é o caro.
 *
 * O requisito de forma foi o que decidiu a geometria: ele precisa ser
 * fisicamente OUTRA COISA que o `nota.glb` da gaveta, que é um bloco plano. Daí a
 * espessura de 2cm, a lombada arredondada pelo miolo recuado e o elástico
 * atravessado — as três coisas que fazem um caderno parecer fechado em vez de
 * empilhado.
 *
 * É um componente CONTROLADO, como a gaveta e a lava lamp: `chegando` e `onAbrir`
 * vêm do `RoomCanvas`, porque quem manda em painel aberto e em câmera é ele.
 */

/** Medidas de caderno de verdade, em metros. Um A6 gordo: cabe no braço da
 *  poltrona (11,7cm de largura útil) sem sobrar para fora. */
const LARGURA_M = 0.102;
const COMPRIMENTO_M = 0.148;
const ESPESSURA_M = 0.021;
/** O quanto o miolo de páginas recua da capa nas bordas — é o que dá a lombada. */
const RECUO_DO_MIOLO_M = 0.004;
const ELASTICO_L_M = 0.006;
const ELASTICO_ESPESSURA_M = 0.0018;

const COR_CAPA = '#8a4433';
const COR_PAGINAS = '#e4ddcc';
const COR_ELASTICO = '#2b2320';

/**
 * De quanto acima do braço o caderno começa a queda, e a velocidade dela.
 *
 * O λ é o mais rápido dos amortecimentos da sala (a gaveta usa 2,8, as luzes
 * 3,2): isto é uma coisa POUSANDO, não um móvel sendo puxado, e um pouso lento
 * pareceria levitação. Os 18cm são altura de "alguém largou aqui", não de queda.
 */
const ALTURA_DA_QUEDA_M = 0.18;
const VELOCIDADE_DA_QUEDA = 5.2;

type CadernoDoPremioProps = {
    /** Ponto do braço em que ele se apoia — a face de CIMA, no mesmo contrato do
     *  `KenneyModel`. Quem sabe a espessura da peça é este arquivo. */
    position: [number, number, number];
    rotationY?: number;
    /**
     * `true` durante o reveal: o caderno cai no lugar em vez de já estar lá.
     * Em toda visita seguinte ele chega com `false` e simplesmente está na sala —
     * a partir do momento em que foi ganho, é mobília, não evento.
     */
    chegando?: boolean;
    /** Ausente = enfeite: sem clique e sem etiqueta. Mesmo contrato da lava lamp
     *  e do interruptor com um livro aberto. */
    onAbrir?: () => void;
    isMobile?: boolean;
};

export default function CadernoDoPremio({
    position, rotationY = 0, chegando = false, onAbrir, isMobile = false,
}: CadernoDoPremioProps) {
    const [hover, setHover] = useState(false);
    const grupo = useRef<THREE.Group>(null);
    /** A queda em curso, num ref e não em estado: ela muda a cada quadro, e um
     *  `useState` aqui re-renderizaria a árvore 60 vezes por segundo. Mesma regra
     *  da gaveta e da cortina. */
    const queda = useRef(chegando ? 1 : 0);
    const interativo = Boolean(onAbrir);

    useFrame((_, delta) => {
        if (!grupo.current) return;
        // `delta` capado pelo mesmo motivo do `useLuzSuave` e da gaveta: uma aba
        // que volta do segundo plano entrega um salto de vários segundos, e o
        // damp viraria corte seco — o caderno apareceria já pousado, sem o gesto.
        queda.current = MathUtils.damp(queda.current, 0, VELOCIDADE_DA_QUEDA, Math.min(delta, 0.1));
        grupo.current.position.y = position[1] + queda.current * ALTURA_DA_QUEDA_M;
        // Ele cai levemente torto e assenta reto. É o que separa "pousou" de
        // "materializou": um objeto que desce sem girar nada lê como teletransporte.
        grupo.current.rotation.z = queda.current * 0.16;
    });

    return (
        <group
            ref={grupo}
            position={position}
            rotation={[0, rotationY, 0]}
            onPointerOver={(e) => {
                if (isMobile || !interativo) return;
                e.stopPropagation();
                setHover(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                if (isMobile || !interativo) return;
                e.stopPropagation();
                setHover(false);
                document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
                if (!onAbrir) return;
                e.stopPropagation();
                onAbrir();
            }}
        >
            {/* A capa: o volume inteiro. O miolo abaixo é o que a faz ler como
                capa e não como tijolo. */}
            <mesh position={[0, ESPESSURA_M / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[LARGURA_M, ESPESSURA_M, COMPRIMENTO_M]}/>
                <meshStandardMaterial color={COR_CAPA} roughness={0.72}/>
            </mesh>

            {/*
              O miolo de páginas, recuado em três lados e NÃO no quarto.

              O lado que não recua é a lombada (-x local): é ali que o papel está
              preso, e é justamente a assimetria entre "três bordas de papel
              aparecendo" e "um lado fechado" que diz de que lado o caderno abre.
              Um bloco recuado nos quatro lados leria como um sanduíche.
            */}
            <mesh position={[RECUO_DO_MIOLO_M / 2, ESPESSURA_M / 2, 0]}>
                <boxGeometry args={[
                    LARGURA_M - RECUO_DO_MIOLO_M,
                    ESPESSURA_M * 0.62,
                    COMPRIMENTO_M - RECUO_DO_MIOLO_M * 2,
                ]}/>
                <meshStandardMaterial color={COR_PAGINAS} roughness={1}/>
            </mesh>

            {/*
              O elástico, atravessado perto da borda de abrir. Um fio escuro
              cruzando a capa é o detalhe que, a três metros, distingue um caderno
              fechado de um livro qualquer deitado — e é o motivo de este objeto
              não poder ser confundido com o bloco de notas plano da gaveta.
            */}
            <mesh position={[LARGURA_M * 0.24, ESPESSURA_M / 2, 0]}>
                <boxGeometry args={[
                    ELASTICO_L_M,
                    ESPESSURA_M + ELASTICO_ESPESSURA_M * 2,
                    COMPRIMENTO_M + ELASTICO_ESPESSURA_M * 2,
                ]}/>
                <meshStandardMaterial color={COR_ELASTICO} roughness={0.55}/>
            </mesh>

            {/* Alvo de clique maior que a peça, como o do bloco de notas da
                gaveta e o da folha da mesa: 2cm de espessura não se acertam com o
                dedo num celular. */}
            <mesh position={[0, ESPESSURA_M, 0]}>
                <boxGeometry args={[LARGURA_M + 0.05, 0.07, COMPRIMENTO_M + 0.04]}/>
                <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
            </mesh>

            {hover && interativo && !isMobile && (
                <Html position={[0, 0.09, 0]} center style={{pointerEvents: 'none'}}>
                    <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                     text-[11px] font-semibold text-white shadow-lg">
                        Abrir o caderno
                    </span>
                </Html>
            )}
        </group>
    );
}
