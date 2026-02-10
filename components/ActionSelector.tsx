"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  className?: string;
}

export function ActionSelector({
  file,
  onAction,
  disabled,
  isModelLoading = false,
  isModelLoaded = false,
  modelLoadingProgress = 0,
  selectedModelKey = "base",
  transcriptionMode = "standard",
  className,
}: ActionSelectorProps) {
  const fileType = detectFileType(file);
  
  // Resource warnings handled by ResourceWarningCard component (shows for RAM >= 50GB)

  // State management
  const [videoMode, setVideoMode] = useState<VideoMode>("extract");
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
      return "💡 Tip: Speech compression recommended for multi-speaker content";
    }
    if (isPodcastContent && compressionType !== "studio") {
      return "💡 Tip: Studio compression recommended for professional broadcasting";
    }
    if (normalizeAudio && compressionType !== "none") {
      return "✨ Full audio enhancement active - optimal for transcription";
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
        return "🎵 Extract & Process Audio (Full Enhancement)";
      }
      if (compressionType === "speech") {
        return "🎙️ Extract & Compress Audio (Speech)";
      }
      if (compressionType === "studio") {
        return "🎚️ Extract & Compress Audio (Studio)";
      }
      if (compressionType === "both") {
        return "🎛️ Extract & Enhance Audio (Full)";
      }
      if (hasNormalization) {
        return "🎵 Extract & Normalize Audio";
      }
      return "Extract Audio";
    }
    
    if (fileType === "audio") {
      const segmentPrefix = waveformSelection ? "✂️ " : "";
      const segmentSuffix = waveformSelection ? " Segment" : "";
      
      if (hasCompression && hasNormalization) {
        return `${segmentPrefix}🎵 Normalize & Convert${segmentSuffix} to ${formatName}`;
      }
      if (compressionType === "speech") {
        return `${segmentPrefix}🎙️ Compress & Convert${segmentSuffix} to ${formatName}`;
      }
      if (compressionType === "studio") {
        return `${segmentPrefix}🎚️ Compress & Convert${segmentSuffix} to ${formatName}`;
      }
      if (compressionType === "both") {
        return `${segmentPrefix}🎛️ Enhance & Convert${segmentSuffix} to ${formatName}`;
      }
      if (hasNormalization) {
        return `${segmentPrefix}🎵 Normalize & Convert${segmentSuffix} to ${formatName}`;
      }
      return `${segmentPrefix}Convert${segmentSuffix} to ${formatName}`;
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

    if (fileType === "video") {
      if (videoMode === "extract") {
        onAction("extract", selectedAudioFormat, { normalizeAudio, compressionType }); // Pass normalization and compression
      } else if (videoMode === "transcribe") {
        onAction("transcribe", "", { normalizeAudio, compressionType }); // Pass enhancements for transcription
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
        segment: getSegmentOption()
      });
    }
  };

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
        <div className="px-2 py-1 rounded-full text-xs font-black shadow-lg flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500">
          <span>⚡</span>
          <span>INSTANT</span>
        </div>
      );
    }
    
    if (format.badge) {
      return (
        <div className="px-2 py-1 rounded-full text-xs font-black shadow-lg bg-gradient-to-r from-purple-600 to-pink-600">
          {format.badge}
        </div>
      );
    }
    
    return null;
  };

  // Unknown file type handling
  if (fileType === "unknown") {
    return (
      <div className={cn("bg-zinc-900 border border-zinc-800 rounded-lg p-6", className)}>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-xl font-bold text-red-400 mb-2">Unsupported File Type</h3>
          <p className="text-sm text-zinc-400 mb-4">
            This file type is not recognized as video or audio.
          </p>
          <p className="text-xs text-zinc-500">
            Supported: MP4, AVI, MOV, MKV, WebM, MP3, WAV, AAC, OGG
          </p>
        </div>
      </div>
    );
  }

  // Render main component
  return (
    <div className={cn("bg-zinc-900 border border-zinc-800 rounded-lg p-6", className)}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-zinc-100 mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" />
          {fileType === "video"
            ? videoMode === "extract"
              ? "Extract Audio from Video"
              : videoMode === "transcribe"
              ? "AI Transcription"
              : "Convert Video Container"
            : "Convert Audio Format"}
        </h3>
        <p className="text-sm text-zinc-400">
          {fileType === "video"
            ? videoMode === "extract"
              ? "Extract the audio track from your video file"
              : videoMode === "transcribe"
              ? "Generate text transcript using AI (Whisper model)"
              : "Convert your video to a different container format"
            : "Convert your audio to a different format"}
        </p>
      </div>

      {/* Video Mode Tabs (only for video files) */}
      {fileType === "video" && (
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
            <p className="text-xs text-zinc-400">
              Click and drag on the waveform to select a segment (optional)
            </p>
            {waveformSelection && (
              <button
                onClick={() => setWaveformSelection(null)}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Clear Selection
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
            <div className="mt-4 bg-blue-950/30 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Scissors className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-100">
                      Segment Selected
                    </h4>
                    <p className="text-xs text-blue-300/70 mt-0.5">
                      {formatSegmentLabel(segmentMetadata)}
                    </p>
                    {estimatedSegmentSize && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        ~{(estimatedSegmentSize / 1024 / 1024).toFixed(1)} MB
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-blue-300/80">
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
        <div className="mt-4 bg-gradient-to-br from-purple-950/30 to-indigo-950/30 border border-purple-500/30 rounded-lg p-5">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base font-bold text-zinc-100">
                🎚️ Audio Compression
              </span>
              <span className="text-xs text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-full font-bold">
                Professional
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Choose compression type based on your content
            </p>
          </div>

          <div className="space-y-2.5">
            {/* No Compression */}
            <label className="flex items-start cursor-pointer group p-3 rounded-lg border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/30 transition-all">
              <input
                type="radio"
                name="compression"
                value="none"
                checked={compressionType === "none"}
                onChange={(e) => setCompressionType(e.target.value as CompressionType)}
                disabled={disabled}
                className="mt-1 w-4 h-4 text-zinc-600 border-zinc-600 focus:ring-zinc-500 focus:ring-offset-zinc-900"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-zinc-100">⭕ No Compression</span>
                  <span className="text-xs text-zinc-500 bg-zinc-700/50 px-2 py-0.5 rounded-full">
                    default
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Keep natural dynamics • Use for high-quality recordings
                </p>
              </div>
            </label>

            {/* Speech Compression */}
            <label className="flex items-start cursor-pointer group p-3 rounded-lg border border-green-700/50 hover:border-green-600 hover:bg-green-950/20 transition-all">
              <input
                type="radio"
                name="compression"
                value="speech"
                checked={compressionType === "speech"}
                onChange={(e) => setCompressionType(e.target.value as CompressionType)}
                disabled={disabled}
                className="mt-1 w-4 h-4 text-green-600 border-zinc-600 focus:ring-green-500 focus:ring-offset-zinc-900"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-zinc-100">🎙️ Speech Compression</span>
                  <span className="text-xs text-green-300 bg-green-500/20 px-2 py-0.5 rounded-full font-medium">
                    +15% time
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-medium mb-1">
                  Best for: Meetings, interviews, conversations
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Effect: Balances different speaker volumes
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Technical: Dynamic frame-based normalization (dynaudnorm)
                </p>
              </div>
            </label>

            {/* Studio Compression */}
            <label className="flex items-start cursor-pointer group p-3 rounded-lg border border-blue-700/50 hover:border-blue-600 hover:bg-blue-950/20 transition-all">
              <input
                type="radio"
                name="compression"
                value="studio"
                checked={compressionType === "studio"}
                onChange={(e) => setCompressionType(e.target.value as CompressionType)}
                disabled={disabled}
                className="mt-1 w-4 h-4 text-blue-600 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-zinc-100">🎚️ Studio Compression</span>
                  <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                    +12% time
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-medium mb-1">
                  Best for: Podcasts, broadcasts, professional content
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Effect: Professional smooth compression
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Technical: Traditional threshold/ratio compression (acompressor)
                </p>
              </div>
            </label>

            {/* Both Compressions */}
            <label className="flex items-start cursor-pointer group p-3 rounded-lg border border-orange-700/50 hover:border-orange-600 hover:bg-orange-950/20 transition-all">
              <input
                type="radio"
                name="compression"
                value="both"
                checked={compressionType === "both"}
                onChange={(e) => setCompressionType(e.target.value as CompressionType)}
                disabled={disabled}
                className="mt-1 w-4 h-4 text-orange-600 border-zinc-600 focus:ring-orange-500 focus:ring-offset-zinc-900"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-zinc-100">🎛️ Both (Experimental)</span>
                  <span className="text-xs text-orange-300 bg-orange-500/20 px-2 py-0.5 rounded-full font-medium">
                    +25% time
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-medium mb-1">
                  Best for: Maximum dynamic range control
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Effect: Speech balancing + studio smoothing
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Technical: Sequential compression (may be overkill)
                </p>
                <p className="text-xs text-orange-400 mt-1.5 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>May over-compress, test with your content</span>
                </p>
              </div>
            </label>
          </div>

          {/* Smart Recommendation */}
          {getSmartRecommendation() && (
            <div className="mt-4 text-xs bg-gradient-to-r from-cyan-950/50 to-blue-950/50 border border-cyan-500/30 p-3 rounded-lg animate-in fade-in duration-300">
              <p className="text-cyan-200 font-medium">
                {getSmartRecommendation()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Compact Audio Enhancement for Transcribe Mode */}
      {videoMode === "transcribe" && (
        <div className={`mt-4 bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border border-indigo-500/30 rounded-lg p-4 ${transcriptionMode === 'fast' ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-zinc-100">
              🎵 Audio Enhancement (Optional)
            </span>
            <span className="text-xs text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
              Improves accuracy
            </span>
            {transcriptionMode === 'fast' && (
              <span className="text-xs text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                Disabled in Fast Mode
              </span>
            )}
          </div>
          
          {transcriptionMode === 'fast' && (
            <div className="mb-3 p-2.5 bg-amber-950/30 border border-amber-600/30 rounded-md">
              <p className="text-xs text-amber-300 leading-relaxed">
                <span className="font-semibold text-amber-200">⚡ Fast Mode:</span> Audio enhancements are disabled to maximize transcription speed. Distil-Whisper model provides fast, accurate transcription without preprocessing overhead.
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            {/* Compact Compression Selector */}
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1.5 block">
                Compression Type:
              </label>
              <select
                value={compressionType}
                onChange={(e) => setCompressionType(e.target.value as CompressionType)}
                disabled={disabled || transcriptionMode === 'fast'}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="none">⭕ No Compression (default)</option>
                <option value="speech">🎙️ Speech - Meetings, Interviews (+15%)</option>
                <option value="studio">🎚️ Studio - Podcasts, Broadcasts (+12%)</option>
                <option value="both">🎛️ Both - Maximum Enhancement (+25%)</option>
              </select>
            </div>
            
            {/* Normalization Checkbox */}
            <label className={`flex items-center ${transcriptionMode === 'fast' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer group'}`}>
              <input
                type="checkbox"
                checked={normalizeAudio}
                onChange={(e) => setNormalizeAudio(e.target.checked)}
                disabled={disabled || transcriptionMode === 'fast'}
                className="w-4 h-4 rounded border-zinc-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900"
              />
              <span className={`ml-2 text-sm text-zinc-100 ${transcriptionMode === 'fast' ? '' : 'group-hover:text-indigo-300 transition-colors'}`}>
                🎵 Normalize Audio (EBU R128)
              </span>
            </label>
          </div>

          {/* Smart Recommendation */}
          {getSmartRecommendation() && (
            <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded-md p-2.5">
              <p className="text-xs text-blue-300 leading-relaxed">
                {getSmartRecommendation()}
              </p>
            </div>
          )}
          
          {/* Time Warning - shows when any enhancement is enabled */}
          <EnhancementTimeWarning 
            compressionType={compressionType} 
            normalizeAudio={normalizeAudio} 
          />
          
          {/* Segment Transcription Tip */}
          <div className="mt-3 p-2.5 bg-amber-950/30 border border-amber-600/30 rounded-md">
            <p className="text-xs text-amber-300/90 leading-relaxed">
              <span className="font-semibold text-amber-200">✂️ Tip:</span> Need to transcribe only a portion? 
              Use <span className="font-semibold text-amber-200">"Extract Audio"</span> first, then select segments from the waveform.
            </p>
          </div>
        </div>
      )}

      {/* Audio Normalization Option (for extract and convert_audio only - NOT transcribe) */}
      {(videoMode === "extract" || fileType === "audio") && videoMode !== "transcribe" && (
        <div className="mt-4 bg-gradient-to-br from-blue-950/30 to-cyan-950/30 border border-blue-500/30 rounded-lg p-4">
          <label className="flex items-start cursor-pointer group">
            <input
              type="checkbox"
              checked={normalizeAudio}
              onChange={(e) => setNormalizeAudio(e.target.checked)}
              disabled={disabled}
              className="mt-1 w-5 h-5 text-blue-600 border-zinc-600 rounded focus:ring-blue-500 focus:ring-offset-zinc-900"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-zinc-100 group-hover:text-blue-300 transition-colors">
                  🎵 Normalize Audio Levels
                </span>
                <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                  +10% time
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Standardize volume to consistent level using EBU R128 loudnorm filter
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Recommended for quiet or inconsistent audio to improve transcription quality
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Main Action Button */}
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
                ? "🎵 Transcribe (Enhanced Audio)"
                : compressionType === "speech"
                ? "🎙️ Transcribe (Speech Compressed)"
                : compressionType === "studio"
                ? "🎚️ Transcribe (Studio Compressed)"
                : compressionType === "both"
                ? "🎛️ Transcribe (Full Enhancement)"
                : "🎵 Transcribe (Normalized Audio)"
              : "Start AI Transcription"
            : "Waiting for Model...")}
        {fileType === "audio" && getButtonText()}
      </ProgressButton>

      {/* Hint text */}
      <p className="mt-4 text-xs text-center text-zinc-500">
        {videoMode === "transcribe"
          ? isModelLoading
            ? `🤖 AI model is pre-loading in background... ${Math.round(
                modelLoadingProgress
              )}%`
            : isModelLoaded
            ? hasMultipleEnhancements
              ? "🤖 AI model ready • Audio will be enhanced before transcription • Better accuracy"
              : "🤖 AI model ready • Word-level timestamps • Export as TXT/JSON/SRT"
            : "⏳ Waiting for AI model to start loading..."
          : willRemux
          ? "⚡ This will be instant (remux only, no re-encoding)"
          : "Processing will happen in your browser using FFmpeg WebAssembly"}
      </p>

      {/* Separate AI Transcription Section (for audio files or non-transcribe video mode) */}
      {(fileType === "audio" || (fileType === "video" && videoMode !== "transcribe")) && (
        <div className="mt-6 pt-6 border-t border-zinc-800">
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
              ? `Loading AI Model... ${Math.round(modelLoadingProgress)}%`
              : isModelLoaded
              ? hasMultipleEnhancements
                ? compressionType !== "none" && normalizeAudio
                  ? waveformSelection ? "✂️ 🎵 Transcribe Segment (Enhanced)" : "🎵 Transcribe with Enhanced Audio"
                  : compressionType === "speech"
                  ? waveformSelection ? "✂️ 🎙️ Transcribe Segment (Speech)" : "🎙️ Transcribe with Speech Compression"
                  : compressionType === "studio"
                  ? waveformSelection ? "✂️ 🎚️ Transcribe Segment (Studio)" : "🎚️ Transcribe with Studio Compression"
                  : compressionType === "both"
                  ? waveformSelection ? "✂️ 🎛️ Transcribe Segment (Full)" : "🎛️ Transcribe with Full Enhancement"
                  : waveformSelection ? "✂️ 🎵 Transcribe Segment (Normalized)" : "🎵 Transcribe with Normalized Audio"
                : waveformSelection ? "✂️ Transcribe Selected Segment" : "Transcribe Audio to Text"
              : "Waiting for Model..."}
          </ProgressButton>
          <p className="mt-2 text-xs text-center text-zinc-500">
            {isModelLoading
              ? `Loading model... ${Math.round(modelLoadingProgress)}%`
              : isModelLoaded
              ? hasMultipleEnhancements
                ? "🎵 Audio will be enhanced before transcription for better accuracy"
                : "First run: ~40MB model download • Word-level timestamps • Export as TXT/JSON/SRT"
              : "⏳ Waiting for AI model to start loading..."}
          </p>
        </div>
      )}
    </div>
  );
}
