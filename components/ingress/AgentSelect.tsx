'use client'

import {useEffect, useRef, useState} from 'react'
import {flagSrc} from '@/lib/ingress-countries.mjs'
import {useLang, type Lang} from '@/components/global/LanguageContext'

export type AgentOption = {
  codename_key: string
  codename: string
  faction: 'enlightened' | 'resistance'
  country_code: string | null
  lifetime_ap: number
}

const FACTION_ICON: Record<'enlightened' | 'resistance', string> = {
  enlightened: '/ingress/factions/enlightened.svg',
  resistance: '/ingress/factions/resistance.svg',
}

const SEARCH_DEBOUNCE_MS = 300

const T = {
  pt: {
    placeholder: 'Digite pra buscar um agente…',
    listAria: 'Agentes',
    loadMore: 'Próxima página',
    loading: 'Carregando…',
    emptyNoAgents: 'Nenhum agente cadastrado ainda.',
    emptySearch: 'Nenhum agente encontrado.',
    error: 'Não foi possível carregar os agentes.',
    retry: 'Tentar de novo',
  },
  en: {
    placeholder: 'Type to search an agent…',
    listAria: 'Agents',
    loadMore: 'Next page',
    loading: 'Loading…',
    emptyNoAgents: 'No agents registered yet.',
    emptySearch: 'No agents found.',
    error: 'Could not load agents.',
    retry: 'Try again',
  },
} as const

const fmtAp = (n: number, lang: Lang) => n.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR')

type FetchState =
  | {status: 'idle'}
  | {status: 'loading'}
  | {status: 'error'}
  | {status: 'ready'; options: AgentOption[]; hasMore: boolean; nextCursor: string | null}

async function fetchAgents(params: {cursor?: string | null; search?: string}): Promise<{
  rows: AgentOption[]
  hasMore: boolean
  nextCursor: string | null
} | null> {
  try {
    const qs = new URLSearchParams()
    if (params.cursor) qs.set('cursor', params.cursor)
    if (params.search) qs.set('search', params.search)
    const res = await fetch(`/api/ingress-rankings/agents?${qs.toString()}`)
    if (!res.ok) return null
    return (await res.json()) as {rows: AgentOption[]; hasMore: boolean; nextCursor: string | null}
  } catch {
    return null
  }
}

/**
 * Combobox pra escolher 1 agente já cadastrado no ranking — mesma estrutura
 * ARIA combobox+listbox de `CountryPicker.tsx`, mas assíncrono: 1ª página
 * (até 100, ordem alfabética por `codename_key`) carregada na 1ª abertura,
 * "próxima página" acrescenta mais 100 sem descartar os já carregados, busca
 * por texto substitui a navegação por página (servidor). Controlado por
 * `value`/`onChange`; `selected` é o dado já resolvido pelo pai (via
 * `/api/ingress-rankings/compare`) — permite mostrar o campo fechado mesmo
 * quando a opção não está nas páginas carregadas (ex.: veio de um link
 * compartilhado ou do `localStorage`).
 */
