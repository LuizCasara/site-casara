'use client';

import {useState} from 'react';
import {Html} from '@react-three/drei';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';

/**
 * Verde de lâmpada acesa, não verde de folha: bem claro e saturado, porque é
 * a MESMA cor que vai no `color` e no `emissive` do líquido. Um verde escuro
 * ficaria correto no material e invisível como brilho.
 */
const COR_LAVA = '#3ddc84';

/**
 * Os nomes de material do modelo, que não são semânticos como os do Kenney
 * (`wood`, `metal`): vieram de um exportador que numera os slots. Descobertos
 * lendo o .glb — `mat8` é o único material vermelho, `mat25` é o vidro
 * translúcido (alpha 0.4) e `mat22` é a base cinza.
 */
const MAT_LIQUIDO = 'mat8';
const MAT_BASE = 'mat22';

const LUZ_PARADA = 0.5;
/** No hover a lâmpada "acende" — é o único aviso de que ela responde ao clique. */
const LUZ_HOVER = 1.2;

type LavaLampProps = {
    position: [number, number, number];
    alturaM?: number;
    /**
     * Quando presente, a lâmpada vira o botão do Índice: ganha etiqueta, cursor
     * e clique. Sem isso ela é só enfeite aceso — é o que acontece com um livro
     * aberto por cima da sala, onde não há índice para abrir.
     */
    onOpen?: () => void;
    isMobile?: boolean;
    /**
     * Mostra a etiqueta mesmo sem hover. Ligado só na cena da estante, igual às
     * etiquetas de ano dos nichos: de longe, um balão de texto em tamanho fixo
     * de pixels sobre um móvel do tamanho de um selo polui mais do que informa.
     */
    mostrarEtiqueta?: boolean;
};

/**
 * Lava lamp — o único objeto aceso da estante (Jarlan Perez, CC BY 3.0 — ver
 * LICENSE.md).
 *
 * Ela É o Índice do acervo: fica na estante, a um palmo das lombadas, então
 * filtrar por categoria ou tag acontece olhando para os livros que somem e
 * aparecem, não para o outro lado da sala.
 *
 * O brilho vem de duas coisas somadas, com trabalhos diferentes:
 *
 * 1. `emissivos` no líquido: o próprio material acende. Basta para a lâmpada
 *    aparecer no escuro, e é o que o <Bloom> da cena transforma em halo.
 * 2. A `pointLight`: sem ela nada em volta recebe o verde — a lâmpada brilharia
 *    com a prateleira e as lombadas vizinhas continuando marrons, que é o efeito
 *    de adesivo. Fraca e de alcance curto (0,9m): o pedido é um glow sutil, e
 *    passar disso ela vira um holofote esverdeado no nicho.
 *
 * Altura padrão de 0,30m: o mesmo tamanho de um livro nesta escala, e cabe com
 * folga nos 0,34m de vão do nicho.
 */
export default function LavaLamp({
    position, alturaM = 0.30, onOpen, isMobile = false, mostrarEtiqueta = false,
}: LavaLampProps) {
    const [hovered, setHovered] = useState(false);
    const interativa = onOpen !== undefined;
    const aceso = hovered && interativa;

    return (
        <group position={position}>
            <KenneyModel
                url={MODELOS.lavaLamp}
                alturaAlvo={alturaM}
                cores={{[MAT_LIQUIDO]: COR_LAVA, [MAT_BASE]: '#3a2f2b'}}
                emissivos={{[MAT_LIQUIDO]: {cor: COR_LAVA, intensidade: aceso ? 2.2 : 1.4}}}
            />
            {/* Na altura do bojo, não da base: é de lá que a luz sairia. */}
            <pointLight
                position={[0, alturaM * 0.55, 0]}
                color={COR_LAVA}
                intensity={aceso ? LUZ_HOVER : LUZ_PARADA}
                distance={0.9}
                decay={2}
            />

            {interativa && (
                <>
                    {/* Área de clique invisível, bem maior que o vidro — mesmo
                        motivo da hitbox do livro: a lâmpada tem 7cm de largura e
                        vira um punhado de pixels na cena "Sala". */}
                    <mesh
                        position={[0, alturaM / 2, 0]}
                        onPointerOver={(e) => {
                            // Toque sintetiza pointerover sem o pointerout
                            // correspondente, e a lâmpada ficaria acesa pra
                            // sempre num aparelho touch (mesmo guard do Book).
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
                            onOpen();
                        }}
                    >
                        <boxGeometry args={[0.16, alturaM + 0.04, 0.16]}/>
                        <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
                    </mesh>

                    {/* A etiqueta aparece no hover OU na cena da estante — as
                        mesmas duas condições das etiquetas de ano nos nichos, e
                        sem `distanceFactor` pelo mesmo motivo. Fora daí a
                        lâmpada é só uma luz acesa na prateleira. */}
                    {(aceso || mostrarEtiqueta) && (
                        <Html position={[0, alturaM + 0.06, 0]} center style={{pointerEvents: 'none'}}>
                            <span
                                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px]
                                            font-semibold shadow transition ${
                                    aceso ? 'bg-white text-black' : 'bg-black/70 text-white/90'
                                }`}
                            >
                                Índice
                            </span>
                        </Html>
                    )}
                </>
            )}
        </group>
    );
}
