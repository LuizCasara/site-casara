import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    experimental: {
        /**
         * Quanto tempo o Router Cache do cliente reaproveita a resposta de uma
         * rota dinâmica antes de buscá-la de novo.
         *
         * O padrão do Next 15 é **zero**: toda navegação client-side refaz o
         * request, mesmo voltando para uma página aberta segundos atrás. Em
         * `/livros` isso aparece na cara — folhear o acervo com as setas dispara
         * um GET por livro, e ir e voltar entre dois livros dispara dois GETs
         * iguais.
         *
         * 60s cobre a janela em que alguém folheia: dentro dela, voltar é
         * instantâneo e não toca o servidor. Não afeta reload nem primeira
         * carga — o Router Cache só existe para navegação client-side —, e não
         * afeta as dinâmicas ao vivo (`/q`, `/w`) nem o `/stats`, que buscam
         * dado por `fetch` em rotas de API, fora deste cache.
         */
        staleTimes: {dynamic: 60},
    },
    /**
     * As páginas do caderno de `/livros` são lidas do disco em runtime, por
     * caminho montado com `process.cwd()` (ver `app/(livros)/api/caderno/route.ts`).
     *
     * O tracing do Next empacota o que consegue enxergar num `import`, e um
     * caminho montado em runtime não é um import — sem esta linha a rota funciona
     * no `npm run dev` e devolve zero páginas em produção, que é o tipo de
     * defeito que só aparece depois do deploy.
     *
     * `/ingress/**` pela mesma razão: `lib/ingress/catalog/ingress-catalog.mjs` e
     * `lib/ingress/catalog/ingress-lore.mjs` leem `data/ingress/*.json` com `process.cwd()`.
     * Hoje essas rotas são estáticas (o dado é empacotado no build), mas se
     * alguma virar dinâmica o `readFileSync` quebra em produção sem isto.
     */
    outputFileTracingIncludes: {
        '/api/caderno': ['./content/caderno/**/*'],
        '/ingress/**': ['./data/ingress/**/*'],
        // `history/changes` calcula tier e medalha por stat (`lib/ingress/ranking/ingress-history-diff.mjs`
        // -> `ingress-badges.mjs` -> catálogo lido do disco), mesma razão de `/ingress/**`.
        '/api/ingress-rankings/**': ['./data/ingress/**/*'],
    },
    // Sem bloco `env`: as três variáveis do Telegram só são lidas dentro de
    // app/(global)/api/telegram/route.js (server-only), que já enxerga process.env.*
    // sem precisar disso — o bloco `env` do next.config existe justamente
    // para inlinar valores no bundle do NAVEGADOR, e essas variáveis não têm
    // prefixo NEXT_PUBLIC_, então declará-las aqui era só risco à toa: bastava
    // alguém um dia referenciar `process.env.TELEGRAM_BOT_TOKEN` num
    // componente "use client" para o token do bot vazar publicamente no JS
    // servido a qualquer visitante.
};

export default nextConfig;
