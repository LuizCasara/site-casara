// Romanos 6:23 no rodapé. As palavras-chave começam como lacunas (`.slot`) e
// são preenchidas pela cena conforme a história avança — `data-at` é o nível
// em que cada uma aparece, `data-note` a nota que toca quando ela pousa.
// Server Component: só marcação.

function Lacuna({at, nota, children}: {at: number; nota: number; children: string}) {
  return (
    <span className="slot" data-at={at} data-note={nota}>
      {children}
    </span>
  );
}

export default function Versiculo() {
  return (
    <p className="ap-verse" data-verso>
      <span className="q">
        “O <Lacuna at={2} nota={293.66}>salário</Lacuna> do <Lacuna at={2.5} nota={220}>pecado</Lacuna> é a{' '}
        <Lacuna at={2.5} nota={184.99}>morte</Lacuna>, <Lacuna at={4} nota={293.66}>mas</Lacuna> o{' '}
        <Lacuna at={5} nota={369.99}>dom gratuito de Deus</Lacuna> é a <Lacuna at={5} nota={440}>vida eterna</Lacuna> em{' '}
        <Lacuna at={6} nota={587.33}>Cristo Jesus</Lacuna>, nosso Senhor.”
      </span>
      <cite>Romanos 6:23</cite>
    </p>
  );
}
