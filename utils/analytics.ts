import { track } from '@vercel/analytics/react';

// Envia para Vercel Analytics E para o Neon DB simultaneamente
const trackEvent = (
  name: string,
  payload: Record<string, string | number | boolean> = {}
) => {
  track(name, payload as Record<string, string>);

  if (typeof window === 'undefined') return;

  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: name,
      payload,
      route: window.location.pathname,
      resolution: `${window.screen.width}x${window.screen.height}`,
    }),
  }).catch(() => {});
};

// ─── Home ─────────────────────────────────────────────────────────────────────

export const trackQuickAccessLink = (linkName: string) =>
  trackEvent('quick_access_click', { link_name: linkName });

export const trackGenerateQuote = () => trackEvent('quote_click');

export const trackReceiveTip = () => trackEvent('tip_click');

export const trackHomePageVisit = () => {
  const startTime = Date.now();
  return () => {
    const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
    trackEvent('home_time_spent', { seconds: timeSpentSeconds });
  };
};

// ─── Teste de Temperamento ────────────────────────────────────────────────────

export const trackTestStart = (_userName: string) =>
  trackEvent('temperament_started');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trackTestCompletion = (results: any) => {
  const pct = results.temperamentPercentages ?? {};
  trackEvent('temperament_completed', {
    primary:          results.primaryTemperament?.name,
    secondary:        results.secondaryTemperament?.name,
    sanguineo:        pct['Sanguineo']   ?? 0,
    colerico:         pct['Colerico']    ?? 0,
    melancolico:      pct['Melancolico'] ?? 0,
    fleumatico:       pct['Fleumatico']  ?? 0,
    duration_seconds: results.testDuration,
  });
};

export const trackQuestionDropout = (questionIndex: number, questionText: string) =>
  trackEvent('temperament_dropout', { question_index: questionIndex, question_text: questionText });

export const trackPdfDownload = (_userName: string, primaryTemperament: string) =>
  trackEvent('temperament_pdf_download', { primary: primaryTemperament });

export const trackTemperamentDistribution = (results: {
  temperamentPercentages: Record<string, number>;
}) =>
  trackEvent('temperament_distribution', {
    sanguineo:   results.temperamentPercentages['Sanguineo']   ?? 0,
    colerico:    results.temperamentPercentages['Colerico']    ?? 0,
    melancolico: results.temperamentPercentages['Melancolico'] ?? 0,
    fleumatico:  results.temperamentPercentages['Fleumatico']  ?? 0,
  });

// ─── Teste de Linguagens do Amor ──────────────────────────────────────────────

export const trackLoveLanguageTestStart = () =>
  trackEvent('love_language_started');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trackLoveLanguageTestCompletion = (results: any) => {
  const pct = results.languagePercentages ?? {};
  trackEvent('love_language_completed', {
    primary:          results.primary?.name,
    secondary:        results.secondary?.name,
    combined:         !!results.combined,
    afirmacao:        pct['afirmacao'] ?? 0,
    qualidade:        pct['qualidade'] ?? 0,
    presentes:        pct['presentes'] ?? 0,
    servico:          pct['servico']   ?? 0,
    toque:            pct['toque']     ?? 0,
    duration_seconds: results.testDuration,
  });
};

export const trackLoveLanguageQuestionDropout = (questionIndex: number, questionText: string) =>
  trackEvent('love_language_dropout', { question_index: questionIndex, question_text: questionText });

export const trackLoveLanguagePdfDownload = (primaryLanguage: string) =>
  trackEvent('love_language_pdf_download', { primary: primaryLanguage });

// ─── About ────────────────────────────────────────────────────────────────────

export const trackSocialMediaClick = (platform: string) =>
  trackEvent('contact_click', { platform });

// ─── Projects ─────────────────────────────────────────────────────────────────

export const trackProjectClick = (projectName: string) =>
  trackEvent('project_click', { project_name: projectName });

// ─── Apps ─────────────────────────────────────────────────────────────────────

