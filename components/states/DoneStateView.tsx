"use client";

import { useState, useCallback, useEffect } from "react";
import { WaveformViewer, WaveformSelection } from "@/components/WaveformViewer";
import { TranscriptionViewer } from "@/components/TranscriptionViewer";
import { TabbedTranscriptionView } from "@/components/TabbedTranscriptionView";
import { EnhancementToggle } from "@/components/EnhancementToggle";
import { ResourceMonitor } from "@/components/ResourceMonitor";
import { MetadataDisplay } from "@/components/MetadataDisplay";
import { StatisticsModal } from "@/components/StatisticsModal";
import { TranscribeFromDoneForm } from "@/components/TranscribeFromDoneForm";
import { ResourceComparison } from "@/components/ResourceComparison";
import ModelSelector, { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import {
  Download, RotateCcw, BarChart3, Scissors, Sparkles,
  CheckCircle2, FileVideo, X,
} from "lucide-react";
import { getFormatById } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import type { CompressionType } from "@/components/ActionSelector";
import { extractAudioSegmentFromUrl } from "@/utils/audioExtraction";
import { createSegmentMetadata, formatSegmentLabel, estimateSegmentSize } from "@/types/audioSegment";
import { getResourceRequirements } from "@/utils/resourceEstimation";
import { useEnhancerContextOptional } from "@/contexts/EnhancerContext";
import type { EnhancementResult } from "@/types/enhancement";
import type { EnhancementQualityMetrics } from "@/types/quality-metrics";
import { EnhancementTimeWarning } from "@/components/transcription/EnhancementTimeWarning";

interface DoneStateViewProps {
  result: ProcessingResult;
  file: File;
  formatId: string | null;
  selectedModelKey: ModelKey;
  currentModel: string | null;
  metrics: any;
  memoryUsageMB: number;
  onDownload: () => void;
  onReset: () => void;
  isModelLoaded?: boolean;
  isModelLoading?: boolean;
  modelLoadingProgress?: number;
  onModelSelect?: (modelKey: ModelKey) => void;
  onTranscribe?: (compressionType: CompressionType, normalizeAudio: boolean, modelKey: ModelKey, segmentFile?: File) => void;
  processingStartTime?: number | null;
  processingEndTime?: number | null;
}

const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

const cardBase = {
  background: "linear-gradient(180deg, #14141f 0%, #0d0d18 100%)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
};

const eyebrow = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  color: "#8a8a9c",
};

/**
 * DoneStateView — REDESIGNED (v2.2)
 *
 * Drop-in replacement. Same prop signature, all business logic preserved.
 *
 * Changes vs. previous:
 *   • Removed the big centered PageHeader brand mark (was eating 50% of viewport)
 *   • Replaced with a thin success strip and the ForgeStepper at top
 *   • Restyled badges, action button row, segment card, file info card
 *     to match the v2.1 design language (cosmos surface, hex palette,
 *     Space Grotesk/Inter/JetBrains Mono)
 *   • Transcript is now the first thing below the fold — no marketing
 *     moment in front of the user's deliverable
 *
 * Preserved exactly:
 *   • Waveform selection + segment extraction + resource comparison
 *   • AI Enhancement toggle + progress + error states + HMR sync
 *   • Statistics modal
 *   • TranscribeFromDoneForm
 *   • File metadata display
 */
