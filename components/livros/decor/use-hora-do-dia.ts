'use client';

import {useEffect, useState} from 'react';
import {horaFracionaria} from '@/lib/luz-do-dia.mjs';

/**
 * A hora de quem está vendo, em horas fracionárias, atualizada de minuto em
 * minuto.
 *
 * **É a mesma fonte do relógio da prateleira aérea** — o relógio do próprio
 * aparelho, e não um horário do servidor. Isso não é economia de código: a sala
 * mostra as duas coisas na mesma tela, e um céu de meio-dia ao lado de um
 * display marcando 21:00 seria a sala se contradizendo sozinha.
 *
 * De minuto em minuto, e não a cada quadro: o sol atravessa o vão inteiro em
 * doze horas, então em um minuto ele anda um milésimo da largura do vidro. Um
 * `useFrame` aqui pediria 60 recálculos por segundo para redesenhar a mesma
 * imagem.
 *
 * O `setTimeout` mira a próxima BORDA de minuto, encadeado, e não um intervalo
 * de 60s corridos — mesmo motivo do relógio (`use-textura-de-relogio.ts`) e do
 * `proximoPollMs` da rádio: o atraso de um disparo não se acumula no seguinte.
 */
export function useHoraDoDia() {
    const [hora, setHora] = useState(() => horaFracionaria(new Date()));

    useEffect(() => {
        let agendamento: ReturnType<typeof setTimeout>;

        const tique = () => {
            const agora = new Date();
            setHora(horaFracionaria(agora));
            const msAteOProximoMinuto =
                60_000 - (agora.getSeconds() * 1000 + agora.getMilliseconds());
            agendamento = setTimeout(tique, msAteOProximoMinuto);
        };

        tique();
        return () => clearTimeout(agendamento);
    }, []);

    return hora;
}
