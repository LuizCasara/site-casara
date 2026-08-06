'use client';

import {useEffect, useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {Box3, Vector3} from 'three';
import type * as THREE from 'three';
import type {BufferAttribute, Mesh, Object3D} from 'three';

/**
 * Estica as UVs de uma malha para preencher 0..1.
 *
 * Os modelos deste kit são pintados por um ATLAS de paleta: as coordenadas de
 * textura deles vivem em escala de atlas (as da tela do monitor vão de 0,27 a
 * 15,19), o que para uma cor lisa não faz diferença nenhuma. Aplicar uma
 * imagem por cima disso sem remapear a repetiria quinze vezes na horizontal.
 *
 * A malha é retangular e tem quatro vértices, então esticar pelo mínimo e
 * máximo é exato — não é aproximação.
 */
function normalizarUV(geometry: THREE.BufferGeometry) {
    const uv = geometry.attributes.uv as BufferAttribute | undefined;
    if (!uv) return;

    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < uv.count; i++) {
        minU = Math.min(minU, uv.getX(i)); maxU = Math.max(maxU, uv.getX(i));
        minV = Math.min(minV, uv.getY(i)); maxV = Math.max(maxV, uv.getY(i));
    }
    const larguraU = maxU - minU;
    const larguraV = maxV - minV;
    if (larguraU === 0 || larguraV === 0) return; // UV degenerada: não há o que esticar

    // O V sai INVERTIDO (`1 - t`), e isso não é gosto: o glTF conta a coordenada
    // vertical de cima para baixo, enquanto uma textura carregada pelo three
    // chega com `flipY` ligado, contando de baixo para cima. Sem a inversão as
    // duas convenções se somam e a imagem aparece de cabeça para baixo.
    for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (uv.getX(i) - minU) / larguraU, 1 - (uv.getY(i) - minV) / larguraV);
    }
    uv.needsUpdate = true;
}

/**
 * Mapa de cor por NOME de material, não por índice: os modelos do Kenney
 * nomeiam os materiais semanticamente (`wood`, `metal`, `carpet`, `lamp`,
 * `plant`), então `{carpet: '#b5a48d'}` significa "o estofado desta poltrona
 * fica creme" e continua significando isso se o modelo for trocado por outro
 * do mesmo pacote. Por índice, qualquer troca embaralharia as cores em
 * silêncio.
 */
export type CoresPorMaterial = Record<string, string>;

/**
 * Materiais que BRILHAM, por nome — mesma ideia do mapa de cores, mas mexendo
 * em `emissive`/`emissiveIntensity` em vez de `color`. Um material emissivo
 * não depende de luz nenhuma para aparecer, e passando de ~0.6 de luminância
 * ele cruza o `luminanceThreshold` do <Bloom> da cena e ganha halo — que é o
 * jeito de um objeto pequeno "acender" nesta sala.
 */
export type EmissivosPorMaterial = Record<string, {cor: string; intensidade?: number}>;

/**
 * Imagem aplicada sobre um material, por nome — para as telas dos monitores.
 * A textura vem carregada de fora (`useTexture`) porque quem carrega é quem
 * suspende, e este componente já suspende pelo .glb.
 */
export type TexturasPorMaterial = Record<string, THREE.Texture>;

type KenneyModelProps = {
    url: string;
    cores?: CoresPorMaterial;
    emissivos?: EmissivosPorMaterial;
    texturas?: TexturasPorMaterial;
    position?: [number, number, number];
    rotation?: [number, number, number];
    /** Altura final em METROS. O componente calcula a escala sozinho. */
    alturaAlvo?: number;
    /** Largura final em metros. Use no lugar de `alturaAlvo` para peças
     *  achatadas (tapete), onde a altura não diz nada sobre o tamanho.
     *
     *  Passar os DOIS escala em X/Z e em Y separadamente — a peça sai
     *  esticada ou achatada de propósito. É a exceção, não o caminho normal:
     *  serve para quando a proporção do modelo não é a do móvel que ele
     *  precisa representar (uma mesa de canto virando mesa de centro: mesmo
     *  tampo, metade da altura). */
    larguraAlvo?: number;
};

