"use client";

import { useState, useRef, useEffect } from "react";
import { FileUploader } from "@/components/FileUploader";
import { MetadataDisplay } from "@/components/MetadataDisplay";
import { ResourceMonitor } from "@/components/ResourceMonitor";
import { WaveformViewer } from "@/components/WaveformViewer";
import { TranscriptionViewer } from "@/components/TranscriptionViewer";
import { ActionSelector, type ActionType } from "@/components/ActionSelector";
import { ProcessingVisualizer, type ProcessingPhase } from "@/components/ProcessingVisualizer";
import { AILoadingIndicator } from "@/components/AILoadingIndicator";
import ModelLoadingScreen from "@/components/ModelLoadingScreen";
import TranscriptionProgressScreen from "@/components/TranscriptionProgressScreen";
import ModelSelector, { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useResourceMonitor, useHardwareCapability } from "@/hooks/useResourceMonitor";
import { useAudioConverter } from "@/hooks/useAudioConverter";
import { useVideoConverter } from "@/hooks/useVideoConverter";
import { useTranscriberContext, type TranscriptionResult } from "@/contexts/TranscriberContext";
import { detectFileType, getFormatById } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import { Zap, Download, RotateCcw, AlertCircle, Cpu } from "lucide-react";

/**
 * Sequential State Machine for Linear UX Flow
 */
type AppState = "IDLE" | "INSPECT" | "PROCESSING" | "DONE" | "ERROR";

// 🧪 TEST MODE: Set to true to only process first 30 seconds of audio
// RECOMMENDED: Test with short clips before processing long audio!
const TEST_MODE = false; // Change to true to enable test mode

