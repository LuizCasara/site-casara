'use client';

import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';

const LAMP_LIGHT_COLOR = '#ffb877';

// Medidas de móvel de verdade, em metros.
const ALTURA_POLTRONA = 0.82;
const ALTURA_ABAJUR = 1.45;

/**
 * Poltrona de leitura com abajur ao lado — os dois são modelos do Furniture
 * Kit do Kenney (CC0), recoloridos pra paleta da sala.
 *
 * O estofado vem vermelho no arquivo original; vira creme aqui pelo nome do
 * material (`carpet`), pra bater com a poltrona do escritório real e continuar
 * sendo o ponto claro do canto de leitura.
 *
 * Puro cenário: sem âncora em ROOM_ANCHORS, sem clique, sem estado.
 */
export default function Poltrona({position, rotationY = 0}: {position: [number, number, number]; rotationY?: number}) {
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <KenneyModel
                url={MODELOS.poltrona}
                alturaAlvo={ALTURA_POLTRONA}
                cores={{carpet: '#b5a48d', wood: '#5c4326', metal: '#4a4238'}}
            />

            <group position={[-0.75, 0, 0.1]}>
                <KenneyModel
                    url={MODELOS.abajur}
                    alturaAlvo={ALTURA_ABAJUR}
                    cores={{metal: '#2b2320', lamp: '#ffe0b0'}}
                />
                {/*
                  A luz é nossa, não do modelo: um GLB carrega geometria e
                  material, nunca uma fonte de luz. Sem esta pointLight o
                  abajur seria um objeto com cúpula clara e nada acesa.
                  Altura casada com a cúpula do modelo (0,86 x 1,6 ≈ 1,38m).
                */}
                <pointLight position={[0, ALTURA_ABAJUR - 0.12, 0]} color={LAMP_LIGHT_COLOR} intensity={7} distance={3.2} decay={2}/>
            </group>
        </group>
    );
}
