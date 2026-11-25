// A ponte em miniatura: duas margens, a cruz dourada no meio e a pessoa.
// Usada no card de /fe e no bloco "Fé" do bento de /projects. Só marcação,
// sem hook nenhum — funciona tanto num Server Component quanto dentro de um
// client como `projects/page.tsx`.

export default function MiniPonte({className = ''}: {className?: string}) {
  return (
    <svg viewBox="0 0 240 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="miniPonteOuro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e1b0" />
          <stop offset="1" stopColor="#cf9f5f" />
        </linearGradient>
        <radialGradient id="miniPonteLuz">
          <stop offset="0" stopColor="#f0cf8f" stopOpacity=".35" />
          <stop offset="1" stopColor="#f0cf8f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="40" r="70" fill="url(#miniPonteLuz)" />
      <path d="M0 74h88l4 46H0z" fill="#365253" />
      <path d="M152 74h88v46h-92z" fill="#365253" />
      <path d="M0 74h88M152 74h88" stroke="#b9bca4" strokeOpacity=".6" strokeWidth="1.5" />
      <path d="M112 30h16v30h26v14h-26v40h-16V74H86V60h26z" fill="url(#miniPonteOuro)" />
      <g fill="none" stroke="#f1e6cc" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="48" cy="45" r="5" />
        <path d="M48 51v11m0-8-7 6m7-6 7 6m-7 2-5 10m5-10 5 10" />
      </g>
      <text x="200" y="62" textAnchor="middle" fill="#f1d9a4" fontSize="20" fontStyle="italic" fontFamily="Georgia, serif">Deus</text>
    </svg>
  );
}
