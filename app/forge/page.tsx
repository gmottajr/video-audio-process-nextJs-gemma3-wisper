"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import gsap from "gsap";
import { pickPageTransition } from "@/lib/pageTransition";
import Image from "next/image";
import { Zap, AlertCircle } from "lucide-react";
import { AILoadingIndicator } from "@/components/AILoadingIndicator";
import ModelLoadingScreen from "@/components/ModelLoadingScreen";
import TranscriptionProgressScreen from "@/components/TranscriptionProgressScreen";
import { ProcessingVisualizer } from "@/components/ProcessingVisualizer";
import { IdleStateView } from "@/components/states/IdleStateView";
import { InspectStateView } from "@/components/states/InspectStateView";
import { DoneStateView } from "@/components/states/DoneStateView";
import { ErrorStateView } from "@/components/states/ErrorStateView";
import { FontSelector } from "@/components/FontSelector";
import { ForgeTopBar } from "@/components/ForgeTopBar";
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
import FastModeProcessingScreen from "@/components/FastModeProcessingScreen";
import { NeuralNetBackground } from "@/components/NeuralNetBackground";

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
  const contentRef = useRef<HTMLDivElement>(null);
  const prevStateRef = useRef<string | null>(null);

  // Participates in the global transition-type rotation — same rule as landing
  // and music pages: picked once per mount, always differs from previous page.
  const [transitionType] = useState(() => pickPageTransition());

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

  // Large-file banner dismiss (resets when a new file is selected)
  const [dismissedLargeFileBanner, setDismissedLargeFileBanner] = useState(false);
  const LARGE_FILE_BYTES = 500 * 1024 * 1024; // 500 MB
  
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

  // Reset large-file banner when a new file is selected
  useEffect(() => {
    setDismissedLargeFileBanner(false);
  }, [stateMachine.selectedFile?.name]);

  // Track which file has been probed to prevent re-probing
  const [probedFileName, setProbedFileName] = useState<string | null>(null);

  // Entrance animation — style matches the global transition type for this visit
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const from: gsap.TweenVars =
      transitionType === "dive"     ? { z: -280, scale: 0.86, opacity: 0 } :
      transitionType === "orbital"  ? { rotationY: -28, x: -80, opacity: 0 } :
      /* parallax */                  { y: 80, opacity: 0 };
    gsap.fromTo(el, from,
      { z: 0, scale: 1, rotationY: 0, x: 0, y: 0, opacity: 1, duration: 1.05, ease: "power3.out", force3D: true },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // State-transition animation — direction/style follows transition type
  useEffect(() => {
    const el = contentRef.current;
    if (!el || prevStateRef.current === stateMachine.state) return;
    const prev = prevStateRef.current;
    prevStateRef.current = stateMachine.state;
    if (prev === null) return; // skip initial render

    // For orbital, alternate direction based on whether we're going "forward" or "back"
    const forward = ["IDLE","INSPECT","PROCESSING","DONE"].indexOf(stateMachine.state) >
                    ["IDLE","INSPECT","PROCESSING","DONE"].indexOf(prev ?? "");

    const from: gsap.TweenVars =
      transitionType === "dive"
        ? { z: -160, scale: 0.91, opacity: 0 }
        : transitionType === "orbital"
        ? { rotationY: forward ? -20 : 20, x: forward ? -60 : 60, opacity: 0 }
        : { y: 60, opacity: 0 };

    gsap.fromTo(el, from,
      { z: 0, scale: 1, rotationY: 0, x: 0, y: 0, opacity: 1, duration: 0.55, ease: "power2.out", force3D: true },
    );
  }, [stateMachine.state, transitionType]);

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
      
      // Prepare audio for AI (16kHz mono WAV — pcm_s16le)
      const audioBlob = await processor.ffmpeg.prepareAudioForAI(
        file,
        undefined,
        options?.testMode ? 30 : undefined
      );

      // Read duration from WAV header only (no full decode — avoids loading entire file)
      const { getWavDurationFromHeader } = await import('@/utils/audioDataExtraction');
      const duration = await getWavDurationFromHeader(audioBlob);

      console.log(`[App] Audio prepared: ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB WAV, ${duration.toFixed(2)}s`);

      // Start fast transcription using streaming — decodes chunk-by-chunk from the WAV blob
      const transcriptionResult = await fastTranscriber.transcribeFromWav(audioBlob, duration);
      
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
        stateMachine.failProcessing("Transcription failed or was cancelled. Try again or switch to Standard mode.");
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
    <main className="relative isolate min-h-screen overflow-x-hidden bg-aura-canvas text-zinc-100">
      {/* Breathing base radial */}
      <div
        className="pointer-events-none fixed inset-0 bg-aura-radial animate-glow-breathe"
        aria-hidden
      />
      {/* ── AURORA DYNAMIC ORBS — galaxy nebula palette ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {/* Main hero orb — violet + blue, 11s breathe */}
        <div className="animate-orb-breathe-a animate-aurora-sweep absolute" style={{ top: '-8%', right: '-10%', width: '500px', height: '500px' }}>
          <div className="orb-layer-a absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(98,28,255,0.80) 0%, rgba(38,0,180,0.36) 40%, transparent 72%)', filter: 'blur(34px)' }} />
          <div className="orb-layer-b absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(38,128,255,0.70) 0%, rgba(20,80,220,0.32) 40%, transparent 72%)', filter: 'blur(34px)' }} />
          <div className="orb-layer-c absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 40% 40%, rgba(228,48,198,0.18) 0%, transparent 55%)', filter: 'blur(34px)' }} />
        </div>
        {/* Bright core star — fire + blue, 8s breathe */}
        <div className="animate-orb-breathe-b animate-aurora-2 animate-core-pulse absolute" style={{ top: '5%', right: '9%', width: '160px', height: '160px' }}>
          <div className="orb-layer-a absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(38,128,255,0.95) 0%, rgba(38,128,255,0.44) 50%, transparent 70%)', filter: 'blur(12px)' }} />
          <div className="orb-layer-b absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,140,30,0.85) 0%, rgba(255,80,10,0.38) 50%, transparent 70%)', filter: 'blur(12px)' }} />
          <div className="orb-layer-c absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(148,68,255,0.60) 0%, rgba(98,28,255,0.24) 50%, transparent 70%)', filter: 'blur(12px)' }} />
        </div>
        {/* Conic nebula arc — blue dominant, 15s breathe */}
        <div className="animate-orb-breathe-c animate-aurora-sweep absolute" style={{ top: '-22%', right: '-18%', width: '600px', height: '600px' }}>
          <div className="orb-layer-a-s2 absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 155deg at 50% 50%, transparent 0deg, rgba(38,128,255,0.42) 35deg, rgba(38,128,255,0.78) 65deg, rgba(38,128,255,0.42) 95deg, transparent 130deg)', filter: 'blur(18px)' }} />
          <div className="orb-layer-b-s2 absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 155deg at 50% 50%, transparent 0deg, rgba(98,28,255,0.36) 35deg, rgba(98,28,255,0.68) 65deg, rgba(98,28,255,0.36) 95deg, transparent 130deg)', filter: 'blur(18px)' }} />
          <div className="orb-layer-c-s2 absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 155deg at 50% 50%, transparent 0deg, rgba(255,140,30,0.22) 35deg, rgba(255,140,30,0.45) 65deg, rgba(255,140,30,0.22) 95deg, transparent 130deg)', filter: 'blur(18px)' }} />
        </div>
        {/* Left nebula cloud — blue + violet, 9s breathe */}
        <div className="animate-orb-breathe-d animate-aurora-1 absolute" style={{ top: '-15%', left: '-10%', width: '430px', height: '380px' }}>
          <div className="orb-layer-a-s4 absolute inset-0 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(38,128,255,0.65) 0%, rgba(20,60,200,0.28) 50%, transparent 72%)', filter: 'blur(44px)' }} />
          <div className="orb-layer-b-s4 absolute inset-0 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(98,28,255,0.55) 0%, rgba(60,10,180,0.22) 50%, transparent 72%)', filter: 'blur(44px)' }} />
          <div className="orb-layer-c-s4 absolute inset-0 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(228,48,198,0.12) 0%, transparent 50%)', filter: 'blur(44px)' }} />
        </div>
        {/* Bottom nebula — fire + teal, 11s breathe */}
        <div className="animate-orb-breathe-a animate-aurora-3 absolute" style={{ bottom: '-10%', left: '18%', width: '500px', height: '250px', animationDelay: '-4s' }}>
          <div className="orb-layer-a absolute inset-0 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(255,140,30,0.55) 0%, rgba(255,80,10,0.22) 50%, transparent 72%)', filter: 'blur(48px)' }} />
          <div className="orb-layer-b absolute inset-0 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(0,180,220,0.50) 0%, rgba(0,120,180,0.20) 50%, transparent 72%)', filter: 'blur(48px)' }} />
          <div className="orb-layer-c absolute inset-0 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(98,28,255,0.35) 0%, transparent 55%)', filter: 'blur(48px)' }} />
        </div>
      </div>
      {/* Neural network canvas — sits above aurora orbs */}
      <NeuralNetBackground />
      <div
        className="pointer-events-none fixed inset-0 bg-[url('/aura-noise.svg')] opacity-[0.22] mix-blend-overlay [background-size:220px_220px]"
        aria-hidden
      />
      <div className="relative z-10" ref={contentRef} style={{ transformStyle: "preserve-3d" }}>
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

      {/* Fast Mode Progress (v2.2) — full-screen overlay with chunk-map + workers + phased pipeline */}
      {fastModeEnabled &&
        transcriptionMode === 'fast' &&
        fastTranscriber.mode === 'processing' && (
          <FastModeProcessingScreen
            progress={fastTranscriber.progress}
            onCancel={() => {
              fastTranscriber.cancel();
              stateMachine.cancelProcessing();
            }}
          />
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
        {/* Forge top bar — brand, step pills, system status badges */}
        <div className="mb-6">
          <ForgeTopBar
            currentState={stateMachine.state}
            onNavigate={handleReset}
            hardware={hardwareCapability}
          />
        </div>

        {/* STATE VIEWS */}
        {stateMachine.state === "IDLE" && (
          <IdleStateView
            onFileSelect={stateMachine.selectFile}
            isLoading={processor.isFFmpegLoading}
          />
        )}

        {stateMachine.state === "INSPECT" && stateMachine.selectedFile && (
          <>
            {/* Large-file banner — shown in Standard Mode when file exceeds 500 MB */}
            {fastModeEnabled &&
              transcriptionMode !== 'fast' &&
              !dismissedLargeFileBanner &&
              stateMachine.selectedFile.size > LARGE_FILE_BYTES && (
                <div className="mb-4 bg-amber-950/60 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-300 mb-0.5">Large file detected</p>
                    <p className="text-xs text-amber-200/80">
                      This file ({(stateMachine.selectedFile.size / 1024 / 1024 / 1024).toFixed(1)} GB) may run out of memory in Standard Mode.{' '}
                      <strong>Fast Mode</strong> processes audio in small chunks — no size limit.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setTranscriptionMode('fast'); setDismissedLargeFileBanner(true); }}
                      className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold py-1.5 px-3 rounded transition-colors whitespace-nowrap flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Use Fast Mode
                    </button>
                    <button
                      onClick={() => setDismissedLargeFileBanner(true)}
                      className="text-xs text-amber-400/60 hover:text-amber-300 transition-colors whitespace-nowrap"
                    >
                      Continue anyway
                    </button>
                  </div>
                </div>
              )}

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
          </>
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

        {/* High Memory Warning — Standard Mode only (Fast Mode handles any file size) */}
        {isHighLoad && stateMachine.state === "PROCESSING" && transcriptionMode !== 'fast' && (
          <div className="fixed bottom-4 right-4 bg-yellow-950/90 border-2 border-yellow-500/50 rounded-lg p-4 max-w-sm backdrop-blur-sm z-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-400 text-sm mb-1">
                  File Too Large for Standard Mode
                </h3>
                <p className="text-xs text-yellow-300 mb-3">
                  Memory is running high. <strong>Fast Mode</strong> is built for large files — it processes audio in small chunks so file size doesn&apos;t matter.
                </p>
                {fastModeEnabled && (
                  <button
                    onClick={() => setTranscriptionMode('fast')}
                    className="w-full text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Switch to Fast Mode
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </main>
  );
}

