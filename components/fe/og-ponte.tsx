import {ImageResponse} from 'next/og';

// Imagem de compartilhamento da área "Fé" (/fe e /fe/a-ponte): a mesma noite
// verde-petróleo da dinâmica, as duas margens e a cruz dourada fazendo a ponte.
//
// O texto fica FORA do <svg>: o satori não desenha <text> de SVG, então
// "Deus" e os rótulos são divs posicionadas por cima do desenho.

export const OG_SIZE = {width: 1200, height: 630};

const NOITE = '#0d1f22';
const OURO = '#d6ab66';
const OURO_CLARO = '#f1d9a4';
const TERRA = '#2f4a4b';

/**
 * Baixa só os glifos usados de uma fonte do Google Fonts. Sem user-agent de
 * navegador, a API devolve TTF, que é o que o satori lê (woff2 ele não lê).
 * Falhou (sem rede no build, API mudou)? Devolve null e a imagem sai na fonte
 * padrão — feia, mas nunca quebra o build.
 */
async function fonte(familia: string, texto: string): Promise<ArrayBuffer | null> {
  try {
    const resCss = await fetch(`https://fonts.googleapis.com/css2?family=${familia}&text=${encodeURIComponent(texto)}`);
    if (!resCss.ok) return null;
    const url = (await resCss.text()).match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    // Um 4xx/5xx viria com o corpo da página de erro, e o satori recusa esses
    // bytes como fonte lançando — quebrando o build, que é justo o que o null evita.
    const resFonte = await fetch(url);
    if (!resFonte.ok || /text|html|json/.test(resFonte.headers.get('content-type') ?? '')) return null;
    return await resFonte.arrayBuffer();
  } catch {
    return null;
  }
}

export async function imagemDaPonte({eyebrow, titulo, rodapeEsq, rodapeDir}: {
  eyebrow: string;
  titulo: string;
  rodapeEsq: string;
  rodapeDir: string;
}) {
  const [serif, sans] = await Promise.all([
    fonte('Newsreader:ital,wght@1,500', `${titulo}Deus`),
    // maiúsculas também: o eyebrow é desenhado com textTransform uppercase, e
    // glifo que não veio no recorte cai na fonte padrão, com outra largura
    fonte('Instrument+Sans:wght@600', `${eyebrow}${eyebrow.toUpperCase()}${rodapeEsq}${rodapeDir}`),
  ]);
  const fonts = [
    ...(serif ? [{name: 'Newsreader', data: serif, style: 'italic' as const, weight: 500 as const}] : []),
    ...(sans ? [{name: 'Instrument Sans', data: sans, style: 'normal' as const, weight: 600 as const}] : []),
  ];

  // estrelas fixas (mesmo gerador com semente do desenho da dinâmica)
  let s = 11;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const estrelas = Array.from({length: 48}, () => ({x: rnd() * 1200, y: rnd() * 300, r: 1 + rnd() * 1.8, o: 0.25 + rnd() * 0.55}))
    // nenhuma estrela por cima do título
    .filter((e) => !(e.y < 215 && e.x > 230 && e.x < 970));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: `linear-gradient(180deg, #0f2427 0%, #1f3d41 100%)`,
          fontFamily: 'Instrument Sans',
        }}
      >
        {/* luz do lado de Deus */}
        <div
          style={{
            position: 'absolute',
            right: -120,
            top: 80,
            width: 640,
            height: 640,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(240,207,143,0.30) 0%, rgba(240,207,143,0) 65%)',
          }}
        />
        {estrelas.map((e, i) => (
          <div
            key={i}
            style={{position: 'absolute', left: e.x, top: e.y, width: e.r * 2, height: e.r * 2, borderRadius: 9999, background: '#f4ead0', opacity: e.o}}
          />
        ))}

        {/* desenho: margens + cruz + pessoa (y 0 do svg = y 250 da imagem) */}
        <svg width="1200" height="380" viewBox="0 0 1200 380" style={{position: 'absolute', left: 0, bottom: 0}}>
          <defs>
            <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#365253" />
              <stop offset="1" stopColor="#16292d" />
            </linearGradient>
            <linearGradient id="o" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f6e1b0" />
              <stop offset="1" stopColor="#cf9f5f" />
            </linearGradient>
          </defs>
          <path d="M0 152 90 145 170 151 250 144 330 150 400 145 440 152 432 220 450 270 428 330 436 380H0Z" fill="url(#t)" />
          <path d="M760 152 800 145 880 151 960 144 1040 150 1120 145 1200 152V380H764L772 330 750 270 768 220Z" fill="url(#t)" />
          <path d="M0 152 90 145 170 151 250 144 330 150 400 145 440 152M760 152 800 145 880 151 960 144 1040 150 1120 145 1200 152" fill="none" stroke="#b9bca4" strokeOpacity=".6" strokeWidth="3" />
          <path d="M565 22H635V90H780V152H635V380H565V152H420V90H565Z" fill="url(#o)" stroke="#f7dfb1" strokeWidth="3" />
          <g fill="none" stroke="#f1e6cc" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="250" cy="60" r="20" />
            <path d="M250 82v44m0-36-30 26m30-26 30 26m-30 10-21 38m21-38 22 38" />
          </g>
        </svg>

        {/* "Deus" sobre a margem direita */}
        <div style={{position: 'absolute', left: 880, top: 300, width: 220, display: 'flex', justifyContent: 'center', fontFamily: 'Newsreader', fontStyle: 'italic', fontSize: 84, color: OURO_CLARO}}>
          Deus
        </div>

        {/* título */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 46, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div style={{fontSize: 22, letterSpacing: 7, color: OURO, textTransform: 'uppercase', display: 'flex'}}>{eyebrow}</div>
          <div style={{marginTop: 4, fontFamily: 'Newsreader', fontStyle: 'italic', fontSize: 132, lineHeight: 1.05, color: OURO_CLARO, display: 'flex'}}>
            {titulo}
          </div>
        </div>

        {/* rodapés sobre as margens */}
        <div style={{position: 'absolute', left: 56, bottom: 44, fontSize: 24, letterSpacing: 4, color: '#a8b4ac', display: 'flex'}}>{rodapeEsq}</div>
        <div style={{position: 'absolute', right: 56, bottom: 44, fontSize: 24, letterSpacing: 2, color: '#a8b4ac', display: 'flex'}}>{rodapeDir}</div>

        {/* faixa fina embaixo, só para assentar a composição */}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: TERRA, borderTop: `1px solid ${NOITE}`}} />
      </div>
    ),
    {...OG_SIZE, fonts},
  );
}
