"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, Download, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface WaveformViewerProps {
  audioUrl: string | null;
  className?: string;
}

export function WaveformViewer({ audioUrl, className }: WaveformViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(1);

  // Format time in MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Initialize WaveSurfer
  useEffect(() => {
    if (!audioUrl || !containerRef.current) {
      return;
    }

    // Destroy existing instance before creating new one
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    // Reset state
    setIsPlaying(false);
    setIsReady(false);
    setCurrentTime(0);
    setDuration(0);

    // Create new WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      height: 128,
      waveColor: "#3b82f6", // Blue-500
      progressColor: "#06b6d4", // Cyan-500
      cursorColor: "#f472b6", // Pink-400
      barWidth: 2,
      barGap: 1,
      cursorWidth: 2,
      normalize: true,
      responsive: true,
    });

    wavesurferRef.current = wavesurfer;

    // Event listeners
    wavesurfer.on("ready", () => {
      setIsReady(true);
      setDuration(wavesurfer.getDuration());
      console.log("[WaveformViewer] Waveform ready");
    });

    wavesurfer.on("audioprocess", (time) => {
      setCurrentTime(time);
    });

    wavesurfer.on("finish", () => {
      setIsPlaying(false);
      console.log("[WaveformViewer] Playback finished");
    });

    wavesurfer.on("seeking", (time) => {
      setCurrentTime(time);
    });

    // Load audio
    wavesurfer.load(audioUrl);

    // Cleanup function - CRITICAL for memory management
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
        console.log("[WaveformViewer] WaveSurfer instance destroyed");
      }
    };
  }, [audioUrl]);

  // Handle play/pause
  const handlePlayPause = () => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      wavesurferRef.current.pause();
      setIsPlaying(false);
    } else {
      wavesurferRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle zoom change
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseInt(e.target.value, 10);
    setZoom(newZoom);
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(newZoom);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!audioUrl) return;

    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = "output.wav";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Empty state
  if (!audioUrl) {
    return (
      <div className={cn("bg-zinc-900 border border-zinc-800 rounded-lg p-6", className)}>
        <div className="text-center py-12 text-zinc-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-zinc-800 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-sm">No audio to display</p>
          <p className="text-xs text-zinc-600 mt-1">Process a file to view waveform</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden", className)}>
      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-950/30 border border-blue-800 rounded">
            <Play className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Waveform Visualizer</h3>
            <p className="text-xs text-zinc-500">
              {isReady ? "Ready to play" : "Loading waveform..."}
            </p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={!isReady}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download WAV
        </button>
      </div>

      {/* Waveform Container */}
      <div className="px-6 py-8 bg-zinc-950/50 relative">
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-10">
            <div className="flex items-center gap-3 text-blue-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm font-medium">Loading waveform...</span>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full" />
      </div>

      {/* Bottom Bar - Playback Controls */}
      <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-4">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            disabled={!isReady}
            className="shrink-0 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white" />
            )}
          </button>

          {/* Time Display */}
          <div className="shrink-0 font-mono text-sm text-zinc-300 min-w-[100px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Zoom Control */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-xs text-zinc-500 shrink-0">Zoom</span>
            <input
              type="range"
              min="1"
              max="100"
              value={zoom}
              onChange={handleZoomChange}
              disabled={!isReady}
              className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:bg-cyan-500
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-4
                [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:bg-cyan-500
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:border-0
                [&::-moz-range-thumb]:cursor-pointer"
            />
            <span className="text-xs text-zinc-500 shrink-0 min-w-[40px] text-right">
              {zoom}x
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

