'use client';

import {useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {Box3, Vector3} from 'three';
import type {Mesh, Object3D} from 'three';

/**
 * Mapa de cor por NOME de material, não por índice: os modelos do Kenney
 * nomeiam os materiais semanticamente (`wood`, `metal`, `carpet`, `lamp`,
 * `plant`), então `{carpet: '#b5a48d'}` significa "o estofado desta poltrona
 * fica creme" e continua significando isso se o modelo for trocado por outro
 * do mesmo pacote. Por índice, qualquer troca embaralharia as cores em
 * silêncio.
 */
export type CoresPorMaterial = Record<string, string>;

type KenneyModelProps = {
    url: string;
    cores?: CoresPorMaterial;
    position?: [number, number, number];
    rotation?: [number, number, number];
    /** Altura final em METROS. O componente calcula a escala sozinho. */
    alturaAlvo?: number;
    /** Largura final em metros. Use no lugar de `alturaAlvo` para peças
     *  achatadas (tapete), onde a altura não diz nada sobre o tamanho. */
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
export default function KenneyModel({url, cores, position, rotation, alturaAlvo, larguraAlvo}: KenneyModelProps) {
    const {scene} = useGLTF(url);

    // O `scene` que o useGLTF devolve é COMPARTILHADO entre todos os usos da
    // mesma url (ele cacheia por url). Montá-lo direto significaria que o
    // segundo uso rouba o objeto do primeiro — e recolorir um pintaria o
    // outro. Daí clonar a cena e clonar cada material antes de mexer na cor.
    //
    // A chave do useMemo serializa `cores` porque o objeto literal vindo do
    // JSX do pai tem identidade nova a cada render; sem isso, o clone (que
    // percorre a árvore inteira) refaria toda vez.
    const chaveCores = JSON.stringify(cores ?? null);
    const objeto = useMemo(() => {
        const clone = scene.clone(true);
        clone.traverse((filho: Object3D) => {
            const mesh = filho as Mesh;
            if (!mesh.isMesh || !mesh.material || Array.isArray(mesh.material)) return;
            const material = mesh.material.clone();
            const nova = cores?.[material.name];
            if (nova && 'color' in material) {
                (material as unknown as {color: {set: (c: string) => void}}).color.set(nova);
            }
            mesh.material = material;
        });

        const caixa = new Box3().setFromObject(clone);
        const tamanho = caixa.getSize(new Vector3());
        const centro = caixa.getCenter(new Vector3());

        const escala = larguraAlvo
            ? larguraAlvo / Math.max(tamanho.x, tamanho.z)
            : alturaAlvo
                ? alturaAlvo / tamanho.y
                : 1;
        clone.scale.setScalar(escala);

        // Recentra em X/Z e assenta a base em Y=0, para que `position` sempre
        // signifique a mesma coisa. Sem isso, cada modelo herdaria o pivô
        // arbitrário que o autor deixou e a peça apareceria deslocada de um
        // tanto diferente a cada troca de arquivo.
        clone.position.set(-centro.x * escala, -caixa.min.y * escala, -centro.z * escala);

        // Um <group> extra é necessário porque o próprio clone já usa sua
        // position/scale para o recentramento acima — aplicar a posição da
        // cena nele sobrescreveria esse ajuste.
        return clone;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, chaveCores, alturaAlvo, larguraAlvo]);

    return (
        <group position={position} rotation={rotation}>
            <primitive object={objeto}/>
        </group>
    );
}

// Sem isto, cada modelo só começa a baixar quando seu componente monta, e a
// sala aparece mobiliando-se em cascata na frente de quem abriu a página.
export const MODELOS = {
    poltrona: '/livros/modelos/lounge-chair.glb',
    estanteAmarela: '/livros/modelos/bookcase-open.glb',
    mesinha: '/livros/modelos/side-table.glb',
    tapete: '/livros/modelos/rug-rectangle.glb',
    planta: '/livros/modelos/potted-plant.glb',
    abajur: '/livros/modelos/lamp-round-floor.glb',
    livrosDecorativos: '/livros/modelos/books.glb',
} as const;

Object.values(MODELOS).forEach((url) => useGLTF.preload(url));