export const trackAppClick = (appId: string, appTitle: string) =>
  trackEvent('app_click', { app_id: appId, app_title: appTitle });

// ─── CV ───────────────────────────────────────────────────────────────────────

export const trackCvDownload = () => trackEvent('cv_download');

// ─── Casamento ────────────────────────────────────────────────────────────────

export const trackCasamentoMapsClick = () =>
  trackEvent('casamento_maps_click');

export const trackCasamentoRsvpWhatsapp = () =>
  trackEvent('casamento_rsvp_whatsapp_click');

// ─── Nuvem de Palavras ──────────────────────────────────────────────────────

export const trackWordSessionCreated = (sessionId: string, mode: 'fixed' | 'open') =>
  trackEvent('word_session_created', { session_id: sessionId, mode });

export const trackWordSessionSubmitted = (sessionId: string, mode: 'fixed' | 'open') =>
  trackEvent('word_session_submitted', { session_id: sessionId, mode });

export const trackWordSessionSaved = (sessionId: string) =>
  trackEvent('word_session_saved', { session_id: sessionId });

export const trackWordSessionDiscarded = (sessionId: string) =>
  trackEvent('word_session_discarded', { session_id: sessionId });

export const trackWordSessionFixedWordAdded = (sessionId: string, count: number) =>
  trackEvent('word_session_fixed_word_added', { session_id: sessionId, count });

// ─── Quiz ao Vivo ───────────────────────────────────────────────────────────

export const trackQuizSessionCreated = (sessionId: string, questionCount: number) =>
  trackEvent('quiz_session_created', { session_id: sessionId, question_count: questionCount });

export const trackQuizSessionJoined = (sessionId: string) =>
  trackEvent('quiz_session_joined', { session_id: sessionId });

export const trackQuizAnswerSubmitted = (sessionId: string) =>
  trackEvent('quiz_answer_submitted', { session_id: sessionId });

export const trackQuizSessionSaved = (sessionId: string) =>
  trackEvent('quiz_session_saved', { session_id: sessionId });

export const trackQuizSessionDiscarded = (sessionId: string) =>
  trackEvent('quiz_session_discarded', { session_id: sessionId });

// ─── Sorteio ──────────────────────────────────────────────────────────────

export const trackSorteioRealizado = (entryCount: number, winnerCount: number) =>
  trackEvent('sorteio_realizado', { entry_count: entryCount, winner_count: winnerCount });

// ─── Livros ───────────────────────────────────────────────────────────────────

export const trackBookOpened = (slug: string) =>
  trackEvent('book_opened', { slug });

export const trackBookFilter = (campo: string, valor: string) =>
  trackEvent('book_filter', { campo, valor });

export const trackRoomLoaded = (timeToInteractiveMs: number, isMobile: boolean) =>
  trackEvent('room_loaded', { time_to_interactive_ms: timeToInteractiveMs, is_mobile: isMobile });

export const trackListFallback = (motivo: string) =>
  trackEvent('list_fallback', { motivo });

export const trackShelfSorted = (criterio: string) =>
  trackEvent('shelf_sorted', { criterio });

export const trackIndexOpened = (categoria: string | null, tag: string | null) =>
  trackEvent('index_opened', { categoria: categoria ?? '', tag: tag ?? '' });

// Os dois cliques que levam para fora do site, pro WhatsApp. Disparados ANTES
// do window.open — depois dele a aba pode já ter perdido o foco.
export const trackBookSuggestion = () =>
  trackEvent('book_suggestion_whatsapp', {});

export const trackBookComment = (slug: string) =>
  trackEvent('book_comment_whatsapp', { slug });

// `metodo` separa a folha de compartilhamento do sistema (celular) do
// copiar-link (desktop) — são gestos diferentes com intenções diferentes.
export const trackBookShared = (slug: string, metodo: 'share' | 'clipboard') =>
  trackEvent('book_shared', { slug, metodo });