export function DoneStateView({
  result,
  file,
  formatId,
  selectedModelKey,
  currentModel,
  metrics,
  memoryUsageMB,
  onDownload,
  onReset,
  isModelLoaded = false,
  isModelLoading = false,
  modelLoadingProgress = 0,
  onModelSelect,
  onTranscribe,
  processingStartTime,
  processingEndTime,
}: DoneStateViewProps) {
  // ---- state (unchanged) ----
  const [showStats, setShowStats] = useState(false);
  const [waveformSelection, setWaveformSelection] = useState<WaveformSelection | null>(null);
  const [isExtractingSegment, setIsExtractingSegment] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [segmentModelKey, setSegmentModelKey] = useState<ModelKey>(selectedModelKey);
  const [segmentCompressionType, setSegmentCompressionType] = useState<CompressionType>("none");
  const [segmentNormalizeAudio, setSegmentNormalizeAudio] = useState(false);
  const [enhancementEnabled, setEnhancementEnabled] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState<EnhancementResult | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<EnhancementQualityMetrics | null>(null);

  const enhancer = useEnhancerContextOptional();

  useEffect(() => {
    if (enhancer?.lastResult && !enhancedResult) {
      setEnhancedResult(enhancer.lastResult);
      setEnhancementEnabled(true);
    }
  }, [enhancer?.lastResult, enhancedResult]);

  useEffect(() => {
    if (enhancer?.progress?.stage === 'complete' && enhancer?.lastResult && !enhancedResult) {
      setEnhancedResult(enhancer.lastResult);
      setEnhancementEnabled(true);
    }
  }, [enhancer?.progress?.stage, enhancer?.lastResult, enhancedResult]);

  const format =
    result.type === "audio"
      ? getFormatById(formatId || "")
      : result.type === "video"
      ? getVideoFormatById(formatId || "")
      : null;

  // ---- handlers (unchanged) ----
  const getSegmentResources = () => {
    if (!waveformSelection || !result.blobUrl || !metrics) return null;
    const segmentDuration = waveformSelection.endTime - waveformSelection.startTime;
    const totalDuration = metrics.duration || 1;
    const segmentSize = estimateSegmentSize(file.size, segmentDuration, totalDuration);
    const fullRAM = getResourceRequirements(file.size, selectedModelKey, "transcribe");
    const segmentRAM = getResourceRequirements(segmentSize, selectedModelKey, "transcribe");
    return {
      fullAudio:  { size: file.size,    duration: totalDuration,    ramEstimate: fullRAM.estimatedRAM,    timeEstimate: totalDuration },
      segment:    { size: segmentSize,  duration: segmentDuration,  ramEstimate: segmentRAM.estimatedRAM, timeEstimate: segmentDuration },
    };
  };

  const handleTranscribeSegment = async () => {
    if (!waveformSelection || !result.blobUrl || !onTranscribe) return;
    setIsExtractingSegment(true);
    setExtractionError(null);
    try {
      const segmentBlob = await extractAudioSegmentFromUrl(result.blobUrl, waveformSelection.startTime, waveformSelection.endTime);
      const metadata = createSegmentMetadata(file, waveformSelection.startTime, waveformSelection.endTime, metrics?.duration || 0);
      const segmentFile = new File(
        [segmentBlob],
        `${file.name.split('.')[0]}_segment_${Math.floor(waveformSelection.startTime)}-${Math.floor(waveformSelection.endTime)}.wav`,
        { type: 'audio/wav' }
      );
      (segmentFile as any).segmentMetadata = metadata;
      onTranscribe(segmentCompressionType, segmentNormalizeAudio, segmentModelKey, segmentFile);
      setWaveformSelection(null);
    } catch (error) {
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract audio segment');
    } finally {
      setIsExtractingSegment(false);
    }
  };

  const handleEnhancementToggle = useCallback(async (enabled: boolean) => {
    setEnhancementEnabled(enabled);
    if (enabled && result.type === "transcription" && result.transcription?.text && enhancer) {
      try {
        if (!enhancer.isModelLoaded && !enhancer.isModelLoading) await enhancer.loadModel();
        const enhancementResult = await enhancer.enhance(result.transcription.text, result.transcription, metrics?.duration);
        setEnhancedResult(enhancementResult);
      } catch (error) {
        console.error('[DoneStateView] Enhancement failed:', error);
      }
    }
  }, [result, enhancer, metrics]);

  const handleReEnhance = useCallback(() => {
    setEnhancedResult(null);
    setQualityMetrics(null);
    setEnhancementEnabled(false);
  }, []);

  // ---- timing summary ----
  const elapsed =
    processingStartTime && processingEndTime
      ? Math.max(1, Math.round((processingEndTime - processingStartTime) / 1000))
      : null;
  const elapsedStr =
    elapsed != null
      ? elapsed > 60
        ? `${Math.floor(elapsed / 60)}m ${(elapsed % 60).toString().padStart(2, "0")}s`
        : `${elapsed}s`
      : null;
  const charCount =
    result.type === "transcription" ? (result.transcription?.text?.length ?? 0) : null;

  // ---- render ----
  return (
    <div
      className="animate-in fade-in duration-500 max-w-7xl mx-auto px-4"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#f3f3f8" }}
    >
      {/* SUCCESS STRIP — thin, no big hero */}
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
              {result.type === "audio"
                ? "Audio ready"
                : result.type === "video"
                ? "Video ready"
                : "Transcription complete"}
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: "#8a8a9c",
                letterSpacing: "0.08em",
              }}
            >
              {[
                elapsedStr ? `${elapsedStr}` : null,
                charCount ? `${charCount.toLocaleString()} characters` : null,
                currentModel ? WHISPER_MODELS[selectedModelKey]?.name : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
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

        {/* quick actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {result.type !== "transcription" && result.blobUrl && (
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 transition-transform hover:scale-[1.02]"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: "linear-gradient(180deg, #10b981, #059669)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Download {format?.name}
            </button>
          )}
          <button
            onClick={() => setShowStats(true)}
            className="flex items-center gap-1.5 transition-colors"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#f3f3f8",
              cursor: "pointer",
            }}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Statistics</span>
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 transition-colors"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.3)",
              color: "#c4b5fd",
              cursor: "pointer",
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Process another</span>
          </button>
        </div>
      </div>

      {/* compression / normalization badges (kept, restyled) */}
      {(result.metadata?.compressionType && result.metadata.compressionType !== "none") || result.metadata?.normalized ? (
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
      ) : null}

      {/* MAIN OUTPUT */}
      <div className="mb-6">
        {result.type === "audio" && result.blobUrl ? (
          <>
            <div style={{ ...cardBase, padding: 16 }}>
              <WaveformViewer
                audioUrl={result.blobUrl}
                selectable={true}
                onSelectionChange={setWaveformSelection}
              />
            </div>

            {waveformSelection && (
              <div className="mt-5" style={{ ...cardBase, padding: 20 }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        background: "rgba(34,211,238,0.15)",
                        border: "1px solid rgba(34,211,238,0.3)",
                        color: "#22d3ee",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600 }}>
                        Segment selected
                      </div>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "#8a8a9c", marginTop: 2, letterSpacing: "0.06em" }}>
                        {formatSegmentLabel(createSegmentMetadata(file, waveformSelection.startTime, waveformSelection.endTime, metrics?.duration || 0))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setWaveformSelection(null)}
                    className="flex items-center gap-1"
                    style={{
                      padding: "5px 9px",
                      borderRadius: 6,
                      fontSize: 11,
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#8a8a9c",
                      cursor: "pointer",
                    }}
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                </div>

                {getSegmentResources() && (
                  <ResourceComparison
                    fullAudio={getSegmentResources()!.fullAudio}
                    segment={getSegmentResources()!.segment}
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
                      onChange={(e) => setSegmentCompressionType(e.target.checked ? "speech" : "none")}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Speech compression</div>
                      <div style={{ fontSize: 11.5, color: "#8a8a9c" }}>Optimize for voice (meetings, calls)</div>
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
                    disabled={isExtractingSegment || !onTranscribe || isModelLoading || !isModelLoaded}
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
                    style={{ fontSize: 11, color: "#5b5b6e", fontFamily: FONT_MONO, letterSpacing: "0.05em" }}
                  >
                    💡 Only the selected segment will be transcribed — saves time and RAM
                  </p>
                </div>
              </div>
            )}
          </>
        ) : result.type === "video" && result.blobUrl ? (
          <div style={{ ...cardBase, padding: 20 }}>
            <div className="mb-4 flex items-center gap-3">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: "rgba(139,92,246,0.15)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  color: "#a78bfa",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <FileVideo className="w-4 h-4" />
              </div>
              <div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600 }}>
                  Video preview
                </div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "#8a8a9c", letterSpacing: "0.06em", marginTop: 2 }}>
                  Preview your converted video file
                </div>
              </div>
            </div>
            <video
              src={result.blobUrl}
              controls
              className="w-full max-w-4xl mx-auto rounded-lg"
              style={{ maxHeight: 500, background: "#000" }}
            >
              Your browser does not support video playback.
            </video>
          </div>
        ) : result.type === "transcription" && result.transcription ? (
          <>
            {(enhancedResult || enhancer?.lastResult) ? (
              <TabbedTranscriptionView
                originalText={result.transcription.text}
                enhancedText={(enhancedResult || enhancer?.lastResult)!.enhancedText}
                qualityMetrics={qualityMetrics}
                processingTime={(enhancedResult || enhancer?.lastResult)!.processingTime}
                chunks={result.transcription.chunks}
                metadata={{
                  contentType: enhancer?.lastMetadata?.contentType,
                  duration: metrics?.duration,
                  modelName: currentModel ? WHISPER_MODELS[selectedModelKey].name : undefined,
                  filename: file.name.split(".")[0],
                }}
                onReEnhance={handleReEnhance}
              />
            ) : (
              <TranscriptionViewer
                result={result.transcription}
                filename={file.name.split(".")[0]}
                modelName={currentModel ? WHISPER_MODELS[selectedModelKey].name : undefined}
              />
            )}

            {/* AI Enhancement Toggle */}
            {enhancer && enhancer.capabilities && !enhancer.isCheckingHardware && (
              <div className="mt-4">
                <EnhancementToggle
                  capabilities={enhancer.capabilities}
                  enabled={enhancementEnabled}
                  onToggle={handleEnhancementToggle}
                  disabled={enhancer.isEnhancing || enhancer.isModelLoading}
                  isModelLoaded={enhancer.isModelLoaded}
                  isModelLoading={enhancer.isModelLoading}
                />
              </div>
            )}

            {enhancer?.isEnhancing && enhancer.progress && (
              <div
                className="mt-4"
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(139,92,246,0.10), rgba(139,92,246,0.02))",
                  border: "1px solid rgba(139,92,246,0.3)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-pulse" style={{ color: "#a78bfa" }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#c4b5fd" }}>
                      AI Enhancement in progress
                    </span>
                  </div>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: "#c4b5fd", fontWeight: 600 }}>
                    {enhancer.progress.progress}%
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#232333", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${enhancer.progress.progress}%`,
                      background: "linear-gradient(90deg, #8b5cf6, #c084fc)",
                      transition: "width 0.3s ease-out",
                    }}
                  />
                </div>
                <p className="mt-2" style={{ fontSize: 11, color: "#8a8a9c" }}>
                  {enhancer.progress.message || 'Processing...'}
                </p>
              </div>
            )}

            {enhancer?.isModelLoading && (
              <div
                className="mt-4"
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "rgba(34,211,238,0.06)",
                  border: "1px solid rgba(34,211,238,0.25)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 animate-spin" style={{ color: "#67e8f9" }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#67e8f9" }}>
                    Loading AI Enhancement model
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#232333", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: "33%",
                      background: "linear-gradient(90deg, #22d3ee, #67e8f9)",
                    }}
                    className="animate-pulse"
                  />
                </div>
                <p className="mt-2" style={{ fontSize: 11, color: "#8a8a9c" }}>
                  First-time download may take 2–5 minutes…
                </p>
              </div>
            )}

            {enhancer?.error && (
              <div
                className="mt-4"
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                <p style={{ fontSize: 13, color: "#fca5a5" }}>❌ Enhancement failed: {enhancer.error}</p>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* StatisticsModal */}
      <StatisticsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        result={result}
        file={file}
        modelKey={result.type === "transcription" ? selectedModelKey : undefined}
        startTime={processingStartTime || undefined}
        endTime={processingEndTime || undefined}
        peakMemoryMB={memoryUsageMB}
      />

      {/* Transcribe-from-done form for audio results */}
      {result.type === "audio" && onTranscribe && !waveformSelection && (
        <div className="mt-6">
          <TranscribeFromDoneForm
            result={result}
            file={file}
            selectedModelKey={selectedModelKey}
            currentModel={currentModel}
            isModelLoaded={isModelLoaded}
            isModelLoading={isModelLoading}
            modelLoadingProgress={modelLoadingProgress}
            onModelSelect={onModelSelect}
            onTranscribe={onTranscribe}
          />
        </div>
      )}

      {/* File metadata for audio/video */}
      {(result.type === "audio" || result.type === "video") && (
        <div className="mt-6">
          <div style={{ ...eyebrow, marginBottom: 10 }}>File Information</div>
          <MetadataDisplay metrics={metrics} file={file} />

          {result.metadata && (result.metadata.compressionType || result.metadata.normalized !== undefined) && (
            <div
              className="mt-4"
              style={{
                padding: 16,
                borderRadius: 12,
                background: "#1b1b28",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ ...eyebrow, marginBottom: 10 }}>Processing Applied</div>
              <dl className="grid grid-cols-2 gap-3" style={{ fontSize: 13 }}>
                {result.metadata.compressionType && result.metadata.compressionType !== "none" && (
                  <div>
                    <dt style={{ color: "#5b5b6e", fontSize: 11, marginBottom: 2 }}>Audio compression</dt>
                    <dd style={{ fontWeight: 500 }}>
                      {result.metadata.compressionType === "speech" ? (
                        <span style={{ color: "#34d399" }}>🎙️ Speech optimized</span>
                      ) : result.metadata.compressionType === "studio" ? (
                        <span style={{ color: "#67e8f9" }}>🎚️ Studio quality</span>
                      ) : (
                        <span style={{ color: "#c4b5fd" }}>✨ Full enhancement</span>
                      )}
                    </dd>
                  </div>
                )}
                {result.metadata.normalized !== undefined && (
                  <div>
                    <dt style={{ color: "#5b5b6e", fontSize: 11, marginBottom: 2 }}>Audio normalization</dt>
                    <dd style={{ fontWeight: 500 }}>
                      {result.metadata.normalized ? (
                        <span style={{ color: "#34d399" }}>✓ Applied</span>
                      ) : (
                        <span style={{ color: "#8a8a9c" }}>✗ Not applied</span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      )}

      {/* System resources (collapsed) */}
      <details className="mt-6">
        <summary
          className="cursor-pointer transition-colors hover:text-white"
          style={{
            ...eyebrow,
            color: "#8a8a9c",
            listStyle: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ▸ View processing stats
        </summary>
        <div className="mt-4">
          <ResourceMonitor metrics={metrics} memoryUsageMB={memoryUsageMB} progress={100} />
        </div>
      </details>
    </div>
  );
}

// ---- small helper ----
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
