"use client";

import { Brain } from "lucide-react";

interface TranscribeInfoCardProps {
  compact?: boolean;
}

export function TranscribeInfoCard({ compact = false }: TranscribeInfoCardProps) {
  if (compact) {
    return (
      <div
        className="mb-3 p-4 rounded-xl"
        style={{ background: "oklch(22% 0.025 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="p-2 rounded-lg shrink-0"
            style={{ background: "oklch(60% 0.28 290 / 0.20)", border: "1px solid oklch(60% 0.28 290 / 0.30)" }}
          >
            <Brain className="w-4 h-4" style={{ color: "oklch(74% 0.16 290)" }} />
          </div>
          <div>
            <h4 className="font-jazz text-sm text-aura-text mb-0.5">AI Transcription</h4>
            <p className="text-xs text-aura-muted leading-relaxed">
              Convert speech to text using Whisper AI. Runs 100% in your browser — completely private.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-5 p-5 rounded-xl"
      style={{ background: "oklch(22% 0.025 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)" }}
    >
      <div className="flex items-start gap-4">
        <div
          className="p-2.5 rounded-lg shrink-0"
          style={{ background: "oklch(60% 0.28 290 / 0.20)", border: "1px solid oklch(60% 0.28 290 / 0.30)" }}
        >
          <Brain className="w-5 h-5" style={{ color: "oklch(74% 0.16 290)" }} />
        </div>
        <div className="flex-1">
          <h4 className="font-jazz text-sm text-aura-text mb-2">OpenAI Whisper Model</h4>
          <p className="text-xs text-aura-muted mb-3 leading-relaxed">
            Transcribe your video's audio to text using state-of-the-art AI.
            The model runs entirely in your browser — no data is sent to any server.
          </p>
          <div className="space-y-1.5">
            {[
              { text: "Completely private & offline",          color: "oklch(66% 0.17 195)" },
              { text: "Word-level timestamps included",        color: "oklch(66% 0.17 195)" },
              { text: "Export as TXT, JSON, or SRT",          color: "oklch(66% 0.17 195)" },
              { text: "Segment transcription: extract audio first, then select portions", color: "oklch(72% 0.16 55)" },
            ].map(({ text, color }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-aura-muted">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
