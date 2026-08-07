'use client';

import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import DeitadoNoTampo from '@/components/livros/decor/DeitadoNoTampo';

/**
 * Amarelo deliberadamente abafado, não o saturado de tinta que aparece na foto:
 * a sala é iluminada como fim de tarde e passa por um <Bloom>, então um amarelo
 * puro estouraria em halo. Este tom lê como a mesma estante sob luz de abajur.
 */
const SHELF_COLOR = '#d9a441';

/** Estante de pé, não de mesa — mas sem disputar altura com a do acervo: o papel
 *  dela é ser detalhe de borda. */
const ALTURA = 1.45;

/**
 * Onde o móvel está na sala, e qual a altura dele.
 *
 * Exportados pelo mesmo motivo de `ESTANTE_ANCHOR` em EstanteDoAcervo.tsx: a
 * cena "Estante" do trilho precisa enquadrá-lo, e o CameraRig calcular isso a
 * partir de números copiados à mão daria uma câmera apontada para o lugar
 * errado no dia em que a estante mudar de parede.
 *
 * `rotationY` é quase π/2 (encarando o centro da sala), mas não exatamente —
 * ver o comentário em Room.tsx. É essa diferença que o viewpoint usa para pôr
 * a câmera na frente do móvel, e não na frente da parede.
 */
export const ESTANTE_AMARELA_ANCHOR = {
    // O Z já foi -0.45, e a estante ficava atrás da poltrona (que está em
    // z=-0.55) quando vista pela cena "Estante": a linha entre a câmera e o
    // móvel atravessava o encosto. Trazida para o meio da parede, a poltrona
    // sai da frente sem que nenhuma das duas precise mudar de lugar na sala.
    // O escudo escoteiro acompanhou o mesmo deslocamento, em Room.tsx.
    position: [-2.35, 0, 0] as [number, number, number],
    rotationY: Math.PI / 2 - 0.12,
};
export const ESTANTE_AMARELA_ALTURA_M = ALTURA;

/**
 * Altura do TOPO de cada prateleira, medida no .glb e já escalada para os 1,45m
 * do móvel — é sobre elas que os trecos assentam. Chutar esses números põe as
 * peças flutuando no vão, que foi o que aconteceu com os enfeites anteriores.
 */
const PRATELEIRAS = [0.214, 0.610, 1.005, 1.401];
/** Espessura sobre comprimento da mochila, medida no .glb: 1,746 de 3,119. */
const RAZAO_ESPESSURA_MOCHILA = 0.56;
/** Meia largura útil entre as laterais — o móvel tem 0,66m de fora a fora. */
const MEIA_LARGURA = 0.28;

/**
 * Estante amarela aberta — o acento de cor do escritório real, e a única peça de
 * mobília da sala que não é marrom/madeira. Vive na parede lateral esquerda (ver
 * o porquê em Room.tsx), de lado para a câmera.
 *
 * Guarda trecos de sobrevivência e acampamento, escolhidos um a um pelo dono do
 * acervo: corda e primeiros socorros embaixo, lampião e lanterna no meio, rádio
 * e isqueiro em cima, mochila no topo e saco de dormir no chão ao lado. Vários
 * são CC BY e exigem crédito — ver LICENSE.md.
 *
 * Não confundir com a estante do acervo (Bookshelf.tsx): esta é cenário puro,
 * sem livro nenhum do banco dentro nem nada clicável.
 */
export default function YellowShelf({position, rotationY = 0}: {position: [number, number, number]; rotationY?: number}) {
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* O modelo tem um material só (`wood`) — recolorir é uma linha */}
            <KenneyModel url={MODELOS.estanteAmarela} alturaAlvo={ALTURA} cores={{wood: SHELF_COLOR}}/>

            {/* PRATELEIRA DE BAIXO — o que se pega com mais frequência. */}
            <KenneyModel
                url={MODELOS.kitPrimeirosSocorros}
                position={[-0.16, PRATELEIRAS[0], 0]}
                rotation={[0, 0.15, 0]}
                alturaAlvo={0.17}
                cores={{Red: '#b53b3b', White: '#e8e2d5'}}
            />
            {/* Rolo de corda deitado: a maior dimensão dele é a largura, então
                é por ela que se pede o tamanho, não pela altura. */}
            <KenneyModel
                url={MODELOS.corda}
                position={[0.13, PRATELEIRAS[0], 0.01]}
                rotation={[0, -0.3, 0]}
                larguraAlvo={0.22}
                cores={{Rope: '#b09a6a'}}
            />

            {/* PRATELEIRA DO MEIO — a luz. */}
            <KenneyModel
                url={MODELOS.lampiao}
                position={[-0.15, PRATELEIRAS[1], 0]}
                rotation={[0, 0.4, 0]}
                alturaAlvo={0.24}
            />
            {/* Lanterna deitada. O modelo é um tubo cujo comprimento corre em Z,
                apontado para o fundo da prateleira; o quarto de volta em Y deita
                o comprimento ao longo dela. */}
            <KenneyModel
                url={MODELOS.lanterna}
                position={[0.13, PRATELEIRAS[1], 0.02]}
                rotation={[0, Math.PI / 2 + 0.25, 0]}
                larguraAlvo={0.20}
            />

            {/* PRATELEIRA DE CIMA — o que é pequeno e some se ficar embaixo.
                O rádio substituiu um walkie-talkie que sozinho tinha 2,4MB e
                111 mil vértices, quase dois terços do peso de todos os modelos
                da sala. Este tem 48KB e é do mesmo Furniture Kit da mobília,
                então recolore por nome de material como o resto. */}
            <KenneyModel
                url={MODELOS.radio}
                position={[-0.13, PRATELEIRAS[2], 0]}
                rotation={[0, 0.2, 0]}
                larguraAlvo={0.20}
                cores={{wood: '#4a3323', metal: '#59626b', metalMedium: '#2b3036'}}
            />
            <KenneyModel
                url={MODELOS.isqueiro}
                position={[0.13, PRATELEIRAS[2], 0.01]}
                rotation={[0, -0.5, 0]}
                alturaAlvo={0.075}
            />

            {/* Mochila deitada na quarta prateleira. Deitada e não em pé: uma
                mochila em pé numa prateleira lê como manequim de vitrine. */}
            <DeitadoNoTampo
                url={MODELOS.mochila}
                position={[-0.02, PRATELEIRAS[3], -0.02]}
                comprimento={0.34}
                razaoEspessura={RAZAO_ESPESSURA_MOCHILA}
                giro={0.25}
            />

            {/*
              Saco de dormir no CHÃO, encostado na lateral: ele tem 55cm enrolado
              e ocuparia um vão inteiro sozinho.

              Posicionado no espaço local da estante, e não no da sala, de
              propósito: assim acompanha o móvel se ele girar ou mudar de parede,
              em vez de ficar para trás no meio do cômodo.
            */}
            <KenneyModel
                url={MODELOS.sacoDeDormir}
                position={[-MEIA_LARGURA - 0.16, 0, 0.04]}
                rotation={[0, 0.12, 0]}
                larguraAlvo={0.55}
            />
        </group>
    );
}
