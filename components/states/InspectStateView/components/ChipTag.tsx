"use client";

export function ChipTag({ label }: { label: string }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded font-mono text-[9.5px] tracking-[0.04em]"
      style={{
        background: "oklch(30% 0.02 280 / 0.6)",
        color: "oklch(70% 0.02 280)",
        border: "1px solid oklch(38% 0.02 280 / 0.4)",
      }}
    >
      {label}
    </span>
  );
}
