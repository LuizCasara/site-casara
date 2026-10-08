import { ImageResponse } from "next/og";
import { TEMPERAMENT_INFO } from "@/apps/desenvolvimento-pessoal/temperament-info";
import { LOVE_LANGUAGE_INFO } from "@/apps/desenvolvimento-pessoal/love-language-info";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Chip = { label: string; color: string };

/**
 * OG dos testes de personalidade: discreto e objetivo — eyebrow, título, uma
 * linha do que o teste faz e os resultados possíveis. O site só aparece como
 * um rodapé apagado, de propósito.
 */
const TESTS: Record<
  string,
  { eyebrow: string; title: string; description: string; chips: Chip[] }
> = {
  "descubra-seu-temperamento": {
    eyebrow: "Teste de temperamento",
    title: "Descubra seu\nTemperamento",
    description:
      "Escolhas entre duas opções para identificar qual dos quatro temperamentos predomina em você.",
    chips: Object.values(TEMPERAMENT_INFO).map((t) => ({
      label: t.displayName,
      color: t.hexColor,
    })),
  },
  "descubra-sua-linguagem-do-amor": {
    eyebrow: "Teste das 5 linguagens do amor",
    title: "Descubra sua\nLinguagem do Amor",
    description:
      "Escolhas entre duas opções para descobrir como você prefere receber carinho.",
    chips: Object.values(LOVE_LANGUAGE_INFO).map((l) => ({
      label: l.displayName,
      color: l.hexColor,
    })),
  },
};

const APP_META: Record<string, { title: string; description: string; accent: string }> = {
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
  const test = TESTS[app_name];

  if (test) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#0b0b0e",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 96px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              color: "#8b8b96",
              fontSize: 22,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            {test.eyebrow}
          </div>

          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              color: "#f4f4f5",
              letterSpacing: "-2px",
              lineHeight: 1.04,
              whiteSpace: "pre-line",
              marginBottom: 32,
            }}
          >
            {test.title}
          </div>

          <div
            style={{
              fontSize: 28,
              color: "#9ca3af",
              lineHeight: 1.4,
              maxWidth: 820,
              marginBottom: 52,
            }}
          >
            {test.description}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {test.chips.map(({ label, color }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "1px solid #26262d",
                  color: "#d4d4d8",
                  padding: "10px 18px",
                  borderRadius: 999,
                  fontSize: 22,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: color,
                  }}
                />
                {label}
              </div>
            ))}
          </div>

          <div
            style={{
              position: "absolute",
              right: 96,
              bottom: 48,
              color: "#4b4b55",
              fontSize: 20,
            }}
          >
            luizcasara.com
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const meta = APP_META[app_name] ?? {
    title: "Mini Apps",
    description: "Ferramentas interativas por Luiz Casara.",
    accent: "#22c55e",
  };

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
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 5,
            background: meta.accent,
          }}
        />

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
            Mini Apps
          </span>
        </div>

        <div
          style={{
            fontSize: 72,
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

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#4b5563", fontSize: 20 }}>
            luizcasara.com/app/{app_name}
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
