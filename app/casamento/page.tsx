'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { trackCasamentoMapsClick, trackCasamentoRsvpWhatsapp } from '@/utils/analytics'

// ─── Configurações ──────────────────────────────────────────────────────────
const WEDDING_DATE = new Date('2026-07-11T00:00:00')
const WHATSAPP_NUM = '5545991119881'
const MAPS_URL = 'https://maps.app.goo.gl/BBCaUrZX5DjDRGLL8'

const G = '#D4AF37'   // gold
const IV = '#F5F0E8'  // ivory
const BG = '#060810'  // dark background

// ─── StarField (canvas) ─────────────────────────────────────────────────────
function StarField() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return

    const resize = () => {
      c.width = window.innerWidth
      c.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: 230 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: Math.random() * 1.5 + 0.3,
      ph: Math.random() * Math.PI * 2,
      sp: Math.random() * 0.4 + 0.15,
    }))

    type Shooter = { x: number; y: number; len: number; op: number }
    let shooters: Shooter[] = []
    let t = 0
    let raf: number

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height)
      t += 0.016

      for (const s of stars) {
        const tw = (Math.sin(t * s.sp + s.ph) + 1) / 2
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,240,${0.1 + tw * 0.9})`
        ctx.fill()
      }

      if (Math.random() < 0.004 && shooters.filter(s => s.op > 0).length < 2) {
        shooters.push({
          x: Math.random() * c.width * 0.65,
          y: Math.random() * c.height * 0.4,
          len: 0,
          op: 1,
        })
      }

      shooters = shooters.filter(s => s.op > 0)
      for (const s of shooters) {
        s.len += 10; s.op -= 0.013; s.x += 5; s.y += 3
        const gr = ctx.createLinearGradient(s.x, s.y, s.x + s.len, s.y + s.len * 0.6)
        gr.addColorStop(0, `rgba(212,175,55,${s.op})`)
        gr.addColorStop(1, 'rgba(212,175,55,0)')
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x + s.len, s.y + s.len * 0.6)
        ctx.strokeStyle = gr
        ctx.lineWidth = 1.8
        ctx.stroke()
      }

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="fixed inset-0 z-0 pointer-events-none" aria-hidden />
}

// ─── Partículas douradas flutuantes ─────────────────────────────────────────
type Particle = { w: number; h: number; op: number; left: string; top: string; dy: number; dx: number; dur: number; delay: number }

function FloatingParticles() {
  const [pts, setPts] = useState<Particle[]>([])

  useEffect(() => {
    setPts(Array.from({ length: 20 }, () => ({
      w: Math.random() * 3 + 2,
      h: Math.random() * 3 + 2,
      op: Math.random() * 0.45 + 0.1,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      dy: -(Math.random() * 130 + 40),
      dx: (Math.random() - 0.5) * 60,
      dur: Math.random() * 9 + 6,
      delay: Math.random() * 6,
    })))
  }, [])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      {pts.map((p, i) => (
        <motion.div key={i} className="absolute rounded-full"
          style={{ width: p.w, height: p.h, backgroundColor: `rgba(212,175,55,${p.op})`, left: p.left, top: p.top }}
          animate={{ y: [0, p.dy], opacity: [0, 0.9, 0], x: [0, p.dx] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }} />
      ))}
    </div>
  )
}

// ─── Divisor dourado ─────────────────────────────────────────────────────────
function GoldDivider() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  return (
    <div ref={ref} className="flex items-center justify-center my-16 px-8">
      <motion.div initial={{ scaleX: 0 }} animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.6 }} className="h-px flex-1 origin-left"
        style={{ background: `linear-gradient(to right, transparent, ${G})` }} />
      <motion.span initial={{ opacity: 0, scale: 0 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.8, duration: 0.5 }} className="mx-4 text-lg" style={{ color: G }}>
        ♦
      </motion.span>
      <motion.div initial={{ scaleX: 0 }} animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.6 }} className="h-px flex-1 origin-right"
        style={{ background: `linear-gradient(to left, transparent, ${G})` }} />
    </div>
  )
}

// ─── 1. HERO ─────────────────────────────────────────────────────────────────
const HERO_NAME = 'Luiz & Kátia'

function HeroSection() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const ts = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5000),
    ]
    return () => ts.forEach(clearTimeout)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      {/* Glow central */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,175,55,0.06) 0%, transparent 70%)',
      }} />

      {/* Subtítulo de abertura */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 2 }}
        className="text-xs uppercase tracking-widest mb-14"
        style={{ color: G, fontFamily: 'var(--font-montserrat)', letterSpacing: '0.4em' }}>
        Você foi convidado para algo muito especial
      </motion.p>

      {/* Nomes — letra por letra */}
      <div className="flex flex-wrap justify-center mb-6" aria-label="Luiz &amp; Kátia">
        {HERO_NAME.split('').map((ch, i) => (
          <motion.span key={i}
            initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
            animate={phase >= 2 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.9, delay: i * 0.075, ease: 'easeOut' }}
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 'clamp(3rem, 12vw, 8rem)',
              fontWeight: 300,
              color: ch === '&' ? G : IV,
              fontStyle: ch === '&' ? 'italic' : 'normal',
              textShadow: ch === '&' ? '0 0 50px rgba(212,175,55,0.45)' : undefined,
              whiteSpace: ch === ' ' ? 'pre' : 'normal',
            }}>
            {ch === ' ' ? ' ' : ch}
          </motion.span>
        ))}
      </div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: phase >= 3 ? 1 : 0 }}
        transition={{ duration: 2 }}
        className="mb-12 text-xl md:text-2xl"
        style={{ color: '#B8A878', fontFamily: 'var(--font-cormorant)', fontStyle: 'italic' }}>
        estão se casando
      </motion.p>

      {/* Data */}
      <motion.p
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 16 }}
        transition={{ duration: 1.5 }}
        className="text-xl md:text-3xl mb-20 tracking-widest"
        style={{ color: G, fontFamily: 'var(--font-montserrat)', letterSpacing: '0.3em' }}>
        11 · 07 · 2026
      </motion.p>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: phase >= 4 ? 1 : 0 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs uppercase tracking-widest" style={{ color: '#555', fontFamily: 'var(--font-montserrat)' }}>
          role para descobrir
        </span>
        <motion.span animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ color: G, fontSize: '1.3rem' }}>
          ↓
        </motion.span>
      </motion.div>
    </section>
  )
}

// ─── 2. ENVELOPE ─────────────────────────────────────────────────────────────
function EnvelopeSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const [open, setOpen] = useState(false)
  const [cardUp, setCardUp] = useState(false)

  useEffect(() => {
    if (!inView) return
    const t1 = setTimeout(() => setOpen(true), 700)
    const t2 = setTimeout(() => setCardUp(true), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [inView])

  return (
    <section ref={ref} className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      {/* Citação */}
      <motion.p
        initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1.5 }}
        className="text-center mb-20 max-w-md"
        style={{ color: '#B8A878', fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: '1.3rem', lineHeight: 1.8 }}>
        &ldquo;O amor não é olhar um ao outro,<br />
        mas olhar juntos na mesma direção.&rdquo;
        <br />
        <span style={{ color: '#6a6040', fontSize: '0.85rem' }}>— Antoine de Saint-Exupéry</span>
      </motion.p>

      {/* Envelope */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
        transition={{ duration: 1.2, delay: 0.2 }}
        style={{ perspective: '1400px' }}>

        <div className="relative" style={{ width: 'min(420px, 90vw)', height: 'min(280px, 62vw)' }}>

          {/* Corpo do envelope */}
          <div className="absolute inset-0" style={{
            backgroundColor: '#1a1408',
            border: '1px solid rgba(212,175,55,0.22)',
            borderRadius: 4,
          }} />

          {/* Triângulos laterais (decoração) */}
          <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 4 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '50.5%', height: '100%', background: 'linear-gradient(to bottom right, #110e06 50%, transparent 50%)' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '50.5%', height: '100%', background: 'linear-gradient(to bottom left, #110e06 50%, transparent 50%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '50.5%', height: '55%', background: 'linear-gradient(to top right, #110e06 50%, transparent 50%)' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '50.5%', height: '55%', background: 'linear-gradient(to top left, #110e06 50%, transparent 50%)' }} />
          </div>

          {/* Cartão interno */}
          <motion.div
            animate={{ y: cardUp ? '-88%' : '8%', opacity: cardUp ? 1 : 0.5 }}
            transition={{ duration: 1.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', top: '14%', left: '8%', right: '8%', zIndex: 2,
              backgroundColor: '#F5F0E8', borderRadius: 3, padding: '18px 22px',
              textAlign: 'center', boxShadow: '0 25px 70px rgba(0,0,0,0.65)',
            }}>
            <p style={{ color: '#9A7B1C', fontSize: '0.55rem', letterSpacing: '0.35em', textTransform: 'uppercase', fontFamily: 'var(--font-montserrat)', marginBottom: 8 }}>
              Convite de Casamento
            </p>
            <p style={{ color: '#1a1408', fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 'clamp(0.9rem, 3.5vw, 1.3rem)', marginBottom: 3 }}>
              Luiz Cláudio Perin Casara
            </p>
            <p style={{ color: G, fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: '0.95rem', marginBottom: 3 }}>&amp;</p>
            <p style={{ color: '#1a1408', fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 'clamp(0.9rem, 3.5vw, 1.3rem)', marginBottom: 10 }}>
              Kátia da Costa
            </p>
            <p style={{ color: '#5a4820', fontFamily: 'var(--font-montserrat)', fontSize: '0.55rem', letterSpacing: '0.2em' }}>
              11 DE JULHO DE 2026
            </p>
          </motion.div>

          {/* Aba do envelope (anima abrindo) */}
          <motion.div
            animate={{ rotateX: open ? -178 : 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '52%',
              transformOrigin: 'top center', transformStyle: 'preserve-3d',
              zIndex: 3, clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
              backgroundColor: '#231c0a',
              borderTop: '1px solid rgba(212,175,55,0.18)',
              backfaceVisibility: 'hidden',
            }}>
            {/* Selo dourado */}
            <motion.div
              animate={{ opacity: open ? 0 : 1, scale: open ? 0.4 : 1 }}
              transition={{ duration: 0.35 }}
              style={{
                position: 'absolute', top: '28%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 38, height: 38, borderRadius: '50%',
                background: `radial-gradient(circle, ${G} 0%, #8a6410 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: '#1a1408',
              }}>
              ♥
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

