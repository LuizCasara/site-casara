'use client';

import {useRef, useState} from 'react';
import {Html} from '@react-three/drei';
import type * as THREE from 'three';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import {useLuzSuave} from '@/components/livros/decor/use-luz-suave';

const LAMP_LIGHT_COLOR = '#ffb877';
const INTENSIDADE_ABAJUR = 7;

/**
 * A cúpula acesa e a cúpula apagada.
 *
 * Recolorir é obrigatório, não enfeite: a `lamp` do modelo é um creme claro que
 * significa "cúpula iluminada por dentro". Apagando só a `pointLight`, o abajur
 * ficaria com a cúpula brilhando e nada acontecendo em volta — que é exatamente
 * o defeito que a tela do monitor evita ao distinguir "tela preta" de "tela
 * mostrando preto".
 */
const CUPULA_ACESA = '#ffe0b0';
const CUPULA_APAGADA = '#6b6157';

// Medidas de móvel de verdade, em metros.
const ALTURA_POLTRONA = 0.82;
const ALTURA_ABAJUR = 1.45;
/** Altura do centro da cúpula: a mesma da luz, que já foi casada com o modelo. */
const CUPULA_Y = ALTURA_ABAJUR - 0.12;

/**
 * Poltrona de leitura com abajur ao lado — os dois são modelos do Furniture
 * Kit do Kenney (CC0), recoloridos pra paleta da sala.
 *
 * O estofado vem vermelho no arquivo original; vira creme aqui pelo nome do
 * material (`carpet`), pra bater com a poltrona do escritório real e continuar
 * sendo o ponto claro do canto de leitura.
 *
 * A poltrona é cenário puro. O ABAJUR, não: ele é o segundo interruptor da sala,
 * e a única peça deste arquivo com clique e estado. Quem manda no estado é o
 * RoomCanvas, como em todo controle da sala — aqui só chegam `aceso` e o que
 * fazer no clique.
 */
export default function Poltrona({position, rotationY = 0, abajurAceso = true, onAlternarAbajur, isMobile = false}: {
    position: [number, number, number];
    rotationY?: number;
    abajurAceso?: boolean;
    /** Ausente = o abajur vira cenário: sem etiqueta e sem clique. Mesmo
     *  contrato do `onOpen` da lava lamp com um livro aberto. */
    onAlternarAbajur?: () => void;
    isMobile?: boolean;
}) {
    const [hover, setHover] = useState(false);
    const luz = useRef<THREE.PointLight>(null);
    const interativo = Boolean(onAlternarAbajur);

    useLuzSuave(luz, abajurAceso ? INTENSIDADE_ABAJUR : 0);

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <KenneyModel
                url={MODELOS.poltrona}
                alturaAlvo={ALTURA_POLTRONA}
                cores={{carpet: '#b5a48d', wood: '#5c4326', metal: '#4a4238'}}
            />

            <group
                position={[-0.75, 0, 0.1]}
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
                    onAlternarAbajur?.();
                }}
            >
                <KenneyModel
                    url={MODELOS.abajur}
                    alturaAlvo={ALTURA_ABAJUR}
                    cores={{metal: '#2b2320', lamp: abajurAceso ? CUPULA_ACESA : CUPULA_APAGADA}}
                />
                {/*
                  A luz é nossa, não do modelo: um GLB carrega geometria e
                  material, nunca uma fonte de luz. Sem esta pointLight o
                  abajur seria um objeto com cúpula clara e nada acesa.
                  Altura casada com a cúpula do modelo (0,86 x 1,6 ≈ 1,38m).

                  A intensidade não é trocada direto: `useLuzSuave` leva ela até
                  o alvo, pelo mesmo motivo da luz do teto — corte seco parece
                  bug de renderização, não interruptor.
                */}
                <pointLight
                    ref={luz}
                    position={[0, CUPULA_Y, 0]}
                    color={LAMP_LIGHT_COLOR}
                    intensity={INTENSIDADE_ABAJUR}
                    distance={3.2}
                    decay={2}
                />

                {/* Alvo de clique na CÚPULA, não no pé: é a cúpula que se
                    entende como "a lâmpada", e o pé é um cilindro fino que
                    exigiria mira. Mesma caixa invisível da tela do monitor. */}
                <mesh position={[0, CUPULA_Y, 0]}>
                    <boxGeometry args={[0.36, 0.3, 0.36]}/>
                    <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
                </mesh>

                {hover && !isMobile && (
                    <Html position={[0, ALTURA_ABAJUR + 0.08, 0]} center style={{pointerEvents: 'none'}}>
                        <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                         text-[11px] font-semibold text-white shadow-lg">
                            {/* O que o clique FAZ, não o estado atual. */}
                            {abajurAceso ? 'Apagar o abajur' : 'Acender o abajur'}
                        </span>
                    </Html>
                )}
            </group>
        </group>
    );
}
