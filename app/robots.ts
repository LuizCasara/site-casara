import type {MetadataRoute} from 'next'

const BASE_URL = 'https://luizcasara.com'

/**
 * `/w/`, `/q/` (sessões ao vivo com token no path) e `/casamento` (página
 * privada, já com `robots: {index: false, follow: false}` no próprio layout)
 * não têm valor nenhum sendo indexadas — são links efêmeros ou de convite
 * direto, não conteúdo para descoberta orgânica. `/stats` é o dashboard
 * interno do dono do site.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/w/', '/q/', '/stats', '/casamento'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
