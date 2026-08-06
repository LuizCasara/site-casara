'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {useRouter} from 'next/navigation';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import StarRating from '@/components/livros/StarRating';
import {BOOK_DEPTH_M} from '@/lib/book-dimensions.mjs';
import {corDeLombada} from '@/lib/cor-lombada.mjs';

// Ordem de materiais do BoxGeometry: [+x, -x, +y, -y, +z, -z].
//
// A lombada é a face +z. A capa é a face **-x**, e só ela: a geometria é
// (espessura, altura, profundidade), então -x é a única face grande do volume —
// profundidade x altura, a proporção de um livro de verdade. A face -z, oposta à
// lombada, tem a LARGURA DA LOMBADA: usá-la como capa esmaga a imagem numa tira
// de 3cm.
//
// É a mesma face nas duas situações em que a capa aparece: virada para a câmera
// quando o livro abre e virada para cima quando ele está deitado na pilha.
const SPINE_FACE_INDEX = 4;
const COVER_FACE_INDEX = 1;
const FALLBACK_SPINE_COLOR = '#4b4b4b';
const HOVER_SLIDE_M = 0.035;
const HOVER_TILT_RAD = 0.12;
const HOVER_LERP_SPEED = 8;
const OPEN_TILT_RAD = -0.35;

/**
 * A abertura é uma animação com DURAÇÃO, não um amortecimento.
 *
 * Com `damp` tudo — sair da prateleira, subir, girar — acontecia junto, e o
 * formato da curva (rápido no começo, arrastando no fim) fazia o essencial
 * passar em poucos frames. Com um progresso 0→1 dá para escalonar os gestos.
 */
const ABERTURA_S = 0.95;
/** Fechar é mais rápido que abrir: ninguém quer esperar para sair. */
const FECHAMENTO_S = 0.45;
/** Fração do progresso em que o livro termina de sair da prateleira. */
const FASE_SAIDA = 0.4;
/** Fração em que o giro começa — antes de a saída terminar, para se encavalarem. */
const FASE_GIRO_INICIO = 0.25;
/** O quanto o livro avança para fora do móvel ao abrir. */
const AVANCO_ABERTURA_M = 0.32;
const SUBIDA_ABERTURA_M = 0.14;
/** Deitado na mesa, ele sobe mais: sai de uma pilha, não de uma fila. */
const SUBIDA_ABERTURA_MESA_M = 0.26;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Sai rápido e freia — o gesto de puxar algo de uma prateleira. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
/** Começa e termina devagar — o giro, que é o que se quer ver. */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Livro deitado sobre a mesa: rotação de 90° em torno de Z, não de X.
//
// A geometria é BoxGeometry(thicknessM, heightM, BOOK_DEPTH_M). Girando em X, o
// que ia parar na vertical era a PROFUNDIDADE (20cm) e o livro atravessava o
// tampo. Girando em Z é a espessura que sobe, que é o que "deitado" quer dizer —
// e é a mesma suposição que layoutDeskBooks usa para empilhar somando espessuras.
//
// Negativo, e não positivo: +90° põe o topo das letras da lombada apontando pra
// -x, e o título fica de cabeça pra baixo para quem olha a mesa.
const DESK_REST_ROT_Z_RAD = -Math.PI / 2;

// Área de detecção maior que o volume visível da lombada: com espessura mínima
// de 12mm, a malha real ocupa poucos pixels e fica quase impossível de acertar
// com o mouse. Contrapartida aceita: com um acervo bem mais denso, as hitboxes
// de vizinhos podem se sobrepor um pouco perto da borda.
/** Distância entre o livro e o balão de hover. */
const BALAO_FOLGA_M = 0.06;
const HITBOX_MIN_THICKNESS_M = 0.05;
const HITBOX_HEIGHT_PADDING_M = 0.06;
const HITBOX_DEPTH_PADDING_M = 0.08;

