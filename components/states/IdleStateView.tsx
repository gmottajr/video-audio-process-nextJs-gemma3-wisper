"use client";

import { FileUploader } from "@/components/FileUploader";
import { PageHeader } from "@/components/PageHeader";
import { Video, Music, Brain, Shield, Lock, Server, Lightbulb } from "lucide-react";

interface IdleStateViewProps {
  onFileSelect: (file: File | null) => void;
  isLoading: boolean;
  recommendedFileSize?: number;
}

const FEATURES = [
  {
    icon: Video,
    title: "Video Processing",
    desc: "Convert & extract audio from video files. MP4, MKV, WebM, AVI supported.",
  },
  {
    icon: Music,
    title: "Audio Conversion",
    desc: "Convert formats, compress, and normalize audio. WAV, MP3, AAC, OGG.",
  },
  {
    icon: Brain,
    title: "AI Transcription",
    desc: "Speech-to-text with OpenAI Whisper. Word timestamps & SRT export.",
  },
];

export function IdleStateView({
  onFileSelect,
  isLoading,
  recommendedFileSize,
}: IdleStateViewProps) {
  return (
    <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-500 px-4">
      <div className="mb-6">
        <PageHeader showLogo={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* LEFT COLUMN: Features & Info */}
        <div className="space-y-3">

          {/* Feature cards */}
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl p-4 transition-all duration-200 hover:border-[oklch(60%_0.20_290/0.35)]"
              style={{
                background: "oklch(24% 0.025 280 / 0.60)",
                border: "1px solid oklch(38% 0.02 280 / 0.35)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{
                    background: "oklch(60% 0.20 290 / 0.10)",
                    border: "1px solid oklch(60% 0.20 290 / 0.20)",
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: "oklch(74% 0.16 290)" }} />
                </div>
                <h3 className="font-jazz text-base" style={{ color: "var(--text)" }}>{title}</h3>
              </div>
              <p className="text-sm text-aura-muted leading-relaxed pl-[2.375rem]">{desc}</p>
              <div className="flex items-center gap-1.5 mt-2 pl-[2.375rem]">
                <Lock className="w-3 h-3 text-aura-muted opacity-60" />
                <span className="text-xs text-aura-muted opacity-60">No server upload</span>
              </div>
            </div>
          ))}

          {/* Pro Tip */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "oklch(24% 0.025 280 / 0.40)",
              border: "1px solid oklch(60% 0.20 290 / 0.18)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 p-2 rounded-lg"
                style={{ background: "oklch(60% 0.20 290 / 0.10)" }}
              >
                <Lightbulb className="w-4 h-4" style={{ color: "oklch(74% 0.16 290)" }} />
              </div>
              <div>
                <h4 className="font-jazz text-sm mb-1" style={{ color: "oklch(74% 0.16 290)" }}>
                  Transcribe Specific Segments
                </h4>
                <p className="text-xs text-aura-muted leading-relaxed">
                  Select <span className="text-aura-text font-medium">"Extract Audio"</span> first, then use the waveform viewer to select and transcribe specific sections. Perfect for long recordings.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "oklch(24% 0.025 280 / 0.40)",
              border: "1px solid oklch(66% 0.17 195 / 0.18)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex-shrink-0 p-2 rounded-lg"
                  style={{ background: "oklch(66% 0.17 195 / 0.10)" }}
                >
                  <Shield className="w-4 h-4" style={{ color: "oklch(66% 0.17 195)" }} />
                </div>
                <div>
                  <h4 className="font-jazz text-sm" style={{ color: "var(--text)" }}>100% Private & Offline</h4>
                  <p className="text-xs text-aura-muted">All processing happens in your browser</p>
                </div>
              </div>
              <div className="h-px" style={{ background: "oklch(66% 0.17 195 / 0.10)" }} />
              <div className="flex items-center gap-3">
                <div
                  className="flex-shrink-0 p-2 rounded-lg"
                  style={{ background: "oklch(66% 0.17 195 / 0.10)" }}
                >
                  <Server className="w-4 h-4 opacity-60" style={{ color: "oklch(66% 0.17 195)" }} />
                </div>
                <div>
                  <h4 className="font-jazz text-sm" style={{ color: "var(--text)" }}>Zero Data Collection</h4>
                  <p className="text-xs text-aura-muted">Your files never leave your device</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: File Selection */}
        <div className="flex flex-col h-full">
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-6 text-center">
              <h3 className="font-display text-2xl font-semibold tracking-tight mb-2 animate-text-gradient">Select Your Media File</h3>
              <p className="text-aura-muted text-sm">
                {isLoading
                  ? "Initializing processing engine..."
                  : "Drag and drop or click to browse your files"}
              </p>
            </div>

            <FileUploader
              onFileSelect={onFileSelect}
              recommendedFileSize={recommendedFileSize}
            />

            <div className="mt-6">
              <div
                className="rounded-lg p-4"
                style={{
                  background: "oklch(24% 0.025 280 / 0.40)",
                  border: "1px solid oklch(38% 0.02 280 / 0.25)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <p className="text-xs text-aura-muted text-center leading-relaxed">
                  <span className="text-aura-text font-medium">Legal Notice:</span> AI transcription is provided for personal use.
                  You are responsible for obtaining proper consent when transcribing recordings of others.
                  Accuracy may vary; always review transcripts before relying on them for official purposes.
                  The AI models run entirely in your browser—no audio data is transmitted to external servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
