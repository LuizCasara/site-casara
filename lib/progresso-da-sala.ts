'use client';

import {useSyncExternalStore} from 'react';
import {
    CHAVE_DO_PROGRESSO, PROGRESSO_VAZIO,
    lerProgresso, serializarProgresso, comAchado, comPremio,
} from '@/lib/coisas-da-sala.mjs';

/**
 * O lado do NAVEGADOR de "Coisas que ninguém repara": onde o progresso mora e
 * como avisar quem está olhando. As regras e a lista dos 17 itens estão em
 * `coisas-da-sala.mjs`, ao lado, que é o arquivo coberto por `npm test`.
 *
 * **O nome deste arquivo não pode voltar a ser `coisas-da-sala.ts`.** Com dois
 * arquivos de mesmo basename na pasta, `import … from '@/lib/coisas-da-sala'`
 * resolve para o `.mjs` — a ordem de extensões do bundler põe `.mjs` antes de
 * `.ts` —, e todo import daqui vira `undefined` com o build passando e só um
 * aviso no meio do log. Foi exatamente o que aconteceu, e é por isso que os dois
 * lados têm nomes diferentes.
 *
 * **`marcarCoisa` é função de módulo, não contexto React e não prop.** O motivo é
 * a árvore da sala: metade dos objetos é controlada pelo `RoomCanvas`
 * (interruptor, cortina, gaveta…), mas a outra metade decide sozinha dentro do
 * próprio componente — a Bíblia em `ItensDeEstudo`, o escudo, os pôsteres em
 * `Room.tsx`. Passar um handler por prop obrigaria a atravessar a árvore 3D
 * inteira com uma prop nova, incluindo `Room.tsx`, que por contrato é cenário
 * burro e não deve saber que existe um jogo. Uma função importada direto é
 * exatamente como `trackRoomObjectClick` já é usada nesses mesmos arquivos.
 *
 * **Nada aqui lança.** `localStorage` não existe em aba anônima restrita, e
 * estoura cota sem avisar; o jogo degrada para "nada é lembrado" e a sala
 * continua inteira.
 */

export type Progresso = {
    v: number;
    achados: string[];
    premiadoEm: string | null;
};

/**
 * O último progresso lido, guardado em módulo.
 *
 * Existe pelo `useSyncExternalStore`, que exige que `getSnapshot` devolva o MESMO
 * objeto enquanto nada mudou — ler e desserializar a cada chamada devolveria um
 * objeto novo por render e o React entraria em laço infinito reclamando disso.
 * `bruto` guarda o texto que gerou o cache, para uma escrita de outra aba (ver o
 * listener de `storage`) invalidar sozinha.
 */
let cache: Progresso = PROGRESSO_VAZIO as Progresso;
let bruto: string | null = null;
let leuAlgumaVez = false;

const assinantes = new Set<() => void>();

function localStorageDisponivel(): Storage | null {
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
}

function ler(): Progresso {
    const store = localStorageDisponivel();
    if (!store) return PROGRESSO_VAZIO as Progresso;

    let texto: string | null = null;
    try {
        texto = store.getItem(CHAVE_DO_PROGRESSO);
    } catch {
        return PROGRESSO_VAZIO as Progresso;
    }

    if (leuAlgumaVez && texto === bruto) return cache;
    bruto = texto;
    leuAlgumaVez = true;
    cache = lerProgresso(texto) as Progresso;
    return cache;
}

function gravar(proximo: Progresso) {
    // O cache é atualizado ANTES da escrita: se a cota estourar, o progresso
    // ainda vale pela sessão em curso — a folha risca a linha, o contador anda, e
    // só a próxima visita é que não vai lembrar. O contrário (gravar primeiro,
    // atualizar depois) perderia o clique na hora e não ganharia nada.
    cache = proximo;
    leuAlgumaVez = true;
    bruto = serializarProgresso(proximo);
    try {
        localStorageDisponivel()?.setItem(CHAVE_DO_PROGRESSO, bruto);
    } catch {
        // Sem lembrança entre visitas. A sala continua de pé.
    }
    for (const avisar of assinantes) avisar();
}

/**
 * Marca um objeto como encontrado. Idempotente, e barata o bastante para ser
 * chamada no `onClick` de qualquer peça da sala — quando o id já estava lá,
 * `comAchado` devolve o mesmo objeto e nem assinante é avisado.
 *
 * Nos objetos que levam para FORA (os dois pôsteres, o escudo) ela é chamada
 * **antes** de navegar, pela mesma razão de `trackOutboundClick`: depois do
 * `window.open` a aba pode já ter perdido o foco.
 */
export function marcarCoisa(id: string) {
    const atual = ler();
    const proximo = comAchado(atual, id) as Progresso;
    if (proximo === atual) return;
    gravar(proximo);
}

/**
 * Carimba a conquista — chamada no clique do aviso, e só ali. Achar tudo não
 * grava nada: o prêmio é aceito, não entregue.
 */
export function registrarPremio() {
    const atual = ler();
    const proximo = comPremio(atual, new Date().toISOString()) as Progresso;
    if (proximo === atual) return;
    gravar(proximo);
}

function assinar(avisar: () => void) {
    assinantes.add(avisar);
    return () => {
        assinantes.delete(avisar);
    };
}

/**
 * O progresso, reativo.
 *
 * `getServerSnapshot` devolve o vazio porque no servidor não existe navegador
 * nenhum para ter progresso. Isso não produz salto de hidratação na prática: a
 * sala 3D só renderiza depois que o atlas de lombadas fica pronto, o que é um
 * efeito de cliente — nada que dependa daqui chega a ser desenhado no HTML.
 *
 * Sem listener de `storage` de propósito: ele só dispara para OUTRAS abas, e duas
 * abas da mesma sala não são um caso que valha sincronizar. A leitura acontece na
 * montagem, que é o que faz o aviso do prêmio aparecer na volta de um link
 * externo — ver o item encontrado em página que sai da sala.
 */
export function useProgressoDaSala(): Progresso {
    return useSyncExternalStore(assinar, ler, () => PROGRESSO_VAZIO as Progresso);
}
