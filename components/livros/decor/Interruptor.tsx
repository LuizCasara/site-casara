'use client';

import {useState} from 'react';
import {Html} from '@react-three/drei';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';

/**
 * O interruptor da parede lateral, que apaga a luz do teto.
 *
 * Segue a regra da sala de que toda função tem um objeto físico — e esta é a
 * versão mais literal dela: o objeto que apaga a luz é um interruptor, no lugar
 * onde um interruptor fica.
 *
 * **A resposta ao clique é a sala inteira escurecendo, não uma peça se
 * mexendo.** O modelo tem uma tecla, mas ela é simétrica em Y (medido: -0,143 a
 * 0,146), então virar a peça de cabeça para baixo não mudaria pixel nenhum. Não
 * vale inventar geometria só para produzir um clique visual quando o efeito
 * verdadeiro é maior que qualquer animação de 4mm.
 */

/** Placa branca e tecla — a espelheira fica clara para se achar na parede
 *  escura, que é o único jeito de alguém descobrir que ela existe. */
const COR_ESPELHO = '#d9d5cc';
const COR_TECLA = '#b7bcc0';

/**
 * Altura de um interruptor de verdade. Não é número redondo por acaso: mais
 * alto ele encosta no stand de espadas, mais baixo desce para trás da mesa.
 */
export const INTERRUPTOR_ALTURA_M = 0.115;

/**
 * Quanto a peça recua da parede para a traseira dela encostar, e não metade
 * atravessar o reboco: metade da espessura já escalada.
 *
 * Os dois números são do `.glb` — 0,082 de fundo para 0,46 de altura —, e ficam
 * numa conta em vez de num valor pronto para o recuo continuar certo se alguém
 * mudar `INTERRUPTOR_ALTURA_M`.
 */
export const INTERRUPTOR_RECUO_M = (INTERRUPTOR_ALTURA_M * (0.082 / 0.46)) / 2;

/**
 * Meia volta, porque o modelo nasce com a placa olhando para +x e a parede
 * lateral direita da sala olha para -x.
 *
 * Qual lado é a frente saiu dos planos de vértice em X: a face de trás é o
 * plano denso em -0,030 (12 vértices, um retângulo cheio), enquanto o lado +x
 * só tem a saliência da caixa da tecla. Se a peça aparecer de costas para a
 * sala, é este π que sai.
 */
const PLACA_PARA_A_SALA = Math.PI;

type InterruptorProps = {
    /** Ponto na parede: [x da parede, altura, z]. */
    position: [number, number, number];
    acesa: boolean;
    /** Ausente = a peça vira enfeite: sem etiqueta e sem clique. Mesmo contrato
     *  do `onOpen` da lava lamp quando há um livro aberto. */
    onAlternar?: () => void;
    isMobile?: boolean;
};

export default function Interruptor({position, acesa, onAlternar, isMobile = false}: InterruptorProps) {
    const [hover, setHover] = useState(false);
    const interativo = Boolean(onAlternar);

    return (
        <group
            position={position}
            rotation={[0, PLACA_PARA_A_SALA, 0]}
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
                if (!interativo) return;
                e.stopPropagation();
                onAlternar?.();
            }}
        >
            <KenneyModel
                url={MODELOS.interruptor}
                alturaAlvo={INTERRUPTOR_ALTURA_M}
                cores={{mat21: COR_ESPELHO, mat15: COR_TECLA}}
            />

            {/*
              Alvo de clique próprio, três vezes a placa. Mesma razão da caixa
              invisível na frente do monitor: a espelheira tem 11cm numa parede
              a metros da câmera, e acertar a malha dela com o mouse seria mira
              de precisão. Fica um pouco à frente da parede para não brigar com
              ela no hit-test.
            */}
            <mesh position={[0, 0, 0.02]}>
                <boxGeometry args={[INTERRUPTOR_ALTURA_M * 2, INTERRUPTOR_ALTURA_M * 2, 0.04]}/>
                <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
            </mesh>

            {hover && !isMobile && (
                <Html position={[0, INTERRUPTOR_ALTURA_M * 0.9, 0]} center style={{pointerEvents: 'none'}}>
                    <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                     text-[11px] font-semibold text-white shadow-lg">
                        {/* O que o clique FAZ, não o estado atual — mesma regra
                            das etiquetas do monitor. */}
                        {acesa ? 'Apagar a luz' : 'Acender a luz'}
                    </span>
                </Html>
            )}
        </group>
    );
}
