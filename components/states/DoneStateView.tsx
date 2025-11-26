"use client";

import { WaveformViewer } from "@/components/WaveformViewer";
import { TranscriptionViewer } from "@/components/TranscriptionViewer";
import { ResourceMonitor } from "@/components/ResourceMonitor";
import { Download, RotateCcw } from "lucide-react";
import { getFormatById } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";

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
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-green-400">
          Processing Complete!
        </h2>
        <p className="text-zinc-400">
          {result.type === "audio"
            ? "Your audio file is ready. Listen to the preview or download it."
            : result.type === "video"
            ? "Your video file is ready. Preview it or download it."
            : "Your transcription is ready. View the text or download it."}
        </p>
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



