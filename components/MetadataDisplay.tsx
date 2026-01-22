"use client";

import { FileVideo, FileAudio, Clock, Gauge, Film, Disc } from "lucide-react";
import { cn } from "@/utils/cn";

interface FFmpegMetrics {
  speed: number | null;
  duration: number | null;
  bitrate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  resolution: string | null;
  fps: number | null;
}

interface MetadataDisplayProps {
  metrics: FFmpegMetrics;
  file: File | null;
  className?: string;
  variant?: "default" | "compact";
}

export function MetadataDisplay({ metrics, file, className, variant = "default" }: MetadataDisplayProps) {
  // Format duration from seconds to HH:MM:SS
  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return "—";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  // Determine if file is video or audio
  const isVideo = file && file.type.startsWith("video/");
  const isAudio = file && file.type.startsWith("audio/");

  // Compact variant - single row with key info
  if (variant === "compact") {
    return (
      <div className={cn("bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3", className)}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* File icon and name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-zinc-800 rounded shrink-0">
              {isVideo ? (
                <FileVideo className="w-4 h-4 text-blue-400" />
              ) : isAudio ? (
                <FileAudio className="w-4 h-4 text-cyan-400" />
              ) : (
                <Disc className="w-4 h-4 text-zinc-500" />
              )}
            </div>
            <span className="font-mono text-sm text-zinc-100 truncate max-w-[200px]" title={file?.name}>
              {file?.name || "—"}
            </span>
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-zinc-700 hidden sm:block" />

          {/* Size */}
          <div className="flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">Size:</span>
            <span className="font-mono text-sm text-zinc-200">{file ? formatFileSize(file.size) : "—"}</span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">Duration:</span>
            <span className="font-mono text-sm text-zinc-200">{formatDuration(metrics.duration)}</span>
          </div>

          {/* Resolution (video only) */}
          {isVideo && metrics.resolution && (
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-400">Res:</span>
              <span className="font-mono text-sm text-zinc-200">{metrics.resolution}</span>
            </div>
          )}

          {/* Format */}
          <div className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">Format:</span>
            <span className="font-mono text-sm text-zinc-200">{file?.type.split("/")[1].toUpperCase() || "—"}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-zinc-900 border border-zinc-800 rounded-lg p-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-zinc-800 rounded">
          {isVideo ? (
            <FileVideo className="w-5 h-5 text-blue-400" />
          ) : isAudio ? (
            <FileAudio className="w-5 h-5 text-cyan-400" />
          ) : (
            <Disc className="w-5 h-5 text-zinc-500" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">File Metadata</h3>
          <p className="text-xs text-zinc-500">
            {file ? "Extracted from FFmpeg logs" : "No file selected"}
          </p>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* File Name */}
        <MetadataCard
          label="File Name"
          value={file?.name || "—"}
          icon={<Film className="w-4 h-4" />}
          fullWidth={!!(file && file.name.length > 30)}
        />

        {/* File Size */}
        <MetadataCard
          label="File Size"
          value={file ? formatFileSize(file.size) : "—"}
          icon={<Disc className="w-4 h-4" />}
        />

        {/* Duration */}
        <MetadataCard
          label="Duration"
          value={formatDuration(metrics.duration)}
          icon={<Clock className="w-4 h-4" />}
        />

        {/* Resolution */}
        {isVideo && (
          <MetadataCard
            label="Resolution"
            value={metrics.resolution || "—"}
            icon={<Gauge className="w-4 h-4" />}
          />
        )}

        {/* FPS */}
        {isVideo && (
          <MetadataCard
            label="Frame Rate"
            value={metrics.fps !== null ? `${metrics.fps} fps` : "—"}
            icon={<Film className="w-4 h-4" />}
          />
        )}

        {/* Video Codec */}
        {isVideo && (
          <MetadataCard
            label="Video Codec"
            value={metrics.videoCodec ? metrics.videoCodec.toUpperCase() : "—"}
            icon={<FileVideo className="w-4 h-4" />}
          />
        )}

        {/* Audio Codec */}
        <MetadataCard
          label="Audio Codec"
          value={metrics.audioCodec ? metrics.audioCodec.toUpperCase() : "—"}
          icon={<FileAudio className="w-4 h-4" />}
        />

        {/* Bitrate */}
        <MetadataCard
          label="Bitrate"
          value={metrics.bitrate !== null ? `${metrics.bitrate} kb/s` : "—"}
          icon={<Gauge className="w-4 h-4" />}
        />

        {/* File Type */}
        <MetadataCard
          label="File Type"
          value={file?.type.split("/")[1].toUpperCase() || "—"}
          icon={<Disc className="w-4 h-4" />}
        />
      </div>

      {/* Empty State */}
      {!file && (
        <div className="text-center py-8 text-zinc-500">
          <Disc className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm">Upload a file to view metadata</p>
        </div>
      )}
    </div>
  );
}

interface MetadataCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  fullWidth?: boolean;
}

function MetadataCard({ label, value, icon, fullWidth = false }: MetadataCardProps) {
  return (
    <div
      className={cn(
        "bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50",
        fullWidth && "col-span-2 md:col-span-3"
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-zinc-500">{icon}</div>
        <p className="text-xs text-zinc-400">{label}</p>
      </div>
      <p
        className={cn(
          "font-mono text-sm text-zinc-100",
          value === "—" && "text-zinc-600",
          fullWidth && "truncate"
        )}
        title={fullWidth ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}

