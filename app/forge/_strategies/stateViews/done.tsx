import React from "react";
import { DoneStateView } from "@/components/states/DoneStateView";
import type { StateViewStrategy } from "./types";

const done: StateViewStrategy = {
  state: "DONE",
  render({
    result,
    selectedFile,
    selectedFormatId,
    ffmpegMetrics,
    selectedModelKey,
    currentModel,
    isModelLoaded,
    isModelLoading,
    transcriptionProgress,
    memoryUsageMB,
    processingStartTime,
    processingEndTime,
    onDownload,
    onReset,
    onModelSelect,
    onTranscribeFromDone,
  }) {
    if (!result || !selectedFile) return null;
    return (
      <DoneStateView
        result={result}
        file={selectedFile}
        formatId={selectedFormatId}
        selectedModelKey={selectedModelKey}
        currentModel={currentModel}
        metrics={ffmpegMetrics}
        memoryUsageMB={memoryUsageMB}
        onDownload={onDownload}
        onReset={onReset}
        isModelLoaded={isModelLoaded}
        isModelLoading={isModelLoading}
        modelLoadingProgress={transcriptionProgress}
        onModelSelect={onModelSelect}
        onTranscribe={onTranscribeFromDone}
        processingStartTime={processingStartTime}
        processingEndTime={processingEndTime}
      />
    );
  },
};

export default done;
