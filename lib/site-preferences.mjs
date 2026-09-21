/**
 * As preferências do visitante que o site lembra entre visitas, num ÚNICO objeto
 * JSON sob UMA chave do `localStorage`, dividido em seções por área do site:
 *
 *     casara.site = {"v": 1, "ingress": {"nerdStatsLayout": "cards", "lang": "pt", ...}}
 *
 * Só a lógica pura mora aqui (ler, validar, alterar, migrar o legado) — o acesso
 * ao navegador é de `use-site-preferences.ts`, ao lado. Cada preferência declara
 * o padrão e o validador em `SITE_PREF_SPEC`; qualquer coisa que não passe no
 * validador volta ao padrão, então um valor antigo ou editado à mão nunca chega
 * ao componente.
 *
 * Seções e chaves que este código não conhece são PRESERVADAS ao ler e gravar: o
 * objeto é do site inteiro, e quem só conhece "ingress" não pode apagar o que
 * outra área gravou.
 *
 * Hoje só a seção `ingress` mora aqui — as três chaves soltas que o `/ingress`
 * tinha foram absorvidas (`migrateLegacyIngress`). As outras áreas do site
 * (dinâmicas, testes, sala de leitura) continuam com as próprias chaves: várias
 * guardam tokens de sessão, e migrá-las é decisão à parte.
 */

export const SITE_STORAGE_KEY = 'casara.site'

const SITE_PREFS_VERSION = 1

/** As chaves que o `/ingress` usava antes do objeto único; lidas uma vez, absorvidas e apagadas. */
export const LEGACY_INGRESS_KEYS = Object.freeze({
    lang: 'ing-lang',
    myAgent: 'ing-cmp-my-agent',
    compareAlertSent: 'ing-cmp-sent',
})

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const oneOf =
    (...allowed) =>
    (value) =>
        allowed.includes(value)

/** Mais entradas que isso num mapa de dedupe é lixo: o `ProfileRadar` poda tudo com mais de 10 minutos a cada escrita. */
const COMPARE_ALERT_SENT_MAX_ENTRIES = 200

/** `codename_key` de "meu agente": texto não vazio; o teto é folga sobre os 40 caracteres que a API aceita. */
const MY_AGENT_MAX_LENGTH = 80

/**
 * O que cada preferência aceita e o padrão dela. `default` é o valor de "nunca
 * escolheu nada" (`null` = deixa o código decidir, como o idioma do navegador).
 * A primeira coisa a fazer numa preferência nova é declará-la aqui.
 */
export const SITE_PREF_SPEC = {
    ingress: {
        /** Layout dos recordes em "Estatísticas para nerds": hall da fama, sazonais e assinatura. */
        nerdStatsLayout: {default: 'resumo', valid: oneOf('resumo', 'cards', 'agentes')},
        /** Idioma escolhido no toggle PT/EN; `null` até o visitante escolher (aí vale o idioma do navegador). */
        lang: {default: null, valid: oneOf('pt', 'en')},
        /** `codename_key` do último envio ao ranking — pré-preenche o Agente A da aba Comparação. */
        myAgent: {default: null, valid: (v) => typeof v === 'string' && v.length > 0 && v.length <= MY_AGENT_MAX_LENGTH},
        /** Dedupe do alerta de comparação no Telegram: hash da comparação -> instante do último envio. */
        compareAlertSent: {
            default: Object.freeze({}),
            valid: (v) =>
                isPlainObject(v) &&
                Object.keys(v).length <= COMPARE_ALERT_SENT_MAX_ENTRIES &&
                Object.values(v).every((n) => typeof n === 'number' && Number.isFinite(n)),
        },
    },
}

export const SITE_PREFS_DEFAULT = Object.freeze({
    v: SITE_PREFS_VERSION,
    ...Object.fromEntries(
        Object.entries(SITE_PREF_SPEC).map(([section, keys]) => [
            section,
            Object.freeze(Object.fromEntries(Object.entries(keys).map(([key, spec]) => [key, spec.default]))),
        ])
    ),
})

/**
 * Lê o texto cru do `localStorage`. Nada gravado, JSON quebrado ou de outro tipo
 * devolvem `SITE_PREFS_DEFAULT` (o próprio objeto congelado, não uma cópia).
 * @param {string|null|undefined} text
 */
export function parseSitePrefs(text) {
    let raw = null
    try {
        raw = text ? JSON.parse(text) : null
    } catch {
        return SITE_PREFS_DEFAULT
    }
    if (!isPlainObject(raw)) return SITE_PREFS_DEFAULT

    const prefs = {...raw, v: SITE_PREFS_VERSION}
    for (const [section, keys] of Object.entries(SITE_PREF_SPEC)) {
        const stored = isPlainObject(raw[section]) ? raw[section] : {}
        const merged = {...stored}
        for (const [key, spec] of Object.entries(keys)) {
            merged[key] = spec.valid(stored[key]) ? stored[key] : spec.default
        }
        prefs[section] = merged
    }
    return prefs
}

/** O texto a gravar no `localStorage`. */
export function serializeSitePrefs(prefs) {
    return JSON.stringify({...prefs, v: SITE_PREFS_VERSION})
}

/**
 * Devolve as preferências com UMA chave trocada, sem alterar o original. Se o
 * valor não passa no validador, ou já era o valor atual, devolve o MESMO objeto
 * recebido — quem lê por referência (o hook) não vê mudança onde não houve.
 */
export function withSitePref(prefs, section, key, value) {
    if (!Object.hasOwn(SITE_PREF_SPEC, section) || !Object.hasOwn(SITE_PREF_SPEC[section], key)) return prefs
    if (!SITE_PREF_SPEC[section][key].valid(value)) return prefs
    if (prefs[section]?.[key] === value) return prefs
    return {...prefs, [section]: {...prefs[section], [key]: value}}
}

function parseJsonObject(text) {
    if (typeof text !== 'string') return null
    try {
        const parsed = JSON.parse(text)
        return isPlainObject(parsed) ? parsed : null
    } catch {
        return null
    }
}

/** "Ainda no padrão" — vale para objeto também (`{}` lido do disco não é o mesmo objeto do padrão). */
function isDefault(value, spec) {
    return JSON.stringify(value) === JSON.stringify(spec.default)
}

/**
 * Absorve as três chaves antigas do `/ingress` no objeto novo. Só adota o que o
 * objeto novo ainda não tem (o valor mais recente vence) e só o que passa no
 * validador — legado quebrado é descartado, não copiado. Devolve o MESMO objeto
 * se não houver nada a adotar. Quem chama apaga as chaves antigas depois.
 * @param {object} prefs
 * @param {{lang: string|null, myAgent: string|null, compareAlertSent: string|null}} legacy texto cru de cada chave antiga
 */
export function migrateLegacyIngress(prefs, legacy) {
    const candidates = {
        lang: legacy.lang,
        myAgent: legacy.myAgent,
        compareAlertSent: parseJsonObject(legacy.compareAlertSent),
    }
    let next = prefs
    for (const [key, value] of Object.entries(candidates)) {
        if (!isDefault(next.ingress[key], SITE_PREF_SPEC.ingress[key])) continue
        next = withSitePref(next, 'ingress', key, value)
    }
    return next
}
