import {loadProfile} from '@/lib/ingress'

// Composição completa das seções entra em T9. Aqui só o mínimo para a rota
// existir com o layout sem header/footer.
export default function IngressPage() {
  const profile = loadProfile()

  if (!profile) {
    return (
      <main style={{padding: '4rem 1.25rem', maxWidth: 640, margin: '0 auto'}}>
        <h1 style={{fontSize: 24, color: 'var(--ing-green)'}}>Perfil ainda não publicado</h1>
        <p style={{color: 'var(--ing-text-dim)'}}>O perfil do agente será publicado em breve.</p>
      </main>
    )
  }

  return (
    <main style={{padding: '4rem 1.25rem', maxWidth: 640, margin: '0 auto'}}>
      <h1 style={{fontSize: 28, color: 'var(--ing-green)', textShadow: 'var(--ing-glow)'}}>
        {profile.agent.codename}
      </h1>
      <p style={{color: 'var(--ing-text-dim)'}}>
        {profile.agent.faction === 'enlightened' ? 'Enlightened' : 'Resistance'} · Nível{' '}
        {profile.agent.level}
      </p>
    </main>
  )
}
