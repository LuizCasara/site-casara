import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resultados — Quiz ao Vivo",
  robots: { index: false, follow: false },
};

export default function QuizResultsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-950">{children}</div>;
}
