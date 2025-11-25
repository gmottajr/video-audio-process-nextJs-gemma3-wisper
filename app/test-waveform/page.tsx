"use client";

import { useState } from "react";
import { FileUploader } from "@/components/FileUploader";
import { WaveformViewer } from "@/components/WaveformViewer";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function TestWaveformPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("No file loaded");

  // FFmpeg hook
  const {
    load,
    extractAudio,
    isLoaded,
    isLoading,
    progress,
    reset,
  } = useFFmpeg();

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
    
    // Clean up previous audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const audioBlob = await extractAudio(selectedFile);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setStatus("✅ Audio extracted successfully! Waveform ready.");
    } catch (error) {
      setStatus(`❌ Error processing: ${error}`);
      console.error(error);
    }
  };

  // Reset everything
  const handleReset = async () => {
    // Clean up audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    await reset();
    setSelectedFile(null);
    setStatus("Reset complete");
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
            WaveformViewer Component Test
          </h1>
          <p className="text-zinc-400">
            Testing wavesurfer.js integration with audio waveform visualization
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
              Extract Audio & Show Waveform
            </button>

            <button
              onClick={handleReset}
              disabled={!isLoaded}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded font-medium transition-colors"
            >
              Reset (Free Memory)
            </button>
          </div>

          {/* Progress Bar */}
          {progress > 0 && progress < 100 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Processing...</span>
                <span className="text-cyan-400 font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* File Uploader */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload File</h2>
          <FileUploader onFileSelect={setSelectedFile} />
        </div>

        {/* Waveform Viewer */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Waveform Visualization</h2>
          <WaveformViewer audioUrl={audioUrl} />
        </div>

        {/* Implementation Notes */}
        <div className="bg-green-950/30 border border-green-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-green-400">
            ✅ WaveformViewer Component Implemented
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-zinc-300">
            <div>
              <h4 className="font-semibold text-cyan-400 mb-2">Features</h4>
              <ul className="space-y-1 text-xs">
                <li>✅ wavesurfer.js integration</li>
                <li>✅ Play/Pause controls</li>
                <li>✅ Time display (current/total)</li>
                <li>✅ Zoom slider (1-100x)</li>
                <li>✅ Download button</li>
                <li>✅ Loading state</li>
                <li>✅ Empty state</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">Memory Management</h4>
              <ul className="space-y-1 text-xs">
                <li>✅ WaveSurfer instance in useRef</li>
                <li>✅ destroy() on cleanup</li>
                <li>✅ destroy() before creating new instance</li>
                <li>✅ Event listeners cleaned up</li>
                <li>✅ Blob URL revocation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 bg-blue-950/30 border border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2 text-blue-400">
            📋 How to Test
          </h3>
          <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
            <li>Click "Load FFmpeg" and wait (~3-5 seconds)</li>
            <li>Upload a video or audio file (MP4, MP3, or WAV)</li>
            <li>Click "Extract Audio & Show Waveform"</li>
            <li>Watch the waveform appear and try the controls:
              <ul className="ml-6 mt-1 text-xs text-zinc-400 list-disc list-inside">
                <li>Play/Pause button to control playback</li>
                <li>Click on waveform to seek</li>
                <li>Use zoom slider to zoom in/out</li>
                <li>Download button to save WAV file</li>
              </ul>
            </li>
            <li>Click "Reset" to free memory and start over</li>
          </ol>
        </div>
      </div>
    </main>
  );
}

