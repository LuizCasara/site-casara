'use client';

import {Suspense} from 'react';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import EstanteDoAcervo, {ESTANTE_ANCHOR, posicaoDaEstante} from '@/components/livros/decor/EstanteDoAcervo';
import CantoDeLeitura, {MESA_ANCHOR, pontoNoTampo} from '@/components/livros/decor/CantoDeLeitura';
import Quadro from '@/components/livros/decor/Quadro';
import CantoDeTrabalho from '@/components/livros/decor/CantoDeTrabalho';
import ParedeLateral, {PAREDE_LATERAL_X} from '@/components/livros/decor/ParedeLateral';
import YellowShelf, {ESTANTE_AMARELA_ANCHOR} from '@/components/livros/decor/YellowShelf';
import EscudoEscoteiro from '@/components/livros/decor/EscudoEscoteiro';
import {Planta} from '@/components/livros/decor/PersonalProps';
import {NICHOS, NICHOS_POR_ESTANTE} from '@/lib/bookshelf-model.mjs';
import {contarEstantes} from '@/lib/shelf-years.mjs';
import {linkDeSugestao} from '@/lib/whatsapp-livros.mjs';
import {trackBookSuggestion} from '@/utils/analytics';

export const ROOM_ANCHORS = {
    // Referências, não cópias: a estante e o canto de leitura são território
    // congelado e moram em decor/EstanteDoAcervo.tsx e decor/CantoDeLeitura.tsx.
    // Ficam listadas aqui só para este arquivo continuar sendo o mapa da sala.
    estante: ESTANTE_ANCHOR,
    mesa: MESA_ANCHOR,
};

const FLOOR_COLOR = '#3a2f2b';
const WALL_COLOR = '#2b2320';
const RUG_COLOR = '#a89584';

/** Nicho onde a lava lamp mora: o quarto de baixo pra cima (base = 0). */
const NICHO_DA_LAVA = 3;

/**
 * A lava lamp NÃO fica no vão dos livros: ela fica na vitrine ao lado — o
 * compartimento estreito que o zigue-zague deixa livre naquele andar, do lado
 * oposto ao vão (ver `vitrineOffsetXM` em lib/bookshelf-model.mjs).
 *
 * Calculada a partir da geometria da estante em vez de escrita à mão: uma
 * coordenada fixa aqui descolaria do móvel no dia em que um segundo aparecesse
 * ao lado e deslocasse o primeiro.
 *
 * Exportada porque quem MONTA a lâmpada é RoomCanvas.tsx: ela é o botão do
 * Índice, e a sala é cenário — não conhece filtro nem estado de UI.
 */
export function posicaoDaLavaLamp(gruposDeAno: number): [number, number, number] {
    const nicho = NICHOS[NICHO_DA_LAVA];
    const base = posicaoDaEstante(0, contarEstantes(gruposDeAno, NICHOS_POR_ESTANTE));
    return [
        base[0] + nicho.vitrineOffsetX,
        base[1] + nicho.pisoY,
        // Um pouco à frente do centro da estante (onde as lombadas ficam): a
        // lâmpada é fina, e no meio da profundidade pareceria enfiada no fundo.
        base[2] + 0.04,
    ];
}

type RoomProps = {
    /**
     * Quantos grupos de ano a estante precisa acomodar. É só isso que o cenário
     * sabe sobre o acervo — quais livros existem é assunto de Bookshelf.tsx.
     */
    gruposDeAno?: number;
    /**
     * Clique no porta-retratos da mesa do PC. É a única coisa daqui que devolve
     * controle para fora: o escudo escoteiro abre um site sozinho e a bíblia
     * navega sozinha, mas dar zoom é decisão de quem manda na câmera.
     */
    onAbrirRetrato?: () => void;
    isMobile?: boolean;
};

