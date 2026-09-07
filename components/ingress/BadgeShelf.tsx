import Panel from './Panel'
import BadgeMedal from './BadgeMedal'

type Badge = Parameters<typeof BadgeMedal>[0]['badge']

/** Prateleira de medalhas. `badges` já vem de `computeAllBadges`. Server. */
export default function BadgeShelf({badges}: {badges: Badge[]}) {
  if (badges.length === 0) return null
  const onyx = badges.filter((b) => b.atMax).length
  return (
    <Panel label="Medalhas" hint={`${badges.length} · ${onyx} em Onyx`}>
      <div className="ing-medals">
        {badges.map((b) => (
          <BadgeMedal key={b.key} badge={b} />
        ))}
      </div>
    </Panel>
  )
}
