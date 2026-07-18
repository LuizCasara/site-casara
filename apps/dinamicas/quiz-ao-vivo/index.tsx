"use client";

import { useEffect, useRef, useState } from "react";
import { QUIZ_LIMITS, isValidQuestionDraft, type QuizQuestionDraft } from "@/lib/quiz";
import { trackQuizSessionCreated } from "@/utils/analytics";
import QuestionBuilder from "./QuestionBuilder";
import ControlPanel from "./ControlPanel";

const STORAGE_KEY = "meus-quizzes";

type StoredSession = {
  id: string;
  host_token: string;
  results_token: string;
  title: string;
  created_at: string;
  status?: "active" | "saved" | "discarded";
};

function loadStored(): StoredSession[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStored(list: StoredSession[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function emptyQuestion(): QuizQuestionDraft {
  return { prompt: "", options: ["", ""], correctOptionIndex: 0, timeLimitSeconds: 20 };
}

// Mesmo shape (snake_case) do corpo aceito por POST /api/quiz-sessions — dá
// pra importar um JSON exportado daqui de volta sem nenhuma conversão extra.
const EXAMPLE_QUIZ = {
  title: "Quiz de Cultura Geral",
  description: "Exemplo pronto pra importar e editar",
  questions: [
    {
      prompt: "Qual é a capital do Brasil?",
      options: ["São Paulo", "Brasília", "Rio de Janeiro", "Salvador"],
      correct_option_index: 1,
      time_limit_seconds: 20,
    },
    {
      prompt: "Quanto é 7 x 8?",
      options: ["54", "56", "58"],
      correct_option_index: 1,
      time_limit_seconds: null,
    },
  ],
};

function downloadExampleQuiz() {
  const blob = new Blob([JSON.stringify(EXAMPLE_QUIZ, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "quiz-exemplo.json";
  link.click();
  URL.revokeObjectURL(url);
}

export default function QuizAoVivo() {
  const [origin, setOrigin] = useState("");
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [selectedStored, setSelectedStored] = useState<StoredSession | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([emptyQuestion()]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Carrega "Meus quizzes" do localStorage e sincroniza o status de cada um.
  // Só remove da lista em caso de 404 ou status explicitamente "discarded" —
  // uma falha transitória de rede/DB não deve apagar a referência local.
  useEffect(() => {
    const stored = loadStored();
    setSessions(stored);

    (async () => {
      const results = await Promise.all(
        stored.map(async (s) => {
          try {
            const res = await fetch(`/api/quiz-sessions/${s.id}`);
            if (res.status === 404) return { id: s.id, drop: true, status: undefined };
            if (!res.ok) return { id: s.id, drop: false, status: undefined };
            const data = await res.json();
            return { id: s.id, drop: data.status === "discarded", status: data.status };
          } catch {
            return { id: s.id, drop: false, status: undefined };
          }
        })
      );
      const dropIds = new Set(results.filter((r) => r.drop).map((r) => r.id));
      const statusById = new Map(results.filter((r) => r.status).map((r) => [r.id, r.status]));
      const kept = stored
        .filter((s) => !dropIds.has(s.id))
        .map((s) => ({ ...s, status: statusById.get(s.id) ?? s.status }));
      setSessions(kept);
      saveStored(kept);
    })();
  }, []);

  function updateQuestion(index: number, question: QuizQuestionDraft) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? question : q)));
  }

  function addQuestion() {
    if (questions.length >= QUIZ_LIMITS.QUESTIONS_MAX) return;
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleImportFile(file: File) {
    setImportError("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setImportError("Não foi possível ler o arquivo — verifique se é um JSON válido");
      return;
    }
    const raw = parsed as Record<string, unknown>;
    const importedTitle = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!importedTitle) {
      setImportError("JSON inválido: 'title' é obrigatório");
      return;
    }
    if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
      setImportError("JSON inválido: 'questions' deve ser uma lista não vazia");
      return;
    }

    const drafts: QuizQuestionDraft[] = [];
    for (let i = 0; i < raw.questions.length; i++) {
      const q = raw.questions[i] as Record<string, unknown>;
      const draft: QuizQuestionDraft = {
        prompt: typeof q.prompt === "string" ? q.prompt : "",
        options: Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === "string") : [],
        correctOptionIndex: Number(q.correct_option_index),
        timeLimitSeconds:
          q.time_limit_seconds === null || q.time_limit_seconds === undefined
            ? null
            : Number(q.time_limit_seconds),
      };
      const error = isValidQuestionDraft(draft);
      if (error) {
        setImportError(`Pergunta ${i + 1}: ${error}`);
        return;
      }
      drafts.push(draft);
    }

    setTitle(importedTitle.slice(0, QUIZ_LIMITS.TITLE_MAX));
    setDescription(
      typeof raw.description === "string" ? raw.description.trim().slice(0, QUIZ_LIMITS.DESCRIPTION_MAX) : ""
    );
    setQuestions(drafts);
  }

  async function handleCreate() {
    setCreateError("");
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setCreateError("Título é obrigatório");
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const error = isValidQuestionDraft(questions[i]);
      if (error) {
        setCreateError(`Pergunta ${i + 1}: ${error}`);
        return;
      }
    }

    setCreating(true);
    try {
      const res = await fetch("/api/quiz-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim(),
          questions: questions.map((q) => ({
            prompt: q.prompt.trim(),
            options: q.options.map((o) => o.trim()).filter(Boolean),
            correct_option_index: q.correctOptionIndex,
            time_limit_seconds: q.timeLimitSeconds,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Erro ao criar quiz");
        setCreating(false);
        return;
      }

      const stored: StoredSession = {
        id: data.id,
        host_token: data.host_token,
        results_token: data.results_token,
        title: trimmedTitle,
        created_at: new Date().toISOString(),
        status: "active",
      };
      const list = [stored, ...loadStored()];
      saveStored(list);
      setSessions(list);
      trackQuizSessionCreated(data.id, questions.length);

      setTitle("");
      setDescription("");
      setQuestions([emptyQuestion()]);
      setCreating(false);
      setSelectedStored(stored);
    } catch {
      setCreateError("Erro de conexão");
      setCreating(false);
    }
  }

  function handleFinalized(status: "saved" | "discarded") {
    if (selectedStored) {
      const list =
        status === "discarded"
          ? loadStored().filter((s) => s.id !== selectedStored.id)
          : loadStored().map((s) => (s.id === selectedStored.id ? { ...s, status } : s));
      saveStored(list);
      setSessions(list);
    }
    setSelectedStored(null);
  }

  if (selectedStored) {
    return (
      <ControlPanel
        session={selectedStored}
        origin={origin}
        onClose={() => setSelectedStored(null)}
        onFinalized={handleFinalized}
      />
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Crie um quiz ao vivo: cadastre as perguntas, compartilhe um link/QR code, e acompanhe as respostas e o
          ranking em tempo real.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={downloadExampleQuiz}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-md text-sm"
          >
            Baixar exemplo (JSON)
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-md text-sm"
          >
            Importar JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
        </div>
        {importError && (
          <div className="mt-3 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">
            {importError}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={QUIZ_LIMITS.TITLE_MAX}
            placeholder="Ex: Quiz de Cultura Geral"
            className="w-full p-3 text-gray-800 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={QUIZ_LIMITS.DESCRIPTION_MAX}
            placeholder="Um contexto rápido para os participantes"
            className="w-full p-3 text-gray-800 border rounded-md h-20"
          />
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionBuilder
              key={i}
              question={q}
              index={i}
              onChange={updateQuestion}
              onRemove={removeQuestion}
              canRemove={questions.length > 1}
            />
          ))}
          {questions.length < QUIZ_LIMITS.QUESTIONS_MAX && (
            <button
              type="button"
              onClick={addQuestion}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-sm"
            >
              + Adicionar pergunta
            </button>
          )}
        </div>

        {createError && (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">
            {createError}
          </div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="px-5 py-2.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {creating ? "Criando..." : "Iniciar"}
        </button>
      </div>

      {sessions.length > 0 && (
        <div className="pt-6 border-t">
          <h3 className="text-lg font-semibold mb-3">Meus quizzes</h3>
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStored(s)}
                className="w-full flex items-center justify-between p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
              >
                <span className="font-medium">{s.title}</span>
                <span className="text-xs text-gray-400">{s.status === "saved" ? "Salvo" : "Ativo"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
