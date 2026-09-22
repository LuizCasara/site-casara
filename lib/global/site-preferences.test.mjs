import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
    SITE_STORAGE_KEY,
    SITE_PREFS_DEFAULT,
    SITE_PREF_SPEC,
    LEGACY_INGRESS_KEYS,
    parseSitePrefs,
    serializeSitePrefs,
    withSitePref,
    migrateLegacyIngress,
} from './site-preferences.mjs'

test('a chave do localStorage é uma só e tem o nome do site', () => {
    assert.equal(SITE_STORAGE_KEY, 'casara.site')
})

test('a seção ingress declara as quatro preferências, com seus padrões', () => {
    assert.deepEqual(Object.keys(SITE_PREF_SPEC.ingress), ['nerdStatsLayout', 'lang', 'myAgent', 'compareAlertSent'])
    assert.deepEqual(SITE_PREFS_DEFAULT.ingress, {
        nerdStatsLayout: 'resumo',
        lang: null,
        myAgent: null,
        compareAlertSent: {},
    })
})

test('as chaves antigas do /ingress ficam registradas num lugar só', () => {
    assert.deepEqual(LEGACY_INGRESS_KEYS, {lang: 'ing-lang', myAgent: 'ing-cmp-my-agent', compareAlertSent: 'ing-cmp-sent'})
})

test('sem nada gravado, texto quebrado ou tipo errado, cai no padrão', () => {
    for (const bruto of [null, undefined, '', 'não é json', '{', '42', 'null', '[]', '"cards"']) {
        assert.deepEqual(parseSitePrefs(bruto), SITE_PREFS_DEFAULT, `entrada: ${String(bruto)}`)
    }
})

test('um valor válido gravado é respeitado', () => {
    const prefs = parseSitePrefs('{"v":1,"ingress":{"nerdStatsLayout":"agentes","lang":"pt","myAgent":"leon231480","compareAlertSent":{"h1":1700000000000}}}')
    assert.equal(prefs.ingress.nerdStatsLayout, 'agentes')
    assert.equal(prefs.ingress.lang, 'pt')
    assert.equal(prefs.ingress.myAgent, 'leon231480')
    assert.deepEqual(prefs.ingress.compareAlertSent, {h1: 1700000000000})
})

test('valor fora do permitido volta pro padrão só naquela chave', () => {
    const prefs = parseSitePrefs('{"v":1,"ingress":{"nerdStatsLayout":"grade","lang":"fr","myAgent":"","compareAlertSent":[1],"outra":true}}')
    assert.equal(prefs.ingress.nerdStatsLayout, 'resumo')
    assert.equal(prefs.ingress.lang, null)
    assert.equal(prefs.ingress.myAgent, null)
    assert.deepEqual(prefs.ingress.compareAlertSent, {})
    assert.equal(prefs.ingress.outra, true)
})

test('o dedupe do Telegram só aceita mapa de números, e limitado', () => {
    assert.deepEqual(parseSitePrefs('{"ingress":{"compareAlertSent":{"h":"agora"}}}').ingress.compareAlertSent, {})
    assert.deepEqual(parseSitePrefs('{"ingress":{"compareAlertSent":{"h":null}}}').ingress.compareAlertSent, {})
    const muitos = Object.fromEntries(Array.from({length: 201}, (_, i) => [`h${i}`, i]))
    assert.deepEqual(parseSitePrefs(JSON.stringify({ingress: {compareAlertSent: muitos}})).ingress.compareAlertSent, {})
})

test('"meu agente" recusa texto vazio, número e texto gigante', () => {
    for (const ruim of ['', 7, 'x'.repeat(81), null]) {
        assert.equal(parseSitePrefs(JSON.stringify({ingress: {myAgent: ruim}})).ingress.myAgent, null, `entrada: ${String(ruim)}`)
    }
})

test('seção "ingress" que não é objeto é ignorada', () => {
    assert.deepEqual(parseSitePrefs('{"v":1,"ingress":"cards"}').ingress, SITE_PREFS_DEFAULT.ingress)
    assert.deepEqual(parseSitePrefs('{"v":1,"ingress":[1]}').ingress, SITE_PREFS_DEFAULT.ingress)
})

test('seções que este código não conhece são preservadas', () => {
    // O objeto é do site inteiro: quem só conhece "ingress" não pode apagar a seção
    // que outra parte do site gravou.
    const prefs = parseSitePrefs('{"v":1,"ingress":{"nerdStatsLayout":"cards"},"livros":{"lista":"grade"}}')
    assert.deepEqual(prefs.livros, {lista: 'grade'})
})

test('serializar e ler de volta devolve o mesmo objeto', () => {
    let prefs = withSitePref(SITE_PREFS_DEFAULT, 'ingress', 'nerdStatsLayout', 'cards')
    prefs = withSitePref(prefs, 'ingress', 'lang', 'pt')
    prefs = withSitePref(prefs, 'ingress', 'myAgent', 'zed')
    prefs = withSitePref(prefs, 'ingress', 'compareAlertSent', {h: 5})
    assert.deepEqual(parseSitePrefs(serializeSitePrefs(prefs)), prefs)
})

