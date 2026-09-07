/**
 * Fonte única do ícone do site — o mark "{C}" (chaves de código abraçando o
 * "C" de Casara), verde do site sobre quadrado escuro.
 *
 * Roda localmente e escreve os arquivos versionados; não toca em banco nem
 * rede. Depois de mexer no desenho aqui, rode `npm run gen:favicons` e
 * commite o que mudou.
 *
 * Gera:
 *   public/icon.svg                      -> ícone vetorial (browsers modernos)
 *   public/favicon-16x16.png             -> aba de navegador
 *   public/favicon-32x32.png             -> aba / atalho
 *   public/apple-touch-icon.png (180)    -> home screen iOS
 *   public/android-chrome-192x192.png    -> PWA Android (maskable)
 *   public/android-chrome-512x512.png    -> PWA Android (maskable)
 *   app/favicon.ico                      -> requisição legada /favicon.ico (16+32+48)
 *
 * O "C" é um arco geométrico (não uma fonte), então o `sharp` rasteriza igual
 * em qualquer máquina, sem depender da Space Mono estar instalada.
 */

import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

const CONTAINER = "#0a0a0a";
const GLIFO = "#22c55e";
const SINAIS = "#15803d";

/** O desenho, num canvas 64x64, centralizado com folga. */
const mark = `
  <path d="M20 12 C16 12 16 16 16 20 C16 25 15 28 12 32 C15 36 16 39 16 44 C16 48 16 52 20 52"
        fill="none" stroke="${SINAIS}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M44 12 C48 12 48 16 48 20 C48 25 49 28 52 32 C49 36 48 39 48 44 C48 48 48 52 44 52"
        fill="none" stroke="${SINAIS}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M39.68 24.84 A10.5 10.5 0 1 0 39.68 39.16"
        fill="none" stroke="${GLIFO}" stroke-width="7" stroke-linecap="round"/>
`;

/** Versão com cantos arredondados e fora do quadrado transparente. */
const svgArredondado = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${CONTAINER}"/>
  ${mark}
</svg>`;

/**
 * Versão quadrada, opaca e com o mark reduzido a 85% — o iOS e o Android
 * recortam/arredondam por conta própria e cortam as bordas de um maskable.
 */
const svgQuadrado = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${CONTAINER}"/>
  <g transform="translate(32 32) scale(0.85) translate(-32 -32)">
    ${mark}
  </g>
</svg>`;

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

/** Empacota PNGs num .ico (payload PNG embutido, suportado desde o IE Vista). */
function pngsParaIco(itens) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(itens.length, 4);

  const entradas = Buffer.alloc(16 * itens.length);
  let offset = 6 + 16 * itens.length;
  itens.forEach(({ size, buffer }, i) => {
    const e = i * 16;
    entradas.writeUInt8(size >= 256 ? 0 : size, e + 0);
    entradas.writeUInt8(size >= 256 ? 0 : size, e + 1);
    entradas.writeUInt16LE(1, e + 4);
    entradas.writeUInt16LE(32, e + 6);
    entradas.writeUInt32LE(buffer.length, e + 8);
    entradas.writeUInt32LE(offset, e + 12);
    offset += buffer.length;
  });

  return Buffer.concat([header, entradas, ...itens.map((i) => i.buffer)]);
}

const escrever = (rel, buf) => writeFile(join(raiz, rel), buf);

await escrever("public/icon.svg", svgArredondado.trim() + "\n");

await escrever("public/favicon-16x16.png", await png(svgArredondado, 16));
await escrever("public/favicon-32x32.png", await png(svgArredondado, 32));
await escrever("public/apple-touch-icon.png", await png(svgQuadrado, 180));
await escrever("public/android-chrome-192x192.png", await png(svgQuadrado, 192));
await escrever("public/android-chrome-512x512.png", await png(svgQuadrado, 512));

const ico = pngsParaIco([
  { size: 16, buffer: await png(svgArredondado, 16) },
  { size: 32, buffer: await png(svgArredondado, 32) },
  { size: 48, buffer: await png(svgArredondado, 48) },
]);
await escrever("app/favicon.ico", ico);

console.log("Ícones gerados:");
console.log("  public/icon.svg");
console.log("  public/favicon-16x16.png, favicon-32x32.png");
console.log("  public/apple-touch-icon.png (180)");
console.log("  public/android-chrome-192x192.png, -512x512.png");
console.log("  app/favicon.ico (16 + 32 + 48)");
