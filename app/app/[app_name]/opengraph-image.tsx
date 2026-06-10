import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TEMPERAMENTS = [
  { label: "Sanguíneo", color: "#f87171" },
  { label: "Colérico", color: "#fbbf24" },
  { label: "Melancólico", color: "#60a5fa" },
  { label: "Fleumático", color: "#4ade80" },
];

const APP_META: Record<string, { title: string; description: string; accent: string }> = {
  "descubra-seu-temperamento": {
    title: "Descubra seu\nTemperamento",
    description: "Qual dos quatro temperamentos é predominante em você?",
    accent: "#a855f7",
  },
  "rule-of-three": {
    title: "Regra de Três",
    description: "Calcule proporções automaticamente.",
    accent: "#22c55e",
  },
  "compound-interest": {
    title: "Juros Compostos",
    description: "Simule crescimento de investimentos.",
    accent: "#22c55e",
  },
  "qr-code": {
    title: "Gerador de QR Code",
    description: "Crie QR codes personalizados.",
    accent: "#22c55e",
  },
  currency: {
    title: "Conversor de Moedas",
    description: "Cotações em tempo real.",
    accent: "#22c55e",
  },
  bitcoin: {
    title: "Conversor de Bitcoin",
    description: "BTC para real, dólar e outras moedas.",
    accent: "#f97316",
  },
};

export default async function Image({
  params,
}: {
  params: Promise<{ app_name: string }>;
}) {
  const { app_name } = await params;
  const meta = APP_META[app_name] ?? {
    title: "Mini Apps",
    description: "Ferramentas interativas por Luiz Casara.",
    accent: "#22c55e",
  };

  const isTemperamento = app_name === "descubra-seu-temperamento";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "64px 80px",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 5,
            background: isTemperamento
              ? "linear-gradient(90deg, #f87171 25%, #fbbf24 25% 50%, #60a5fa 50% 75%, #4ade80 75%)"
              : meta.accent,
          }}
        />

        {/* Category label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 40,
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: meta.accent,
            }}
          />
          <span
            style={{
              color: meta.accent,
              fontSize: 18,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {isTemperamento ? "Desenvolvimento Pessoal" : "Mini Apps"}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: isTemperamento ? 82 : 72,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-1px",
            lineHeight: 1.05,
            marginBottom: 28,
            whiteSpace: "pre-line",
          }}
        >
          {meta.title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 26,
            color: "#9ca3af",
            lineHeight: 1.4,
            marginBottom: "auto",
            maxWidth: 700,
          }}
        >
          {meta.description}
        </div>

        {/* Temperament badges */}
        {isTemperamento && (
          <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>
            {TEMPERAMENTS.map(({ label, color }) => (
              <div
                key={label}
                style={{
                  background: `${color}18`,
                  border: `1px solid ${color}50`,
                  color: color,
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        )}

        {/* URL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#4b5563", fontSize: 20 }}>
            luizcasara.com/app/{app_name}
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}