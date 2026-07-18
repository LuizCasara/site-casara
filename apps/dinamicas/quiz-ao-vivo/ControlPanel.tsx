"use client";

import { useCallback, useEffect, useState } from "react";
import QuizLeaderboard from "@/components/QuizLeaderboard";
import { trackQuizSessionDiscarded, trackQuizSessionSaved } from "@/utils/analytics";

type StoredSession = {
  id: string;
  host_token: string;
  results_token: string;
  title: string;
};

type ResultsData = {
  phase: "lobby" | "question" | "reveal" | "finished";
  current_question_index: number | null;
  questions_total: number;
  status: "active" | "saved" | "discarded";
  leaderboard: { name: string; score: number }[];
  current_question: {
    prompt: string;
    options: string[];
    answered_count: number;
    correct_option_index?: number;
    distribution?: Record<string, number>;
  } | null;
};

type Props = {
  session: StoredSession;
  origin: string;
  onClose: () => void;
  onFinalized: (status: "saved" | "discarded") => void;
};

const POLL_MS = 2500;

export default function ControlPanel({ session, origin, onClose, onFinalized }: Props) {
  const [data, setData] = useState<ResultsData | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrExpanded, setQrExpanded] = useState(false);
  const [copied, setCopied] = useState<"participant" | "results" | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/quiz-sessions/${session.id}/results`, {
        headers: { "x-host-token": session.host_token },
      });
      if (res.ok) setData(await res.json());
    } catch {
      // poll falhou, o próximo tick tenta de novo
    }
  }, [session.id, session.host_token]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchData();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const qrcode = require("qrcode");
    qrcode
      .toDataURL(`${origin}/q/${session.id}`, { width: 320, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [session.id, origin]);

  async function runAction(action: "start" | "reveal" | "next" | "restart") {
    setActionPending(true);
    setActionError("");
    try {
      const res = await fetch(`/api/quiz-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-host-token": session.host_token },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        await fetchData();
      } else {
        setActionError(body.error ?? "Não foi possível concluir a ação.");
      }
    } catch {
      setActionError("Erro de conexão. Tente novamente.");
    } finally {
      setActionPending(false);
    }
  }

  async function finalize(status: "saved" | "discarded") {
    setActionPending(true);
    setActionError("");
    try {
      const res = await fetch(`/api/quiz-sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-host-token": session.host_token },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        if (status === "saved") trackQuizSessionSaved(session.id);
        else trackQuizSessionDiscarded(session.id);
        onFinalized(status);
      } else {
        setActionError(body.error ?? "Não foi possível concluir a ação.");
      }
    } catch {
      setActionError("Erro de conexão. Tente novamente.");
    } finally {
      setActionPending(false);
    }
  }

  async function copyLink(url: string, which: "participant" | "results") {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard indisponível, ignora silenciosamente
    }
  }

  if (!data) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <button
          type="button"
          onClick={onClose}
          className="text-green-600 dark:text-green-400 text-sm hover:underline"
        >
          ← Meus quizzes
        </button>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500" />
        </div>
      </div>
    );
  }

  const participantUrl = `${origin}/q/${session.id}`;
  const resultsUrl = `${origin}/q/${session.id}/resultados/${session.results_token}`;
  const isTerminal = data.status !== "active";
  const isLastQuestion =
    data.current_question_index !== null && data.current_question_index + 1 >= data.questions_total;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={onClose} className="text-green-600 dark:text-green-400 text-sm hover:underline">
        ← Meus quizzes
      </button>

      <div>
        <h2 className="text-2xl font-bold">{session.title}</h2>
        {data.current_question_index !== null && data.phase !== "finished" && (
          <p className="text-xs text-gray-400 mt-1">
            Pergunta {data.current_question_index + 1} de {data.questions_total}
          </p>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">
          {actionError}
        </div>
      )}

      {isTerminal ? (
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
          Este quiz está <strong>{data.status === "saved" ? "salvo" : data.status}</strong>. Os links abaixo
          continuam funcionando para consulta.
        </div>
      ) : (
        <div className="p-4 border rounded-md space-y-3">
          {data.phase === "lobby" && (
            <>
              <p className="text-sm text-gray-500">{data.leaderboard.length} participante(s) já entraram.</p>
              <button
                type="button"
                onClick={() => runAction("start")}
                disabled={actionPending || data.leaderboard.length === 0}
                className="px-4 py-2 bg-green-500 text-white rounded-md disabled:opacity-50"
              >
                Iniciar quiz
              </button>
            </>
          )}

          {data.phase === "question" && data.current_question && (
            <>
              <p className="font-medium">{data.current_question.prompt}</p>
              <p className="text-sm text-gray-500">
                {data.current_question.answered_count} de {data.leaderboard.length} responderam
              </p>
              <button
                type="button"
                onClick={() => runAction("reveal")}
                disabled={actionPending}
                className="px-4 py-2 bg-green-500 text-white rounded-md disabled:opacity-50"
              >
                Revelar resposta
              </button>
            </>
          )}

          {data.phase === "reveal" && data.current_question && (
            <>
              <p className="font-medium">{data.current_question.prompt}</p>
              <div className="space-y-1">
                {data.current_question.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`text-sm px-2 py-1 rounded ${
                      i === data.current_question!.correct_option_index
                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                        : "text-gray-500"
                    }`}
                  >
                    {opt} — {data.current_question!.distribution?.[String(i)] ?? 0}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => runAction("next")}
                disabled={actionPending}
                className="px-4 py-2 bg-green-500 text-white rounded-md disabled:opacity-50"
              >
                {isLastQuestion ? "Finalizar quiz" : "Próxima pergunta"}
              </button>
            </>
          )}

          {data.phase === "finished" && (
            <div>
              <p className="font-medium mb-3">Quiz encerrado! Ranking final:</p>
              <QuizLeaderboard entries={data.leaderboard} />
              <button
                type="button"
                onClick={() => runAction("restart")}
                disabled={actionPending}
                className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50"
              >
                Reiniciar quiz
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 border rounded-md space-y-3 text-center">
          <p className="font-medium text-sm">Link dos participantes</p>
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR code do link do quiz"
              onClick={() => setQrExpanded(true)}
              className="mx-auto cursor-pointer rounded-md border"
            />
          )}
          <p className="text-xs text-gray-500 break-all">{participantUrl}</p>
          <button
            type="button"
            onClick={() => copyLink(participantUrl, "participant")}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-md text-sm"
          >
            {copied === "participant" ? "Copiado!" : "Copiar link"}
          </button>
        </div>

        <div className="p-4 border rounded-md space-y-3 text-center flex flex-col justify-center">
          <p className="font-medium text-sm">Link de resultados (tela grande)</p>
          <p className="text-xs text-gray-500 break-all">{resultsUrl}</p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => copyLink(resultsUrl, "results")}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-md text-sm"
            >
              {copied === "results" ? "Copiado!" : "Copiar link"}
            </button>
            <a
              href={resultsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-green-500 text-white rounded-md text-sm"
            >
              Abrir
            </a>
          </div>
        </div>
      </div>

      {!isTerminal ? (
        <div className="flex gap-3 justify-end pt-2 border-t">
          <button
            type="button"
            onClick={() => finalize("discarded")}
            disabled={actionPending}
            className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={() => finalize("saved")}
            disabled={actionPending}
            className="px-4 py-2 bg-green-500 text-white rounded-md disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      ) : (
        <div className="flex justify-end pt-2 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-sm"
          >
            Voltar
          </button>
        </div>
      )}

      {qrExpanded && qrDataUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-pointer"
          onClick={() => setQrExpanded(false)}
        >
          <img src={qrDataUrl} alt="QR code ampliado" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
