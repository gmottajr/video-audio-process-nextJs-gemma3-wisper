"use client";

import { useEffect, useState } from "react";
import { ForgeStepper } from "@/components/ForgeStepper";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Zap, X, CheckCircle2, Circle } from "lucide-react";
import type { FastModeProgress } from "@/types/fast-mode";

interface FastModeProcessingScreenProps {
  progress: FastModeProgress;
  onCancel: () => void;
}

/**
 * FastModeProcessingScreen — REDESIGNED (v2.2)
 *
 * Full-screen overlay for Fast Mode parallel transcription. Matches the
 * design-canvas preview pixel-for-pixel:
 *   • Cosmos surface + aurora wash
 *   • Hero progress (Space Grotesk % + ETA)
 *   • Chunk-map grid (done / active / queued cells)
 *   • Phased pipeline (Initializing → Chunking → Transcribing → Merging)
 *   • Cancel button at the bottom
 *
 * Replaces the inline JSX block in app/forge/page.tsx.
 * Same data contract as FastModeProgressIndicator (FastModeProgress type).
 */
export function FastModeProcessingScreen({ progress, onCancel }: FastModeProcessingScreenProps) {
  const { phase, percent, chunksCompleted, chunksTotal, workersActive, etaSeconds } = progress;

  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const elapsedSec = Math.max(0, Math.round((now - startedAt) / 1000));
  const elapsedStr = `${Math.floor(elapsedSec / 60)}:${(elapsedSec % 60).toString().padStart(2, "0")}`;

  const formatETA = (s?: number) => {
    if (!s || s <= 0) return "—";
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r > 0 ? `${m}m ${r.toString().padStart(2, "0")}s` : `${m}m`;
  };

  // throughput (chunks per minute)
  const throughput =
    chunksCompleted > 0 && elapsedSec > 0
      ? `${((chunksCompleted / elapsedSec) * 60).toFixed(1)}/min`
      : "—";

  // chunk grid cells
  const chunks =
    chunksTotal > 0
      ? Array.from({ length: chunksTotal }, (_, i) => {
          if (i < chunksCompleted) return "done" as const;
          if (i < chunksCompleted + workersActive) return "active" as const;
          return "queued" as const;
        })
      : [];

  // phased pipeline
  const phases: Array<{ label: string; key: FastModeProgress["phase"] }> = [
    { label: "Initializing",       key: "initializing" },
    { label: "Parallel inference", key: "processing" },
    { label: "Merging results",    key: "merging" },
  ];
  const phaseOrder = phases.findIndex((p) => p.key === phase);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background: "#08080f",
        color: "#f3f3f8",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* aurora wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 40% at 15% 10%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(40% 30% at 85% 90%, rgba(34,211,238,0.12), transparent 60%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 fg-constellation" />

      {/* top chrome */}
      <div className="relative container mx-auto px-4 pt-6 pb-3">
        <Breadcrumbs currentState="PROCESSING" onNavigate={() => {}} />
      </div>
      <div className="relative container mx-auto px-4 pb-6">
        <ForgeStepper currentState="PROCESSING" />
      </div>

      {/* main */}
      <div className="relative flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-4xl">
          {/* HERO CARD */}
          <div
            style={{
              background: "linear-gradient(180deg, #14141f 0%, #0d0d18 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: 28,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 100% at 30% 0%, rgba(245,158,11,0.10), transparent 70%)",
              }}
            />

            <div className="relative">
              {/* eyebrow */}
              <div className="flex items-center gap-2 mb-4">
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "#fbbf24",
                    boxShadow: "0 0 10px #fbbf24",
                    animation: "fgPulse 1.4s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#fbbf24",
                  }}
                >
                  Fast Mode · Parallel Transcription
                </span>
                <div className="flex-1" />
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: 10,
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: "rgba(245,158,11,0.10)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    color: "#f59e0b",
                    letterSpacing: "0.1em",
                  }}
                >
                  {workersActive} WORKERS · DISTIL-WHISPER
                </span>
              </div>

              {/* big number + eta */}
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 56,
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      color: "#f3f3f8",
                    }}
                  >
                    {percent}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 32,
                      fontWeight: 500,
                      color: "#8a8a9c",
                      marginLeft: 4,
                    }}
                  >
                    %
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#8a8a9c",
                      marginBottom: 4,
                    }}
                  >
                    Estimated · remaining
                  </div>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 22,
                      fontWeight: 600,
                      color: "#f3f3f8",
                    }}
                  >
                    {formatETA(etaSeconds)}
                  </div>
                </div>
              </div>

              {/* progress bar */}
              <div
                style={{
                  position: "relative",
                  height: 8,
                  borderRadius: 4,
                  background: "#232333",
                  overflow: "hidden",
                  marginTop: 14,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${percent}%`,
                    borderRadius: 4,
                    background:
                      "linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)",
                    boxShadow: "0 0 18px rgba(245,158,11,0.45)",
                    transition: "width 0.6s ease-out",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: `${Math.max(0, percent - 2)}%`,
                    top: 0,
                    bottom: 0,
                    width: "4%",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
                    filter: "blur(2px)",
                    animation: "fgShimmer 1.6s linear infinite",
                  }}
                />
              </div>

              {/* stat row */}
              <div className="grid grid-cols-4 gap-4" style={{ marginTop: 20 }}>
                {[
                  { l: "Chunks",     v: `${chunksCompleted}/${chunksTotal || "?"}`, sub: "completed" },
                  { l: "Workers",    v: `${workersActive}`,                           sub: "parallel" },
                  { l: "Throughput", v: throughput,                                   sub: "chunks/min" },
                  { l: "Elapsed",    v: elapsedStr,                                   sub: "since start" },
                ].map((s) => (
                  <div key={s.l}>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#8a8a9c",
                        marginBottom: 4,
                      }}
                    >
                      {s.l}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 22,
                        fontWeight: 600,
                        lineHeight: 1.1,
                        color: s.l === "Workers" ? "#fbbf24" : "#f3f3f8",
                      }}
                    >
                      {s.v}
                    </div>
                    <div style={{ fontSize: 11, color: "#5b5b6e", marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CHUNK MAP + PHASES (side by side on wide, stacked on narrow) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 mt-4">
            {/* Chunk grid */}
            <div
              style={{
                background: "linear-gradient(180deg, #14141f 0%, #0d0d18 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                padding: 18,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#8a8a9c",
                  }}
                >
                  Chunk map · {chunksTotal} segments
                </div>
                <div className="flex gap-3">
                  {[
                    ["Done",   "#10b981"],
                    ["Active", "#a78bfa"],
                    ["Queued", "#5b5b6e"],
                  ].map(([t, c]) => (
                    <div key={t} className="flex items-center gap-1.5">
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          fontSize: 10,
                          color: "#8a8a9c",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {t}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {chunks.length > 0 ? (
                <div
                  className="grid gap-1.5"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(20, chunks.length)}, minmax(0, 1fr))`,
                  }}
                >
                  {chunks.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        aspectRatio: "1",
                        borderRadius: 5,
                        background:
                          s === "done"
                            ? "linear-gradient(135deg, rgba(16,185,129,0.30), rgba(16,185,129,0.10))"
                            : s === "active"
                            ? "linear-gradient(135deg, rgba(245,158,11,0.40), rgba(245,158,11,0.15))"
                            : "#1b1b28",
                        border:
                          s === "done"
                            ? "1px solid rgba(16,185,129,0.4)"
                            : s === "active"
                            ? "1px solid rgba(245,158,11,0.55)"
                            : "1px solid rgba(255,255,255,0.06)",
                        boxShadow: s === "active" ? "0 0 0 3px rgba(245,158,11,0.1)" : "none",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="text-center py-6"
                  style={{ color: "#5b5b6e", fontSize: 12 }}
                >
                  Preparing audio chunks…
                </div>
              )}
            </div>

            {/* Phases */}
            <div
              style={{
                background: "linear-gradient(180deg, #14141f 0%, #0d0d18 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                padding: 18,
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#8a8a9c",
                  marginBottom: 12,
                }}
              >
                Pipeline
              </div>
              <div className="flex flex-col gap-2.5">
                {phases.map((p, i) => {
                  const done = phaseOrder > i;
                  const active = phaseOrder === i;
                  return (
                    <div key={p.label} className="flex items-center gap-3">
                      {done ? (
                        <CheckCircle2 className="w-4 h-4" style={{ color: "#34d399" }} />
                      ) : active ? (
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 999,
                            background: "#fbbf24",
                            boxShadow: "0 0 8px #fbbf24",
                            animation: "fgPulse 1.2s ease-in-out infinite",
                          }}
                        />
                      ) : (
                        <Circle className="w-4 h-4" style={{ color: "#5b5b6e" }} />
                      )}
                      <span
                        style={{
                          fontSize: 13,
                          color: done ? "#8a8a9c" : active ? "#f3f3f8" : "#5b5b6e",
                          fontWeight: active ? 500 : 400,
                        }}
                      >
                        {p.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cancel */}
          <div className="flex items-center justify-center mt-6">
            <button
              onClick={onCancel}
              className="flex items-center gap-2 transition-transform hover:scale-[1.01]"
              style={{
                padding: "12px 28px",
                borderRadius: 10,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.4)",
                color: "#fca5a5",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <X className="w-4 h-4" />
              Cancel transcription
            </button>
          </div>

          {/* footer */}
          <p
            className="text-center"
            style={{
              fontSize: 11,
              marginTop: 16,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              letterSpacing: "0.1em",
              color: "#5b5b6e",
            }}
          >
            BROWSER-BASED · PARALLEL WORKERS · NO DATA SENT TO SERVERS
          </p>
        </div>
      </div>
    </div>
  );
}

export default FastModeProcessingScreen;
