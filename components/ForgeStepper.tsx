"use client";

import { Upload, Settings2, Cpu, FileCheck } from "lucide-react";

type ForgeStep = "IDLE" | "INSPECT" | "PROCESSING" | "DONE" | "ERROR";

interface ForgeStepperProps {
  currentState: ForgeStep;
  className?: string;
}

const STEPS: Array<{ key: ForgeStep; label: string; sub: string; icon: typeof Upload }> = [
  { key: "IDLE",       label: "Select",     sub: "media input",      icon: Upload    },
  { key: "INSPECT",    label: "Configure",  sub: "mode · model",     icon: Settings2 },
  { key: "PROCESSING", label: "Processing", sub: "AI inference",     icon: Cpu       },
  { key: "DONE",       label: "Complete",   sub: "review · export",  icon: FileCheck },
];

const ORDER: ForgeStep[] = ["IDLE", "INSPECT", "PROCESSING", "DONE"];

/**
 * ForgeStepper — 4-step pill stepper that anchors the workflow.
 * ERROR sub-state mirrors the last reached step's position.
 *
 * NEW component — drop into components/ForgeStepper.tsx
 */
export function ForgeStepper({ currentState, className = "" }: ForgeStepperProps) {
  const activeIdx = Math.max(0, ORDER.indexOf(currentState));

  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      {STEPS.map((step, i) => {
        const active = i === activeIdx;
        const done = i < activeIdx;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-2.5 rounded-full transition-all duration-300"
              style={{
                padding: active ? "8px 14px" : "8px 10px",
                background: active
                  ? "oklch(24% 0.06 290 / 0.6)"
                  : "oklch(22% 0.025 280 / 0.4)",
                border: active
                  ? "1px solid oklch(60% 0.20 290 / 0.45)"
                  : "1px solid oklch(38% 0.02 280 / 0.3)",
                boxShadow: active ? "0 0 0 4px oklch(60% 0.20 290 / 0.08)" : "none",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-full transition-colors"
                style={{
                  width: 22,
                  height: 22,
                  background: done
                    ? "oklch(70% 0.18 155)"
                    : active
                    ? "oklch(60% 0.20 290)"
                    : "oklch(30% 0.02 280)",
                  color: done || active ? "white" : "oklch(60% 0.02 280)",
                }}
              >
                {done ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>
              <div className="flex flex-col leading-tight">
                <span
                  className="font-mono text-[11px] tracking-[0.14em] uppercase"
                  style={{
                    color: active
                      ? "var(--text)"
                      : done
                      ? "var(--text-muted)"
                      : "oklch(50% 0.02 280)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {step.label}
                </span>
                {active && (
                  <span className="text-[9px] tracking-wider uppercase" style={{ color: "oklch(74% 0.16 290)" }}>
                    {step.sub}
                  </span>
                )}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="h-px transition-all duration-300"
                style={{
                  width: 18,
                  background:
                    i < activeIdx
                      ? "oklch(70% 0.18 155 / 0.6)"
                      : "oklch(38% 0.02 280 / 0.3)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
