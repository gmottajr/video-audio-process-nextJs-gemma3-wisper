"use client";

import { useTranscriberContext } from "@/contexts/TranscriberContext";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { X, CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * TranscriptionProgressScreen — REDESIGNED (v2.1)
 *
 * Drop-in replacement. Same hook contract (useTranscriberContext), same
 * default export.
 *
 * Changes:
 *   • Replaces the hard purple/blue/indigo gradient background with the
 *     app's native dark cosmos surface + aurora wash — consistent with
 *     the rest of /forge.
 *   • Hero progress: big numeric % + ETA + elapsed counter.
 *   • Phased pipeline status with mini-progress dots (audio prepared →
 *     Whisper inference → finalizing) replacing the generic "step list".
 *   • Anchored ForgeStepper at top so users keep their bearings.
 *   • Native local elapsed counter — independent of message-string parsing.
 */
export default function TranscriptionProgressScreen() {
  const { progress, loadingMessage, clearResult, isTranscribing } =
    useTranscriberContext();

  const [startedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    if (!isTranscribing) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [isTranscribing]);

  if (!isTranscribing) return null;

  const elapsedSec = Math.max(0, Math.round((now - startedAt) / 1000));
  const mm = Math.floor(elapsedSec / 60).toString();
  const ss = (elapsedSec % 60).toString().padStart(2, "0");

  const eta =
    elapsedSec > 5 && progress > 5 && progress < 99
      ? Math.max(1, Math.round(((100 - progress) / progress) * elapsedSec))
      : null;
  const etaStr =
    eta != null
      ? eta > 60
        ? `${Math.floor(eta / 60)}m ${(eta % 60).toString().padStart(2, "0")}s`
        : `${eta}s`
      : "—";

  const phases = [
    { label: "Audio prepared",            done: progress > 0, active: progress > 0 && progress <= 2 },
    { label: "Whisper inference",         done: progress > 95, active: progress > 2 && progress <= 95 },
    { label: "Finalizing transcription",  done: false,         active: progress > 95 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "oklch(14% 0.02 280)" }}
    >
      {/* aurora wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 30% 0%, rgba(148,68,255,0.22), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(38,128,255,0.16), transparent 65%)",
        }}
      />

      {/* top chrome */}
      <div className="relative container mx-auto px-4 pt-6 pb-3">
        <Breadcrumbs currentState="PROCESSING" onNavigate={() => {}} />
      </div>

      {/* main */}
      <div className="relative flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div
            className="rounded-2xl p-8 relative overflow-hidden"
            style={{
              background: "oklch(22% 0.025 280 / 0.7)",
              border: "1px solid oklch(38% 0.02 280 / 0.4)",
              backdropFilter: "blur(14px)",
              boxShadow:
                "0 20px 60px oklch(0% 0 0 / 0.4), 0 0 0 1px oklch(60% 0.20 290 / 0.06)",
            }}
          >
            {/* eyebrow */}
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: "oklch(74% 0.16 290)",
                  boxShadow: "0 0 10px oklch(74% 0.16 290)",
                  animation: "pulse 1.4s ease-in-out infinite",
                }}
              />
              <span
                className="font-mono text-[11px] tracking-[0.18em] uppercase"
                style={{ color: "oklch(74% 0.16 290)" }}
              >
                Transcribing · Whisper AI
              </span>
              <div className="flex-1" />
              <span
                className="font-mono text-[10px] tracking-[0.1em] px-2 py-1 rounded"
                style={{
                  background: "oklch(70% 0.18 155 / 0.1)",
                  border: "1px solid oklch(70% 0.18 155 / 0.25)",
                  color: "oklch(82% 0.14 155)",
                }}
              >
                100% LOCAL
              </span>
            </div>

            {/* big number + eta */}
            <div className="flex items-end justify-between mb-2">
              <div>
                <span
                  className="font-display font-bold tracking-tight tabular-nums leading-none"
                  style={{ fontSize: 64, color: "var(--text)" }}
                >
                  {progress}
                </span>
                <span
                  className="font-display font-medium"
                  style={{ fontSize: 32, color: "var(--text-muted)", marginLeft: 4 }}
                >
                  %
                </span>
              </div>
              <div className="text-right">
                <div
                  className="font-mono text-[10px] tracking-[0.14em] uppercase mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Est. remaining
                </div>
                <div
                  className="font-display font-semibold tabular-nums"
                  style={{ fontSize: 22, color: "var(--text)" }}
                >
                  {etaStr}
                </div>
              </div>
            </div>

            {/* progress bar */}
            <div
              className="relative h-2 rounded-full overflow-hidden mt-5"
              style={{ background: "oklch(28% 0.025 280)" }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg, oklch(60% 0.20 290), oklch(74% 0.16 215), oklch(78% 0.15 75))",
                  boxShadow: "0 0 18px oklch(60% 0.20 290 / 0.5)",
                }}
              />
              <div
                className="absolute inset-y-0 w-12 -translate-x-full animate-shimmer"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                  filter: "blur(2px)",
                }}
              />
            </div>

            {/* stat row */}
            <div className="grid grid-cols-3 gap-6 mt-7">
              {[
                { l: "Elapsed",    v: `${mm}:${ss}`,                                                                sub: "since start" },
                { l: "Throughput", v: progress > 0 && elapsedSec > 0 ? `${(progress / elapsedSec).toFixed(1)}%/s` : "—", sub: "linear" },
                { l: "Mode",       v: "Standard",                                                                   sub: "single worker" },
              ].map((s) => (
                <div key={s.l}>
                  <div
                    className="font-mono text-[10px] tracking-[0.12em] uppercase mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {s.l}
                  </div>
                  <div
                    className="font-display font-semibold tabular-nums"
                    style={{ fontSize: 18, color: "var(--text)", lineHeight: 1.1 }}
                  >
                    {s.v}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: "oklch(50% 0.02 280)" }}>
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* phases */}
            <div
              className="mt-6 pt-5 border-t flex flex-col gap-2"
              style={{ borderColor: "oklch(38% 0.02 280 / 0.4)" }}
            >
              {phases.map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  {p.done ? (
                    <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(70% 0.18 155)" }} />
                  ) : p.active ? (
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        background: "oklch(74% 0.16 290)",
                        boxShadow: "0 0 8px oklch(74% 0.16 290)",
                        animation: "pulse 1.2s ease-in-out infinite",
                      }}
                    />
                  ) : (
                    <Circle className="w-4 h-4" style={{ color: "oklch(40% 0.02 280)" }} />
                  )}
                  <span
                    className="text-sm"
                    style={{
                      color: p.done
                        ? "var(--text-muted)"
                        : p.active
                        ? "var(--text)"
                        : "oklch(50% 0.02 280)",
                      fontWeight: p.active ? 500 : 400,
                    }}
                  >
                    {p.label}
                  </span>
                  {p.active && loadingMessage && (
                    <span
                      className="ml-auto font-mono text-[10px] tracking-wide truncate max-w-[260px]"
                      style={{ color: "oklch(60% 0.02 280)" }}
                    >
                      {loadingMessage.replace(/^[⏳✅🎯⚡]+\s*/, "")}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* cancel */}
            <button
              onClick={() => {
                console.log("[TranscriptionProgressScreen] Cancelling transcription...");
                clearResult();
              }}
              className="w-full mt-7 px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all hover:scale-[1.01]"
              style={{
                background: "oklch(40% 0.16 25 / 0.12)",
                border: "1px solid oklch(60% 0.20 25 / 0.35)",
                color: "oklch(82% 0.14 25)",
              }}
            >
              <X className="w-4 h-4" />
              Cancel transcription
            </button>
          </div>

          <p
            className="text-center text-[11px] mt-5 font-mono tracking-wide"
            style={{ color: "oklch(50% 0.02 280)" }}
          >
            BROWSER-BASED AI · CPU INTENSIVE · NO DATA SENT TO SERVERS
          </p>
        </div>
      </div>
    </div>
  );
}
