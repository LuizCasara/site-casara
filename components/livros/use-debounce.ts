'use client';

import {useEffect, useState} from 'react';

/**
 * O valor, atrasado — só entrega depois que ele para de mudar por `atrasoMs`.
 *
 * Serve à busca por texto: o campo precisa responder a cada tecla (senão o
 * cursor engasga), mas refiltrar e reposicionar cinquenta livros na estante 3D
 * a cada caractere é trabalho jogado fora — só o último termo importa.
 *
 * O `clearTimeout` no cleanup é o que faz o debounce: cada tecla nova cancela o
 * timer anterior antes de armar o próximo. Sem ele isto vira um simples atraso,
 * e todos os estados intermediários acabariam entregues, um por um.
 */
export function useDebounce<T>(valor: T, atrasoMs = 300): T {
    const [atrasado, setAtrasado] = useState(valor);

    useEffect(() => {
        const id = setTimeout(() => setAtrasado(valor), atrasoMs);
        return () => clearTimeout(id);
    }, [valor, atrasoMs]);

    return atrasado;
}
