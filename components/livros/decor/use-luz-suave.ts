'use client';

import {useFrame} from '@react-three/fiber';
import {MathUtils} from 'three';
import type {RefObject} from 'react';
import type * as THREE from 'three';

/**
 * Leva a intensidade de uma luz até um alvo, suavemente.
 *
 * Existe porque a sala tem três interruptores — o do teto, o abajur da poltrona
 * e a lanterna da estante amarela — e todos precisam da mesma coisa: acender e
 * apagar sem corte seco. Repetir o `useFrame` em três arquivos daria três
 * velocidades ligeiramente diferentes com o tempo.
 *
 * **`MathUtils.damp`, não `lerp`.** Damp é interpolação exponencial e portanto
 * independente de frame rate; um lerp de fator fixo apagaria a luz no dobro do
 * tempo num monitor de 144Hz.
 *
 * **A `intensity` no JSX passa a ser só o valor INICIAL, e precisa ser
 * constante.** A partir do primeiro quadro quem escreve nela é este hook, e um
 * valor que muda entre renders (`aceso ? 7 : 0`) seria reaplicado pelo R3F a
 * cada clique — atropelando a suavização com exatamente o corte seco que ela
 * evita. Declare o estado em que a sala ABRE e deixe o resto com o hook.
 */

/**
 * O λ do damp, em "por segundo". 3,2 dá algo perto de meio segundo até o olho
 * parar de ver mudança: instantâneo pareceria bug de renderização, e mais lento
 * que isso tira a resposta do clique.
 */
export const VELOCIDADE_DA_LUZ = 3.2;

export function useLuzSuave(
    ref: RefObject<THREE.Light | null>,
    alvo: number,
    velocidade = VELOCIDADE_DA_LUZ,
) {
    useFrame((_, delta) => {
        if (!ref.current) return;
        // `delta` vem capado porque uma aba que volta do background entrega um
        // salto de vários segundos, e aí o damp vira exatamente o corte seco
        // que ele existe para evitar.
        ref.current.intensity = MathUtils.damp(
            ref.current.intensity, alvo, velocidade, Math.min(delta, 0.1),
        );
    });
}
