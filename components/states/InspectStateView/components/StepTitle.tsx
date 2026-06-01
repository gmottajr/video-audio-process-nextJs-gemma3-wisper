"use client";

export function StepTitle({ text }: { text: string }) {
  const steps = text.length;
  const duration = `${Math.max(1.2, Math.min(3.6, steps * 0.11)).toFixed(2)}s`;
  const accent = "oklch(74% 0.16 290)";
  const sharedTextStyles: React.CSSProperties = {
    fontSize: 16,
    letterSpacing: "0.16em",
    lineHeight: 1.2,
  };
  return (
    <div className="relative inline-block mb-4 select-none">
      <span
        className="font-mono uppercase block"
        style={{ ...sharedTextStyles, color: "oklch(55% 0.12 220)" }}
      >
        {text}
      </span>
      <span
        aria-hidden
        className="font-mono uppercase absolute left-0 top-0 overflow-hidden whitespace-nowrap animate-typewriter"
        style={{
          ...sharedTextStyles,
          color: accent,
          borderRight: `2px solid ${accent}`,
          ["--tw-steps" as any]: steps,
          ["--tw-duration" as any]: duration,
        }}
      >
        {text}
      </span>
    </div>
  );
}
