import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const G = "#D4AF37";   // gold
const IV = "#F5F0E8";  // ivory

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#060810",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {/* Radial glow central */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(212,175,55,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Moldura dourada — linha superior */}
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 64,
            right: 64,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${G}88, ${G}, ${G}88, transparent)`,
          }}
        />
        {/* Moldura dourada — linha inferior */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 64,
            right: 64,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${G}88, ${G}, ${G}88, transparent)`,
          }}
        />

        {/* Label superior */}
        <div
          style={{
            position: "absolute",
            top: 58,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ width: 28, height: 1, background: `${G}66` }} />
          <span
            style={{
              color: `${G}bb`,
              fontSize: 13,
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 300,
            }}
          >
            Convite de Casamento
          </span>
          <div style={{ width: 28, height: 1, background: `${G}66` }} />
        </div>

        {/* Conteúdo central */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Diamante */}
          <div
            style={{
              color: G,
              fontSize: 22,
              marginBottom: 36,
              opacity: 0.9,
            }}
          >
            ♦
          </div>

          {/* Nomes */}
          <div
            style={{
              fontSize: 108,
              fontWeight: 300,
              color: IV,
              letterSpacing: "-1px",
              lineHeight: 1,
              marginBottom: 22,
              display: "flex",
              alignItems: "baseline",
              gap: 0,
            }}
          >
            <span>Luiz&nbsp;</span>
            <span style={{ color: G, fontStyle: "italic", fontSize: 90 }}>&amp;</span>
            <span>&nbsp;Kátia</span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              fontStyle: "italic",
              color: "#B8A878",
              marginBottom: 40,
              letterSpacing: "0.06em",
            }}
          >
            estão se casando
          </div>

          {/* Linha separadora */}
          <div
            style={{
              width: 220,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${G}99, transparent)`,
              marginBottom: 32,
            }}
          />

          {/* Data */}
          <div
            style={{
              fontSize: 32,
              color: G,
              letterSpacing: "0.32em",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 300,
            }}
          >
            11 · 07 · 2026
          </div>
        </div>

        {/* Label inferior */}
        <div
          style={{
            position: "absolute",
            bottom: 58,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ width: 28, height: 1, background: `${G}44` }} />
          <span
            style={{
              color: "#3a3040",
              fontSize: 13,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            luizcasara.com/casamento
          </span>
          <div style={{ width: 28, height: 1, background: `${G}44` }} />
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
