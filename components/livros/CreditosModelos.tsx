'use client';

import {ESTACAO} from '@/lib/radio';
import {trackOutboundClick} from '@/utils/analytics';

/**
 * Créditos dos modelos 3D da sala, no rodapé de `/livros`.
 *
 * **Isto não é cortesia, é a licença.** Dezessete dos modelos da sala são CC BY 3.0,
 * que exige atribuição no lugar onde a obra é exibida — um arquivo dentro do
 * repositório não cumpre isso para quem visita o site. Os CC0 (Furniture Kit do
 * Kenney e companhia) não exigem nada, e por isso o modo compacto cita só o
 * pacote; a procedência completa está no LICENSE.md, linkado no fim.
 *
 * A lista espelha `public/livros/modelos/LICENSE.md`. Mexeu lá, mexa aqui.
 *
 * Sem `<details>` que expande: o rodapé é medido por `useAlturaRodape` para
 * posicionar os botões flutuantes da sala, e essa medição só refaz no resize —
 * um bloco que cresce com clique deixaria os botões atrás dele.
 */

const AUTORES = [
    'Jarlan Perez',
    'joney_lol',
    'blaeksprut',
    'Alex Safayan',
    'Poly by Google',
    'J-Toastie',
    'S. Paul Michael',
    'Nick Slough',
    'Justin Randall',
    'CMHT Oculus',
    'jeremy',
    'Jonathan Granskog',
];

const LINK = 'underline hover:text-gray-600 dark:hover:text-gray-300';

function Externo({href, destino, children}: {
    href: string; destino: string; children: React.ReactNode;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackOutboundClick(destino)}
            className={LINK}
        >
            {children}
        </a>
    );
}

/**
 * @param compacto uma linha só, para o rodapé encolhido das rotas com a sala 3D
 *   montada. Os nomes continuam todos ali — encurtar a lista de autores seria
 *   deixar de cumprir a licença, não economizar espaço.
 */
export default function CreditosModelos({compacto = false}: {compacto?: boolean}) {
    const creditos = (
        <>
            Modelos 3D por {AUTORES.join(', ')} —{' '}
            <Externo href="https://creativecommons.org/licenses/by/3.0/" destino="cc_by">
                CC BY 3.0
            </Externo>
            , via <Externo href="https://poly.pizza" destino="poly_pizza">poly.pizza</Externo>.
            {' '}Mobília do{' '}
            <Externo href="https://kenney.nl/assets/furniture-kit" destino="kenney">
                Furniture Kit
            </Externo>
            {' '}de Kenney (CC0).{' '}
            <Externo href="/livros/modelos/LICENSE.md" destino="licenca_modelos">
                Lista completa
            </Externo>.
            {/*
              A rádio é cortesia, não licença — ao contrário dos modelos CC BY
              acima, ninguém exige este crédito. Ele fica porque a estação é
              mantida por doação de ouvintes e o monitor da sala toca o stream
              dela a cada visita: citar quem sustenta o que se consome é o
              mínimo, e é de graça.
            */}
            {' '}Rádio por{' '}
            <Externo href={ESTACAO.site} destino="radio_estacao">{ESTACAO.nome}</Externo>.
        </>
    );

    if (compacto) return <span>{creditos}</span>;

    return (
        <p className="mt-6 border-t border-gray-100 pt-4 text-center text-[11px]
                      leading-relaxed text-gray-400 dark:border-gray-800/60 dark:text-gray-500">
            {creditos}
        </p>
    );
}
