"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SORTEIO_LIMITS, parseEntries, drawWinners } from "@/lib/sorteio";
import { trackSorteioRealizado } from "@/utils/analytics";

type DrawRecord = { winners: string[]; timestamp: number };

const SPIN_DURATION_MS = 1100;
const SPIN_TICK_MS = 80;
const REVEAL_PAUSE_MS = 500;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const CONFETTI_COLORS = ["#22c55e", "#eab308", "#3b82f6", "#ec4899", "#f97316"];

function ConfettiBurst({ trigger }: { trigger: number }) {
  const particles = Array.from({ length: 20 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * 360;
        const distance = 70 + Math.random() * 50;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        return (
          <motion.span
            key={`${trigger}-${i}`}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-sm"
            style={{ backgroundColor: color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos((angle * Math.PI) / 180) * distance,
              y: Math.sin((angle * Math.PI) / 180) * distance + 50,
              opacity: 0,
              rotate: 360,
            }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

export default function Sorteio() {
  const [rawEntries, setRawEntries] = useState("");
  const [winnerCount, setWinnerCount] = useState(1);
  const [animated, setAnimated] = useState(true);
  const [excludePastWinners, setExcludePastWinners] = useState(true);
  const [history, setHistory] = useState<DrawRecord[]>([]);
  const [error, setError] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [spinningName, setSpinningName] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [lastDrawAt, setLastDrawAt] = useState(0);

  const entries = parseEntries(rawEntries);
  const pastWinners = new Set(history.flatMap((h) => h.winners));
  const eligiblePool = excludePastWinners ? entries.filter((e) => !pastWinners.has(e)) : entries;

  async function handleDraw() {
    setError("");
    if (entries.length === 0) {
      setError("Cole ao menos um nome/item, separado por vírgula.");
      return;
    }
    if (winnerCount < 1 || winnerCount > SORTEIO_LIMITS.MAX_WINNERS_PER_DRAW) {
      setError(`Escolha entre 1 e ${SORTEIO_LIMITS.MAX_WINNERS_PER_DRAW} vencedores.`);
      return;
    }
    if (winnerCount > eligiblePool.length) {
      setError(
        `Só restam ${eligiblePool.length} pessoa(s)/item(ns) elegível(is) — reduza o número de vencedores` +
          (excludePastWinners ? " ou desligue a exclusão de vencedores anteriores." : ".")
      );
      return;
    }

    const winners = drawWinners(eligiblePool, winnerCount);
    trackSorteioRealizado(entries.length, winnerCount);
    setRevealed([]);

    if (!animated) {
      setLastDrawAt(Date.now());
      setRevealed(winners);
      setHistory((prev) => [{ winners, timestamp: Date.now() }, ...prev]);
      return;
    }

    setSpinning(true);
    let pool = eligiblePool;
    for (const winner of winners) {
      const start = Date.now();
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          setSpinningName(pool[Math.floor(Math.random() * pool.length)]);
          if (Date.now() - start >= SPIN_DURATION_MS) {
            clearInterval(interval);
            resolve();
          }
        }, SPIN_TICK_MS);
      });
      setSpinningName(null);
      setRevealed((prev) => [...prev, winner]);
      pool = pool.filter((p) => p !== winner);
      await sleep(REVEAL_PAUSE_MS);
    }
    setSpinning(false);
    setLastDrawAt(Date.now());
    setHistory((prev) => [{ winners, timestamp: Date.now() }, ...prev]);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Cole uma lista de nomes/itens separados por vírgula, escolha quantos vencedores sortear, e veja o
          resultado — funciona direto nesta tela, sem precisar de link separado pra ninguém.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Lista (separada por vírgula)</label>
          <textarea
            value={rawEntries}
            onChange={(e) => setRawEntries(e.target.value)}
            placeholder="Ex: Ana, Bruno, Carla, Diego"
            className="w-full p-3 text-gray-800 border rounded-md h-24"
          />
          <p className="text-xs text-gray-400 mt-1">
            {entries.length} item(ns) reconhecido(s)
            {excludePastWinners && history.length > 0 && ` · ${eligiblePool.length} elegível(is)`}
          </p>
        </div>

        <div className="flex flex-wrap gap-6 items-start">
          <div>
            <label className="block text-sm font-medium mb-1">Quantos vencedores</label>
            <input
              type="number"
              min={1}
              max={SORTEIO_LIMITS.MAX_WINNERS_PER_DRAW}
              value={winnerCount}
              onChange={(e) => setWinnerCount(Number(e.target.value))}
              className="w-24 p-2 text-gray-800 border rounded-md"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 pt-6">
            <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} />
            Contagem regressiva com animação
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 pt-6">
            <input
              type="checkbox"
              checked={excludePastWinners}
              onChange={(e) => setExcludePastWinners(e.target.checked)}
            />
            Excluir vencedores de sorteios anteriores
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleDraw}
          disabled={spinning}
          className="px-5 py-2.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {spinning ? "Sorteando..." : "Sortear"}
        </button>
      </div>

      {(spinning || revealed.length > 0) && (
        <div className="relative p-6 border rounded-lg text-center space-y-4 overflow-hidden">
          {lastDrawAt > 0 && !spinning && <ConfettiBurst trigger={lastDrawAt} />}
          {spinning && spinningName && (
            <AnimatePresence mode="wait">
              <motion.div
                key={spinningName}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.08 }}
                className="text-2xl font-bold"
              >
                {spinningName}
              </motion.div>
            </AnimatePresence>
          )}
          {revealed.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3">
              {revealed.map((winner, i) => (
                <motion.div
                  key={`${lastDrawAt}-${winner}`}
                  initial={{ opacity: 0, scale: 0.5, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg font-semibold"
                >
                  {winnerCount > 1 ? `${i + 1}º — ` : "🎉 "}
                  {winner}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="pt-6 border-t">
          <h3 className="text-lg font-semibold mb-3">Histórico desta sessão</h3>
          <div className="space-y-2">
            {history.map((record) => (
              <div key={record.timestamp} className="p-3 border rounded-md text-sm">
                <span className="text-gray-400">
                  {new Date(record.timestamp).toLocaleTimeString("pt-BR")} —{" "}
                </span>
                {record.winners.join(", ")}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
