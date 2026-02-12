"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
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
import type { ActionType, CompressionType, ActionOptions } from "@/components/ActionSelector";
import { TranscriptionService } from "@/services/TranscriptionService";
import { errorHandler } from "@/services/ErrorHandlingService";
import { extractAudioSegment } from "@/utils/audioExtraction";
import { useTranscriberFast } from "@/hooks/useTranscriberFast";
import type { TranscriptionMode } from "@/types/fast-mode";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { FastModeProgressIndicator } from "@/components/fast-mode";

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
  
  // Transcription mode (Fast Mode)
  const [transcriptionMode, setTranscriptionMode] = useState<TranscriptionMode>("standard");
  const fastModeEnabled = isFeatureEnabled('ENABLE_FAST_MODE');
  const fastTranscriber = useTranscriberFast();
  
  // Handle worker configuration changes from SystemCapabilitiesCard
  const handleWorkerConfigChange = (config: { workers: number; useGPU: boolean; memoryBudgetMB: number; devicePreference: import('@/types/fast-mode').DevicePreference }) => {
    console.log('[App] Worker configuration updated:', config);
    fastTranscriber.updateConfig({
      maxWorkers: config.workers,
      memoryBudgetMB: config.memoryBudgetMB,
      devicePreference: config.devicePreference,
    });
  };
  
  // Auto-load model when entering INSPECT state
  // - Standard Mode: Load selected model for standard transcriber
  // - Fast Mode: Skip (parallel workers load their own models dynamically)
  useEffect(() => {
    if (stateMachine.state === 'INSPECT' && stateMachine.selectedFile) {
      if (transcriptionMode === 'fast' && fastModeEnabled) {
        // Fast Mode: Don't preload - workers will load the selected model when transcription starts
        console.log(`[App] Fast Mode - workers will load model: ${WHISPER_MODELS[selectedModelKey].id}`);
      } else {
        // Standard Mode: Load the selected model
        const modelToLoad = WHISPER_MODELS[selectedModelKey].id;
        console.log('[App] Standard Mode - loading model:', modelToLoad);
        processor.transcriber.loadModel(modelToLoad);
      }
    }
  }, [stateMachine.state, stateMachine.selectedFile, transcriptionMode, fastModeEnabled, selectedModelKey, processor.transcriber]);

  // Debug: Log Fast Mode state changes
  useEffect(() => {
    console.log(`[App] 🎬 Fast Mode UI State: mode="${fastTranscriber.mode}", enabled=${fastModeEnabled}, transcriptionMode="${transcriptionMode}"`);
    console.log(`[App] 🎬 Should show ModelLoadingScreen: ${fastModeEnabled && transcriptionMode === 'fast' && fastTranscriber.mode === 'initializing'}`);
    console.log(`[App] 🎬 Should show Processing Overlay: ${fastModeEnabled && transcriptionMode === 'fast' && fastTranscriber.mode === 'processing'}`);
  }, [fastTranscriber.mode, fastModeEnabled, transcriptionMode]);
  
  // Hardware capability
  const hardwareCapability = useHardwareCapability();
  
  // Resource monitoring
  const { memoryUsageMB, isHighLoad } = useResourceMonitor({
    isActive: stateMachine.state === "PROCESSING" || processor.isFFmpegLoading,
  });

  // Track which file has been probed to prevent re-probing
  const [probedFileName, setProbedFileName] = useState<string | null>(null);

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

  // Ensure FFmpeg is loaded when entering INSPECT state
  // This handles cases where FFmpeg was reset/terminated and needs reloading
  useEffect(() => {
    const ensureFFmpegLoaded = async () => {
      if (
        stateMachine.state === "INSPECT" &&
        !processor.isFFmpegLoaded &&
        !processor.isFFmpegLoading
      ) {
        console.log("[App] FFmpeg not loaded in INSPECT state, reloading...");
        try {
          await processor.ffmpeg.load();
          console.log("[App] FFmpeg reloaded successfully");
        } catch (error) {
          console.error("[App] FFmpeg reload failed:", error);
        }
      }
    };

    ensureFFmpegLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateMachine.state, processor.isFFmpegLoaded, processor.isFFmpegLoading]);

  // Probe file metadata when entering INSPECT state (only once per file)
  useEffect(() => {
    const probeFile = async () => {
      if (
        stateMachine.state === "INSPECT" &&
        stateMachine.selectedFile &&
        processor.isFFmpegLoaded &&
        probedFileName !== stateMachine.selectedFile.name // ✅ Only probe if not already probed
      ) {
        try {
          console.log("[App] Probing file for metadata:", stateMachine.selectedFile.name);
          await processor.ffmpeg.probeFile(stateMachine.selectedFile);
          setProbedFileName(stateMachine.selectedFile.name); // ✅ Mark as probed
          console.log("[App] File metadata extracted");
        } catch (error) {
          console.error("[App] Failed to probe file:", error);
          // Don't fail the whole process - metadata extraction is optional
        }
      }
    };

    probeFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateMachine.state, stateMachine.selectedFile, processor.isFFmpegLoaded, probedFileName]);

  // Reset probed file name when returning to IDLE
  useEffect(() => {
    if (stateMachine.state === "IDLE") {
      setProbedFileName(null);
    }
  }, [stateMachine.state]);

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
    options?: ActionOptions
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
      let fileToProcess: File = stateMachine.selectedFile;
      
      // Handle segment extraction for audio files
      if (options?.segment && stateMachine.selectedFile.type.startsWith("audio/")) {
        console.log("[App] Extracting audio segment:", options.segment);
        
        // Create blob from the original audio file
        const originalBlob = new Blob([await stateMachine.selectedFile.arrayBuffer()], {
          type: stateMachine.selectedFile.type
        });
        
        // Extract the segment
        const segmentBlob = await extractAudioSegment(
          originalBlob,
          options.segment.startTime,
          options.segment.endTime
        );
        
        // Create a new File from the segment blob
        const segmentFileName = `segment_${options.segment.startTime.toFixed(1)}-${options.segment.endTime.toFixed(1)}_${stateMachine.selectedFile.name}`;
        fileToProcess = new File([segmentBlob], segmentFileName, {
          type: "audio/wav"
        });
        
        console.log("[App] Segment extracted:", fileToProcess.name, fileToProcess.size, "bytes");
      }
      
      // Check if this is a transcription action with Fast Mode parallel processing enabled
      const shouldUseFastMode = 
        action === 'transcribe' && 
        transcriptionMode === 'fast' && 
        fastModeEnabled && 
        isFeatureEnabled('ENABLE_PARALLEL_WORKERS');
      
      if (shouldUseFastMode) {
        console.log("[App] 🚀 Using Fast Mode with parallel processing");
        await handleFastModeTranscription(fileToProcess, options);
        return;
      }
      
      // Run standard processing
      // For Fast Mode UI (without parallel), ensure Distil-Whisper is used and enhancements are disabled
      const effectiveModelKey = transcriptionMode === 'fast' ? 'distil-small' : selectedModelKey;
      const effectiveNormalizeAudio = transcriptionMode === 'fast' ? false : (options?.normalizeAudio ?? false);
      const effectiveCompressionType = transcriptionMode === 'fast' ? 'none' : (options?.compressionType ?? 'none');
      
      const result = await processor.processFile(
        fileToProcess,
        action,
        formatId,
        {
          resolutionId: options?.resolutionId,
          modelKey: effectiveModelKey,
          testMode: TEST_MODE,
          normalizeAudio: effectiveNormalizeAudio,
          compressionType: effectiveCompressionType,
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
   * Handle Fast Mode transcription with parallel processing
   */
  const handleFastModeTranscription = async (
    file: File,
    options?: ActionOptions
  ) => {
    try {
      // Get the selected model ID for Fast Mode
      const modelId = WHISPER_MODELS[selectedModelKey].id;
      console.log(`[App] Starting Fast Mode transcription with model: ${modelId}`);
      
      // Update Fast Mode config with selected model
      fastTranscriber.updateConfig({ modelId });
      
      // Prepare audio for AI (16kHz mono WAV)
      const audioBlob = await processor.ffmpeg.prepareAudioForAI(
        file,
        undefined,
        options?.testMode ? 30 : undefined
      );
      
      // Extract audio data as Float32Array
      const { extractAudioDataFromBlob, getAudioDuration } = await import('@/utils/audioDataExtraction');
      const audioData = await extractAudioDataFromBlob(audioBlob);
      const duration = await getAudioDuration(audioBlob);
      
      console.log(`[App] Audio prepared: ${audioData.length} samples, ${duration.toFixed(2)}s`);
      
      // Start fast transcription - get result directly (React state updates are async)
      const transcriptionResult = await fastTranscriber.transcribe(audioData, duration);
      
      // Check for errors
      if (fastTranscriber.error) {
        throw new Error(fastTranscriber.error);
      }
      
      // Get result - use the returned value directly instead of state
      if (transcriptionResult) {
        const result: ProcessingResult = {
          type: "transcription",
          transcription: {
            text: transcriptionResult.text,
            chunks: transcriptionResult.segments.map(seg => ({
              text: seg.text,
              timestamp: [seg.start, seg.end] as [number, number | null],
            })),
            // Include processingTime for StatisticsModal
            processingTime: transcriptionResult.processingTime,
          },
          metadata: {
            compressionType: 'none',
            normalized: false,
            fastMode: true,
            workersUsed: transcriptionResult.workersUsed,
            processingTime: transcriptionResult.processingTime,
            modelId: WHISPER_MODELS[selectedModelKey].id,
          },
        };
        
        stateMachine.completeProcessing(result);
        console.log("[App] ✅ Fast Mode transcription complete");
      } else {
        // No result returned - transcription was cancelled or failed silently
        console.warn("[App] Fast Mode transcription returned no result");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[App] Fast Mode transcription failed:", errorMessage);
      stateMachine.failProcessing(`Fast Mode transcription failed: ${errorMessage}`);
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
    <main className="min-h-screen bg-gradient-to-br from-[#060d17] via-[#0a1525] to-[#060d17] text-zinc-100">
      {/* Font Selector - Fixed Position */}
      <FontSelector />
      
      {/* NOTE: Initial model loading screen removed - models now load on-demand */}
      {/* Standard Mode: Model loads when entering INSPECT state */}
      {/* Fast Mode: Workers load their own models when transcription starts */}

      {/* AI Model Loading Indicator (Standard Mode only) */}
      {!(fastModeEnabled && transcriptionMode === 'fast') && (
        <AILoadingIndicator
          isLoading={processor.isModelLoading}
          isLoaded={processor.isModelLoaded}
          progress={processor.transcriptionProgress}
          message={processor.transcriptionMessage}
        />
      )}

      {/* Transcription Progress Overlay (Standard Mode only) */}
      {processor.isTranscribing &&
        stateMachine.state !== "DONE" &&
        stateMachine.state !== "ERROR" &&
        !(fastModeEnabled && transcriptionMode === 'fast') && <TranscriptionProgressScreen />}

      {/* Fast Mode Model Loading Screen */}
      {fastModeEnabled &&
        transcriptionMode === 'fast' &&
        fastTranscriber.mode === 'initializing' && (
          <ModelLoadingScreen
            progress={fastTranscriber.progress.percent}
            modelName="Distil-Whisper (Fast Mode)"
            onCancel={() => {
              fastTranscriber.cancel();
              stateMachine.cancelProcessing();
            }}
          />
        )}

      {/* Fast Mode Progress Indicator - Full Screen Overlay (Processing Only) */}
      {fastModeEnabled &&
        transcriptionMode === 'fast' &&
        fastTranscriber.mode === 'processing' && (
          <div className="fixed inset-0 z-50 bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-900 flex flex-col">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent pointer-events-none" />
            
            {/* Breadcrumbs at top */}
            <div className="relative container mx-auto px-4 pt-6 pb-4">
              <Breadcrumbs 
                currentState="PROCESSING" 
                onNavigate={() => {}}
              />
            </div>

            {/* Main content centered */}
            <div className="relative flex-1 flex items-center justify-center">
              <div className="max-w-lg w-full mx-4">
                {/* Header with icon */}
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-3xl border border-amber-500/30 mb-6 shadow-lg shadow-amber-500/10">
                    <Zap className="w-12 h-12 text-amber-400 animate-pulse" />
                  </div>
                  <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
                    Fast Mode
                  </h1>
                  <p className="text-zinc-400 text-lg">
                    Parallel transcription in progress
                  </p>
                </div>

                {/* Fast Mode Progress Indicator */}
                <FastModeProgressIndicator progress={fastTranscriber.progress} />
                
                {/* Cancel Button */}
                <div className="mt-8 text-center">
                  <button
                    onClick={() => {
                      fastTranscriber.cancel();
                      stateMachine.cancelProcessing();
                    }}
                    className="px-8 py-3 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 hover:border-zinc-600 transition-all duration-200 font-medium"
                  >
                    Cancel Transcription
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Processing Overlay (FFmpeg operations - Standard Mode only for transcription) */}
      {stateMachine.state === "PROCESSING" && 
        !processor.isTranscribing && 
        !(fastModeEnabled && transcriptionMode === 'fast' && stateMachine.currentAction === 'transcribe') && (
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

      <div className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Breadcrumbs */}
        <Breadcrumbs 
          currentState={stateMachine.state} 
          onNavigate={handleReset}
        />

        {/* Hardware Capability Badge */}
        <div className="flex justify-center mb-4">
          <div className="group relative">
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border ${
              hardwareCapability.tier === "high"
                ? "bg-gradient-to-r from-emerald-950/50 to-green-950/50 border-emerald-500/50 text-emerald-400"
                : hardwareCapability.tier === "medium"
                ? "bg-gradient-to-r from-blue-950/50 to-cyan-950/50 border-blue-500/50 text-blue-400"
                : "bg-gradient-to-r from-amber-950/50 to-orange-950/50 border-amber-500/50 text-amber-400"
            }`}>
              <Cpu className="w-3 h-3" />
              <span suppressHydrationWarning>
                {hardwareCapability.tier === "high"
                  ? `🚀 High Performance (${hardwareCapability.deviceMemoryGB}GB+ RAM)`
                  : hardwareCapability.tier === "medium"
                  ? "⚡ Standard Performance"
                  : "💡 Basic Performance"}
              </span>
            </span>
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <span className="text-zinc-400">Your device&apos;s processing capability for media operations</span>
            </div>
          </div>
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
            transcriptionMode={transcriptionMode}
            onModeChange={setTranscriptionMode}
            onWorkerConfigChange={handleWorkerConfigChange}
            onAction={handleAction}
            onBack={() => stateMachine.selectFile(null)}
            isFFmpegLoaded={processor.isFFmpegLoaded}
            isFFmpegLoading={processor.isFFmpegLoading}
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

