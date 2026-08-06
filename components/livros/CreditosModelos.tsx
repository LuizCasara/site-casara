/**
 * Créditos dos modelos 3D da sala, no rodapé de `/livros`.
 *
 * **Isto não é cortesia, é a licença.** Dez dos modelos da sala são CC BY 3.0,
 * que exige atribuição no lugar onde a obra é exibida — um arquivo dentro do
 * repositório não cumpre isso para quem visita o site. Os CC0 (Furniture Kit do
 * Kenney e companhia) não exigem nada e ficam de fora daqui para a linha não
 * virar um parágrafo; a procedência deles está no LICENSE.md.
 *
 * A lista espelha `public/livros/modelos/LICENSE.md`. Mexeu lá, mexa aqui.
 *
 * Uma linha só, sempre visível — e não um `<details>` que expande. O rodapé é
 * medido por `useAlturaRodape` para posicionar os botões flutuantes da sala, e
 * essa medição só refaz no resize: um bloco que cresce com clique deixaria os
 * botões atrás dele até a janela mudar de tamanho.
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
];

export default function CreditosModelos() {
    return (
        <p className="mt-6 border-t border-gray-100 pt-4 text-center text-[11px]
                      leading-relaxed text-gray-400 dark:border-gray-800/60 dark:text-gray-500">
            Modelos 3D da sala de leitura por {AUTORES.join(', ')} —{' '}
            <a
                href="https://creativecommons.org/licenses/by/3.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600 dark:hover:text-gray-300"
            >
                CC BY 3.0
            </a>
            , via{' '}
            <a
                href="https://poly.pizza"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600 dark:hover:text-gray-300"
            >
                poly.pizza
            </a>
            . Mobília do{' '}
            <a
                href="https://kenney.nl/assets/furniture-kit"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600 dark:hover:text-gray-300"
            >
                Furniture Kit
            </a>
            {' '}de Kenney (CC0).{' '}
            <a
                href="/livros/modelos/LICENSE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600 dark:hover:text-gray-300"
            >
                Lista completa
            </a>
            .
        </p>
    );
}
