import type {MetadataRoute} from 'next'
import {listarLivros} from '@/lib/books'
import {coreBadges} from '@/lib/ingress-catalog.mjs'

const BASE_URL = 'https://luizcasara.com'

/**
 * Mesma lista de ids de `app/app/page.tsx` (`appCategories`). Não importamos
 * aquele arquivo diretamente porque é `"use client"` e traz `react-icons`
 * junto só pra extrair uma lista de strings — mantido em sincronia manual,
 * como o próprio arquivo já avisa fazer entre listagem e roteamento.
 */
const APP_SLUGS = [
  'descubra-seu-temperamento',
  'descubra-sua-linguagem-do-amor',
  'rule-of-three',
  'compound-interest',
  'percentage',
  'kitchen-units',
  'currency',
  'bitcoin',
  'file-size',
  'number-systems',
  'qr-code',
  'image-to-svg',
  'nuvem-de-palavras',
  'quiz-ao-vivo',
  'sorteio',
]

/**
 * `/w/[id]`, `/q/[id]` (sessões ao vivo, efêmeras e não descobríveis por
 * natureza) e `/casamento` (privada) ficam de fora — mesmo critério de
 * `app/robots.ts`. `/stats` também não entra: é o dashboard interno.
 *
 * `/ingress/ranking` recebe a prioridade e o `changeFrequency` mais altos do
 * site: é a página que muda com mais frequência (ranking público, atualizado
 * a cada agente que entra) e o alvo principal deste sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [livros, medalhas] = await Promise.all([
    listarLivros().catch(() => []),
    Promise.resolve(coreBadges()),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    {url: BASE_URL, changeFrequency: 'monthly', priority: 0.8},
    {url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.6},
    {url: `${BASE_URL}/projects`, changeFrequency: 'monthly', priority: 0.6},
    {url: `${BASE_URL}/app`, changeFrequency: 'monthly', priority: 0.6},
    {url: `${BASE_URL}/livros`, changeFrequency: 'weekly', priority: 0.6},
    {url: `${BASE_URL}/livros/lista`, changeFrequency: 'weekly', priority: 0.5},
    {url: `${BASE_URL}/ingress`, changeFrequency: 'weekly', priority: 0.7},
    {url: `${BASE_URL}/ingress/ranking`, changeFrequency: 'hourly', priority: 1.0},
    {url: `${BASE_URL}/ingress/linha-do-tempo`, changeFrequency: 'weekly', priority: 0.5},
  ]

  const appRoutes: MetadataRoute.Sitemap = APP_SLUGS.map((slug) => ({
    url: `${BASE_URL}/app/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  const livroRoutes: MetadataRoute.Sitemap = livros.map((livro) => ({
    url: `${BASE_URL}/livros/${livro.slug}`,
    lastModified: livro.updated_at,
    changeFrequency: 'monthly' as const,
    priority: 0.4,
  }))

  const medalhaRoutes: MetadataRoute.Sitemap = medalhas.map((badge: {slug: string}) => ({
    url: `${BASE_URL}/ingress/medalha/${badge.slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.4,
  }))

  return [...staticRoutes, ...appRoutes, ...livroRoutes, ...medalhaRoutes]
}
