'use client';

import {createContext, useContext, useRef} from 'react';
import {usePathname} from 'next/navigation';
import {deveMontarSala} from '@/lib/livros-routing.mjs';

/**
 * Um livro aberto tem dois cenários possíveis atrás dele: a sala 3D ou a grade
 * da listagem. Quem decide é de onde a pessoa veio (ver `deveMontarSala`), e
 * dois componentes precisam da MESMA resposta — `RoomCanvasLoader`, para saber
 * se monta a cena, e o card do livro, para saber se entra com animação sobre a
 * sala ou direto como modal sobre a lista.
 *
 * Daí um contexto em vez de a regra em dois lugares: duplicá-la é como os dois
 * começariam a discordar, e a discordância aqui é um card sem fundo sobre uma
 * sala que não veio, ou uma animação de saída de prateleira sem prateleira.
 */
const SalaMontadaContext = createContext(true);

export function useSalaMontada() {
    return useContext(SalaMontadaContext);
}

export default function ProvedorDaSala({children}: {children: React.ReactNode}) {
    const pathname = usePathname();

    // Dois refs, e não um: `anterior` guarda a rota de onde se veio, e
    // `montada` guarda a DECISÃO já tomada. A decisão precisa sobreviver aos
    // re-renders que acontecem sem troca de rota (abrir o índice, digitar na
    // busca) — se ela fosse recalculada a cada render, o "anterior" já teria
    // virado o pathname atual e a sala apareceria no meio da leitura.
    const anteriorRef = useRef<string | null>(null);
    const montadaRef = useRef(false);

    // Recalcula só na TRANSIÇÃO de rota. Mexer em ref durante o render é seguro
    // aqui pelo mesmo motivo que o padrão "derivar estado de props" é: a
    // condição de guarda torna isto idempotente, então o render duplo do
    // StrictMode chega ao mesmo resultado.
    if (anteriorRef.current !== pathname) {
        montadaRef.current = deveMontarSala(pathname, anteriorRef.current);
        anteriorRef.current = pathname;
    }

    return (
        <SalaMontadaContext.Provider value={montadaRef.current}>
            {children}
        </SalaMontadaContext.Provider>
    );
}
