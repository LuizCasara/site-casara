'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {useRouter} from 'next/navigation';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import StarRating from '@/components/livros/StarRating';
import {ROOM_ANCHORS} from '@/components/livros/Room';
import {BOOK_DEPTH_M} from '@/lib/book-dimensions.mjs';

// Ordem de materiais do BoxGeometry: [+x, -x, +y, -y, +z, -z].
// A lombada (visível na estante) é a face +z; a capa frontal (visível só
// quando o livro abre e gira 180°, ou de imediato nos livros da mesa) é a
// face -z, oposta.
const SPINE_FACE_INDEX = 4;
const COVER_FACE_INDEX = 5;
const FALLBACK_SPINE_COLOR = '#4b4b4b';
const HOVER_SLIDE_M = 0.035;
const HOVER_TILT_RAD = 0.12;
const HOVER_LERP_SPEED = 8;
const OPEN_LERP_SPEED = 3;
const OPEN_TILT_RAD = -0.35;
// Livro "fora do lugar" além desta distância (aberto ou voltando a fechar)
// anima na velocidade lenta de abertura; hover puro usa a velocidade rápida.
const DESLOCAMENTO_GRANDE_M = 0.1;
// Quase deitado (-90° seria totalmente plano) — o suficiente pra "capa
// virada" ficar legível em ângulo, sem virar um adesivo grudado na mesa.
const DESK_REST_TILT_RAD = -1.3;

// Área de detecção de hover/clique maior que o volume visível da lombada —
// com poucos livros no acervo (espessura mínima de 12mm), a malha real ocupa
// poucos pixels na tela e fica quase impossível de acertar com um mouse de
// verdade (confirmado testando manualmente). Uma malha invisível maior por
// trás resolve isso sem mudar a espessura visual.
// Contrapartida aceita: com um acervo bem mais denso (~51+ livros lado a
// lado), esse mínimo de largura pode fazer hitboxes de vizinhos se
// sobreporem um pouco perto da borda — revisitar então se virar problema.
const HITBOX_MIN_THICKNESS_M = 0.05;
const HITBOX_HEIGHT_PADDING_M = 0.06;
const HITBOX_DEPTH_PADDING_M = 0.08;

/**
 * Converte o alvo de abertura (a âncora `leitura`, em coordenadas do mundo)
 * pro espaço local do grupo que envolve este livro — Bookshelf.tsx ancora em
 * `estante` (sem rotação), DeskBooks.tsx ancora em `mesa` (rotacionada em Y).
 * Usar o deslocamento calculado pra um dos dois em código pensado pro outro
 * abre o livro na posição/ângulo errados sempre que o grupo pai tiver
 * rotação diferente de zero — por isso este cálculo depende do `anchor` do
 * grupo pai, não de uma constante fixa.
 */
