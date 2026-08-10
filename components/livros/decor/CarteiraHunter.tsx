'use client';

import {useState} from 'react';
import {Html, useTexture} from '@react-three/drei';

/**
 * A carteira de caçador — um cartão encostado no fundo de uma vitrine da
 * estante, dois andares abaixo da lava lamp.
 *
 * **É primitiva, não `.glb`.** Um cartão é um retângulo de nove centímetros com
 * uma arte na frente: uma `boxGeometry` fina resolve igual a esta distância e
 * poupa um download, uma pré-carga e mais uma atribuição de licença — a mesma
 * decisão dos post-its da gaveta.
 *
 * **Ela fica DEITADA de frente para cima**, largada na prateleira como um cartão
 * que alguém tirou do bolso e pousou ali — não escorada no fundo do móvel. É a
 * pose que a arte inteira fica à mostra, e a que faz a peça ler como objeto
 * esquecido em vez de item exposto numa vitrine de loja.
 *
 * Deitada, ela depende da câmera olhar DE CIMA para se ver: as paradas da sala
 * ficam entre 1,2m e 1,6m e miram um pouco para baixo, e a vitrine está a 79cm,
 * então o cartão cai no campo delas. Fosse num nicho alto, a mesma pose o
 * deixaria de perfil e praticamente invisível.
 *
 * O clique NÃO mexe na câmera, ao contrário da gaveta: o conteúdo da carteira é
 * um painel DOM, e ele já chega em tamanho de leitura. Aproximar por trás dele
 * seria o segundo movimento brigando com o primeiro — a mesma razão pela qual a
 * câmera não se move ao abrir um livro.
 */

/**
 * Largura do cartão.
 *
 * Um cartão de verdade tem 8,6cm, e este tem 10 — 16% maior, pela mesma lógica
 * que faz os livros desta sala serem maiores que livros reais: a peça precisa
 * dizer o que é a três metros de distância. Dez centímetros ainda deixam 2,4cm
 * de cada lado dentro dos 14,9cm da vitrine, então continua sendo um objeto
 * apoiado num compartimento e não um cartaz entalado nele.
 */
const LARGURA_M = 0.10;
/** A proporção é a de um cartão (1,586), e é também a da arte recortada. */
const ALTURA_M = LARGURA_M / 1.586;
const ESPESSURA_M = 0.0012;

/**
 * Um quarto de volta para trás, que é o que deita o cartão de frente para cima.
 *
 * **Negativo, e isso não é escolha de estilo.** A face pintada de um plano olha
 * para o +Z local; girando −90° em X, esse +Z vira o +Y do mundo — a arte encara
 * o teto. Com +90° ela encararia o chão, e o que se veria na prateleira seria o
 * verso branco do plástico.
 *
 * O mesmo giro leva o "alto" do cartão (+Y local) para −Z do mundo, ou seja,
 * para o fundo da estante. É o que faz o texto sair na leitura certa para quem
 * olha de fora do móvel, e não de cabeça para baixo.
 */
const DEITADO_RAD = -Math.PI / 2;
/** Um giro de nada, para o cartão não ficar no esquadro perfeito da prateleira. */
const GIRO_RAD = 0.07;

/** Plástico claro, para os cantos brancos da arte não destoarem da borda. */
const COR_PLASTICO = '#e9edf2';

type CarteiraHunterProps = {
    /**
     * Ponto da PRATELEIRA sob o cartão — o mesmo contrato de posicionamento do
     * `KenneyModel`, e não o centro da peça: quem monta pensa em "onde ela se
     * apoia", e a conta do tombo é problema daqui.
     */
    position: [number, number, number];
    /**
     * Quando presente, a carteira vira clicável e ganha etiqueta. Sem isso ela é
     * só um enfeite na vitrine — é o que acontece com um livro aberto por cima
     * da sala, igual à lava lamp e ao interruptor.
     */
    onAbrir?: () => void;
    isMobile?: boolean;
    /** Mostra a etiqueta sem hover, só na cena da estante — igual à lava lamp. */
    mostrarEtiqueta?: boolean;
};

export default function CarteiraHunter({
    position, onAbrir, isMobile = false, mostrarEtiqueta = false,
}: CarteiraHunterProps) {
    const arte = useTexture('/livros/carteira-hunter.png');
    const [hovered, setHovered] = useState(false);
    const interativa = onAbrir !== undefined;
    const aceso = hovered && interativa && !isMobile;

    return (
        <group
            // Deitado, o que sobe do apoio é só a ESPESSURA do cartão. Meia
            // espessura porque a `boxGeometry` é centrada no próprio pivô — sem
            // isso, metade dele ficaria dentro da madeira.
            position={[position[0], position[1] + ESPESSURA_M / 2, position[2]]}
            // A ordem padrão do three é XYZ: o quarto de volta que deita a peça
            // é aplicado ANTES do giro decorativo, então este último acontece no
            // plano da prateleira — que é o eixo em que um cartão largado numa
            // superfície de fato fica torto.
            rotation={[DEITADO_RAD, GIRO_RAD, 0]}
        >
            <mesh castShadow>
                <boxGeometry args={[LARGURA_M, ALTURA_M, ESPESSURA_M]}/>
                <meshStandardMaterial color={COR_PLASTICO} roughness={0.35} metalness={0.1}/>
            </mesh>

            {/*
              A arte, um fio à frente do plástico para não disputar pixel com ele
              (z-fighting) — mesma solução do Quadro e do escudo escoteiro.

              No hover ela ACENDE de leve, em vez de mudar de tamanho ou de cor:
              é a pista de que a peça responde ao clique sem virar um botão
              apoiado na prateleira. O `emissiveMap` faz o brilho seguir o
              desenho, então a parte escura do cartão continua escura.
            */}
            <mesh position={[0, 0, ESPESSURA_M / 2 + 0.0004]}>
                <planeGeometry args={[LARGURA_M, ALTURA_M]}/>
                <meshStandardMaterial
                    map={arte}
                    roughness={0.4}
                    emissive="#ffffff"
                    emissiveMap={arte}
                    emissiveIntensity={aceso ? 0.4 : 0}
                />
            </mesh>

            {interativa && (
                <>
                    {/*
                      Área de clique invisível, bem maior que o cartão — mesmo
                      motivo da hitbox da lava lamp e do livro: são 10cm de
                      plástico dentro de uma vitrine, e acertá-los com o mouse
                      da cena "Sala" seria mira de precisão.
                    */}
                    <mesh
                        onPointerOver={(e) => {
                            // Toque sintetiza pointerover sem o pointerout
                            // correspondente, e o cartão ficaria aceso para
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
                            onAbrir();
                        }}
                    >
                        <boxGeometry args={[LARGURA_M + 0.05, ALTURA_M + 0.05, 0.06]}/>
                        <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
                    </mesh>

                    {/* Etiqueta no hover OU na cena da estante, as mesmas duas
                        condições da lava lamp e das etiquetas de ano.

                        **O deslocamento é em Z local, não em Y.** Este grupo
                        está deitado, então o +Z local é que aponta para cima no
                        mundo — um `[0, 0.08, 0]` aqui jogaria o balão para
                        dentro do fundo da estante. */}
                    {(aceso || mostrarEtiqueta) && (
                        <Html position={[0, 0, 0.08]} center style={{pointerEvents: 'none'}}>
                            <span
                                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px]
                                            font-semibold shadow transition ${
                                    aceso ? 'bg-white text-black' : 'bg-black/70 text-white/90'
                                }`}
                            >
                                Licença Hunter
                            </span>
                        </Html>
                    )}
                </>
            )}
        </group>
    );
}
