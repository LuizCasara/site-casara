import {medalLore, formatLoreNumber} from '@/lib/ingress-lore.mjs'

/**
 * O "plus" de uma medalha de estatística: a frase que explica a métrica e as
 * comparações que reenquadram o número ("≈ 94 maratonas"). Server component;
 * some quando não há lore para o slug.
 */
export default function MedalLore({
  slug,
  value,
  daysPlaying,
}: {
  slug: string
  value: number
  daysPlaying: number
}) {
  const lore = medalLore(slug, value, daysPlaying) as
    | {blurb: string; facts: {n: number; label: string}[]}
    | null
  if (!lore) return null

  return (
    <section className="ing-lore">
      <p className="ing-lore__blurb">{lore.blurb}</p>
      {lore.facts.length ? (
        <ul className="ing-lore__facts">
          {lore.facts.map((f) => (
            <li key={f.label}>
              <b>{formatLoreNumber(f.n)}</b> {f.label}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
