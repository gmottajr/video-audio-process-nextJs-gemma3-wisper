"use client";

import { useEffect } from "react";
import { Mic, AlertCircle, RefreshCw } from "lucide-react";
import { useTranscriberContext } from "@/contexts/TranscriberContext";

interface ModelLoadingScreenProps {
  onComplete?: () => void;
  progress?: number;
  modelName?: string;
  onCancel?: () => void;
}

const STEPS = [
  { label: "Initializing AI worker",     threshold: 0  },
  { label: "Loading model files",        threshold: 10 },
  { label: "Initializing inference engine", threshold: 90 },
  { label: "Ready for transcription",    threshold: 100 },
];

function stepColor(progress: number, threshold: number, nextThreshold: number) {
  if (progress >= nextThreshold) return "oklch(70% 0.18 155)";   // done — teal
  if (progress >= threshold)     return "oklch(78% 0.15 75)";    // active — amber
  return "oklch(38% 0.02 280)";                                   // pending — muted
}

export default function ModelLoadingScreen({
  onComplete,
  progress: externalProgress,
  modelName,
  onCancel,
}: ModelLoadingScreenProps) {
  const context = useTranscriberContext();

  const isModelLoading  = externalProgress !== undefined ? externalProgress < 100 : context.isModelLoading;
  const isModelLoaded   = externalProgress !== undefined ? externalProgress === 100 : context.isModelLoaded;
  const progress        = externalProgress !== undefined ? externalProgress : context.progress;
  const loadingMessage  = modelName ? `Loading ${modelName}…` : (context.loadingMessage || "Initializing…");
  const error           = context.error;

  useEffect(() => {
    if (isModelLoaded && !isModelLoading && onComplete) {
      const t = setTimeout(onComplete, 500);
      return () => clearTimeout(t);
    }
  }, [isModelLoaded, isModelLoading, onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "oklch(14% 0.018 280 / 0.88)", backdropFilter: "blur(12px)" }}
    >
      <div className="w-full max-w-md mx-4">
        {/* Icon + title */}
        <div className="text-center mb-7">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: "oklch(60% 0.20 290 / 0.14)",
              border: "1px solid oklch(60% 0.20 290 / 0.28)",
            }}
          >
            <Mic className="w-7 h-7" style={{ color: "oklch(74% 0.16 290)" }} />
          </div>
          <h2
            className="font-display font-semibold tracking-tight"
            style={{ fontSize: "clamp(20px, 3vw, 26px)", color: "var(--text)" }}
          >
            AI Transcription
          </h2>
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase mt-1" style={{ color: "var(--text-muted)" }}>
            Initializing Whisper AI Model
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: "oklch(22% 0.025 280 / 0.80)",
            border: "1px solid oklch(38% 0.02 280 / 0.40)",
            backdropFilter: "blur(10px)",
          }}
        >
          {error ? (
            /* ── Error state ── */
            <div className="text-center">
              <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "oklch(68% 0.22 25)" }} />
              <h3 className="font-jazz text-[17px] mb-2" style={{ color: "var(--text)" }}>
                Loading Failed
              </h3>
              <p className="text-sm text-aura-muted mb-5 leading-relaxed">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: "oklch(60% 0.20 290 / 0.12)",
                  border: "1px solid oklch(60% 0.20 290 / 0.30)",
                  color: "oklch(74% 0.16 290)",
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : (
            /* ── Loading state ── */
            <>
              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-aura-muted truncate pr-2">{loadingMessage}</span>
                  <span
                    className="font-mono text-[12px] font-semibold shrink-0"
                    style={{ color: "oklch(74% 0.16 290)" }}
                  >
                    {progress}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "oklch(28% 0.025 280 / 0.6)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, oklch(60% 0.20 290), oklch(70% 0.18 155))",
                    }}
                  />
                </div>
              </div>

              {/* Step list */}
              <div className="space-y-2.5 mb-6">
                {STEPS.map(({ label, threshold }, i) => {
                  const next = STEPS[i + 1]?.threshold ?? 101;
                  const color = stepColor(progress, threshold, next);
                  const isActive = progress >= threshold && progress < next;
                  return (
                    <div key={label} className="flex items-center gap-2.5">
                      <div
                        className="w-2 h-2 rounded-full shrink-0 transition-colors duration-300"
                        style={{
                          background: color,
                          boxShadow: isActive ? `0 0 6px ${color}` : "none",
                        }}
                      />
                      <span
                        className="text-[12.5px] transition-colors duration-300"
                        style={{ color: progress >= threshold ? "var(--text)" : "var(--text-muted)" }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                className="pt-5 border-t"
                style={{ borderColor: "oklch(38% 0.02 280 / 0.30)" }}
              >
                <p className="font-mono text-[10px] tracking-[0.10em] text-aura-muted text-center leading-relaxed">
                  First load: 30–60 s · Model cached for instant reload
                </p>

                {onCancel && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={onCancel}
                      className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        background: "oklch(60% 0.22 25 / 0.10)",
                        border: "1px solid oklch(60% 0.22 25 / 0.25)",
                        color: "oklch(72% 0.18 25)",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer note */}
        <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-center mt-5" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          Whisper AI · Running locally in your browser
        </p>
      </div>
    </div>
  );
}
