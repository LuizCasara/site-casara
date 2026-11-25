// O desenho da ponte. Server Component de propósito: é só marcação, chega
// pronta no HTML e quem anima é `lib/fe/a-ponte/cena.ts`, que encontra as
// peças pelo contrato `data-at` / `data-part` / `id` descrito lá.
//
// Adaptado da ilustração da ponte de *Cada Homem um Guerreiro* (Lonnie Berger,
// livro 2, pp. 126, 127 e 131).

// Estrelas em posições fixas: gerador com semente, para servidor e cliente
// desenharem sempre o mesmo céu.
function estrelas() {
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({length: 46}, () => ({
    cx: (rnd() * 900).toFixed(1),
    cy: (8 + rnd() * 270).toFixed(1),
    r: (0.7 + rnd() * 1.5).toFixed(2),
    o: (0.3 + rnd() * 0.6).toFixed(2),
    d: (3 + rnd() * 5).toFixed(1),
    dl: (-rnd() * 6).toFixed(1),
  }));
}

const CRUZ = 'M420 145H480V263H572V322H480V492H420V322H328V263H420Z';
const BORDA_ESQ = 'M0 323 67 316 124 322 177 315 237 321 306 316 342 322 338 373 352 407 332 448 341 496 321 552 326 600';
const BORDA_DIR = 'M900 323 844 316 785 322 733 316 670 321 606 315 558 322 552 383 570 426 563 472 579 514 567 557 572 600';

export default function BridgeArt() {
  return (
    <svg viewBox="0 0 900 600" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="ap-art-title">
      <title id="ap-art-title">Ilustração da ponte: uma pessoa de um lado, Deus do outro</title>
      <defs>
        <linearGradient id="apSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f2427" />
          <stop offset="1" stopColor="#1f3d41" />
        </linearGradient>
        <linearGradient id="apDawn" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9bb78" stopOpacity=".5" />
          <stop offset=".65" stopColor="#e9bb78" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="apLand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#365253" />
          <stop offset="1" stopColor="#16292d" />
        </linearGradient>
        <linearGradient id="apGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e1b0" />
          <stop offset="1" stopColor="#cf9f5f" />
        </linearGradient>
        <radialGradient id="apGlow">
          <stop offset="0" stopColor="#f0cf8f" stopOpacity=".5" />
          <stop offset="1" stopColor="#f0cf8f" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="900" height="600" fill="url(#apSky)" />
      <rect className="dawn" width="900" height="600" fill="url(#apDawn)" />
      <g>
        {estrelas().map((e, i) => (
          <circle
            key={i}
            className="star"
            cx={e.cx}
            cy={e.cy}
            r={e.r}
            style={{'--o': e.o, '--d': `${e.d}s`, '--dl': `${e.dl}s`} as React.CSSProperties}
          />
        ))}
      </g>
      <circle className="glow" cx="770" cy="215" r="320" fill="url(#apGlow)" />

      {/* Terreno: as duas margens */}
      <g className="reveal" data-at="0.5">
        <path d="M0 280 105 208 161 246 250 178 345 266 460 230 575 284 690 195 780 244 900 168V390H0Z" fill="#91a29a" opacity=".06" />
        <path d="M0 300 111 253 208 290 302 235 382 305 509 268 619 301 746 244 900 294V395H0Z" fill="#91a29a" opacity=".05" />
        <path d="M0 323 67 316 124 322 177 315 237 321 306 316 342 322 338 373 352 407 332 448 341 496 321 552 326 610H0Z" fill="url(#apLand)" />
        <path d="M558 322 606 315 670 321 733 316 785 322 844 316 900 323V610H574L567 557 579 514 563 472 570 426 552 383Z" fill="url(#apLand)" />
      </g>
      <path className="draw" data-at="0.5" pathLength={1} fill="none" stroke="#b9bca4" strokeWidth="3" strokeLinejoin="round" opacity=".7" d={BORDA_ESQ} />
      <path className="draw" data-at="0.5" pathLength={1} fill="none" stroke="#b9bca4" strokeWidth="3" strokeLinejoin="round" opacity=".7" d={BORDA_DIR} />

      <g className="reveal" data-at="0.5" data-part="right">
        <text x="770" y="250" className="t-god" textAnchor="middle">Deus</text>
        <path d="M725 272h90" stroke="#e0bb7b" strokeWidth="2" opacity=".7" />
      </g>

      {/* Primeira metade do versículo, na margem da pessoa */}
      <g className="reveal" data-at="2" data-part="left">
        <text x="175" y="405" className="t-label" textAnchor="middle">SALÁRIO</text>
      </g>
      <g className="reveal" data-at="2.5" data-part="left">
        <text x="175" y="458" className="t-label" textAnchor="middle">PECADO</text>
        <text x="175" y="511" className="t-label" textAnchor="middle">MORTE</text>
      </g>
      <g className="reveal sep" data-at="2.5">
        <path d="M376 362h148" stroke="#e2a68f" strokeWidth="2" strokeDasharray="3 9" />
        <text x="450" y="404" className="t-sep" textAnchor="middle">SEPARAÇÃO</text>
      </g>

      {/* Segunda metade, na margem de Deus */}
      <g className="reveal" data-at="5" data-part="right">
        <text x="738" y="405" className="t-label t-gift" textAnchor="middle">DOM GRATUITO</text>
        <text x="738" y="452" className="t-label t-gift" textAnchor="middle">DE DEUS</text>
        <text x="738" y="511" className="t-label t-gift" textAnchor="middle">VIDA ETERNA</text>
      </g>

      {/* As tentativas de atravessar entram aqui, criadas pela cena */}
      <g id="ap-planks" />

      <g className="cross" data-at="6" data-part="cross">
        <path id="ap-cross-fill" className="c-fill" d={CRUZ} fill="url(#apGold)" />
        <path id="ap-cross-line" className="c-line" pathLength={1} d={CRUZ} fill="none" stroke="#f7dfb1" strokeWidth="3" strokeLinejoin="round" />
        <text x="450" y="304" className="t-christ" textAnchor="middle">Cristo Jesus</text>
      </g>

      <g className="reveal" data-at="4" data-part="mas">
        <rect x="400" y="536" width="100" height="50" rx="8" fill="#0f2427" stroke="#d9b77e" strokeWidth="2" />
        <text x="450" y="572" className="t-mas" textAnchor="middle">mas</text>
      </g>

      <circle className="burst" cx="640" cy="225" r="60" />

      {/* A pessoa: desenhada com os pés na origem, posicionada por transform */}
      <g id="ap-person" className="reveal" data-at="0.5" data-part="cross" transform="translate(207 318)">
        <text x="0" y="-138" className="t-small" textAnchor="middle">PESSOA</text>
        <g fill="none" stroke="#f1e6cc" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="0" cy="-99" r="18" />
          <path d="M0 -79v42m0-34-27 24m27-24 27 24m-27 10-19 37m19-37 20 37" />
        </g>
      </g>
    </svg>
  );
}