export default function AgentSelect({
  id,
  value,
  onChange,
  selected,
  invalid = false,
}: {
  id: string
  value: string | null
  onChange: (codenameKey: string | null) => void
  selected: AgentOption | null
  invalid?: boolean
}) {
  const {lang} = useLang()
  const t = T[lang]

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [state, setState] = useState<FetchState>({status: 'idle'})
  // Separado de `state.status`: "carregar mais" mantém as opções já
  // carregadas visíveis (não pode virar 'loading', que esconderia a lista) —
  // esta flag é só o feedback visual do item "próxima página" enquanto a
  // leva seguinte chega.
  const [appendLoading, setAppendLoading] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)
  // Texto de busca da lista que está carregada agora ('' = navegação por página). Sem isso, reabrir o campo depois
  // de escolher um resultado de busca mostrava só aqueles resultados, com o resto do elenco inalcançável.
  const loadedSearchRef = useRef('')

  const inputText = open ? query : (selected?.codename ?? '')

  const loadPage = async (opts: {cursor?: string | null; search?: string; append?: boolean}) => {
    const requestId = ++requestIdRef.current
    if (opts.append) setAppendLoading(true)
    else {
      // Uma busca/reload novo invalida um "próxima página" ainda pendente — sem zerar aqui, a resposta obsoleta
      // é descartada abaixo e o item "próxima página" ficava preso em "Carregando…".
      setAppendLoading(false)
      setState({status: 'loading'})
    }
    const result = await fetchAgents({cursor: opts.cursor, search: opts.search})
    if (requestId !== requestIdRef.current) return // resposta obsoleta (busca/reload mais recente já chegou)
    if (opts.append) setAppendLoading(false)
    if (!result) {
      setState({status: 'error'})
      return
    }
    loadedSearchRef.current = opts.append ? loadedSearchRef.current : (opts.search ?? '')
    setState((prev) => {
      const prevOptions = opts.append && prev.status === 'ready' ? prev.options : []
      return {status: 'ready', options: [...prevOptions, ...result.rows], hasMore: result.hasMore, nextCursor: result.nextCursor}
    })
  }

  const handleFocus = () => {
    setQuery('')
    setOpen(true)
    // 1ª abertura, erro anterior, ou a lista carregada é resultado de uma busca antiga (query agora vazia):
    // volta pra 1ª página da navegação.
    if (state.status === 'idle' || state.status === 'error' || (state.status === 'ready' && loadedSearchRef.current !== '')) {
      void loadPage({})
    }
  }

  const handleBlur = () => {
    setOpen(false)
  }

  const handleChange = (text: string) => {
    setQuery(text)
    setActiveIndex(null)
    if (value !== null) onChange(null)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    const trimmed = text.trim()
    if (!trimmed) {
      // busca limpa -> volta pra navegação por página, reiniciando da 1ª (IRCMP-14)
      void loadPage({})
      return
    }
    debounceRef.current = window.setTimeout(() => void loadPage({search: trimmed}), SEARCH_DEBOUNCE_MS)
  }

  const options = state.status === 'ready' ? state.options : []
  const hasMore = state.status === 'ready' && state.hasMore
  const isSearching = query.trim() !== ''

  const selectOption = (opt: AgentOption) => {
    onChange(opt.codename_key)
    setOpen(false)
    setActiveIndex(null)
  }

  const optionCount = options.length + (hasMore ? 1 : 0)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        if (state.status === 'idle') void loadPage({})
        return
      }
      setActiveIndex((cur) => (cur === null ? 0 : Math.min(cur + 1, optionCount - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((cur) => (cur === null ? 0 : Math.max(cur - 1, 0)))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && activeIndex !== null && options[activeIndex]) {
        selectOption(options[activeIndex])
      } else if (open && hasMore && activeIndex === options.length && state.status === 'ready') {
        // O item "próxima página" também é alcançável por ↓ — Enter nele faz o mesmo que o clique.
        void loadPage({cursor: state.nextCursor, append: true, search: loadedSearchRef.current || undefined})
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(null)
    }
  }

  // Se a busca mudar de "com texto" pra outra busca com texto diferente, o
  // debounce acima já cobre; aqui só limpa o timer pendente ao desmontar.
  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [])

  const listboxId = `${id}-listbox`

  return (
    <div className={`ing-agent-select${invalid ? ' is-invalid' : ''}`}>
      {selected ? (
        <span className="ing-agent-select__selected-badges">
          {selected.country_code ? (
            <img
              src={flagSrc(selected.country_code)}
              alt=""
              width={16}
              height={12}
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden'
              }}
            />
          ) : null}
          <img src={FACTION_ICON[selected.faction]} alt="" width={16} height={16} />
        </span>
      ) : null}
      <input
        id={id}
        type="text"
        className="ing-agent-select__input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex !== null ? `${listboxId}-opt-${activeIndex}` : undefined}
        autoComplete="off"
        placeholder={t.placeholder}
        value={inputText}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {open ? (
        <ul id={listboxId} role="listbox" aria-label={t.listAria} className="ing-agent-select__list">
          {state.status === 'loading' && options.length === 0 ? (
            <li className="ing-agent-select__status">{t.loading}</li>
          ) : state.status === 'error' ? (
            <li className="ing-agent-select__status ing-agent-select__status--error">
              {t.error}{' '}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  void loadPage(isSearching ? {search: query.trim()} : {})
                }}
              >
                {t.retry}
              </button>
            </li>
          ) : options.length === 0 ? (
            <li className="ing-agent-select__status">{isSearching ? t.emptySearch : t.emptyNoAgents}</li>
          ) : (
            <>
              {options.map((opt, i) => (
                <li
                  key={opt.codename_key}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={value === opt.codename_key}
                  className={`ing-agent-select__option${i === activeIndex ? ' is-active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectOption(opt)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  {opt.country_code ? (
                    <img
                      src={flagSrc(opt.country_code)}
                      alt=""
                      width={18}
                      height={13}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden'
                      }}
                    />
                  ) : (
                    <span className="ing-agent-select__flag-placeholder" />
                  )}
                  <img src={FACTION_ICON[opt.faction]} alt="" width={18} height={18} />
                  <span className="ing-agent-select__option-name">{opt.codename}</span>
                  <span className="ing-agent-select__option-ap">{fmtAp(opt.lifetime_ap, lang)}</span>
                </li>
              ))}
              {hasMore ? (
                <li
                  id={`${listboxId}-opt-${options.length}`}
                  role="option"
                  aria-selected={false}
                  className={`ing-agent-select__load-more${activeIndex === options.length ? ' is-active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    if (state.status === 'ready') {
                      void loadPage({cursor: state.nextCursor, append: true, search: loadedSearchRef.current || undefined})
                    }
                  }}
                  onMouseEnter={() => setActiveIndex(options.length)}
                >
                  {appendLoading ? t.loading : t.loadMore}
                </li>
              ) : null}
            </>
          )}
        </ul>
      ) : null}
    </div>
  )
}
