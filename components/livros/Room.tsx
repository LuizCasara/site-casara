'use client';

import {Suspense, useRef} from 'react';
import type * as THREE from 'three';
import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import {INTERRUPTOR_RECUO_M} from '@/components/livros/decor/Interruptor';
import {JANELA_RECUO_M} from '@/components/livros/decor/Janela';
import {useLuzSuave} from '@/components/livros/decor/use-luz-suave';
import EstanteDoAcervo, {ESTANTE_ANCHOR, posicaoDaEstante} from '@/components/livros/decor/EstanteDoAcervo';
import CantoDeLeitura, {
    MESA_ANCHOR, pontoNoTampo, pontoNoBraco, BRACO_ROT_Y,
} from '@/components/livros/decor/CantoDeLeitura';
import Quadro from '@/components/livros/decor/Quadro';
import CantoDeTrabalho, {ancorasDoCantoDeTrabalho} from '@/components/livros/decor/CantoDeTrabalho';
import {CORES_DA_CANETA} from '@/components/livros/decor/Gaveta';
import ParedeLateral, {PAREDE_LATERAL_X} from '@/components/livros/decor/ParedeLateral';
import YellowShelf, {ESTANTE_AMARELA_ANCHOR} from '@/components/livros/decor/YellowShelf';
import EscudoEscoteiro from '@/components/livros/decor/EscudoEscoteiro';
import {Planta} from '@/components/livros/decor/PersonalProps';
import {NICHOS, NICHOS_POR_ESTANTE} from '@/lib/bookshelf-model.mjs';
import {contarEstantes} from '@/lib/shelf-years.mjs';
import {QUADRO_Z, QUADROS_DO_FUNDO} from '@/lib/parede-do-fundo.mjs';
import {linkDeSugestao} from '@/lib/whatsapp-livros.mjs';
import {marcarCoisa} from '@/lib/progresso-da-sala';
import {trackBookSuggestion, trackOutboundClick} from '@/utils/analytics';

/** A quina de paredes que o canto de trabalho abraça: fundo à direita. */
const QUINA_DO_PC: [number, number] = [PAREDE_LATERAL_X, -1.6];

/**
 * Os dois pôsteres da parede do fundo levam para fora do site.
 *
 * As URLs ficam aqui, ao lado das posições, e não num `lib/` — é a mesma
 * escolha do escudo escoteiro, que guarda o site do grupo no próprio
 * componente. Um arquivo de "links da sala" só se justificaria se algo além
 * destes objetos precisasse deles, e nada precisa.
 */
const PLAYLIST_GORILLAZ =
    'https://www.youtube.com/watch?v=WXR-bCF5dbM&list=PLxA687tYuMWiFcoCI8k0WL6-Y0unNno5g';
const PLAYLIST_HUNTER =
    'https://www.youtube.com/watch?v=2FT1uN80TTo&list=PL-t1336xq7ykbAgh3eJNVkp0z2U6TWRaf';

/**
 * Abrir um link de fora da sala.
 *
 * `noopener` não é detalhe: sem ele a página aberta recebe uma referência a
 * esta pelo `window.opener` e pode navegá-la para qualquer lugar. E o evento vai
 * ANTES do `open` — depois dele a aba pode já ter perdido o foco, e o lote de
 * eventos do cliente ainda não teria saído (ver utils/analytics.ts).
 */
function abrirExterno(url: string, rotulo: string, coisa: string) {
    trackOutboundClick(rotulo);
    // Antes do `open` pelo mesmo motivo do evento: a aba pode já ter perdido o
    // foco depois dele. O link abre em aba nova e ninguém sai da sala, mas se
    // este for o 17º item, o aviso do prêmio precisa estar de pé na volta — e
    // ele é lido do estado, não de um evento vivo.
    marcarCoisa(coisa);
    window.open(url, '_blank', 'noopener,noreferrer');
}

/** Centro do quadro de recados, na parede do fundo. Constante, e não escrito
 *  duas vezes, porque o CameraRig tem uma parada mirando nele. */
const QUADRO_RECOMENDACOES: [number, number, number] = [
    QUADROS_DO_FUNDO.recomendacoes.x, QUADROS_DO_FUNDO.recomendacoes.y, QUADRO_Z,
];

