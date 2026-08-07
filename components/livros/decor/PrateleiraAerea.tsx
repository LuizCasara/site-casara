'use client';

import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import CaixaDeSom, {type CaixaDeSomProps} from '@/components/livros/decor/CaixaDeSom';

/**
 * Prateleira aérea na parede de fundo, acima dos monitores, com troféus e
 * vasinhos de planta.
 *
 * Os vasos são o `potted-plant` do Furniture Kit; os troféus são primitivas —
 * uma taça é base, haste e copo, três cilindros.
 *
 * **As mãos-francesas não são enfeite.** Sem sombra projetada nem suporte
 * visível, uma tábua colada na parede não lê como prateleira: lê como retângulo
 * pairando na frente do reboco. Mesma regra do escudo escoteiro e do stand de
 * espadas — objeto de parede precisa de volume próprio atrás.
 */

const COR_MADEIRA = '#43301f';
const COR_SUPORTE = '#2b2320';
const COR_TROFEU = '#c9a24a';
const COR_BASE_TROFEU = '#2b2320';

const ESPESSURA_M = 0.04;
const PROFUNDIDADE_M = 0.22;

/** Deslocamento da caixa de som em relação ao centro da tábua: o vão livre
 *  entre os troféus (à esquerda) e o primeiro vaso. */
const CAIXA_DESLOC_X = -0.18;

/**
 * Onde a caixa de som assenta, no mundo, dada a posição da prateleira.
 *
 * Exportada porque o CameraRig precisa enquadrá-la e essa conta envolve três
 * números que só existem aqui dentro (o vão livre da tábua, a espessura dela e
 * a profundidade). Copiá-los para o CameraRig faria a câmera apontar para o
 * lugar errado no dia em que a prateleira mudar de tamanho — mesmo motivo de
 * ESTANTE_ANCHOR e ESTANTE_AMARELA_ANCHOR existirem.
 */
export function posicaoDaCaixaDeSom(
    [x, y, z]: [number, number, number],
): [number, number, number] {
    return [x + CAIXA_DESLOC_X, y + ESPESSURA_M / 2, z + PROFUNDIDADE_M / 2 - 0.005];
}

/** Taça: base larga, haste fina, copo cônico. Nesta escala é o bastante. */
function Trofeu({position, altura}: {position: [number, number, number]; altura: number}) {
    // Proporções derivadas da altura para os dois troféus não parecerem o
    // mesmo objeto redimensionado sem critério.
    const base = altura * 0.18;
    const haste = altura * 0.3;
    const copo = altura * 0.52;

    return (
        <group position={position}>
            <mesh position={[0, base / 2, 0]} castShadow>
                <cylinderGeometry args={[altura * 0.3, altura * 0.34, base, 12]}/>
                <meshStandardMaterial color={COR_BASE_TROFEU} roughness={0.5}/>
            </mesh>
            <mesh position={[0, base + haste / 2, 0]}>
                <cylinderGeometry args={[altura * 0.05, altura * 0.05, haste, 8]}/>
                <meshStandardMaterial color={COR_TROFEU} roughness={0.35} metalness={0.7}/>
            </mesh>
            <mesh position={[0, base + haste + copo / 2, 0]} castShadow>
                <cylinderGeometry args={[altura * 0.28, altura * 0.12, copo, 12]}/>
                <meshStandardMaterial color={COR_TROFEU} roughness={0.3} metalness={0.75}/>
            </mesh>
        </group>
    );
}

type PrateleiraAereaProps = {
    /** Centro da prateleira: [x, altura do tampo dela, z da parede]. */
    position: [number, number, number];
    larguraM: number;
    /**
     * A caixa de som, quando há áudio na sala. Opcional para a prateleira
     * continuar montável sem ele — e os controles chegam de fora porque quem
     * sabe o que está tocando é o CantoDeTrabalho, não a tábua da parede.
     *
     * Onde a caixa fica é decisão DAQUI, não de quem passa as props: esta
     * prateleira já posiciona troféus e vasos, e espalhar os objetos dela por
     * dois arquivos acabaria com dois deles no mesmo ponto.
     */
    caixaDeSom?: Omit<CaixaDeSomProps, 'position' | 'rotationY'>;
};

export default function PrateleiraAerea({position, larguraM, caixaDeSom}: PrateleiraAereaProps) {
    const [x, y, z] = position;
    // A prateleira encosta na parede e avança para a sala, então o centro dela
    // fica meia profundidade à frente do plano da parede.
    const zCentro = z + PROFUNDIDADE_M / 2;
    const topo = y + ESPESSURA_M / 2;

    return (
        <group>
            <mesh position={[x, y, zCentro]} castShadow receiveShadow>
                <boxGeometry args={[larguraM, ESPESSURA_M, PROFUNDIDADE_M]}/>
                <meshStandardMaterial color={COR_MADEIRA} roughness={0.7}/>
            </mesh>

            {/* Mãos-francesas: uma diagonal de cada lado, da parede até a
                ponta da tábua. Giradas em X, o eixo que as deixa no plano
                vertical perpendicular à parede de fundo. */}
            {[-larguraM / 2 + 0.12, larguraM / 2 - 0.12].map((dx) => (
                <mesh
                    key={dx}
                    position={[x + dx, y - 0.09, z + 0.09]}
                    rotation={[Math.PI / 4, 0, 0]}
                >
                    <boxGeometry args={[0.025, 0.25, 0.02]}/>
                    <meshStandardMaterial color={COR_SUPORTE} roughness={0.8}/>
                </mesh>
            ))}

            {/*
              O que fica em cima. Espalhado sem simetria: dois troféus juntos
              de um lado (como troféus de verdade ficam, em fileira) e os vasos
              soltos, um deles fora do centro da tábua.
            */}
            <Trofeu position={[x - larguraM / 2 + 0.16, topo, zCentro]} altura={0.19}/>
            <Trofeu position={[x - larguraM / 2 + 0.32, topo, zCentro + 0.01]} altura={0.14}/>
            {/*
              A caixa de som ocupa o vão entre os troféus e o primeiro vaso — o
              único trecho livre da tábua. Levemente girada para a sala, como
              uma caixa de verdade estaria: apontada para quem senta, não
              paralela à parede.
            */}
            {caixaDeSom && (
                <CaixaDeSom
                    position={posicaoDaCaixaDeSom(position)}
                    rotationY={0.22}
                    {...caixaDeSom}
                />
            )}
            <KenneyModel
                url={MODELOS.planta}
                position={[x + 0.06, topo, zCentro - 0.01]}
                alturaAlvo={0.24}
                cores={{wood: '#8a5a3a', woodDark: '#6a3f28', plant: '#4a7a52'}}
            />
            <KenneyModel
                url={MODELOS.planta}
                position={[x + larguraM / 2 - 0.18, topo, zCentro + 0.02]}
                rotation={[0, 0.7, 0]}
                alturaAlvo={0.19}
                cores={{wood: '#a05a3a', woodDark: '#7a3f28', plant: '#3f7a4a'}}
            />
        </group>
    );
}
