import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiz ao Vivo",
  description: "Participe de um quiz ao vivo.",
  robots: { index: false, follow: false },
};

export default function QuizSessionLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950">{children}</div>;
}
