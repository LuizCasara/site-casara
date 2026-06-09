"use client";

import {useEffect, useState} from "react";

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
};

type Period = "7d" | "30d" | "all";

const EVENT_LABELS: Record<string, string> = {
  temperament_started:          "TEMP_STARTED",
  temperament_completed:        "TEMP_COMPLETED",
  temperament_dropout:          "TEMP_DROPOUT",
  temperament_pdf_download:     "TEMP_PDF_DL",
  temperament_distribution:     "TEMP_DIST",
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

function HBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1 bg-green-950 rounded-full overflow-hidden">
      <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

function TimelineChart({ data }: { data: { day: string; count: number }[] }) {
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

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4ade80" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#tl)" />
        <polyline points={line} fill="none" stroke="#4ade80" strokeWidth="1.5" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2" fill="#4ade80" />
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
  }, [period]);

  const maxEvent   = data ? Math.max(...data.by_event.map(e => e.count),   1) : 1;
  const maxRoute   = data ? Math.max(...data.by_route.map(r => r.count),   1) : 1;
  const maxBrowser = data ? Math.max(...data.by_browser.map(b => b.count), 1) : 1;
  const maxCountry = data ? Math.max(...data.by_country.map(c => c.count), 1) : 1;

  const convRate = data && data.temperament.total_started > 0
    ? Math.round((data.temperament.total_completed / data.temperament.total_started) * 100)
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
                onClick={() => setPeriod(p)}
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="TOTAL_EVENTOS"    value={data.overview.total_events.toLocaleString("pt-BR")} />
            <KpiCard label="PAGE_VIEWS"       value={data.overview.total_page_views.toLocaleString("pt-BR")} />
            <KpiCard label="ROTAS_ÚNICAS"     value={data.overview.unique_routes} />
            <KpiCard
              label="TEMP_COMPLETOS"
              value={data.temperament.total_completed.toLocaleString("pt-BR")}
              sub={`${convRate}% conversão · ${data.temperament.total_started} iniciaram`}
            />
          </div>

          {/* Temperamento + Eventos */}
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

            <Panel title="EVENTOS_BREAKDOWN">
              <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
                {data.by_event.map(e => (
                  <div key={e.event_name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-500 truncate">
                        {EVENT_LABELS[e.event_name] ?? e.event_name}
                      </span>
                      <span className="text-green-800 ml-2 shrink-0">{e.count}</span>
                    </div>
                    <HBar value={e.count} max={maxEvent} />
                  </div>
                ))}
              </div>
            </Panel>

          </div>

          {/* Rotas + Geo/Browser */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <Panel title="TOP_ROTAS">
              <div className="space-y-3">
                {data.by_route.map(r => (
                  <div key={r.route}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-green-500 truncate max-w-[75%]">{r.route || "/"}</span>
                      <span className="text-green-800">{r.count}</span>
                    </div>
                    <HBar value={r.count} max={maxRoute} />
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
                        <span className="text-green-500">{c.country}</span>
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
