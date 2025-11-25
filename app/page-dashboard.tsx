"use client";

import { useState, useRef, useEffect } from "react";
import { FileUploader } from "@/components/FileUploader";
import { MetadataDisplay } from "@/components/MetadataDisplay";
import { ResourceMonitor } from "@/components/ResourceMonitor";
import { WaveformViewer } from "@/components/WaveformViewer";
import { ConversionControls } from "@/components/ConversionControls";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useResourceMonitor } from "@/hooks/useResourceMonitor";
import { useAudioConverter } from "@/hooks/useAudioConverter";
import { Zap, Loader2, Play, RotateCcw, AlertCircle, Scissors, RefreshCw } from "lucide-react";

type ProcessMode = "extract" | "convert";

export default function Home() {
  // State management
  const [mode, setMode] = useState<ProcessMode>("extract");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedBlobUrl, setProcessedBlobUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Ready");
  const [error, setError] = useState<string | null>(null);

  // Blob URL tracking for cleanup - CRITICAL for memory management
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

  // Audio converter hook (Dependency Injection - uses useFFmpeg internally)
  const { convertAudio, validateConversion } = useAudioConverter();

  // Resource monitoring (active when FFmpeg is loaded)
  const { memoryUsageMB, isHighLoad } = useResourceMonitor({
    isActive: isLoaded || isLoading,
  });

  // Auto-load FFmpeg on mount
  useEffect(() => {
    const initFFmpeg = async () => {
      try {
        setStatus("Initializing FFmpeg engine...");
        await load();
        setStatus("Ready to process");
      } catch (error) {
        setStatus("Failed to initialize");
        setError(`Failed to load FFmpeg: ${error}`);
        console.error("[App] FFmpeg initialization error:", error);
      }
    };

    initFFmpeg();
  }, [load]);

  // Process file - Extract audio
  const handleExtract = async () => {
    if (!selectedFile || !isLoaded) return;

    setStatus("Extracting audio...");
    setError(null);

    try {
      // Extract audio using FFmpeg
      const audioBlob = await extractAudio(selectedFile);

      // Create blob URL
      const url = URL.createObjectURL(audioBlob);

      // Track URL for cleanup - CRITICAL
      blobUrlRefs.current.push(url);
      setProcessedBlobUrl(url);

      setStatus("✅ Extraction complete!");
      console.log("[App] Audio extracted successfully");
    } catch (error) {
      setStatus("❌ Extraction failed");
      setError(`Extraction error: ${error}`);
      console.error("[App] Extraction error:", error);
    }
  };

  // Process file - Convert audio
  const handleConvert = async (formatId: string) => {
    if (!selectedFile || !isLoaded) return;

    const validation = validateConversion(selectedFile, formatId);
    if (!validation.valid) {
      setError(validation.error || "Invalid conversion parameters");
      return;
    }

    setStatus(`Converting to ${formatId.toUpperCase()}...`);
    setError(null);

    try {
      // Convert audio using the converter hook
      const audioBlob = await convertAudio(selectedFile, formatId);

      // Create blob URL
      const url = URL.createObjectURL(audioBlob);

      // Track URL for cleanup - CRITICAL
      blobUrlRefs.current.push(url);
      setProcessedBlobUrl(url);

      setStatus("✅ Conversion complete!");
      console.log(`[App] Audio converted to ${formatId} successfully`);
    } catch (error) {
      setStatus("❌ Conversion failed");
      setError(`Conversion error: ${error}`);
      console.error("[App] Conversion error:", error);
    }
  };

  // Reset everything and free memory
  const handleReset = async () => {
    setStatus("Resetting...");

    // Revoke all blob URLs - CRITICAL for memory management
    blobUrlRefs.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    blobUrlRefs.current = [];

    // Reset FFmpeg instance
    await resetFFmpeg();

    // Clear state
    setSelectedFile(null);
    setProcessedBlobUrl(null);
    setError(null);
    setStatus("Ready to process");

    console.log("[App] Reset complete - memory freed");
  };

  // Cleanup on unmount - CRITICAL
  useEffect(() => {
    return () => {
      blobUrlRefs.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Check if processing is disabled
  const isProcessingDisabled = !selectedFile || !isLoaded || !!processedBlobUrl || progress > 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Initializing Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-zinc-900 border-2 border-blue-500/50 rounded-lg p-8 text-center max-w-md">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <h2 className="text-2xl font-bold mb-2 text-blue-400">Initializing Engine</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Loading FFmpeg WebAssembly modules...
            </p>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse w-3/4" />
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8 text-center relative">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
              Browser Transcoder
            </h1>
          </div>
          
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="px-4 py-1.5 bg-cyan-950/50 border border-cyan-500/50 rounded-full text-xs font-bold text-cyan-400 uppercase tracking-wider">
              WASM Accelerated
            </span>
            <span className="px-4 py-1.5 bg-blue-950/50 border border-blue-500/50 rounded-full text-xs font-bold text-blue-400 uppercase tracking-wider">
              Chrome/Edge Only
            </span>
          </div>

          <p className="text-zinc-400 max-w-2xl mx-auto">
            High-performance video and audio processing in your browser. 
            No server required - all processing happens locally with FFmpeg WebAssembly.
          </p>

          {/* Mode Switcher */}
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setMode("extract")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                mode === "extract"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              <Scissors className="w-4 h-4" />
              Extract Audio
            </button>
            <button
              onClick={() => setMode("convert")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                mode === "convert"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Convert Format
            </button>
          </div>

          {/* Status Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 font-mono text-sm">
              <span className="text-zinc-500">Status:</span>{" "}
              <span className={isLoaded ? "text-green-400" : "text-yellow-400"}>
                {status}
              </span>
            </div>
          </div>
        </header>

        {/* Main Grid Layout */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column - Input */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm font-bold">
                  1
                </span>
                Upload File
              </h2>
              <FileUploader onFileSelect={setSelectedFile} />
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-cyan-600 rounded flex items-center justify-center text-sm font-bold">
                  2
                </span>
                File Metadata
              </h2>
              <MetadataDisplay metrics={metrics} file={selectedFile} />
            </div>
          </div>
        </div>

        {/* Resource Monitor */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <span className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-sm font-bold">
              ⚡
            </span>
            System Resources
          </h2>
          <ResourceMonitor
            metrics={metrics}
            memoryUsageMB={memoryUsageMB}
            progress={progress}
          />
        </div>

        {/* Action Bar */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <span className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-sm font-bold">
              3
            </span>
            {mode === "extract" ? "Extract Audio" : "Convert Format"}
          </h2>
          
          {/* Extract Mode */}
          {mode === "extract" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleExtract}
                  disabled={isProcessingDisabled}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:shadow-none"
                >
                  {progress > 0 && progress < 100 ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Extracting... {progress}%
                    </>
                  ) : processedBlobUrl ? (
                    <>
                      ✅ Extraction Complete
                    </>
                  ) : (
                    <>
                      <Scissors className="w-5 h-5" />
                      Extract to WAV
                    </>
                  )}
                </button>

                <button
                  onClick={handleReset}
                  disabled={!isLoaded || isLoading}
                  className="px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:shadow-none"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
              </div>

              {/* Processing hint */}
              {!processedBlobUrl && (
                <p className="text-sm text-zinc-500 mt-4 text-center">
                  {!selectedFile
                    ? "Upload a file to begin"
                    : !isLoaded
                    ? "Waiting for FFmpeg to initialize..."
                    : "Click 'Extract to WAV' to extract audio in lossless WAV format"}
                </p>
              )}
            </div>
          )}

          {/* Convert Mode */}
          {mode === "convert" && (
            <div className="grid md:grid-cols-[1fr_auto] gap-4">
              <ConversionControls
                onConvert={handleConvert}
                isProcessing={progress > 0 && progress < 100}
                disabled={!selectedFile || !isLoaded || !!processedBlobUrl}
              />
              
              <button
                onClick={handleReset}
                disabled={!isLoaded || isLoading}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:shadow-none h-fit md:self-end"
              >
                <RotateCcw className="w-5 h-5" />
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-950/30 border-2 border-red-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400 mb-1">Error</h3>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* High Memory Warning */}
        {isHighLoad && (
          <div className="mb-6 bg-yellow-950/30 border-2 border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-400 mb-1">High Memory Load</h3>
              <p className="text-sm text-yellow-300">
                Memory usage is above 1.5GB. Consider clicking 'Reset' to free memory.
              </p>
            </div>
          </div>
        )}

        {/* Output Section - Waveform */}
        {processedBlobUrl && (
          <div className="mb-6 animate-in fade-in duration-500">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-pink-600 rounded flex items-center justify-center text-sm font-bold">
                4
              </span>
              Waveform Visualization
            </h2>
            <WaveformViewer audioUrl={processedBlobUrl} />
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 pt-6 border-t border-zinc-800">
          <div className="grid md:grid-cols-3 gap-6 text-sm text-zinc-400">
            <div>
              <h3 className="font-semibold text-zinc-300 mb-2">🚀 Performance First</h3>
              <p className="text-xs">
                Optimized for Chrome/Edge with cutting-edge Web APIs. 
                Local FFmpeg processing for maximum speed.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-300 mb-2">🔒 Privacy</h3>
              <p className="text-xs">
                All processing happens in your browser. 
                No files uploaded to servers. Your data stays local.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-300 mb-2">🛡️ Memory Safe</h3>
              <p className="text-xs">
                Automatic blob cleanup and FFmpeg termination. 
                Click 'Reset' to free memory after processing.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-600">
              Powered by FFmpeg.wasm, wavesurfer.js, and Next.js
            </p>
            <p className="text-xs text-zinc-700 mt-1">
              Performance-First Browser POC - Chrome 90+ / Edge 90+ Required
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
