"use client";

import { WaveformViewer } from "@/components/WaveformViewer";
import { TranscriptionViewer } from "@/components/TranscriptionViewer";
import { ResourceMonitor } from "@/components/ResourceMonitor";
import { Download, RotateCcw } from "lucide-react";
import { getFormatById } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import { PageHeader } from "@/components/PageHeader";

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
}

/**
 * DONE State View
 * Shows processing results with preview and download
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
}: DoneStateViewProps) {
  const format =
    result.type === "audio"
      ? getFormatById(formatId || "")
      : result.type === "video"
      ? getVideoFormatById(formatId || "")
      : null;

  return (
    <div className="animate-in fade-in duration-500">
      {/* Main Title & Subtitle */}
      <PageHeader 
        subtitle="Processing Complete"
        description={
          result.type === "audio"
            ? "Your audio file is ready. Listen to the preview or download it."
            : result.type === "video"
            ? "Your video file is ready. Preview it or download it."
            : "Your transcription is ready. View the text or download it."
        }
        icon="✓"
      />

      <div className="mb-6 text-center">
        {/* NEW: Show normalization status badge */}
        {result.metadata?.normalized && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-950/50 border border-blue-500/30 rounded-full text-sm animate-in fade-in duration-300 shadow-lg shadow-blue-500/10">
            <span className="text-blue-400 font-bold">🎵</span>
            <span className="text-blue-300 font-medium">
              Audio normalized for optimal quality
            </span>
          </div>
        )}
      </div>

      {/* Output Preview */}
      <div className="mb-6">
        {result.type === "audio" && result.blobUrl ? (
          <WaveformViewer audioUrl={result.blobUrl} />
        ) : result.type === "video" && result.blobUrl ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-zinc-100 mb-2 flex items-center gap-2">
                🎬 Video Preview
              </h3>
              <p className="text-sm text-zinc-400">
                Preview your converted video file
              </p>
            </div>
            <video
              src={result.blobUrl}
              controls
              className="w-full max-w-4xl mx-auto rounded-lg shadow-2xl bg-black"
              style={{ maxHeight: "500px" }}
            >
              Your browser does not support video playback.
            </video>
          </div>
        ) : result.type === "transcription" && result.transcription ? (
          <TranscriptionViewer
            result={result.transcription}
            filename={file.name.split(".")[0]}
            modelName={
              currentModel ? WHISPER_MODELS[selectedModelKey].name : undefined
            }
          />
        ) : null}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
        {result.type !== "transcription" && result.blobUrl && (
          <button
            onClick={onDownload}
            className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
          >
            <Download className="w-5 h-5" />
            Download {format?.name} File
          </button>
        )}

        <button
          onClick={onReset}
          className={`px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg ${
            result.type === "transcription" ? "flex-1" : ""
          }`}
        >
          <RotateCcw className="w-5 h-5" />
          Process Another
        </button>
      </div>

      {/* File Details (for audio/video results) */}
      {result.metadata && (result.type === "audio" || result.type === "video") && (
        <div className="mt-6 max-w-2xl mx-auto bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">File Details</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {result.metadata.format && (
              <div>
                <dt className="text-zinc-500">Format</dt>
                <dd className="font-medium text-zinc-200 uppercase">{result.metadata.format}</dd>
              </div>
            )}
            {result.metadata.size && (
              <div>
                <dt className="text-zinc-500">Size</dt>
                <dd className="font-medium text-zinc-200">
                  {(result.metadata.size / 1024 / 1024).toFixed(2)} MB
                </dd>
              </div>
            )}
            {result.metadata.normalized !== undefined && (
              <div>
                <dt className="text-zinc-500">Normalized</dt>
                <dd className="font-medium">
                  {result.metadata.normalized ? (
                    <span className="text-green-400">✓ Yes</span>
                  ) : (
                    <span className="text-zinc-400">✗ No</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* System Resources (collapsed) */}
      <details className="mt-6 max-w-2xl mx-auto">
        <summary className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-300 transition-colors">
          View Processing Stats
        </summary>
        <div className="mt-4">
          <ResourceMonitor
            metrics={metrics}
            memoryUsageMB={memoryUsageMB}
            progress={100}
          />
        </div>
      </details>
    </div>
  );
}