function calcularAberturaLocal(anchor: {position: [number, number, number]; rotation: [number, number, number]}) {
    const leitura = ROOM_ANCHORS.leitura.position;
    const dx = leitura[0] - anchor.position[0];
    const dy = leitura[1] - anchor.position[1];
    const dz = leitura[2] - anchor.position[2];
    const theta = anchor.rotation[1];
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    return {
        position: [dx * cos - dz * sin, dy, dx * sin + dz * cos] as [number, number, number],
        // Rotação Y mundial alvo é sempre Math.PI (livro de frente pra
        // câmera); como o grupo pai já contribui com `theta`, a rotação
        // local precisa compensar isso pra a soma continuar dando Math.PI.
        rotationY: Math.PI - theta,
    };
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
    const snappedRef = useRef(false);
    const abertura = useMemo(() => calcularAberturaLocal(anchor), [anchor]);

    const geometry = useMemo(() => {
        const geo = new THREE.BoxGeometry(book.thicknessM, book.heightM, BOOK_DEPTH_M);
        setBoxFaceUV(geo, SPINE_FACE_INDEX, uvRange.u0, uvRange.u1, 0, 1);
        return geo;
    }, [book.thicknessM, book.heightM, uvRange.u0, uvRange.u1]);
    // Geometrias/materiais criados via `new THREE.X()` em código (em vez de
    // JSX) não são descartados automaticamente pelo R3F ao desmontar ou
    // recalcular — sem isso, filtrar livros no índice ou trocar de capa
    // vaza memória de GPU ao longo de uma sessão.
    useEffect(() => () => geometry.dispose(), [geometry]);

    const hitboxGeometry = useMemo(() => new THREE.BoxGeometry(
        Math.max(book.thicknessM, HITBOX_MIN_THICKNESS_M),
        book.heightM + HITBOX_HEIGHT_PADDING_M,
        BOOK_DEPTH_M + HITBOX_DEPTH_PADDING_M,
    ), [book.thicknessM, book.heightM]);
    useEffect(() => () => hitboxGeometry.dispose(), [hitboxGeometry]);

    // A capa real normalmente só é baixada quando o livro é aberto — ver
    // spec, "Atlas de lombadas": a API de covers da Open Library tem rate
    // limit, então a estante inteira nunca carrega 51 capas de uma vez.
    // Exceção explícita do spec: os livros "lendo agora" (restVariant
    // 'capa') mostram a capa de imediato — são no máximo 1 a 3, o custo é
    // desprezível.
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
        const corCapa = book.spineColor || FALLBACK_SPINE_COLOR;
        const materialCapa = new THREE.MeshStandardMaterial({color: corCapa, roughness: 0.8});
        const materialLombada = new THREE.MeshStandardMaterial({map: atlasTexture, roughness: 0.7});
        const materialCapaFrontal = coverTexture
            ? new THREE.MeshStandardMaterial({map: coverTexture, roughness: 0.6})
            : materialCapa;
        const lista = [materialCapa, materialCapa, materialCapa, materialCapa, materialLombada, materialCapa];
        lista[COVER_FACE_INDEX] = materialCapaFrontal;
        return lista;
    }, [book.spineColor, atlasTexture, coverTexture]);
    // `materialLombada` referencia `atlasTexture` (prop compartilhada entre
    // todos os livros — não descartar) mas os outros materiais desta lista
    // são exclusivos deste Book; dispose() duas vezes na mesma instância
    // (materialCapa aparece 5x na lista) não tem efeito colateral.
    useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

    // Nav direta a /livros/<slug> (link externo): o livro já nasce aberto,
    // sem animação — não houve clique prévio que a justifique (ver spec).
    useEffect(() => {
        if (isOpen && !animate && !snappedRef.current && groupRef.current) {
            groupRef.current.position.set(...abertura.position);
            groupRef.current.rotation.set(OPEN_TILT_RAD, abertura.rotationY, 0);
            snappedRef.current = true;
        }
    }, [isOpen, animate, abertura]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        if (isOpen && !animate && snappedRef.current) return; // já encaixado, nada a animar

        // O repouso ("fechado") não é a origem do grupo — é a posição da prop
        // `position`, que é diferente por livro (slot na prateleira). Usar 0
        // aqui faria todo livro derivar pra origem da estante a cada frame.
        const distanciaDoRepouso = groupRef.current.position.distanceTo(
            new THREE.Vector3(position[0], position[1], position[2]),
        );
        const velocidade = (isOpen || distanciaDoRepouso > DESLOCAMENTO_GRANDE_M) ? OPEN_LERP_SPEED : HOVER_LERP_SPEED;

        const emCapa = restVariant === 'capa';
        const restRotX = emCapa ? DESK_REST_TILT_RAD : 0;
        const restRotYFinal = emCapa ? Math.PI + restRotationY : 0;

        const alvoX = isOpen ? abertura.position[0] : position[0];
        const alvoY = isOpen ? abertura.position[1] : position[1];
        const alvoZ = isOpen ? abertura.position[2] : position[2] + (!emCapa && hovered ? HOVER_SLIDE_M : 0);
        const alvoRotX = isOpen ? OPEN_TILT_RAD : (restRotX + (!emCapa && hovered ? -HOVER_TILT_RAD : 0));
        const alvoRotY = isOpen ? abertura.rotationY : restRotYFinal;

        groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, alvoX, velocidade, delta);
        groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, alvoY, velocidade, delta);
        groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, alvoZ, velocidade, delta);
        groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, alvoRotX, velocidade, delta);
        groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, alvoRotY, velocidade, delta);
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
                <Html position={[0, book.heightM / 2 + 0.08, 0]} center distanceFactor={6} occlude>
                    <div className="pointer-events-none whitespace-nowrap rounded-lg bg-black/80 px-3 py-2 text-center text-white shadow-lg backdrop-blur-sm">
                        <p className="text-sm font-bold">{book.title}</p>
                        {book.author && <p className="text-xs opacity-80">{book.author}</p>}
                        <StarRating nota={book.rating} tamanho="justify-center text-xs"/>
                    </div>
                </Html>
            )}
        </group>
    );
}
