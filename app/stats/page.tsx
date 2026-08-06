"use client";

import {useEffect, useState} from "react";
import {trackStatsPeriodChanged} from "@/utils/analytics";

type StatsData = {
  overview: { total_events: number; total_page_views: number; unique_routes: number };
  by_event:   { event_name: string; count: number }[];
  by_route:   { route: string;      count: number }[];
  by_browser: { browser: string;    count: number }[];
  by_country: { country: string;    count: number }[];
  timeline:   { day: string;        count: number }[];
  temperament: {
    total_started:        number;
    total_completed:      number;
    avg_sanguineo:        number;
    avg_colerico:         number;
    avg_melancolico:      number;
    avg_fleumatico:       number;
    avg_duration_seconds: number;
    by_primary: { temperament: string; count: number }[];
  };
  love_languages: {
    total_started:        number;
    total_completed:      number;
    combined_rate:        number;
    avg_afirmacao:        number;
    avg_qualidade:        number;
    avg_presentes:        number;
    avg_servico:          number;
    avg_toque:            number;
    avg_duration_seconds: number;
    by_primary: { language: string; count: number }[];
  };
};

type Period = "7d" | "30d" | "all";

type GeoBreakdown = {
  total:      number;
  by_country: { country: string; count: number }[];
};

const EVENT_LABELS: Record<string, string> = {
  temperament_started:          "TEMP_STARTED",
  temperament_completed:        "TEMP_COMPLETED",
  temperament_dropout:          "TEMP_DROPOUT",
  temperament_pdf_download:     "TEMP_PDF_DL",
  temperament_distribution:     "TEMP_DIST",
  love_language_started:        "LOVELANG_STARTED",
  love_language_completed:      "LOVELANG_COMPLETED",
  love_language_dropout:        "LOVELANG_DROPOUT",
  love_language_pdf_download:   "LOVELANG_PDF_DL",
  home_time_spent:              "HOME_TIME_SPENT",
  quote_click:                  "QUOTE_CLICK",
  tip_click:                    "TIP_CLICK",
  quick_access_click:           "QUICK_ACCESS",
  contact_click:                "CONTACT_CLICK",
  project_click:                "PROJECT_CLICK",
  app_click:                    "APP_CLICK",
  cv_download:                  "CV_DOWNLOAD",
  casamento_maps_click:         "WEDDING_MAP",
  casamento_rsvp_whatsapp_click:"WEDDING_RSVP",
  word_session_created:         "WORD_SESSION_NEW",
  word_session_submitted:       "WORD_SUBMIT",
  word_session_saved:           "WORD_SAVED",
  word_session_discarded:       "WORD_DISCARDED",
  word_session_fixed_word_added:"WORD_FIXED_ADD",
  quiz_session_created:         "QUIZ_SESSION_NEW",
  quiz_session_joined:          "QUIZ_JOIN",
  quiz_answer_submitted:        "QUIZ_ANSWER",
  quiz_session_saved:           "QUIZ_SAVED",
  quiz_session_discarded:       "QUIZ_DISCARDED",
  sorteio_realizado:            "SORTEIO_RUN",
  nav_click:                    "NAV_CLICK",
  mobile_menu_opened:           "MOBILE_MENU",
  language_toggled:             "LANG_TOGGLE",
  outbound_click:               "OUTBOUND",
  app_action:                   "APP_ACTION",
  app_output:                   "APP_OUTPUT",
  stats_period_changed:         "STATS_PERIOD",
  room_loaded:                  "ROOM_LOADED",
  list_fallback:                "ROOM_FALLBACK",
  room_scene_changed:           "ROOM_SCENE",
  room_object_click:            "ROOM_OBJECT",
  shelf_year_focused:           "SHELF_YEAR",
  shelf_sorted:                 "SHELF_SORT",
  index_opened:                 "BOOK_INDEX",
  book_filter:                  "BOOK_FILTER",
  book_opened:                  "BOOK_OPENED",
  book_closed:                  "BOOK_CLOSED",
  book_paged:                   "BOOK_PAGED",
  book_card_click:              "BOOK_CARD",
  book_tag_click:               "BOOK_TAG",
  book_back_to_list:            "BOOK_BACK",
  book_back_to_room:            "BOOK_TO_ROOM",
  book_shared:                  "BOOK_SHARED",
  book_comment_whatsapp:        "BOOK_COMMENT",
  book_suggestion_whatsapp:     "BOOK_SUGGEST",
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  temperament_started:          "Começou o teste de temperamento",
  temperament_completed:        "Terminou o teste e viu o resultado",
  temperament_dropout:          "Saiu no meio do teste",
  temperament_pdf_download:     "Baixou o PDF do resultado",
  temperament_distribution:     "Percentuais calculados ao final do teste",
  love_language_started:        "Começou o teste de linguagens do amor",
  love_language_completed:      "Terminou o teste e viu o resultado",
  love_language_dropout:        "Saiu no meio do teste",
  love_language_pdf_download:   "Baixou o PDF do resultado",
  home_time_spent:              "Tempo total na home antes de sair",
  quote_click:                  "Gerou uma nova frase na home",
  tip_click:                    "Gerou uma nova dica na home",
  quick_access_click:           "Clicou num card de acesso rápido",
  contact_click:                "Clicou num link de contato/rede social",
  project_click:                "Abriu um projeto do portfólio",
  app_click:                    "Abriu um mini-app a partir da listagem",
  cv_download:                  "Baixou o currículo em PDF",
  casamento_maps_click:         "Abriu o mapa do local do casamento",
  casamento_rsvp_whatsapp_click:"Confirmou presença pelo WhatsApp",
  word_session_created:         "Host criou uma sessão de Nuvem de Palavras",
  word_session_submitted:       "Participante enviou palavra(s)",
  word_session_saved:           "Host salvou a sessão encerrada",
  word_session_discarded:       "Host descartou a sessão encerrada",
  word_session_fixed_word_added:"Host adicionou palavra ao banco fixo",
  quiz_session_created:         "Host criou uma sessão de Quiz ao Vivo",
  quiz_session_joined:          "Participante entrou na sala do quiz",
  quiz_answer_submitted:        "Participante respondeu uma pergunta",
  quiz_session_saved:           "Host salvou o quiz encerrado",
  quiz_session_discarded:       "Host descartou o quiz encerrado",
  sorteio_realizado:            "Sorteio de nomes foi executado",
  nav_click:                    "Clicou num link do menu",
  mobile_menu_opened:           "Abriu o menu no celular",
  language_toggled:             "Trocou o idioma do site",
  outbound_click:               "Clicou num link que sai do site",
  app_action:                   "Usou um mini-app depois de abri-lo",
  app_output:                   "Baixou ou copiou o resultado de um mini-app",
  stats_period_changed:         "Trocou o período deste painel",
  room_loaded:                  "A sala 3D ficou pronta para uso",
  list_fallback:                "Caiu na lista em HTML por não rodar a sala",
  room_scene_changed:           "Andou entre as cenas da sala (botão, seta ou scroll)",
  room_object_click:            "Clicou num objeto da sala (retrato, monitor, bíblia)",
  shelf_year_focused:           "Deu zoom num ano da estante",
  shelf_sorted:                 "Reordenou a estante",
  index_opened:                 "Abriu o Índice pela lava lamp",
  book_filter:                  "Filtrou o acervo por categoria ou tag",
  book_opened:                  "Abriu a ficha de um livro",
  book_closed:                  "Fechou a ficha do livro",
  book_paged:                   "Folheou para o livro vizinho",
  book_card_click:              "Abriu um livro pela grade da listagem",
  book_tag_click:               "Seguiu uma tag a partir da página do livro",
  book_back_to_list:            "Voltou do livro para a listagem",
  book_back_to_room:            "Voltou do livro para a sala 3D",
  book_shared:                  "Compartilhou o link de um livro",
  book_comment_whatsapp:        "Foi comentar sobre um livro pelo WhatsApp",
  book_suggestion_whatsapp:     "Foi sugerir um livro pelo WhatsApp",
};

