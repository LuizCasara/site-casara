import {test} from 'node:test'
import assert from 'node:assert/strict'
import {REAL_ROUTE_RE, shouldRecordPageView} from './routes.ts'

test('as telas do /ingress contam como rotas reais (senão nunca viram page_view)', () => {
    for (const rota of [
        '/ingress',
        '/ingress/ranking',
        '/ingress/fencherlc',
        '/ingress/fencherlc/linha-do-tempo',
        '/ingress/fencherlc/medalha/hacker',
        '/ingress/fencherlc/medalha/mind-controller',
    ]) {
        assert.equal(REAL_ROUTE_RE.test(rota), true, rota)
    }
})

test('arquivos e sondas dentro de /ingress continuam de fora', () => {
    for (const rota of [
        '/ingress/manifest.webmanifest',
        '/ingress/ranking/opengraph-image',
        '/ingress/fencherlc/opengraph-image',
        '/ingress/ranking/extra',
        '/ingress/fencherlc/medalha',
        '/ingress/fencherlc/medalha/x/y',
        '/ingress/.env',
        '/ingress/',
        '/ingressx',
        '/ingress/ranking.jpg',
    ]) {
        assert.equal(REAL_ROUTE_RE.test(rota), false, rota)
    }
})

test('o resto do allowlist segue igual', () => {
    for (const rota of ['/', '/about', '/livros', '/livros/lista', '/app/sorteio', '/q/0123456789']) {
        assert.equal(REAL_ROUTE_RE.test(rota), true, rota)
    }
    for (const rota of ['/manifest.json', '/.env', '/app/next.config.js', '/casamento/2025.jpg']) {
        assert.equal(REAL_ROUTE_RE.test(rota), false, rota)
    }
})

test('page_view só é gravado para /ingress*, /livros* e as dinâmicas', () => {
    for (const rota of ['/ingress', '/ingress/ranking', '/ingress/fencherlc/medalha/hacker', '/livros', '/livros/lista',
        '/livros/a-nascente', '/w/0123456789', '/q/0123456789']) {
        assert.equal(shouldRecordPageView(rota), true, rota)
    }
    // Rotas reais que saíram: o Vercel Analytics já as conta. `/stats` é 404 fora do dev.
    for (const rota of ['/', '/about', '/projects', '/app', '/app/sorteio', '/casamento', '/stats']) {
        assert.equal(REAL_ROUTE_RE.test(rota), true, rota)
        assert.equal(shouldRecordPageView(rota), false, rota)
    }
    // Continua respeitando o allowlist: prefixo certo não basta.
    for (const rota of ['/ingress/.env', '/livros/x/y', '/ingressx', '/livrosx', '/w/nao-e-id']) {
        assert.equal(shouldRecordPageView(rota), false, rota)
    }
})
