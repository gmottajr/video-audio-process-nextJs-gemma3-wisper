"use client";

import { FileVideo } from "lucide-react";
import { TranscriptionViewer } from "@/components/TranscriptionViewer";
import { TabbedTranscriptionView } from "@/components/TabbedTranscriptionView";
import { StatisticsModal } from "@/components/StatisticsModal";
import { TranscribeFromDoneForm } from "@/components/TranscribeFromDoneForm";
import { WHISPER_MODELS } from "@/components/ModelSelector";
import { DoneHeader } from "./components/DoneHeader";
import { SegmentSelectionPanel } from "./components/SegmentSelectionPanel";
import { EnhancementSection } from "./components/EnhancementSection";
import { FileMetaCard } from "./components/FileMetaCard";
import { useSegmentExtraction } from "./hooks/useSegmentExtraction";
import { useEnhancerHmrSync } from "./hooks/useEnhancerHmrSync";
import { useResultStats } from "./hooks/useResultStats";
import { useDownloadAction } from "./hooks/useDownloadAction";
import { getReTranscribeStrategy } from "./strategies/doneActions/registry";
import type { DoneStateViewProps, DoneActionContext } from "./types";

const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

const cardBase: React.CSSProperties = {
  background: "linear-gradient(180deg, #14141f 0%, #0d0d18 100%)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
};

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
  const { elapsedStr, charCount } = useResultStats({ result, processingStartTime, processingEndTime });
  const { showStats, setShowStats, format } = useDownloadAction({ result, formatId });
  const segmentState = useSegmentExtraction({ result, file, metrics, selectedModelKey, onTranscribe });
  const enhancerState = useEnhancerHmrSync({ result, metrics });

  const ctx: DoneActionContext = {
    result,
    file,
    format,
    onDownload,
    onReset,
    onTranscribe,
    showStats,
    setShowStats,
    waveformSelection: segmentState.waveformSelection,
  };

  const reTranscribeStrategy = getReTranscribeStrategy();

  return (
    <div
      className="animate-in fade-in duration-500 max-w-7xl mx-auto px-4"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#f3f3f8" }}
    >
      <DoneHeader
        result={result}
        file={file}
        elapsedStr={elapsedStr}
        charCount={charCount}
        currentModel={currentModel}
        selectedModelKey={selectedModelKey}
        ctx={ctx}
      />

      {/* Main output */}
      <div className="mb-6">
        {result.type === "audio" && result.blobUrl && (
          <SegmentSelectionPanel
            audioUrl={result.blobUrl}
            waveformSelection={segmentState.waveformSelection}
            setWaveformSelection={segmentState.setWaveformSelection}
            isExtractingSegment={segmentState.isExtractingSegment}
            extractionError={segmentState.extractionError}
            segmentModelKey={segmentState.segmentModelKey}
            setSegmentModelKey={segmentState.setSegmentModelKey}
            segmentCompressionType={segmentState.segmentCompressionType}
            setSegmentCompressionType={segmentState.setSegmentCompressionType}
            segmentNormalizeAudio={segmentState.segmentNormalizeAudio}
            setSegmentNormalizeAudio={segmentState.setSegmentNormalizeAudio}
            getSegmentResources={segmentState.getSegmentResources}
            handleTranscribeSegment={segmentState.handleTranscribeSegment}
            isModelLoaded={isModelLoaded}
            isModelLoading={isModelLoading}
            currentModel={currentModel}
            onModelSelect={onModelSelect}
            file={file}
            metrics={metrics}
            onTranscribe={onTranscribe}
          />
        )}

        {result.type === "video" && result.blobUrl && (
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
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10.5,
                    color: "#8a8a9c",
                    letterSpacing: "0.06em",
                    marginTop: 2,
                  }}
                >
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
        )}

        {result.type === "transcription" && result.transcription && (
          <>
            {enhancerState.enhancedResult || enhancerState.enhancer?.lastResult ? (
              <TabbedTranscriptionView
                originalText={result.transcription.text}
                enhancedText={(enhancerState.enhancedResult || enhancerState.enhancer?.lastResult)!.enhancedText}
                qualityMetrics={enhancerState.qualityMetrics}
                processingTime={(enhancerState.enhancedResult || enhancerState.enhancer?.lastResult)!.processingTime}
                chunks={result.transcription.chunks}
                metadata={{
                  contentType: enhancerState.enhancer?.lastMetadata?.contentType,
                  duration: metrics?.duration,
                  modelName: currentModel ? WHISPER_MODELS[selectedModelKey].name : undefined,
                  filename: file.name.split(".")[0],
                }}
                onReEnhance={enhancerState.handleReEnhance}
              />
            ) : (
              <TranscriptionViewer
                result={result.transcription}
                filename={file.name.split(".")[0]}
                modelName={currentModel ? WHISPER_MODELS[selectedModelKey].name : undefined}
              />
            )}

            <EnhancementSection
              enhancer={enhancerState.enhancer}
              enhancementEnabled={enhancerState.enhancementEnabled}
              handleEnhancementToggle={enhancerState.handleEnhancementToggle}
            />
          </>
        )}
      </div>

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

      {reTranscribeStrategy.isEnabled(ctx) && (
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
            onTranscribe={onTranscribe!}
          />
        </div>
      )}

      {(result.type === "audio" || result.type === "video") && (
        <FileMetaCard
          result={result}
          metrics={metrics}
          file={file}
          memoryUsageMB={memoryUsageMB}
        />
      )}
    </div>
  );
}
