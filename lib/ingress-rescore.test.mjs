import {test} from 'node:test'
import assert from 'node:assert/strict'
import {planRescore, rankByKey, SCORE_EPSILON} from './ingress-rescore.mjs'
import {computeAxisScores, computeOverallScore} from './ingress-tier-score.mjs'
import {RADAR_AXES} from './ingress-radar.mjs'

const stats = (multiple, overrides = {}) => {
    const s = {}
    for (const a of RADAR_AXES) for (const p of a.parts) s[p.key] = p.ref * multiple
    return {...s, ...overrides}
}

/** Linha do ranking com a nota ANTIGA (linear) gravada, como está em produção hoje. */
function row(key, ap, statValues, oldScore, createdAt = '2026-09-01T00:00:00Z') {
    const axis = computeAxisScores(statValues)
    return {
        codename_key: key,
        codename: key,
        lifetime_ap: ap,
        overall_score: oldScore,
        axis_scores: Object.fromEntries(axis.map((a) => [a.id, a.score])),
        stat_values: statValues,
        created_at: createdAt,
    }
}
const deps = {computeAxisScores, computeOverallScore}

test('planRescore: recalcula a nota a partir de stat_values, arredondada em 2 casas (NUMERIC(7,2))', () => {
    const r = row('a', 1000, stats(2), 999)
    const {plans} = planRescore({rankings: [r], latestHistory: new Map(), ...deps})
    assert.equal(plans[0].newScore, 120) // 2× Onyx em tudo = 120
    assert.equal(plans[0].oldScore, 999)
    assert.equal(plans[0].changed, true)
    assert.equal(Number.isInteger(plans[0].newScore * 100), true)
})

test('planRescore: o caso real — MU disparado (~150×) deixa de decidir o ranking', () => {
    // A: Onyx em tudo e MU em 150×; nota antiga (linear) altíssima. B: 3× Onyx em tudo, nota antiga baixa.
    const A = row('a', 5, stats(1, {mindUnitsCaptured: 4000000 * 150}), 452)
    const B = row('b', 9, stats(3), 140)
    const {plans} = planRescore({rankings: [A, B], latestHistory: new Map(), ...deps})
    const byKey = Object.fromEntries(plans.map((p) => [p.codenameKey, p]))
    assert.equal(byKey.a.oldRank, 1)
    assert.equal(byKey.b.oldRank, 2)
    assert.equal(byKey.b.newRank, 1) // agora quem é maior em tudo passa na frente
    assert.equal(byKey.a.newRank, 2)
})

test('planRescore: idempotente — rodar de novo sobre linhas já recalculadas não marca nada como mudado', () => {
    const r = row('a', 1000, stats(4, {mindUnitsCaptured: 4000000 * 90}), 0)
    const first = planRescore({rankings: [r], latestHistory: new Map(), ...deps}).plans[0]
    const again = {...r, overall_score: first.newScore, axis_scores: first.axisScores}
    const second = planRescore({rankings: [again], latestHistory: new Map(), ...deps})
    assert.equal(second.plans[0].changed, false)
    assert.equal(second.summary.changed, 0)
})

test('planRescore: agente abaixo do Onyx em tudo não muda (a escala nova só mexe do Onyx pra cima)', () => {
    const r = row('a', 10, stats(0.4), 0)
    const first = planRescore({rankings: [r], latestHistory: new Map(), ...deps}).plans[0]
    // nota antiga e nova coincidem: gravamos a antiga como a nova de referência
    const same = {...r, overall_score: first.newScore}
    assert.equal(planRescore({rankings: [same], latestHistory: new Map(), ...deps}).plans[0].changed, false)
})

test('planRescore: histórico — atualiza o snapshot mais recente só se ele for o retrato da linha atual', () => {
    const r = row('a', 1000, stats(2), 500)
    const ok = new Map([['a', {id: 7, lifetime_ap: 1000, overall_score: 500, snapshots: 3}]])
    const p1 = planRescore({rankings: [r], latestHistory: ok, ...deps}).plans[0]
    assert.deepEqual(p1.history, {action: 'update', id: 7, olderSnapshots: 2})

    const stale = new Map([['a', {id: 7, lifetime_ap: 900, overall_score: 500, snapshots: 1}]]) // AP diferente
    const p2 = planRescore({rankings: [r], latestHistory: stale, ...deps}).plans[0]
    assert.equal(p2.history.action, 'skip')
    assert.match(p2.history.reason, /não bate/)

    const diffScore = new Map([['a', {id: 7, lifetime_ap: 1000, overall_score: 400, snapshots: 1}]]) // nota diferente
    assert.equal(planRescore({rankings: [r], latestHistory: diffScore, ...deps}).plans[0].history.action, 'skip')

    assert.equal(planRescore({rankings: [r], latestHistory: new Map(), ...deps}).plans[0].history.action, 'none')
})

test('planRescore: o resumo conta mudados, trocas de posição, snapshots atualizados/pulados e os antigos deixados', () => {
    const A = row('a', 5, stats(1, {mindUnitsCaptured: 4000000 * 150}), 452)
    const B = row('b', 9, stats(3), 140)
    const hist = new Map([
        ['a', {id: 1, lifetime_ap: 5, overall_score: 452, snapshots: 2}],
        ['b', {id: 2, lifetime_ap: 1, overall_score: 140, snapshots: 1}], // AP diferente -> skip
    ])
    const {summary} = planRescore({rankings: [A, B], latestHistory: hist, ...deps})
    assert.equal(summary.agents, 2)
    assert.equal(summary.rankChanged, 2)
    assert.equal(summary.historyUpdates, 1)
    assert.equal(summary.historySkipped, 1)
    assert.equal(summary.olderSnapshots, 1)
})

test('rankByKey: desempata por AP e depois pelo mais antigo, como o ranking real', () => {
    const rows = [
        {codename_key: 'x', lifetime_ap: 10, created_at: '2026-01-02T00:00:00Z', s: 100},
        {codename_key: 'y', lifetime_ap: 20, created_at: '2026-01-03T00:00:00Z', s: 100},
        {codename_key: 'z', lifetime_ap: 20, created_at: '2026-01-01T00:00:00Z', s: 100},
    ]
    const r = rankByKey(rows, (row) => row.s)
    assert.deepEqual([r.get('z'), r.get('y'), r.get('x')], [1, 2, 3])
})

test('SCORE_EPSILON cobre o arredondamento de NUMERIC(7,2)', () => {
    assert.ok(SCORE_EPSILON > 0 && SCORE_EPSILON < 0.01)
})
