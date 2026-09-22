export const QUIZ_LIMITS = {
  TITLE_MAX: 120,
  DESCRIPTION_MAX: 500,
  PROMPT_MAX: 200,
  OPTION_MAX_LEN: 80,
  OPTIONS_MIN: 2,
  OPTIONS_MAX: 6,
  QUESTIONS_MIN: 1,
  QUESTIONS_MAX: 50,
  TIME_LIMIT_MIN_SECONDS: 5,
  TIME_LIMIT_MAX_SECONDS: 300,
  NAME_MAX_LEN: 30,
} as const;

// A fórmula "de verdade" roda inteira dentro do SQL (ver
// app/api/quiz-sessions/[id]/answers/route.ts) — o servidor nunca confia no
// relógio do cliente nem faz select-depois-insert. Estas constantes existem
// pra não espalhar os números mágicos, e computePoints() serve de referência
// pura (documentação executável / testes), não é chamada pela rota real.
export const QUIZ_SCORING = {
  FLAT_POINTS_NO_TIMER: 1000,
  BASE_POINTS: 500,
  SPEED_BONUS_MAX: 500,
} as const;

export type QuizPhase = "lobby" | "question" | "reveal" | "finished";
export type QuizSessionStatus = "active" | "saved" | "discarded";

/** Espelha a CTE de pontuação do servidor — usar só como referência/preview,
 * nunca como fonte de verdade (o servidor recalcula tudo a partir do próprio
 * relógio do Postgres). */
export function computePoints(
  isCorrect: boolean,
  elapsedMs: number,
  timeLimitSeconds: number | null
): number {
  if (!isCorrect) return 0;
  if (timeLimitSeconds === null) return QUIZ_SCORING.FLAT_POINTS_NO_TIMER;
  const speedFactor = Math.max(0, Math.min(1, 1 - elapsedMs / (timeLimitSeconds * 1000)));
  return QUIZ_SCORING.BASE_POINTS + Math.round(QUIZ_SCORING.SPEED_BONUS_MAX * speedFactor);
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export type QuizQuestionDraft = {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  timeLimitSeconds: number | null;
};

export function isValidQuestionDraft(q: QuizQuestionDraft): string | null {
  const prompt = q.prompt.trim();
  if (!prompt || prompt.length > QUIZ_LIMITS.PROMPT_MAX) {
    return `a pergunta deve ter entre 1 e ${QUIZ_LIMITS.PROMPT_MAX} caracteres`;
  }
  const options = q.options.map((o) => o.trim()).filter(Boolean);
  if (options.length < QUIZ_LIMITS.OPTIONS_MIN || options.length > QUIZ_LIMITS.OPTIONS_MAX) {
    return `cada pergunta precisa de ${QUIZ_LIMITS.OPTIONS_MIN} a ${QUIZ_LIMITS.OPTIONS_MAX} opções`;
  }
  if (options.some((o) => o.length > QUIZ_LIMITS.OPTION_MAX_LEN)) {
    return `cada opção deve ter no máx. ${QUIZ_LIMITS.OPTION_MAX_LEN} caracteres`;
  }
  if (q.correctOptionIndex < 0 || q.correctOptionIndex >= options.length) {
    return "selecione qual opção é a resposta certa";
  }
  if (
    q.timeLimitSeconds !== null &&
    (q.timeLimitSeconds < QUIZ_LIMITS.TIME_LIMIT_MIN_SECONDS ||
      q.timeLimitSeconds > QUIZ_LIMITS.TIME_LIMIT_MAX_SECONDS)
  ) {
    return `tempo por pergunta deve ser entre ${QUIZ_LIMITS.TIME_LIMIT_MIN_SECONDS} e ${QUIZ_LIMITS.TIME_LIMIT_MAX_SECONDS}s`;
  }
  return null;
}

/** Diferença (ms) entre o relógio do servidor e o do cliente, calculada a
 * cada poll — usada pra corrigir o cronômetro visual de dispositivos com a
 * hora errada. A trava real de "ainda dá pra responder" é sempre o `phase`
 * retornado pelo servidor, nunca esse cronômetro local. */
export function clockOffsetMs(serverTimeIso: string): number {
  return new Date(serverTimeIso).getTime() - Date.now();
}

export function correctedNow(offsetMs: number): number {
  return Date.now() + offsetMs;
}

// Sequência de suspense do pódio final: 3º, depois 2º, depois 1º lugar, e só
// então a lista completa — a mesma janela de tempo é usada pela tela de
// resultados (que anima a revelação) e pela página do participante (que só
// mostra a própria posição/pontuação quando tudo já foi revelado), ambas
// ancoradas no `finished_at` do servidor + correção de offset de relógio, sem
// precisar de WebSocket nem de um novo estado no servidor pra coordenar isso.
export const PODIUM_REVEAL = {
  SUSPENSE_MS: 1500,
  STEP_MS: 1800,
  LIST_DELAY_MS: 1000,
} as const;

export const PODIUM_REVEAL_TOTAL_MS =
  PODIUM_REVEAL.SUSPENSE_MS + 3 * PODIUM_REVEAL.STEP_MS + PODIUM_REVEAL.LIST_DELAY_MS;

/** Quantos lugares do pódio (contando 3º→2º→1º) já devem estar revelados. */
export function podiumRevealedPlaces(elapsedMs: number): number {
  if (elapsedMs < PODIUM_REVEAL.SUSPENSE_MS) return 0;
  return Math.min(3, Math.floor((elapsedMs - PODIUM_REVEAL.SUSPENSE_MS) / PODIUM_REVEAL.STEP_MS) + 1);
}

export function podiumFullyRevealed(elapsedMs: number): boolean {
  return elapsedMs >= PODIUM_REVEAL_TOTAL_MS;
}