test('o texto gravado carrega a versão do formato', () => {
    assert.equal(JSON.parse(serializeSitePrefs(SITE_PREFS_DEFAULT)).v, 1)
})

test('withSitePref troca o valor sem mexer no objeto original', () => {
    const antes = parseSitePrefs('{"v":1,"ingress":{"nerdStatsLayout":"resumo"},"livros":{"x":1}}')
    const depois = withSitePref(antes, 'ingress', 'nerdStatsLayout', 'cards')
    assert.equal(depois.ingress.nerdStatsLayout, 'cards')
    assert.equal(antes.ingress.nerdStatsLayout, 'resumo')
    assert.deepEqual(depois.livros, {x: 1})
})

test('withSitePref devolve o MESMO objeto quando nada muda', () => {
    // O hook que lê isso compara por referência: um objeto novo a cada chamada
    // faria o React reprocessar a árvore sem motivo.
    const prefs = parseSitePrefs('{"v":1,"ingress":{"nerdStatsLayout":"cards","lang":"en"}}')
    assert.equal(withSitePref(prefs, 'ingress', 'nerdStatsLayout', 'cards'), prefs)
    assert.equal(withSitePref(prefs, 'ingress', 'lang', 'en'), prefs)
})

test('withSitePref recusa valor, chave e seção desconhecidos', () => {
    assert.equal(withSitePref(SITE_PREFS_DEFAULT, 'ingress', 'nerdStatsLayout', 'grade'), SITE_PREFS_DEFAULT)
    assert.equal(withSitePref(SITE_PREFS_DEFAULT, 'ingress', 'lang', 'fr'), SITE_PREFS_DEFAULT)
    assert.equal(withSitePref(SITE_PREFS_DEFAULT, 'ingress', 'myAgent', ''), SITE_PREFS_DEFAULT)
    assert.equal(withSitePref(SITE_PREFS_DEFAULT, 'ingress', 'naoExiste', 'cards'), SITE_PREFS_DEFAULT)
    assert.equal(withSitePref(SITE_PREFS_DEFAULT, 'naoExiste', 'nerdStatsLayout', 'cards'), SITE_PREFS_DEFAULT)
})

test('withSitePref não confunde nome de chave com propriedade herdada de Object', () => {
    // `SITE_PREF_SPEC.ingress['toString']` existe (herdado) e não tem `.valid` — sem
    // checar posse, um erro de digitação derrubaria o handler de clique com TypeError.
    for (const key of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) {
        assert.equal(withSitePref(SITE_PREFS_DEFAULT, 'ingress', key, 'cards'), SITE_PREFS_DEFAULT, key)
    }
    for (const section of ['toString', 'constructor', '__proto__']) {
        assert.equal(withSitePref(SITE_PREFS_DEFAULT, section, 'nerdStatsLayout', 'cards'), SITE_PREFS_DEFAULT, section)
    }
})

const SEM_LEGADO = {lang: null, myAgent: null, compareAlertSent: null}

test('migrateLegacyIngress adota as três chaves antigas quando o objeto novo ainda não tem nada', () => {
    const prefs = migrateLegacyIngress(SITE_PREFS_DEFAULT, {lang: 'pt', myAgent: 'zed', compareAlertSent: '{"h":1700000000000}'})
    assert.equal(prefs.ingress.lang, 'pt')
    assert.equal(prefs.ingress.myAgent, 'zed')
    assert.deepEqual(prefs.ingress.compareAlertSent, {h: 1700000000000})
    assert.equal(prefs.ingress.nerdStatsLayout, 'resumo')
})

test('migrateLegacyIngress nunca sobrescreve o que o objeto novo já tem', () => {
    const atual = parseSitePrefs('{"ingress":{"lang":"en","myAgent":"novo","compareAlertSent":{"a":1}}}')
    const prefs = migrateLegacyIngress(atual, {lang: 'pt', myAgent: 'velho', compareAlertSent: '{"b":2}'})
    assert.equal(prefs, atual)
})

test('migrateLegacyIngress ignora legado inválido ou ilegível', () => {
    const prefs = migrateLegacyIngress(SITE_PREFS_DEFAULT, {lang: 'fr', myAgent: '', compareAlertSent: 'não é json'})
    assert.equal(prefs, SITE_PREFS_DEFAULT)
    assert.equal(migrateLegacyIngress(SITE_PREFS_DEFAULT, {...SEM_LEGADO, compareAlertSent: '[1,2]'}), SITE_PREFS_DEFAULT)
})

test('migrateLegacyIngress sem legado devolve o MESMO objeto', () => {
    assert.equal(migrateLegacyIngress(SITE_PREFS_DEFAULT, SEM_LEGADO), SITE_PREFS_DEFAULT)
})

test('migrateLegacyIngress adota só o que faltava', () => {
    const atual = parseSitePrefs('{"ingress":{"lang":"en"}}')
    const prefs = migrateLegacyIngress(atual, {lang: 'pt', myAgent: 'zed', compareAlertSent: null})
    assert.equal(prefs.ingress.lang, 'en')
    assert.equal(prefs.ingress.myAgent, 'zed')
})
