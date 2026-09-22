#!/usr/bin/env node
// Script one-off: gera `lib/ingress/catalog/countries.json` (nomes PT/EN por código ISO
// 3166-1 alpha-2, via `i18n-iso-countries`) e copia as bandeiras 4x3 correspondentes
// de `flag-icons` para `public/ingress/flags/<cc>.svg`. Roda uma vez; o resultado é
// versionado no repo e o site nunca depende dessas duas libs em runtime — mesmo
// espírito de `scripts/livros/livros.mjs` (devDependency usada só por um script local).
// Re-rodar só se a lista de códigos ISO mudar (raríssimo).
// Uso: npm run ingress:countries, ou node scripts/ingress/gen-ingress-countries.mjs

import {mkdirSync, copyFileSync, writeFileSync, existsSync, readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import countries from 'i18n-iso-countries'

// `createRequire` em vez de `import ... with {type:'json'}` — este é um script
// CLI standalone, nunca passa pelo bundler do Next (Turbopack), então não tem o
// motivo técnico que obriga `lib/ingress-countries.mjs` a usar import attributes
// (ver o comentário lá: aquele módulo é importado por Client Components).

const require = createRequire(import.meta.url)
countries.registerLocale(JSON.parse(readFileSync(require.resolve('i18n-iso-countries/langs/en.json'), 'utf8')))
countries.registerLocale(JSON.parse(readFileSync(require.resolve('i18n-iso-countries/langs/pt.json'), 'utf8')))

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')
const COUNTRIES_JSON = join(ROOT, 'lib/ingress/catalog/countries.json')
const FLAGS_SRC_DIR = join(ROOT, 'node_modules/flag-icons/flags/4x3')
const FLAGS_OUT_DIR = join(ROOT, 'public/ingress/flags')

const namesEn = countries.getNames('en')
const namesPt = countries.getNames('pt')

const entries = Object.keys(namesEn)
  .map((code) => ({code, namePt: namesPt[code], nameEn: namesEn[code]}))
  .sort((a, b) => a.namePt.localeCompare(b.namePt, 'pt-BR'))

mkdirSync(dirname(COUNTRIES_JSON), {recursive: true})
writeFileSync(COUNTRIES_JSON, JSON.stringify(entries, null, 2) + '\n')

mkdirSync(FLAGS_OUT_DIR, {recursive: true})
let copied = 0
for (const {code} of entries) {
  const lower = code.toLowerCase()
  const src = join(FLAGS_SRC_DIR, `${lower}.svg`)
  if (!existsSync(src)) {
    console.error(`[gen-ingress-countries] falta o SVG de bandeira para ${code} em ${src}`)
    process.exitCode = 1
    continue
  }
  copyFileSync(src, join(FLAGS_OUT_DIR, `${lower}.svg`))
  copied++
}

console.log(`[gen-ingress-countries] ${entries.length} países gravados em ${COUNTRIES_JSON}`)
console.log(`[gen-ingress-countries] ${copied} bandeiras copiadas para ${FLAGS_OUT_DIR}`)
