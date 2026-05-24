"use client";

import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import type { TranscriptionMode } from "@/types/fast-mode";
import { Zap, AlertTriangle, Scissors } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatFileSize } from "@/utils/resourceEstimation";
import { ResourceWarningCard } from "@/components/ResourceWarningCard";
import type { ModelKey } from "@/components/ModelSelector";
import {
  SUPPORTED_AUDIO_FORMATS,
  detectFileType,
  getRecommendedFormats,
  getFormatById,
} from "@/utils/audioFormats";
import {
  SUPPORTED_VIDEO_FORMATS,
  RESOLUTION_OPTIONS,
  canRemux,
  getVideoFormatById,
} from "@/utils/videoFormats";
import { ProgressButton } from "./ProgressButton";
import { VideoModeTabs, type VideoMode } from "./VideoModeTabs";
import { TranscribeInfoCard } from "./TranscribeInfoCard";
import { FormatSelector } from "./FormatSelector";
import { ResolutionSelector } from "./ResolutionSelector";
import { FormatDetailsCard } from "./FormatDetailsCard";
import { EnhancementTimeWarning } from "./transcription/EnhancementTimeWarning";
import { WaveformViewer, type WaveformSelection } from "./WaveformViewer";
import { createSegmentMetadata, formatSegmentLabel, estimateSegmentSize } from "@/types/audioSegment";

export type ActionType = "extract" | "convert_audio" | "convert_video" | "transcribe";
export type CompressionType = "none" | "speech" | "studio" | "both";

// Extended options interface with segment support
export interface ActionOptions {
  resolutionId?: string;
  normalizeAudio?: boolean;
  compressionType?: CompressionType;
  segment?: { startTime: number; endTime: number };
  testMode?: boolean;
}

interface ActionSelectorProps {
  file: File;
  onAction: (action: ActionType, formatId: string, options?: ActionOptions) => void;
  disabled: boolean;
  isModelLoading?: boolean;
  isModelLoaded?: boolean;
  modelLoadingProgress?: number;
  selectedModelKey?: ModelKey; // NEW: For resource estimation
  transcriptionMode?: 'standard' | 'fast'; // NEW: Fast Mode support
  /** When set, ActionSelector becomes a controlled component: parent owns the
   *  video-mode state and passes it in. Falls back to internal state otherwise
   *  (backwards compatible). */
  videoMode?: VideoMode;
  onVideoModeChange?: (mode: VideoMode) => void;
  /** Hide the internal VideoModeTabs row. Use when an external action picker
   *  (e.g. the prominent tiles in InspectStateView) already shows them. */
  hideInternalTabs?: boolean;
  /** Hide the duplicate header ("Extract Audio / Convert Video / AI Transcription")
   *  when the parent already renders prominent action tiles above. */
  hideHeader?: boolean;
  /** Hide the in-form action button (and audio file's secondary transcribe section).
   *  Use when an external CTA — e.g. the dashboard's floating action bar — drives
   *  the action via the imperative handle below. */
  hideActionButton?: boolean;
  className?: string;
}

/** Imperative handle exposed via `ref` so an external CTA can fire the action. */
export interface ActionSelectorHandle {
  /** Trigger the same action the in-form button would, using current internal state. */
  triggerAction: () => void;
}

