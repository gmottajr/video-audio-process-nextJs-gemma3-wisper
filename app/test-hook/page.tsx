"use client";

import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useState } from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function TestHookPage() {
  const {
    isLoaded,
    isLoading,
    progress,
    logs,
    metrics,
    load,
    reset,
  } = useFFmpeg();

  const [status, setStatus] = useState<string>("Not loaded");

  const handleLoad = async () => {
    setStatus("Loading FFmpeg...");
    try {
      await load();
      setStatus("✅ FFmpeg loaded successfully!");
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    }
  };

  const handleReset = async () => {
    await reset();
    setStatus("FFmpeg reset - memory freed");
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
            useFFmpeg Hook Test
          </h1>
          <p className="text-zinc-400">Phase 2 Complete - Testing FFmpeg Hook</p>
        </header>

        {/* Status Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-zinc-400">State:</span>
              <span className="ml-2 font-mono">
                {isLoading && (
                  <span className="text-yellow-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </span>
                )}
                {isLoaded && (
                  <span className="text-green-500 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Loaded
                  </span>
                )}
                {!isLoading && !isLoaded && (
                  <span className="text-zinc-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Not Loaded
                  </span>
                )}
              </span>
            </div>
            <div>
              <span className="text-zinc-400">Progress:</span>
              <span className="ml-2 font-mono">{progress}%</span>
            </div>
          </div>

          <div className="bg-zinc-800 p-3 rounded font-mono text-sm mb-4">
            {status}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleLoad}
              disabled={isLoading || isLoaded}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded font-medium transition-colors"
            >
              Load FFmpeg
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

        {/* Metrics Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Parsed Metrics{" "}
            <span className="text-sm text-zinc-500">(from FFmpeg logs)</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard label="Speed" value={metrics.speed ? `${metrics.speed}x` : "—"} />
            <MetricCard
              label="Duration"
              value={metrics.duration ? `${metrics.duration.toFixed(2)}s` : "—"}
            />
            <MetricCard label="Bitrate" value={metrics.bitrate ? `${metrics.bitrate} kb/s` : "—"} />
            <MetricCard label="Video Codec" value={metrics.videoCodec || "—"} />
            <MetricCard label="Audio Codec" value={metrics.audioCodec || "—"} />
            <MetricCard label="Resolution" value={metrics.resolution || "—"} />
            <MetricCard label="FPS" value={metrics.fps ? `${metrics.fps}` : "—"} />
          </div>
        </div>

        {/* Logs Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            FFmpeg Logs{" "}
            <span className="text-sm text-zinc-500">
              (last {logs.length} entries)
            </span>
          </h2>
          <div className="bg-zinc-950 rounded p-4 h-64 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-zinc-600 text-center py-8">
                No logs yet. Load FFmpeg to see output.
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`mb-1 ${
                    log.type === "error"
                      ? "text-red-400"
                      : log.type === "fferr"
                      ? "text-yellow-400"
                      : "text-zinc-400"
                  }`}
                >
                  [{log.type}] {log.message}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Implementation Notes */}
        <div className="mt-6 bg-blue-950/30 border border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2 text-blue-400">
            ✅ Phase 2 Complete
          </h3>
          <ul className="text-sm text-zinc-300 space-y-1">
            <li>✅ FFmpeg loading with toBlobURL (CORS-safe)</li>
            <li>✅ Log parsing for metadata (no -f ffmetadata)</li>
            <li>✅ Speed metric parsing for CPU monitoring</li>
            <li>✅ Memory management with reset() function</li>
            <li>✅ Operations: transcode, extractAudio, compressVideo</li>
            <li>✅ Automatic cleanup on unmount</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800 p-3 rounded">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="font-mono text-lg">{value}</div>
    </div>
  );
}

