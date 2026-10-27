import {timingSafeEqual} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
import {revalidateTag} from 'next/cache';
import {LIVROS_CACHE_TAG} from '@/lib/livros/acervo/books';
import {INGRESS_NERD_STATS_TAG, INGRESS_RANKING_TAG} from '@/lib/ingress/ranking/ingress-ranking-cache';

export const dynamic = 'force-dynamic';

/**
 * Só as tags que algum script local sabe invalidar. Uma tag fora daqui é 400:
 * a rota não é um "revalide qualquer coisa", e um nome errado num script deve
 * aparecer como erro em vez de passar em silêncio.
 */
const TAGS_PERMITIDAS = new Set([LIVROS_CACHE_TAG, INGRESS_RANKING_TAG, INGRESS_NERD_STATS_TAG]);

function segredoConfere(recebido: string | null): boolean {
    const esperado = process.env.REVALIDATE_SECRET;
    if (!esperado || !recebido) return false;
    const a = Buffer.from(recebido);
    const b = Buffer.from(esperado);
    return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Invalida tags do Data Cache depois que um script local escreve no banco de
 * produção (ver `scripts/global/revalidar-cache.mjs`). Os dados de `/livros` e do
 * ranking ficam em cache justamente para o render não acordar o Neon; sem esta
 * rota, um livro cadastrado só apareceria quando o `revalidate` expirasse.
 *
 * Protegida por `REVALIDATE_SECRET` (header `x-revalidate-secret`). Sem a env
 * var configurada a rota recusa tudo — nunca fica aberta por omissão.
 *
 * `expire: 0` e não `'max'`: quem chama acabou de rodar o script e vai abrir a
 * página para conferir; servir a versão velha nessa primeira visita pareceria
 * que a gravação falhou.
 */
export async function POST(request: NextRequest) {
    if (!segredoConfere(request.headers.get('x-revalidate-secret'))) {
        return NextResponse.json({error: 'não autorizado'}, {status: 401});
    }

    let tags: unknown;
    try {
        ({tags} = await request.json());
    } catch {
        return NextResponse.json({error: 'corpo inválido'}, {status: 400});
    }
    if (!Array.isArray(tags) || tags.length === 0 || !tags.every((t) => TAGS_PERMITIDAS.has(t))) {
        return NextResponse.json({error: 'tags inválidas'}, {status: 400});
    }

    for (const tag of tags as string[]) revalidateTag(tag, {expire: 0});
    return NextResponse.json({ok: true, tags});
}
