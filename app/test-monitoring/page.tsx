"use client";

import { useState } from "react";
import { FileUploader } from "@/components/FileUploader";
import { ResourceMonitor } from "@/components/ResourceMonitor";
import { MetadataDisplay } from "@/components/MetadataDisplay";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useResourceMonitor } from "@/hooks/useResourceMonitor";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function TestMonitoringPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("No file loaded");
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);

  // FFmpeg hook
  const {
    load,
    extractAudio,
    isLoaded,
    isLoading,
    progress,
    metrics,
    reset,
  } = useFFmpeg();

  // Resource monitor hook (only active when FFmpeg is loaded)
  const { memoryUsageMB, isHighLoad } = useResourceMonitor({
    isActive: isLoaded || isLoading,
    interval: 1000,
  });

  // Load FFmpeg
  const handleLoad = async () => {
    setStatus("Loading FFmpeg...");
    try {
      await load();
      setStatus("✅ FFmpeg loaded successfully!");
    } catch (error) {
      setStatus(`❌ Error loading FFmpeg: ${error}`);
    }
  };

  // Process file (extract audio)
  const handleProcess = async () => {
    if (!selectedFile || !isLoaded) return;

    setStatus("Processing file...");
    try {
      const audioBlob = await extractAudio(selectedFile);
      setOutputBlob(audioBlob);
      setStatus("✅ Audio extracted successfully!");
    } catch (error) {
      setStatus(`❌ Error processing: ${error}`);
      console.error(error);
    }
  };

  // Download output
  const handleDownload = () => {
    if (!outputBlob) return;

    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.wav";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reset everything
  const handleReset = async () => {
    await reset();
    setSelectedFile(null);
    setOutputBlob(null);
    setStatus("Reset complete");
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
            Monitoring & Metadata Components Test
          </h1>
          <p className="text-zinc-400">
            Testing ResourceMonitor, MetadataDisplay, and integration with FFmpeg
          </p>
        </header>

        {/* Control Panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Control Panel</h2>
          
          {/* Status */}
          <div className="bg-zinc-800 p-3 rounded font-mono text-sm mb-4">
            {status}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleLoad}
              disabled={isLoading || isLoaded}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : isLoaded ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  FFmpeg Loaded
                </>
              ) : (
                "Load FFmpeg"
              )}
            </button>

            <button
              onClick={handleProcess}
              disabled={!selectedFile || !isLoaded || progress > 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded font-medium transition-colors"
            >
              Extract Audio
            </button>

            <button
              onClick={handleDownload}
              disabled={!outputBlob}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded font-medium transition-colors"
            >
              Download Output
            </button>

            <button
              onClick={handleReset}
              disabled={!isLoaded}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded font-medium transition-colors"
            >
              Reset (Free Memory)
            </button>
          </div>
        </div>

        {/* Resource Monitor */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Resource Monitor</h2>
          <ResourceMonitor
            metrics={metrics}
            memoryUsageMB={memoryUsageMB}
            progress={progress}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* File Uploader */}
          <div>
            <h2 className="text-xl font-semibold mb-4">File Upload</h2>
            <FileUploader onFileSelect={setSelectedFile} />
          </div>

          {/* Metadata Display */}
          <div>
            <h2 className="text-xl font-semibold mb-4">File Metadata</h2>
            <MetadataDisplay metrics={metrics} file={selectedFile} />
          </div>
        </div>

        {/* Implementation Notes */}
        <div className="bg-green-950/30 border border-green-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-green-400">
            ✅ All Monitoring Components Implemented
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-zinc-300">
            <div>
              <h4 className="font-semibold text-green-400 mb-2">useResourceMonitor</h4>
              <ul className="space-y-1 text-xs">
                <li>✅ Chrome/Edge performance.memory</li>
                <li>✅ Polls every 1000ms</li>
                <li>✅ isActive toggle</li>
                <li>✅ High load detection (&gt;1.5GB)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-cyan-400 mb-2">ResourceMonitor</h4>
              <ul className="space-y-1 text-xs">
                <li>✅ CPU efficiency (speed metric)</li>
                <li>✅ Color-coded: Red/Yellow/Green</li>
                <li>✅ Memory progress bar</li>
                <li>✅ Processing progress</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">MetadataDisplay</h4>
              <ul className="space-y-1 text-xs">
                <li>✅ File info (name, size, type)</li>
                <li>✅ Duration, resolution, FPS</li>
                <li>✅ Video/audio codecs</li>
                <li>✅ Bitrate display</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Memory Warning */}
        {isHighLoad && (
          <div className="mt-6 bg-red-950/30 border border-red-800 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-400 mb-1">High Memory Load Detected</h4>
              <p className="text-sm text-red-300/80">
                Memory usage is above 1.5GB. Consider resetting FFmpeg or processing smaller files.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

