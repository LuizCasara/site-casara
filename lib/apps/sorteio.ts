export const SORTEIO_LIMITS = {
  MAX_ENTRIES: 500,
  MAX_WINNERS_PER_DRAW: 50,
} as const;

/** Separa por vírgula, remove espaços e itens vazios/duplicados. */
export function parseEntries(raw: string): string[] {
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const item of raw.split(",")) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    entries.push(trimmed);
  }
  return entries;
}

/** Fisher-Yates + corta os primeiros `count` — aleatoriedade simples, sem
 * dinheiro envolvido, não precisa de nada criptográfico aqui. */
export function drawWinners(pool: string[], count: number): string[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
