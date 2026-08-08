'use client';

import {useMemo, useRef, useState} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {MathUtils} from 'three';
import type * as THREE from 'three';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import {useLuzSuave} from '@/components/livros/decor/use-luz-suave';
import {useHoraDoDia} from '@/components/livros/decor/use-hora-do-dia';
import {useTexturaDeCeu} from '@/components/livros/decor/use-textura-de-ceu';
import {climaDaHora, profundidadeDaLuz} from '@/lib/luz-do-dia.mjs';
import {
    JANELA_NATIVA, PROFUNDIDADE, VIDRO_Z, CORTINAS, estadoDaCortina,
} from '@/lib/janela-model.mjs';

/**
 * A janela da parede lateral direita, entre a quina do canto de trabalho e o
 * stand de espadas.
 *
 * **O lado de fora é a hora de verdade de quem está vendo.** Às sete da manhã o
 * vidro mostra o sol subindo e joga luz quente no chão; às onze da noite mostra
 * o céu escuro com estrelas e a luz que entra é fria. Quem manda nisso é
 * `lib/luz-do-dia.mjs`, e a hora vem do mesmo relógio que o display da
 * prateleira aérea mostra (`use-hora-do-dia.ts`) — as duas coisas aparecem na
 * mesma tela e não podem discordar.
 *
 * **Com a cortina fechada, nada disso é revelado**, e não por um interruptor
 * escondido: as duas cortinas simplesmente cobrem o vidro inteiro, e a luz que
 * entra vai a zero junto. É a geometria fazendo o trabalho, o que também
 * significa que não existe estado inconsistente possível entre "cortina
 * fechada" e "céu à mostra".
 *
 * Clicar abre e fecha. É o gesto que a peça pede, e mantém a regra da sala de
 * que toda função tem um objeto físico — aqui a função é literalmente a do
 * objeto.
 */

/**
 * Largura da janela na parede, em metros.
 *
 * **Não é um número escolhido por gosto: é o que cabe.** A faixa livre da parede
 * direita tem 1,06m — vai da quina com a parede do fundo (z = -1,6) até a ponta
 * da espada longa, que se estende 44cm a partir do centro do stand e alcança
 * z = -0,54. Uma janela de um metro encostaria nas duas coisas; 85cm deixa cerca
 * de dez centímetros de respiro de cada lado.
 */
export const JANELA_LARGURA_M = 0.85;

const ESCALA = JANELA_LARGURA_M / JANELA_NATIVA.largura;
export const JANELA_ALTURA_M = JANELA_NATIVA.altura * ESCALA;

/** Folga entre o vidro e o reboco. Pequena e não-zero: o vidro precisa ficar do
 *  lado de DENTRO da parede (que é opaca e esconderia o céu) sem encostar nela
 *  a ponto de as duas superfícies brigarem por pixel. */
const FOLGA_DA_PAREDE_M = 0.012;

/**
 * Quanto o CENTRO da peça recua da parede.
 *
 * Derivado das medidas do `.glb`, e não escolhido: o `KenneyModel` centra a
 * peça na profundidade, então o vidro (que fica na face +z, ver `PROFUNDIDADE`)
 * está meia espessura à frente do centro. Escrito à mão, este número sairia do
 * ar no dia em que `JANELA_LARGURA_M` mudasse — e o sintoma seria o céu
 * piscando contra a parede, um defeito que ninguém associa a uma constante.
 */
const CENTRO_Z_NATIVO = (PROFUNDIDADE.min + PROFUNDIDADE.max) / 2;
export const JANELA_RECUO_M = (VIDRO_Z - CENTRO_Z_NATIVO) * ESCALA + FOLGA_DA_PAREDE_M;

/**
 * Meia volta menos um quarto: o +z do modelo tem que apontar para DENTRO da
 * parede direita (+x do mundo), porque as cortinas dele estão no -z e é esse
 * lado que olha para a sala. Girar para o outro lado deixaria as cortinas do
 * lado de fora, penduradas na rua.
 */
const VIDRO_PARA_FORA = Math.PI / 2;

/** O λ do damp da cortina. Mais lento que o das luzes (3,2): puxar uma cortina
 *  é um gesto de braço, e na velocidade da luz o pano pisca em vez de correr. */
const VELOCIDADE_DA_CORTINA = 2.2;

/**
 * Os dois extremos da mancha de luz no chão, em metros a partir da parede.
 *
 * `profundidadeDaLuz` decide onde entre os dois ela cai a cada hora, e é ela
 * que impede a luz da madrugada de ir parar no fundo da sala — ver o comentário
 * lá, que é onde mora o porquê.
 */
const POCA_PERTO_M = 0.55;
const POCA_LONGE_M = 2.9;

