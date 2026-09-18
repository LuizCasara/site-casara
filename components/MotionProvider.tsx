'use client'

import {MotionConfig} from 'framer-motion'

/**
 * Casca client fina: `reducedMotion="user"` faz toda animação de transform/
 * layout do Framer Motion abaixo respeitar `prefers-reduced-motion` (só opacidade
 * e cor sobrevivem). O `@media (prefers-reduced-motion)` do CSS não alcança
 * essas animações — elas rodam em JS, não em CSS. O conteúdo entra por
 * `children`, então continua Server Component onde já era.
 */
export default function MotionProvider({children}: {children: React.ReactNode}) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
