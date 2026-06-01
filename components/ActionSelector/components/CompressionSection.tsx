"use client";

import type { CompressionType } from "../types";
import { getSmartRecommendation } from "../services/formatRecommender";

interface CompressionSectionProps {
  filename: string;
  compressionType: CompressionType;
  normalizeAudio: boolean;
  disabled: boolean;
  onChange: (value: CompressionType) => void;
}

const COMPRESSION_OPTIONS: Array<{
  value: CompressionType;
  label: string;
  sub: string;
  badge: string;
  badgeMuted: boolean;
}> = [
  { value: "none",   label: "No Compression",      sub: "Meetings, interviews, conversations",  badge: "Default",   badgeMuted: true },
  { value: "speech", label: "Speech Compression",   sub: "Balances different speaker volumes",   badge: "+15% time", badgeMuted: false },
  { value: "studio", label: "Studio Compression",   sub: "Podcasts, broadcasts, professional",   badge: "+12% time", badgeMuted: false },
  { value: "both",   label: "Both (Experimental)",  sub: "Speech balancing + studio smoothing",  badge: "+25% time", badgeMuted: false },
];

export function CompressionSection({
  filename,
  compressionType,
  normalizeAudio,
  disabled,
  onChange,
}: CompressionSectionProps) {
  const recommendation = getSmartRecommendation(filename, normalizeAudio, compressionType);

  return (
    <div
      className="mt-4 rounded-xl p-5"
      style={{ background: "oklch(19% 0.02 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)" }}
    >
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-jazz text-sm text-aura-text">Audio Compression</p>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "oklch(60% 0.28 290 / 0.18)", color: "oklch(74% 0.16 290)", border: "1px solid oklch(60% 0.28 290 / 0.30)" }}
          >
            Professional
          </span>
        </div>
        <p className="text-xs text-aura-muted">Choose compression type based on your content</p>
      </div>

      <div className="space-y-2">
        {COMPRESSION_OPTIONS.map(({ value, label, sub, badge, badgeMuted }) => {
          const isSelected = compressionType === value;
          return (
            <label
              key={value}
              className="flex items-start cursor-pointer p-3 rounded-lg transition-all duration-150"
              style={{
                background: isSelected ? "oklch(25% 0.04 290)" : "oklch(21% 0.025 280)",
                border: isSelected
                  ? "1px solid oklch(60% 0.28 290 / 0.45)"
                  : "1px solid oklch(38% 0.02 280 / 0.30)",
              }}
            >
              <input
                type="radio"
                name="compression"
                value={value}
                checked={isSelected}
                onChange={(e) => onChange(e.target.value as CompressionType)}
                disabled={disabled}
                className="mt-0.5 w-4 h-4 shrink-0"
              />
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm text-aura-text">{label}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                    style={
                      badgeMuted
                        ? { background: "oklch(32% 0.02 280 / 0.60)", color: "oklch(55% 0.02 280)" }
                        : { background: "oklch(66% 0.17 195 / 0.18)", color: "oklch(74% 0.13 195)" }
                    }
                  >
                    {badge}
                  </span>
                </div>
                <p className="text-xs text-aura-muted leading-relaxed">{sub}</p>
                {value === "both" && (
                  <p className="text-xs mt-1" style={{ color: "oklch(72% 0.16 55)" }}>
                    May over-compress — test with your content
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {recommendation && (
        <div
          className="mt-4 text-xs p-3 rounded-lg animate-in fade-in duration-300"
          style={{ background: "oklch(28% 0.04 290 / 0.30)", border: "1px solid oklch(60% 0.28 290 / 0.30)" }}
        >
          <p style={{ color: "oklch(80% 0.12 290)" }}>{recommendation}</p>
        </div>
      )}
    </div>
  );
}
