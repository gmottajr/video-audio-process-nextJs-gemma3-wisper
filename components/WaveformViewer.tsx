"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import { Play, Pause, Download, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export interface WaveformSelection {
  startTime: number;      // seconds
  endTime: number;        // seconds
  startPercent: number;   // 0-1
  endPercent: number;     // 0-1
}

interface WaveformViewerProps {
  audioUrl: string | null;
  className?: string;
  selectable?: boolean;
  onSelectionChange?: (selection: WaveformSelection | null) => void;
}

export function WaveformViewer({ 
  audioUrl, 
  className, 
  selectable = false,
  onSelectionChange 
}: WaveformViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const activeRegionRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selection, setSelection] = useState<WaveformSelection | null>(null);
  const playbackCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format time in MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Initialize WaveSurfer with Regions plugin
  useEffect(() => {
    if (!audioUrl || !containerRef.current) {
      return;
    }

    // Track if this effect instance is still active (for React StrictMode)
    let isActive = true;

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
    setSelection(null);
    activeRegionRef.current = null;

    // Initialize Regions plugin
    const regionsPlugin = RegionsPlugin.create();
    regionsPluginRef.current = regionsPlugin;

    // Create new WaveSurfer instance with Regions plugin
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
      plugins: [regionsPlugin],
    });

    wavesurferRef.current = wavesurfer;

    // Event listeners for waveform
    wavesurfer.on("ready", () => {
      setIsReady(true);
      const dur = wavesurfer.getDuration();
      setDuration(dur);
      console.log("[WaveformViewer] Waveform ready, duration:", dur);
    });

    wavesurfer.on("audioprocess", (time) => {
      setCurrentTime(time);
    });

    wavesurfer.on("finish", () => {
      setIsPlaying(false);
      
      // Clear playback monitor
      if (playbackCheckIntervalRef.current) {
        clearInterval(playbackCheckIntervalRef.current);
        playbackCheckIntervalRef.current = null;
      }
      
      console.log("[WaveformViewer] Playback finished");
    });

    wavesurfer.on("seeking", (time) => {
      setCurrentTime(time);
    });

    // Region event listeners
    if (selectable) {
      // When a new region is created
      regionsPlugin.on('region-created', (region) => {
        console.log('[WaveformViewer] Region created:', region);
        
        // Remove previous region (only allow one selection at a time)
        if (activeRegionRef.current && activeRegionRef.current !== region) {
          activeRegionRef.current.remove();
        }
        
        activeRegionRef.current = region;
        updateSelectionFromRegion(region);
      });

      // When a region is updated (dragged, resized)
      regionsPlugin.on('region-updated', (region) => {
        console.log('[WaveformViewer] Region updated:', region);
        updateSelectionFromRegion(region);
      });

      // When a region is removed
      regionsPlugin.on('region-removed', (region) => {
        console.log('[WaveformViewer] Region removed');
        if (region === activeRegionRef.current) {
          activeRegionRef.current = null;
          setSelection(null);
          if (onSelectionChange) {
            onSelectionChange(null);
          }
        }
      });

      // Enable region creation on click+drag
      regionsPlugin.enableDragSelection({
        color: 'rgba(59, 130, 246, 0.3)', // Semi-transparent blue
      });
    }

    // Load audio with error handling
    wavesurfer.load(audioUrl).catch((error) => {
      // Ignore abort errors from React StrictMode cleanup
      if (error?.name === 'AbortError' || !isActive) {
        console.log("[WaveformViewer] Load aborted (likely React StrictMode)");
        return;
      }
      console.error("[WaveformViewer] Failed to load audio:", error);
    });

    // Cleanup function - CRITICAL for memory management
    return () => {
      isActive = false;
      
      // Clear playback monitor
      if (playbackCheckIntervalRef.current) {
        clearInterval(playbackCheckIntervalRef.current);
        playbackCheckIntervalRef.current = null;
      }
      
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors (may already be destroyed)
        }
        wavesurferRef.current = null;
        regionsPluginRef.current = null;
        activeRegionRef.current = null;
        console.log("[WaveformViewer] WaveSurfer instance destroyed");
      }
    };
  }, [audioUrl, selectable]);

  // Helper function to convert region to selection format
  const updateSelectionFromRegion = (region: any) => {
    // Get duration from wavesurfer if state not set yet
    const audioDuration = duration || (wavesurferRef.current?.getDuration() || 0);
    
    if (!audioDuration) {
      console.warn('[WaveformViewer] Duration not available yet, cannot update selection');
      return;
    }

    const startTime = region.start;
    const endTime = region.end;
    const startPercent = startTime / audioDuration;
    const endPercent = endTime / audioDuration;

    const newSelection: WaveformSelection = {
      startTime,
      endTime,
      startPercent,
      endPercent,
    };

    console.log('[WaveformViewer] Selection updated:', newSelection);
    setSelection(newSelection);
    
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  // Handle play/pause with segment support
  const handlePlayPause = () => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      // Pause
      wavesurferRef.current.pause();
      setIsPlaying(false);
      
      // Clear playback monitor
      if (playbackCheckIntervalRef.current) {
        clearInterval(playbackCheckIntervalRef.current);
        playbackCheckIntervalRef.current = null;
      }
    } else {
      // Play
      const ws = wavesurferRef.current;
      
      // If there's a selected region, play only that segment
      if (activeRegionRef.current) {
        const region = activeRegionRef.current;
        
        // Seek to region start
        ws.seekTo(region.start / duration);
        
        // Start playback
        ws.play();
        setIsPlaying(true);
        
        // Monitor playback and stop at region end
        playbackCheckIntervalRef.current = setInterval(() => {
          const currentTime = ws.getCurrentTime();
          
          if (currentTime >= region.end) {
            ws.pause();
            setIsPlaying(false);
            
            // Clear interval
            if (playbackCheckIntervalRef.current) {
              clearInterval(playbackCheckIntervalRef.current);
              playbackCheckIntervalRef.current = null;
            }
            
            console.log('[WaveformViewer] Reached end of selected region, stopped playback');
          }
        }, 50); // Check every 50ms for precision
      } else {
        // No region selected, play normally
        ws.play();
        setIsPlaying(true);
      }
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

  // Clear selection
  const handleClearSelection = () => {
    if (activeRegionRef.current) {
      activeRegionRef.current.remove();
    }
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
            <h3 className="text-lg font-semibold text-zinc-100">
              Waveform Visualizer {selectable && "- Selection Mode"}
            </h3>
            <p className="text-xs text-zinc-500">
              {isReady 
                ? selectable 
                  ? "Click and drag to select a region" 
                  : "Ready to play"
                : "Loading waveform..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selection && selectable && (
            <button
              onClick={handleClearSelection}
              className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
            >
              Clear Selection
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={!isReady}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download WAV
          </button>
        </div>
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
        
        {/* Selection Info */}
        {selection && (
          <div className="mt-4 bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-200">
                  ✨ Selected Region
                </p>
                <p className="text-xs text-blue-300/70 mt-1">
                  {formatTime(selection.startTime)} - {formatTime(selection.endTime)}
                  {" "}(Duration: {Math.round(selection.endTime - selection.startTime)}s)
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-300/70">
                  {(selection.startPercent * 100).toFixed(1)}% - {(selection.endPercent * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hint when no selection */}
        {selectable && !selection && isReady && (
          <div className="mt-3 text-center text-sm text-zinc-500">
            💡 Click and drag on the waveform to create a selection region
          </div>
        )}
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
