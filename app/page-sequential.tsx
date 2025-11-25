"use client";

import { useState, useRef, useEffect } from "react";
import { FileUploader } from "@/components/FileUploader";
import { MetadataDisplay } from "@/components/MetadataDisplay";
import { ResourceMonitor } from "@/components/ResourceMonitor";
import { WaveformViewer } from "@/components/WaveformViewer";
import { ActionSelector } from "@/components/ActionSelector";
import { ProcessingVisualizer, type ProcessingPhase } from "@/components/ProcessingVisualizer";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useResourceMonitor } from "@/hooks/useResourceMonitor";
import { useAudioConverter } from "@/hooks/useAudioConverter";
import { detectFileType, getFormatById } from "@/utils/audioFormats";
import { Zap, Download, RotateCcw, AlertCircle } from "lucide-react";

/**
 * Sequential State Machine for Linear UX Flow
 */
type AppState = "IDLE" | "INSPECT" | "PROCESSING" | "DONE" | "ERROR";

export default function SequentialHome() {
  // State machine
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedBlobUrl, setProcessedBlobUrl] = useState<string | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingPhase, setProcessingPhase] = useState<ProcessingPhase>("initializing");

  // Blob URL tracking for cleanup - CRITICAL
  const blobUrlRefs = useRef<string[]>([]);

  // FFmpeg hook
  const {
    load,
    extractAudio,
    isLoaded,
    isLoading,
    progress,
    metrics,
    reset: resetFFmpeg,
  } = useFFmpeg();

  // Audio converter hook
  const { convertAudio, cancelConversion } = useAudioConverter();

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
  const handleAction = async (action: "extract" | "convert", formatId: string) => {
    if (!selectedFile || !isLoaded) return;

    setSelectedFormatId(formatId);
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

      let audioBlob: Blob;

      if (action === "extract") {
        console.log("[App] Extracting audio to", formatId);
        audioBlob = await extractAudio(selectedFile);
      } else {
        console.log("[App] Converting audio to", formatId);
        audioBlob = await convertAudio(selectedFile, formatId);
      }

      clearInterval(progressInterval);

      // Create blob URL
      const url = URL.createObjectURL(audioBlob);
      blobUrlRefs.current.push(url);
      setProcessedBlobUrl(url);

      setAppState("DONE");
      console.log("[App] Processing complete");
    } catch (error) {
      console.error("[App] Processing error:", error);
      setError(`Processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setAppState("ERROR");
    }
  };

  // Handle cancellation → Back to INSPECT
  const handleCancel = async () => {
    try {
      await cancelConversion();
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

    // Clear state
    setSelectedFile(null);
    setProcessedBlobUrl(null);
    setSelectedFormatId(null);
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
    if (!processedBlobUrl || !selectedFile || !selectedFormatId) return;

    const format = getFormatById(selectedFormatId);
    if (!format) return;

    const link = document.createElement("a");
    link.href = processedBlobUrl;
    link.download = `${selectedFile.name.split(".")[0]}-converted${format.extension}`;
    link.click();
  };

  const selectedFormat = selectedFormatId ? getFormatById(selectedFormatId) : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* PROCESSING Overlay */}
      {appState === "PROCESSING" && (
        <ProcessingVisualizer
          progress={progress}
          speed={metrics.speed}
          phase={processingPhase}
          formatName={selectedFormat?.name}
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

          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="px-4 py-1.5 bg-cyan-950/50 border border-cyan-500/50 rounded-full text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Guided Workflow
            </span>
            <span className="px-4 py-1.5 bg-blue-950/50 border border-blue-500/50 rounded-full text-xs font-bold text-blue-400 uppercase tracking-wider">
              Step-by-Step
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
            <FileUploader onFileSelect={handleFileSelect} />
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
        {appState === "DONE" && processedBlobUrl && selectedFile && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-green-400">
                Processing Complete!
              </h2>
              <p className="text-zinc-400">
                Your audio file is ready. Listen to the preview or download it.
              </p>
            </div>

            {/* Waveform Viewer */}
            <div className="mb-6">
              <WaveformViewer audioUrl={processedBlobUrl} />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <button
                onClick={handleDownload}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
              >
                <Download className="w-5 h-5" />
                Download {selectedFormat?.name} File
              </button>

              <button
                onClick={handleReset}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg"
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

