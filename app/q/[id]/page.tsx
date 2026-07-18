"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QuizCountdown from "@/components/QuizCountdown";
import { clockOffsetMs, correctedNow, podiumFullyRevealed, PODIUM_REVEAL_TOTAL_MS } from "@/lib/quiz";
import { trackQuizAnswerSubmitted, trackQuizSessionJoined } from "@/utils/analytics";

const POLL_MS = 2500;

type QuestionPublic = {
  prompt: string;
  options: string[];
  time_limit_seconds: number | null;
  started_at: string;
  correct_option_index?: number;
};

type ParticipantState =
  | { joined: false }
  | {
      joined: true;
      name: string;
      has_answered_current: boolean;
      selected_option_index?: number;
      is_correct?: boolean;
      points_awarded_current?: number;
      total_score: number;
      rank: number;
    };

type SessionState = {
  title: string;
  description: string | null;
  status: "active" | "saved" | "discarded";
  phase: "lobby" | "question" | "reveal" | "finished";
  current_question_index: number | null;
  questions_total: number;
  question: QuestionPublic | null;
  server_time: string;
  finished_at: string | null;
  participant: ParticipantState | null;
};

function getParticipantId(sessionId: string): string {
  const key = `qz_participant_${sessionId}`;
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

export default function QuizParticipantPage() {
  const params = useParams();
  const id = params.id as string;

  const [state, setState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [offsetMs, setOffsetMs] = useState(0);
  // Só o setter é usado — o valor em si dispara o re-render que recalcula
  // os prazos (via correctedNow) a cada tick, ele mesmo nunca é lido.
  const [, setNowMs] = useState(() => Date.now());

  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const participantIdRef = useRef("");

  useEffect(() => {
    if (id) participantIdRef.current = getParticipantId(id);
  }, [id]);

  const fetchState = useCallback(async () => {
    if (!id || !participantIdRef.current) return;
    try {
      const res = await fetch(`/api/quiz-sessions/${id}?participant_id=${participantIdRef.current}`);
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data: SessionState = await res.json();
      setState(data);
      setOffsetMs(clockOffsetMs(data.server_time));
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    // Continua fazendo poll mesmo com phase "finished" — o host pode
    // reiniciar o quiz (volta pra "lobby"), e essa é a única forma dessa
    // aba descobrir isso sem precisar recarregar a página manualmente.
    if (notFound) return;
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchState();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [notFound, fetchState]);

  useEffect(() => {
    if (state?.title) document.title = state.title;
  }, [state?.title]);

  useEffect(() => {
    if (state?.phase !== "finished" || !state.finished_at) return;
    // Prazo em relógio local (não corrigido) pra decidir quando parar — assim
    // o intervalo se autoencerra mesmo se a aba ficar em segundo plano e o
    // polling (que atualizaria offsetMs) parar de rodar nesse meio-tempo.
    const deadlineMs = new Date(state.finished_at).getTime() + PODIUM_REVEAL_TOTAL_MS - offsetMs;
    if (Date.now() >= deadlineMs) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
      if (Date.now() >= deadlineMs) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [state?.phase, state?.finished_at, offsetMs]);

  useEffect(() => {
    if (state?.phase !== "question" || !state.question || state.question.time_limit_seconds === null) return;
    if (state.participant?.joined && state.participant.has_answered_current) return;
    const deadlineMs =
      new Date(state.question.started_at).getTime() + state.question.time_limit_seconds * 1000 - offsetMs;
    if (Date.now() >= deadlineMs) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
      if (Date.now() >= deadlineMs) clearInterval(interval);
    }, 300);
    return () => clearInterval(interval);
  }, [state?.phase, state?.question, state?.participant, offsetMs]);

  async function handleJoin() {
    const name = nameInput.trim();
    if (!name) return;
    setJoining(true);
    setJoinError("");
    try {
      const res = await fetch(`/api/quiz-sessions/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_id: participantIdRef.current, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        trackQuizSessionJoined(id);
        await fetchState();
      } else {
        setJoinError(data.error ?? "Não foi possível entrar. Tente novamente.");
      }
    } catch {
      setJoinError("Erro de conexão. Tente novamente.");
    } finally {
      setJoining(false);
    }
  }

  async function handleAnswer(optionIndex: number) {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/quiz-sessions/${id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: participantIdRef.current,
          selected_option_index: optionIndex,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        trackQuizAnswerSubmitted(id);
        setState((prev) =>
          prev && prev.participant?.joined
            ? {
                ...prev,
                participant: {
                  ...prev.participant,
                  has_answered_current: true,
                  selected_option_index: optionIndex,
                },
              }
            : prev
        );
      } else if (res.status === 409) {
        await fetchState();
      } else {
        setSubmitError(data.error ?? "Não foi possível enviar. Tente novamente.");
      }
    } catch {
      setSubmitError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Centered>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white/60" />
      </Centered>
    );
  }

  if (notFound) {
    return (
      <Centered>
        <p className="text-white/80 text-center">Esse quiz não existe ou o link está incorreto.</p>
      </Centered>
    );
  }

  if (!state) {
    return (
      <Centered>
        <p className="text-white/80 text-center">Não foi possível carregar o quiz.</p>
      </Centered>
    );
  }

  const participant = state.participant;

  if (!participant || !participant.joined) {
    return (
      <Centered>
        <div className="w-full max-w-sm bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4 text-center">
          <h1 className="text-xl font-bold text-white">{state.title}</h1>
          {state.description && <p className="text-white/60 text-sm">{state.description}</p>}
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            maxLength={30}
            placeholder="Seu nome"
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          {joinError && <p className="text-red-300 text-sm">{joinError}</p>}
          <button
            type="button"
            onClick={handleJoin}
            disabled={joining || !nameInput.trim()}
            className="w-full py-3 rounded-lg bg-emerald-500 text-white font-semibold disabled:opacity-40 hover:bg-emerald-600 transition-colors"
          >
            {joining ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </Centered>
    );
  }

  if (state.phase === "lobby") {
    return (
      <Centered>
        <div className="text-center space-y-2">
          <p className="text-4xl">🎉</p>
          <p className="text-white text-lg font-semibold">Você entrou, {participant.name}!</p>
          <p className="text-white/60">Aguardando o host iniciar o quiz...</p>
        </div>
      </Centered>
    );
  }

  if (state.phase === "question" && state.question) {
    if (participant.has_answered_current) {
      return (
        <Centered>
          <div className="text-center space-y-3">
            <p className="text-4xl">✅</p>
            <p className="text-white text-lg font-semibold">Resposta enviada!</p>
            <p className="text-white/60">Aguardando os outros participantes...</p>
          </div>
        </Centered>
      );
    }
    const deadlineMs =
      state.question.time_limit_seconds !== null
        ? new Date(state.question.started_at).getTime() + state.question.time_limit_seconds * 1000
        : null;
    const timeUp = deadlineMs !== null && correctedNow(offsetMs) >= deadlineMs;
    if (timeUp) {
      return (
        <Centered>
          <div className="text-center space-y-3">
            <p className="text-4xl">⏰</p>
            <p className="text-white text-lg font-semibold">Ihh, não deu tempo!</p>
            <p className="text-white/60">Aguardando os outros participantes...</p>
          </div>
        </Centered>
      );
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
        {state.question.time_limit_seconds !== null && (
          <QuizCountdown
            startedAt={state.question.started_at}
            timeLimitSeconds={state.question.time_limit_seconds}
            offsetMs={offsetMs}
          />
        )}
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-xl font-bold text-white text-center">{state.question.prompt}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {state.question.options.map((option, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleAnswer(i)}
                disabled={submitting}
                className="px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-colors disabled:opacity-50 text-left"
              >
                {option}
              </button>
            ))}
          </div>
          {submitError && <p className="text-red-300 text-sm text-center">{submitError}</p>}
        </div>
      </div>
    );
  }

  if (state.phase === "reveal" && state.question) {
    const answered = participant.has_answered_current;
    return (
      <Centered>
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-xl font-bold text-white">{state.question.prompt}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {state.question.options.map((option, i) => {
              const isCorrect = i === state.question!.correct_option_index;
              const isMine = answered && i === participant.selected_option_index;
              return (
                <div
                  key={i}
                  className={`px-4 py-4 rounded-xl border font-medium text-left ${
                    isCorrect
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-100"
                      : isMine
                      ? "bg-red-500/20 border-red-400 text-red-100"
                      : "bg-white/5 border-white/10 text-white/50"
                  }`}
                >
                  {option}
                </div>
              );
            })}
          </div>
          {answered ? (
            <p className={`text-lg font-bold ${participant.is_correct ? "text-emerald-400" : "text-red-400"}`}>
              {participant.is_correct
                ? `Certa! +${participant.points_awarded_current} pontos`
                : "Não foi dessa vez"}
            </p>
          ) : (
            <p className="text-white/60">Você não respondeu a tempo.</p>
          )}
          <p className="text-white/40 text-sm">Total: {participant.total_score} pontos · #{participant.rank}</p>
        </div>
      </Centered>
    );
  }

  if (state.phase === "finished") {
    const elapsedMs = state.finished_at ? correctedNow(offsetMs) - new Date(state.finished_at).getTime() : 0;
    if (!podiumFullyRevealed(elapsedMs)) {
      return (
        <Centered>
          <div className="text-center space-y-3">
            <p className="text-5xl animate-pulse">🥁</p>
            <h1 className="text-2xl font-bold text-white">Apurando o resultado...</h1>
            <p className="text-white/60">Prepare-se!</p>
          </div>
        </Centered>
      );
    }
    return (
      <Centered>
        <div className="text-center space-y-3">
          <p className="text-5xl">🏁</p>
          <h1 className="text-2xl font-bold text-white">Quiz encerrado!</h1>
          <p className="text-white/80 text-lg">
            {participant.name}, você ficou em <strong>#{participant.rank}</strong>
          </p>
          <p className="text-white/60">{participant.total_score} pontos no total</p>
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white/60" />
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-4">{children}</div>;
}
