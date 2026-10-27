/**
 * Invalida uma tag do Data Cache do site em produção, chamando
 * `POST /api/revalidate`. Usado no fim dos scripts que escrevem no banco
 * (`scripts/livros/livros.mjs`, `scripts/livros/aplicar-leitura.mjs`,
 * `scripts/ingress/ingress-rescore.mjs`), para a mudança aparecer na hora em vez
 * de esperar o `revalidate` de cada página expirar.
 *
 * Lê `REVALIDATE_SECRET` (obrigatório) e `SITE_URL` (opcional, padrão
 * https://luizcasara.com) do ambiente ou do `.env.local`, com o mesmo parsing
 * manual de `scripts/global/migrate-casara.mjs`. O mesmo segredo precisa estar
 * nas variáveis do projeto na Vercel.
 *
 * NUNCA lança: o dado já foi gravado com sucesso, e uma falha aqui só quer dizer
 * que o site mostra a versão anterior até o cache expirar sozinho (1 h nos
 * livros, 60 s no ranking). Avisa no terminal e segue.
 */
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function lerDoEnvLocal(nome) {
    const caminho = join(ROOT, '.env.local');
    if (!existsSync(caminho)) return undefined;
    return readFileSync(caminho, 'utf8')
        .split(/\r?\n/)
        .find((l) => l.startsWith(`${nome}=`))
        ?.slice(nome.length + 1)
        .replace(/^["']|["']$/g, '') || undefined;
}

/**
 * @param {string[]} tags — precisam estar no allowlist da rota
 * @param {string} quando — só para a mensagem do terminal
 */
export async function revalidarCache(tags, quando) {
    const segredo = process.env.REVALIDATE_SECRET || lerDoEnvLocal('REVALIDATE_SECRET');
    const base = process.env.SITE_URL || lerDoEnvLocal('SITE_URL') || 'https://luizcasara.com';
    if (!segredo) {
        console.log(`\n(cache) REVALIDATE_SECRET ausente: ${quando} aparece no site quando o cache expirar sozinho.`);
        return;
    }
    try {
        const res = await fetch(`${base}/api/revalidate`, {
            method: 'POST',
            headers: {'content-type': 'application/json', 'x-revalidate-secret': segredo},
            body: JSON.stringify({tags}),
        });
        if (!res.ok) {
            console.log(`\n(cache) ${base} respondeu ${res.status} ao revalidar ${tags.join(', ')} — ${quando} aparece quando o cache expirar.`);
            return;
        }
        console.log(`\n(cache) ${tags.join(', ')} revalidado em ${base}.`);
    } catch (err) {
        console.log(`\n(cache) falha de rede ao revalidar ${tags.join(', ')} (${err.message}) — ${quando} aparece quando o cache expirar.`);
    }
}
