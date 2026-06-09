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