"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QuizCountdown from "@/components/QuizCountdown";
import QuizLeaderboard from "@/components/QuizLeaderboard";
import QuizPodium from "@/components/QuizPodium";
import {
  clockOffsetMs,
  correctedNow,
  podiumRevealedPlaces,
  podiumFullyRevealed,
  PODIUM_REVEAL_TOTAL_MS,
} from "@/lib/quiz";

const RESULTS_POLL_MS = 2500;

type CurrentQuestion = {
  prompt: string;
  options: string[];
  time_limit_seconds: number | null;
  started_at: string;
  answered_count: number;
  correct_option_index?: number;
  distribution?: Record<string, number>;
};

type GabaritoItem = {
  order_index: number;
  prompt: string;
  options: string[];
  correct_option_index: number;
  total_answers: number;
  correct_answers: number;
};

type ResultsResponse = {
  title: string;
  description: string | null;
  status: "active" | "saved" | "discarded";
  phase: "lobby" | "question" | "reveal" | "finished";
  current_question_index: number | null;
  questions_total: number;
  server_time: string;
  finished_at: string | null;
  leaderboard: { name: string; score: number }[];
  current_question: CurrentQuestion | null;
  gabarito: GabaritoItem[] | null;
};

// Serializa ignorando server_time, que muda em toda resposta e por isso
// nunca deixaria duas leituras "iguais" numa comparação direta.
function stableStringify(data: ResultsResponse): string {
  return JSON.stringify({ ...data, server_time: undefined });
}

