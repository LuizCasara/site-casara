"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  computeFontSizes,
  normalizeWord,
  rgbToCss,
  FONT_SIZE_MIN_PX,
  FONT_SIZE_MAX_PX,
  HOT_ACCENT_RGB,
  type WordCount,
  type WordCountWithSize,
} from "@/lib/word-cloud";

const PALETTE = [
  "#F97316",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#14B8A6",
  "#D946EF",
];

// Modo texto: uma única rampa de cor que se intensifica com a frequência,
// em vez da paleta cíclica das bolhas. A base já precisa ser legível sozinha
// (sem depender do glow) — só a saturação/brilho/glow aumentam com o count.
// A ponta "quente" (HOT_ACCENT_RGB) é a mesma cor usada no modo Gráfico.
const TEXT_LOW_RGB: [number, number, number] = [186, 197, 219]; // slate-300 acinzentado, ainda bem legível

export type WordCloudMode = "bubbles" | "text";

type Props = {
  words: WordCount[];
  mode?: WordCloudMode;
};

type PlacedWord = WordCountWithSize & {
  norm: string;
  width: number;
  height: number;
  x: number; // offset a partir do centro do container, em px
  y: number;
};

// Bolhas precisam de respiro pro fundo/borda; texto puro fica mais denso.
const PAD_X = { bubbles: 24, text: 6 };
const PAD_Y = { bubbles: 16, text: 0 };
const GAP = { bubbles: 8, text: 2 };
const FIT_PADDING = 0.9; // margem de respiro ao encaixar tudo no container

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** 0 (menos frequente) a 1 (mais frequente), na mesma escala usada pro fontSize. */
function intensityOf(fontSize: number): number {
  const t = (fontSize - FONT_SIZE_MIN_PX) / (FONT_SIZE_MAX_PX - FONT_SIZE_MIN_PX);
  return Math.min(1, Math.max(0, t));
}

function lerpRgb(t: number, from: [number, number, number], to: [number, number, number]): [number, number, number] {
  return [
    Math.round(from[0] + (to[0] - from[0]) * t),
    Math.round(from[1] + (to[1] - from[1]) * t),
    Math.round(from[2] + (to[2] - from[2]) * t),
  ];
}

let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureContext(): CanvasRenderingContext2D {
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  return measureCtx!;
}

/** Empacota as palavras ao redor do centro do container, maiores primeiro,
 * usando busca em espiral para achar um espaço livre sem sobreposição —
 * o mesmo princípio de geradores clássicos de nuvem de palavras (tipo d3-cloud). */
function packWords(
  sized: WordCountWithSize[],
  containerWidth: number,
  containerHeight: number,
  mode: WordCloudMode
): PlacedWord[] {
  if (sized.length === 0 || containerWidth === 0 || containerHeight === 0) return [];

  const padX = PAD_X[mode];
  const padY = PAD_Y[mode];
  const gap = GAP[mode];

  const ctx = getMeasureContext();
  const measured = sized.map((w) => {
    ctx.font = `700 ${w.fontSize}px Quicksand, sans-serif`;
    const metrics = ctx.measureText(w.word);
    return {
      ...w,
      norm: normalizeWord(w.word),
      width: metrics.width + padX,
      height: w.fontSize * 1.15 + padY,
    };
  });

  // Maiores (mais frequentes) primeiro, perto do centro; empates resolvidos
  // por ordem alfabética pra manter a posição estável entre polls.
  const sorted = [...measured].sort((a, b) => b.fontSize - a.fontSize || a.norm.localeCompare(b.norm));

  const placed: PlacedWord[] = [];
  // Espaço de busca generoso: como o resultado é reescalado pra caber no
  // container (ver fitScale), o raio máximo aqui não precisa se limitar ao
  // tamanho visível — só precisa ser grande o bastante pra sempre achar um espaço livre.
  const maxRadius = (containerWidth + containerHeight) * 3;

  function overlaps(x: number, y: number, w: number, h: number) {
    return placed.some(
      (p) => Math.abs(x - p.x) * 2 < w + p.width + gap * 2 && Math.abs(y - p.y) * 2 < h + p.height + gap * 2
    );
  }

  for (const item of sorted) {
    let x = 0;
    let y = 0;
    if (overlaps(x, y, item.width, item.height)) {
      // Ângulo inicial determinístico por palavra (hash do texto), pra não
      // reembaralhar a posição a cada poll — só o necessário pra achar espaço.
      let angle = (hashString(item.norm) % 360) * (Math.PI / 180);
      let radius = 4;
      const angleStep = 0.32;
      const radiusStep = 2.6;
      while (radius < maxRadius) {
        x = radius * Math.cos(angle);
        y = radius * Math.sin(angle) * 0.72;
        if (!overlaps(x, y, item.width, item.height)) break;
        angle += angleStep;
        radius += radiusStep;
      }
    }
    placed.push({ ...item, x, y });
  }

  return placed;
}

