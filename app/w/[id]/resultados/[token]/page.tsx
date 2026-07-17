"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import WordCloud from "@/components/WordCloud";
import WordBarChart from "@/components/WordBarChart";
import type { WordCount } from "@/lib/word-cloud";
import { playSound } from "@/lib/sound";

const RESULTS_POLL_MS = 2500;

type ViewMode = "bubbles" | "text" | "chart";

type ResultsResponse = {
  title: string;
  description: string | null;
  status: "active" | "saved" | "discarded";
  accepting_responses: boolean;
  total_participants: number;
  words: WordCount[];
};

export default function WordSessionResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const token = params.token as string;

  const [data, setData] = useState<ResultsResponse | null>(null);
  // Erro permanente (token inválido, sessão inexistente) — para o polling de vez.
  // Uma falha transitória (rede, blip do servidor) NÃO vira fatalError: loading
  // só fecha, data continua null, e o polling tenta de novo sozinho no próximo tick.
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("bubbles");

  const exportRef = useRef<HTMLDivElement>(null);
  const prevParticipantsRef = useRef<number | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/word-sessions/${id}/results`, {
        headers: { "x-results-token": token },
      });
      if (res.status === 401 || res.status === 403) {
        setFatalError("Link de resultados inválido.");
        setLoading(false);
        return;
      }
      if (res.status === 404) {
        setFatalError("Essa dinâmica não existe.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json = await res.json();
      // Evita re-renderizar (e reprocessar a nuvem/gráfico) quando o poll
      // trouxer exatamente os mesmos dados de antes.
      setData((prev) => (JSON.stringify(prev) === JSON.stringify(json) ? prev : json));
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
    if (data?.total_participants === undefined) return;
    if (
      prevParticipantsRef.current !== null &&
      data.total_participants > prevParticipantsRef.current
    ) {
      playSound("pop");
    }
    prevParticipantsRef.current = data.total_participants;
  }, [data?.total_participants]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
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
      link.download = `nuvem-de-palavras-${id}.png`;
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
    // Primeira tentativa falhou de forma transitória; o polling em segundo
    // plano continua tentando, sem precisar de reload manual.
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
          <p className="text-white/40 text-sm mt-1">
            {data.total_participants} resposta{data.total_participants === 1 ? "" : "s"}
            {!data.accepting_responses && " · pausado"}
          </p>
        </div>
        <div className="no-export flex gap-2 shrink-0">
          <div className="flex rounded-lg border border-white/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("bubbles")}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === "bubbles" ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10"
              }`}
            >
              Bolhas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("text")}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === "text" ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10"
              }`}
            >
              Texto
            </button>
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === "chart" ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10"
              }`}
            >
              Gráfico
            </button>
          </div>
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

      <div className="flex-1 relative">
        {viewMode === "chart" ? (
          <WordBarChart words={data.words} />
        ) : (
          <WordCloud words={data.words} mode={viewMode} />
        )}
      </div>
    </div>
  );
}