/**
 * Centro do pôster de Hunter x Hunter, na parede lateral ESQUERDA.
 *
 * **O z é o meio da faixa que sobra**, e não uma coordenada bonita: de um lado a
 * estante amarela, que ocupa até z ≈ -0,33; do outro a quina com a parede do
 * fundo, em -1,6. Centrado em -0,98, o pôster de 56cm fica com ~29cm de folga
 * para a quina e ~37cm para o móvel — por isso mexer na estante amarela obriga a
 * revisar este número, como já vale para a janela e o stand de espadas.
 *
 * O y de 1,5 põe a base dele em 1,29m, bem acima da planta de 94cm que fica
 * embaixo, e o topo em 1,71m, longe dos 3m de pé-direito.
 *
 * **Não passa por `lib/parede-do-fundo.mjs`**, e isso é a diferença que fez ele
 * mudar de parede: aquele arquivo existe porque a estante do acervo cresce e
 * come a parede do fundo. Esta faixa aqui não tem móvel nenhum disputando, então
 * não há colisão futura para prever.
 */
const POSTER_HUNTER: [number, number, number] = [-PAREDE_LATERAL_X, 1.5, -0.98];

/**
 * Os quatro objetos COM AÇÃO do canto de trabalho, na ordem em que o trilho os
 * varre (ver FOCOS_DO_PC em lib/livros-cenas.mjs). O CameraRig monta uma parada
 * para cada um a partir daqui — Room continua sendo o mapa da sala, e nenhuma
 * coordenada precisa ser copiada para dentro da câmera.
 */
export const ANCORAS_DO_PC = {
    recomendacoes: QUADRO_RECOMENDACOES,
    ...ancorasDoCantoDeTrabalho(QUINA_DO_PC),
};

/**
 * O interruptor: parede lateral direita, na vertical do stand de espadas e bem
 * abaixo dele.
 *
 * O z é o mesmo das espadas (`QUINA_DO_PC[1] + 1.5`) para os dois lerem como um
 * conjunto na mesma faixa de parede, e a altura é a de um interruptor de
 * verdade — acima da mesa, abaixo das lâminas, e dentro do enquadramento da
 * parada da bíblia, que é de onde ele se descobre.
 *
 * Exportada pelo mesmo motivo de `posicaoDaLavaLamp`: quem MONTA a peça é o
 * RoomCanvas, porque ela é controle e a sala é cenário. Room só publica onde
 * ela fica. O x recua meia espessura da placa para a traseira dela encostar na
 * parede em vez de metade atravessá-la.
 */
export const INTERRUPTOR_ANCHOR: [number, number, number] = [
    PAREDE_LATERAL_X - INTERRUPTOR_RECUO_M,
    1.18,
    QUINA_DO_PC[1] + 1.5,
];

/**
 * A janela, na mesma parede lateral direita, na faixa livre entre a quina do
 * canto de trabalho e o stand de espadas.
 *
 * **O z é o meio da faixa que sobra, não uma coordenada bonita.** De um lado a
 * quina (z = -1,6); do outro a ponta da espada longa, que alcança z = -0,54.
 * Centrada em -1,06 a janela de 85cm fica com ~10cm de folga para cada um — e é
 * por isso que mexer no stand de espadas obriga a revisar este número.
 *
 * O y é a base da peça, no contrato do `KenneyModel`: com 1,13m de altura, ela
 * põe o peitoril a ~1,09m, acima do tampo da mesa (0,74m) e abaixo das lâminas.
 *
 * Exportada pela mesma razão do interruptor e da lava lamp: quem MONTA a janela
 * é o RoomCanvas, porque ela é controle — a sala só publica onde ela fica.
 */
export const JANELA_ANCHOR: [number, number, number] = [
    PAREDE_LATERAL_X - JANELA_RECUO_M,
    0.86,
    -1.06,
];

/**
 * Onde o caderno do prêmio pousa: o braço da poltrona, do lado oposto ao abajur.
 *
 * O `lz` positivo o empurra para a metade de trás do platô, deixando a metade da
 * frente para a caneta — que fica ali desde o primeiro segundo, muito antes de
 * existir caderno nenhum. Uma caneta sozinha no braço de uma poltrona é uma
 * pergunta silenciosa: dá antecipação sem negar nada a ninguém, e faz o caderno
 * chegar completando uma cena que estava incompleta desde o começo, em vez de
 * materializar do nada.
 *
 * O leve desvio no giro é o mesmo truque da xícara e dos óculos da mesa de
 * centro: alinhado demais lê como item de catálogo; torto, lê como coisa que
 * alguém largou ali.
 *
 * Exportada porque quem MONTA o caderno é o `RoomCanvas` — ele abre um painel,
 * logo é CONTROLE, e `Room.tsx` é cenário. A sala só publica onde ele fica.
 */
