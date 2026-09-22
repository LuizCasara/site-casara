import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * Rate limiting por IP para rotas públicas de escrita, via Upstash Redis
 * (REST, funciona em serverless sem estado compartilhado entre invocações —
 * memória local não serve porque cada request pode cair numa instância
 * diferente).
 *
 * Fail-open por design: sem `UPSTASH_REDIS_REST_URL`/`_TOKEN` configuradas
 * (dev local, ou antes do primeiro deploy com isso), ou se a chamada ao Redis
 * falhar por qualquer motivo, a rota segue normalmente. Um limiter é sempre
 * uma camada extra, nunca o único guardião de uma rota — travar o site
 * inteiro porque o Upstash caiu seria pior que o problema que ele resolve.
 */

let warned = false;
function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warned) {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN ausentes — rate limiting desativado"
      );
      warned = true;
    }
    return null;
  }
  return new Redis({ url, token });
}

// Lazy, como lib/global/db.ts: evita instanciar o client no carregamento do módulo
// (build time) quando as env vars ainda não existem.
let redis: Redis | null | undefined;
function redisClient(): Redis | null {
  if (redis === undefined) redis = getRedis();
  return redis;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, limit: number, windowSeconds: number): Ratelimit | null {
  const client = redisClient();
  if (!client) return null;
  let rl = limiters.get(name);
  if (!rl) {
    rl = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      analytics: false,
      prefix: `rl:${name}`,
    });
    limiters.set(name, rl);
  }
  return rl;
}

/** IP do requisitante. A Vercel injeta `x-forwarded-for` (pode ter mais de um
 * IP separado por vírgula quando passa por proxies encadeados — o primeiro é
 * o cliente original). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitConfig = { limit: number; windowSeconds: number };

/** Limites por rota — ver CLAUDE.md / auditoria de segurança para o raciocínio
 * de cada um. Ajustar aqui não exige tocar nas rotas. */
export const RATE_LIMITS = {
  // Dispara e-mail via Gmail pessoal e Telegram do dono do site — os dois
  // vetores de abuso mais caros (cota de envio do Gmail, flood do grupo).
  EMAIL: { limit: 3, windowSeconds: 3600 },
  TELEGRAM: { limit: 10, windowSeconds: 3600 },
  // Escreve uma linha nova em casara.ingress_rankings por codinome distinto —
  // o debounce de 5min da rota é por codinome, não por IP.
  INGRESS_RANKING_WRITE: { limit: 20, windowSeconds: 3600 },
  // Criação de sessão de quiz/nuvem de palavras (não as ações de participante
  // de uma sessão já existente, que ficam mais permissivas de propósito —
  // várias pessoas no mesmo Wi-Fi/evento presencial compartilham IP).
  SESSION_CREATE: { limit: 20, windowSeconds: 3600 },
  // Lote de analytics — generoso porque é tráfego legítimo normal (o cliente
  // já teta em até 10 eventos por lote, então isso ainda cobre uso pesado).
  EVENTS_BATCH: { limit: 60, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitConfig>;

/**
 * Verifica o limite para este IP nesta rota. Retorna uma `NextResponse` 429
 * pronta para devolver se estourou, ou `null` se pode seguir — o padrão de
 * uso é `const blocked = await rateLimitOrNull(...); if (blocked) return blocked;`
 * logo no topo do handler, antes de qualquer trabalho.
 */
export async function rateLimitOrNull(
  request: Request,
  name: keyof typeof RATE_LIMITS
): Promise<NextResponse | null> {
  const config = RATE_LIMITS[name];
  const limiter = getLimiter(name, config.limit, config.windowSeconds);
  if (!limiter) return null;

  try {
    const ip = clientIp(request);
    const { success, reset } = await limiter.limit(ip);
    if (success) return null;

    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "muitas requisições, tente novamente mais tarde" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  } catch (err) {
    // Upstash fora do ar ou erro de rede: não deixa uma dependência opcional
    // derrubar a rota real.
    console.error(`[rate-limit] falha ao checar limite '${name}':`, err);
    return null;
  }
}
