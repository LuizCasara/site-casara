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

// ─── Navegação geral ──────────────────────────────────────────────────────────
//
// O acesso em si já é coberto pelo `page_view` que o middleware.ts grava por
// request. O que está aqui é a INTENÇÃO — por onde a pessoa escolheu andar.

export const trackNavClick = (destino: string, origem: 'header' | 'menu_mobile') =>
  trackEvent('nav_click', { destino, origem });

export const trackMobileMenuOpened = () => trackEvent('mobile_menu_opened');

export const trackLanguageToggled = (para: string) =>
  trackEvent('language_toggled', { para });

/**
 * Todo clique que tira a pessoa do site. Um evento só com `destino`, e não um
 * por link: assim o próximo link externo que aparecer já entra na conta sem
 * precisar de código novo no dashboard.
 */
export const trackOutboundClick = (destino: string) =>
  trackEvent('outbound_click', { destino });

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

/**
 * Uma ação DENTRO de um mini-app — calcular, converter, gerar. Um evento só
 * para os nove apps, com `app_id` distinguindo: nomes separados por app
 * multiplicariam o dashboard por nove para responder a mesma pergunta ("este
 * app é usado depois de aberto, ou só espiado?").
 */
export const trackAppAction = (appId: string, acao: string) =>
  trackEvent('app_action', { app_id: appId, acao });

/** O resultado saiu do app: download, cópia, compartilhamento. */
export const trackAppOutput = (appId: string, formato: string) =>
  trackEvent('app_output', { app_id: appId, formato });

// ─── CV ───────────────────────────────────────────────────────────────────────

export const trackCvDownload = () => trackEvent('cv_download');

// ─── Stats ────────────────────────────────────────────────────────────────────

export const trackStatsPeriodChanged = (periodo: string) =>
  trackEvent('stats_period_changed', { periodo });

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

/**
 * `campo` é 'categoria' ou 'tag'. Disparado pelos dois filtros que existem — o
 * Índice da sala 3D e os chips de `/livros/lista` —, de propósito com o mesmo
 * nome: a pergunta ("o que as pessoas procuram no acervo?") é a mesma nos dois,
 * e `route` já vem no evento para separá-los quando importar.
 *
 * Só a ATIVAÇÃO de um filtro conta. Desmarcar dispara com `valor` vazio, que é
 * o que distingue "procurei ficção" de "desisti do filtro".
 */
export const trackBookFilter = (campo: string, valor: string) =>
  trackEvent('book_filter', { campo, valor });

export const trackBookCardClick = (slug: string, posicao: number) =>
  trackEvent('book_card_click', { slug, posicao });

export const trackBookTagClick = (slug: string, tag: string) =>
  trackEvent('book_tag_click', { slug, tag });

export const trackBookBackToList = (slug: string) =>
  trackEvent('book_back_to_list', { slug });

/**
 * Voltar do livro para a SALA, não para a listagem. Evento separado de
 * propósito: os dois botões ficam lado a lado na página, e qual deles as
 * pessoas escolhem diz se a sala 3D é procurada por quem chega de fora.
 */
export const trackBookBackToRoom = (slug: string) =>
  trackEvent('book_back_to_room', { slug });

/**
 * `origem` responde à pergunta que motivou o trilho único: a roda do mouse
 * está sendo descoberta, ou todo mundo usa os botões?
 */
export const trackRoomSceneChanged = (cena: string, origem: 'botao' | 'seta' | 'scroll') =>
  trackEvent('room_scene_changed', { cena, origem });

export const trackShelfYearFocused = (rotulo: string, indice: number) =>
  trackEvent('shelf_year_focused', { rotulo, indice });

export const trackBookPaged = (de: string, para: string, direcao: 'anterior' | 'proximo') =>
  trackEvent('book_paged', { de, para, direcao });

/** `fora` só existe no modal aberto pela listagem: sobre a sala 3D, clicar fora
 *  do card é girar a câmera, não fechar. */
export const trackBookClosed = (slug: string, via: 'botao' | 'esc' | 'fora') =>
  trackEvent('book_closed', { slug, via });

/**
 * Clique num objeto da sala que não é livro — retrato, monitor, bíblia. Um
 * evento com `objeto`, e não um nome por peça: a sala ganha objeto clicável a
 * cada rodada de layout, e cada um deles viraria uma linha nova no dashboard
 * para responder a mesma pergunta ("no que as pessoas clicam aqui dentro?").
 *
 * `estado` só é preenchido por quem tem mais de um: o monitor, que cicla.
 */
export const trackRoomObjectClick = (objeto: string, estado = '') =>
  trackEvent('room_object_click', { objeto, estado });

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