export const CADERNO_ANCHOR = {
    position: pontoNoBraco(0, 0.055),
    rotationY: BRACO_ROT_Y - 0.07,
};

export const ROOM_ANCHORS = {
    // Referências, não cópias: a estante e o canto de leitura são território
    // congelado e moram em decor/EstanteDoAcervo.tsx e decor/CantoDeLeitura.tsx.
    // Ficam listadas aqui só para este arquivo continuar sendo o mapa da sala.
    estante: ESTANTE_ANCHOR,
    mesa: MESA_ANCHOR,
    caderno: CADERNO_ANCHOR.position,
};

const FLOOR_COLOR = '#3a2f2b';
const WALL_COLOR = '#2b2320';
const RUG_COLOR = '#a89584';

/** Nicho onde a lava lamp mora: o quarto de baixo pra cima (base = 0). */
const NICHO_DA_LAVA = 3;

/**
 * Nicho da carteira de caçador: o terceiro, dois andares abaixo da lava lamp.
 *
 * **Não é o nicho 1, que também está "mais embaixo".** As vitrines alternam de
 * lado a cada andar (é isso que o zigue-zague do móvel significa), e a do 1 cai
 * do MESMO lado da lava lamp — os dois objetos clicáveis ficariam empilhados na
 * mesma coluna. O 2 fica na diagonal, do lado oposto. E não é o 0 porque aquela
 * vitrine é rente ao chão, na sombra da estante, onde nenhuma parada da câmera
 * chega perto o bastante para se descobrir um cartão de dez centímetros.
 */
const NICHO_DA_CARTEIRA = 2;

/**
 * O quanto a carteira avança em relação ao centro da estante.
 *
 * Ela fica DEITADA de frente para cima (ver `CarteiraHunter`), e cartão deitado
 * só se vê de cima — puxá-la para a frente da prateleira é o que a tira da
 * sombra do tampo de cima e a põe no campo das paradas da câmera. Mesma razão do
 * `+0.04` da lava lamp, e quase o mesmo número.
 */
const AVANCO_DA_CARTEIRA_M = 0.035;

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

/**
 * Onde a carteira de caçador se apoia — a vitrine do nicho 2.
 *
 * Irmã de `posicaoDaLavaLamp`, e derivada da mesma forma: uma coordenada fixa
 * aqui descolaria do móvel no dia em que uma segunda estante aparecesse ao lado
 * e deslocasse a primeira.
 *
 * Devolve o ponto da PRATELEIRA sob o cartão, e não o centro dele — o mesmo
 * contrato de posicionamento do `KenneyModel`. Quem sabe a espessura do cartão é
 * o `CarteiraHunter`, e é ele quem levanta a peça a partir daqui.
 *
 * Exportada pelo mesmo motivo da lava lamp e do interruptor: quem MONTA a
 * carteira é o `RoomCanvas`, porque ela abre um painel e portanto é CONTROLE. A
 * sala é cenário e só publica onde ela fica.
 */
