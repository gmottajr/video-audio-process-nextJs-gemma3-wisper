"use client";

import { CheckCircle2 } from "lucide-react";
import { ActionButtonRow } from "./ActionButtonRow";
import { getDoneButtonStrategies } from "../strategies/doneActions/registry";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import type { ModelKey } from "@/components/ModelSelector";
import { WHISPER_MODELS } from "@/components/ModelSelector";
import type { DoneActionContext } from "../types";

const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

function Badge({
  children,
  color,
  bg,
  border,
}: {
  children: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        background: bg,
        border: `1px solid ${border}`,
        color,
      }}
    >
      {children}
    </span>
  );
}

interface DoneHeaderProps {
  result: ProcessingResult;
  file: File;
  elapsedStr: string | null;
  charCount: number | null;
  currentModel: string | null;
  selectedModelKey: ModelKey;
  ctx: DoneActionContext;
}

export function DoneHeader({
  result,
  file,
  elapsedStr,
  charCount,
  currentModel,
  selectedModelKey,
  ctx,
}: DoneHeaderProps) {
  const title =
    result.type === "audio"
      ? "Audio ready"
      : result.type === "video"
      ? "Video ready"
      : "Transcription complete";

  const metaChips = [
    elapsedStr ?? null,
    charCount ? `${charCount.toLocaleString()} characters` : null,
    currentModel ? WHISPER_MODELS[selectedModelKey]?.name : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const showBadges =
    (result.metadata?.compressionType && result.metadata.compressionType !== "none") ||
    result.metadata?.normalized;

  return (
    <>
      {/* Success strip */}
      <div
        className="flex items-center gap-3 mb-5"
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          background: "linear-gradient(90deg, rgba(16,185,129,0.10), rgba(16,185,129,0.02))",
          border: "1px solid rgba(16,185,129,0.25)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "rgba(16,185,129,0.18)",
            border: "1px solid rgba(16,185,129,0.4)",
            color: "#34d399",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600 }}>
              {title}
            </div>
            {metaChips && (
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#8a8a9c", letterSpacing: "0.08em" }}>
                {metaChips}
              </div>
            )}
          </div>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10.5,
              color: "#5b5b6e",
              letterSpacing: "0.06em",
              marginTop: 2,
              textTransform: "uppercase",
            }}
          >
            {file.name}
          </div>
        </div>
        <ActionButtonRow strategies={getDoneButtonStrategies()} ctx={ctx} />
      </div>

      {/* Compression / normalization badges */}
      {showBadges && (
        <div className="mb-4 flex flex-wrap gap-2">
          {result.metadata?.compressionType === "speech" && (
            <Badge color="#34d399" bg="rgba(16,185,129,0.10)" border="rgba(16,185,129,0.3)">
              🎙️ Speech compressed
            </Badge>
          )}
          {result.metadata?.compressionType === "studio" && (
            <Badge color="#67e8f9" bg="rgba(34,211,238,0.10)" border="rgba(34,211,238,0.3)">
              🎚️ Studio compressed
            </Badge>
          )}
          {result.metadata?.compressionType === "both" && (
            <Badge color="#fbbf24" bg="rgba(245,158,11,0.10)" border="rgba(245,158,11,0.3)">
              ✨ Full enhancement · speech + studio
            </Badge>
          )}
          {result.metadata?.normalized && (
            <Badge color="#67e8f9" bg="rgba(34,211,238,0.08)" border="rgba(34,211,238,0.25)">
              🎵 Normalized
            </Badge>
          )}
        </div>
      )}
    </>
  );
}