const TEMP_DISPLAY: Record<string, string> = {
  Sanguineo:   "SANGUÍNEO",
  Colerico:    "COLÉRICO",
  Melancolico: "MELANCÓLICO",
  Fleumatico:  "FLEUMÁTICO",
};

const TEMP_BAR_COLOR: Record<string, string> = {
  Sanguineo:   "bg-red-500",
  Colerico:    "bg-yellow-400",
  Melancolico: "bg-blue-500",
  Fleumatico:  "bg-green-500",
};

const TEMP_TEXT_COLOR: Record<string, string> = {
  Sanguineo:   "text-red-400",
  Colerico:    "text-yellow-400",
  Melancolico: "text-blue-400",
  Fleumatico:  "text-green-400",
};

const LOVE_LANG_DISPLAY: Record<string, string> = {
  afirmacao: "PALAVRAS DE AFIRMAÇÃO",
  qualidade: "TEMPO DE QUALIDADE",
  presentes: "PRESENTES",
  servico:   "ATOS DE SERVIÇO",
  toque:     "TOQUE FÍSICO",
};

const LOVE_LANG_BAR_COLOR: Record<string, string> = {
  afirmacao: "bg-indigo-500",
  qualidade: "bg-teal-400",
  presentes: "bg-pink-500",
  servico:   "bg-orange-400",
  toque:     "bg-rose-500",
};

