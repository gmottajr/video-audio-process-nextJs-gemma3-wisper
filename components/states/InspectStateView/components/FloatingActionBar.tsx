"use client";

import { useState, useEffect } from "react";
import { Zap, ArrowRight } from "lucide-react";
import { Kbd } from "./Kbd";

interface FloatingActionBarProps {
  label: string;
  onCta: () => void;
  ctaDisabled?: boolean;
}

export function FloatingActionBar({ label, onCta, ctaDisabled }: FloatingActionBarProps) {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      className="fixed left-1/2 z-[60] flex items-stretch gap-2 -translate-x-1/2"
      style={{
        bottom: 14,
        padding: 4,
        paddingLeft: 14,
        borderRadius: 999,
        background: "oklch(14% 0.02 280 / 0.85)",
        border: "1px solid oklch(38% 0.02 280 / 0.45)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        className="hidden md:flex items-center gap-2.5 pr-2 font-mono text-[11px] tracking-[0.06em]"
        style={{ color: "var(--text-muted)" }}
      >
        <Kbd>←</Kbd>
        <Kbd>→</Kbd>
        <span>navigate</span>
        <span style={{ color: "oklch(38% 0.02 280)" }}>·</span>
        <Kbd>1</Kbd>
        <span style={{ color: "oklch(45% 0.02 280)" }}>–</span>
        <Kbd>4</Kbd>
        <span>jump</span>
        <span style={{ color: "oklch(38% 0.02 280)" }}>·</span>
        <span style={{ color: "oklch(55% 0.02 280)" }}>
          {size.w}×{size.h}
        </span>
      </div>
      <button
        type="button"
        onClick={onCta}
        disabled={ctaDisabled}
        className="flex items-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
        style={{
          padding: "10px 18px",
          borderRadius: 999,
          background: "linear-gradient(90deg, oklch(60% 0.20 290), oklch(66% 0.17 195))",
          border: "1px solid oklch(100% 0 0 / 0.18)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          boxShadow:
            "0 12px 30px oklch(60% 0.20 290 / 0.35), inset 0 1px 0 oklch(100% 0 0 / 0.20)",
        }}
      >
        <Zap className="w-4 h-4" />
        <span>{label}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
