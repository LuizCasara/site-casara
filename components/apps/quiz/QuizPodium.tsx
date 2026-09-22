"use client";

import { AnimatePresence, motion } from "framer-motion";

type Entry = { name: string; score: number };

type Props = {
  top3: Entry[];
  /** Quantos lugares já foram revelados, contando 3º → 2º → 1º (0 a 3). */
  revealedPlaces: number;
};

// Ordem visual clássica de pódio: 2º à esquerda, 1º ao centro (mais alto), 3º à direita.
const VISUAL_ORDER = [1, 0, 2];
// Lugar (1º/2º/3º) correspondente a cada posição visual acima, na mesma ordem.
const PLACE_OF_VISUAL = [2, 1, 3];
const HEIGHT = ["h-28", "h-40", "h-20"];
const COLOR = ["bg-slate-300", "bg-yellow-400", "bg-amber-600"];
const MEDAL = ["🥈", "🥇", "🥉"];

export default function QuizPodium({ top3, revealedPlaces }: Props) {
  return (
    <div className="flex items-end justify-center gap-4">
      {VISUAL_ORDER.map((originalIndex, visualIndex) => {
        const entry = top3[originalIndex];
        if (!entry) return <div key={visualIndex} className="w-24" />;
        const place = PLACE_OF_VISUAL[visualIndex];
        const isRevealed = place > 3 - revealedPlaces;
        return (
          <div key={entry.name} className="flex flex-col items-center gap-2 w-24">
            <AnimatePresence mode="wait">
              {isRevealed ? (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, scale: 0.4, y: -12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="text-3xl">{MEDAL[visualIndex]}</div>
                  <div className="text-white font-bold text-sm text-center truncate w-full" title={entry.name}>
                    {entry.name}
                  </div>
                  <div className="text-white/70 text-xs tabular-nums">{entry.score} pts</div>
                </motion.div>
              ) : (
                <motion.div
                  key="hidden"
                  animate={{ opacity: [0.35, 0.8, 0.35] }}
                  transition={{ repeat: Infinity, duration: 1.3 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="text-3xl">❔</div>
                  <div className="text-white/40 text-sm">???</div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className={`w-full rounded-t-lg ${HEIGHT[visualIndex]} ${COLOR[visualIndex]}`} />
          </div>
        );
      })}
    </div>
  );
}
