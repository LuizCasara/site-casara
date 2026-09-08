/**
 * Lado Next da feature Ingress: tipos do perfil e o loader.
 *
 * A fonte de dados é `data/ingress/fencherlc.json`, gerado por
 * `scripts/ingress.mjs` a partir do export do app (e, no futuro, do dump GDPR).
 * A lógica de montagem vive em `lib/ingress-profile.mjs`; aqui só lemos o
 * resultado. Nada de banco, nada de rede — ver AD-001 em `.specs/STATE.md`.
 */

import rawProfile from '@/data/ingress/fencherlc.json'

export const SCHEMA_VERSION = 1

export type Faction = 'enlightened' | 'resistance'
export type PendingSection = 'apTimeline' | 'portalMap'

export interface AgentIdentity {
  codename: string
  faction: Faction
  level: number
  recursions: number
  monthsSubscribed: number
}

export interface ProfileSources {
  appExport: { capturedAt: string } | null
  gdprDump: { generatedAt: string } | null
}

export interface S2Config {
  center: { lat: number; lng: number }
  defaultLevel: number
}

export interface TimePoint {
  t: string
  v: number
}

export interface PortalPoint {
  lat: number
  lng: number
  name?: string
}

/** Um snapshot de estatísticas por export (ou ponto histórico do dump). */
export interface StatSnapshot {
  t: string
  stats: Record<string, number>
}

/** `{ <slug de badge>: { <tier>: 'YYYY-MM-DD' } }` — datas de conquista, esparsas. */
export type MedalDates = Record<string, Record<string, string>>

export interface EventBadge {
  slug: string
  count?: number
  tier?: string
  dates?: Record<string, string>
}

export interface Profile {
  schemaVersion: number
  agent: AgentIdentity
  capturedAt: string
  sources: ProfileSources
  stats: Record<string, number>
  history: StatSnapshot[]
  medalDates: MedalDates
  eventBadges: EventBadge[]
  s2: S2Config
  timeSeries: Record<string, TimePoint[]> | null
  portals: { visited: PortalPoint[]; submitted: PortalPoint[] } | null
  pending: PendingSection[]
}

/**
 * O perfil publicado, ou `null` se o arquivo estiver ausente ou numa versão de
 * schema que este código não entende. A página trata o `null` com um estado
 * vazio informativo — nunca um erro 500.
 */
export function loadProfile(): Profile | null {
  const profile = rawProfile as unknown as Profile
  if (!profile || profile.schemaVersion !== SCHEMA_VERSION) return null
  return profile
}
