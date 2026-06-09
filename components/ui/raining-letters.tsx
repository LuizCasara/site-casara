"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"

interface Character {
  char: string
  x: number
  y: number
  speed: number
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"

export const RainingLetters: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>([])
  const [activeIndices, setActiveIndices] = useState<Set<number>>(new Set())

  const createCharacters = useCallback(() => {
    const chars: Character[] = []
    for (let i = 0; i < 100; i++) {
      chars.push({
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        speed: 0.04 + Math.random() * 0.12,
      })
    }
    return chars
  }, [])

  useEffect(() => {
    setCharacters(createCharacters())
  }, [createCharacters])

  useEffect(() => {
    if (characters.length === 0) return
    const interval = setInterval(() => {
      const next = new Set<number>()
      const count = Math.floor(Math.random() * 3) + 2
      for (let i = 0; i < count; i++) {
        next.add(Math.floor(Math.random() * characters.length))
      }
      setActiveIndices(next)
    }, 100)
    return () => clearInterval(interval)
  }, [characters.length])

  useEffect(() => {
    let rafId: number
    const tick = () => {
      setCharacters(prev =>
        prev.map(c => {
          const nextY = c.y + c.speed
          if (nextY >= 105) {
            return {
              char: CHARS[Math.floor(Math.random() * CHARS.length)],
              x: Math.random() * 100,
              y: -5,
              speed: 0.04 + Math.random() * 0.12,
            }
          }
          return { ...c, y: nextY }
        })
      )
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      {characters.map((char, i) => {
        const isActive = activeIndices.has(i)
        return (
          <span
            key={i}
            className="absolute font-mono select-none"
            style={{
              left: `${char.x}%`,
              top: `${char.y}%`,
              transform: "translate(-50%, -50%)",
              fontSize: "1.1rem",
              color: isActive ? "#4ade80" : undefined,
              opacity: isActive ? 0.55 : 0.1,
              textShadow: isActive ? "0 0 8px rgba(74,222,128,0.5)" : "none",
              transition: "color 0.1s, opacity 0.1s, text-shadow 0.1s",
              willChange: "top",
            }}
          >
            {char.char}
          </span>
        )
      })}
    </div>
  )
}