export default function QuizResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const token = params.token as string;

  const [data, setData] = useState<ResultsResponse | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offsetMs, setOffsetMs] = useState(0);
  // Só o setter é usado — o valor em si dispara o re-render que recalcula
  // elapsedMs (via correctedNow) a cada tick, ele mesmo nunca é lido.
  const [, setNowMs] = useState(() => Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showGabarito, setShowGabarito] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/quiz-sessions/${id}/results`, {
        headers: { "x-results-token": token },
      });
      if (res.status === 401 || res.status === 403) {
        setFatalError("Link de resultados inválido.");
        setLoading(false);
        return;
      }
      if (res.status === 404) {
        setFatalError("Esse quiz não existe.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json: ResultsResponse = await res.json();
      // server_time muda em toda resposta, então comparar o payload inteiro
      // nunca daria "igual" — compara sem esse campo pra evitar re-render à
      // toa quando o resto dos dados não mudou.
      setData((prev) =>
        prev && stableStringify(prev) === stableStringify(json) ? prev : json
      );
      setOffsetMs(clockOffsetMs(json.server_time));
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    if (fatalError) return;
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchResults();
    }, RESULTS_POLL_MS);
    return () => clearInterval(interval);
  }, [fatalError, fetchResults]);

  useEffect(() => {
    if (data?.title) document.title = `${data.title} — Resultados`;
  }, [data?.title]);

  useEffect(() => {
    if (data?.phase !== "finished" || !data.finished_at) return;
    // Prazo em relógio local (não corrigido) pra decidir quando parar — assim
    // o intervalo se autoencerra mesmo se a aba ficar em segundo plano e o
    // polling (que atualizaria offsetMs) parar de rodar nesse meio-tempo.
    const deadlineMs = new Date(data.finished_at).getTime() + PODIUM_REVEAL_TOTAL_MS - offsetMs;
    if (Date.now() >= deadlineMs) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
      if (Date.now() >= deadlineMs) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [data?.phase, data?.finished_at, offsetMs]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // permissão negada ou chamada duplicada — sem tela cheia, sem drama
    }
  }

  async function exportImage() {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#020617",
        scale: 2,
        useCORS: true,
        ignoreElements: (el) => el.classList.contains("no-export"),
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `quiz-${id}.png`;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white/60" />
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/80">{fatalError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">Conectando...</p>
      </div>
    );
  }

  return (
    <div ref={exportRef} className="min-h-screen flex flex-col p-6 sm:p-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{data.title}</h1>
          {data.description && <p className="text-white/60 mt-1">{data.description}</p>}
          {data.current_question_index !== null && data.phase !== "finished" && (
            <p className="text-white/40 text-sm mt-1">
              Pergunta {data.current_question_index + 1} de {data.questions_total}
            </p>
          )}
        </div>
        <div className="no-export flex gap-2 shrink-0">
          <button
            type="button"
            onClick={exportImage}
            disabled={exporting}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {exporting ? "Gerando..." : "Baixar imagem"}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-colors"
          >
            {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {data.phase === "lobby" && (
          <div className="text-center space-y-3">
            <p className="text-5xl">👋</p>
            <p className="text-white text-2xl font-bold">Aguardando o host iniciar...</p>
            <p className="text-white/60">{data.leaderboard.length} participante(s) já entraram</p>
          </div>
        )}

        {data.phase === "question" && data.current_question && (
          <div className="w-full max-w-2xl space-y-6 text-center">
            {data.current_question.time_limit_seconds !== null && (
              <div className="flex justify-center">
                <QuizCountdown
                  startedAt={data.current_question.started_at}
                  timeLimitSeconds={data.current_question.time_limit_seconds}
                  offsetMs={offsetMs}
                />
              </div>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{data.current_question.prompt}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.current_question.options.map((option, i) => (
                <div
                  key={i}
                  className="px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-medium text-left"
                >
                  {option}
                </div>
              ))}
            </div>
            <p className="text-white/50">
              {data.current_question.answered_count} de {data.leaderboard.length} já responderam
            </p>
          </div>
        )}

        {data.phase === "reveal" && data.current_question && (
          <div className="w-full max-w-2xl space-y-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{data.current_question.prompt}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.current_question.options.map((option, i) => {
                const isCorrect = i === data.current_question!.correct_option_index;
                const count = data.current_question!.distribution?.[String(i)] ?? 0;
                return (
                  <div
                    key={i}
                    className={`px-5 py-4 rounded-xl border font-medium text-left flex items-center justify-between ${
                      isCorrect
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-100"
                        : "bg-white/5 border-white/10 text-white/60"
                    }`}
                  >
                    <span>{option}</span>
                    <span className="tabular-nums text-sm">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.phase === "finished" &&
          (() => {
            const elapsedMs = data.finished_at
              ? correctedNow(offsetMs) - new Date(data.finished_at).getTime()
              : 0;
            const revealedPlaces = podiumRevealedPlaces(elapsedMs);
            const listRevealed = podiumFullyRevealed(elapsedMs);
            return (
              <div className="w-full max-w-2xl space-y-8">
                {revealedPlaces === 0 ? (
                  <div className="text-center space-y-3">
                    <p className="text-5xl animate-pulse">🥁</p>
                    <p className="text-white text-2xl font-bold">Apurando o resultado...</p>
                  </div>
                ) : (
                  <QuizPodium top3={data.leaderboard.slice(0, 3)} revealedPlaces={revealedPlaces} />
                )}
                {listRevealed && (
                  <>
                    <QuizLeaderboard entries={data.leaderboard} />
                    {data.gabarito && (
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setShowGabarito((v) => !v)}
                          className="no-export px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-colors"
                        >
                          {showGabarito ? "Esconder gabarito" : "Ver gabarito"}
                        </button>
                        {showGabarito && (
                          <div className="mt-6 space-y-4 text-left">
                            {data.gabarito.map((q) => (
                              <div key={q.order_index} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-white font-semibold mb-2">
                                  {q.order_index + 1}. {q.prompt}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {q.options.map((option, i) => (
                                    <div
                                      key={i}
                                      className={`px-3 py-2 rounded-lg text-sm ${
                                        i === q.correct_option_index
                                          ? "bg-emerald-500/20 text-emerald-100 border border-emerald-400"
                                          : "bg-white/5 text-white/50"
                                      }`}
                                    >
                                      {option}
                                    </div>
                                  ))}
                                </div>
                                <p className="text-white/40 text-xs mt-2">
                                  {q.correct_answers} de {q.total_answers} acertaram
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
      </div>
    </div>
  );
}