export function posicaoDaCarteira(gruposDeAno: number): [number, number, number] {
    const nicho = NICHOS[NICHO_DA_CARTEIRA];
    const base = posicaoDaEstante(0, contarEstantes(gruposDeAno, NICHOS_POR_ESTANTE));
    return [
        base[0] + nicho.vitrineOffsetX,
        base[1] + nicho.pisoY,
        base[2] + AVANCO_DA_CARTEIRA_M,
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
    /**
     * A gaveta da mesa do PC, pelo mesmo motivo do retrato: abrir dá zoom, e
     * zoom é decisão de quem manda na câmera.
     *
     * Atravessa a sala como prop, em vez de a `Gaveta` ser montada no
     * `RoomCanvas` junto da lava lamp e do interruptor, porque o nó que se move
     * vive dentro do clone da mesa — ver `CantoDeTrabalho`.
     */
    gavetaAberta?: boolean;
    onAlternarGaveta?: () => void;
    onAbrirBilhete?: () => void;
    /**
     * Clique na folha de anotações da bancada de estudo — a lista das coisas
     * clicáveis da sala. Atravessa até `ItensDeEstudo` pelo mesmo caminho do
     * bilhete: quem abre painel é o `RoomCanvas`.
     */
    onAbrirFolha?: () => void;
    /**
     * As três luzes que se apagam, e quem as apaga.
     *
     * Um objeto só, e não seis props soltos: elas viraram um conceito único da
     * sala ("o que está aceso"), e quem lê `luzes.abajur` não precisa procurar
     * qual dos três booleanos casa com qual callback. O `teto` chega só como
     * leitura porque o interruptor dele mora no RoomCanvas, junto da lava lamp,
     * pela mesma razão: é controle, e a sala é cenário.
     *
     * Em `undefined`, `onAlternar` deixa cada peça sem clique nem etiqueta —
     * é o que acontece com um livro aberto.
     */
    luzes?: {teto: boolean; abajur: boolean; lanterna: boolean};
    onAlternarLuz?: (qual: 'abajur' | 'lanterna') => void;
    isMobile?: boolean;
};

const LUZES_TODAS_ACESAS = {teto: true, abajur: true, lanterna: false};

/**
 * Cenário puro — não sabe QUE livros existem, só quantos grupos de ano precisam
 * de nicho. Publica ROOM_ANCHORS (posição/rotação) para que Bookshelf.tsx,
 * DeskBooks.tsx e CameraRig.tsx se posicionem a partir daqui, sem nenhuma lógica
 * de livro vazar para este arquivo.
 */
export default function Room({
    gruposDeAno = 1, onAbrirRetrato, gavetaAberta, onAlternarGaveta, onAbrirBilhete,
    onAbrirFolha, luzes = LUZES_TODAS_ACESAS, onAlternarLuz, isMobile = false,
}: RoomProps) {
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
                         rotationY={ESTANTE_AMARELA_ANCHOR.rotationY}
                         lanternaAcesa={luzes.lanterna}
                         onAlternarLanterna={onAlternarLuz && (() => onAlternarLuz('lanterna'))}
                         isMobile={isMobile}/>
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

            {/* Território congelado — ver o cabeçalho de CantoDeLeitura.tsx. O
                abajur é a exceção: ele virou interruptor, e o congelamento vale
                para posição, ângulo, escala e distância, não para acender. */}
            <CantoDeLeitura
                abajurAceso={luzes.abajur}
                onAlternarAbajur={onAlternarLuz && (() => onAlternarLuz('abajur'))}
                isMobile={isMobile}
            />
            {/*
              A caneta no braço da poltrona.

              **Ela está aqui desde o primeiro segundo, e é de propósito**: é a
              metade que já existe da cena que o caderno do prêmio vem completar
              (ver `CADERNO_ANCHOR`, acima). Uma caneta sozinha no braço de uma
              poltrona é uma pergunta silenciosa — dá antecipação sem negar nada a
              quem chegou agora, e evita que o prêmio pareça materializar do nada.

              É o mesmo `caneta.glb` que está na gaveta da mesa do PC, com o
              mesmo mapa de cores importado de lá — os nomes dos materiais dele
              são hexadecimais crus (`039BE5`), então uma cópia à mão aqui era
              uma segunda tabela ilegível para manter em sincronia. Nenhum
              arquivo novo entrou no repositório por causa dela.

              `larguraAlvo` e não `alturaAlvo` pelo motivo de sempre: é uma peça
              deitada, e pedir a altura de um cilindro de 8mm daria uma caneta do
              tamanho de um taco.
            */}
            <KenneyModel
                url={MODELOS.caneta}
                position={pontoNoBraco(0, -0.103)}
                rotation={[0, BRACO_ROT_Y + 0.25, 0]}
                larguraAlvo={0.135}
                cores={CORES_DA_CANETA}
            />

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

            {/*
              Óculos largados na mesa de centro — do outro lado da pilha, em
              espelho com a xícara. O tampo tem 0,78m e a pilha ocupa o meio
              (DESK_STACK_OFFSET_X_M é zero), então as duas faixas laterais são
              o que sobra: chá de um lado, óculos do outro.

              Tortos de propósito, e num ângulo que não é o da xícara: dois
              objetos apoiados com o mesmo desvio leriam como par decorativo em
              vez de coisas que alguém largou ali.

              `larguraAlvo` e não `alturaAlvo`: são 3,7cm de altura contra 14 de
              largura, e pedir a altura de uma peça achatada é pedir o número
              que menos diz sobre o tamanho dela — mesmo caso dos tapetes.
            */}
            <KenneyModel
                url={MODELOS.oculos}
                position={pontoNoTampo(-0.25, 0.05)}
                rotation={[0, MESA_ANCHOR.rotation[1] + 0.9, 0]}
                larguraAlvo={0.14}
                /*
                  O modelo vem quase preto (0,10 nos três canais), e a mesa é
                  marrom escuro: um em cima do outro vira uma mancha só. Mesma
                  correção que a espada longa levou, pelo mesmo motivo — grafite
                  frio, que separa da madeira quente sem virar destaque.
                */
                cores={{'1A1A1A': '#4b5158'}}
            />

            {/*
              Pôster do Gorillaz na parede do fundo, atrás da poltrona (x=-1.45 é
              o eixo dela). Quadrado porque a arte é uma capa de disco — o
              formato do quadro acompanha a imagem, não o contrário.

              Clicar abre a playlist da banda no YouTube, com a mesma mecânica do
              escudo escoteiro, o outro objeto da sala que leva para fora.

              **As medidas saem de `lib/parede-do-fundo.mjs`, não daqui**, e o
              motivo é o vizinho: quem fecha esta parede pela direita é a ESTANTE
              DO ACERVO, que ganha uma cópia a cada cinco grupos de ano com o
              conjunto sempre centrado — ou seja, cada móvel novo empurra a borda
              por cima do que está pendurado. Um quadro enterrado em madeira não
              estoura exceção nem quebra build, só some; a conta mora num `.mjs`
              para o `npm test` poder refazê-la. Mesma razão da mira da lanterna
              e dos nichos.
            */}
            <Quadro
                position={[QUADROS_DO_FUNDO.gorillaz.x, QUADROS_DO_FUNDO.gorillaz.y, QUADRO_Z]}
                imagem="/livros/poster-gorillaz.jpg"
                larguraM={QUADROS_DO_FUNDO.gorillaz.larguraM}
                alturaM={QUADROS_DO_FUNDO.gorillaz.alturaM}
                rotationY={QUADROS_DO_FUNDO.gorillaz.rotationY}
                onClick={() => abrirExterno(PLAYLIST_GORILLAZ, 'gorillaz-youtube', 'poster-gorillaz')}
                rotulo="Gorillaz no YouTube ↗"
                isMobile={isMobile}
            />

            {/*
              Pôster de Hunter x Hunter, na parede LATERAL ESQUERDA — a mesma da
              estante amarela e do escudo escoteiro —, no trecho entre o móvel e
              a quina do fundo.

              **Ele saiu da parede do fundo de propósito.** Lá ele dividia com o
              Gorillaz um vão de 78cm que a estante do acervo fecha sozinha
              quando o acervo cresce; aqui o vão é de 1,15m e não depende de
              quantos livros existem. É a única faixa de parede da sala que
              nenhum móvel disputa, e por isso não precisa de teste de colisão:
              não há o que colidir.

              Ele fica acima da planta (0,94m de altura) e abaixo do topo da
              parede, no campo das cenas "Sala" e "Mesa" — que são as duas que
              olham para este lado do cômodo.
            */}
            <Quadro
                position={POSTER_HUNTER}
                imagem="/livros/poster-hunter.jpg"
                larguraM={0.56}
                alturaM={0.42}
                parede={1}
                rotationY={-0.04}
                onClick={() => abrirExterno(PLAYLIST_HUNTER, 'hunter-youtube', 'poster-hunter')}
                rotulo="Hunter x Hunter no YouTube ↗"
                isMobile={isMobile}
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
                position={QUADRO_RECOMENDACOES}
                imagem="/livros/quadro-recomendacoes.jpg"
                larguraM={QUADROS_DO_FUNDO.recomendacoes.larguraM}
                alturaM={QUADROS_DO_FUNDO.recomendacoes.alturaM}
                rotationY={QUADROS_DO_FUNDO.recomendacoes.rotationY}
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
            <CantoDeTrabalho
                quina={QUINA_DO_PC}
                onAbrirRetrato={onAbrirRetrato}
                gavetaAberta={gavetaAberta}
                onAlternarGaveta={onAlternarGaveta}
                onAbrirBilhete={onAbrirBilhete}
                onAbrirFolha={onAbrirFolha}
                isMobile={isMobile}
            />

            <ParedeLateral lado="esquerda"/>
            <ParedeLateral lado="direita"/>
            </Suspense>

            <LuzDoTeto acesa={luzes.teto}/>
        </group>
    );
}

