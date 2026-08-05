'use client';

import {Suspense} from 'react';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import CafeCorner from '@/components/livros/decor/CafeCorner';
import Poltrona from '@/components/livros/decor/Poltrona';
import CampingWall from '@/components/livros/decor/CampingWall';
import YellowShelf from '@/components/livros/decor/YellowShelf';
import {Planta, JogoDeTabuleiro, Vinil} from '@/components/livros/decor/PersonalProps';
import {SHELF_ROWS, SHELF_ROW_SPACING_M} from '@/lib/book-dimensions.mjs';

// Mesa de leitura. Ficava em [1.4, ·, 0.9], quase 2,7m da estante — longe o
// bastante pra ler como um segundo cômodo, e a transição de câmera entre os
// dois pontos de vista atravessava a sala inteira. Agora fica ao lado da
// estante, no espaço que a mesa de trabalho removida deixou livre.
const MESA_POSITION: [number, number, number] = [1.3, 0.75, 0.0];
// Angula o tampo em direção ao centro da sala: a mesa "olha" pra quem entra
// em vez de ficar de perfil.
const MESA_ROT_Y = -0.5;
// Desalinho da folha do índice em relação à borda do tampo. Zero deixaria ela
// perfeitamente paralela à mesa, o que lê como ícone de menu; este resto faz
// parecer uma folha que alguém largou ali.
const INDICE_GIRO_RAD = 0.25;

/** Ponto sobre o tampo, dado um deslocamento no espaço local da mesa (já rotacionado). */
function pontoNoTampo(lx: number, lz: number): [number, number, number] {
    const cos = Math.cos(MESA_ROT_Y);
    const sin = Math.sin(MESA_ROT_Y);
    return [
        MESA_POSITION[0] + lx * cos + lz * sin,
        MESA_POSITION[1] + 0.025,
        MESA_POSITION[2] - lx * sin + lz * cos,
    ];
}

