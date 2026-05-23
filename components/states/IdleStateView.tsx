"use client";

import { FileUploader } from "@/components/FileUploader";
import {
  Video, Music, Brain, Shield, Lightbulb,
  Zap, EyeOff, Database, Cpu,
} from "lucide-react";

interface IdleStateViewProps {
  onFileSelect: (file: File | null) => void;
  isLoading: boolean;
  recommendedFileSize?: number;
}

const FEATURES = [
  {
    icon: Video,
    title: "Video Processing",
    desc: "Extract audio from MP4, MKV, WebM, AVI, MOV.",
    accent: "oklch(74% 0.16 290)",
    accentBg: "oklch(60% 0.20 290 / 0.10)",
    accentBorder: "oklch(60% 0.20 290 / 0.25)",
  },
  {
    icon: Music,
    title: "Audio Conversion",
    desc: "Convert, compress and normalize WAV · MP3 · AAC · OGG · FLAC.",
    accent: "oklch(74% 0.16 215)",
    accentBg: "oklch(66% 0.17 195 / 0.10)",
    accentBorder: "oklch(66% 0.17 195 / 0.25)",
  },
  {
    icon: Brain,
    title: "AI Transcription",
    desc: "Whisper speech-to-text with word-level timestamps and SRT export.",
    accent: "oklch(78% 0.15 75)",
    accentBg: "oklch(78% 0.15 75 / 0.10)",
    accentBorder: "oklch(78% 0.15 75 / 0.25)",
  },
];

const FORMATS = ["MP4","MKV","WebM","AVI","MOV","MP3","WAV","AAC","M4A","OGG","FLAC"];

const PRIVACY = [
  { icon: Shield,   t: "No uploads",   d: "Files never leave your device" },
  { icon: EyeOff,   t: "No telemetry", d: "No analytics on your content" },
  { icon: Cpu,      t: "In-browser",   d: "FFmpeg + Whisper via WebAssembly" },
  { icon: Database, t: "No traces",    d: "IndexedDB cache, clearable" },
];

