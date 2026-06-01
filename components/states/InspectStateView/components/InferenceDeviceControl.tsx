"use client";

import type { DevicePreference } from "@/types/fast-mode";
import type { DetectedCaps } from "../types";

interface InferenceDeviceControlProps {
  caps: DetectedCaps | null;
  value: DevicePreference;
  onChange: (v: DevicePreference) => void;
}

export function InferenceDeviceControl({ caps, value, onChange }: InferenceDeviceControlProps) {
  const options: Array<{ id: DevicePreference; label: string; sub?: string; disabled?: boolean }> =
    [
      { id: "auto", label: "Auto" },
      { id: "gpu", label: "GPU", sub: "WebGPU", disabled: !caps?.gpu },
      { id: "cpu", label: "CPU" },
    ];

  return (
    <div>
      <div className="text-[12.5px] font-semibold mb-2" style={{ color: "var(--text)" }}>
        Inference device
      </div>
      <div className="flex gap-1.5">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => !opt.disabled && onChange(opt.id)}
              disabled={opt.disabled}
              className="flex-1 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              style={{
                background: active
                  ? "oklch(60% 0.20 290 / 0.18)"
                  : "oklch(24% 0.025 280 / 0.65)",
                border: active
                  ? "1px solid oklch(60% 0.20 290 / 0.50)"
                  : "1px solid oklch(38% 0.02 280 / 0.35)",
                color: active ? "var(--text)" : "var(--text-muted)",
              }}
            >
              {opt.label}
              {opt.sub && (
                <span
                  className="font-mono text-[9px] tracking-[0.06em] uppercase opacity-60"
                  style={{ color: active ? "var(--text-muted)" : "oklch(50% 0.02 280)" }}
                >
                  {opt.sub}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