/**
 * Carrega um `.glb` do Furniture Kit (CC0 — ver `public/livros/modelos/LICENSE.md`)
 * e recolore seus materiais pela paleta da sala.
 *
 * **O tamanho é pedido em metros, não em fator de escala.** A unidade interna
 * de cada modelo é imprevisível — nem sempre é metro, e o pivô raramente está
 * no centro do chão da peça —, então "escala 1.9" não significa nada sem abrir
 * o arquivo. Pior: dá pra medir errado com confiança, lendo o `min`/`max` dos
 * acessores do glTF, porque esses números estão no espaço LOCAL da malha e
 * ignoram as transformações dos nós que a envolvem.
 *
 * Aqui o `Box3.setFromObject` mede a árvore já montada — com transformações
 * aplicadas — e a escala sai de uma divisão. Como efeito colateral o contrato
 * de posicionamento fica previsível: **`position` é o ponto do chão sob o
 * centro da peça**, sempre, para qualquer modelo.
 */
export default function KenneyModel({
    url, cores, emissivos, texturas, position, rotation, alturaAlvo, larguraAlvo,
}: KenneyModelProps) {
    const {scene} = useGLTF(url);

    // O `scene` que o useGLTF devolve é COMPARTILHADO entre todos os usos da
    // mesma url (ele cacheia por url). Montá-lo direto significaria que o
    // segundo uso rouba o objeto do primeiro — e recolorir um pintaria o
    // outro. Daí clonar a cena e clonar cada material antes de mexer na cor.
    //
    // A chave do useMemo serializa `cores` porque o objeto literal vindo do
    // JSX do pai tem identidade nova a cada render; sem isso, o clone (que
    // percorre a árvore inteira) refaria toda vez.
    // As texturas entram na chave pelo `uuid` porque objetos Three não
    // serializam — e sem elas aqui, trocar a imagem de uma tela não refaria o
    // clone e a troca não apareceria.
    const chaveCores = JSON.stringify([
        cores ?? null,
        emissivos ?? null,
        Object.entries(texturas ?? {}).map(([nome, t]) => [nome, t.uuid]),
    ]);
    const {objeto, descartaveis} = useMemo(() => {
        // Tudo que este componente criar com `.clone()` entra aqui, para o
        // cleanup lá embaixo saber exatamente o que descartar. Uma lista
        // explícita, e não uma varredura do resultado: a geometria do clone é a
        // MESMA instância do original quando não há textura, e descartá-la por
        // engano apagaria a malha de todos os outros usos do mesmo .glb.
        const descartaveis: {dispose: () => void}[] = [];
        const clone = scene.clone(true);
        clone.traverse((filho: Object3D) => {
            const mesh = filho as Mesh;
            if (!mesh.isMesh || !mesh.material || Array.isArray(mesh.material)) return;
            const material = mesh.material.clone();
            descartaveis.push(material);
            const nova = cores?.[material.name];
            if (nova && 'color' in material) {
                (material as unknown as {color: {set: (c: string) => void}}).color.set(nova);
            }
            const imagem = texturas?.[material.name];
            if (imagem) {
                // A geometria é COMPARTILHADA entre clones do mesmo .glb (o
                // clone(true) copia a árvore, não os buffers), então remapear
                // as UVs no lugar mexeria em todos os monitores da sala de uma
                // vez — inclusive nos que recebem outra imagem. Daí a cópia.
                mesh.geometry = mesh.geometry.clone();
                descartaveis.push(mesh.geometry);
                normalizarUV(mesh.geometry);
                const m = material as unknown as {map: THREE.Texture | null; color: {set: (c: string) => void}};
                m.map = imagem;
                // Branco no `color`: ele MULTIPLICA a textura, então qualquer
                // outra cor tingiria a imagem inteira.
                m.color.set('#ffffff');
            }

            const brilho = emissivos?.[material.name];
            if (brilho && 'emissive' in material) {
                const m = material as unknown as {
                    emissive: {set: (c: string) => void};
                    emissiveIntensity: number;
                };
                m.emissive.set(brilho.cor);
                m.emissiveIntensity = brilho.intensidade ?? 1;
                // Com imagem, é ELA que acende: sem o emissiveMap a tela
                // brilharia numa cor chapada por cima do print, apagando-o.
                if (imagem) (m as unknown as {emissiveMap: THREE.Texture}).emissiveMap = imagem;
            }
            mesh.material = material;
        });

        const caixa = new Box3().setFromObject(clone);
        const tamanho = caixa.getSize(new Vector3());
        const centro = caixa.getCenter(new Vector3());

        // Com um alvo só a escala é uniforme (o outro eixo herda o mesmo
        // fator, que é o que preserva a proporção do modelo). Com os dois, X/Z
        // e Y passam a ter fatores próprios.
        const porLargura = larguraAlvo ? larguraAlvo / Math.max(tamanho.x, tamanho.z) : null;
        const porAltura = alturaAlvo ? alturaAlvo / tamanho.y : null;
        const escalaXZ = porLargura ?? porAltura ?? 1;
        const escalaY = porAltura ?? porLargura ?? 1;
        clone.scale.set(escalaXZ, escalaY, escalaXZ);

        // Recentra em X/Z e assenta a base em Y=0, para que `position` sempre
        // signifique a mesma coisa. Sem isso, cada modelo herdaria o pivô
        // arbitrário que o autor deixou e a peça apareceria deslocada de um
        // tanto diferente a cada troca de arquivo.
        clone.position.set(-centro.x * escalaXZ, -caixa.min.y * escalaY, -centro.z * escalaXZ);

        // O <group> lá embaixo é necessário porque o próprio clone já usa sua
        // position/scale no recentramento acima — aplicar a posição da cena nele
        // sobrescreveria esse ajuste.
        return {objeto: clone, descartaveis};
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, chaveCores, alturaAlvo, larguraAlvo]);

    // Materiais e geometrias clonados acima saíram de `.clone()` em código, e o
    // R3F não descarta isso ao desmontar nem ao refazer o memo — mesma regra do
    // Book.tsx. Para a mobília fixa o memo nunca refaz e isto nunca roda; quem
    // torna necessário é o monitor que cicla imagem → chuva → desligado, gerando
    // um clone novo a cada clique.
    //
    // As `texturas` não entram: vêm de fora, e quem carrega é quem descarta.
    useEffect(() => () => descartaveis.forEach((d) => d.dispose()), [descartaveis]);

    return (
        <group position={position} rotation={rotation}>
            <primitive object={objeto}/>
        </group>
    );
}

