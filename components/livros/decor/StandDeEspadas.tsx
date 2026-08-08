'use client';

import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';

/**
 * Duas espadas sobre uma placa de madeira, na parede lateral direita.
 *
 * As espadas foram escolhidas pelo dono do acervo (poly.pizza, CC BY — ver
 * LICENSE.md): uma curta com textura embutida e uma longa com seis materiais.
 *
 * A placa de madeira atrás não é enfeite — mesma regra da prateleira aérea e do
 * escudo escoteiro: objeto colado direto numa parede escura, sem sombra
 * projetada, lê como adesivo.
 */

const COR_PLACA = '#43301f';

/**
 * Comprimento de cada espada, ponta ao pomo. Diferentes de propósito — duas
 * lâminas do mesmo tamanho leem como um par de fábrica, e o que se pendura na
 * parede costuma ser o oposto disso.
 */
const COMPRIMENTO_LONGA_M = 0.88;
const COMPRIMENTO_CURTA_M = 0.72;
/** Distância de cada espada até a linha do meio da placa. */
const SEPARACAO_M = 0.12;

/**
 * As duas apontam a lâmina para +Y no arquivo (medido: o pomo fica na base, a
 * guarda logo acima e a lâmina sobe). Um quarto de volta em Z deita a espada;
 * o SINAL dessa volta é o que manda a ponta para um lado ou para o outro.
 *
 * O deslocamento em X vem junto e não é opcional: KenneyModel assenta a base
 * da peça na origem do grupo, então uma espada deitada se estende inteira para
 * um lado — sem empurrar meio comprimento na direção contrária, ela nasceria
 * com o cabo no centro da placa e a lâmina toda para fora.
 */
function EspadaDeitada({url, comprimento, paraEsquerda, y, cores}: {
    url: string;
    comprimento: number;
    paraEsquerda: boolean;
    y: number;
    cores?: Record<string, string>;
}) {
    const sinal = paraEsquerda ? 1 : -1;
    return (
        <group position={[(sinal * comprimento) / 2, y, 0]} rotation={[0, 0, (sinal * Math.PI) / 2]}>
            <KenneyModel url={url} alturaAlvo={comprimento} cores={cores}/>
        </group>
    );
}

type StandDeEspadasProps = {
    /** Ponto na parede: [x da parede, altura do centro, z]. */
    position: [number, number, number];
    /** Para que lado a parede olha: -1 quando a normal aponta para -x (parede direita). */
    normal?: -1 | 1;
};

export default function StandDeEspadas({position, normal = -1}: StandDeEspadasProps) {
    const [xParede, y, z] = position;

    return (
        // Meia volta em Y quando a parede é a da direita: sem isso o conjunto
        // fica com o lado de trás para a sala. O grupo inteiro é girado, não
        // cada peça — e é esse giro que transforma o plano XY local, onde tudo
        // aqui dentro é posicionado, no plano da parede.
        <group position={[xParede + normal * 0.04, y, z]} rotation={[0, (normal * Math.PI) / 2, 0]}>
            {/* Placa rente à parede, atrás das espadas. */}
            <mesh position={[0, 0, -0.03]} castShadow>
                <boxGeometry args={[0.42, 0.3, 0.025]}/>
                <meshStandardMaterial color={COR_PLACA} roughness={0.75}/>
            </mesh>

            {/*
              Paralelas, uma acima da outra, com as pontas em direções opostas.
              A longa em cima; os materiais dela vêm quase pretos do arquivo e
              sumiriam nesta parede escura, daí o mapa de cores. A curta traz
              textura própria e não leva mapa nenhum.
            */}
            <EspadaDeitada
                url={MODELOS.espadaLonga}
                comprimento={COMPRIMENTO_LONGA_M}
                paraEsquerda
                y={SEPARACAO_M}
                cores={{
                    Gold: '#c9a24a',
                    Leather: '#4a2f1e',
                    Metal: '#b9c2cc',
                    Metal_2: '#98a3ad',
                    Material: '#5a5f66',
                    'Material.001': '#7d8790',
                }}
            />
            <EspadaDeitada
                url={MODELOS.espadaCurta}
                comprimento={COMPRIMENTO_CURTA_M}
                paraEsquerda={false}
                y={-SEPARACAO_M}
            />
        </group>
    );
}
