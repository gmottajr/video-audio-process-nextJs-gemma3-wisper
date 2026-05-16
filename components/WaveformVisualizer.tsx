"use client";

// Bar heights shaped by overlapping sine waves — organic, not random
const BARS = Array.from({ length: 72 }, (_, i) => ({
  peak: Math.max(8, Math.abs(
    Math.sin(i * 0.38) * 30 +
    Math.sin(i * 0.65 + 1.2) * 20 +
    Math.sin(i * 0.13) * 14
  ) + 8),
  // Unique duration per bar so they pulse out of sync
  duration: 1.1 + ((i * 13) % 17) * 0.1,
  // Negative delay so animation is already running on mount
  delay: -((i * 13) % 17) * 0.05 - i * 0.02,
  // Every 4th/9th bar is teal (signal/media accent), rest are violet (neural identity)
  isTeal: i % 4 === 1 || i % 9 === 5,
}));

interface WaveformVisualizerProps {
  className?: string;
  height?: number;
}

export function WaveformVisualizer({ className = "", height = 80 }: WaveformVisualizerProps) {
  return (
    <div
      role="img"
      aria-label="Audio spectrum visualizer"
      className={`flex items-end justify-center gap-[3px] ${className}`}
      style={{ height: `${height}px` }}
    >
      {BARS.map((bar, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            width: "3px",
            height: `${bar.peak}px`,
            minHeight: "4px",
            borderRadius: "9999px",
            background: bar.isTeal
              ? "oklch(0.66 0.17 195 / 0.65)"
              : "oklch(0.60 0.20 290 / 0.45)",
            "--wf-dur": `${bar.duration}s`,
            "--wf-delay": `${bar.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