/**
 * Rotação Y local que deixa a capa de frente pra câmera.
 *
 * Um QUARTO de volta no mundo, não meia: em repouso o livro mostra a lombada
 * (+z) e a capa está na face -x — meia volta traria a face -z, que é a estreita
 * (ver COVER_FACE_INDEX). Como o grupo pai já contribui com a rotação dele
 * (Bookshelf ancora em `estante`, sem rotação; DeskBooks em `mesa`, girada em
 * Y), a rotação local desconta isso.
 */
function rotacaoDeFrente(anchor: {rotation: [number, number, number]}) {
    return Math.PI / 2 - anchor.rotation[1];
}

export type ShelfBookData = {
    slug: string;
    title: string;
    author: string | null;
    rating: string | null;
    thicknessM: number;
    heightM: number;
    spineColor: string | null;
    coverPath: string | null;
    category: string;
    tags: string[];
    year: number | null;
    /**
     * Data de leitura. `Book` não usa — quem usa é o agrupamento por nicho em
     * Bookshelf.tsx —, mas o campo mora aqui porque é este o tipo que atravessa
     * a estante inteira.
     */
    finishedAt: Date | string | null;
};

type BookProps = {
    book: ShelfBookData;
    position: [number, number, number];
    atlasTexture: THREE.Texture;
    uvRange: {u0: number; u1: number};
    isOpen: boolean;
    animate: boolean;
    isMobile: boolean;
    anchor: {position: [number, number, number]; rotation: [number, number, number]};
    restVariant?: 'lombada' | 'capa';
    restRotationY?: number;
};

/** Remapeia as UVs padrão (0..1) de uma face do BoxGeometry para um sub-retângulo do atlas. */
function setBoxFaceUV(geometry: THREE.BoxGeometry, faceIndex: number, u0: number, u1: number, v0: number, v1: number) {
    const uv = geometry.attributes.uv as THREE.BufferAttribute;
    const base = faceIndex * 4; // 4 vértices por face
    for (let i = 0; i < 4; i++) {
        const vi = base + i;
        const oldU = uv.getX(vi);
        const oldV = uv.getY(vi);
        uv.setXY(vi, u0 + oldU * (u1 - u0), v0 + oldV * (v1 - v0));
    }
    uv.needsUpdate = true;
}

