"use client";

import type { DetectedCaps } from "../types";

interface WorkerCountSliderProps {
  caps: DetectedCaps | null;
  value: number;
  onChange: (n: number) => void;
  useGPU: boolean;
}

export function WorkerCountSlider({ caps, value, onChange, useGPU }: WorkerCountSliderProps) {
  const max = caps?.maxWorkers || 4;
  const recommended = caps?.recommendedWorkers || 2;
  const min = 1;
  const clamped = Math.min(Math.max(value, min), max);
  const percent = ((clamped - min) / (max - min)) * 100;
  const memoryPerWorkerMB = useGPU ? 300 : 600;
  const estimatedMemoryGB = (clamped * memoryPerWorkerMB + 1000) / 1024;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12.5px] font-semibold" style={{ color: "var(--text)" }}>
          Parallel workers
        </span>
        <span className="font-mono text-[12px]" style={{ color: "oklch(72% 0.16 55)" }}>
          {clamped} / {max}
        </span>
      </div>

      <div
        className="relative h-1.5 rounded-full"
        style={{ background: "oklch(28% 0.025 280)" }}
      >
        <div
          className="absolute h-full rounded-full"
          style={{
            width: `${percent}%`,
            background: "linear-gradient(90deg, oklch(60% 0.20 290), oklch(72% 0.16 55))",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={clamped}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full pointer-events-none"
          style={{
            left: `calc(${percent}% - 7px)`,
            top: "50%",
            transform: "translateY(-50%)",
            background: "#fff",
            boxShadow: "0 0 0 4px oklch(72% 0.16 55 / 0.25)",
          }}
        />
      </div>

      <div className="flex justify-between mt-2.5">
        <span
          className="font-mono text-[9.5px] tracking-[0.08em] uppercase"
          style={{ color: "oklch(50% 0.02 280)" }}
        >
          Conservative
        </span>
        <span
          className="font-mono text-[9.5px] tracking-[0.08em] uppercase"
          style={{ color: "oklch(72% 0.16 55)" }}
        >
          Recommended: {recommended}
        </span>
        <span
          className="font-mono text-[9.5px] tracking-[0.08em] uppercase"
          style={{ color: "oklch(50% 0.02 280)" }}
        >
          Maximum
        </span>
      </div>

      <div className="text-[11.5px] mt-2" style={{ color: "var(--text-muted)" }}>
        Estimated memory usage: ~{estimatedMemoryGB.toFixed(1)} GB
      </div>
    </div>
  );
}
