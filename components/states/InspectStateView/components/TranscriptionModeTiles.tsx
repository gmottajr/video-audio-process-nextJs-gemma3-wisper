"use client";

import type { TranscriptionMode } from "@/types/fast-mode";
import { useTranscriptionModePersistence } from "../hooks/useTranscriptionModePersistence";
import { Card } from "./Card";
import { CardHeader } from "./CardHeader";
import { ModeTile } from "./ModeTile";

interface TranscriptionModeTilesProps {
  selected: TranscriptionMode;
  onSelect: (mode: TranscriptionMode) => void;
  disabled?: boolean;
  dimmed?: boolean;
}

export function TranscriptionModeTiles({
  selected,
  onSelect,
  disabled,
  dimmed,
}: TranscriptionModeTilesProps) {
  useTranscriptionModePersistence(selected, onSelect);

  const handle = (m: TranscriptionMode) => {
    if (disabled) return;
    onSelect(m);
  };

  return (
    <Card dimmed={dimmed}>
      <CardHeader
        title="Transcription mode"
        trailing={
          <span
            className="font-mono text-[9.5px] tracking-[0.12em] uppercase px-1.5 py-0.5 rounded"
            style={{
              color: "oklch(80% 0.14 55)",
              background: "oklch(72% 0.16 55 / 0.10)",
              border: "1px solid oklch(72% 0.16 55 / 0.25)",
            }}
          >
            Beta
          </span>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <ModeTile
          active={selected === "standard"}
          accent="violet"
          title="Standard"
          right="Default"
          desc="Single worker · word-level timestamps · audio enhancements"
          onClick={() => handle("standard")}
          disabled={disabled}
        />
        <ModeTile
          active={selected === "fast"}
          accent="amber"
          title="Fast (Parallel)"
          right="~6× faster"
          desc="All CPU cores · up to 16 workers · any model"
          onClick={() => handle("fast")}
          disabled={disabled}
        />
      </div>
    </Card>
  );
}
