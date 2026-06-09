/**
 * Catálogo central de eventos de analytics.
 *
 * Captura:
 *  - "middleware"  → inserido automaticamente pelo middleware.ts (server-side, sem interação do usuário)
 *  - "client"      → enviado via trackEvent() em utils/analytics.ts (requer ação do usuário)
 *
 * Todos os eventos client-side chegam com `route` e `resolution` preenchidos automaticamente.
 * Eventos de middleware chegam com `country`, `city` e `browser` preenchidos automaticamente.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EventCapture = 'middleware' | 'client';

export interface EventDef {
  name: string;
  capture: EventCapture;
  description: string;
  payload?: Record<string, string>;
}

// ─── Nomes dos eventos (use sempre estas constantes no código) ────────────────

export const E = {
  // --- Automáticos (middleware) ---
  PAGE_VIEW:                   'page_view',                   // toda rota acessada

  // --- Homepage ---
  QUOTE_CLICK:                 'quote_click',                 // clicou em "gerar citação"
  TIP_CLICK:                   'tip_click',                   // clicou em "receber dica"
  QUICK_ACCESS_CLICK:          'quick_access_click',          // clicou em card de acesso rápido

  // --- Idioma / Tema ---
  LANGUAGE_TOGGLE:             'language_toggle',             // alternância pt/en
  THEME_TOGGLE:                'theme_toggle',                // alternância claro/escuro

  // --- Página de Apps ---
  APP_CLICK:                   'app_click',                   // clicou em um app na listagem

  // --- Teste de Temperamento ---
  TEMPERAMENT_STARTED:         'temperament_started',         // iniciou o teste
  TEMPERAMENT_DROPOUT:         'temperament_dropout',         // abandonou o teste
  TEMPERAMENT_COMPLETED:       'temperament_completed',       // concluiu o teste
  TEMPERAMENT_PDF_DOWNLOAD:    'temperament_pdf_download',    // baixou o PDF de resultado
  TEMPERAMENT_RESULT_SHARE:    'temperament_result_share',    // compartilhou resultado

  // --- Página de Projetos ---
  PROJECT_CLICK:               'project_click',               // clicou em um projeto

  // --- Sobre / Contato ---
  CONTACT_CLICK:               'contact_click',               // clicou em link de contato ou rede social

  // --- Currículo ---
  CV_DOWNLOAD:                 'cv_download',                 // baixou o currículo (PDF)

  // --- Apps específicos ---
  QR_CODE_GENERATED:           'qr_code_generated',           // gerou um QR Code
  CURRENCY_CONVERTED:          'currency_converted',          // usou o conversor de moedas
  BITCOIN_CONVERTED:           'bitcoin_converted',           // usou o conversor de bitcoin
  IMAGE_TO_SVG_CONVERTED:      'image_to_svg_converted',      // converteu imagem para SVG
} as const;

// ─── Documentação completa dos payloads ──────────────────────────────────────

export const EVENT_CATALOG: EventDef[] = [
  {
    name: E.PAGE_VIEW,
    capture: 'middleware',
    description: 'Registrado a cada acesso a uma rota de página.',
    payload: {},
    // campos extras: country, city, browser (preenchidos pelo middleware)
  },
  {
    name: E.QUOTE_CLICK,
    capture: 'client',
    description: 'Usuário clicou no botão de gerar citação na homepage.',
  },
  {
    name: E.TIP_CLICK,
    capture: 'client',
    description: 'Usuário clicou no botão de receber dica na homepage.',
  },
  {
    name: E.QUICK_ACCESS_CLICK,
    capture: 'client',
    description: 'Clique em card de acesso rápido na homepage.',
    payload: { link_name: 'Nome do link clicado (ex: "Projetos", "Apps")' },
  },
  {
    name: E.LANGUAGE_TOGGLE,
    capture: 'client',
    description: 'Usuário alterneu o idioma da interface.',
    payload: { to: '"pt" | "en"' },
  },
  {
    name: E.THEME_TOGGLE,
    capture: 'client',
    description: 'Usuário alterneu entre tema claro e escuro.',
    payload: { to: '"light" | "dark"' },
  },
  {
    name: E.APP_CLICK,
    capture: 'client',
    description: 'Clique em um app na página de listagem /app.',
    payload: {
      app_id:    'Slug do app (ex: "descubra-seu-temperamento")',
      app_title: 'Título legível (ex: "Descubra seu Temperamento")',
    },
  },
  {
    name: E.TEMPERAMENT_STARTED,
    capture: 'client',
    description: 'Usuário iniciou o teste de temperamento (preencheu o nome e clicou em começar).',
  },
  {
    name: E.TEMPERAMENT_DROPOUT,
    capture: 'client',
    description: 'Usuário abandonou o teste antes de finalizar.',
    payload: {
      question_index: 'Índice da última questão exibida (0-based)',
      question_text:  'Texto da última questão exibida',
    },
  },
  {
    name: E.TEMPERAMENT_COMPLETED,
    capture: 'client',
    description: 'Usuário concluiu o teste. Payload contém distribuição completa (sem dados pessoais).',
    payload: {
      primary:          'Temperamento dominante (ex: "Sanguineo")',
      secondary:        'Temperamento secundário (ex: "Colerico")',
      sanguineo:        'Percentual Sanguíneo (0–100)',
      colerico:         'Percentual Colérico (0–100)',
      melancolico:      'Percentual Melancólico (0–100)',
      fleumatico:       'Percentual Fleumático (0–100)',
      duration_seconds: 'Tempo total do teste em segundos',
    },
  },
  {
    name: E.TEMPERAMENT_PDF_DOWNLOAD,
    capture: 'client',
    description: 'Usuário gerou e baixou o PDF do resultado do teste.',
    payload: { primary: 'Temperamento dominante do usuário' },
  },
  {
    name: E.TEMPERAMENT_RESULT_SHARE,
    capture: 'client',
    description: 'Usuário compartilhou o resultado (se implementado).',
    payload: { platform: '"whatsapp" | "copy_link" | "twitter"' },
  },
  {
    name: E.PROJECT_CLICK,
    capture: 'client',
    description: 'Clique em um projeto na página /projects.',
    payload: { project_name: 'Nome do projeto clicado' },
  },
  {
    name: E.CONTACT_CLICK,
    capture: 'client',
    description: 'Clique em qualquer link de contato ou rede social.',
    payload: { platform: '"github" | "linkedin" | "email" | "discord" | "instagram" | "twitter"' },
  },
  {
    name: E.CV_DOWNLOAD,
    capture: 'client',
    description: 'Usuário baixou o currículo em PDF.',
  },
  {
    name: E.QR_CODE_GENERATED,
    capture: 'client',
    description: 'Usuário gerou um QR Code no app correspondente.',
  },
  {
    name: E.CURRENCY_CONVERTED,
    capture: 'client',
    description: 'Usuário realizou uma conversão de moeda.',
    payload: { from: 'Moeda de origem', to: 'Moeda de destino' },
  },
  {
    name: E.BITCOIN_CONVERTED,
    capture: 'client',
    description: 'Usuário realizou uma conversão de Bitcoin.',
    payload: { to: 'Moeda de destino (ex: "BRL", "USD")' },
  },
  {
    name: E.IMAGE_TO_SVG_CONVERTED,
    capture: 'client',
    description: 'Usuário converteu uma imagem para SVG.',
  },
];