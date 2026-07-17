"use client";

import { useEffect, useRef, useState } from "react";
import { playSound } from "@/lib/sound";

type Props = {
  startedAt: string;
  timeLimitSeconds: number;
  offsetMs: number;
  /** Toca tic-tac a cada segundo e um alarme no estouro do tempo — só a
   * tela de resultados (telão) usa isso; a tela do participante fica muda. */
  playSound?: boolean;
};

const TICK_MS = 150;
const SIZE = 72;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Anel de urgência sincronizado com o relógio do servidor (deadline vem de
 * `startedAt + timeLimitSeconds`, `offsetMs` corrige o relógio local errado
 * do dispositivo). Puramente visual — quem trava a resposta é sempre o
 * `phase` retornado pela API, nunca esse componente. */
export default function QuizCountdown({ startedAt, timeLimitSeconds, offsetMs, playSound: soundEnabled }: Props) {
  const deadline = new Date(startedAt).getTime() + timeLimitSeconds * 1000;
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, deadline - (Date.now() + offsetMs))
  );
  const lastSecondRef = useRef<number | null>(null);
  const alarmPlayedRef = useRef(false);

  useEffect(() => {
    lastSecondRef.current = null;
    alarmPlayedRef.current = false;
  }, [deadline]);

  useEffect(() => {
    function tick() {
      const ms = Math.max(0, deadline - (Date.now() + offsetMs));
      setRemainingMs(ms);
      if (!soundEnabled) return;
      const seconds = Math.ceil(ms / 1000);
      if (ms > 0 && seconds !== lastSecondRef.current) {
        lastSecondRef.current = seconds;
        playSound("tick");
      } else if (ms === 0 && !alarmPlayedRef.current) {
        alarmPlayedRef.current = true;
        playSound("alarm");
      }
    }
    tick();
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [deadline, offsetMs, soundEnabled]);

  const pct = Math.max(0, Math.min(1, remainingMs / (timeLimitSeconds * 1000)));
  const dashOffset = CIRCUMFERENCE * (1 - pct);
  const seconds = Math.ceil(remainingMs / 1000);
  const color = pct > 0.5 ? "#10B981" : pct > 0.2 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={STROKE}
          fill="none"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: `stroke-dashoffset ${TICK_MS}ms linear, stroke 300ms ease` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl tabular-nums">
        {seconds}
      </div>
    </div>
  );
}