/**
 * As quatro luzes gerais da sala, e o dimmer do interruptor.
 *
 * Intensidades em candela — o three.js (r155+) usa luz fisicamente correta por
 * padrão, então os valores "de sensação" de versões antigas (ex.: 3-6) ficam
 * quase invisíveis.
 *
 * As duas pontuais ficam na altura do TETO. Na altura dos móveis cada uma
 * cozinhava o que estivesse logo abaixo: a quente estourava em branco a capa dos
 * livros da mesa, e a fria virava uma bola de luz visível atrás da estante (o
 * Bloom transforma qualquer pixel muito claro num halo). Do teto, com
 * `decay={2}`, a mesma luz chega a ~40% da irradiância e cai como ambiente em
 * vez de holofote.
 *
 * A fria é fraca (8) e afastada da parede do fundo por causa da LOMBADA: o
 * título é textura clara com letras escuras, e luz forte de cima lava o
 * contraste e apaga o texto — o zoom não ajuda, porque a lavagem acontece no
 * pixel, não no tamanho. O hemisphere e o ambient compensam: são difusos,
 * clareiam sem criar realce especular em cima de nada.
 */
const LUZ_ACESA = {quente: 22, fria: 8, hemisferio: 0.95, ambiente: 0.26};

/**
 * Apagado NÃO é zero em tudo.
 *
 * As duas pontuais do teto zeram, porque elas SÃO a luz do teto e é isso que o
 * interruptor promete. Mas o hemisphere e o ambient descem para um piso baixo em
 * vez de sumirem: eles são a luz difusa que nenhuma sala real perde por completo
 * (fresta de porta, janela, o resto da casa), e sem esse piso a estante fica
 * preta — as lombadas, que são o assunto inteiro desta página, deixariam de ser
 * legíveis e o modo escuro viraria um beco sem saída em vez de um clima.
 *
 * O que sobra aceso é justamente o que dá graça ao escuro: o abajur da poltrona
 * (`Poltrona.tsx`), a lava lamp do Índice, as telas do canto do PC e o display
 * do relógio. Todos moram em outros arquivos e nenhum passa por aqui — apagar o
 * teto é o que faz cada um deles finalmente aparecer.
 */
