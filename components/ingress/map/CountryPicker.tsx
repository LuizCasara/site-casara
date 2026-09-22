'use client'

import {useMemo, useState} from 'react'
import {COUNTRIES, flagSrc} from '@/lib/ingress/catalog/ingress-countries.mjs'
import {foldText} from '@/lib/ingress/ingress-format.mjs'
import {useLang, type Lang} from '@/components/global/LanguageContext'

type CountryOption = {code: string; namePt: string; nameEn: string}

const T = {
  pt: {
    placeholder: 'Digite pra buscar seu país…',
    listAria: 'Países',
  },
  en: {
    placeholder: 'Type to search your country…',
    listAria: 'Countries',
  },
} as const

const nameFor = (c: CountryOption, lang: Lang) => (lang === 'en' ? c.nameEn : c.namePt)

/**
 * Combobox com filtro por digitação (nome no idioma ativo, ou código) e
 * bandeira ao lado de cada opção + no campo depois de selecionado. Controlado
 * por `value`/`onChange` no mesmo espírito dos `textarea`s de `ProfileRadar`
 * (não guarda o país "certo" sozinho — quem decide é o pai).
 */
export default function CountryPicker({
    id,
    value,
    onChange,
    invalid = false,
}: {
    id: string
    value: string | null
    onChange: (code: string | null) => void
    invalid?: boolean
}) {
    const {lang} = useLang()
    const t = T[lang]
    const selected = value ? (COUNTRIES as CountryOption[]).find((c) => c.code === value) ?? null : null

    // Enquanto a lista está aberta (usuário buscando), o campo mostra o texto
    // livre digitado (`query`); fechada, mostra o nome do país de `value` — o
    // que resincroniza o campo sozinho quando o pai reseta `value` de fora
    // (ex. `clear()` em ProfileRadar), sem precisar de useEffect.
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const inputText = open ? query : selected ? nameFor(selected, lang) : ''

    const filtered = useMemo(() => {
        const q = foldText(query.trim())
        if (!q) return COUNTRIES as CountryOption[]
        return (COUNTRIES as CountryOption[]).filter(
            (c) => foldText(nameFor(c, lang)).includes(q) || foldText(c.code).includes(q)
        )
    }, [query, lang])

    const selectOption = (c: CountryOption) => {
        onChange(c.code)
        setOpen(false)
        setActiveIndex(null)
    }

    const handleChange = (text: string) => {
        setQuery(text)
        setOpen(true)
        setActiveIndex(null)
        if (value !== null) onChange(null)
    }

    const handleFocus = () => {
        setQuery(selected ? nameFor(selected, lang) : '')
        setOpen(true)
    }

    const handleBlur = () => {
        setOpen(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (!open) {
                setOpen(true)
                return
            }
            setActiveIndex((cur) => (cur === null ? 0 : Math.min(cur + 1, filtered.length - 1)))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (!open) {
                setOpen(true)
                return
            }
            setActiveIndex((cur) => (cur === null ? 0 : Math.max(cur - 1, 0)))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (open && activeIndex !== null && filtered[activeIndex]) {
                selectOption(filtered[activeIndex])
            }
        } else if (e.key === 'Escape') {
            setOpen(false)
            setActiveIndex(null)
        }
    }

    const listboxId = `${id}-listbox`

    return (
        <div className={`ing-country-picker${invalid ? ' is-invalid' : ''}`}>
            {selected ? (
                <img
                    src={flagSrc(selected.code)}
                    alt=""
                    width={18}
                    height={13}
                    className="ing-country-picker__flag"
                    onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden'
                    }}
                />
            ) : null}
            <input
                id={id}
                type="text"
                className="ing-country-picker__input"
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
                <ul id={listboxId} role="listbox" aria-label={t.listAria} className="ing-country-picker__list">
                    {filtered.map((c, i) => (
                        <li
                            key={c.code}
                            id={`${listboxId}-opt-${i}`}
                            role="option"
                            aria-selected={value === c.code}
                            className={`ing-country-picker__option${i === activeIndex ? ' is-active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                selectOption(c)
                            }}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            <img
                                src={flagSrc(c.code)}
                                alt=""
                                width={18}
                                height={13}
                                loading="lazy"
                                className="ing-country-picker__flag"
                                onError={(e) => {
                                    e.currentTarget.style.visibility = 'hidden'
                                }}
                            />
                            {nameFor(c, lang)}
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    )
}
