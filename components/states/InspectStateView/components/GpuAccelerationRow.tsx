"use client";

import type { DetectedCaps } from "../types";

export function GpuAccelerationRow({ caps }: { caps: DetectedCaps | null }) {
  if (!caps?.gpu) return null;
  return (
    <div
      className="flex items-center justify-between gap-2 mt-3 px-3 py-2.5 rounded-lg"
      style={{
        background: "oklch(70% 0.18 155 / 0.06)",
        border: "1px solid oklch(70% 0.18 155 / 0.20)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: "oklch(70% 0.18 155)",
            boxShadow: "0 0 6px oklch(70% 0.18 155)",
          }}
        />
        <span
          className="font-mono text-[10.5px] tracking-[0.10em] uppercase"
          style={{ color: "oklch(82% 0.14 155)" }}
        >
          GPU acceleration
        </span>
      </div>
      {caps.gpuDevice && (
        <span
          className="font-mono text-[10px] tracking-[0.04em] truncate min-w-0 text-right"
          style={{ color: "var(--text-muted)" }}
          title={caps.gpuDevice}
        >
          {caps.gpuDevice}
        </span>
      )}
    </div>
  );
}
