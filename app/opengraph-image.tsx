import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TECHS = ["React", "TypeScript", "GraphQL", "Node.js", "Next.js"];

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
