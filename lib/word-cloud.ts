export const WORD_CLOUD_LIMITS = {
  TITLE_MAX: 120,
  DESCRIPTION_MAX: 500,
  WORD_MAX_LEN: 40,
  FIXED_WORDS_MIN: 2,
  FIXED_WORDS_MAX: 50,
  MAX_WORDS_FLOOR: 1,
  MAX_WORDS_OPEN_CEILING: 10,
} as const;

export const FONT_SIZE_MIN_PX = 15;
export const FONT_SIZE_MAX_PX = 140;
// Entre linear (1, exagera demais o topo) e raiz quadrada (0.5, achata demais
// os do meio) — dá mais peso visual pras mais frequentes sem colapsar a cauda.
const FONT_SIZE_CURVE = 0.62;

// Cor "quente" de destaque compartilhada entre o modo Texto (WordCloud) e o
// modo Gráfico (WordBarChart) — fonte única pra não divergir entre os dois.
export const HOT_ACCENT_RGB: [number, number, number] = [250, 204, 21]; // yellow-400

export function rgbToCss(rgb: [number, number, number], alpha = 1): string {
  const [r, g, b] = rgb;
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type SessionMode = "fixed" | "open";
export type SessionStatus = "active" | "saved" | "discarded";

export type WordCount = { word: string; count: number };
export type WordCountWithSize = WordCount & { fontSize: number };

/** Lowercase + trim + collapse internal whitespace. Keeps accents on purpose:
 * stripping them would merge distinct Portuguese words (e.g. "e"/"é"). */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Dedupes a list of raw words by their normalized form, dropping empties.
 * Keeps the first-seen (trimmed) spelling for display. */
export function dedupeWords(words: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of words) {
    const trimmed = raw.trim();
    const norm = normalizeWord(trimmed);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    result.push(trimmed);
  }
  return result;
}

/** Font size scales with relative frequency ** FONT_SIZE_CURVE so a single
 * outlier word doesn't shrink every other word down to the minimum, while
 * still standing out clearly from the pack (see FONT_SIZE_CURVE comment). */
export function computeFontSizes(
  counts: WordCount[],
  min: number = FONT_SIZE_MIN_PX,
  max: number = FONT_SIZE_MAX_PX
): WordCountWithSize[] {
  if (counts.length === 0) return [];
  if (counts.length === 1) {
    return [{ ...counts[0], fontSize: max }];
  }

  const values = counts.map((c) => c.count);
  const minCount = Math.min(...values);
  const maxCount = Math.max(...values);

  if (minCount === maxCount) {
    const shared = min + 0.6 * (max - min);
    return counts.map((c) => ({ ...c, fontSize: shared }));
  }

  return counts.map((c) => {
    const t = Math.pow((c.count - minCount) / (maxCount - minCount), FONT_SIZE_CURVE);
    return { ...c, fontSize: min + t * (max - min) };
  });
}

/** Short, URL-friendly id. Not a secret — only needs to avoid collisions,
 * which the caller should retry on (PRIMARY KEY conflict). */
export function generateSessionId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

/** Long random secret for host/results access tokens and participant ids. */
export function generateToken(): string {
  return crypto.randomUUID();
}

export function canAcceptResponses(
  status: SessionStatus,
  acceptingResponses: boolean
): boolean {
  return status === "active" && acceptingResponses === true;
}

export function maxWordsCeiling(mode: SessionMode, fixedWordsCount: number): number {
  return mode === "fixed" ? Math.max(fixedWordsCount, 1) : WORD_CLOUD_LIMITS.MAX_WORDS_OPEN_CEILING;
}