/**
 * Cenário puro — não sabe QUE livros existem, só quantos grupos de ano precisam
 * de nicho. Publica ROOM_ANCHORS (posição/rotação) para que Bookshelf.tsx,
 * DeskBooks.tsx e CameraRig.tsx se posicionem a partir daqui, sem nenhuma lógica
 * de livro vazar para este arquivo.
 */
export default function Room({gruposDeAno = 1, onAbrirRetrato, isMobile = false}: RoomProps) {
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

            {/* Território congelado — ver o cabeçalho de EstanteDoAcervo.tsx. */}
            <EstanteDoAcervo gruposDeAno={gruposDeAno}/>

            {/*
              Suspense com fallback null: os .glb são carregados por `useGLTF`,
              que suspende enquanto baixa. Sem esta fronteira a suspensão sobe
              até fora do <Canvas> e a sala INTEIRA some até o último móvel
              chegar. Com ela, a sala aparece na hora e a mobília materializa em
              cima.
            */}
            <Suspense fallback={null}>
            {/* Tapete sob o canto de leitura. y=0.004 e não 0: a face de baixo
                do modelo fica no mesmo plano do piso e os dois disputariam cada
                pixel (z-fighting). Mesma correção no tapete do canto de PC. */}
            <KenneyModel
                url={MODELOS.tapete}
                position={[-1.4, 0.004, -0.15]}
                rotation={[0, Math.PI / 2, 0]}
                larguraAlvo={2.1}
                cores={{carpet: RUG_COLOR, carpetDarker: '#8a7565'}}
            />

            {/*
              Estante amarela rente à parede LATERAL, de perfil pra câmera e
              longe da quina do fundo: o papel dela é ser o acento de cor na
              borda do quadro, não um segundo móvel central disputando atenção
              com o acervo.

              Quase π/2 (encarando o centro da sala), mas não exatamente: os
              -0.12 tiram o móvel do esquadro perfeito com a parede. Girada
              assim ela ocupa só ~0,49m em X e cabe sem ser cortada.
            */}
            <YellowShelf position={ESTANTE_AMARELA_ANCHOR.position}
                         rotationY={ESTANTE_AMARELA_ANCHOR.rotationY}/>
            {/* Escudo escoteiro na faixa de parede livre à frente da estante
                amarela. `normal` +1 porque esta é a parede da ESQUERDA, cuja
                face olha para +x. A 1,15m ele conversa com o móvel ao lado, em
                vez de ficar sozinho acima do topo dele.

                O Z acompanha o da estante (+0,45 em relação ao original): os
                dois formam um conjunto, e mover só o móvel deixaria o escudo
                para trás, sozinho no meio da parede. */}
            <EscudoEscoteiro position={[-PAREDE_LATERAL_X, 1.15, 0.8]} normal={1} isMobile={isMobile}/>
            {/* A planta é "atrás da poltrona", não do conjunto da estante
                amarela — inclusive o tamanho foi pedido assim. */}
            <Planta position={[-2.2, 0, -1.4]} alturaM={0.94}/>

            {/* Território congelado — ver o cabeçalho de CantoDeLeitura.tsx. */}
            <CantoDeLeitura/>
            {/*
              Xícara na mesa de centro, ao lado da pilha de "lendo agora" — o
              móvel está congelado, o que se apoia nele não. Posicionada por
              `pontoNoTampo`, então acompanha a mesa se ela girar; o tampo tem
              0,78m e a pilha ocupa o meio, sobrando a faixa da direita.
            */}
            <KenneyModel
                url={MODELOS.xicara}
                position={pontoNoTampo(0.27, 0.02)}
                rotation={[0, MESA_ANCHOR.rotation[1] - 0.6, 0]}
                alturaAlvo={0.075}
                cores={{_defaultMat: '#e8e2d5', brownDarkest: '#3b2318'}}
            />

            {/* Quadro na parede de fundo, atrás da poltrona (x=-1.45 é o eixo
                dela). Quadrado porque a arte é uma capa de disco — o formato do
                quadro acompanha a imagem, não o contrário. */}
            <Quadro
                position={[-1.45, 1.6, -1.58]}
                imagem="/livros/poster-gorillaz.jpg"
                larguraM={0.5}
                alturaM={0.5}
                rotationY={0.04}
            />

            {/*
              Quadro branco de canetão, na faixa de parede entre a estante do
              acervo (que termina em x=0.42) e a prateleira aérea (que começa em
              x=0.95, com a mão-francesa descendo em 1.07). É um vão estreito, de
              53cm, e o quadro tem 44 — daí ele estar centrado nele em vez de
              numa coordenada redonda. Mais para a direita e o topo dele, que
              fica a 1,58m, passa por baixo da prateleira e cruza com o suporte.

              A textura é a foto RECORTADA: a original inclui a moldura de
              alumínio e a parede da sala de verdade, e usá-la inteira seria pôr
              um quadro dentro do outro. Aqui entra só o miolo branco, e a
              moldura é geometria — com bandeja de canetão, que é o detalhe que
              faz um retângulo branco na parede ler como quadro.

              Clicar abre o WhatsApp com uma mensagem pronta de sugestão de
              livro. É o quadro de recados da sala, e o recado sai por onde ele
              sairia mesmo — ver lib/whatsapp-livros.mjs para o porquê de não
              ser um formulário que grava no banco.
            */}
            <Quadro
                position={[0.68, 1.36, -1.58]}
                imagem="/livros/quadro-recomendacoes.jpg"
                larguraM={0.44}
                alturaM={0.43}
                rotationY={-0.03}
                corMoldura="#b9c2cc"
                comBandeja
                onClick={() => {
                    trackBookSuggestion();
                    window.open(linkDeSugestao(), '_blank', 'noopener,noreferrer');
                }}
                rotulo="Sugerir um livro ↗"
                isMobile={isMobile}
            />

            {/* O canto de trabalho, encaixado na quina do fundo com a parede
                direita. Deliberadamente NÃO congelado, ao contrário da estante e
                do canto de leitura: é o pedaço em que ainda se mexe. */}
            <CantoDeTrabalho quina={[PAREDE_LATERAL_X, -1.6]} onAbrirRetrato={onAbrirRetrato} isMobile={isMobile}/>

            <ParedeLateral lado="esquerda"/>
            <ParedeLateral lado="direita"/>
            </Suspense>

            {/*
              Intensidades em candela — o three.js (r155+) usa luz fisicamente
              correta por padrão, então os valores "de sensação" de versões
              antigas (ex.: 3-6) ficam quase invisíveis.

              As duas pontuais ficam na altura do TETO. Na altura dos móveis cada
              uma cozinhava o que estivesse logo abaixo: a quente estourava em
              branco a capa dos livros da mesa, e a fria virava uma bola de luz
              visível atrás da estante (o Bloom transforma qualquer pixel muito
              claro num halo). Do teto, com `decay={2}`, a mesma luz chega a ~40%
              da irradiância e cai como ambiente em vez de holofote.

              A fria é fraca (8) e afastada da parede do fundo por causa da
              LOMBADA: o título é textura clara com letras escuras, e luz forte
              de cima lava o contraste e apaga o texto — o zoom não ajuda, porque
              a lavagem acontece no pixel, não no tamanho. O hemisphere e o
              ambient compensam: são difusos, clareiam sem criar realce
              especular em cima de nada.
            */}
            <pointLight position={[1.3, 2.75, 0.6]} color="#ffb877" intensity={22} distance={7} decay={2}/>
            <pointLight position={[0, 2.75, -0.35]} color="#9fd8ff" intensity={8} distance={6} decay={2}/>
            <hemisphereLight color="#8899aa" groundColor="#1a1410" intensity={0.95}/>
            <ambientLight intensity={0.26}/>
        </group>
    );
}
