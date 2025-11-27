"use client";

import { useState, useEffect, useMemo } from "react";
import { Zap, Cpu, AlertCircle } from "lucide-react";
import { AILoadingIndicator } from "@/components/AILoadingIndicator";
import ModelLoadingScreen from "@/components/ModelLoadingScreen";
import TranscriptionProgressScreen from "@/components/TranscriptionProgressScreen";
import { ProcessingVisualizer } from "@/components/ProcessingVisualizer";
import { IdleStateView } from "@/components/states/IdleStateView";
import { InspectStateView } from "@/components/states/InspectStateView";
import { DoneStateView } from "@/components/states/DoneStateView";
import { ErrorStateView } from "@/components/states/ErrorStateView";
import { FontSelector } from "@/components/FontSelector";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHeader } from "@/components/PageHeader";
import { useAppStateMachine } from "@/hooks/useAppStateMachine";
import { useMediaProcessor, type ProcessingResult } from "@/hooks/useMediaProcessor";
import { useResourceMonitor, useHardwareCapability } from "@/hooks/useResourceMonitor";
import { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { getFormatById } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import type { ActionType, CompressionType } from "@/components/ActionSelector";
import { TranscriptionService } from "@/services/TranscriptionService";
import { errorHandler } from "@/services/ErrorHandlingService";

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
  
  // Service layer (Phase 2 refactoring)
  const transcriptionService = useMemo(
    () => new TranscriptionService(processor),
    [processor]
  );
  
  // Model selection
  const [selectedModelKey, setSelectedModelKey] = useState<ModelKey>("base");
  
  // Hardware capability
  const hardwareCapability = useHardwareCapability();
  
  // Resource monitoring
  const { memoryUsageMB, isHighLoad } = useResourceMonitor({
    isActive: stateMachine.state === "PROCESSING" || processor.isFFmpegLoading,
  });

  // Auto-load FFmpeg on mount (only once)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

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

  // Cleanup on unmount only (not on processor state changes)
  useEffect(() => {
    return () => {
      processor.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only cleanup when component unmounts

  /**
   * Handle action start
   */
  const handleAction = async (
    action: ActionType,
    formatId: string,
    options?: { resolutionId?: string; normalizeAudio?: boolean; compressionType?: CompressionType }
  ) => {
    if (!stateMachine.selectedFile || !processor.isFFmpegLoaded) {
      return;
    }

    // Start processing in state machine
    stateMachine.startProcessing(action, formatId, { 
      normalizeAudio: options?.normalizeAudio,
      compressionType: options?.compressionType 
    });

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
          normalizeAudio: options?.normalizeAudio,
          compressionType: options?.compressionType,
        }
      );

      // Complete (unless it's transcription - handled by useEffect)
      if (result.type !== "transcription") {
        stateMachine.completeProcessing(result);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[App] Processing failed:", errorMessage);
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

  /**
   * Handle transcribe from done state (REFACTORED - Phase 2)
   * Transcribe an already processed audio file with optional enhancements
   * 
   * Simplified using TranscriptionService and ErrorHandlingService
   */
  const handleTranscribeFromDone = async (
    compressionType: CompressionType, 
    normalizeAudio: boolean,
    modelKey: ModelKey,
    segmentFile?: File
  ) => {
    console.log("[App] Transcribing from done state with enhancements:", { 
      compressionType, 
      normalizeAudio, 
      modelKey,
      isSegment: !!segmentFile 
    });

    // Transition to processing state
    stateMachine.startProcessing("transcribe", "", { compressionType, normalizeAudio });

    try {
      // If segment file provided, create a temporary result for it
      if (segmentFile) {
        console.log("[App] Transcribing SEGMENT file:", segmentFile.name, segmentFile.size);
        
        // Create a blob URL for the segment
        const segmentBlobUrl = URL.createObjectURL(segmentFile);
        
        // Create a temporary result object for the segment
        const segmentResult: ProcessingResult = {
          type: "audio",
          blobUrl: segmentBlobUrl,
          metadata: {
            format: "wav",
            size: segmentFile.size,
            compressionType: "none",
            normalized: false,
          }
        };
        
        // Transcribe the segment using the standard flow
        await transcriptionService.transcribeFromResult(
          segmentResult,
          segmentFile.name,
          {
            modelKey,
            compressionType,
            normalizeAudio,
            testMode: TEST_MODE,
          }
        );
        
        // Clean up the temporary blob URL after transcription
        URL.revokeObjectURL(segmentBlobUrl);
      } else {
        console.log("[App] Transcribing FULL audio from result");
        
        // Delegate all business logic to TranscriptionService
        await transcriptionService.transcribeFromResult(
          stateMachine.result,
          stateMachine.selectedFile?.name,
          {
            modelKey,
            compressionType,
            normalizeAudio,
            testMode: TEST_MODE,
          }
        );
      }

      // Success - result will be handled by useEffect watching processor.result
      console.log("[App] Transcription from done state completed successfully");
    } catch (error) {
      // Delegate error handling to ErrorHandlingService
      const userMessage = errorHandler.handleError(error, "Transcription from done");
      stateMachine.failProcessing(userMessage);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Font Selector - Fixed Position */}
      <FontSelector />
      
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
          speed={typeof processor.status.speed === 'number' ? processor.status.speed : null}
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
          onNavigate={handleReset}
        />
      )}

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Breadcrumbs */}
        <Breadcrumbs 
          currentState={stateMachine.state} 
          onNavigate={handleReset}
        />

        {/* Hardware Capability Badge */}
        <div className="flex justify-center mb-6">
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
              isModelLoaded={processor.isModelLoaded}
              isModelLoading={processor.isModelLoading}
              modelLoadingProgress={processor.transcriptionProgress}
              onModelSelect={handleModelSelect}
              onTranscribe={handleTranscribeFromDone}
              processingStartTime={stateMachine.processingStartTime}
              processingEndTime={stateMachine.processingEndTime}
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