export default function Book({
    book, position, atlasTexture, uvRange, isOpen, animate, isMobile, anchor,
    restVariant = 'lombada', restRotationY = 0,
}: BookProps) {
    const router = useRouter();
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const [coverTexture, setCoverTexture] = useState<THREE.Texture | null>(null);
    /** 0 = na prateleira, 1 = aberto e de frente. Avança/recua com o tempo. */
    const progressoRef = useRef(isOpen && !animate ? 1 : 0);
    const rotacaoAberta = rotacaoDeFrente(anchor);

    /**
     * Onde o balão de hover nasce, no espaço LOCAL deste grupo — que para os
     * livros da mesa está girado 90° em Z (ver DESK_REST_ROT_Z_RAD).
     *
     * De pé é o óbvio: um tanto acima do topo. Deitado, +Y local aponta para +X
     * do mundo, então o mesmo offset jogaria o balão para o LADO do livro,
     * dentro da mesa. Com a rotação de -90° em Z, o local que vira "para cima" no
     * mundo é -X, e a altura a vencer é a ESPESSURA, não a altura do livro.
     */
    const posicaoDoBalao: [number, number, number] = restVariant === 'capa'
        ? [-(book.thicknessM / 2 + BALAO_FOLGA_M), 0, 0]
        : [0, book.heightM / 2 + BALAO_FOLGA_M, 0];

    const geometry = useMemo(() => {
        const geo = new THREE.BoxGeometry(book.thicknessM, book.heightM, BOOK_DEPTH_M);
        setBoxFaceUV(geo, SPINE_FACE_INDEX, uvRange.u0, uvRange.u1, 0, 1);
        // Capa com U E V invertidos — a textura girada 180° — enquanto o livro
        // está DEITADO na mesa. As UVs de fábrica da face -x são orientadas para
        // ser vista de fora do volume, olhando na direção +x, que é o ponto de
        // vista de quem olha a capa do livro aberto e em pé; deitado, o
        // observador olha essa mesma face de cima para baixo.
        //
        // Os dois eixos, não um: invertendo só o U a capa fica girada, e só o V
        // fica espelhada — as duas assinaturas de um defeito que é rotação de
        // 180°, não espelhamento.
        //
        // Depende de `isOpen` porque um livro da mesa passa pelos dois estados:
        // deitado na pilha e, ao abrir, levantado de frente.
        if (restVariant === 'capa' && !isOpen) setBoxFaceUV(geo, COVER_FACE_INDEX, 1, 0, 1, 0);
        return geo;
    }, [book.thicknessM, book.heightM, uvRange.u0, uvRange.u1, restVariant, isOpen]);
    // Geometrias/materiais criados via `new THREE.X()` em código (em vez de JSX)
    // não são descartados automaticamente pelo R3F ao desmontar ou recalcular —
    // sem isso, filtrar livros no índice vaza memória de GPU ao longo da sessão.
    useEffect(() => () => geometry.dispose(), [geometry]);

    const hitboxGeometry = useMemo(() => new THREE.BoxGeometry(
        Math.max(book.thicknessM, HITBOX_MIN_THICKNESS_M),
        book.heightM + HITBOX_HEIGHT_PADDING_M,
        BOOK_DEPTH_M + HITBOX_DEPTH_PADDING_M,
    ), [book.thicknessM, book.heightM]);
    useEffect(() => () => hitboxGeometry.dispose(), [hitboxGeometry]);

    // A capa real só é baixada quando o livro é aberto: a API de covers da Open
    // Library tem rate limit, então a estante inteira nunca carrega 50 capas de
    // uma vez. Exceção: os livros "lendo agora" (restVariant 'capa') mostram a
    // capa de imediato — são no máximo 1 a 3, o custo é desprezível.
    useEffect(() => {
        const deveCarregar = isOpen || restVariant === 'capa';
        if (!deveCarregar || !book.coverPath || coverTexture) return;
        let cancelado = false;
        new THREE.TextureLoader().load(book.coverPath, (tex) => {
            if (cancelado) return;
            tex.colorSpace = THREE.SRGBColorSpace;
            setCoverTexture(tex);
        });
        return () => {
            cancelado = true;
        };
    }, [isOpen, restVariant, book.coverPath, coverTexture]);
    useEffect(() => () => coverTexture?.dispose(), [coverTexture]);

    const materials = useMemo(() => {
        // Mesma paleta da lombada (lib/cor-lombada.mjs): as faces laterais são
        // pintadas com a cor da capa, e sem a correção elas brilhariam pelos
        // mesmos motivos — só que em área muito maior.
        const corCapa = corDeLombada(book.spineColor || FALLBACK_SPINE_COLOR);
        const materialCapa = new THREE.MeshStandardMaterial({color: corCapa, roughness: 0.8});
        const materialLombada = new THREE.MeshStandardMaterial({map: atlasTexture, roughness: 0.7});
        const materialCapaFrontal = coverTexture
            ? new THREE.MeshStandardMaterial({map: coverTexture, roughness: 0.6})
            : materialCapa;
        const lista = [materialCapa, materialCapa, materialCapa, materialCapa, materialLombada, materialCapa];
        lista[COVER_FACE_INDEX] = materialCapaFrontal;
        return lista;
    }, [book.spineColor, atlasTexture, coverTexture]);
    // `materialLombada` referencia `atlasTexture` (prop compartilhada entre todos
    // os livros — não descartar) mas os outros materiais desta lista são
    // exclusivos deste Book; dispose() repetido na mesma instância é inócuo.
    useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

    useFrame((_, delta) => {
        const grupo = groupRef.current;
        if (!grupo) return;

        const emCapa = restVariant === 'capa';
        const restRotY = emCapa ? restRotationY : 0;
        const restRotZ = emCapa ? DESK_REST_ROT_Z_RAD : 0;

        // Progresso da abertura, em segundos de verdade — `delta` dividido pela
        // duração desejada. Chega a 0 ou 1 e para.
        const alvo = isOpen ? 1 : 0;
        const passo = delta / (isOpen ? ABERTURA_S : FECHAMENTO_S);
        progressoRef.current = alvo > progressoRef.current
            ? Math.min(alvo, progressoRef.current + passo)
            : Math.max(alvo, progressoRef.current - passo);
        const p = progressoRef.current;

        if (p > 0) {
            // Dois gestos encavalados: o livro primeiro DESLIZA para fora da fila
            // (curva que freia no fim, como puxar algo de uma prateleira) e,
            // quando já está saindo, começa a subir e a girar a capa (curva lenta
            // nas duas pontas — é o movimento que a pessoa clicou para ver).
            const saida = easeOut(clamp01(p / FASE_SAIDA));
            const giro = easeInOut(clamp01((p - FASE_GIRO_INICIO) / (1 - FASE_GIRO_INICIO)));
            const subida = emCapa ? SUBIDA_ABERTURA_MESA_M : SUBIDA_ABERTURA_M;

            grupo.position.set(
                position[0],
                position[1] + subida * giro,
                position[2] + AVANCO_ABERTURA_M * saida,
            );
            grupo.rotation.set(
                OPEN_TILT_RAD * giro,
                restRotY + (rotacaoAberta - restRotY) * giro,
                // Deitado, o livro se levanta enquanto gira: a rotação de repouso
                // em Z volta a zero no mesmo compasso.
                restRotZ * (1 - giro),
            );
            return;
        }

        // Fechado: só o hover mexe, e aí sim um amortecimento é o certo — não há
        // começo nem fim definidos, o mouse pode sair no meio.
        const alvoZ = position[2] + (!emCapa && hovered ? HOVER_SLIDE_M : 0);
        const alvoRotX = !emCapa && hovered ? -HOVER_TILT_RAD : 0;

        grupo.position.x = THREE.MathUtils.damp(grupo.position.x, position[0], HOVER_LERP_SPEED, delta);
        grupo.position.y = THREE.MathUtils.damp(grupo.position.y, position[1], HOVER_LERP_SPEED, delta);
        grupo.position.z = THREE.MathUtils.damp(grupo.position.z, alvoZ, HOVER_LERP_SPEED, delta);
        grupo.rotation.x = THREE.MathUtils.damp(grupo.rotation.x, alvoRotX, HOVER_LERP_SPEED, delta);
        grupo.rotation.y = THREE.MathUtils.damp(grupo.rotation.y, restRotY, HOVER_LERP_SPEED, delta);
        grupo.rotation.z = THREE.MathUtils.damp(grupo.rotation.z, restRotZ, HOVER_LERP_SPEED, delta);
    });

    return (
        <group
            ref={groupRef}
            position={position}
            onPointerOver={(e) => {
                if (isOpen || isMobile) return;
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                if (isOpen || isMobile) return;
                e.stopPropagation();
                setHovered(false);
                document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
                if (isOpen) return;
                e.stopPropagation();
                router.push(`/livros/${book.slug}`);
            }}
        >
            <mesh geometry={geometry} material={materials}/>
            <mesh geometry={hitboxGeometry}>
                <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
            </mesh>
            {hovered && !isOpen && (
                /*
                  SEM `distanceFactor` e SEM `occlude`, os dois de propósito.

                  O fator escala o conteúdo por fator/distância: o balão que
                  parecia certo na cena "Sala" (a ~4m) virava uma placa cobrindo a
                  prateleira inteira no zoom de um ano (a ~0,6m). Sem ele o
                  tamanho é constante em pixels, como nas etiquetas de ano.

                  `occlude` esconde o HTML quando qualquer geometria fica entre
                  ele e a câmera — e o balão nasce logo acima do livro, ou seja,
                  atrás da prateleira de cima em quase todo ângulo. Era essa a
                  razão de ele aparecer em alguns livros e não em outros.
                */
                <Html position={posicaoDoBalao} center style={{pointerEvents: 'none'}}>
                    <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full
                                     bg-black/80 px-2 py-0.5 text-[11px] text-white shadow-lg backdrop-blur-sm">
                        <span className="max-w-[180px] truncate font-semibold">{book.title}</span>
                        <StarRating nota={book.rating} tamanho="text-[9px]"/>
                    </span>
                </Html>
            )}
        </group>
    );
}
