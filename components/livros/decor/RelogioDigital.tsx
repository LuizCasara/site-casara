'use client';

import KenneyModel, {MODELOS} from '@/components/livros/decor/KenneyModel';
import {useTexturaDeRelogio} from '@/components/livros/decor/use-textura-de-relogio';
import {
    MATERIAL_DOS_DIGITOS, RELOGIO_NATIVO, RELOGIO_DISPLAY,
} from '@/lib/relogio-model.mjs';

/**
 * O relógio de cabeceira da prateleira aérea, marcando a hora de quem está
 * vendo a sala.
 *
 * **A carcaça é do modelo, o display não é.** Os algarismos do `.glb` são
 * geometria extrudada — um horário fixo moldado no plástico, não um painel liso
 * esperando textura —, então eles são escondidos (`ocultos`) e um plano aceso
 * ocupa exatamente o vão que eles deixaram. Isso NÃO contradiz a regra que o
 * monitor da mesa segue ("acender é recolorir o material, nunca colar um plano
 * na frente"): lá o plano ficaria por cima de uma tela que já existia, e sairia
 * como adesivo desalinhado. Aqui ele SUBSTITUI a geometria removida, no lugar
 * dela, com as medidas lidas do arquivo — não há nada por baixo para
 * desalinhar.
 *
 * Sem clique. Um relógio já cumpre a regra da sala de que toda função tem um
 * objeto físico: a função dele é dizer a hora, e ele diz sozinho.
 */

/** Carcaça marrom e moldura, na paleta da sala em vez da do autor do modelo. */
const COR_CARCACA = '#3a2c22';
const COR_MOLDURA = '#14181c';
/**
 * Baixo de propósito, como as telas dos monitores. O <Bloom> da cena estoura
 * qualquer coisa acima de ~0,6 de luminância, e um relógio de 3cm virando a
 * fonte de luz mais forte da prateleira brigaria com o abajur do outro canto.
 * O halo de perto já vem desenhado dentro do canvas.
 */
const BRILHO_DO_DISPLAY = 0.55;

/**
 * O quarto de volta que põe a peça em pé, e as duas compensações que devolvem
 * ela ao ponto pedido.
 *
 * **O arquivo é Z-up**: o "para cima" dele é +Z, enquanto o KenneyModel assume
 * (como toda a sala) que altura é Y. Sem o giro, o relógio chegaria deitado de
 * costas — e com o giro sozinho, metade dele afunda na prateleira e o resto
 * escorrega para -z, porque o KenneyModel assentou a base ANTES de girar. Meia
 * altura para cima e meia largura para a frente desfazem as duas coisas.
 *
 * É a mesma conta do DeitadoNoTampo, pelo motivo espelhado: lá a peça vem em pé
 * e precisa deitar, aqui vem deitada e precisa levantar.
 */
const DE_PE = -Math.PI / 2;
/**
 * Meia volta somada ao giro pedido: o display olha para -x no arquivo, e este
 * quarto de volta é o que o vira para a sala. Sem ele o relógio mostra a hora
 * para a parede.
 */
const DISPLAY_PARA_A_SALA = Math.PI / 2;

type RelogioDigitalProps = {
    /** Ponto do chão (aqui, da prateleira) sob o centro do relógio. */
    position: [number, number, number];
    /** Largura da peça em metros — a altura e a profundidade saem dela. */
    larguraM: number;
    /** Giro em torno de Y, somado ao que já vira o display para a sala. */
    rotationY?: number;
};

export default function RelogioDigital({position, larguraM, rotationY = 0}: RelogioDigitalProps) {
    const display = useTexturaDeRelogio();

    // Altura e profundidade não são escolhidas: saem da proporção do modelo, o
    // que mantém o relógio com a cara dele em qualquer tamanho pedido.
    const alturaM = larguraM * (RELOGIO_NATIVO.altura / RELOGIO_NATIVO.largura);
    const profundidadeM = larguraM * (RELOGIO_NATIVO.profundidade / RELOGIO_NATIVO.largura);

    return (
        <group position={position} rotation={[0, DISPLAY_PARA_A_SALA + rotationY, 0]}>
            <group position={[0, alturaM / 2, larguraM / 2]} rotation={[DE_PE, 0, 0]}>
                {/*
                  `alturaAlvo` recebendo a LARGURA não é engano: o KenneyModel
                  mede a caixa envolvente antes de qualquer rotação, e o eixo
                  Y do arquivo (o que ele chama de altura) é a largura desta
                  peça deitada. Trocar para `larguraAlvo` daria a
                  PROFUNDIDADE, que é o maior entre X e Z aqui.
                */}
                <KenneyModel
                    url={MODELOS.relogio}
                    alturaAlvo={larguraM}
                    cores={{blinn10SG: COR_CARCACA, blinn5SG: COR_MOLDURA}}
                    ocultos={[MATERIAL_DOS_DIGITOS]}
                />
            </group>

            {/*
              O display, no vão que os algarismos moldados ocupavam. As cinco
              frações vêm de RELOGIO_DISPLAY, lidas dos vértices do arquivo e
              conferidas por relogio-model.test.mjs — trocar o .glb sem
              atualizar a tabela quebra o teste, em vez de deixar um retângulo
              aceso pairando ao lado do relógio.

              O meio milímetro a mais na frente evita z-fighting com a moldura
              que emoldura o vão.

              `meshBasicMaterial` e não `standard`: um display emite a própria
              luz e não deveria escurecer quando o abajur da sala está longe.
              É o mesmo raciocínio do emissivo das telas, só que aqui a
              geometria é nossa e não há material do modelo para reaproveitar.

              `toneMapped={false}` põe o azul do display abaixo do
              luminanceThreshold do <Bloom> (o #4da3ff dá ~0,58 de luminância,
              contra o corte em 0,78 lá no RoomCanvas): acende sem ganhar halo
              de cena, que nesta escala viraria uma bolha azul maior que o
              próprio relógio.
              É o mesmo alvo de BRILHO_DA_TELA nos monitores, por outro
              caminho. Ligar o tone mapping é o botão para deixá-lo mais
              discreto; subir a cor do canvas, para deixá-lo estourar.
            */}
            <mesh
                position={[
                    RELOGIO_DISPLAY.frenteX * profundidadeM - 0.0005,
                    RELOGIO_DISPLAY.centroY * alturaM,
                    RELOGIO_DISPLAY.centroZ * larguraM,
                ]}
                rotation={[0, -Math.PI / 2, 0]}
            >
                <planeGeometry args={[
                    RELOGIO_DISPLAY.largura * larguraM,
                    RELOGIO_DISPLAY.altura * alturaM,
                ]}/>
                <meshBasicMaterial map={display} toneMapped={false}/>
            </mesh>

            {/* O tanto que o display ILUMINA em volta, separado do quanto ele
                BRILHA — mesma distinção das telas do canto de trabalho. Alcance
                curto: é para a madeira da prateleira pegar um azul fraco por
                baixo, não para acender a parede. */}
            <pointLight
                position={[-profundidadeM * 0.6, alturaM * 0.5, 0]}
                color="#4da3ff"
                intensity={BRILHO_DO_DISPLAY}
                distance={0.28}
                decay={2}
            />
        </group>
    );
}
