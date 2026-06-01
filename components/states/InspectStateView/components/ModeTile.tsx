"use client";

interface ModeTileProps {
  active: boolean;
  accent: "violet" | "amber";
  title: string;
  right: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
}

export function ModeTile({ active, accent, title, right, desc, onClick, disabled }: ModeTileProps) {
  const tone =
    accent === "amber"
      ? {
          dotBorder: "oklch(72% 0.16 55)",
          activeBg: "oklch(72% 0.16 55 / 0.08)",
          activeBorder: "oklch(72% 0.16 55 / 0.45)",
          chipBg: "oklch(72% 0.16 55 / 0.15)",
          chipColor: "oklch(80% 0.14 55)",
        }
      : {
          dotBorder: "oklch(60% 0.20 290)",
          activeBg: "oklch(60% 0.20 290 / 0.08)",
          activeBorder: "oklch(60% 0.20 290 / 0.45)",
          chipBg: "oklch(60% 0.20 290 / 0.15)",
          chipColor: "oklch(78% 0.10 290)",
        };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-start text-left p-3.5 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: active ? tone.activeBg : "oklch(24% 0.025 280 / 0.65)",
        border: active
          ? `1px solid ${tone.activeBorder}`
          : "1px solid oklch(38% 0.02 280 / 0.35)",
      }}
    >
      <div className="flex items-center gap-2.5 w-full mb-1.5">
        <span
          className="w-4 h-4 rounded-full shrink-0 grid place-items-center transition-all"
          style={{
            border: `2px solid ${active ? tone.dotBorder : "oklch(38% 0.02 280 / 0.7)"}`,
          }}
        >
          {active && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: tone.dotBorder }}
            />
          )}
        </span>
        <span className="font-semibold text-[13.5px]" style={{ color: "var(--text)" }}>
          {title}
        </span>
        <span
          className="ml-auto font-mono text-[9.5px] tracking-[0.10em] uppercase px-1.5 py-0.5 rounded"
          style={
            active
              ? { background: tone.chipBg, color: tone.chipColor }
              : { background: "oklch(32% 0.02 280 / 0.6)", color: "oklch(60% 0.02 280)" }
          }
        >
          {right}
        </span>
      </div>
      <p className="text-[12.5px] leading-snug" style={{ color: "var(--text-muted)" }}>
        {desc}
      </p>
    </button>
  );
}
