"use client";

import type { DoneActionStrategy, DoneActionContext } from "../types";

const buttonStyles: Record<DoneActionStrategy["style"], React.CSSProperties> = {
  primary: {
    background: "linear-gradient(180deg, #10b981, #059669)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
    fontWeight: 600,
  },
  secondary: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#f3f3f8",
    fontWeight: 500,
  },
  accent: {
    background: "rgba(139,92,246,0.12)",
    border: "1px solid rgba(139,92,246,0.3)",
    color: "#c4b5fd",
    fontWeight: 500,
  },
};

interface ActionButtonRowProps {
  strategies: DoneActionStrategy[];
  ctx: DoneActionContext;
}

export function ActionButtonRow({ strategies, ctx }: ActionButtonRowProps) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {strategies
        .filter((s) => s.isEnabled(ctx))
        .map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => s.onInvoke(ctx)}
              className="flex items-center gap-1.5 transition-colors"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                cursor: "pointer",
                ...buttonStyles[s.style],
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{s.label(ctx)}</span>
            </button>
          );
        })}
    </div>
  );
}