/**
 * O cone do refletor.
 *
 * Estreito e com penumbra moderada, e não largo e muito suave como na primeira
 * versão: `angle` não muda a candela (o three mede intensidade por
 * esferorradiano), então abrir o cone não clareia nada — só espalha a MESMA luz
 * por mais chão e apaga a borda. Com penumbra em 0,8 quase todo o cone era
 * degradê e não sobrava núcleo nenhum para se ver à noite.
 */
const FEIXE = {abertura: 0.5, penumbra: 0.55};

/**
 * Cores da peça na paleta da sala.
 *
 * Os materiais do modelo NÃO têm nome semântico (`mat13`, `mat20`…), ao
 * contrário do Furniture Kit — mesma armadilha da cadeira executiva. Quem é o
 * quê saiu de medir a faixa de cada um nos vértices, e está anotado aqui porque
 * é a única forma de isto continuar legível.
 *
 * O caixilho vem marrom quase preto e a parede é marrom escura: um em cima do
 * outro vira uma mancha só, o mesmo problema que a espada longa e os óculos já
 * tiveram. Sai em osso claro, que é cor de janela e conversa com a espelheira
 * do interruptor e a moldura do quadro de recados.
 *
 * A cortina vem LARANJA PURO (255, 84, 0), que não é desta sala e ainda cruzaria
 * o `luminanceThreshold` do `<Bloom>` virando um borrão aceso na parede. Vai
 * para terracota, que guarda o calor do original e conversa com o tapete.
 */
const CORES = {
    mat20: '#c6bcac', // o caixilho
    mat21: '#a89e8e', // o friso interno
    mat15: '#8d949a', // travessas do vidro e o varão (dividem o material)
    mat13: '#a8674a', // as duas cortinas (idem — a cor é forçosamente a mesma)
};

/**
 * O céu é EMISSIVO, e com intensidade constante.
 *
 * Constante porque `emissivos` entra na chave do memo do `KenneyModel`: um
 * valor que mudasse com a hora refaria o clone do modelo inteiro a cada minuto.
 * Não precisa mudar — quem escurece à noite é a própria textura, cujos pixels
 * já são o céu daquela hora. É a mesma mecânica da tela do monitor, onde o
 * `emissiveMap` faz a imagem acender em vez de uma cor chapada por cima.
 *
 * 0,85 e não 1: em 1 o céu de meio-dia atravessa fundo o limite do `<Bloom>` e
 * o halo come a travessa do caixilho.
 */
const CEU_EMISSIVO = {mat25: {cor: '#ffffff', intensidade: 0.85}};

type JanelaProps = {
    /** Ponto do chão sob o centro da peça, no contrato do `KenneyModel`. */
    position: [number, number, number];
    aberta: boolean;
    /** Ausente = enfeite: sem clique e sem etiqueta, como o interruptor e a
     *  lava lamp quando há um livro aberto. */
    onAlternar?: () => void;
    isMobile?: boolean;
};