export function IdleStateView({
  onFileSelect,
  isLoading,
  recommendedFileSize,
}: IdleStateViewProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
        {/* LEFT — dropzone */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div
                className="font-mono text-[11px] tracking-[0.18em] uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                Step 01 · Media input
              </div>
              <h2
                className="font-display text-[28px] font-semibold tracking-tight mt-1 animate-text-gradient"
                style={{ lineHeight: 1.1 }}
              >
                Drop a file to begin
              </h2>
              <p className="text-aura-muted text-[13px] mt-1">
                {isLoading
                  ? "Initializing FFmpeg engine…"
                  : "Decoded locally via WebAssembly. Nothing uploads."}
              </p>
            </div>
            {isLoading && (
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full"
                style={{
                  background: "oklch(60% 0.20 290 / 0.12)",
                  border: "1px solid oklch(60% 0.20 290 / 0.3)",
                }}
              >
                <Zap className="w-3 h-3 animate-pulse" style={{ color: "oklch(74% 0.16 290)" }} />
                <span
                  className="text-[10px] font-mono uppercase tracking-wider"
                  style={{ color: "oklch(74% 0.16 290)" }}
                >
                  Loading
                </span>
              </div>
            )}
          </div>

          <div
            className="rounded-2xl p-5"
            style={{
              background:
                "radial-gradient(120% 100% at 50% 0%, oklch(60% 0.20 290 / 0.10), oklch(22% 0.025 280 / 0.55))",
              border: "1.5px dashed oklch(60% 0.20 290 / 0.35)",
              backdropFilter: "blur(10px)",
            }}
          >
            <FileUploader
              onFileSelect={onFileSelect}
              recommendedFileSize={recommendedFileSize}
            />

            <div className="flex flex-wrap gap-1.5 mt-5 justify-center">
              {FORMATS.map((f) => (
                <span
                  key={f}
                  className="font-mono text-[10px] tracking-[0.08em] px-2 py-0.5 rounded"
                  style={{
                    background: "oklch(28% 0.025 280 / 0.5)",
                    border: "1px solid oklch(38% 0.02 280 / 0.3)",
                    color: "var(--text-muted)",
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div
              className="rounded-xl p-3.5"
              style={{
                background: "oklch(22% 0.025 280 / 0.4)",
                border: "1px solid oklch(38% 0.02 280 / 0.25)",
              }}
            >
              <p className="text-[11px] text-aura-muted text-center leading-relaxed">
                <span className="text-aura-text font-medium">Legal:</span> for personal use.
                You are responsible for consent when transcribing others.
                Accuracy varies — review before relying on output. All processing is local.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT — what forge does */}
        <div className="flex flex-col gap-4">
          {/* what forge does */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "oklch(22% 0.025 280 / 0.55)",
              border: "1px solid oklch(38% 0.02 280 / 0.35)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              className="font-mono text-[11px] tracking-[0.18em] uppercase mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              What Forge Does
            </div>
            <div className="flex flex-col gap-2.5">
              {FEATURES.map(({ icon: Icon, title, desc, accent, accentBg, accentBorder }) => (
                <div
                  key={title}
                  className="flex gap-3 items-start p-3.5 rounded-xl transition-colors"
                  style={{
                    background: "oklch(24% 0.025 280 / 0.5)",
                    border: "1px solid oklch(38% 0.02 280 / 0.25)",
                  }}
                >
                  <div
                    className="flex-shrink-0 p-2 rounded-lg"
                    style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-jazz text-[15px]" style={{ color: "var(--text)" }}>{title}</div>
                    <div className="text-[12.5px] text-aura-muted leading-snug mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* privacy quad */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "oklch(22% 0.025 280 / 0.55)",
              border: "1px solid oklch(70% 0.18 155 / 0.18)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="p-1.5 rounded-md"
                style={{
                  background: "oklch(70% 0.18 155 / 0.12)",
                  border: "1px solid oklch(70% 0.18 155 / 0.25)",
                }}
              >
                <Shield className="w-3.5 h-3.5" style={{ color: "oklch(82% 0.14 155)" }} />
              </div>
              <div className="font-jazz text-[15px]" style={{ color: "var(--text)" }}>
                Zero-trust by design
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRIVACY.map(({ icon: Icon, t, d }) => (
                <div
                  key={t}
                  className="p-2.5 rounded-lg"
                  style={{
                    background: "oklch(70% 0.18 155 / 0.04)",
                    border: "1px solid oklch(70% 0.18 155 / 0.12)",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3" style={{ color: "oklch(82% 0.14 155)" }} />
                    <span
                      className="font-mono text-[10px] tracking-[0.1em] uppercase"
                      style={{ color: "oklch(82% 0.14 155)" }}
                    >
                      {t}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-aura-muted">{d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* pro tip */}
          <div
            className="rounded-2xl p-4 flex gap-3 items-start"
            style={{
              background:
                "linear-gradient(135deg, oklch(78% 0.15 75 / 0.08), oklch(78% 0.15 75 / 0.02))",
              border: "1px solid oklch(78% 0.15 75 / 0.25)",
            }}
          >
            <div
              className="flex-shrink-0 p-2 rounded-lg"
              style={{
                background: "oklch(78% 0.15 75 / 0.15)",
                border: "1px solid oklch(78% 0.15 75 / 0.3)",
              }}
            >
              <Lightbulb className="w-3.5 h-3.5" style={{ color: "oklch(78% 0.15 75)" }} />
            </div>
            <div>
              <div
                className="font-mono text-[10px] tracking-[0.14em] uppercase mb-1"
                style={{ color: "oklch(78% 0.15 75)" }}
              >
                Pro tip
              </div>
              <div className="text-[12.5px] text-aura-text leading-relaxed">
                Want to transcribe only part of a video? Extract audio first, then scrub the
                waveform to select and transcribe a range — ideal for long interviews and lectures.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