export const ActionSelector = forwardRef<ActionSelectorHandle, ActionSelectorProps>(function ActionSelector({
  file,
  onAction,
  disabled,
  isModelLoading = false,
  isModelLoaded = false,
  modelLoadingProgress = 0,
  selectedModelKey = "base",
  transcriptionMode = "standard",
  videoMode: videoModeProp,
  onVideoModeChange,
  hideInternalTabs = false,
  hideHeader = false,
  hideActionButton = false,
  className,
}, ref) {
  const fileType = detectFileType(file);
  
  // Resource warnings handled by ResourceWarningCard component (shows for RAM >= 50GB)

  // State management — internal videoMode used only when the parent doesn't control it.
  const [internalVideoMode, setInternalVideoMode] = useState<VideoMode>("extract");
  const videoMode = videoModeProp ?? internalVideoMode;
  const setVideoMode = (m: VideoMode) => {
    if (onVideoModeChange) onVideoModeChange(m);
    else setInternalVideoMode(m);
  };
  const audioFormats = getRecommendedFormats(fileType);
  const [selectedAudioFormat, setSelectedAudioFormat] = useState<string>(
    audioFormats[0]?.id || "wav"
  );
  const [selectedVideoFormat, setSelectedVideoFormat] = useState<string>("mp4");
  const [selectedResolution, setSelectedResolution] = useState<string>("original");
  const [normalizeAudio, setNormalizeAudio] = useState(false); // NEW: Audio normalization option
  const [compressionType, setCompressionType] = useState<CompressionType>("none"); // NEW: Audio compression option

  // Auto-disable enhancements for Fast Mode
  useEffect(() => {
    if (transcriptionMode === 'fast') {
      setCompressionType('none');
      setNormalizeAudio(false);
    }
  }, [transcriptionMode]);
  
  // Waveform selection state (for audio files)
  const [waveformSelection, setWaveformSelection] = useState<WaveformSelection | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  
  // Use a ref to cache the blob URL by file reference
  // This persists across React StrictMode double-mounting
  const blobUrlCacheRef = useRef<{ file: File; url: string } | null>(null);
  
  // Get or create blob URL for the current file
  const audioUrl = useMemo(() => {
    if (fileType !== "audio") {
      return null;
    }
    
    // Check if we already have a URL for this exact file
    if (blobUrlCacheRef.current?.file === file) {
      return blobUrlCacheRef.current.url;
    }
    
    // Revoke old URL if it exists and file changed
    if (blobUrlCacheRef.current) {
      URL.revokeObjectURL(blobUrlCacheRef.current.url);
    }
    
    // Create new blob URL
    const url = URL.createObjectURL(file);
    blobUrlCacheRef.current = { file, url };
    console.log("[ActionSelector] Created blob URL for audio:", url);
    return url;
  }, [file, fileType]);
  
  // Get segment metadata for display
  const segmentMetadata = useMemo(() => {
    if (!waveformSelection || audioDuration === 0) return null;
    return createSegmentMetadata(
      file,
      waveformSelection.startTime,
      waveformSelection.endTime,
      audioDuration
    );
  }, [file, waveformSelection, audioDuration]);
  
  // Estimate segment size
  const estimatedSegmentSize = useMemo(() => {
    if (!segmentMetadata) return null;
    return estimateSegmentSize(
      file.size,
      segmentMetadata.duration,
      audioDuration
    );
  }, [file.size, segmentMetadata, audioDuration]);

  // Derived state
  const selectedAudioConfig = getFormatById(selectedAudioFormat);
  const selectedVideoConfig = getVideoFormatById(selectedVideoFormat);
  const willRemux =
    fileType === "video" &&
    videoMode === "convert" &&
    selectedResolution === "original" &&
    canRemux(file, selectedVideoFormat);
  
  // Smart recommendations based on filename
  const filename = file.name.toLowerCase();
  const isMeetingContent = /meeting|interview|call|conversation|conference/i.test(filename);
  const isPodcastContent = /podcast|broadcast|episode|show/i.test(filename);
  const hasMultipleEnhancements = normalizeAudio || compressionType !== "none";
  const hasFullCompression = compressionType === "both";
  
  // Get smart recommendation
  const getSmartRecommendation = (): string | null => {
    if (isMeetingContent && compressionType !== "speech") {
      return "Speech compression recommended for multi-speaker content";
    }
    if (isPodcastContent && compressionType !== "studio") {
      return "Studio compression recommended for professional broadcasting";
    }
    if (normalizeAudio && compressionType !== "none") {
      return "Full audio enhancement active — optimal for transcription";
    }
    return null;
  };

  // Get dynamic button text based on selected enhancements
  const getButtonText = (): string => {
    const hasCompression = compressionType !== "none";
    const hasNormalization = normalizeAudio;
    const formatName = selectedAudioConfig?.name || "";

    if (fileType === "video" && videoMode === "extract") {
      if (hasCompression && hasNormalization) {
        return "Extract & Process Audio (Full Enhancement)";
      }
      if (compressionType === "speech") {
        return "Extract & Compress Audio (Speech)";
      }
      if (compressionType === "studio") {
        return "Extract & Compress Audio (Studio)";
      }
      if (compressionType === "both") {
        return "Extract & Enhance Audio (Full)";
      }
      if (hasNormalization) {
        return "Extract & Normalize Audio";
      }
      return "Extract Audio";
    }

    if (fileType === "audio") {
      const segmentSuffix = waveformSelection ? " Segment" : "";

      if (hasCompression && hasNormalization) {
        return `Normalize & Convert${segmentSuffix} to ${formatName}`;
      }
      if (compressionType === "speech") {
        return `Compress & Convert${segmentSuffix} to ${formatName}`;
      }
      if (compressionType === "studio") {
        return `Compress & Convert${segmentSuffix} to ${formatName}`;
      }
      if (compressionType === "both") {
        return `Enhance & Convert${segmentSuffix} to ${formatName}`;
      }
      if (hasNormalization) {
        return `Normalize & Convert${segmentSuffix} to ${formatName}`;
      }
      return `Convert${segmentSuffix} to ${formatName}`;
    }

    return "Start Processing";
  };
  
  // Build segment option if selection exists
  const getSegmentOption = () => {
    if (waveformSelection) {
      return { startTime: waveformSelection.startTime, endTime: waveformSelection.endTime };
    }
    return undefined;
  };
  
  // Handlers
  const handleStart = () => {
    if (disabled) return;

    // 🔥 CRITICAL: Prevent transcribe if model is loading OR not loaded yet
    if (videoMode === "transcribe" && (!isModelLoaded || isModelLoading)) {
      console.log("[ActionSelector] Transcribe blocked - model not ready. isModelLoaded:", isModelLoaded, "isModelLoading:", isModelLoading);
      return;
    }

    // Transcribe path (works for both video & audio when the parent's tile selection
    // routes audio + transcribe through here instead of the old secondary section).
    if (videoMode === "transcribe") {
      onAction("transcribe", "", {
        normalizeAudio,
        compressionType,
        segment: fileType === "audio" ? getSegmentOption() : undefined,
      });
      return;
    }

    if (fileType === "video") {
      if (videoMode === "extract") {
        onAction("extract", selectedAudioFormat, { normalizeAudio, compressionType });
      } else {
        onAction("convert_video", selectedVideoFormat, {
          resolutionId: selectedResolution,
        });
      }
    } else {
      // For audio files, include segment if selected
      onAction("convert_audio", selectedAudioFormat, {
        normalizeAudio,
        compressionType,
        segment: getSegmentOption(),
      });
    }
  };

  // Expose imperative trigger so an external CTA can fire the action.
  useImperativeHandle(ref, () => ({
    triggerAction: () => handleStart(),
  }), [handleStart]);

  const handleTranscribeAudio = () => {
    if (disabled) return;
    
    // 🔥 CRITICAL: Prevent transcribe if model is loading OR not loaded yet
    if (!isModelLoaded || isModelLoading) {
      console.log("[ActionSelector] Audio transcribe blocked - model not ready. isModelLoaded:", isModelLoaded, "isModelLoading:", isModelLoading);
      return;
    }
    
    // Include segment if selected
    onAction("transcribe", "", { 
      normalizeAudio, 
      compressionType,
      segment: getSegmentOption()
    });
  };

  // Badge generator for format selector
  const getFormatBadge = (format: any) => {
    const isRemux =
      "videoCodec" in format &&
      canRemux(file, format.id) &&
      selectedResolution === "original";

    if (isRemux) {
      return (
        <div
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: "oklch(66% 0.17 195 / 0.20)", color: "oklch(74% 0.13 195)", border: "1px solid oklch(66% 0.17 195 / 0.35)" }}
        >
          Instant
        </div>
      );
    }

    if (format.badge) {
      return (
        <div
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: "oklch(60% 0.28 290 / 0.18)", color: "oklch(74% 0.16 290)", border: "1px solid oklch(60% 0.28 290 / 0.35)" }}
        >
          {format.badge}
        </div>
      );
    }

    return null;
  };

  // Unknown file type handling
  if (fileType === "unknown") {
    return (
      <div className={cn("rounded-xl p-6", className)} style={{ background: "oklch(22% 0.025 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)" }}>
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "oklch(30% 0.08 25 / 0.40)", border: "1px solid oklch(55% 0.18 25 / 0.30)" }}>
            <AlertTriangle className="w-7 h-7" style={{ color: "oklch(70% 0.14 25)" }} />
          </div>
          <h3 className="font-jazz text-lg mb-2 text-aura-text">Unsupported File Type</h3>
          <p className="text-sm text-aura-muted mb-2">This file type is not recognized as video or audio.</p>
          <p className="text-xs text-aura-muted opacity-60 font-mono">MP4 · AVI · MOV · MKV · WebM · MP3 · WAV · AAC · OGG</p>
        </div>
      </div>
    );
  }

  // Render main component
  return (
    <div className={cn("rounded-xl p-5", className)} style={{ background: "oklch(22% 0.025 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)", backdropFilter: "blur(8px)" }}>
      {/* Header — hidden when parent shows the prominent action tiles */}
      {!hideHeader && (
        <div className="mb-5">
          <h3 className="font-jazz text-base text-aura-text mb-1 flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: "oklch(74% 0.16 290)" }} />
            {fileType === "video"
              ? videoMode === "extract" ? "Extract Audio" : videoMode === "transcribe" ? "AI Transcription" : "Convert Video"
              : "Convert Audio"}
          </h3>
          <p className="text-xs text-aura-muted pl-6">
            {fileType === "video"
              ? videoMode === "extract" ? "Extract the audio track from your video file"
                : videoMode === "transcribe" ? "Generate text transcript using Whisper AI"
                : "Convert your video to a different container format"
              : "Convert your audio to a different format"}
          </p>
        </div>
      )}

      {/* Video Mode Tabs (only for video files, only when not externally controlled) */}
      {fileType === "video" && !hideInternalTabs && (
        <VideoModeTabs selectedMode={videoMode} onModeChange={setVideoMode} />
      )}

      {/* Transcribe Info Card (for transcribe mode on video) */}
      {fileType === "video" && videoMode === "transcribe" && (
        <>
          <TranscribeInfoCard />
          
          {/* Resource Warning for Heavy Processing */}
          <ResourceWarningCard 
            file={file} 
            modelKey={selectedModelKey}
            className="mt-4"
            minRAMThreshold={50}
          />
        </>
      )}

      {/* Waveform Viewer with Segment Selection (for audio files) */}
      {fileType === "audio" && audioUrl && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-aura-muted">
              Click and drag on the waveform to select a segment (optional)
            </p>
            {waveformSelection && (
              <button
                onClick={() => setWaveformSelection(null)}
                className="text-xs underline transition-colors"
                style={{ color: "oklch(74% 0.16 290)" }}
              >
                Clear selection
              </button>
            )}
          </div>
          <WaveformViewer
            audioUrl={audioUrl}
            selectable={true}
            onSelectionChange={(selection) => {
              setWaveformSelection(selection);
            }}
          />

          {/* Segment Info Card (when selection exists) */}
          {segmentMetadata && (
            <div
              className="mt-4 rounded-lg p-4"
              style={{ background: "oklch(28% 0.04 290 / 0.40)", border: "1px solid oklch(60% 0.28 290 / 0.30)" }}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg" style={{ background: "oklch(60% 0.28 290 / 0.18)" }}>
                  <Scissors className="w-4 h-4" style={{ color: "oklch(74% 0.16 290)" }} />
                </div>
                <div>
                  <h4 className="font-jazz text-sm text-aura-text">Segment Selected</h4>
                  <p className="text-xs text-aura-muted mt-0.5">{formatSegmentLabel(segmentMetadata)}</p>
                  {estimatedSegmentSize && (
                    <p className="text-xs text-aura-muted opacity-60 mt-0.5 font-mono">
                      ~{(estimatedSegmentSize / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-aura-muted">
                All actions below will apply to this segment only.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Format Selection (hide for transcribe mode) */}
      {!(fileType === "video" && videoMode === "transcribe") && (
        <FormatSelector
          formats={
            fileType === "audio" || videoMode === "extract"
              ? audioFormats
              : SUPPORTED_VIDEO_FORMATS
          }
          selectedId={
            fileType === "audio" || videoMode === "extract"
              ? selectedAudioFormat
              : selectedVideoFormat
          }
          onSelect={
            fileType === "audio" || videoMode === "extract"
              ? setSelectedAudioFormat
              : setSelectedVideoFormat
          }
          disabled={disabled}
          type={fileType === "audio" || videoMode === "extract" ? "audio" : "video"}
          getBadge={videoMode === "convert" ? getFormatBadge : undefined}
        />
      )}

      {/* Resolution Selector (only for video conversion) */}
      {fileType === "video" && videoMode === "convert" && (
        <ResolutionSelector
          resolutions={RESOLUTION_OPTIONS}
          selectedId={selectedResolution}
          onSelect={setSelectedResolution}
          disabled={disabled}
          showWarning
        />
      )}

      {/* Format Details Card */}
      {videoMode === "extract" && selectedAudioConfig && (
        <FormatDetailsCard format={selectedAudioConfig} type="audio" />
      )}
      {fileType === "audio" && selectedAudioConfig && (
        <FormatDetailsCard format={selectedAudioConfig} type="audio" />
      )}
      {videoMode === "convert" && selectedVideoConfig && (
        <FormatDetailsCard
          format={selectedVideoConfig}
          type="video"
          willRemux={willRemux}
        />
      )}

      {/* Audio Compression Selector (for extract and convert_audio only - NOT transcribe) */}
      {(videoMode === "extract" || fileType === "audio") && videoMode !== "transcribe" && (
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
            {[
              { value: "none",   label: "No Compression",        sub: "Meetings, interviews, conversations",   badge: "Default",  badgeMuted: true },
              { value: "speech", label: "Speech Compression",    sub: "Balances different speaker volumes",    badge: "+15% time", badgeMuted: false },
              { value: "studio", label: "Studio Compression",    sub: "Podcasts, broadcasts, professional",    badge: "+12% time", badgeMuted: false },
              { value: "both",   label: "Both (Experimental)",   sub: "Speech balancing + studio smoothing",  badge: "+25% time", badgeMuted: false },
            ].map(({ value, label, sub, badge, badgeMuted }) => {
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
                    onChange={(e) => setCompressionType(e.target.value as CompressionType)}
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

          {/* Smart Recommendation */}
          {getSmartRecommendation() && (
            <div
              className="mt-4 text-xs p-3 rounded-lg animate-in fade-in duration-300"
              style={{ background: "oklch(28% 0.04 290 / 0.30)", border: "1px solid oklch(60% 0.28 290 / 0.30)" }}
            >
              <p style={{ color: "oklch(80% 0.12 290)" }}>{getSmartRecommendation()}</p>
            </div>
          )}
        </div>
      )}

      {/* Compact Audio Enhancement for Transcribe Mode */}
      {videoMode === "transcribe" && (
        <div
          className={`mt-4 rounded-xl p-4 ${transcriptionMode === "fast" ? "opacity-60" : ""}`}
          style={{ background: "oklch(19% 0.02 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)" }}
        >
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <p className="font-jazz text-sm text-aura-text">Audio Enhancement</p>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "oklch(66% 0.17 195 / 0.15)", color: "oklch(74% 0.13 195)" }}
            >
              Improves accuracy
            </span>
            {transcriptionMode === "fast" && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "oklch(72% 0.16 55 / 0.18)", color: "oklch(80% 0.14 55)" }}
              >
                Disabled in Fast Mode
              </span>
            )}
          </div>

          {transcriptionMode === "fast" && (
            <div
              className="mb-3 p-2.5 rounded-md"
              style={{ background: "oklch(72% 0.16 55 / 0.10)", border: "1px solid oklch(72% 0.16 55 / 0.25)" }}
            >
              <p className="text-xs leading-relaxed" style={{ color: "oklch(80% 0.14 55)" }}>
                <span className="font-semibold" style={{ color: "oklch(86% 0.14 55)" }}>Fast Mode:</span>{" "}
                Audio enhancements are disabled to maximize transcription speed.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div>
              <label className="text-xs text-aura-muted mb-1.5 block">Compression Type:</label>
              <select
                value={compressionType}
                onChange={(e) => setCompressionType(e.target.value as CompressionType)}
                disabled={disabled || transcriptionMode === "fast"}
                className="w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                style={{
                  background: "oklch(24% 0.025 280 / 0.80)",
                  border: "1px solid oklch(38% 0.02 280 / 0.50)",
                  color: "var(--text)",
                }}
              >
                <option value="none">No Compression (default)</option>
                <option value="speech">Speech — Meetings, Interviews (+15%)</option>
                <option value="studio">Studio — Podcasts, Broadcasts (+12%)</option>
                <option value="both">Both — Maximum Enhancement (+25%)</option>
              </select>
            </div>

            <label className={`flex items-center gap-2 ${transcriptionMode === "fast" ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={normalizeAudio}
                onChange={(e) => setNormalizeAudio(e.target.checked)}
                disabled={disabled || transcriptionMode === "fast"}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-aura-text">Normalize Audio (EBU R128)</span>
            </label>
          </div>

          {/* Smart Recommendation */}
          {getSmartRecommendation() && (
            <div
              className="mt-3 p-2.5 rounded-md animate-in fade-in duration-300"
              style={{ background: "oklch(28% 0.04 290 / 0.30)", border: "1px solid oklch(60% 0.28 290 / 0.30)" }}
            >
              <p className="text-xs" style={{ color: "oklch(80% 0.12 290)" }}>{getSmartRecommendation()}</p>
            </div>
          )}

          {/* Time Warning */}
          <EnhancementTimeWarning compressionType={compressionType} normalizeAudio={normalizeAudio} />

          {/* Segment Transcription Tip */}
          <div
            className="mt-3 p-2.5 rounded-md"
            style={{ background: "oklch(72% 0.16 55 / 0.08)", border: "1px solid oklch(72% 0.16 55 / 0.20)" }}
          >
            <p className="text-xs leading-relaxed" style={{ color: "oklch(78% 0.13 55)" }}>
              Need to transcribe only a portion? Use{" "}
              <span className="font-semibold" style={{ color: "oklch(84% 0.14 55)" }}>"Extract Audio"</span>{" "}
              first, then select segments from the waveform.
            </p>
          </div>
        </div>
      )}

      {/* Audio Normalization Option (for extract and convert_audio only - NOT transcribe) */}
      {(videoMode === "extract" || fileType === "audio") && videoMode !== "transcribe" && (
        <div
          className="mt-4 rounded-xl p-4"
          style={{ background: "oklch(19% 0.02 280)", border: "1px solid oklch(38% 0.02 280 / 0.35)" }}
        >
          <label className="flex items-start cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={normalizeAudio}
              onChange={(e) => setNormalizeAudio(e.target.checked)}
              disabled={disabled}
              className="mt-0.5 w-4 h-4 shrink-0 rounded"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-jazz text-sm text-aura-text">Normalize Audio Levels</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                  style={{ background: "oklch(66% 0.17 195 / 0.18)", color: "oklch(74% 0.13 195)" }}
                >
                  +10% time
                </span>
              </div>
              <p className="text-xs text-aura-muted leading-relaxed">
                Standardize volume to a consistent level using EBU R128 loudnorm.
                Recommended for quiet or inconsistent audio.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Main Action Button — hidden when an external CTA drives the action */}
      {!hideActionButton && (
      <ProgressButton
        onClick={handleStart}
        disabled={disabled || (videoMode === "transcribe" && (!isModelLoaded || isModelLoading))}
        isLoading={videoMode === "transcribe" && isModelLoading}
        progress={modelLoadingProgress}
        variant={videoMode === "transcribe" ? "transcribe" : "primary"}
        icon={videoMode === "transcribe" ? "brain" : "play"}
        size="large"
      >
        {fileType === "video" && videoMode === "extract" && getButtonText()}
        {fileType === "video" &&
          videoMode === "convert" &&
          `Convert to ${selectedVideoConfig?.name}`}
        {fileType === "video" &&
          videoMode === "transcribe" &&
          (isModelLoading
            ? `Loading AI Model... ${Math.round(modelLoadingProgress)}%`
            : isModelLoaded
            ? hasMultipleEnhancements
              ? compressionType !== "none" && normalizeAudio
                ? "Transcribe (Enhanced Audio)"
                : compressionType === "speech"
                ? "Transcribe (Speech Compressed)"
                : compressionType === "studio"
                ? "Transcribe (Studio Compressed)"
                : compressionType === "both"
                ? "Transcribe (Full Enhancement)"
                : "Transcribe (Normalized Audio)"
              : "Start AI Transcription"
            : "Waiting for Model...")}
        {fileType === "audio" && getButtonText()}
      </ProgressButton>
      )}

      {/* Hint text */}
      {!hideActionButton && (
      <p className="mt-4 text-xs text-center text-aura-muted">
        {videoMode === "transcribe"
          ? isModelLoading
            ? `AI model loading… ${Math.round(modelLoadingProgress)}%`
            : isModelLoaded
            ? hasMultipleEnhancements
              ? "Model ready · Audio will be enhanced before transcription"
              : "Model ready · Word-level timestamps · Export as TXT / JSON / SRT"
            : "Waiting for AI model to start loading…"
          : willRemux
          ? "Instant — remux only, no re-encoding"
          : "Processing happens in your browser via FFmpeg WebAssembly"}
      </p>
      )}

      {/* Separate AI Transcription Section (for audio files or non-transcribe video mode).
       *  Hidden when an external CTA already drives the action — the action tile +
       *  floating CTA pattern doesn't need a secondary in-form transcribe button. */}
      {!hideActionButton && (fileType === "audio" || (fileType === "video" && videoMode !== "transcribe")) && (
        <div
          className="mt-6 pt-6"
          style={{ borderTop: "1px solid oklch(38% 0.02 280 / 0.35)" }}
        >
          <TranscribeInfoCard compact />

          {/* Resource Warning for Audio File Transcription */}
          {fileType === "audio" && (
            <ResourceWarningCard
              file={file}
              modelKey={selectedModelKey}
              className="mb-4"
              minRAMThreshold={50}
            />
          )}

          <ProgressButton
            onClick={handleTranscribeAudio}
            disabled={disabled || !isModelLoaded || isModelLoading}
            isLoading={isModelLoading}
            progress={modelLoadingProgress}
            variant="transcribe"
            icon="brain"
          >
            {isModelLoading
              ? `Loading AI Model… ${Math.round(modelLoadingProgress)}%`
              : isModelLoaded
              ? hasMultipleEnhancements
                ? compressionType !== "none" && normalizeAudio
                  ? waveformSelection ? "Transcribe Segment (Enhanced)" : "Transcribe with Enhanced Audio"
                  : compressionType === "speech"
                  ? waveformSelection ? "Transcribe Segment (Speech)" : "Transcribe with Speech Compression"
                  : compressionType === "studio"
                  ? waveformSelection ? "Transcribe Segment (Studio)" : "Transcribe with Studio Compression"
                  : compressionType === "both"
                  ? waveformSelection ? "Transcribe Segment (Full)" : "Transcribe with Full Enhancement"
                  : waveformSelection ? "Transcribe Segment (Normalized)" : "Transcribe with Normalized Audio"
                : waveformSelection ? "Transcribe Selected Segment" : "Transcribe Audio to Text"
              : "Waiting for Model…"}
          </ProgressButton>
          <p className="mt-2 text-xs text-center text-aura-muted">
            {isModelLoading
              ? `Loading model… ${Math.round(modelLoadingProgress)}%`
              : isModelLoaded
              ? hasMultipleEnhancements
                ? "Audio will be enhanced before transcription for better accuracy"
                : "First run: ~40 MB model download · Word-level timestamps · Export as TXT / JSON / SRT"
              : "Waiting for AI model to start loading…"}
          </p>
        </div>
      )}
    </div>
  );
});
