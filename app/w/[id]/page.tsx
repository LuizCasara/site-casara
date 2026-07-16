"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { trackWordSessionSubmitted } from "@/utils/analytics";
import { normalizeWord, type SessionMode, type SessionStatus } from "@/lib/word-cloud";

type SessionPublic = {
  title: string;
  description: string | null;
  mode: SessionMode;
  fixed_words: string[] | null;
  max_words: number;
  accepting_responses: boolean;
  status: SessionStatus;
};

const METADATA_POLL_MS = 4500;

function getParticipantId(sessionId: string): string {
  const key = `wc_participant_${sessionId}`;
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

export default function WordSessionParticipantPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<SessionPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [openWords, setOpenWords] = useState<string[]>([]);
  const [openInput, setOpenInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const participantIdRef = useRef<string>("");

  useEffect(() => {
    if (!id) return;
    participantIdRef.current = getParticipantId(id);
    if (window.localStorage.getItem(`wc_submitted_${id}`) === "true") {
      setSubmitted(true);
    }
  }, [id]);

  const fetchSession = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/word-sessions/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSession(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (submitted || notFound) return;
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchSession();
    }, METADATA_POLL_MS);
    return () => clearInterval(interval);
  }, [submitted, notFound, fetchSession]);

  useEffect(() => {
    if (session?.title) {
      document.title = session.title;
    }
  }, [session?.title]);

  const maxWords = session?.max_words ?? 1;

  function toggleFixedWord(word: string) {
    setSelectedWords((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word);
      if (prev.length >= maxWords) return prev;
      return [...prev, word];
    });
  }

  function addOpenWord() {
    const w = openInput.trim();
    if (!w) return;
    if (openWords.length >= maxWords) return;
    if (openWords.some((existing) => normalizeWord(existing) === normalizeWord(w))) {
      setOpenInput("");
      return;
    }
    setOpenWords((prev) => [...prev, w]);
    setOpenInput("");
  }

  function removeOpenWord(word: string) {
    setOpenWords((prev) => prev.filter((w) => w !== word));
  }

  async function handleSubmit() {
    if (!session) return;
    const words = session.mode === "fixed" ? selectedWords : openWords;
    if (words.length === 0) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`/api/word-sessions/${id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_id: participantIdRef.current, words }),
      });

      if (res.status === 409) {
        window.localStorage.setItem(`wc_submitted_${id}`, "true");
        setSubmitted(true);
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error ?? "Não foi possível enviar. Tente novamente.");
        setSubmitting(false);
        return;
      }

      window.localStorage.setItem(`wc_submitted_${id}`, "true");
      trackWordSessionSubmitted(id, session.mode);
      setSubmitted(true);
      setSubmitting(false);
    } catch {
      setSubmitError("Erro de conexão. Tente novamente.");
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
        <p className="text-white/80 text-center">Essa dinâmica não existe ou o link está incorreto.</p>
      </Centered>
    );
  }

  if (!session) {
    return (
      <Centered>
        <p className="text-white/80 text-center">Não foi possível carregar a dinâmica.</p>
      </Centered>
    );
  }

  if (submitted) {
    return (
      <Centered>
        <div className="text-center space-y-3">
          <p className="text-5xl">🎉</p>
          <h1 className="text-2xl font-bold text-white">Obrigado por participar!</h1>
          <p className="text-white/70">Sua resposta foi enviada com sucesso.</p>
        </div>
      </Centered>
    );
  }

  if (session.status !== "active") {
    return (
      <Centered>
        <p className="text-white/80 text-center">Essa dinâmica já foi encerrada.</p>
      </Centered>
    );
  }

  if (!session.accepting_responses) {
    return (
      <Centered>
        <div className="text-center space-y-2">
          <p className="text-4xl">⏸️</p>
          <p className="text-white/80">O host pausou o recebimento de respostas.</p>
          <p className="text-white/50 text-sm">Aguarde, isso pode voltar a qualquer momento.</p>
        </div>
      </Centered>
    );
  }

  const words = session.mode === "fixed" ? selectedWords : openWords;
  const canSubmit = words.length > 0 && !submitting;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-white">{session.title}</h1>
          {session.description && (
            <p className="text-white/60 text-sm">{session.description}</p>
          )}
          <p className="text-white/40 text-xs">
            Escolha até {maxWords} palavra{maxWords > 1 ? "s" : ""}
          </p>
        </div>

        {session.mode === "fixed" ? (
          <div className="grid grid-cols-2 gap-2">
            {(session.fixed_words ?? []).map((word) => {
              const checked = selectedWords.includes(word);
              const disabled = !checked && selectedWords.length >= maxWords;
              return (
                <button
                  key={word}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleFixedWord(word)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    checked
                      ? "bg-emerald-500 border-emerald-400 text-white"
                      : disabled
                      ? "bg-white/5 border-white/10 text-white/30"
                      : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={openInput}
                onChange={(e) => setOpenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOpenWord();
                  }
                }}
                maxLength={40}
                placeholder="Digite uma palavra"
                disabled={openWords.length >= maxWords}
                className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={addOpenWord}
                disabled={openWords.length >= maxWords || !openInput.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-40"
              >
                +
              </button>
            </div>
            {openWords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {openWords.map((word) => (
                  <span
                    key={word}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 text-sm"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() => removeOpenWord(word)}
                      className="text-emerald-200 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {submitError && (
          <p className="text-red-300 text-sm text-center">{submitError}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 rounded-lg bg-emerald-500 text-white font-semibold disabled:opacity-40 hover:bg-emerald-600 transition-colors"
        >
          {submitting ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-4">{children}</div>;
}