const LUZ_APAGADA = {quente: 0, fria: 0, hemisferio: 0.18, ambiente: 0.07};

function LuzDoTeto({acesa}: {acesa: boolean}) {
    const quente = useRef<THREE.PointLight>(null);
    const fria = useRef<THREE.PointLight>(null);
    const hemisferio = useRef<THREE.HemisphereLight>(null);
    const ambiente = useRef<THREE.AmbientLight>(null);

    // Quatro chamadas fixas, e não um laço sobre uma lista: hook é hook, e a
    // ordem tem que ser a mesma em todo render. O `useLuzSuave` é o mesmo que o
    // abajur e a lanterna usam — três interruptores com uma velocidade só.
    const alvo = acesa ? LUZ_ACESA : LUZ_APAGADA;
    useLuzSuave(quente, alvo.quente);
    useLuzSuave(fria, alvo.fria);
    useLuzSuave(hemisferio, alvo.hemisferio);
    useLuzSuave(ambiente, alvo.ambiente);

    return (
        <>
            <pointLight ref={quente} position={[1.3, 2.75, 0.6]} color="#ffb877"
                        intensity={LUZ_ACESA.quente} distance={7} decay={2}/>
            <pointLight ref={fria} position={[0, 2.75, -0.35]} color="#9fd8ff"
                        intensity={LUZ_ACESA.fria} distance={6} decay={2}/>
            <hemisphereLight ref={hemisferio} color="#8899aa" groundColor="#1a1410"
                             intensity={LUZ_ACESA.hemisferio}/>
            <ambientLight ref={ambiente} intensity={LUZ_ACESA.ambiente}/>
        </>
    );
}
