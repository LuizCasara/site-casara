'use client';

import {useState} from 'react';
import {Html} from '@react-three/drei';
import {useRouter} from 'next/navigation';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';

/**
 * O canto de estudo sobre o braço direito da mesa em L: uma bíblia aberta, uma
 * folha de anotações ao lado, canetas e marca-textos espalhados e um
 * porta-lápis.
 *
 * A bíblia é o `open-book.glb` do Furniture Kit. O resto é primitiva: um papel é
 * um retângulo fino por definição, uma caneta é um cilindro e um porta-lápis é
 * um copo — modelar isso seria trocar 12 linhas de geometria por três downloads.
 */

/** Largura da bíblia aberta. Uma de estudo, grande, como manda a cena. */
const LARGURA_BIBLIA_M = 0.42;
/**
 * Girada para ser lida de x menor — de onde a cadeira está. Sem isso o texto
 * fica de cabeça para baixo para quem senta e de perfil para a câmera.
 */
const ROT_BIBLIA = -1.35;
/**
 * O livro aberto não é decoração: leva à página da Bíblia, escrita à mão no
 * banco como qualquer outro livro do acervo. Se o slug mudar lá, muda aqui —
 * não há chave estrangeira que proteja isso, é uma string acordada.
 */
const SLUG_DA_BIBLIA = 'biblia-sagrada-nvi';

const COR_PAGINAS = '#e8e0cd';
const COR_CAPA = '#5a1f22';
const COR_PAPEL = '#e4ddcc';
const COR_TINTA = '#3a3a44';
const COR_COPO = '#2b3036';

/** Caneta deitada: cilindro fino, tombado 90° para virar horizontal. */
function Caneta({position, rotationY, cor, comprimento = 0.14, raio = 0.006}: {
    position: [number, number, number];
    rotationY: number;
    cor: string;
    comprimento?: number;
    raio?: number;
}) {
    return (
        <mesh position={position} rotation={[0, rotationY, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[raio, raio, comprimento, 10]}/>
            <meshStandardMaterial color={cor} roughness={0.45}/>
        </mesh>
    );
}

/**
 * @param origem ponto sobre o TAMPO onde este conjunto se assenta — tudo aqui
 *   é posicionado em relação a ele, para o canto de estudo poder ser
 *   deslocado inteiro sem recalcular oito coordenadas à mão.
 */
export default function ItensDeEstudo({origem, isMobile = false}: {
    origem: [number, number, number];
    isMobile?: boolean;
}) {
    const [ox, oy, oz] = origem;
    const router = useRouter();
    const [hovered, setHovered] = useState(false);

    return (
        <group>
            {/* A bíblia é o único item DAQUI que é interativo: clicar nela abre
                a página do livro, como qualquer lombada da estante. Ela não
                entra no acervo por ano de leitura (status `referencia`), mas tem
                página própria como os outros. */}
            <group
                onPointerOver={(e) => {
                    if (isMobile) return;
                    e.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                    if (isMobile) return;
                    e.stopPropagation();
                    setHovered(false);
                    document.body.style.cursor = 'auto';
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/livros/${SLUG_DA_BIBLIA}`);
                }}
            >
                <KenneyModel
                    url={MODELOS.livroAberto}
                    position={[ox, oy, oz]}
                    rotation={[0, ROT_BIBLIA, 0]}
                    larguraAlvo={LARGURA_BIBLIA_M}
                    cores={{Beige: hovered ? '#fff8e8' : COR_PAGINAS, DarkRed: COR_CAPA}}
                />
                {/* Área de clique maior que o livro: aberto ele é baixo e
                    achatado, e acertar as páginas com o mouse seria mira de
                    precisão. */}
                <mesh position={[ox, oy + 0.04, oz]}>
                    <boxGeometry args={[LARGURA_BIBLIA_M, 0.1, LARGURA_BIBLIA_M * 0.8]}/>
                    <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
                </mesh>
                {hovered && !isMobile && (
                    <Html position={[ox, oy + 0.14, oz]} center style={{pointerEvents: 'none'}}>
                        <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                         text-[11px] font-semibold text-white shadow-lg">
                            Bíblia Sagrada NVI
                        </span>
                    </Html>
                )}
            </group>

            {/*
              Folha de anotações fora de esquadro com a borda da mesa: alinhada
              demais lê como ícone; torta, lê como papel que alguém largou ali.

              As "anotações" são cinco fiapos escuros de comprimentos diferentes
              — nesta distância é o que se vê de um rascunho manuscrito, e é mais
              barato que uma textura.
            */}
            <group position={[ox + 0.04, oy, oz + 0.34]} rotation={[0, -1.15, 0]}>
                <mesh position={[0, 0.001, 0]} receiveShadow>
                    <boxGeometry args={[0.21, 0.002, 0.29]}/>
                    <meshStandardMaterial color={COR_PAPEL} roughness={0.95}/>
                </mesh>
                {[0.09, 0.04, -0.01, -0.06, -0.11].map((z, i) => (
                    <mesh key={z} position={[[-0.02, 0.01, -0.03, 0.0, -0.04][i], 0.0025, z]}>
                        <boxGeometry args={[[0.15, 0.13, 0.16, 0.11, 0.09][i], 0.0005, 0.004]}/>
                        <meshStandardMaterial color={COR_TINTA} roughness={1}/>
                    </mesh>
                ))}
            </group>

            {/* Canetas e marca-textos espalhados: nenhum paralelo ao outro. */}
            <Caneta position={[ox - 0.17, oy + 0.006, oz + 0.30]} rotationY={-0.9} cor="#3b6fb5"/>
            <Caneta position={[ox - 0.11, oy + 0.006, oz + 0.40]} rotationY={-1.5} cor="#b53b3b"/>
            {/* Marca-textos: mais gordos e mais curtos que caneta. */}
            <Caneta position={[ox + 0.20, oy + 0.009, oz + 0.14]} rotationY={-0.45}
                    cor="#e8d44d" comprimento={0.11} raio={0.009}/>
            <Caneta position={[ox + 0.24, oy + 0.009, oz + 0.22]} rotationY={-0.2}
                    cor="#6fc26f" comprimento={0.11} raio={0.009}/>

            {/*
              Porta-lápis encostado no canto. `openEnded` porque um copo é um
              tubo: com as tampas, as canetas de dentro sumiriam atrás de um
              fundo sólido visto de cima. E `side={2}` (DoubleSide) junto, pela
              mesma razão — sem isso a parede de trás do tubo, vista por
              dentro, seria descartada e o copo apareceria pela metade.
            */}
            <group position={[ox + 0.26, oy, oz - 0.22]}>
                <mesh position={[0, 0.05, 0]} castShadow>
                    <cylinderGeometry args={[0.045, 0.04, 0.10, 14, 1, true]}/>
                    <meshStandardMaterial color={COR_COPO} roughness={0.6} side={2}/>
                </mesh>
                {[
                    {x: 0.012, z: 0.01, incl: 0.12, cor: '#e86fa8'},
                    {x: -0.014, z: 0.008, incl: -0.09, cor: '#3b6fb5'},
                    {x: 0.004, z: -0.016, incl: 0.05, cor: '#e8d44d'},
                ].map(({x, z, incl, cor}) => (
                    <mesh key={cor} position={[x, 0.10, z]} rotation={[incl, 0, incl * 0.8]} castShadow>
                        <cylinderGeometry args={[0.006, 0.006, 0.17, 8]}/>
                        <meshStandardMaterial color={cor} roughness={0.45}/>
                    </mesh>
                ))}
            </group>
        </group>
    );
}
