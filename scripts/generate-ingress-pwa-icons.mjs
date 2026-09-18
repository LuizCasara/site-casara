// Gera os ícones do PWA isolado de /ingress a partir da medalha oficial
// "Simulacrum" (public/ingress/medals/simulacrum.png, 128x128). Rodar de novo
// só é necessário se a arte-fonte mudar — os PNGs gerados são versionados.
import sharp from 'sharp'
import {mkdir, writeFile} from 'node:fs/promises'

const SOURCE = 'public/ingress/medals/simulacrum.png'
const OUT_DIR = 'public/ingress/pwa'
const BG = '#0b0f14' // --ing-bg, tema da seção /ingress

await mkdir(OUT_DIR, {recursive: true})

async function upscaled(size) {
  return sharp(SOURCE).resize(size, size, {kernel: 'lanczos3'}).png().toBuffer()
}

// Ícones "any": a arte já é um hexágono com fundo próprio, sem padding extra.
for (const size of [192, 512]) {
  const buf = await upscaled(size)
  await sharp(buf).toFile(`${OUT_DIR}/icon-${size}.png`)
}

// Ícone "maskable": Android recorta em círculo/squircle, então a arte precisa
// caber numa "safe zone" central (~80% do canvas) sobre fundo sólido.
{
  const canvas = 512
  const artSize = Math.round(canvas * 0.7)
  const art = await upscaled(artSize)
  await sharp({
    create: {width: canvas, height: canvas, channels: 4, background: BG},
  })
    .composite([{input: art, gravity: 'center'}])
    .png()
    .toFile(`${OUT_DIR}/icon-maskable-512.png`)
}

// apple-touch-icon: iOS ignora alpha (pinta preto por baixo), então achata
// contra o fundo do tema explicitamente em vez de deixar transparência.
{
  const size = 180
  const art = await upscaled(size)
  await sharp({
    create: {width: size, height: size, channels: 4, background: BG},
  })
    .composite([{input: art, gravity: 'center'}])
    .flatten({background: BG})
    .png()
    .toFile(`${OUT_DIR}/apple-touch-icon.png`)
}

// SVG "fonte única": não há arte vetorial original da medalha, então o SVG
// embute o PNG em alta resolução como <image> — vale como ícone de origem
// (favicon <link rel="icon" type="image/svg+xml">), não como vetor puro.
{
  const buf = await upscaled(512)
  const base64 = buf.toString('base64')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,${base64}" width="512" height="512" />
</svg>
`
  await writeFile(`${OUT_DIR}/icon.svg`, svg)
}

console.log(`Ícones do PWA /ingress gerados em ${OUT_DIR}/`)
