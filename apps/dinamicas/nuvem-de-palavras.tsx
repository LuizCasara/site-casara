"use client";

import { useCallback, useEffect, useState } from "react";
import {
  WORD_CLOUD_LIMITS,
  maxWordsCeiling,
  normalizeWord,
  type SessionMode,
  type SessionStatus,
} from "@/lib/word-cloud";
import {
  trackWordSessionCreated,
  trackWordSessionDiscarded,
  trackWordSessionFixedWordAdded,
  trackWordSessionSaved,
} from "@/utils/analytics";

const STORAGE_KEY = "minhas-nuvens";

type StoredSession = {
  id: string;
  host_token: string;
  results_token: string;
  title: string;
  created_at: string;
  status?: SessionStatus;
};

type SessionFull = StoredSession & {
  description: string | null;
  mode: SessionMode;
  fixed_words: string[] | null;
  max_words: number;
  accepting_responses: boolean;
  status: SessionStatus;
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

/** Lista de palavras "em edição" (banco fixo na criação, ou novas palavras
 * adicionadas a uma sessão ativa) — mesma lógica de adicionar/remover/dedupe
 * usada nos dois lugares. */
function useWordDraft() {
  const [words, setWords] = useState<string[]>([]);
  const [input, setInput] = useState("");

  function add() {
    const w = input.trim();
    if (!w || w.length > WORD_CLOUD_LIMITS.WORD_MAX_LEN) return;
    if (words.some((existing) => normalizeWord(existing) === normalizeWord(w))) {
      setInput("");
      return;
    }
    setWords((prev) => [...prev, w]);
    setInput("");
  }

  function remove(word: string) {
    setWords((prev) => prev.filter((w) => w !== word));
  }

  function reset() {
    setWords([]);
    setInput("");
  }

  return { words, input, setInput, add, remove, reset };
}

export default function NuvemDePalavras() {
  const [origin, setOrigin] = useState("");
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  // Painel selecionado: `selectedStored` aparece na hora (drives o loading state);
  // `selected` só é preenchido quando os dados completos chegam da API.
  const [selectedStored, setSelectedStored] = useState<StoredSession | null>(null);
  const [selected, setSelected] = useState<SessionFull | null>(null);

  // ─── Formulário de criação ────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<SessionMode>("open");
  const fixedWordsDraft = useWordDraft();
  const [maxWords, setMaxWords] = useState(1);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // ─── Painel da sessão ativa ───────────────────────────────────────────────
  const [togglingAccepting, setTogglingAccepting] = useState(false);
  const newFixedWords = useWordDraft();
  const [addingWords, setAddingWords] = useState(false);
  const [finalizing, setFinalizing] = useState<SessionStatus | null>(null);
  const [actionError, setActionError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrExpanded, setQrExpanded] = useState(false);
  const [copied, setCopied] = useState<"participant" | "results" | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Carrega "Minhas sessões" do localStorage e sincroniza o status de cada uma.
  // Só remove da lista em caso de 404 (sessão não existe mais) ou status
  // explicitamente "discarded" — uma falha transitória de rede/DB não deve
  // apagar a única referência local ao host_token de uma sessão.
  useEffect(() => {
    const stored = loadStored();
    setSessions(stored);

    (async () => {
      const results = await Promise.all(
        stored.map(async (s) => {
          try {
            const res = await fetch(`/api/word-sessions/${s.id}`);
            if (res.status === 404) return { id: s.id, drop: true, status: undefined };
            if (!res.ok) return { id: s.id, drop: false, status: undefined };
            const data = await res.json();
            return { id: s.id, drop: data.status === "discarded", status: data.status as SessionStatus };
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

  // Mantém max_words dentro do teto permitido pelo modo/banco de palavras.
  useEffect(() => {
    const ceiling = maxWordsCeiling(mode, fixedWordsDraft.words.length);
    setMaxWords((prev) => Math.min(Math.max(prev, 1), ceiling));
  }, [mode, fixedWordsDraft.words.length]);

  // Gera o QR code do link do participante sempre que a sessão selecionada muda.
  useEffect(() => {
    if (!selected || !origin) {
      setQrDataUrl("");
      return;
    }
    const qrcode = require("qrcode");
    qrcode
      .toDataURL(`${origin}/w/${selected.id}`, { width: 320, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [selected?.id, origin]);

  const openSession = useCallback(async (stored: StoredSession) => {
    setSelectedStored(stored);
    setSelected(null);
    setActionError("");
    try {
      const res = await fetch(`/api/word-sessions/${stored.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelected({ ...stored, ...data });
      }
    } catch {
      // fica no estado de carregamento; o botão "← Minhas sessões" continua disponível
    }
  }, []);

  function closeSelected() {
    setSelectedStored(null);
    setSelected(null);
  }

  async function handleCreate() {
    setCreateError("");
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setCreateError("Título é obrigatório");
      return;
    }
    if (mode === "fixed" && fixedWordsDraft.words.length < WORD_CLOUD_LIMITS.FIXED_WORDS_MIN) {
      setCreateError(`Adicione ao menos ${WORD_CLOUD_LIMITS.FIXED_WORDS_MIN} palavras ao banco fixo`);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/word-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim(),
          mode,
          fixed_words: mode === "fixed" ? fixedWordsDraft.words : undefined,
          max_words: maxWords,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "Erro ao criar sessão");
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
      trackWordSessionCreated(data.id, mode);

      setTitle("");
      setDescription("");
      setMode("open");
      fixedWordsDraft.reset();
      setMaxWords(1);
      setCreating(false);

      await openSession(stored);
    } catch {
      setCreateError("Erro de conexão");
      setCreating(false);
    }
  }

  async function toggleAccepting() {
    if (!selected) return;
    setTogglingAccepting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/word-sessions/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-host-token": selected.host_token },
        body: JSON.stringify({ accepting_responses: !selected.accepting_responses }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelected((prev) => (prev ? { ...prev, accepting_responses: data.accepting_responses } : prev));
      } else {
        setActionError(data.error ?? "Não foi possível atualizar agora. Tente novamente.");
      }
    } catch {
      setActionError("Erro de conexão. Tente novamente.");
    } finally {
      setTogglingAccepting(false);
    }
  }

  async function submitNewFixedWords() {
    if (!selected || newFixedWords.words.length === 0) return;
    setAddingWords(true);
    setActionError("");
    try {
      const res = await fetch(`/api/word-sessions/${selected.id}/fixed-words`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-host-token": selected.host_token },
        body: JSON.stringify({ words: newFixedWords.words }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelected((prev) => (prev ? { ...prev, fixed_words: data.fixed_words } : prev));
        trackWordSessionFixedWordAdded(selected.id, newFixedWords.words.length);
        newFixedWords.reset();
      } else {
        setActionError(data.error ?? "Não foi possível adicionar as palavras. Tente novamente.");
      }
    } catch {
      setActionError("Erro de conexão. Tente novamente.");
    } finally {
      setAddingWords(false);
    }
  }

  async function finalizeSession(status: "saved" | "discarded") {
    if (!selected) return;
    setFinalizing(status);
    setActionError("");
    try {
      const res = await fetch(`/api/word-sessions/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-host-token": selected.host_token },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        if (status === "saved") {
          trackWordSessionSaved(selected.id);
        } else {
          trackWordSessionDiscarded(selected.id);
          const list = loadStored().filter((s) => s.id !== selected.id);
          saveStored(list);
          setSessions(list);
        }
        closeSelected();
      } else {
        setActionError(data.error ?? "Não foi possível concluir a ação. Tente novamente.");
      }
    } catch {
      setActionError("Erro de conexão. Tente novamente.");
    } finally {
      setFinalizing(null);
    }
  }

  function removeFromLocalHistory(id: string) {
    const list = loadStored().filter((s) => s.id !== id);
    saveStored(list);
    setSessions(list);
    closeSelected();
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

  const ceiling = maxWordsCeiling(mode, fixedWordsDraft.words.length);

  // ─── Painel carregando (dados completos ainda não chegaram) ──────────────
  if (selectedStored && !selected) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <button
          type="button"
          onClick={closeSelected}
          className="text-green-600 dark:text-green-400 text-sm hover:underline"
        >
          ← Minhas sessões
        </button>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500" />
        </div>
      </div>
    );
  }

  // ─── Painel de uma sessão selecionada ─────────────────────────────────────
  if (selected) {
    const participantUrl = `${origin}/w/${selected.id}`;
    const resultsUrl = `${origin}/w/${selected.id}/resultados/${selected.results_token}`;
    const isTerminal = selected.status !== "active";

    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <button
          type="button"
          onClick={closeSelected}
          className="text-green-600 dark:text-green-400 text-sm hover:underline"
        >
          ← Minhas sessões
        </button>

        <div>
          <h2 className="text-2xl font-bold">{selected.title}</h2>
          {selected.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{selected.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Modo {selected.mode === "fixed" ? "fixo" : "aberto"} · até {selected.max_words} palavra(s) por envio
          </p>
        </div>

        {actionError && (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">
            {actionError}
          </div>
        )}

        {isTerminal ? (
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
            Esta sessão está <strong>{selected.status === "saved" ? "salva" : selected.status}</strong> e não aceita
            mais respostas. Os links abaixo continuam funcionando para consulta.
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
            <div>
              <p className="font-medium">Aceitando respostas?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Desligue para pausar novos envios sem encerrar a dinâmica.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAccepting}
              disabled={togglingAccepting}
              className={`relative w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${
                selected.accepting_responses ? "bg-green-500" : "bg-gray-400 dark:bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  selected.accepting_responses ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>
        )}

        {selected.mode === "fixed" && (
          <div className="space-y-2">
            <p className="font-medium text-sm">Banco de palavras</p>
            <div className="flex flex-wrap gap-2">
              {(selected.fixed_words ?? []).map((w) => (
                <span
                  key={w}
                  className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm"
                >
                  {w}
                </span>
              ))}
            </div>

            {!isTerminal && (
              <div className="space-y-2 pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFixedWords.input}
                    onChange={(e) => newFixedWords.setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        newFixedWords.add();
                      }
                    }}
                    maxLength={WORD_CLOUD_LIMITS.WORD_MAX_LEN}
                    placeholder="Nova palavra"
                    className="flex-1 p-2 text-sm text-gray-800 border rounded-md"
                  />
                  <button
                    type="button"
                    onClick={newFixedWords.add}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-sm"
                  >
                    +
                  </button>
                </div>
                {newFixedWords.words.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center">
                    {newFixedWords.words.map((w) => (
                      <span
                        key={w}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm"
                      >
                        {w}
                        <button type="button" onClick={() => newFixedWords.remove(w)}>
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={submitNewFixedWords}
                      disabled={addingWords}
                      className="px-3 py-1 bg-green-500 text-white rounded-md text-sm disabled:opacity-50"
                    >
                      {addingWords ? "Adicionando..." : "Adicionar ao banco"}
                    </button>
                  </div>
                )}
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
                alt="QR code do link da dinâmica"
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
              onClick={() => finalizeSession("discarded")}
              disabled={finalizing !== null}
              className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md disabled:opacity-50"
            >
              {finalizing === "discarded" ? "Descartando..." : "Descartar"}
            </button>
            <button
              type="button"
              onClick={() => finalizeSession("saved")}
              disabled={finalizing !== null}
              className="px-4 py-2 bg-green-500 text-white rounded-md disabled:opacity-50"
            >
              {finalizing === "saved" ? "Salvando..." : "Salvar"}
            </button>
          </div>
        ) : (
          <div className="flex justify-end pt-2 border-t">
            <button
              type="button"
              onClick={() => removeFromLocalHistory(selected.id)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-sm"
            >
              Remover da lista
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

  // ─── Formulário de criação + Minhas sessões ───────────────────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Crie uma dinâmica ao vivo: compartilhe um link/QR code, colete palavras dos participantes e acompanhe a
          nuvem de palavras crescer em tempo real.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={WORD_CLOUD_LIMITS.TITLE_MAX}
            placeholder="Ex: Como você descreveria 2026 em uma palavra?"
            className="w-full p-3 text-gray-800 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={WORD_CLOUD_LIMITS.DESCRIPTION_MAX}
            placeholder="Um contexto rápido para os participantes"
            className="w-full p-3 text-gray-800 border rounded-md h-20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Modo</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("open")}
              className={`flex-1 p-3 rounded-md border text-sm font-medium ${
                mode === "open" ? "border-green-500 bg-green-50 dark:bg-green-950/30" : ""
              }`}
            >
              Palavras soltas
              <span className="block text-xs font-normal text-gray-500 mt-1">
                Participantes digitam livremente
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("fixed")}
              className={`flex-1 p-3 rounded-md border text-sm font-medium ${
                mode === "fixed" ? "border-green-500 bg-green-50 dark:bg-green-950/30" : ""
              }`}
            >
              Palavras fixas
              <span className="block text-xs font-normal text-gray-500 mt-1">
                Você define o banco de opções
              </span>
            </button>
          </div>
        </div>

        {mode === "fixed" && (
          <div>
            <label className="block text-sm font-medium mb-1">Banco de palavras</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fixedWordsDraft.input}
                onChange={(e) => fixedWordsDraft.setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    fixedWordsDraft.add();
                  }
                }}
                maxLength={WORD_CLOUD_LIMITS.WORD_MAX_LEN}
                placeholder="Digite uma palavra e pressione Enter"
                className="flex-1 p-3 text-gray-800 border rounded-md"
              />
              <button
                type="button"
                onClick={fixedWordsDraft.add}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md"
              >
                +
              </button>
            </div>
            {fixedWordsDraft.words.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {fixedWordsDraft.words.map((w) => (
                  <span
                    key={w}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm"
                  >
                    {w}
                    <button type="button" onClick={() => fixedWordsDraft.remove(w)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Quantas palavras cada participante pode {mode === "fixed" ? "escolher" : "enviar"}?
          </label>
          <input
            type="number"
            min={1}
            max={ceiling}
            value={maxWords}
            onChange={(e) => setMaxWords(Math.min(Math.max(Number(e.target.value) || 1, 1), ceiling))}
            className="w-24 p-2 text-gray-800 border rounded-md"
          />
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
          <h3 className="text-lg font-semibold mb-3">Minhas sessões</h3>
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openSession(s)}
                className="w-full flex items-center justify-between p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
              >
                <span className="font-medium">{s.title}</span>
                <span className="text-xs text-gray-400">{s.status === "saved" ? "Salva" : "Ativa"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
