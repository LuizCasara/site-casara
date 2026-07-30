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
// quando o livro abre e gira 180°) é a face -z, oposta.
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

const OPEN_LOCAL_POSITION: [number, number, number] = [
    ROOM_ANCHORS.leitura.position[0] - ROOM_ANCHORS.estante.position[0],
    ROOM_ANCHORS.leitura.position[1] - ROOM_ANCHORS.estante.position[1],
    ROOM_ANCHORS.leitura.position[2] - ROOM_ANCHORS.estante.position[2],
];

export type ShelfBookData = {
    slug: string;
    title: string;
    author: string | null;
    rating: string | null;
    thicknessM: number;
    heightM: number;
    spineColor: string | null;
    coverPath: string | null;
};

type BookProps = {
    book: ShelfBookData;
    position: [number, number, number];
    atlasTexture: THREE.Texture;
    uvRange: {u0: number; u1: number};
    isOpen: boolean;
    animate: boolean;
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

export default function Book({book, position, atlasTexture, uvRange, isOpen, animate}: BookProps) {
    const router = useRouter();
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const [coverTexture, setCoverTexture] = useState<THREE.Texture | null>(null);
    const snappedRef = useRef(false);

    const geometry = useMemo(() => {
        const geo = new THREE.BoxGeometry(book.thicknessM, book.heightM, BOOK_DEPTH_M);
        setBoxFaceUV(geo, SPINE_FACE_INDEX, uvRange.u0, uvRange.u1, 0, 1);
        return geo;
    }, [book.thicknessM, book.heightM, uvRange.u0, uvRange.u1]);

    // A capa real só é baixada quando o livro é aberto — ver spec, "Atlas de
    // lombadas": a API de covers da Open Library tem rate limit, então a
    // estante inteira nunca carrega 51 capas de uma vez, só a que abriu.
    useEffect(() => {
        if (!isOpen || !book.coverPath || coverTexture) return;
        let cancelado = false;
        new THREE.TextureLoader().load(book.coverPath, (tex) => {
            if (cancelado) return;
            tex.colorSpace = THREE.SRGBColorSpace;
            setCoverTexture(tex);
        });
        return () => {
            cancelado = true;
        };
    }, [isOpen, book.coverPath, coverTexture]);

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

    // Nav direta a /livros/<slug> (link externo): o livro já nasce aberto,
    // sem animação — não houve clique prévio que a justifique (ver spec).
    useEffect(() => {
        if (isOpen && !animate && !snappedRef.current && groupRef.current) {
            groupRef.current.position.set(...OPEN_LOCAL_POSITION);
            groupRef.current.rotation.set(OPEN_TILT_RAD, Math.PI, 0);
            snappedRef.current = true;
        }
    }, [isOpen, animate]);

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

        const alvoX = isOpen ? OPEN_LOCAL_POSITION[0] : position[0];
        const alvoY = isOpen ? OPEN_LOCAL_POSITION[1] : position[1];
        const alvoZ = isOpen ? OPEN_LOCAL_POSITION[2] : position[2] + (hovered ? HOVER_SLIDE_M : 0);
        const alvoRotX = isOpen ? OPEN_TILT_RAD : (hovered ? -HOVER_TILT_RAD : 0);
        const alvoRotY = isOpen ? Math.PI : 0;

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
                if (isOpen) return;
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                if (isOpen) return;
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
