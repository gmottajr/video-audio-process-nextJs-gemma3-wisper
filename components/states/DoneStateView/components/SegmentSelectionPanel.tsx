"use client";

import { Sparkles } from "lucide-react";
import { WaveformViewer } from "@/components/WaveformViewer";
import { ResourceComparison } from "@/components/ResourceComparison";
import ModelSelector from "@/components/ModelSelector";
import { EnhancementTimeWarning } from "@/components/transcription/EnhancementTimeWarning";
import { SegmentMetadataCard } from "./SegmentMetadataCard";
import type { WaveformSelection } from "@/components/WaveformViewer";
import type { ModelKey } from "@/components/ModelSelector";
import type { CompressionType } from "@/components/ActionSelector";
import type { SegmentResources } from "../services/segmentExtractor";

const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

const cardBase: React.CSSProperties = {
  background: "linear-gradient(180deg, #14141f 0%, #0d0d18 100%)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
};

const eyebrow: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#8a8a9c",
};

interface SegmentSelectionPanelProps {
  audioUrl: string;
  waveformSelection: WaveformSelection | null;
  setWaveformSelection: (s: WaveformSelection | null) => void;
  isExtractingSegment: boolean;
  extractionError: string | null;
  segmentModelKey: ModelKey;
  setSegmentModelKey: (k: ModelKey) => void;
  segmentCompressionType: CompressionType;
  setSegmentCompressionType: (t: CompressionType) => void;
  segmentNormalizeAudio: boolean;
  setSegmentNormalizeAudio: (v: boolean) => void;
  getSegmentResources: () => SegmentResources | null;
  handleTranscribeSegment: () => Promise<void>;
  isModelLoaded: boolean;
  isModelLoading: boolean;
  currentModel: string | null;
  onModelSelect?: (k: ModelKey) => void;
  file: File;
  metrics: any;
  onTranscribe?: (...args: any[]) => void;
}

export function SegmentSelectionPanel({
  audioUrl,
  waveformSelection,
  setWaveformSelection,
  isExtractingSegment,
  extractionError,
  segmentModelKey,
  setSegmentModelKey,
  segmentCompressionType,
  setSegmentCompressionType,
  segmentNormalizeAudio,
  setSegmentNormalizeAudio,
  getSegmentResources,
  handleTranscribeSegment,
  isModelLoaded,
  isModelLoading,
  currentModel,
  onModelSelect,
  file,
  metrics,
  onTranscribe,
}: SegmentSelectionPanelProps) {
  const segmentResources = getSegmentResources();

  return (
    <>
      <div style={{ ...cardBase, padding: 16 }}>
        <WaveformViewer
          audioUrl={audioUrl}
          selectable={true}
          onSelectionChange={setWaveformSelection}
        />
      </div>

      {waveformSelection && (
        <div className="mt-5" style={{ ...cardBase, padding: 20 }}>
          <SegmentMetadataCard
            file={file}
            selection={waveformSelection}
            totalDuration={metrics?.duration || 0}
            onClear={() => setWaveformSelection(null)}
          />

          {segmentResources && (
            <ResourceComparison
              fullAudio={segmentResources.fullAudio}
              segment={segmentResources.segment}
            />
          )}

          <div className="mt-4">
            <div style={{ ...eyebrow, marginBottom: 10 }}>Whisper Model</div>
            <ModelSelector
              selectedModel={segmentModelKey}
              currentlyLoadedModel={currentModel}
              isLoading={isModelLoading}
              onModelSelect={(key) => {
                setSegmentModelKey(key);
                if (onModelSelect) onModelSelect(key);
              }}
            />
          </div>

          <div className="mt-4 space-y-2.5">
            <div style={{ ...eyebrow, marginBottom: 8 }}>Audio Enhancement (Optional)</div>
            <label
              className="flex items-center gap-3 cursor-pointer transition-colors"
              style={{
                padding: 12,
                borderRadius: 10,
                background: "#1b1b28",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <input
                type="checkbox"
                checked={segmentCompressionType === "speech"}
                onChange={(e) =>
                  setSegmentCompressionType(e.target.checked ? "speech" : "none")
                }
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div style={{ fontSize: 13, fontWeight: 500 }}>Speech compression</div>
                <div style={{ fontSize: 11.5, color: "#8a8a9c" }}>
                  Optimize for voice (meetings, calls)
                </div>
              </div>
            </label>
            <label
              className="flex items-center gap-3 cursor-pointer transition-colors"
              style={{
                padding: 12,
                borderRadius: 10,
                background: "#1b1b28",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <input
                type="checkbox"
                checked={segmentNormalizeAudio}
                onChange={(e) => setSegmentNormalizeAudio(e.target.checked)}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div style={{ fontSize: 13, fontWeight: 500 }}>Normalize audio</div>
                <div style={{ fontSize: 11.5, color: "#8a8a9c" }}>Balance volume levels</div>
              </div>
            </label>

            <EnhancementTimeWarning
              compressionType={segmentCompressionType}
              normalizeAudio={segmentNormalizeAudio}
            />
          </div>

          <div className="mt-4">
            <button
              onClick={handleTranscribeSegment}
              disabled={
                isExtractingSegment || !onTranscribe || isModelLoading || !isModelLoaded
              }
              className="w-full flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                padding: "14px 20px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: FONT_DISPLAY,
                background: "linear-gradient(90deg, #8b5cf6, #22d3ee)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(139,92,246,0.35)",
              }}
            >
              {isExtractingSegment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Extracting segment…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Transcribe selection
                </>
              )}
            </button>

            {extractionError && (
              <div
                className="mt-3"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5",
                  fontSize: 12,
                }}
              >
                <strong>Error:</strong> {extractionError}
              </div>
            )}

            <p
              className="mt-3 text-center"
              style={{
                fontSize: 11,
                color: "#5b5b6e",
                fontFamily: FONT_MONO,
                letterSpacing: "0.05em",
              }}
            >
              💡 Only the selected segment will be transcribed — saves time and RAM
            </p>
          </div>
        </div>
      )}
    </>
  );
}
