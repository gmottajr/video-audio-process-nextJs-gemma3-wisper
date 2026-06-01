"use client";

import type { DetectedCaps } from "../types";

interface CapabilityStatTilesProps {
  caps: DetectedCaps | null;
  workers: number;
}

export function CapabilityStatTiles({ caps, workers }: CapabilityStatTilesProps) {
  const tiles: Array<{ value: string; label: string; color: string }> = [
    {
      value: caps ? String(caps.cpuThreads) : "—",
      label: "CPU threads",
      color: "oklch(74% 0.16 290)",
    },
    {
      value: caps?.gpu ? "✓" : "—",
      label: caps?.gpu ? "GPU ready" : "CPU only",
      color: caps?.gpu ? "oklch(66% 0.17 195)" : "oklch(60% 0.02 280)",
    },
    {
      value: caps && caps.ramGB > 0 ? String(caps.ramGB) : "—",
      label: "GB RAM",
      color: "oklch(72% 0.16 55)",
    },
    {
      value: workers ? String(workers) : "—",
      label: "Workers",
      color: "oklch(70% 0.18 155)",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {tiles.map((t, i) => (
        <div
          key={i}
          className="p-3 rounded-lg text-center"
          style={{
            background: `${t.color.replace(")", " / 0.08)")}`,
            border: `1px solid ${t.color.replace(")", " / 0.22)")}`,
          }}
        >
          <div
            className="font-jazz leading-none"
            style={{ color: t.color, fontSize: 22, fontWeight: 700 }}
          >
            {t.value}
          </div>
          <div
            className="font-mono mt-1.5"
            style={{
              color: "var(--text-muted)",
              fontSize: 9.5,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {t.label}
          </div>
        </div>
      ))}
    </div>
  );
}
