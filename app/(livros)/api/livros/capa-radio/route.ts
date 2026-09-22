import {NextResponse} from 'next/server';

/**
 * Proxy da capa do álbum que toca na rádio da sala 3D.
 *
 * **Existe por causa de CORS, não por preferência.** `i.plaza.one` serve a
 * imagem, mas não manda `Access-Control-Allow-Origin`; uma textura WebGL de
 * outra origem sem esse cabeçalho é recusada pelo navegador. Buscando no
 * servidor — onde CORS não se aplica — e devolvendo da nossa própria origem, a
 * imagem vira same-origin e o three.js aceita.
 *
 * **A allowlist de host é a razão de ser deste arquivo, não um detalhe.** Um
 * proxy que busca qualquer URL que lhe mandarem é um SSRF: alguém passaria
 * `?u=http://169.254.169.254/...` e leria o metadata da instância, ou varreria
 * a rede interna usando este endpoint como ponte. Por isso a checagem é de
 * igualdade de `hostname` contra uma lista fechada — não `startsWith`, não
 * `includes`, que `i.plaza.one.evil.com` atravessaria.
 */

/** Hosts de onde este proxy aceita buscar. Um só, hoje. */
const HOSTS_PERMITIDOS = new Set(['i.plaza.one']);

/** Teto de tamanho: a miniatura da Plaza tem ~26KB, e nada aqui deveria chegar
 *  perto disso. Uma resposta gigante só aconteceria se o host mudasse o que
 *  serve, e streamar isso para o visitante não ajudaria ninguém. */
const LIMITE_BYTES = 2 * 1024 * 1024;

/** GIF 1×1 transparente. A resposta de falha é uma IMAGEM, não um 404: quem
 *  chama é um `new Image()` desenhando numa textura, e um erro ali só produz
 *  um `onerror` que a tela já teria de tratar de qualquer jeito. Devolvendo um
 *  pixel, o player desenha sem capa e segue. */
const PIXEL_VAZIO = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64',
);

function pixelVazio() {
    return new NextResponse(new Uint8Array(PIXEL_VAZIO), {
        headers: {
            'Content-Type': 'image/gif',
            // Curto de propósito: a falha pode ser passageira (a Plaza fora do
            // ar por um minuto), e cachear o pixel por um ano deixaria a capa
            // permanentemente ausente para quem passou pela janela ruim.
            'Cache-Control': 'public, max-age=60',
        },
    });
}

export async function GET(request: Request) {
    const origem = new URL(request.url).searchParams.get('u');
    if (!origem) return pixelVazio();

    let alvo: URL;
    try {
        alvo = new URL(origem);
    } catch {
        return pixelVazio();
    }
    if (alvo.protocol !== 'https:' || !HOSTS_PERMITIDOS.has(alvo.hostname)) {
        return pixelVazio();
    }

    try {
        const resposta = await fetch(alvo, {
            signal: AbortSignal.timeout(8_000),
            headers: {Accept: 'image/*'},
        });
        const tipo = resposta.headers.get('content-type') ?? '';
        if (!resposta.ok || !tipo.startsWith('image/')) return pixelVazio();

        const bytes = await resposta.arrayBuffer();
        if (bytes.byteLength > LIMITE_BYTES) return pixelVazio();

        return new NextResponse(bytes, {
            headers: {
                'Content-Type': tipo,
                // `immutable` com um ano é seguro porque a URL de origem é
                // endereçada por conteúdo (`artwork_<id>-<timestamp>.jpg`):
                // uma capa diferente é sempre uma URL diferente, então nada
                // aqui pode ficar velho. É o que faz a CDN da Vercel absorver
                // o tráfego — na prática, uma invocação por faixa no mundo, e
                // não uma por visitante.
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch {
        return pixelVazio();
    }
}
