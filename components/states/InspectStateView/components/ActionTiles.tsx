"use client";

import type { VideoMode } from "@/components/VideoModeTabs";
import { getActionTilesForKind } from "../strategies/actionTile/registry";

interface ActionTilesProps {
  kind: "video" | "audio";
  value: VideoMode;
  onChange: (mode: VideoMode) => void;
  disabled?: boolean;
}

export function ActionTiles({ kind, value, onChange, disabled }: ActionTilesProps) {
  const strategies = getActionTilesForKind(kind);

  return (
    <div
      className={`grid gap-2.5 ${strategies.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"} grid-cols-1`}
    >
      {strategies.map((strategy) => {
        const t = strategy.getTile(kind);
        const active = value === strategy.id;
        const Icon = t.icon;
        return (
          <button
            key={strategy.id}
            type="button"
            onClick={() => !disabled && onChange(strategy.id)}
            disabled={disabled}
            className="flex items-start gap-3 text-left p-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: active
                ? "linear-gradient(180deg, oklch(60% 0.20 290 / 0.16), oklch(60% 0.20 290 / 0.05))"
                : "oklch(24% 0.025 280 / 0.65)",
              border: active
                ? "1px solid oklch(60% 0.20 290 / 0.50)"
                : "1px solid oklch(38% 0.02 280 / 0.35)",
              boxShadow: active ? "0 0 0 4px oklch(60% 0.20 290 / 0.08)" : "none",
            }}
          >
            <div
              className="w-7 h-7 rounded-md grid place-items-center shrink-0 transition-colors"
              style={{
                background: active ? "oklch(60% 0.20 290)" : t.iconBg,
                border: active
                  ? "1px solid oklch(60% 0.20 290)"
                  : `1px solid ${t.iconBorder}`,
                color: active ? "#fff" : t.iconColor,
              }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="font-semibold text-[13.5px] leading-snug"
                style={{ color: "var(--text)" }}
              >
                {t.title}
              </div>
              <div
                className="text-[12px] mt-0.5 leading-snug"
                style={{ color: "var(--text-muted)" }}
              >
                {t.sub}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
