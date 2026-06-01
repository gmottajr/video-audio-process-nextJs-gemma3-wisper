"use client";

interface ModelBadgeProps {
  isSelected: boolean;
  isLoaded: boolean;
  badge: string | null;
}

export function ModelBadge({ isSelected, isLoaded, badge }: ModelBadgeProps) {
  let text: string | null = null;
  let style: React.CSSProperties | null = null;

  if (isLoaded) {
    text = "Loaded";
    style = {
      background: "oklch(70% 0.18 155 / 0.18)",
      color: "oklch(82% 0.14 155)",
      border: "1px solid oklch(70% 0.18 155 / 0.30)",
    };
  } else if (badge === "Best") {
    text = "Best";
    style = isSelected
      ? { background: "oklch(60% 0.20 290)", color: "#fff" }
      : {
          background: "oklch(60% 0.20 290 / 0.18)",
          color: "oklch(78% 0.10 290)",
          border: "1px solid oklch(60% 0.20 290 / 0.30)",
        };
  } else if (badge === "Fast") {
    text = "Fast";
    style = {
      background: "oklch(66% 0.17 195 / 0.18)",
      color: "oklch(78% 0.14 195)",
      border: "1px solid oklch(66% 0.17 195 / 0.30)",
    };
  } else if (badge === "Popular") {
    text = "Popular";
    style = isSelected
      ? { background: "oklch(60% 0.20 290)", color: "#fff" }
      : {
          background: "oklch(60% 0.20 290 / 0.15)",
          color: "oklch(78% 0.10 290)",
          border: "1px solid oklch(60% 0.20 290 / 0.30)",
        };
  }

  if (!text) return null;

  return (
    <span
      className="absolute top-2 right-2 font-mono text-[9px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded"
      style={style as React.CSSProperties}
    >
      {text}
    </span>
  );
}