export default function Home() {
  // State machine
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedBlobUrl, setProcessedBlobUrl] = useState<string | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<ActionType | null>(null); // Track current action
  const [outputType, setOutputType] = useState<"audio" | "video" | "transcription" | null>(null); // Track output type
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>("initializing");

  // Blob URL tracking for cleanup - CRITICAL
  const blobUrlRefs = useRef<string[]>([]);

  // FFmpeg hook
  const {
    load,
    extractAudio,
    prepareAudioForAI,
    isLoaded,
    isLoading,
    progress,
    metrics,
    reset: resetFFmpeg,
  } = useFFmpeg();

  // Audio converter hook
  const { convertAudio, cancelConversion: cancelAudioConversion } = useAudioConverter();

  // Video converter hook
  const { convertVideo } = useVideoConverter();

  // AI Transcription context (now from context instead of hook!)
  const {
    transcribe,
    loadModel,
    clearResult,
    isModelLoading,
    isModelLoaded,
    isTranscribing,
    progress: transcriptionProgress,
    loadingMessage,
    result: transcriptionResultFromHook,
    error: transcriptionError,
    currentModel,
  } = useTranscriberContext();

  // Model selection state
  const [selectedModelKey, setSelectedModelKey] = useState<ModelKey>("base");

  // Hardware capability detection
  const hardwareCapability = useHardwareCapability();

  // Resource monitoring (active during processing)
  const { memoryUsageMB, isHighLoad } = useResourceMonitor({
    isActive: appState === "PROCESSING" || isLoading,
  });

  // Auto-load FFmpeg on mount
  useEffect(() => {
    const initFFmpeg = async () => {
      try {
        await load();
        console.log("[App] FFmpeg initialized");
      } catch (error) {
        console.error("[App] FFmpeg initialization error:", error);
        setError(`Failed to initialize FFmpeg: ${error}`);
        setAppState("ERROR");
      }
    };

    initFFmpeg();
  }, [load]);

  // Sync transcription result from hook to component state
  useEffect(() => {
    if (transcriptionResultFromHook && currentAction === "transcribe") {
      console.log("[App] 📝 Transcription result received from worker!");
      console.log("[App] 📝 Text length:", transcriptionResultFromHook.text.length, "characters");
      console.log("[App] 📝 Chunks:", transcriptionResultFromHook.chunks?.length || 0);
      
      setTranscriptionResult(transcriptionResultFromHook);
      
      // Only transition to DONE if we're currently processing a transcription
      if (appState === "PROCESSING" && outputType === "transcription") {
        console.log("[App] ✅ Transitioning to DONE state with transcription result");
        setAppState("DONE");
      }
    }
  }, [transcriptionResultFromHook, currentAction, appState, outputType]);

  // Handle transcription errors
  useEffect(() => {
    if (transcriptionError && currentAction === "transcribe") {
      setError(`Transcription failed: ${transcriptionError}`);
      setAppState("ERROR");
    }
  }, [transcriptionError, currentAction]);

  // Handle file selection → Move to INSPECT
  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setAppState("IDLE");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError(null);
    
    // Detect file type and transition
    const fileType = detectFileType(file);
    if (fileType === "unknown") {
      setError("Unsupported file type. Please upload a video or audio file.");
      setAppState("ERROR");
    } else {
      setAppState("INSPECT");
    }
  };

  // Handle action start → Move to PROCESSING
  const handleAction = async (
    action: ActionType, 
    formatId: string, 
    options?: { resolutionId?: string }
  ) => {
    if (!selectedFile || !isLoaded) return;

    setSelectedFormatId(formatId);
    setCurrentAction(action);
    setAppState("PROCESSING");
    setProcessingPhase("initializing");
    setError(null);

    try {
      // Determine processing phase based on progress
      const updatePhase = (prog: number) => {
        if (prog < 10) setProcessingPhase("initializing");
        else if (prog < 95) setProcessingPhase("processing");
        else setProcessingPhase("finalizing");
      };

      // Watch progress for phase updates
      const progressInterval = setInterval(() => {
        updatePhase(progress);
      }, 500);

      let resultBlob: Blob | null = null;
      let resultType: "audio" | "video" | "transcription";

      // Branch based on action type
      if (action === "extract") {
        console.log("[App] Extracting audio to", formatId);
        resultBlob = await extractAudio(selectedFile);
        resultType = "audio";
      } else if (action === "convert_audio") {
        console.log("[App] Converting audio to", formatId);
        resultBlob = await convertAudio(selectedFile, formatId);
        resultType = "audio";
      } else if (action === "convert_video") {
        console.log("[App] Converting video to", formatId, options?.resolutionId ? `at ${options.resolutionId}` : '');
        resultBlob = await convertVideo(selectedFile, formatId, {
          resolutionId: options?.resolutionId,
        });
        resultType = "video";
      } else if (action === "transcribe") {
        console.log('\n' + '█'.repeat(80));
        console.log('🎙️  AI TRANSCRIPTION WORKFLOW');
        console.log('█'.repeat(80));
        
        // Set output type BEFORE starting so useEffect can detect result
        resultType = "transcription";
        setOutputType("transcription");
        
        // The model MUST be loaded at this point (button is disabled until ready)
        if (!isModelLoaded) {
          throw new Error("AI model not loaded. This shouldn't happen - button should be disabled!");
        }
        
        const modelInfo = WHISPER_MODELS[selectedModelKey];
        console.log('✓ AI Model: Ready (' + modelInfo.name + ')');
        console.log('✓ Input File:', selectedFile.name, `(${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);

        // Step 1: Prepare audio (16kHz mono WAV for Whisper)
        setProcessingPhase("processing");
        console.log('\n🔊 PHASE 1: Audio Preparation');
        console.log('-'.repeat(80));
        console.log('⏳ Converting to 16kHz mono WAV (required by Whisper)...');
        if (TEST_MODE) {
          console.log('🧪 TEST MODE ENABLED: Processing first 30 seconds only');
        }
        const prepStartTime = performance.now();
        const audioBlob = await prepareAudioForAI(selectedFile, undefined, TEST_MODE ? 30 : undefined);
        const prepTime = performance.now() - prepStartTime;
        console.log('✅ Audio prepared in', (prepTime / 1000).toFixed(2), 'seconds');
        console.log('   • Output Size:', (audioBlob.size / 1024 / 1024).toFixed(2), 'MB');

        // Step 2: Transcribe
        setProcessingPhase("finalizing");
        console.log('\n🤖 PHASE 2: AI Transcription');
        console.log('-'.repeat(80));
        
        // Warn about long audio files
        const audioDurationMinutes = audioBlob.size / (16000 * 2) / 60; // Rough estimate
        if (audioDurationMinutes > 5) {
          console.warn('⚠️  WARNING: Long audio file detected!');
          console.warn('   • Estimated Duration:', Math.round(audioDurationMinutes), 'minutes');
          console.warn('   • This will take', Math.round(audioDurationMinutes * 2), '-', Math.round(audioDurationMinutes * 3), 'minutes to process');
          console.warn('   • Consider testing with shorter clips (<5 minutes) first\n');
        }
        
        const transcribeStartTime = performance.now();
        await transcribe(audioBlob);
        const transcribeTime = performance.now() - transcribeStartTime;
        
        console.log('\n' + '█'.repeat(80));
        console.log('✅ WORKFLOW COMPLETE');
        console.log('   • Preparation Time:', (prepTime / 1000).toFixed(2), 's');
        console.log('   • Transcription Time:', (transcribeTime / 1000).toFixed(2), 's');
        console.log('   • Total Time:', ((prepTime + transcribeTime) / 1000).toFixed(2), 's');
        console.log('█'.repeat(80) + '\n');
        
        // The result will be set by the worker message handler
        // The useEffect (lines 119-133) will transition to DONE when result is available
      } else {
        throw new Error(`Unknown action: ${action}`);
      }

      clearInterval(progressInterval);

      // Handle results
      if (resultType === "transcription") {
        // For transcription, the useEffect (lines 119-133) will handle
        // transitioning to DONE state when transcriptionResultFromHook is updated
        console.log(`[App] Waiting for transcription result from worker...`);
      } else if (resultBlob) {
        // Create blob URL for audio/video
        const url = URL.createObjectURL(resultBlob);
        blobUrlRefs.current.push(url);
        setProcessedBlobUrl(url);
        setOutputType(resultType);
        setAppState("DONE");
        console.log(`[App] Processing complete (${resultType})`);
      }
    } catch (error) {
      console.error("[App] Processing error:", error);
      setError(`Processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setAppState("ERROR");
    }
  };

  // Handle cancellation → Back to INSPECT
  const handleCancel = async () => {
    try {
      // Cancel any ongoing conversion (audio or video both use same FFmpeg instance)
      await cancelAudioConversion();
      setAppState("INSPECT");
      setProcessingPhase("initializing");
    } catch (error) {
      console.error("[App] Cancellation error:", error);
      setError(`Cancellation failed: ${error}`);
      setAppState("ERROR");
    }
  };

  // Handle reset → Back to IDLE
  const handleReset = async () => {
    console.log("[App] Resetting application...");

    // Revoke all blob URLs - CRITICAL
    blobUrlRefs.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    blobUrlRefs.current = [];

    // Reset FFmpeg instance
    await resetFFmpeg();

    // Clear transcription result from worker
    clearResult();

    // Clear state
    setSelectedFile(null);
    setProcessedBlobUrl(null);
    setSelectedFormatId(null);
    setCurrentAction(null);
    setOutputType(null);
    setTranscriptionResult(null);
    setError(null);
    setAppState("IDLE");

    console.log("[App] Reset complete");
  };

  // Cleanup on unmount - CRITICAL
  useEffect(() => {
    return () => {
      blobUrlRefs.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Download processed file
  const handleDownload = () => {
    if (!processedBlobUrl || !selectedFile || !selectedFormatId || !outputType) return;

    // Get format config based on output type
    const format = outputType === "audio" 
      ? getFormatById(selectedFormatId)
      : getVideoFormatById(selectedFormatId);
    
    if (!format) return;

    const link = document.createElement("a");
    link.href = processedBlobUrl;
    link.download = `${selectedFile.name.split(".")[0]}-converted${format.extension}`;
    link.click();
  };

  // Get current format config for display
  const selectedFormat = selectedFormatId && outputType
    ? (outputType === "audio" ? getFormatById(selectedFormatId) : getVideoFormatById(selectedFormatId))
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Show loading screen ONLY if model not loaded yet */}
      {!isModelLoaded && (
        <div className="fixed inset-0 z-50">
          <ModelLoadingScreen onComplete={() => {/* Model loaded */}} />
        </div>
      )}

      {/* AI Model Loading Indicator (Background Pre-load) */}
      <AILoadingIndicator
        isLoading={isModelLoading}
        isLoaded={isModelLoaded}
        progress={transcriptionProgress}
        message={loadingMessage}
      />

      {/* Transcription Progress Overlay (shows during AI transcription, hide when DONE) */}
      {isTranscribing && appState !== "DONE" && appState !== "ERROR" && <TranscriptionProgressScreen />}

      {/* PROCESSING Overlay (shows during FFmpeg processing) */}
      {appState === "PROCESSING" && !isTranscribing && (
        <ProcessingVisualizer
          progress={progress}
          speed={metrics.speed}
          phase={processingPhase}
          formatName={
            currentAction === "transcribe" 
              ? "AI"
              : currentAction === "convert_video"
              ? getVideoFormatById(selectedFormatId || "")?.name
              : getFormatById(selectedFormatId || "")?.name
          }
          onCancel={handleCancel}
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
            {/* Hardware Performance Badge - Client-only to avoid hydration errors */}
            <span className="px-4 py-1.5 bg-gradient-to-r from-green-950/50 to-emerald-950/50 border border-green-500/50 rounded-full text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-3 h-3" />
              <span suppressHydrationWarning>
                {hardwareCapability.tier === "high" 
                  ? `🚀 High Performance Mode (${hardwareCapability.deviceMemoryGB}GB+ RAM)`
                  : hardwareCapability.tier === "medium"
                  ? "⚡ Standard Performance Mode"
                  : "Standard Mode"
                }
              </span>
            </span>
          </div>

          <p className="text-zinc-400 max-w-2xl mx-auto">
            Follow the guided workflow to extract or convert your audio files with ease.
          </p>
        </header>

        {/* STATE: IDLE - File Upload */}
        {appState === "IDLE" && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Upload Your File</h2>
              <p className="text-zinc-400">
                {isLoading
                  ? "Initializing FFmpeg engine..."
                  : "Drag and drop or click to select a video or audio file"}
              </p>
            </div>
            <FileUploader 
              onFileSelect={handleFileSelect}
              maxFileSize={hardwareCapability.maxFileSize}
              recommendedFileSize={hardwareCapability.maxFileSize * 0.5} // 50% of max for warning
            />
          </div>
        )}

        {/* STATE: INSPECT - Metadata + Action Selection */}
        {appState === "INSPECT" && selectedFile && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-600 rounded-full mb-4">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Review & Configure</h2>
              <p className="text-zinc-400">
                Check your file details and choose the output format
              </p>
            </div>

            {/* Model Selector (for AI Transcription) */}
            <div className="mb-6">
              <ModelSelector
                selectedModel={selectedModelKey}
                currentlyLoadedModel={currentModel}
                isLoading={isModelLoading}
                onModelSelect={(modelKey) => {
                  setSelectedModelKey(modelKey);
                  loadModel(WHISPER_MODELS[modelKey].id);
                }}
                disabled={isTranscribing}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Left: Metadata */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-zinc-300">
                  File Information
                </h3>
                <MetadataDisplay metrics={metrics} file={selectedFile} />
              </div>

              {/* Right: Action Selector */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-zinc-300">
                  Choose Action
                </h3>
                <ActionSelector
                  file={selectedFile}
                  onAction={handleAction}
                  disabled={!isLoaded}
                  isModelLoading={isModelLoading}
                  isModelLoaded={isModelLoaded}
                  modelLoadingProgress={transcriptionProgress}
                />
              </div>
            </div>

            {/* Back button */}
            <div className="text-center">
              <button
                onClick={() => handleFileSelect(null)}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold transition-all duration-200"
              >
                ← Choose Different File
              </button>
            </div>
          </div>
        )}

        {/* STATE: DONE - Result Display */}
        {appState === "DONE" && (processedBlobUrl || transcriptionResult) && selectedFile && outputType && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-green-400">
                Processing Complete!
              </h2>
              <p className="text-zinc-400">
                {outputType === "audio" 
                  ? "Your audio file is ready. Listen to the preview or download it."
                  : outputType === "video"
                  ? "Your video file is ready. Preview it or download it."
                  : "Your transcription is ready. View the text or download it."}
              </p>
            </div>

            {/* Output Preview */}
            <div className="mb-6">
              {outputType === "audio" ? (
                <WaveformViewer audioUrl={processedBlobUrl!} />
              ) : outputType === "video" ? (
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
                    src={processedBlobUrl!}
                    controls
                    className="w-full max-w-4xl mx-auto rounded-lg shadow-2xl bg-black"
                    style={{ maxHeight: "500px" }}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              ) : transcriptionResult ? (
                <TranscriptionViewer 
                  result={transcriptionResult} 
                  filename={selectedFile.name.split(".")[0]}
                  modelName={currentModel ? WHISPER_MODELS[selectedModelKey].name : undefined}
                />
              ) : null}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              {outputType !== "transcription" && processedBlobUrl && (
                <button
                  onClick={handleDownload}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  Download {selectedFormat?.name} File
                </button>
              )}

              <button
                onClick={handleReset}
                className={`px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg ${outputType === "transcription" ? "flex-1" : ""}`}
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
        )}

        {/* STATE: ERROR - Error Recovery */}
        {appState === "ERROR" && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            <div className="bg-red-950/30 border-2 border-red-500/50 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-red-400 mb-4">
                Something Went Wrong
              </h2>
              <p className="text-zinc-300 mb-6">{error}</p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setAppState("INSPECT")}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all duration-200"
                  disabled={!selectedFile}
                >
                  Try Again
                </button>
                <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold transition-all duration-200"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}

        {/* High Memory Warning (always visible during processing) */}
        {isHighLoad && appState === "PROCESSING" && (
          <div className="fixed bottom-4 right-4 bg-yellow-950/90 border-2 border-yellow-500/50 rounded-lg p-4 max-w-sm backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-400 text-sm mb-1">
                  High Memory Usage
                </h3>
                <p className="text-xs text-yellow-300">
                  Memory usage is above 1.5GB. If the process stalls, try a smaller file.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

