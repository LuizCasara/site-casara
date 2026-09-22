import sql from "@/lib/global/db";
import { normalizeCodenameKey } from "@/lib/ingress-rankings.mjs";

/**
 * Sobreposição ao vivo do perfil estático de `/ingress/fencherlc`, vinda da última
 * submissão do próprio FencherLC em `casara.ingress_rankings` (a mesma tabela
 * multi-escritor do ranking — ver AD-001 em `.specs/STATE.md`: essa tabela é
 * o caso explicitamente fora do escopo do arquivo estático, por ser
 * multi-escritor). Escopo deliberadamente estreito: só os 12 stats que
 * alimentam o radar. O resto do perfil (medalhas, linha do tempo, portais,
 * nível/recursões) continua vindo só de `data/ingress/fencherlc.json`, que é
 * dado que essa tabela nem guarda.
 *
 * Falha de rede/DB nunca derruba `/ingress/fencherlc` — devolve `null` e a página cai
 * pro baseline estático, exatamente como antes desta sobreposição existir.
 */
export async function loadFencherLcRadarOverride(
  codename: string
): Promise<Record<string, number> | null> {
  try {
    const key = normalizeCodenameKey(codename);
    const [row] = await sql`
      SELECT stat_values FROM casara.ingress_rankings WHERE codename_key = ${key}
    `;
    if (!row) return null;
    return row.stat_values as Record<string, number>;
  } catch (err) {
    console.error("[ingress-live-override] falha ao buscar override do FencherLC:", err);
    return null;
  }
}