const LOVE_LANG_TEXT_COLOR: Record<string, string> = {
  afirmacao: "text-indigo-400",
  qualidade: "text-teal-400",
  presentes: "text-pink-400",
  servico:   "text-orange-400",
  toque:     "text-rose-400",
};

const regionNames = typeof Intl !== "undefined" && "DisplayNames" in Intl
  ? new Intl.DisplayNames(["pt-BR"], { type: "region" })
  : null;

function countryLabel(code: string): string {
  if (!code) return code;
  try {
    const name = regionNames?.of(code.toUpperCase());
    return name && name !== code.toUpperCase() ? `${code} - ${name}` : code;
  } catch {
    return code;
  }
}

function HBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1 bg-green-950 rounded-full overflow-hidden">
      <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

function GeoBreakdownInline({ data, loading }: { data: GeoBreakdown | undefined; loading: boolean }) {
  if (loading) {
    return <p className="text-green-900 text-[10px] pl-4 py-1.5">CARREGANDO_GEO<span className="animate-pulse">...</span></p>;
  }
  if (!data) return null;
  if (data.by_country.length === 0) {
    return <p className="text-green-900 text-[10px] pl-4 py-1.5">SEM_DADOS_DE_GEO</p>;
  }
  const max = Math.max(...data.by_country.map(c => c.count), 1);
  return (
    <div className="pl-3 ml-1 mt-1.5 mb-2 border-l border-green-900/50 space-y-1.5">
      {data.by_country.map(c => (
        <div key={c.country} className="pl-2">
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-green-600">{countryLabel(c.country)}</span>
            <span className="text-green-800">{c.count}</span>
          </div>
          <HBar value={c.count} max={max} />
        </div>
      ))}
    </div>
  );
}

