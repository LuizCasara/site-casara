'use client';

import {useMemo, useRef, useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import StarRating from '@/components/livros/StarRating';
import {BOOK_DEPTH_M} from '@/lib/book-dimensions.mjs';

// Ordem de materiais do BoxGeometry: [+x, -x, +y, -y, +z, -z].
// A lombada (visível de fora da estante) é a face +z.
const SPINE_FACE_INDEX = 4;
const FALLBACK_SPINE_COLOR = '#4b4b4b';
const HOVER_SLIDE_M = 0.035;
const HOVER_TILT_RAD = 0.12;
const LERP_SPEED = 8;

export type ShelfBookData = {
    slug: string;
    title: string;
    author: string | null;
    rating: string | null;
    thicknessM: number;
    heightM: number;
    spineColor: string | null;
};

type BookProps = {
    book: ShelfBookData;
    position: [number, number, number];
    atlasTexture: THREE.Texture;
    uvRange: {u0: number; u1: number};
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

export default function Book({book, position, atlasTexture, uvRange}: BookProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const geometry = useMemo(() => {
        const geo = new THREE.BoxGeometry(book.thicknessM, book.heightM, BOOK_DEPTH_M);
        setBoxFaceUV(geo, SPINE_FACE_INDEX, uvRange.u0, uvRange.u1, 0, 1);
        return geo;
    }, [book.thicknessM, book.heightM, uvRange.u0, uvRange.u1]);

    const materials = useMemo(() => {
        const corCapa = book.spineColor || FALLBACK_SPINE_COLOR;
        const materialCapa = new THREE.MeshStandardMaterial({color: corCapa, roughness: 0.8});
        const materialLombada = new THREE.MeshStandardMaterial({map: atlasTexture, roughness: 0.7});
        return [materialCapa, materialCapa, materialCapa, materialCapa, materialLombada, materialCapa];
    }, [book.spineColor, atlasTexture]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const alvoZ = hovered ? HOVER_SLIDE_M : 0;
        const alvoRotX = hovered ? -HOVER_TILT_RAD : 0;
        groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, alvoZ, LERP_SPEED, delta);
        groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, alvoRotX, LERP_SPEED, delta);
    });

    return (
        <group
            ref={groupRef}
            position={position}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
            }}
            onPointerOut={(e) => {
                e.stopPropagation();
                setHovered(false);
            }}
        >
            <mesh geometry={geometry} material={materials}/>
            {hovered && (
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
