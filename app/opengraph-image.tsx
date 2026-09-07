import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TECHS = ["React", "TypeScript", "GraphQL", "Node.js", "Next.js"];

// O mesmo mark "{C}" do favicon (ver scripts/gen-favicons.mjs), embutido como
// data URI porque o Satori do next/og não lê arquivo de public/ em runtime.
const ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="14" fill="#0a0a0a"/>' +
  '<path d="M20 12 C16 12 16 16 16 20 C16 25 15 28 12 32 C15 36 16 39 16 44 C16 48 16 52 20 52" fill="none" stroke="#15803d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M44 12 C48 12 48 16 48 20 C48 25 49 28 52 32 C49 36 48 39 48 44 C48 48 48 52 44 52" fill="none" stroke="#15803d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M39.68 24.84 A10.5 10.5 0 1 0 39.68 39.16" fill="none" stroke="#22c55e" stroke-width="7" stroke-linecap="round"/>' +
  "</svg>";
const ICON_DATA_URI = `data:image/svg+xml,${encodeURIComponent(ICON_SVG)}`;

export default function Image() {
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
        {/* Green left accent bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 6,
            height: "100%",
            background: "#22c55e",
          }}
        />

        {/* Brand mark */}
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori (next/og), não DOM */}
        <img
          src={ICON_DATA_URI}
          width={76}
          height={76}
          style={{ position: "absolute", top: 60, right: 80 }}
        />

        {/* Location */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: "auto",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />
          <span style={{ color: "#6b7280", fontSize: 20 }}>
            Cascavel, Brasil
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 90,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-2px",
              lineHeight: 1,
              marginBottom: 20,
            }}
          >
            Luiz Casara
          </div>

          <div
            style={{
              fontSize: 24,
              color: "#22c55e",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            Tech Lead · Senior Full-Stack Engineer
          </div>

          <div
            style={{
              fontSize: 22,
              color: "#9ca3af",
              marginBottom: 44,
              lineHeight: 1.5,
              maxWidth: 680,
            }}
          >
            10+ anos construindo software de alta criticidade em fintech.
            SLA ≤20ms · 350+ TPS
          </div>

          {/* Tech badges */}
          <div style={{ display: "flex", gap: 12 }}>
            {TECHS.map((tech) => (
              <div
                key={tech}
                style={{
                  background: "#18181b",
                  border: "1px solid #27272a",
                  color: "#9ca3af",
                  padding: "8px 18px",
                  borderRadius: 8,
                  fontSize: 18,
                }}
              >
                {tech}
              </div>
            ))}
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 80,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />
          <span style={{ color: "#4b5563", fontSize: 20 }}>luizcasara.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