// Todo url listado aqui é PRÉ-CARREGADO na última linha do arquivo. Sem isso,
// cada modelo só começa a baixar quando seu componente monta, e a sala aparece
// mobiliando-se em cascata na frente de quem abriu a página. O outro lado da
// moeda: incluir um modelo que ninguém monta é custo na primeira carga.
//
// Nem todos vêm do Furniture Kit CC0 do Kenney — vários foram escolhidos no
// poly.pizza e alguns são CC BY, com crédito obrigatório. Quem é o quê está em
// public/livros/modelos/LICENSE.md. Os que trazem textura embutida (a estante do
// acervo, a espada curta) não aparecem em nenhum mapa de `cores`.
export const MODELOS = {
    estanteLivros: '/livros/modelos/bookshelf-tall.glb',
    lavaLamp: '/livros/modelos/lava-lamp.glb',
    espadaCurta: '/livros/modelos/sword-short.glb',
    espadaLonga: '/livros/modelos/sword-long.glb',
    telefone: '/livros/modelos/phone.glb',
    headphone: '/livros/modelos/headphone.glb',
    // Os trecos de sobrevivência da estante amarela
    corda: '/livros/modelos/corda.glb',
    kitPrimeirosSocorros: '/livros/modelos/kit-primeiros-socorros.glb',
    lanterna: '/livros/modelos/lanterna.glb',
    lampiao: '/livros/modelos/lampiao.glb',
    isqueiro: '/livros/modelos/isqueiro.glb',
    sacoDeDormir: '/livros/modelos/saco-de-dormir.glb',
    walkieTalkie: '/livros/modelos/walkie-talkie.glb',
    mochila: '/livros/modelos/mochila.glb',
    xicara: '/livros/modelos/xicara.glb',
    kettlebell: '/livros/modelos/kettlebell.glb',
    poltrona: '/livros/modelos/lounge-chair.glb',
    estanteAmarela: '/livros/modelos/bookcase-open.glb',
    mesinha: '/livros/modelos/side-table.glb',
    tapete: '/livros/modelos/rug-rectangle.glb',
    tapeteQuadrado: '/livros/modelos/rug-square.glb',
    // O canto de trabalho, à direita da estante
    mesaEmL: '/livros/modelos/desk-corner.glb',
    cadeiraDeEscritorio: '/livros/modelos/desk-chair.glb',
    monitor: '/livros/modelos/computer-screen.glb',
    teclado: '/livros/modelos/computer-keyboard.glb',
    livroAberto: '/livros/modelos/open-book.glb',
    planta: '/livros/modelos/potted-plant.glb',
    abajur: '/livros/modelos/lamp-round-floor.glb',
} as const;

Object.values(MODELOS).forEach((url) => useGLTF.preload(url));
