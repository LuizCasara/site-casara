import {test} from 'node:test'
import assert from 'node:assert/strict'
import {normalizeCountryCode, isValidCountryCode, COUNTRIES} from './ingress-countries.mjs'

test('COUNTRIES: 250 entradas, cada uma com code/namePt/nameEn', () => {
    assert.equal(COUNTRIES.length, 250)
    for (const c of COUNTRIES) {
        assert.match(c.code, /^[A-Z]{2}$/)
        assert.ok(c.namePt)
        assert.ok(c.nameEn)
    }
})

test('normalizeCountryCode: trim + upper-case, espaços variados', () => {
    assert.equal(normalizeCountryCode('br'), 'BR')
    assert.equal(normalizeCountryCode('  br  '), 'BR')
    assert.equal(normalizeCountryCode('Br'), 'BR')
})

test('normalizeCountryCode: entrada vazia/ausente -> string vazia', () => {
    assert.equal(normalizeCountryCode(''), '')
    assert.equal(normalizeCountryCode('   '), '')
    assert.equal(normalizeCountryCode(undefined), '')
})

test('isValidCountryCode: código válido, em qualquer caixa/espaço -> true', () => {
    assert.equal(isValidCountryCode('BR'), true)
    assert.equal(isValidCountryCode('br'), true)
    assert.equal(isValidCountryCode('  Br  '), true)
})

test('isValidCountryCode: código fora da lista ou malformado -> false', () => {
    assert.equal(isValidCountryCode('ZZ'), false)
    assert.equal(isValidCountryCode('BRA'), false)
    assert.equal(isValidCountryCode(''), false)
    assert.equal(isValidCountryCode(undefined), false)
})
