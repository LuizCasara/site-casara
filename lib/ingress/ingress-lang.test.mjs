import {test} from 'node:test'
import assert from 'node:assert/strict'
import {resolveIngressLang, isIngressLang} from './ingress-lang.mjs'

test('sem escolha guardada e sem idiomas do navegador, o padrão é en', () => {
  assert.equal(resolveIngressLang(null, []), 'en')
  assert.equal(resolveIngressLang(null, undefined), 'en')
})

test('navegador com pt como primeira preferência resolve para pt', () => {
  assert.equal(resolveIngressLang(null, ['pt-BR', 'en-US']), 'pt')
  assert.equal(resolveIngressLang(null, ['pt']), 'pt')
  assert.equal(resolveIngressLang(null, ['pt-PT']), 'pt')
})

test('a comparação do prefixo pt não diferencia caixa', () => {
  assert.equal(resolveIngressLang(null, ['PT-br']), 'pt')
})

test('só a PRIMEIRA preferência conta: en antes de pt continua en', () => {
  assert.equal(resolveIngressLang(null, ['en-US', 'pt-BR']), 'en')
})

test('outros idiomas caem em en', () => {
  assert.equal(resolveIngressLang(null, ['es-ES']), 'en')
  assert.equal(resolveIngressLang(null, ['de']), 'en')
})

test('não confunde idiomas que apenas contêm "pt" no nome', () => {
  assert.equal(resolveIngressLang(null, ['ptx']), 'en')
})

test('a escolha guardada vence o idioma do navegador, nos dois sentidos', () => {
  assert.equal(resolveIngressLang('en', ['pt-BR']), 'en')
  assert.equal(resolveIngressLang('pt', ['en-US']), 'pt')
})

test('valor guardado inválido é ignorado e cai na detecção do navegador', () => {
  assert.equal(resolveIngressLang('fr', ['pt-BR']), 'pt')
  assert.equal(resolveIngressLang('', ['en-US']), 'en')
  assert.equal(resolveIngressLang('EN', ['pt-BR']), 'pt')
})

test('isIngressLang aceita só pt e en', () => {
  assert.equal(isIngressLang('pt'), true)
  assert.equal(isIngressLang('en'), true)
  assert.equal(isIngressLang('fr'), false)
  assert.equal(isIngressLang(null), false)
  assert.equal(isIngressLang(undefined), false)
})
