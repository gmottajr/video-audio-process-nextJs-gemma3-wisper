"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { WaveformSelection } from "./WaveformViewer";
import { cn } from "@/utils/cn";

interface AudioPreviewProps {
  audioUrl: string;              // Blob URL of audio
  selection: WaveformSelection;  // Selected time range
  onPlaybackComplete?: () => void;
}

export function AudioPreview({ 
  audioUrl, 
  selection, 
  onPlaybackComplete 
}: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(selection.startTime);
  const [hasListened, setHasListened] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const duration = selection.endTime - selection.startTime;
  const progress = duration > 0 ? (currentTime - selection.startTime) / duration : 0;

  // Format time in MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Monitor playback progress
  const updateProgress = useCallback(() => {
    if (!audioRef.current || !isPlaying) return;

    const audio = audioRef.current;
    const time = audio.currentTime;
    setCurrentTime(time);

    // Stop at selection end
    if (time >= selection.endTime) {
      audio.pause();
      setIsPlaying(false);
      setHasListened(true);
      
      if (onPlaybackComplete) {
        onPlaybackComplete();
      }
      
      return;
    }

    // Continue monitoring
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [isPlaying, selection.endTime, onPlaybackComplete]);

  // Start progress monitoring
  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateProgress]);

  // Initialize audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => {
      setIsReady(true);
    };

    const handleError = (e: Event) => {
      console.error("[AudioPreview] Error loading audio:", e);
      setIsReady(false);
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  // Reset when selection changes
  useEffect(() => {
    setCurrentTime(selection.startTime);
    setHasListened(false);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.currentTime = selection.startTime;
    }
  }, [selection.startTime, selection.endTime, audioUrl]);

  // Play handler
  const handlePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;

    // Set to start time if not playing
    if (!isPlaying) {
      audio.currentTime = selection.startTime;
    }

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((error) => {
      console.error("[AudioPreview] Error playing audio:", error);
    });
  }, [isReady, isPlaying, selection.startTime]);

  // Pause handler
  const handlePause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
  }, []);

  // Replay handler
  const handleReplay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;

    audio.currentTime = selection.startTime;
    setCurrentTime(selection.startTime);
    
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((error) => {
      console.error("[AudioPreview] Error replaying audio:", error);
    });
  }, [isReady, selection.startTime]);

  // Toggle play/pause
  const handleTogglePlayPause = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePlay, handlePause]);

  // Seek handler
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    
    const newTime = selection.startTime + (percent * duration);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [isReady, selection.startTime, duration]);

  // Seek forward/backward
  const handleSeekRelative = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;

    const newTime = Math.max(
      selection.startTime,
      Math.min(selection.endTime, audio.currentTime + seconds)
    );
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [isReady, selection.startTime, selection.endTime]);

  // Stop and reset
  const handleStop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = selection.startTime;
    setCurrentTime(selection.startTime);
    setIsPlaying(false);
  }, [selection.startTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if component is visible and ready
      if (!isReady) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleTogglePlayPause();
          break;
        case 'r':
        case 'R':
          handleReplay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeekRelative(5);
          break;
        case 'Escape':
          handleStop();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isReady, handleTogglePlayPause, handleReplay, handleSeekRelative, handleStop]);

  return (
    <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-6">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
      />

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-blue-100 mb-1">
          🎧 Audio Preview
        </h3>
        <p className="text-sm text-blue-300/70">
          Selected: {formatTime(selection.startTime)} - {formatTime(selection.endTime)}
          {" "}({Math.round(duration)}s)
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        {/* Play Button */}
        <button
          onClick={handlePlay}
          disabled={!isReady || isPlaying}
          className={cn(
            "p-3 rounded-lg font-medium transition-colors flex items-center justify-center",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            isPlaying ? "bg-blue-600/50" : "bg-blue-600 hover:bg-blue-700"
          )}
          title="Play (Space)"
        >
          <Play className="w-5 h-5 text-white" />
        </button>

        {/* Pause Button */}
        <button
          onClick={handlePause}
          disabled={!isReady || !isPlaying}
          className={cn(
            "p-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors",
            "flex items-center justify-center",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          title="Pause (Space)"
        >
          <Pause className="w-5 h-5 text-white" />
        </button>

        {/* Replay Button */}
        <button
          onClick={handleReplay}
          disabled={!isReady}
          className={cn(
            "p-3 bg-cyan-600/50 hover:bg-cyan-600 rounded-lg font-medium transition-colors",
            "flex items-center justify-center",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          title="Replay (R)"
        >
          <RotateCcw className="w-5 h-5 text-white" />
        </button>

        {/* Time Display */}
        <div className="flex-1 text-right">
          <div className="font-mono text-sm text-blue-200">
            {formatTime(currentTime)} / {formatTime(selection.endTime)}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div 
        className="relative h-3 bg-blue-950/50 rounded-full cursor-pointer overflow-hidden mb-4"
        onClick={handleSeek}
      >
        {/* Fill */}
        <div 
          className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
        
        {/* Playhead */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-100"
          style={{ left: `calc(${progress * 100}% - 8px)` }}
        />
      </div>

      {/* Status & Tips */}
      {!hasListened ? (
        <div className="bg-blue-900/30 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div className="flex-1">
              <p className="text-sm text-blue-200 mb-1">
                <strong>Listen to preview your selection</strong>
              </p>
              <p className="text-xs text-blue-300/60">
                The audio will automatically stop at the end of your selection
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-900/30 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">✅</span>
            <div className="flex-1">
              <p className="text-sm text-green-200">
                <strong>Preview complete!</strong>
              </p>
              <p className="text-xs text-green-300/60">
                You've listened to your selection
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="mt-3 pt-3 border-t border-blue-500/20">
        <p className="text-xs text-blue-300/50 text-center">
          <strong>Keyboard shortcuts:</strong> Space (play/pause) • R (replay) • ← → (seek ±5s) • Esc (stop)
        </p>
      </div>
    </div>
  );
}