export default function Janela({position, aberta, onAlternar, isMobile = false}: JanelaProps) {
    const [hover, setHover] = useState(false);
    const interativo = Boolean(onAlternar);

    const hora = useHoraDoDia();
    const ceu = useTexturaDeCeu(hora);
    const clima = useMemo(() => climaDaHora(hora), [hora]);

    const cortinaEsquerda = useRef<THREE.Object3D>(null);
    const cortinaDireita = useRef<THREE.Object3D>(null);
    const luz = useRef<THREE.SpotLight>(null);
    const alvoDaLuz = useRef<THREE.Object3D>(null);
    /** A abertura ANIMADA, num ref e não em estado: ela muda a cada quadro, e
     *  um `useState` aqui re-renderizaria a árvore 60 vezes por segundo. */
    const abertura = useRef(0);

    // Estável entre renders, como o `articulados` do KenneyModel exige — os
    // refs nunca trocam de identidade, então o mapa também não precisa.
    const articulados = useMemo(() => ({
        [CORTINAS.esquerda.no]: cortinaEsquerda,
        [CORTINAS.direita.no]: cortinaDireita,
    }), []);

    const texturas = useMemo(() => ({mat25: ceu}), [ceu]);

    // A luz que ENTRA acompanha a hora, mas só com a cortina aberta. Zerar aqui
    // é o que torna impossível a sala clarear com o pano fechado — não há um
    // segundo estado dizendo se a luz "deveria" estar passando.
    useLuzSuave(luz, aberta ? clima.intensidade : 0, VELOCIDADE_DA_CORTINA);

    useFrame((_, delta) => {
        // O `target` do refletor é amarrado aqui, e não no JSX: na primeira
        // renderização o ref do alvo ainda é nulo, e um `target={ref.current}`
        // ficaria preso nesse nulo — o R3F não re-renderiza só porque um ref
        // foi preenchido. Uma atribuição por quadro é barata e não tem ordem
        // de montagem para dar errado.
        if (luz.current && alvoDaLuz.current && luz.current.target !== alvoDaLuz.current) {
            luz.current.target = alvoDaLuz.current;
        }

        // `delta` capado pelo mesmo motivo do `useLuzSuave`: uma aba que volta
        // do segundo plano entrega um salto de vários segundos, e o damp viraria
        // corte seco — a cortina apareceria já aberta, sem o gesto.
        abertura.current = MathUtils.damp(
            abertura.current, aberta ? 1 : 0, VELOCIDADE_DA_CORTINA, Math.min(delta, 0.1),
        );

        for (const [lado, ref] of [
            ['esquerda', cortinaEsquerda], ['direita', cortinaDireita],
        ] as const) {
            const no = ref.current;
            if (!no) continue;
            const {escalaX, deslocX} = estadoDaCortina(lado, abertura.current);
            no.scale.x = escalaX;
            no.position.x = deslocX;
        }
    });

    // O ponto do chão onde a luz cai, derivado da hora — ver `profundidadeDaLuz`.
    // Os dois extremos: no pé da parede e quase no meio do cômodo.
    const distanciaDaPoca = POCA_PERTO_M
        + (profundidadeDaLuz(hora) as number) * (POCA_LONGE_M - POCA_PERTO_M);

    return (
        <group
            position={position}
            rotation={[0, VIDRO_PARA_FORA, 0]}
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
                url={MODELOS.janela}
                larguraAlvo={JANELA_LARGURA_M}
                cores={CORES}
                texturas={texturas}
                emissivos={CEU_EMISSIVO}
                articulados={articulados}
            />

            {/*
              Alvo de clique próprio, cobrindo o vão inteiro — mesma razão da
              caixa na frente do interruptor e do monitor. Sem ele, só o tecido e
              as travessas respondem ao ponteiro, e o meio da janela (que é
              justamente para onde se aponta) fica furado quando a cortina abre.
            */}
            <mesh position={[0, JANELA_ALTURA_M / 2, 0.04]}>
                <boxGeometry args={[JANELA_LARGURA_M * 0.95, JANELA_ALTURA_M * 0.9, 0.06]}/>
                <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
            </mesh>

            {/*
              A luz do lado de fora. Fica logo DENTRO do vidro, apontada para o
              chão da sala: um `spotLight` do outro lado da parede funcionaria
              igual (nada aqui projeta sombra), mas deixaria o cone dependendo de
              a parede continuar sem `castShadow` para sempre.

              Sem `castShadow` de propósito: a mancha no chão É o cone do
              refletor, e um mapa de sombra a mais numa cena que já tem quatro
              luzes gerais, o abajur e a lanterna se paga em quadros por segundo
              sem mudar nada que se veja.
            */}
            {/*
              O alvo é um objeto vazio na cena, e não uma coordenada: um
              `spotLight` do three sempre aponta para o `target`, e o `target`
              precisa estar na árvore para ter matriz de mundo. Como ele é filho
              deste mesmo grupo, a mira acompanha a janela se ela mudar de lugar
              na parede — nada aqui é escrito em coordenada do mundo.

              O -z é para DENTRO da sala: o +z do grupo aponta para a parede (ver
              `VIDRO_PARA_FORA`), então a luz que entra caminha no sentido oposto.

              O y é `-position[1]`, ou seja, o CHÃO — a origem deste grupo está
              na altura em que a janela foi pendurada, e a mancha de luz cai no
              piso independentemente de qual seja essa altura.
            */}
            <object3D ref={alvoDaLuz} position={[0, -position[1], -distanciaDaPoca]}/>
            <spotLight
                ref={luz}
                position={[0, JANELA_ALTURA_M / 2, 0.02]}
                color={`rgb(${clima.corDaLuz.join(',')})`}
                intensity={0}
                angle={FEIXE.abertura}
                penumbra={FEIXE.penumbra}
                distance={7}
                decay={2}
            />

            {hover && !isMobile && (
                <Html position={[0, JANELA_ALTURA_M * 0.94, 0]} center style={{pointerEvents: 'none'}}>
                    <span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-0.5
                                     text-[11px] font-semibold text-white shadow-lg">
                        {/* O que o clique FAZ, não o estado atual — mesma regra
                            das etiquetas do monitor e do interruptor. */}
                        {aberta ? 'Fechar a cortina' : 'Abrir a cortina'}
                    </span>
                </Html>
            )}
        </group>
    );
}
