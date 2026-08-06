'use client';

import {Suspense} from 'react';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import CafeCorner from '@/components/livros/decor/CafeCorner';
import Poltrona from '@/components/livros/decor/Poltrona';
import CampingWall from '@/components/livros/decor/CampingWall';
import YellowShelf from '@/components/livros/decor/YellowShelf';
import {Planta, JogoDeTabuleiro, Vinil} from '@/components/livros/decor/PersonalProps';
import {BOOKSHELF_SIZE_M, NICHOS_POR_ESTANTE} from '@/lib/bookshelf-model.mjs';
import {contarEstantes} from '@/lib/shelf-years.mjs';

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
    // Ponto do CHÃO sob o centro da primeira estante (o contrato de
    // posicionamento do KenneyModel), não mais o topo de uma prancha
    // flutuante: o móvel agora assenta no piso e encosta na parede de fundo
    // (-1.6 mais metade da profundidade dele).
    estante: {
        position: [0, 0, -1.6 + BOOKSHELF_SIZE_M.profundidadeM / 2] as [number, number, number],
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

/**
 * Folga entre duas estantes vizinhas. Pequena de propósito: elas leem como um
 * conjunto, não como dois móveis que por acaso estão na mesma parede.
 */
const ESTANTE_GAP_M = 0.06;

/**
 * Ponto do chão sob o centro da estante `indice`, com o conjunto todo
 * centralizado na parede. Com uma estante só devolve a âncora; com duas, uma
 * vai pra esquerda e outra pra direita.
 */
export function posicaoDaEstante(indice: number, total: number): [number, number, number] {
    const passo = BOOKSHELF_SIZE_M.larguraM + ESTANTE_GAP_M;
    const x = (indice - (total - 1) / 2) * passo;
    const base = ROOM_ANCHORS.estante.position;
    return [base[0] + x, base[1], base[2]];
}

type RoomProps = {
    /**
     * Quantos grupos de ano a estante precisa acomodar. É só isso que o
     * cenário sabe sobre o acervo — quantas estantes montar. Quais livros
     * existem continua sendo assunto de Bookshelf.tsx.
     */
    gruposDeAno?: number;
};

/**
 * Cenário puro — não sabe QUE livros existem, só quantos grupos de ano
 * precisam de nicho (`gruposDeAno`). Publica ROOM_ANCHORS (posição/rotação)
 * para que Bookshelf.tsx, DeskBooks.tsx, IndexSheet.tsx e CameraRig.tsx se
 * posicionem a partir daqui, sem nenhuma lógica de livro vazar para este
 * arquivo.
 */
export default function Room({gruposDeAno = 1}: RoomProps) {
    const totalEstantes = contarEstantes(gruposDeAno, NICHOS_POR_ESTANTE);

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
              A estante do acervo — modelo GLB (CC0), não mais pranchas
              geradas em código. Tem o SEU PRÓPRIO <Suspense>, separado do que
              embrulha a mobília lá embaixo: ela é o motivo da sala existir, e
              compartilhar a fronteira faria a chegada de uma poltrona
              qualquer segurar a aparição do acervo.

              Uma segunda estante só é montada quando os grupos de ano não
              cabem na primeira — ver contarEstantes.
            */}
            <Suspense fallback={null}>
                {Array.from({length: totalEstantes}, (_, i) => (
                    <KenneyModel
                        key={i}
                        url={MODELOS.estanteLivros}
                        position={posicaoDaEstante(i, totalEstantes)}
                        alturaAlvo={BOOKSHELF_SIZE_M.alturaM}
                    />
                ))}
            </Suspense>

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
