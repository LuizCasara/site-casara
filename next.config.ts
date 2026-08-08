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
    // Environment variables that will be available at runtime
    env: {
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
        TELEGRAM_THREAD_ID: process.env.TELEGRAM_THREAD_ID,
    }
};

export default nextConfig;
