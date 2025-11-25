"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/utils/cn";
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

export type ActionType = "extract" | "convert_audio" | "convert_video" | "transcribe";

interface ActionSelectorProps {
  file: File;
  onAction: (action: ActionType, formatId: string, options?: { resolutionId?: string }) => void;
  disabled: boolean;
  isModelLoading?: boolean;
  isModelLoaded?: boolean;
  modelLoadingProgress?: number;
  className?: string;
}

export function ActionSelector({
  file,
  onAction,
  disabled,
  isModelLoading = false,
  isModelLoaded = false,
  modelLoadingProgress = 0,
  className,
}: ActionSelectorProps) {
  const fileType = detectFileType(file);

  // State management
  const [videoMode, setVideoMode] = useState<VideoMode>("extract");
  const audioFormats = getRecommendedFormats(fileType);
  const [selectedAudioFormat, setSelectedAudioFormat] = useState<string>(
    audioFormats[0]?.id || "wav"
  );
  const [selectedVideoFormat, setSelectedVideoFormat] = useState<string>("mp4");
  const [selectedResolution, setSelectedResolution] = useState<string>("original");

  // Derived state
  const selectedAudioConfig = getFormatById(selectedAudioFormat);
  const selectedVideoConfig = getVideoFormatById(selectedVideoFormat);
  const willRemux =
    fileType === "video" &&
    videoMode === "convert" &&
    selectedResolution === "original" &&
    canRemux(file, selectedVideoFormat);

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
        onAction("extract", selectedAudioFormat);
      } else if (videoMode === "transcribe") {
        onAction("transcribe", "");
      } else {
        onAction("convert_video", selectedVideoFormat, {
          resolutionId: selectedResolution,
        });
      }
    } else {
      onAction("convert_audio", selectedAudioFormat);
    }
  };

  const handleTranscribeAudio = () => {
    if (disabled) return;
    
    // 🔥 CRITICAL: Prevent transcribe if model is loading OR not loaded yet
    if (!isModelLoaded || isModelLoading) {
      console.log("[ActionSelector] Audio transcribe blocked - model not ready. isModelLoaded:", isModelLoaded, "isModelLoading:", isModelLoading);
      return;
    }
    
    onAction("transcribe", "");
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
      {fileType === "video" && videoMode === "transcribe" && <TranscribeInfoCard />}

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
        {fileType === "video" && videoMode === "extract" && "Extract Audio"}
        {fileType === "video" &&
          videoMode === "convert" &&
          `Convert to ${selectedVideoConfig?.name}`}
        {fileType === "video" &&
          videoMode === "transcribe" &&
          (isModelLoading
            ? `Loading AI Model... ${Math.round(modelLoadingProgress)}%`
            : isModelLoaded
            ? "Start AI Transcription"
            : "Waiting for Model...")}
        {fileType === "audio" && `Convert to ${selectedAudioConfig?.name}`}
      </ProgressButton>

      {/* Hint text */}
      <p className="mt-4 text-xs text-center text-zinc-500">
        {videoMode === "transcribe"
          ? isModelLoading
            ? `🤖 AI model is pre-loading in background... ${Math.round(
                modelLoadingProgress
              )}%`
            : isModelLoaded
            ? "🤖 AI model ready • Word-level timestamps • Export as TXT/JSON/SRT"
            : "⏳ Waiting for AI model to start loading..."
          : willRemux
          ? "⚡ This will be instant (remux only, no re-encoding)"
          : "Processing will happen in your browser using FFmpeg WebAssembly"}
      </p>

      {/* Separate AI Transcription Section (for audio files or non-transcribe video mode) */}
      {(fileType === "audio" || (fileType === "video" && videoMode !== "transcribe")) && (
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <TranscribeInfoCard compact />
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
              ? "Transcribe Audio to Text"
              : "Waiting for Model..."}
          </ProgressButton>
          <p className="mt-2 text-xs text-center text-zinc-500">
            {isModelLoading
              ? `Loading model... ${Math.round(modelLoadingProgress)}%`
              : isModelLoaded
              ? "First run: ~40MB model download • Word-level timestamps • Export as TXT/JSON/SRT"
              : "⏳ Waiting for AI model to start loading..."}
          </p>
        </div>
      )}
    </div>
  );
}
