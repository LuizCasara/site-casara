import {test} from 'node:test'
import assert from 'node:assert/strict'
import {medalLore, formatLoreNumber, loadLore} from './ingress-lore.mjs'

const LORE = {
    trekker: {
        blurb: 'Andou.',
        facts: [
            {per: 42.195, label: 'maratonas'},
            {rate: 'km por dia'},
        ],
    },
    semfatos: {blurb: 'Só a frase.', facts: []},
}

test('medalLore: razão por `per` e média por dia via `rate`', () => {
    const r = medalLore('trekker', 4219.5, 1000, LORE)
    assert.equal(r.blurb, 'Andou.')
    assert.equal(r.facts.length, 2)
    assert.ok(Math.abs(r.facts[0].n - 100) < 1e-9)
    assert.equal(r.facts[0].label, 'maratonas')
    assert.ok(Math.abs(r.facts[1].n - 4.2195) < 1e-9)
    assert.equal(r.facts[1].label, 'km por dia')
})

test('medalLore: daysPlaying nunca divide por zero', () => {
    const r = medalLore('trekker', 100, 0, LORE)
    assert.equal(r.facts[1].n, 100)
})

test('medalLore: slug sem lore -> null; sem fatos -> lista vazia', () => {
    assert.equal(medalLore('xpto', 1, 1, LORE), null)
    assert.deepEqual(medalLore('semfatos', 1, 1, LORE).facts, [])
})

test('medalLore: fato com n <= 0 ou não-finito é descartado', () => {
    const r = medalLore('trekker', 0, 1000, LORE)
    assert.deepEqual(r.facts, [])
})

test('formatLoreNumber: inteiro+milhar acima de 10, casas decimais abaixo', () => {
    assert.equal(formatLoreNumber(13236.4), '13.236')
    assert.equal(formatLoreNumber(145), '145')
    assert.equal(formatLoreNumber(2.63), '2,6')
    assert.equal(formatLoreNumber(0.878), '0,88')
    assert.equal(formatLoreNumber(NaN), '0')
})

test('loadLore: as 17 entradas do catálogo real têm blurbEn preenchido e factsEn do mesmo tamanho que facts', () => {
    const lore = loadLore()
    const slugs = Object.keys(lore)
    assert.equal(slugs.length, 17)
    for (const slug of slugs) {
        const entry = lore[slug]
        assert.equal(typeof entry.blurbEn, 'string', `${slug} sem blurbEn`)
        assert.ok(entry.blurbEn.trim().length > 0, `${slug} com blurbEn vazio`)
        assert.ok(Array.isArray(entry.factsEn), `${slug} sem factsEn`)
        assert.equal(entry.factsEn.length, entry.facts.length, `${slug}: factsEn não bate com facts em tamanho`)
    }
})

test('medalLore: lang "en" devolve blurbEn/factsEn do catálogo real', () => {
    const r = medalLore('trekker', 4219.5, 1000, loadLore(), 'en')
    assert.match(r.blurb, /Walking distance/)
    assert.ok(r.facts.some((f) => f.label === 'marathons'))
})

test('medalLore: lang default ("pt") continua devolvendo blurb/facts em português mesmo com o catálogo real', () => {
    const r = medalLore('trekker', 4219.5, 1000, loadLore())
    assert.match(r.blurb, /Distância a pé/)
})
