import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nuvem de Palavras",
  description: "Participe de uma dinâmica ao vivo.",
  robots: { index: false, follow: false },
};

export default function WordSessionLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950">{children}</div>;
}
