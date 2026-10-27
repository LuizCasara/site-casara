import {NextResponse} from 'next/server';

/**
 * `/stats` e `/api/metrics/*` só existem no `npm run dev`. As ~15 agregações
 * por acesso sobre `casara.events` acordavam o compute do Neon (que só
 * suspende após 5 min sem query) para um painel que só o dono do site lê. Em
 * produção, preview ou `npm start` local, a página e as rotas respondem 404.
 *
 * `NODE_ENV` e não `VERCEL_ENV` (o gate de `analytics-env.ts`): aqui a pergunta
 * é "estou no servidor de desenvolvimento?", e `next dev` é o único que define
 * `development`. O dev local lê o banco de PRODUÇÃO pelo `.env.local`, então o
 * painel continua mostrando dado real.
 */
export function isLocalDev(): boolean {
    return process.env.NODE_ENV === 'development';
}

/** 404 pronto para devolver no topo de uma rota só-dev, ou `null` para seguir. */
export function devOnlyOrNotFound(): NextResponse | null {
    return isLocalDev() ? null : NextResponse.json({error: 'not found'}, {status: 404});
}
