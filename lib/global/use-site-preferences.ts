'use client'

import {useSyncExternalStore} from 'react'
import {
  LEGACY_INGRESS_KEYS,
  SITE_PREFS_DEFAULT,
  SITE_STORAGE_KEY,
  migrateLegacyIngress,
  parseSitePrefs,
  serializeSitePrefs,
  withSitePref,
} from '@/lib/site-preferences.mjs'

/**
 * O lado do NAVEGADOR de `site-preferences.mjs`: lê e grava o objeto único do
 * site no `localStorage` e avisa quem está desenhando. As regras (validadores,
 * padrões, seções preservadas, migração do legado) ficam no `.mjs` ao lado, que é
 * o coberto por `npm test`. O nome deste arquivo é diferente do `.mjs` de
 * propósito — dois arquivos de mesmo basename fazem o import resolver para o
 * `.mjs` (ver o aviso em `progresso-da-sala.ts`).
 *
 * **Nada aqui lança.** `localStorage` pode não existir (aba anônima restrita) ou
 * estourar a cota; a escolha então vale só até recarregar a página.
 */

export type NerdStatsLayout = 'resumo' | 'cards' | 'agentes'

type SitePrefs = ReturnType<typeof parseSitePrefs>

/**
 * A última leitura, guardada em módulo: `useSyncExternalStore` exige que
 * `getSnapshot` devolva o MESMO objeto enquanto nada mudou, e desserializar a
 * cada chamada devolveria um novo por render. `raw` é o texto que gerou o cache,
 * então uma mudança feita de fora (outra aba, DevTools) invalida sozinha.
 */
let cache: SitePrefs = SITE_PREFS_DEFAULT as SitePrefs
let raw: string | null = null
let readOnce = false

const listeners = new Set<() => void>()

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function peek(): string | null {
  try {
    return storage()?.getItem(SITE_STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

/**
 * Na primeira leitura da página, absorve as três chaves soltas que o `/ingress`
 * tinha antes do objeto único e as apaga. Roda uma vez por carga e só faz algo
 * na primeira visita depois da mudança — nas seguintes as chaves antigas já não
 * existem. Se a gravação falhar, as chaves antigas ficam (a próxima visita tenta
 * de novo) e o valor migrado vale pela página aberta.
 */
function absorbLegacy(store: Storage, current: SitePrefs): SitePrefs {
  const get = (key: string): string | null => {
    try {
      return store.getItem(key)
    } catch {
      return null
    }
  }
  const legacy = {
    lang: get(LEGACY_INGRESS_KEYS.lang),
    myAgent: get(LEGACY_INGRESS_KEYS.myAgent),
    compareAlertSent: get(LEGACY_INGRESS_KEYS.compareAlertSent),
  }
  if (legacy.lang === null && legacy.myAgent === null && legacy.compareAlertSent === null) return current

  const migrated = migrateLegacyIngress(current, legacy) as SitePrefs
  try {
    if (migrated !== current) store.setItem(SITE_STORAGE_KEY, serializeSitePrefs(migrated))
    for (const key of Object.values(LEGACY_INGRESS_KEYS)) store.removeItem(key)
  } catch {
    // Mantém as chaves antigas: sem gravar o novo, apagá-las perderia a preferência.
  }
  return migrated
}

function read(): SitePrefs {
  if (!storage()) return cache
  const text = peek()
  if (readOnce && text === raw) return cache
  raw = text
  readOnce = true
  cache = parseSitePrefs(text) as SitePrefs
  return cache
}

/**
 * A migração roda UMA vez, quando o módulo é carregado no navegador — e não
 * dentro de `read()`, que é o `getSnapshot` do `useSyncExternalStore` e por
 * isso é chamado durante o render (que o React pode repetir ou descartar): ali
 * ele só pode ler. Aqui não há render nenhum ainda, e a hidratação não é afetada
 * (o servidor sempre entrega o padrão). No servidor `window` não existe e nada roda.
 */
if (typeof window !== 'undefined') {
  const store = storage()
  if (store) {
    cache = absorbLegacy(store, parseSitePrefs(peek()) as SitePrefs)
    raw = peek()
    readOnce = true
  }
}

/**
 * Leitura imperativa, para código que não é React (um handler, um efeito) e só
 * precisa do valor agora. Quem desenha a partir de uma preferência usa
 * `useSitePrefs`, que re-renderiza quando ela muda.
 */
export function getSitePrefs(): SitePrefs {
  return read()
}

/**
 * Troca UMA preferência. Valor que não passa no validador, ou igual ao atual, não
 * faz nada (nem avisa ninguém). O cache muda ANTES da escrita: se o navegador
 * recusar a gravação, a escolha continua valendo na página aberta.
 */
export function setSitePref(section: string, key: string, value: unknown) {
  const current = read()
  const next = withSitePref(current, section, key, value) as SitePrefs
  if (next === current) return
  cache = next
  readOnce = true
  const text = serializeSitePrefs(next)
  try {
    storage()?.setItem(SITE_STORAGE_KEY, text)
    raw = text
  } catch {
    // Sem lembrança entre visitas. Guardar o que está de fato gravado evita que a
    // próxima leitura enxergue o texto antigo e desfaça a escolha.
    raw = peek()
  }
  for (const notify of listeners) notify()
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
  }
}

/**
 * As preferências, reativas. O servidor renderiza com o padrão (não há navegador
 * lá), e a hidratação troca para o valor gravado sem erro de divergência — é o
 * que o `getServerSnapshot` garante.
 */
export function useSitePrefs(): SitePrefs {
  return useSyncExternalStore(subscribe, read, () => SITE_PREFS_DEFAULT as SitePrefs)
}

/** O layout dos recordes de "Estatísticas para nerds" e o jeito de trocá-lo. */
export function useNerdStatsLayout(): [NerdStatsLayout, (layout: NerdStatsLayout) => void] {
  const prefs = useSitePrefs()
  return [prefs.ingress.nerdStatsLayout as NerdStatsLayout, (layout) => setSitePref('ingress', 'nerdStatsLayout', layout)]
}