function TimelineChart({ data }: { data: { day: string; count: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length < 2) return <p className="text-green-900 text-xs">NO_DATA</p>;

  const W = 800;
  const H = 64;
  const PAD = 4;
  const max = Math.max(...data.map(d => d.count), 1);

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (d.count / max) * (H - PAD * 2);
    return [x, y] as [number, number];
  });

  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = [`${PAD},${H}`, ...pts.map(([x, y]) => `${x},${y}`), `${W - PAD},${H}`].join(" ");

  const fmtDay = (day: string) => {
    const [, m, d] = day.split("-");
    return `${d}/${m}`;
  };

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-1 px-1 h-4">
        <span className="text-green-500">
          {hovered !== null ? `${fmtDay(data[hovered].day)}` : ""}
        </span>
        <span className="text-green-300 font-bold">
          {hovered !== null ? `${data[hovered].count} eventos` : ""}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="tl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4ade80" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#tl)" />
        <polyline points={line} fill="none" stroke="#4ade80" strokeWidth="1.5" />
        {hovered !== null && (
          <line x1={pts[hovered][0]} y1={0} x2={pts[hovered][0]} y2={H} stroke="#4ade80" strokeOpacity={0.25} strokeWidth={1} />
        )}
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={hovered === i ? 3.5 : 2} fill="#4ade80" />
        ))}
        {/* Área de toque maior e invisível por ponto, só pra facilitar o hover */}
        {pts.map(([x, y], i) => (
          <circle
            key={`hit-${i}`}
            cx={x}
            cy={y}
            r={10}
            fill="transparent"
            style={{ pointerEvents: "all" }}
            onMouseEnter={() => setHovered(i)}
          />
        ))}
      </svg>
      <div className="flex justify-between text-green-900 text-xs mt-1 px-1">
        {data
          .filter((_, i) => i === 0 || i === data.length - 1 || i % 7 === 0)
          .map(d => <span key={d.day}>{d.day.slice(5)}</span>)}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-green-900 rounded bg-green-950/10 p-4 flex flex-col gap-4">
      <p className="text-green-700 text-xs tracking-widest uppercase">
        <span className="text-green-600 mr-1">&gt;</span>{title}
      </p>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-green-900 rounded bg-green-950/10 p-4">
      <p className="text-green-700 text-xs tracking-widest mb-2">{label}</p>
      <p className="text-green-200 text-3xl font-bold leading-none">{value}</p>
      {sub && <p className="text-green-800 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function StatsPage() {
  const [data, setData]       = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<Period>("all");
  const [clock, setClock]     = useState("");

  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [geoCache, setGeoCache]     = useState<Record<string, GeoBreakdown>>({});
  const [geoLoading, setGeoLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/metrics/stats?period=${period}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));

    // Breakdowns de geo são por período — descarta o que já foi expandido/cacheado.
    setExpandedRoute(null);
    setExpandedEvent(null);
    setGeoCache({});
    setGeoLoading({});
  }, [period]);

  async function fetchGeo(key: string, params: string) {
    if (geoCache[key] || geoLoading[key]) return;
    setGeoLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res  = await fetch(`/api/metrics/geo-breakdown?${params}&period=${period}`);
      const json = await res.json();
      setGeoCache(prev => ({ ...prev, [key]: json }));
    } catch {
      // silencioso — o painel simplesmente não expande
    } finally {
      setGeoLoading(prev => ({ ...prev, [key]: false }));
    }
  }

  function toggleRouteGeo(route: string) {
    if (expandedRoute === route) { setExpandedRoute(null); return; }
    setExpandedRoute(route);
    fetchGeo(`route:${route}`, `route=${encodeURIComponent(route)}`);
  }

  function toggleEventGeo(eventName: string) {
    if (expandedEvent === eventName) { setExpandedEvent(null); return; }
    setExpandedEvent(eventName);
    fetchGeo(`event:${eventName}`, `event_name=${encodeURIComponent(eventName)}`);
  }

  const maxEvent   = data ? Math.max(...data.by_event.map(e => e.count),   1) : 1;
  const maxRoute   = data ? Math.max(...data.by_route.map(r => r.count),   1) : 1;
  const maxBrowser = data ? Math.max(...data.by_browser.map(b => b.count), 1) : 1;
  const maxCountry = data ? Math.max(...data.by_country.map(c => c.count), 1) : 1;

  const convRate = data && data.temperament.total_started > 0
    ? Math.round((data.temperament.total_completed / data.temperament.total_started) * 100)
    : 0;

  const llConvRate = data && data.love_languages.total_started > 0
    ? Math.round((data.love_languages.total_completed / data.love_languages.total_started) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4 md:p-6 selection:bg-green-900">
      {/* Scanlines */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
        style={{ background: "repeating-linear-gradient(0deg,#000 0px,#000 1px,transparent 1px,transparent 2px)" }}
      />

      {/* Terminal header */}
      <div className="border border-green-900 rounded mb-6 overflow-hidden shadow-[0_0_30px_rgba(0,255,80,0.05)]">
        <div className="bg-green-950/30 px-4 py-2 flex items-center justify-between border-b border-green-900/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-900/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-900/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-800/60" />
          </div>
          <span className="text-green-800 text-xs">luiz@portfolio:~/stats</span>
          <span className="text-green-800 text-xs tabular-nums">{clock}</span>
        </div>

        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-green-600 text-sm">$</span>
              <span className="text-green-200 font-bold tracking-widest text-lg">SYSTEM_ANALYTICS</span>
              <span className="text-green-400 animate-pulse text-lg leading-none">▮</span>
            </div>
            <p className="text-green-800 text-xs mt-1">
                {'// dados de interação · luiz.dev · todos os eventos em tempo real'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-green-900 text-xs mr-1">PERÍODO:</span>
            {(["7d", "30d", "all"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => {
                  if (p !== period) trackStatsPeriodChanged(p);
                  setPeriod(p);
                }}
                className={`px-3 py-1 text-xs border rounded transition-all ${
                  period === p
                    ? "border-green-400 text-green-300 bg-green-950/60 shadow-[0_0_8px_rgba(74,222,128,0.2)]"
                    : "border-green-900 text-green-800 hover:border-green-700 hover:text-green-600"
                }`}
              >
                {p === "all" ? "TOTAL" : p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-green-800">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-1 bg-green-700 rounded-full animate-pulse"
                style={{ height: `${12 + i * 6}px`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <p className="text-xs tracking-widest">FETCHING_DATA<span className="animate-pulse">...</span></p>
        </div>
      ) : !data ? (
        <div className="text-red-500 text-sm border border-red-900 rounded p-4">
          <span className="text-red-700">ERR:</span> FAILED_TO_FETCH_STATS
        </div>
      ) : (
        <div className="space-y-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="TOTAL_EVENTOS"    value={data.overview.total_events.toLocaleString("pt-BR")} />
            <KpiCard label="PAGE_VIEWS"       value={data.overview.total_page_views.toLocaleString("pt-BR")} />
            <KpiCard label="ROTAS_ÚNICAS"     value={data.overview.unique_routes} />
            <KpiCard
              label="TEMP_COMPLETOS"
              value={data.temperament.total_completed.toLocaleString("pt-BR")}
              sub={`${convRate}% conversão · ${data.temperament.total_started} iniciaram`}
            />
            <KpiCard
              label="LOVELANG_COMPLETOS"
              value={data.love_languages.total_completed.toLocaleString("pt-BR")}
              sub={`${llConvRate}% conversão · ${data.love_languages.total_started} iniciaram`}
            />
          </div>

          {/* Temperamento + Linguagens do Amor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <Panel title="TEMPERAMENTO_ANALYSIS">
              {/* Mini KPIs */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "INICIARAM",    value: data.temperament.total_started },
                  { label: "COMPLETARAM",  value: data.temperament.total_completed },
                  { label: "CONVERSÃO",    value: `${convRate}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="border border-green-900/50 rounded p-2">
                    <p className="text-green-800 text-xs">{label}</p>
                    <p className="text-green-200 font-bold text-xl">{value}</p>
                  </div>
                ))}
              </div>

              {/* Distribuição por primário */}
              <div className="space-y-3">
                {data.temperament.by_primary.filter(t => t.temperament).map(t => {
                  const pct = Math.round((t.count / data.temperament.total_completed) * 100);
                  return (
                    <div key={t.temperament}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={TEMP_TEXT_COLOR[t.temperament] ?? "text-green-400"}>
                          {TEMP_DISPLAY[t.temperament] ?? t.temperament}
                        </span>
                        <span className="text-green-800">{t.count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-green-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${TEMP_BAR_COLOR[t.temperament] ?? "bg-green-500"} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Médias */}
              <div className="border-t border-green-900/50 pt-3">
                <p className="text-green-800 text-xs mb-2 tracking-wider">MÉDIAS_GERAIS</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { key: "SANG",  val: data.temperament.avg_sanguineo,   color: "text-red-400" },
                    { key: "COL",   val: data.temperament.avg_colerico,     color: "text-yellow-400" },
                    { key: "MEL",   val: data.temperament.avg_melancolico,  color: "text-blue-400" },
                    { key: "FLEU",  val: data.temperament.avg_fleumatico,   color: "text-green-400" },
                  ].map(({ key, val, color }) => (
                    <div key={key} className="border border-green-900/50 rounded py-1.5">
                      <p className="text-green-900 text-xs">{key}</p>
                      <p className={`font-bold text-sm ${color}`}>{val}%</p>
                    </div>
                  ))}
                </div>
                {data.temperament.avg_duration_seconds > 0 && (
                  <p className="text-green-800 text-xs mt-2 text-center">
                    T_MÉDIO_CONCLUSÃO:{" "}
                    <span className="text-green-500">
                      ~{Math.round(data.temperament.avg_duration_seconds / 60)} min
                    </span>
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="LINGUAGENS_DO_AMOR_ANALYSIS">
              {/* Mini KPIs */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "INICIARAM",    value: data.love_languages.total_started },
                  { label: "COMPLETARAM",  value: data.love_languages.total_completed },
                  { label: "CONVERSÃO",    value: `${llConvRate}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="border border-green-900/50 rounded p-2">
                    <p className="text-green-800 text-xs">{label}</p>
                    <p className="text-green-200 font-bold text-xl">{value}</p>
                  </div>
                ))}
              </div>

              {/* Distribuição por linguagem principal */}
              <div className="space-y-3">
                {data.love_languages.by_primary.filter(l => l.language).map(l => {
                  const pct = Math.round((l.count / data.love_languages.total_completed) * 100);
                  return (
                    <div key={l.language}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={LOVE_LANG_TEXT_COLOR[l.language] ?? "text-green-400"}>
                          {LOVE_LANG_DISPLAY[l.language] ?? l.language}
                        </span>
                        <span className="text-green-800">{l.count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-green-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${LOVE_LANG_BAR_COLOR[l.language] ?? "bg-green-500"} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Médias */}
              <div className="border-t border-green-900/50 pt-3">
                <p className="text-green-800 text-xs mb-2 tracking-wider">MÉDIAS_GERAIS · {data.love_languages.combined_rate}% RESULTADO_COMBINADO</p>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { key: "AFIRM", val: data.love_languages.avg_afirmacao, color: "text-indigo-400" },
                    { key: "QUALI", val: data.love_languages.avg_qualidade, color: "text-teal-400" },
                    { key: "PRES",  val: data.love_languages.avg_presentes, color: "text-pink-400" },
                    { key: "SERV",  val: data.love_languages.avg_servico,   color: "text-orange-400" },
                    { key: "TOQUE", val: data.love_languages.avg_toque,     color: "text-rose-400" },
                  ].map(({ key, val, color }) => (
                    <div key={key} className="border border-green-900/50 rounded py-1.5">
                      <p className="text-green-900 text-xs">{key}</p>
                      <p className={`font-bold text-sm ${color}`}>{val}%</p>
                    </div>
                  ))}
                </div>
                {data.love_languages.avg_duration_seconds > 0 && (
                  <p className="text-green-800 text-xs mt-2 text-center">
                    T_MÉDIO_CONCLUSÃO:{" "}
                    <span className="text-green-500">
                      ~{Math.round(data.love_languages.avg_duration_seconds / 60)} min
                    </span>
                  </p>
                )}
              </div>
            </Panel>

          </div>

          {/* Eventos */}
          <Panel title="EVENTOS_BREAKDOWN">
            <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
              {data.by_event.map(e => (
                <div key={e.event_name}>
                  <button
                    type="button"
                    onClick={() => toggleEventGeo(e.event_name)}
                    className="w-full text-left bg-transparent border-0 p-0 m-0 cursor-pointer"
                  >
                    <div className="flex justify-between items-baseline gap-2 text-xs mb-1">
                      <span className="text-green-500 truncate shrink-0 flex items-center gap-1">
                        <span className={`text-green-800 inline-block transition-transform ${expandedEvent === e.event_name ? "rotate-90" : ""}`}>›</span>
                        {EVENT_LABELS[e.event_name] ?? e.event_name}
                      </span>
                      <span className="text-green-900 truncate italic">
                        {EVENT_DESCRIPTIONS[e.event_name] ?? ""}
                      </span>
                      <span className="text-green-800 ml-2 shrink-0">{e.count}</span>
                    </div>
                    <HBar value={e.count} max={maxEvent} />
                  </button>
                  {expandedEvent === e.event_name && (
                    <GeoBreakdownInline
                      data={geoCache[`event:${e.event_name}`]}
                      loading={!!geoLoading[`event:${e.event_name}`]}
                    />
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {/* Rotas + Geo/Browser */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <Panel title="TOP_ROTAS">
              <div className="space-y-3">
                {data.by_route.map(r => (
                  <div key={r.route}>
                    <button
                      type="button"
                      onClick={() => toggleRouteGeo(r.route)}
                      className="w-full text-left bg-transparent border-0 p-0 m-0 cursor-pointer"
                    >
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-green-500 truncate max-w-[75%] flex items-center gap-1">
                          <span className={`text-green-800 inline-block transition-transform ${expandedRoute === r.route ? "rotate-90" : ""}`}>›</span>
                          {r.route || "/"}
                        </span>
                        <span className="text-green-800">{r.count}</span>
                      </div>
                      <HBar value={r.count} max={maxRoute} />
                    </button>
                    {expandedRoute === r.route && (
                      <GeoBreakdownInline
                        data={geoCache[`route:${r.route}`]}
                        loading={!!geoLoading[`route:${r.route}`]}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            <div className="flex flex-col gap-4">
              <Panel title="GEO_ORIGEM">
                <div className="space-y-3">
                  {data.by_country.length > 0 ? data.by_country.map(c => (
                    <div key={c.country}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-green-500">{countryLabel(c.country)}</span>
                        <span className="text-green-800">{c.count}</span>
                      </div>
                      <HBar value={c.count} max={maxCountry} />
                    </div>
                  )) : (
                    <p className="text-green-900 text-xs">NO_GEO_DATA · middleware needed</p>
                  )}
                </div>
              </Panel>

              <Panel title="BROWSERS">
                <div className="space-y-3">
                  {data.by_browser.length > 0 ? data.by_browser.map(b => (
                    <div key={b.browser}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-green-500">{b.browser.split(" ")[0]}</span>
                        <span className="text-green-800">{b.count}</span>
                      </div>
                      <HBar value={b.count} max={maxBrowser} />
                    </div>
                  )) : (
                    <p className="text-green-900 text-xs">NO_BROWSER_DATA</p>
                  )}
                </div>
              </Panel>
            </div>

          </div>

          {/* Timeline */}
          {data.timeline.length > 0 && (
            <Panel title="TIMELINE_30D · eventos por dia">
              <TimelineChart data={data.timeline} />
            </Panel>
          )}

          {/* Footer */}
          <div className="text-center text-green-900 text-xs py-2 tracking-widest">
              {'// END_OF_REPORT · luiz.dev · '}{new Date().getFullYear()}{' · v1.0'}
          </div>

        </div>
      )}
    </div>
  );
}
