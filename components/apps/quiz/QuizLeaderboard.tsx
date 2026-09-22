"use client";

type Entry = { name: string; score: number };

type Props = {
  entries: Entry[];
  highlightTop?: boolean;
};

/** Lista ordenada com barra de progresso — mesma convenção já usada pelos
 * resultados do teste de temperamento (apps/desenvolvimento-pessoal), só que
 * pra pontuação absoluta em vez de porcentagem. */
export default function QuizLeaderboard({ entries, highlightTop = true }: Props) {
  const maxScore = entries.length > 0 ? Math.max(...entries.map((e) => e.score), 1) : 1;

  if (entries.length === 0) {
    return <p className="text-white/50 text-center py-8">Ninguém entrou ainda.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => {
        const pct = (entry.score / maxScore) * 100;
        const isTop = highlightTop && i === 0;
        return (
          <div key={`${entry.name}-${i}`} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className={`font-semibold ${isTop ? "text-emerald-400" : "text-white/90"}`}>
                {i + 1}. {entry.name}
              </span>
              <span className={`font-bold tabular-nums ${isTop ? "text-emerald-400" : "text-white/70"}`}>
                {entry.score} pts
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isTop ? "bg-emerald-400" : "bg-white/40"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