// ─── 3. DETALHES DO CASAMENTO ─────────────────────────────────────────────────
function DetailsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })

  const items = [
    { icon: '📅', label: 'Data', value: 'Sábado, 11 de Julho de 2026' },
    { icon: '🕑', label: 'Horário', value: '11:00 horas' },
    { icon: '📍', label: 'Local', value: 'Salão de Festas\nCondomínio Grand View' },
    { icon: '👔', label: 'Traje', value: 'Esporte Fino' },
  ]

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 'clamp(2.4rem, 7vw, 4rem)', color: IV, fontWeight: 300, marginBottom: 8 }}>
          O Grande Dia
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.3 }}
          style={{ color: G, fontFamily: 'var(--font-montserrat)', fontSize: '0.65rem', letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 48 }}>
          Detalhes do evento
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {items.map((item, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.15 }}
              style={{ border: '1px solid rgba(212,175,55,0.2)', borderRadius: 10, padding: '28px 20px', background: 'rgba(212,175,55,0.03)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>{item.icon}</div>
              <p style={{ color: G, fontFamily: 'var(--font-montserrat)', fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
                {item.label}
              </p>
              <p style={{ color: IV, fontFamily: 'var(--font-cormorant)', fontSize: '1.15rem', whiteSpace: 'pre-line', lineHeight: 1.55 }}>
                {item.value}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.a
          href={MAPS_URL} target="_blank" rel="noopener noreferrer"
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 1 }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(212,175,55,0.2)' }}
          whileTap={{ scale: 0.97 }}
          onClick={trackCasamentoMapsClick}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full"
          style={{ border: `1px solid ${G}`, color: G, textDecoration: 'none', fontFamily: 'var(--font-montserrat)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          📍 Ver no Google Maps
        </motion.a>

      </div>
    </section>
  )
}

// ─── 4. CONTAGEM REGRESSIVA ───────────────────────────────────────────────────
function CountdownSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    const calc = () => {
      const diff = WEDDING_DATE.getTime() - Date.now()
      if (diff <= 0) return setTime({ d: 0, h: 0, m: 0, s: 0 })
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff / 3600000) % 24),
        m: Math.floor((diff / 60000) % 60),
        s: Math.floor((diff / 1000) % 60),
      })
    }
    calc()
    const iv = setInterval(calc, 1000)
    return () => clearInterval(iv)
  }, [])

  const units = [
    { label: 'Dias', value: time.d },
    { label: 'Horas', value: time.h },
    { label: 'Minutos', value: time.m },
    { label: 'Segundos', value: time.s },
  ]

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', color: IV, fontWeight: 300, marginBottom: 6 }}>
          Faltam apenas...
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 1 }}
          style={{ color: '#666', fontFamily: 'var(--font-montserrat)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 48 }}>
          para o nosso grande dia
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {units.map((u, i) => (
            <motion.div key={u.label}
              initial={{ opacity: 0, scale: 0.85 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.7, delay: 0.4 + i * 0.1 }}
              style={{ padding: '28px 16px', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, background: 'rgba(212,175,55,0.04)' }}>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(2.8rem, 9vw, 4.5rem)', color: G, lineHeight: 1, fontWeight: 300, marginBottom: 8 }}>
                {String(u.value).padStart(2, '0')}
              </div>
              <div style={{ fontFamily: 'var(--font-montserrat)', fontSize: '0.58rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#777' }}>
                {u.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 5. NOSSA HISTÓRIA (timeline) ─────────────────────────────────────────────
// TODO: Adicionar fotos reais — substitua o emoji e adicione `photo` com URL da imagem
const timelineItems = [
  { emoji: '✨', title: 'O primeiro encontro', desc: 'Onde tudo começou...' },
  { emoji: '💑', title: 'Nossa história', desc: 'Cada dia ao seu lado valeu a pena' },
  { emoji: '💍', title: 'O pedido', desc: 'O momento em que dissemos sim para sempre' },
  { emoji: '👰🤵', title: '11 de Julho de 2026', desc: 'O dia mais especial das nossas vidas' },
]

function TimelineSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="max-w-xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          className="text-center mb-3"
          style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', color: IV, fontWeight: 300 }}>
          Nossa História
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 1 }}
          className="text-center mb-16"
          style={{ color: G, fontFamily: 'var(--font-montserrat)', fontSize: '0.65rem', letterSpacing: '0.35em', textTransform: 'uppercase' }}>
          Uma jornada de amor
        </motion.p>

        <div className="relative">
          {/* Linha central */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
            style={{ background: `linear-gradient(to bottom, transparent, rgba(212,175,55,0.4), transparent)` }} />

          {timelineItems.map((item, i) => {
            const isLeft = i % 2 === 0
            return (
              <motion.div key={i}
                initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 1, delay: 0.3 + i * 0.2 }}
                className="relative flex items-center gap-6 mb-14"
                style={{ flexDirection: isLeft ? 'row' : 'row-reverse' }}>

                {/* Texto */}
                <div className="flex-1" style={{ textAlign: isLeft ? 'right' : 'left' }}>
                  <p style={{ color: G, fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: '1.2rem', marginBottom: 4, lineHeight: 1.3 }}>
                    {item.title}
                  </p>
                  <p style={{ color: '#8888AA', fontFamily: 'var(--font-montserrat)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>

                {/* Ícone central */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl z-10"
                  style={{ background: 'rgba(212,175,55,0.12)', border: `1px solid rgba(212,175,55,0.4)` }}>
                  {item.emoji}
                </div>

                <div className="flex-1" />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── 6. CONFIRMAÇÃO DE PRESENÇA ───────────────────────────────────────────────
function RSVPSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })

  const waMsg = encodeURIComponent(
    `Olá Luiz! 🎊\nConfirmo minha presença no seu casamento com a Kátia em 11/07/2026!`
  )
  const waUrl = `https://wa.me/${WHATSAPP_NUM}?text=${waMsg}`

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          className="text-center"
          style={{ border: '1px solid rgba(212,175,55,0.3)', borderRadius: 16, padding: '52px 32px', background: 'rgba(26,20,8,0.75)', backdropFilter: 'blur(12px)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>💌</div>
          <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(1.9rem, 5.5vw, 2.8rem)', color: IV, fontWeight: 300, marginBottom: 12 }}>
            Confirme sua Presença
          </h2>
          <p style={{ color: '#9A8060', fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: 10 }}>
            Sua presença é o nosso maior presente.
          </p>
          <p style={{ color: '#7a6040', fontFamily: 'var(--font-montserrat)', fontSize: '0.75rem', marginBottom: 36 }}>
            Confirme até <strong style={{ color: G }}>30 de junho de 2026</strong>
          </p>

          <motion.a
            href={waUrl} target="_blank" rel="noopener noreferrer"
            whileHover={{ scale: 1.04, boxShadow: '0 0 50px rgba(212,175,55,0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={trackCasamentoRsvpWhatsapp}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-full"
            style={{ background: `linear-gradient(135deg, ${G} 0%, #9A7B1C 100%)`, color: BG, textDecoration: 'none', fontFamily: 'var(--font-montserrat)', fontSize: '0.73rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
            {/* WhatsApp icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Confirmar pelo WhatsApp
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}

// ─── 7. MENSAGEM FINAL (vídeo) ────────────────────────────────────────────────
function FinaleSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section className="py-24 px-6 min-h-screen flex flex-col items-center justify-center">
      <div ref={ref} className="max-w-3xl mx-auto w-full text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 'clamp(2rem, 6vw, 3.5rem)', color: IV, fontWeight: 300, marginBottom: 6 }}>
          Uma Mensagem de
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 1 }}
          style={{ color: G, fontFamily: 'var(--font-cormorant)', fontSize: '2rem', marginBottom: 48 }}>
          Luiz &amp; Kátia
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5, duration: 1 }}
          className="relative rounded-2xl overflow-hidden mb-16 w-full"
          style={{ aspectRatio: '16/9', border: '1px solid rgba(212,175,55,0.3)' }}>
          <iframe
            src="https://www.youtube.com/embed/kQeOWLkXQWs"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        </motion.div>

        {/* Mensagem de encerramento */}
        <motion.div
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 1.2, duration: 1.5 }}>
          <p style={{ color: '#B8A878', fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: '1.25rem', lineHeight: 1.85, marginBottom: 20 }}>
            &ldquo;Amar é encontrar a própria felicidade na felicidade do outro.&rdquo;
          </p>
          <p style={{ color: G, fontFamily: 'var(--font-cormorant)', fontSize: '1rem', letterSpacing: '0.08em' }}>
            Com todo nosso amor — Luiz &amp; Kátia ♥
          </p>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function CasamentoPage() {
  return (
    <div style={{ backgroundColor: BG, color: IV, overflowX: 'hidden', position: 'relative', minHeight: '100vh' }}>
      <StarField />
      <FloatingParticles />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <HeroSection />
        <GoldDivider />
        <EnvelopeSection />
        <GoldDivider />
        <DetailsSection />
        <GoldDivider />
        <CountdownSection />
        <GoldDivider />
        <TimelineSection />
        <GoldDivider />
        <RSVPSection />
        <GoldDivider />
        <FinaleSection />

        <footer className="text-center py-10" style={{ borderTop: '1px solid rgba(212,175,55,0.1)' }}>
          <p style={{ color: '#3a3a4a', fontFamily: 'var(--font-montserrat)', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
            Com amor · Luiz &amp; Kátia · 11.07.2026
          </p>
        </footer>
      </div>
    </div>
  )
}
