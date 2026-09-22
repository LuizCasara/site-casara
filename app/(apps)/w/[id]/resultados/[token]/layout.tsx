import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resultados — Nuvem de Palavras",
  robots: { index: false, follow: false },
};

export default function WordSessionResultsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-950">{children}</div>;
}