export default function WordCloud({ words, mode = "bubbles" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState<string | null>(null);

  const colorMapRef = useRef<Map<string, string>>(new Map());
  const prevCountsRef = useRef<Map<string, number>>(new Map());
  const floatSeedsRef = useRef<Map<string, { duration: number; delay: number; drift: number }>>(
    new Map()
  );
  const [pulsing, setPulsing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sized = useMemo(() => computeFontSizes(words), [words]);
  const placed = useMemo(
    () => packWords(sized, size.width, size.height, mode),
    [sized, size.width, size.height, mode]
  );

  // Escala tudo pra caber no container, não importa quantas palavras existam
  // — evita que palavras fiquem cortadas fora da tela quando a nuvem cresce.
  const fitScale = useMemo(() => {
    if (placed.length === 0 || size.width === 0 || size.height === 0) return 1;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const w of placed) {
      minX = Math.min(minX, w.x - w.width / 2);
      maxX = Math.max(maxX, w.x + w.width / 2);
      minY = Math.min(minY, w.y - w.height / 2);
      maxY = Math.max(maxY, w.y + w.height / 2);
    }
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    if (contentWidth <= 0 || contentHeight <= 0) return 1;
    const scaleX = (size.width * FIT_PADDING) / contentWidth;
    const scaleY = (size.height * FIT_PADDING) / contentHeight;
    return Math.min(1, scaleX, scaleY);
  }, [placed, size.width, size.height]);

  // Detecta palavras cuja contagem cresceu desde o último poll e dispara um "pulso".
  useEffect(() => {
    const prev = prevCountsRef.current;
    const grown = new Set<string>();
    for (const w of words) {
      const norm = normalizeWord(w.word);
      if (w.count > (prev.get(norm) ?? 0)) grown.add(norm);
    }

    const next = new Map<string, number>();
    for (const w of words) next.set(normalizeWord(w.word), w.count);
    prevCountsRef.current = next;

    if (grown.size > 0 && prev.size > 0) {
      setPulsing(grown);
      const t = setTimeout(() => setPulsing(new Set()), 600);
      return () => clearTimeout(t);
    }
  }, [words]);

  function colorFor(norm: string) {
    const map = colorMapRef.current;
    if (!map.has(norm)) {
      map.set(norm, PALETTE[map.size % PALETTE.length]);
    }
    return map.get(norm)!;
  }

  function floatFor(norm: string) {
    const map = floatSeedsRef.current;
    if (!map.has(norm)) {
      map.set(norm, {
        duration: 3 + Math.random() * 2.5,
        delay: Math.random() * 1.5,
        drift: 6 + Math.random() * 6,
      });
    }
    return map.get(norm)!;
  }

  const isBubbles = mode === "bubbles";

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {sized.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-lg">
          Aguardando as primeiras respostas...
        </div>
      )}

      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: "50% 50%" }}
        animate={{ scale: fitScale }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
      >
        <AnimatePresence>
          {placed.map((w) => {
            const float = floatFor(w.norm);
            const isPulsing = pulsing.has(w.norm);
            const isHovered = hovered === w.norm;

            let color: string;
            let textShadow: string | undefined;
            if (isBubbles) {
              color = colorFor(w.norm);
            } else {
              const t = intensityOf(w.fontSize);
              const rgb = lerpRgb(t, TEXT_LOW_RGB, HOT_ACCENT_RGB);
              color = rgbToCss(rgb);
              const glow = 3 + t * 22;
              textShadow = `0 0 ${glow.toFixed(0)}px ${rgbToCss(rgb, 0.25 + t * 0.55)}`;
            }

            return (
              <motion.div
                key={w.norm}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: isPulsing ? [1, 1.25, 1] : 1,
                  opacity: 1,
                  y: isBubbles ? [0, -float.drift, 0] : 0,
                  rotate: isBubbles ? [-1.5, 1.5, -1.5] : 0,
                }}
                whileHover={{ scale: 1.18, zIndex: 40 }}
                exit={{ scale: 0, opacity: 0 }}
                onHoverStart={() => setHovered(w.norm)}
                onHoverEnd={() => setHovered((prev) => (prev === w.norm ? null : prev))}
                transition={{
                  layout: { type: "spring", stiffness: 200, damping: 22 },
                  scale: isPulsing ? { duration: 0.5, ease: "easeInOut" } : { duration: 0.4 },
                  y: isBubbles
                    ? { duration: float.duration, delay: float.delay, repeat: Infinity, ease: "easeInOut" }
                    : undefined,
                  rotate: isBubbles
                    ? { duration: float.duration * 1.3, delay: float.delay, repeat: Infinity, ease: "easeInOut" }
                    : undefined,
                }}
                className={`absolute select-none whitespace-nowrap font-bold cursor-default ${
                  isBubbles ? "rounded-full px-5 py-2 shadow-lg" : "rounded-md px-2 py-1"
                }`}
                style={{
                  left: size.width / 2 + w.x - w.width / 2,
                  top: size.height / 2 + w.y - w.height / 2,
                  fontSize: `${w.fontSize}px`,
                  color,
                  backgroundColor: isBubbles ? `${color}33` : "transparent",
                  border: isBubbles ? `2px solid ${color}` : "none",
                  textShadow,
                }}
              >
                {w.word}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-black/85 text-white text-xs font-normal whitespace-nowrap pointer-events-none z-50"
                    >
                      {w.count} resposta{w.count === 1 ? "" : "s"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