export const ROOM_ANCHORS = {
    estante: {
        position: [0, 0.9, -1.4] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
    leitura: {
        position: [0, 1.3, 0.6] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
    mesa: {
        position: MESA_POSITION,
        rotation: [0, MESA_ROT_Y, 0] as [number, number, number],
    },
    // Sobre o tampo, à direita da pilha de livros que ocupa o lado esquerdo.
    // Derivada de MESA_POSITION em vez de escrita à mão: mover a mesa sem
    // mover a folha junto deixava o índice flutuando no ar.
    indice: {
        position: pontoNoTampo(0.17, 0.05),
        rotation: [-Math.PI / 2, 0, MESA_ROT_Y + INDICE_GIRO_RAD] as [number, number, number],
    },
};

const FLOOR_COLOR = '#3a2f2b';
const WALL_COLOR = '#2b2320';
const SHELF_BOARD_COLOR = '#1f1713';
const RUG_COLOR = '#a89584';

// Sobra de prancha de cada lado da fileira de livros. Zero deixaria o livro
// da ponta com a lateral no ar; muito mais que isto e a prateleira lê como
// uma tábua solta na parede, com os livros apertados no meio.
const SHELF_BOARD_MARGIN_M = 0.12;
// Prancha mínima, pra estante de acervo pequeno (ou filtrado até sobrar um
// livro) não virar um toco de madeira.
const SHELF_BOARD_MIN_WIDTH_M = 0.8;

type RoomProps = {
    /**
     * Largura da fileira mais larga de livros, em metros. A prancha acompanha
     * esse número em vez de ter largura fixa: com 2,6m fixos e o acervo
     * dividido em duas fileiras, sobrava quase um metro de madeira vazia de
     * cada lado e a estante parecia grande demais pro que guarda.
     */
    larguraEstanteM?: number;
};

/**
 * Cenário puro — não sabe QUE livros existem, só quanto espaço eles ocupam
 * (`larguraEstanteM`). Publica ROOM_ANCHORS (posição/rotação) para que
 * Bookshelf.tsx, DeskBooks.tsx, IndexSheet.tsx e CameraRig.tsx se posicionem
 * a partir daqui, sem nenhuma lógica de livro vazar para este arquivo.
 */
export default function Room({larguraEstanteM = 0}: RoomProps) {
    const larguraPrancha = Math.max(
        SHELF_BOARD_MIN_WIDTH_M,
        larguraEstanteM + 2 * SHELF_BOARD_MARGIN_M,
    );

    const estante = ROOM_ANCHORS.estante;
    const mesa = ROOM_ANCHORS.mesa;

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[6, 6]}/>
                <meshStandardMaterial color={FLOOR_COLOR} roughness={0.9}/>
            </mesh>

            <mesh position={[0, 1.5, -1.6]}>
                <planeGeometry args={[6, 3]}/>
                <meshStandardMaterial color={WALL_COLOR} roughness={1}/>
            </mesh>

            {/*
              Pranchas físicas da prateleira — os livros assentam no topo
              delas. A profundidade acompanha a escala maior dos livros
              (20cm): com 0,2m eles ficavam com a "bunda" pra fora. A largura
              vem de `larguraEstanteM`, calculado por quem conhece o acervo.

              São SHELF_ROWS pranchas, empilhadas pelo mesmo espaçamento que
              Bookshelf.tsx usa pra distribuir os livros — a âncora `estante` é
              o topo da prancha de baixo, e as de cima sobem a partir dela.
              Este é o único acoplamento entre o cenário e o módulo de
              dimensões: o resto do arquivo continua sem saber que livros
              existem.
            */}
            {Array.from({length: SHELF_ROWS}, (_, fileira) => (
                <mesh
                    key={fileira}
                    position={[
                        estante.position[0],
                        estante.position[1] - 0.02 + fileira * SHELF_ROW_SPACING_M,
                        estante.position[2],
                    ]}
                >
                    <boxGeometry args={[larguraPrancha, 0.04, 0.26]}/>
                    <meshStandardMaterial color={SHELF_BOARD_COLOR} roughness={0.6}/>
                </mesh>
            ))}

            {/*
              Mesa física — o tampo onde DeskBooks.tsx e IndexSheet.tsx
              assentam. Uma perna central é suficiente: não é o foco visual
              da cena, e o spec pede sala low-poly montada com primitivas.
            */}
            <mesh position={[mesa.position[0], mesa.position[1] - 0.02, mesa.position[2]]} rotation={mesa.rotation} receiveShadow>
                <boxGeometry args={[0.7, 0.04, 0.45]}/>
                <meshStandardMaterial color={SHELF_BOARD_COLOR} roughness={0.6}/>
            </mesh>
            <mesh position={[mesa.position[0], (mesa.position[1] - 0.02) / 2, mesa.position[2]]} rotation={mesa.rotation}>
                <boxGeometry args={[0.08, mesa.position[1] - 0.02, 0.08]}/>
                <meshStandardMaterial color={SHELF_BOARD_COLOR} roughness={0.8}/>
            </mesh>

            {/*
              Decoração da fase 6 — um canto só, à esquerda: poltrona,
              mesinha de café e a estante amarela. A estante de livros fica no
              centro, sozinha na parede de fundo, porque ela é o motivo da
              sala existir e qualquer coisa competindo com ela ali rouba
              atenção do acervo.
            */}

            {/*
              Suspense com fallback null: os .glb são carregados por
              `useGLTF`, que suspende enquanto baixa. Sem esta fronteira a
              suspensão sobe até fora do <Canvas> e a sala INTEIRA — estante
              de livros incluída — some até o último móvel chegar. Com ela, a
              sala aparece na hora e a mobília materializa em cima.
            */}
            <Suspense fallback={null}>
            {/*
              Tapete sob o canto de leitura. y=0.004 e não 0: o modelo tem
              1cm de espessura, mas a face de baixo dele fica no mesmo plano
              do piso e os dois disputariam cada pixel (z-fighting),
              aparecendo em faixas tremidas.
            */}
            <KenneyModel
                url={MODELOS.tapete}
                position={[-1.4, 0.004, -0.15]}
                rotation={[0, Math.PI / 2, 0]}
                larguraAlvo={2.1}
                cores={{carpet: RUG_COLOR, carpetDarker: '#8a7565'}}
            />

            {/*
              Estante amarela na parede DE FUNDO, ao lado da de livros. Ela
              morou na parede lateral enquanto o canto de campismo disputava
              esse espaço; com o campismo removido a faixa à esquerda ficou
              livre, e em x=-2.4 ela caía quase toda fora do quadro da câmera
              "geral" — aparecia um pedaço de madeira amarela na borda, sem
              ler como móvel.

              rotationY pequeno (0.25) em vez de 0: quase de frente pra
              câmera, mas fora do esquadro perfeito com a parede — o mesmo
              motivo da folha do índice não ficar paralela ao tampo.
            */}
            <YellowShelf position={[-2.05, 0, -1.35]} rotationY={0.25}/>
            <JogoDeTabuleiro position={[-2.35, 0.02, -0.75]}/>
            <Vinil position={[-2.3, 0.1, -1.2]}/>

            {/*
              Canto de leitura, empurrado pro fundo da sala (z≈-0.5). A câmera
              "geral" fica em z=2.6 e olha levemente pra baixo, então tudo com
              z acima de ~0 cai na faixa inferior do quadro e é cortado pela
              borda de baixo. Em z=0.3 a poltrona virava um borrão de primeiro
              plano tomando um quarto da tela, e a mesinha nem aparecia.
              O limite pelo outro lado é a estante amarela (z=-1.26): daí a
              poltrona parar em -0.55, não mais fundo.
            */}
            {/* +Math.PI: com só `0.7` a poltrona ficava de costas pra câmera —
                quem entrava na sala via o encosto, não o assento. */}
            <Poltrona position={[-1.45, 0, -0.55]} rotationY={0.7 + Math.PI}/>
            <CafeCorner position={[-0.78, 0, -0.02]}/>
            {/* y = a altura da mesinha (0.55): KenneyModel assenta a base da
                planta em Y=0, então basta erguer o grupo até o tampo. */}
            <Planta position={[-0.9, 0.55, 0.05]}/>

            <CampingWall/>
            </Suspense>

            {/*
              Intensidades em candela — o three.js (r155+) usa luz fisicamente
              correta por padrão, então os valores "de sensação" de versões
              antigas (ex.: 3-6) ficam quase invisíveis.

              As duas pontuais ficam na altura do TETO (y=2.75, contra os
              2,1 de antes). Antes elas moravam na altura dos móveis e cada
              uma cozinhava o que estivesse logo abaixo: a quente estourava
              em branco a capa dos livros deitados na mesa, e a fria — a
              0,05m da parede de fundo — virava uma bola de luz visível
              atrás da estante, porque o Bloom transforma qualquer pixel
              muito claro num halo. Do teto, com `decay={2}`, a mesma luz
              chega a ~40% da irradiância e cai como iluminação de ambiente
              em vez de holofote. O que a sala perde em brilho direto volta
              pelo hemisphere/ambient logo abaixo, que são difusos e não
              estouram superfície nenhuma.
            */}
            <pointLight position={[1.3, 2.75, 0.6]} color="#ffb877" intensity={22} distance={7} decay={2}/>
            <pointLight position={[0, 2.75, -1.0]} color="#9fd8ff" intensity={20} distance={6} decay={2}/>
            <hemisphereLight color="#8899aa" groundColor="#1a1410" intensity={0.7}/>
            <ambientLight intensity={0.18}/>
        </group>
    );
}
