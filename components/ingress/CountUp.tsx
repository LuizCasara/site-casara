'use client'

import {useEffect, useRef, useState} from 'react'
import {fmtStat} from '@/lib/ingress-format.mjs'

const DURATION = 900

/**
 * Contador que sobe de 0 até `value` ao entrar na viewport. Leaf client — o
 * fallback (sem JS, `prefers-reduced-motion`, sem IntersectionObserver) é o
 * valor final já formatado, renderizado no server. Nunca mostra 0 parado.
 */
export default function CountUp({value}: {value: number}) {
  const [display, setDisplay] = useState(value)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    if (typeof IntersectionObserver === 'undefined') return

    let raf = 0
    const animate = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION)
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplay(Math.round(value * eased))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplay(0)
          animate()
          io.disconnect()
        }
      },
      {threshold: 0.4},
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value])

  return <span ref={ref}>{fmtStat(display)}</span>
}
