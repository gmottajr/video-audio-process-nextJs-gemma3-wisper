import React from "react";
import { Zap } from "lucide-react";
import { InspectStateView } from "@/components/states/InspectStateView";
import type { StateViewStrategy } from "./types";

const LARGE_FILE_BYTES = 500 * 1024 * 1024;

const inspect: StateViewStrategy = {
  state: "INSPECT",
  render({
    selectedFile,
    ffmpegMetrics,
    selectedModelKey,
    currentModel,
    isModelLoading,
    isTranscribing,
    isFFmpegLoaded,
    isFFmpegLoading,
    isModelLoaded,
    transcriptionProgress,
    transcriptionMode,
    fastModeEnabled,
    largeFileBanner,
    onModelSelect,
    onModeChange,
    onWorkerConfigChange,
    onAction,
    onFileSelect,
  }) {
    if (!selectedFile) return null;

    const showBanner =
      fastModeEnabled &&
      transcriptionMode !== "fast" &&
      !largeFileBanner.dismissed &&
      selectedFile.size > LARGE_FILE_BYTES;

    return (
      <>
        {showBanner && (
          <div className="mb-4 bg-amber-950/60 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300 mb-0.5">Large file detected</p>
              <p className="text-xs text-amber-200/80">
                This file ({(selectedFile.size / 1024 / 1024 / 1024).toFixed(1)} GB) may run out of
                memory in Standard Mode.{" "}
                <strong>Fast Mode</strong> processes audio in small chunks — no size limit.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  onModeChange("fast");
                  largeFileBanner.dismiss();
                }}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold py-1.5 px-3 rounded transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                Use Fast Mode
              </button>
              <button
                onClick={largeFileBanner.dismiss}
                className="text-xs text-amber-400/60 hover:text-amber-300 transition-colors whitespace-nowrap"
              >
                Continue anyway
              </button>
            </div>
          </div>
        )}
        <InspectStateView
          file={selectedFile}
          metrics={ffmpegMetrics}
          selectedModelKey={selectedModelKey}
          currentModel={currentModel}
          isModelLoading={isModelLoading}
          isTranscribing={isTranscribing}
          onModelSelect={onModelSelect}
          transcriptionMode={transcriptionMode}
          onModeChange={onModeChange}
          onWorkerConfigChange={onWorkerConfigChange}
          onAction={onAction}
          onBack={() => onFileSelect(null)}
          isFFmpegLoaded={isFFmpegLoaded}
          isFFmpegLoading={isFFmpegLoading}
          isModelLoaded={isModelLoaded}
          modelLoadingProgress={transcriptionProgress}
        />
      </>
    );
  },
};

export default inspect;
