'use client'

import {useEffect, useRef, useState} from 'react'
import {
  buildScene,
  COLOR,
  isCoast,
  isLand,
  llToVec,
  TILT,
  type Vec3,
} from '@/lib/ingress-globe'

const DESKTOP_QUERY = '(min-width: 60rem)'

function rotY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]]
}
function rotX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]]
}
function norm(v: Vec3): Vec3 {
  const m = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / m, v[1] / m, v[2] / m]
}
function rgba(c: Vec3, a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`
}
function arcPoints(va: Vec3, vb: Vec3, lift: number, n: number): Vec3[] {
  const a = norm(va)
  const b = norm(vb)
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const om = Math.acos(d)
  const so = Math.sin(om) || 1e-6
  const out: Vec3[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const s1 = Math.sin((1 - t) * om) / so
    const s2 = Math.sin(t * om) / so
    const p = norm([
      a[0] * s1 + b[0] * s2,
      a[1] * s1 + b[1] * s2,
      a[2] * s1 + b[2] * s2,
    ])
    const lf = 1 + lift * Math.sin(Math.PI * t)
    out.push([p[0] * lf, p[1] * lf, p[2] * lf])
  }
  return out
}

/**
 * Globo decorativo do hero de `/ingress`, no espírito do hero de ingress.com:
 * Terra escura girando sozinha, continentes pontilhados (verde na América do
 * Sul — território Enlightened —, ciano no resto, costas em dourado), poucos
 * arcos "link" varrendo o globo com a luz viajando, e o portal-casa (Cascavel,
 * do `s2.center`) pulsando. Canvas 2D, projeção ortográfica — sem three.js.
 *
 * Só desktop (`matchMedia`), não monta nada no mobile. Pausa com a aba oculta
 * ou fora de vista; `prefers-reduced-motion` desenha um quadro parado.
 * Puramente decorativo: `aria-hidden`, `pointer-events: none` no CSS.
 */
export default function HeroGlobe({center}: {center: {lat: number; lng: number}}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const sync = () => setEnabled(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scene = buildScene(center)

    let W = 0
    let H = 0
    let R = 0
    let CX = 0
    let CY = 0
    let fadeIn = 0
    let fadeOut = 0

    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      W = rect.width
      H = rect.height
      canvas.width = Math.max(1, Math.round(W * dpr))
      canvas.height = Math.max(1, Math.round(H * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      R = W * 0.276
      CX = W * 0.69
      CY = H * 0.5
      fadeIn = R * 1.68
      fadeOut = R * 1.95
    }
    measure()

    const project = (v: Vec3, yaw: number) => {
      const p = rotX(rotY(v, yaw), TILT)
      return {x: CX + R * p[0], y: CY - R * p[1], z: p[2]}
    }
    const edgeFade = (x: number, y: number) => {
      const d = Math.hypot(x - CX, y - CY)
      if (d <= fadeIn) return 1
      if (d >= fadeOut) return 0
      const t = (d - fadeIn) / (fadeOut - fadeIn)
      return 1 - t * t * (3 - 2 * t)
    }

    const drawArc = (pts: Vec3[], yaw: number, col: Vec3, time: number, phase: number) => {
      const scr = pts.map((p) => {
        const pr = project(p, yaw)
        return {x: pr.x, y: pr.y, z: pr.z, f: edgeFade(pr.x, pr.y)}
      })
      for (const pass of [
        {w: 6, a: 0.055},
        {w: 1.4, a: 0.72},
      ]) {
        ctx.lineWidth = pass.w
        ctx.lineCap = 'round'
        for (let i = 0; i < scr.length - 1; i++) {
          const A = scr[i]
          const B = scr[i + 1]
          if (A.z <= -0.3 && B.z <= -0.3) continue
          const alpha = pass.a * Math.min(A.f, B.f)
          if (alpha < 0.004) continue
          ctx.beginPath()
          ctx.moveTo(A.x, A.y)
          ctx.lineTo(B.x, B.y)
          ctx.strokeStyle = rgba(col, alpha)
          ctx.stroke()
        }
      }
      const tt = (((time * 0.2 + phase) % 1) + 1) % 1
      const sp = scr[Math.floor(tt * (scr.length - 1))]
      if (sp.z > -0.05 && sp.f > 0.05) {
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = rgba(col, 0.95 * sp.f)
        ctx.shadowColor = rgba(col, 0.9)
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    const render = (time: number) => {
      const yaw = 0.7 + (reduceMotion ? 0 : time * 0.075)
      ctx.clearRect(0, 0, W, H)

      const atm = ctx.createRadialGradient(CX - 45, CY - 55, R * 0.5, CX - 10, CY - 10, R * 1.7)
      atm.addColorStop(0, 'rgba(38,120,200,0.15)')
      atm.addColorStop(0.5, 'rgba(20,60,110,0.05)')
      atm.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(CX, CY, R * 1.7, 0, Math.PI * 2)
      ctx.fillStyle = atm
      ctx.fill()

      const body = ctx.createRadialGradient(CX - 58, CY - 64, 20, CX, CY, R)
      body.addColorStop(0, 'rgba(30,44,54,0.95)')
      body.addColorStop(0.6, 'rgba(13,19,26,0.98)')
      body.addColorStop(1, 'rgba(8,11,16,1)')
      ctx.beginPath()
      ctx.arc(CX, CY, R, 0, Math.PI * 2)
      ctx.fillStyle = body
      ctx.fill()

      ctx.save()
      ctx.beginPath()
      ctx.arc(CX, CY, R, 0, Math.PI * 2)
      ctx.clip()
      ctx.globalCompositeOperation = 'lighter'

      const step = 2.4
      for (let lat = -88; lat <= 88; lat += step) {
        for (let lng = -180; lng < 180; lng += step) {
          if (!isLand(lat, lng)) continue
          const p = project(llToVec(lat, lng), yaw)
          if (p.z <= 0.02) continue
          const coast = isCoast(lat, lng, step)
          const green = lng > -83 && lng < -33 && lat > -56 && lat < 13
          const col = coast ? COLOR.gold : green ? COLOR.green : COLOR.cyan
          const rad = (coast ? 1.05 : 0.85) * (0.45 + 0.55 * p.z)
          ctx.globalAlpha = (coast ? 0.55 : 0.34) * (0.3 + 0.7 * p.z)
          ctx.beginPath()
          ctx.arc(p.x, p.y, rad, 0, Math.PI * 2)
          ctx.fillStyle = rgba(col, 1)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1

      scene.fields.forEach((f, i) => {
        const P = f.map((k) => project(scene.vecs[k], yaw))
        if (P.some((p) => p.z <= 0)) return
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.5 + i * 1.3)
        ctx.beginPath()
        ctx.moveTo(P[0].x, P[0].y)
        ctx.lineTo(P[1].x, P[1].y)
        ctx.lineTo(P[2].x, P[2].y)
        ctx.closePath()
        ctx.fillStyle = rgba(COLOR.green, 0.035 + 0.025 * pulse)
        ctx.fill()
        ctx.strokeStyle = rgba(COLOR.green, 0.16)
        ctx.lineWidth = 1
        ctx.stroke()
      })
      ctx.restore()

      ctx.globalCompositeOperation = 'lighter'
      scene.arcs.forEach((arc) => {
        const pts = arcPoints(scene.vecs[arc.a], scene.vecs[arc.b], arc.lift, arc.green ? 52 : 74)
        drawArc(pts, yaw, arc.green ? COLOR.green : COLOR.cyan, time, arc.phase)
      })

      scene.vecs.forEach((v, i) => {
        const p = project(norm(v).map((x) => x * 1.004) as Vec3, yaw)
        if (p.z <= 0) return
        const home = i === 0
        const col = home || scene.greenPortals.has(i) ? COLOR.green : COLOR.cyan
        ctx.beginPath()
        ctx.arc(p.x, p.y, home ? 3.3 : 1.5, 0, Math.PI * 2)
        ctx.fillStyle = rgba(col, home ? 1 : 0.7)
        ctx.shadowColor = rgba(col, 0.8)
        ctx.shadowBlur = home ? 16 : 5
        ctx.fill()
        ctx.shadowBlur = 0
        if (home) {
          const pr = 3.3 + (Math.sin(time * 2.1) * 0.5 + 0.5) * 10
          ctx.beginPath()
          ctx.arc(p.x, p.y, pr, 0, Math.PI * 2)
          ctx.strokeStyle = rgba(COLOR.green, 0.5 * (1 - (pr - 3.3) / 13))
          ctx.lineWidth = 1.4
          ctx.stroke()
        }
      })

      ctx.beginPath()
      ctx.arc(CX, CY, R, 0, Math.PI * 2)
      ctx.strokeStyle = rgba(COLOR.green, 0.15)
      ctx.lineWidth = 1.5
      ctx.shadowColor = rgba(COLOR.green, 0.4)
      ctx.shadowBlur = 15
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
    }

    let raf = 0
    let onScreen = true
    const startedAt = performance.now()

    const loop = (now: number) => {
      render((now - startedAt) / 1000)
      raf = requestAnimationFrame(loop)
    }
    const play = () => {
      if (raf || !onScreen || document.hidden) return
      if (reduceMotion) {
        render(8)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    const onVisibility = () => (document.hidden ? stop() : play())
    document.addEventListener('visibilitychange', onVisibility)

    const resizeObserver = new ResizeObserver(() => {
      measure()
      if (reduceMotion || !raf) render(8)
    })
    resizeObserver.observe(canvas)

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true
        if (onScreen) play()
        else stop()
      },
      {threshold: 0.01},
    )
    intersectionObserver.observe(canvas)

    play()

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [enabled, center])

  if (!enabled) return null
  return <canvas ref={canvasRef} className="ing-hero__globe" aria-hidden="true" />
}
