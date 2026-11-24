// Vitrine dos "Experimentos" de /projects — as áreas construídas dentro do
// próprio site, mais o spoiler do próximo app — num bento de blocos coloridos.
// Escolhida em 24/11/2026 entre três propostas (cartões com cena, bento e
// índice editorial); é ela que dá ênfase às áreas desde que o dropdown
// "Projetos" do header saiu.
//
// Sem "use client" de propósito: quem importa é `projects/page.tsx`, que já é
// client (por causa do `useLang`), então os handlers de clique funcionam. Não
// importe isto de um Server Component.

import Link from "next/link";
import type {ReactNode} from "react";
import {FaArrowRight, FaBookOpen, FaBroadcastTower, FaGlobeAmericas, FaThLarge} from "react-icons/fa";
import {trackInternalProjectClick} from "@/lib/global/analytics";

type Lang = "pt" | "en";
type Texto = {pt: string; en: string};

export type ExperimentSlug = "aplicativos" | "livros" | "ingress" | "sintonia";

export type Experimento = {
  slug: ExperimentSlug;
  /** `null` = ainda sem página (spoiler): o bloco não é clicável. */
  href: string | null;
  wip: boolean;
  title: Texto;
  blurb: Texto;
};

const ICONES: Record<ExperimentSlug, ReactNode> = {
  aplicativos: <FaThLarge />,
  livros: <FaBookOpen />,
  ingress: <FaGlobeAmericas />,
  sintonia: <FaBroadcastTower />,
};

// Cada área tem a cor da própria área: verde do site para os apps, madeira da
// sala de leitura, o fundo escuro do /ingress e um violeta novo para o Sintonia.
const FUNDO: Record<ExperimentSlug, string> = {
  aplicativos: "bg-gradient-to-br from-emerald-500 to-teal-700",
  livros: "bg-gradient-to-br from-amber-600 to-orange-900",
  ingress: "bg-gradient-to-br from-[#0b0f14] via-[#0f2a2a] to-[#0b2140]",
  sintonia: "bg-gradient-to-br from-violet-600 to-fuchsia-900",
};

// Livros é o destaque grande, Aplicativos ocupa uma faixa larga, Ingress e
// Sintonia são quadrados. No mobile tudo vira uma coluna.
const TAMANHO: Record<ExperimentSlug, string> = {
  livros: "md:col-span-2 md:row-span-2 min-h-[22rem]",
  aplicativos: "md:col-span-2 min-h-[11rem]",
  ingress: "min-h-[11rem]",
  sintonia: "min-h-[11rem]",
};

// ─── Cenas: mini-ilustrações em CSS ──────────────────────────────────────────

const APP_TILES = ["🧮", "💱", "₿", "🔳", "☁️", "❓", "🎲", "❤️", "📊"];

function AppsScene() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {APP_TILES.map((emoji, i) => (
        <span
          key={emoji}
          style={{transitionDelay: `${i * 25}ms`}}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-base shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-3deg] dark:bg-gray-900/80 dark:ring-white/10"
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

// Lombadas com alturas e cores fixas (não aleatórias: o servidor e o cliente
// precisam desenhar a mesma estante). A 5ª sai da estante no hover.
const LOMBADAS = [
  {h: 78, c: "#7c2d12"}, {h: 92, c: "#b45309"}, {h: 70, c: "#365314"},
  {h: 86, c: "#1e3a8a"}, {h: 96, c: "#9f1239"}, {h: 74, c: "#a16207"},
  {h: 88, c: "#3f3f46"}, {h: 80, c: "#0f766e"}, {h: 94, c: "#c2410c"},
  {h: 72, c: "#581c87"},
];

function BooksScene() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-end gap-[3px]">
        {LOMBADAS.map((l, i) => (
          <span
            key={i}
            style={{height: `${(l.h * 1.5).toFixed(0)}px`, backgroundColor: l.c}}
            className={`w-5 rounded-t-[3px] shadow-sm transition-transform duration-300 ${
              i === 4 ? "group-hover:-translate-y-3" : ""
            }`}
          />
        ))}
      </div>
      <span className="h-2 w-full rounded-sm bg-[#6b4423]" />
    </div>
  );
}

const EQ = [0.6, 0.9, 0.4, 1, 0.7, 0.5, 0.85, 0.35, 0.75, 0.55, 0.95, 0.45];

function SintoniaScene() {
  return (
    <div className="flex h-14 items-center gap-1">
      {EQ.map((d, i) => (
        <span
          key={i}
          style={{height: `${d * 100}%`, animationDelay: `${-i * 0.13}s`}}
          className="w-1.5 origin-center rounded-full bg-white/85 motion-safe:animate-eq"
        />
      ))}
    </div>
  );
}

// Ingress fica sem cena: o bloco é quadrado e pequeno, e ela apertava o texto.
const CENAS: Partial<Record<ExperimentSlug, () => ReactNode>> = {
  aplicativos: AppsScene,
  livros: BooksScene,
  sintonia: SintoniaScene,
};

// ─── Peças comuns ────────────────────────────────────────────────────────────

function WipBadge({label}: {label: string}) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-white/30 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-white/80">
      <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" />
      {label}
    </span>
  );
}

/** Link quando há página; `div` quando é spoiler. */
function BlocoShell({exp, className, children}: {exp: Experimento; className: string; children: ReactNode}) {
  if (!exp.href) {
    return <div className={`group ${className} cursor-default`}>{children}</div>;
  }
  return (
    <Link
      href={exp.href}
      onClick={() => trackInternalProjectClick(exp.slug)}
      className={`group ${className} hover:scale-[1.015]`}
    >
      {children}
    </Link>
  );
}

// ─── Bento ───────────────────────────────────────────────────────────────────

type Props = {items: Experimento[]; lang: Lang; wipLabel: string; openLabel: string};

export function ExperimentBento({items, lang, wipLabel, openLabel}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:grid-rows-2">
      {items.map((exp) => {
        const Cena = CENAS[exp.slug];
        const grande = exp.slug === "livros";
        const larga = exp.slug === "aplicativos";
        return (
          <BlocoShell
            key={exp.slug}
            exp={exp}
            className={`relative flex overflow-hidden rounded-3xl p-5 text-white transition-transform duration-300 ${FUNDO[exp.slug]} ${TAMANHO[exp.slug]} ${
              larga ? "flex-row items-center gap-5" : "flex-col"
            }`}
          >
            {/* Ícone gigante de marca d'água */}
            <span className="pointer-events-none absolute -bottom-6 -right-4 text-[9rem] leading-none text-white/[0.07]">
              {ICONES[exp.slug]}
            </span>

            <div className={`relative flex flex-1 flex-col ${larga ? "order-2" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`font-bold tracking-tight ${grande ? "text-3xl" : "text-xl"}`}>
                  {exp.title[lang]}
                </h3>
                {exp.wip && <WipBadge label={wipLabel} />}
              </div>
              <p className={`mt-2 leading-relaxed text-white/80 ${grande ? "max-w-sm text-base" : "text-sm"}`}>
                {exp.blurb[lang]}
              </p>
              {exp.href && (
                <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold">
                  {openLabel}
                  <FaArrowRight className="transition-transform group-hover:translate-x-1" size={11} />
                </span>
              )}
            </div>

            {Cena && (
              <div
                className={`relative flex items-center ${
                  grande ? "flex-1 justify-center py-6" : larga ? "order-1 shrink-0" : "mt-3"
                }`}
              >
                <Cena />
              </div>
            )}
          </BlocoShell>
        );
      })}
    </div>
  );
}
