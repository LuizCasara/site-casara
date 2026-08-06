'use client';

import {useState} from 'react';
import {Html, useTexture} from '@react-three/drei';
import {trackOutboundClick} from '@/utils/analytics';

/**
 * Escudo redondo de madeira com o emblema do escotismo mundial, pendurado na
 * parede ao lado da estante amarela.
 *
 * O emblema não é geometria: é uma TEXTURA,
 * `public/livros/escoteiro-flor-de-lis.png`. Modelar uma flor de lis com
 * volume daria dezenas de curvas para um objeto de 38cm visto a três metros.
 *
 * **PNG e não o SVG que o gerou**, embora os dois funcionem: o three.js
 * carrega SVG por `<img>`, e aí a rasterização fica por conta do navegador —
 * a resolução com que ele decide desenhar um SVG destinado a virar textura não
 * é definida em lugar nenhum, e varia. O PNG já sai em 512px, sempre igual.
 * Para regerar depois de mexer no SVG:
 *
 *     node -e "require('sharp')('public/livros/escoteiro-flor-de-lis.svg',
 *       {density:300}).resize(512,512).png().toFile('public/livros/escoteiro-flor-de-lis.png')"
 *
 * A base de madeira atrás importa tanto quanto o emblema — mesma regra da
 * prateleira aérea e do stand de espadas: imagem colada em parede escura, sem
 * sombra projetada, lê como adesivo.
 */

const COR_MADEIRA = '#43301f';
const RAIO_M = 0.19;
const ESPESSURA_M = 0.025;

/** O grupo escoteiro do dono do acervo — o escudo é um link para ele. */
const SITE_DO_GRUPO = 'https://gealdeiaverde.org';

type EscudoEscoteiroProps = {
    /** Ponto na parede: [x da parede, altura do centro, z]. */
    position: [number, number, number];
    /** Para que lado a parede olha: +1 na parede esquerda, cuja normal aponta para +x. */
    normal?: -1 | 1;
    isMobile?: boolean;
};

export default function EscudoEscoteiro({position, normal = 1, isMobile = false}: EscudoEscoteiroProps) {
    const [xParede, y, z] = position;
    const [hovered, setHovered] = useState(false);
    const emblema = useTexture('/livros/escoteiro-flor-de-lis.png');

    const abrirSite = () => {
        // Antes do window.open: depois dele a aba pode já ter perdido o foco.
        trackOutboundClick('gealdeiaverde');
        // `noopener` não é detalhe: sem ele a página aberta recebe uma
        // referência a esta pelo `window.opener` e pode navegá-la para
        // qualquer lugar.
        window.open(SITE_DO_GRUPO, '_blank', 'noopener,noreferrer');
    };

    return (
        // Um quarto de volta em Y encosta a peça na parede: depois dele, o Z
        // local (para onde as faces olham) aponta para dentro da sala.
        <group
            position={[xParede + normal * 0.03, y, z]}
            rotation={[0, (normal * Math.PI) / 2, 0]}
            onPointerOver={(e) => {
                // Mesmo guard do Book e da lava lamp (ver LavaLamp.tsx).
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
                abrirSite();
            }}
        >
            {/* O disco é um cilindro deitado: o eixo dele nasce em Y, então a
                meia volta em X é o que o faz encarar a sala. */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[RAIO_M, RAIO_M, ESPESSURA_M, 32]}/>
                <meshStandardMaterial color={COR_MADEIRA} roughness={0.75}/>
            </mesh>
            {/* Emblema um fio à frente da madeira, para não disputar pixel com
                ela (z-fighting). No hover ele ACENDE de leve, em vez de mudar de
                tamanho ou de cor: é a pista de que a peça responde ao clique,
                sem virar um botão colado na parede. */}
            <mesh position={[0, 0, ESPESSURA_M / 2 + 0.002]}>
                <circleGeometry args={[RAIO_M * 0.86, 32]}/>
                <meshStandardMaterial
                    map={emblema}
                    roughness={0.85}
                    emissive="#ffffff"
                    emissiveMap={emblema}
                    emissiveIntensity={hovered && !isMobile ? 0.35 : 0}
                />
            </mesh>

            {hovered && !isMobile && (
                <Html position={[0, RAIO_M + 0.05, 0.02]} center style={{pointerEvents: 'none'}}>
                    <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                     text-[11px] font-semibold text-white shadow-lg">
                        G.E. Aldeia Verde ↗
                    </span>
                </Html>
            )}
        </group>
    );
}
