"use client";

import { useState, useEffect } from "react";
import { Zap, Cpu, AlertCircle } from "lucide-react";
import { AILoadingIndicator } from "@/components/AILoadingIndicator";
import ModelLoadingScreen from "@/components/ModelLoadingScreen";
import TranscriptionProgressScreen from "@/components/TranscriptionProgressScreen";
import { ProcessingVisualizer } from "@/components/ProcessingVisualizer";
import { IdleStateView } from "@/components/states/IdleStateView";
import { InspectStateView } from "@/components/states/InspectStateView";
import { DoneStateView } from "@/components/states/DoneStateView";
import { ErrorStateView } from "@/components/states/ErrorStateView";
import { useAppStateMachine } from "@/hooks/useAppStateMachine";
import { useMediaProcessor } from "@/hooks/useMediaProcessor";
import { useResourceMonitor, useHardwareCapability } from "@/hooks/useResourceMonitor";
import { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { getFormatById } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import type { ActionType } from "@/components/ActionSelector";

// 🧪 TEST MODE: Set to true to only process first 30 seconds of audio
const TEST_MODE = false;

/**
 * Main Application Component (Refactored)
 * 
 * Clean architecture using:
 * - useAppStateMachine: Manages state transitions
 * - useMediaProcessor: Orchestrates processing operations
 * - State-specific view components: Clean UI separation
 * 
 * Reduced from 597 lines to ~250 lines! 🎉
 */
export default function Home() {
  // State machine
  const stateMachine = useAppStateMachine();
  
  // Media processor
  const processor = useMediaProcessor();
  
  // Model selection
  const [selectedModelKey, setSelectedModelKey] = useState<ModelKey>("base");
  
  // Hardware capability
  const hardwareCapability = useHardwareCapability();
  
  // Resource monitoring
  const { memoryUsageMB, isHighLoad } = useResourceMonitor({
    isActive: stateMachine.state === "PROCESSING" || processor.isFFmpegLoading,
  });

  // Auto-load FFmpeg on mount
  useEffect(() => {
    const initFFmpeg = async () => {
      try {
        await processor.ffmpeg.load();
        console.log("[App] FFmpeg initialized");
      } catch (error) {
        console.error("[App] FFmpeg initialization error:", error);
        stateMachine.failProcessing(`Failed to initialize FFmpeg: ${error}`);
      }
    };

    initFFmpeg();
  }, [processor.ffmpeg, stateMachine]);

  // Sync transcription result to state machine
  useEffect(() => {
    if (
      processor.result?.type === "transcription" &&
      stateMachine.state === "PROCESSING" &&
      stateMachine.currentAction === "transcribe"
    ) {
      console.log("[App] Transcription complete, transitioning to DONE");
      stateMachine.completeProcessing(processor.result);
    }
  }, [processor.result, stateMachine]);

  // Handle transcription errors
  useEffect(() => {
    if (processor.error && stateMachine.state === "PROCESSING") {
      stateMachine.failProcessing(processor.error);
    }
  }, [processor.error, stateMachine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processor.cleanup();
    };
  }, [processor]);

  /**
   * Handle action start
   */
  const handleAction = async (
    action: ActionType,
    formatId: string,
    options?: { resolutionId?: string }
  ) => {
    if (!stateMachine.selectedFile || !processor.isFFmpegLoaded) return;

    // Start processing in state machine
    stateMachine.startProcessing(action, formatId);

    try {
      // Run processing
      const result = await processor.processFile(
        stateMachine.selectedFile,
        action,
        formatId,
        {
          resolutionId: options?.resolutionId,
          modelKey: selectedModelKey,
          testMode: TEST_MODE,
        }
      );

      // Complete (unless it's transcription - handled by useEffect)
      if (result.type !== "transcription") {
        stateMachine.completeProcessing(result);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      stateMachine.failProcessing(`Processing failed: ${errorMessage}`);
    }
  };

  /**
   * Handle download
   */
  const handleDownload = () => {
    const { result, selectedFile, selectedFormatId } = stateMachine;
    
    if (!result?.blobUrl || !selectedFile || !selectedFormatId) return;

    const format =
      result.type === "audio"
        ? getFormatById(selectedFormatId)
        : getVideoFormatById(selectedFormatId);

    if (!format) return;

    const link = document.createElement("a");
    link.href = result.blobUrl;
    link.download = `${selectedFile.name.split(".")[0]}-converted${format.extension}`;
    link.click();
  };

  /**
   * Handle reset
   */
  const handleReset = async () => {
    await processor.reset();
    stateMachine.reset();
  };

  /**
   * Handle model selection
   */
  const handleModelSelect = (modelKey: ModelKey) => {
    setSelectedModelKey(modelKey);
    processor.transcriber.loadModel(WHISPER_MODELS[modelKey].id);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Model Loading Screen (initial load) */}
      {!processor.isModelLoaded && (
        <div className="fixed inset-0 z-50">
          <ModelLoadingScreen onComplete={() => {}} />
        </div>
      )}

      {/* AI Model Loading Indicator */}
      <AILoadingIndicator
        isLoading={processor.isModelLoading}
        isLoaded={processor.isModelLoaded}
        progress={processor.transcriptionProgress}
        message={processor.transcriptionMessage}
      />

      {/* Transcription Progress Overlay */}
      {processor.isTranscribing &&
        stateMachine.state !== "DONE" &&
        stateMachine.state !== "ERROR" && <TranscriptionProgressScreen />}

      {/* Processing Overlay (FFmpeg operations) */}
      {stateMachine.state === "PROCESSING" && !processor.isTranscribing && (
        <ProcessingVisualizer
          progress={processor.status.progress}
          speed={processor.status.speed}
          phase={processor.status.phase}
          formatName={
            stateMachine.currentAction === "transcribe"
              ? "AI"
              : stateMachine.currentAction === "convert_video"
              ? getVideoFormatById(stateMachine.selectedFormatId || "")?.name
              : getFormatById(stateMachine.selectedFormatId || "")?.name
          }
          onCancel={async () => {
            await processor.cancel();
            stateMachine.cancelProcessing();
          }}
        />
      )}

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
              Audio Processor
            </h1>
          </div>

          <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
            <span className="px-4 py-1.5 bg-cyan-950/50 border border-cyan-500/50 rounded-full text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Guided Workflow
            </span>
            <span className="px-4 py-1.5 bg-blue-950/50 border border-blue-500/50 rounded-full text-xs font-bold text-blue-400 uppercase tracking-wider">
              Step-by-Step
            </span>
            <span className="px-4 py-1.5 bg-gradient-to-r from-green-950/50 to-emerald-950/50 border border-green-500/50 rounded-full text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-3 h-3" />
              <span suppressHydrationWarning>
                {hardwareCapability.tier === "high"
                  ? `🚀 High Performance Mode (${hardwareCapability.deviceMemoryGB}GB+ RAM)`
                  : hardwareCapability.tier === "medium"
                  ? "⚡ Standard Performance Mode"
                  : "Standard Mode"}
              </span>
            </span>
          </div>

          <p className="text-zinc-400 max-w-2xl mx-auto">
            Follow the guided workflow to extract or convert your audio files with ease.
          </p>
        </header>

        {/* STATE VIEWS */}
        {stateMachine.state === "IDLE" && (
          <IdleStateView
            onFileSelect={stateMachine.selectFile}
            isLoading={processor.isFFmpegLoading}
            maxFileSize={hardwareCapability.maxFileSize}
            recommendedFileSize={hardwareCapability.maxFileSize * 0.5}
          />
        )}

        {stateMachine.state === "INSPECT" && stateMachine.selectedFile && (
          <InspectStateView
            file={stateMachine.selectedFile}
            metrics={processor.ffmpegMetrics}
            selectedModelKey={selectedModelKey}
            currentModel={processor.currentModel}
            isModelLoading={processor.isModelLoading}
            isTranscribing={processor.isTranscribing}
            onModelSelect={handleModelSelect}
            onAction={handleAction}
            onBack={() => stateMachine.selectFile(null)}
            isFFmpegLoaded={processor.isFFmpegLoaded}
            isModelLoaded={processor.isModelLoaded}
            modelLoadingProgress={processor.transcriptionProgress}
          />
        )}

        {stateMachine.state === "DONE" &&
          stateMachine.result &&
          stateMachine.selectedFile && (
            <DoneStateView
              result={stateMachine.result}
              file={stateMachine.selectedFile}
              formatId={stateMachine.selectedFormatId}
              selectedModelKey={selectedModelKey}
              currentModel={processor.currentModel}
              metrics={processor.ffmpegMetrics}
              memoryUsageMB={memoryUsageMB}
              onDownload={handleDownload}
              onReset={handleReset}
            />
          )}

        {stateMachine.state === "ERROR" && stateMachine.error && (
          <ErrorStateView
            error={stateMachine.error}
            onRetry={stateMachine.retry}
            onReset={handleReset}
            canRetry={!!stateMachine.selectedFile}
          />
        )}

        {/* High Memory Warning */}
        {isHighLoad && stateMachine.state === "PROCESSING" && (
          <div className="fixed bottom-4 right-4 bg-yellow-950/90 border-2 border-yellow-500/50 rounded-lg p-4 max-w-sm backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-400 text-sm mb-1">
                  High Memory Usage
                </h3>
                <p className="text-xs text-yellow-300">
                  Memory usage is above 1.5GB. If the process stalls, try a smaller
                  file.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

