'use client';

import {Sparkles} from '@react-three/drei';
import PcDesk from '@/components/livros/decor/PcDesk';
import CafeCorner from '@/components/livros/decor/CafeCorner';
import Poltrona from '@/components/livros/decor/Poltrona';
import CampingWall from '@/components/livros/decor/CampingWall';
import YellowShelf from '@/components/livros/decor/YellowShelf';
import {Planta, JogoDeTabuleiro, ControleDeVideogame, FoneDeOuvido, Vinil} from '@/components/livros/decor/PersonalProps';

export const ROOM_ANCHORS = {
    estante: {
        position: [0, 0.9, -1.4] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
    leitura: {
        position: [0, 1.3, 0.6] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
    // Deslocada pro lado (x=1.4) pra não brigar de espaço com a estante
    // (z=-1.4) nem com o ponto de leitura (x=0, z=0.6). Rotação -0.35 rad
    // angula o tampo levemente em direção ao centro da sala, então a mesa
    // "olha" pra quem entra em vez de ficar de perfil.
    mesa: {
        position: [1.4, 0.75, 0.9] as [number, number, number],
        rotation: [0, -0.35, 0] as [number, number, number],
    },
    // Sobre o tampo da mesa (y = mesa.y + metade da espessura do tampo),
    // levemente fora do centro — não perfeitamente alinhada, pra parecer um
    // objeto pousado, não um ícone de menu.
    indice: {
        position: [1.25, 0.775, 1.05] as [number, number, number],
        rotation: [-Math.PI / 2, 0, 0.25] as [number, number, number],
    },
};

const FLOOR_COLOR = '#3a2f2b';
const WALL_COLOR = '#2b2320';
const SHELF_BOARD_COLOR = '#1f1713';
const RUG_COLOR = '#a89584';

/**
 * Cenário puro — não sabe que livros existem. Publica ROOM_ANCHORS
 * (posição/rotação) para que Bookshelf.tsx, DeskBooks.tsx, IndexSheet.tsx e
 * CameraRig.tsx se posicionem a partir daqui, sem nenhuma lógica de livro
 * vazar para este arquivo.
 */
export default function Room() {
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
              Prancha física da prateleira — os livros assentam no topo dela.
              Largura e profundidade acompanham a escala maior dos livros
              (lombadas de 30-110mm e 20cm de profundidade): com 1,4m x 0,2m
              a fileira transbordava a prancha já com algumas dezenas de
              livros, e eles ficavam com a "bunda" pra fora.
            */}
            <mesh position={[estante.position[0], estante.position[1] - 0.02, estante.position[2]]}>
                <boxGeometry args={[2.6, 0.04, 0.26]}/>
                <meshStandardMaterial color={SHELF_BOARD_COLOR} roughness={0.6}/>
            </mesh>

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
              Decoração da fase 6 — o lado "tech" (mesa de trabalho com PC e 4
              telas) fica na direita, contra a parede de fundo; o lado
              "campismo/leitura" (parede nova, poltrona, mesinha de café) fica
              na esquerda. A estante de livros continua no centro, entre os
              dois, porque ela é o motivo da sala existir.

              Números de posição são um primeiro rascunho, calibrados só o
              suficiente pra nada atravessar parede nem tapar a estante —
              ajustar olhando é o esperado nesta fase, não uma regressão.
            */}

            {/*
              Tapete sob o canto de leitura. y=0.008 e não 0: no mesmo plano
              do piso os dois disputariam cada pixel (z-fighting) e o tapete
              apareceria tremendo em faixas.
            */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.4, 0.008, -0.15]}>
                <planeGeometry args={[2.0, 2.1]}/>
                <meshStandardMaterial color={RUG_COLOR} roughness={1}/>
            </mesh>

            {/* Canto tech, à direita da estante */}
            <PcDesk position={[2.0, 0, -1.25]}/>
            <FoneDeOuvido position={[1.55, 0.735, -1.05]}/>
            <ControleDeVideogame position={[2.35, 0.75, -1.05]}/>

            {/*
              Estante amarela na parede LATERAL, não na de fundo: a faixa de
              parede de fundo à esquerda da estante de livros tem ~1,15m
              úteis, e ela e o canto de campismo não cabem juntas ali. Quem
              cede é a estante — ela tem profundidade e continua legível vista
              de ângulo, enquanto mochila/lenços/faca são placas planas que
              somem se não encararem a câmera.
            */}
            <YellowShelf position={[-2.45, 0, -0.5]} rotationY={Math.PI / 2}/>
            <JogoDeTabuleiro position={[-2.2, 0.02, 0.1]}/>
            <Vinil position={[-2.15, 0.1, -0.95]}/>

            {/*
              Canto de leitura, empurrado pro fundo da sala (z≈-0.5). A câmera
              "geral" fica em z=2.6 e olha levemente pra baixo, então tudo com
              z acima de ~0 cai na faixa inferior do quadro e é cortado pela
              borda de baixo. Em z=0.3 a poltrona virava um borrão de primeiro
              plano tomando um quarto da tela, e a mesinha nem aparecia.
              O limite pelo outro lado é a estante amarela (z=-1.26): daí a
              poltrona parar em -0.55, não mais fundo.
            */}
            <Poltrona position={[-1.45, 0, -0.55]} rotationY={0.7}/>
            <CafeCorner position={[-0.8, 0, 0.35]}/>
            <Planta position={[-0.92, 0.425, 0.42]}/>

            <CampingWall/>

            {/*
              Intensidades em candela — o three.js (r155+) usa luz fisicamente
              correta por padrão, então os valores "de sensação" de versões
              antigas (ex.: 3-6) ficam quase invisíveis. 40/25 aqui é o que
              realmente ilumina uma sala pequena a poucos metros de distância.
            */}
            <pointLight position={[1.3, 1.7, 0.6]} color="#ffb877" intensity={40} distance={6} decay={2}/>
            <pointLight position={[0, 2.1, -1.55]} color="#9fd8ff" intensity={25} distance={5} decay={2}/>
            <hemisphereLight color="#8899aa" groundColor="#1a1410" intensity={0.6}/>
            <ambientLight intensity={0.15}/>

            <Sparkles count={40} scale={[2, 2, 2]} position={[1, 1.5, 0.3]} size={2} speed={0.15} color="#ffd9a0" opacity={0.35}/>
        </group>
    );
}
