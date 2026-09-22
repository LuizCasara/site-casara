"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { HOT_ACCENT_RGB, rgbToCss, type WordCount } from "@/lib/word-cloud";

const TOP_N = 20;
const BAR_COLOR = rgbToCss(HOT_ACCENT_RGB); // mesmo tom "quente" do modo Texto
const OTHERS_COLOR = "#64748B"; // slate-500, neutro pra marcar que é um agregado, não uma palavra

type Props = {
  words: WordCount[];
};

type BarDatum = {
  key: string;
  label: string;
  count: number;
  isOthers: boolean;
};

export default function WordBarChart({ words }: Props) {
  const bars = useMemo<BarDatum[]>(() => {
    const sorted = [...words].sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);

    const result: BarDatum[] = top.map((w) => ({
      key: w.word.toLowerCase(),
      label: w.word,
      count: w.count,
      isOthers: false,
    }));

    if (rest.length > 0) {
      const othersTotal = rest.reduce((sum, w) => sum + w.count, 0);
      result.push({
        key: "__others__",
        label: `Outros (${rest.length} palavras)`,
        count: othersTotal,
        isOthers: true,
      });
    }

    return result;
  }, [words]);

  const maxCount = bars.length > 0 ? Math.max(...bars.map((b) => b.count)) : 0;

  if (bars.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-white/50 text-lg">
        Aguardando as primeiras respostas...
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-2 space-y-2.5">
        {bars.map((bar) => {
          const pct = maxCount > 0 ? (bar.count / maxCount) * 100 : 0;
          return (
            <div
              key={bar.key}
              className="grid grid-cols-[6rem_1fr_2.5rem] sm:grid-cols-[11rem_1fr_3rem] items-center gap-2 sm:gap-3"
            >
              <div
                className={`text-right text-sm sm:text-base font-semibold truncate ${
                  bar.isOthers ? "text-white/50 italic" : "text-white/90"
                }`}
                title={bar.label}
              >
                {bar.label}
              </div>
              <div className="relative h-6 rounded-r-[4px] bg-white/5">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-r-[4px]"
                  style={{ backgroundColor: bar.isOthers ? OTHERS_COLOR : BAR_COLOR }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 22 }}
                />
              </div>
              <div className="text-sm sm:text-base font-bold text-white/80 tabular-nums">{bar.count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
