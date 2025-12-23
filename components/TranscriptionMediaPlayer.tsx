"use client";

/**
 * Transcription Media Player
 * 
 * Displays the source media (video or audio waveform) alongside transcription
 * Allows users to listen/watch while validating transcription and speaker identification
 */

import { useState } from 'react';
import { FileAudio, FileVideo, ChevronDown, ChevronUp } from 'lucide-react';
import { WaveformViewer } from './WaveformViewer';

interface TranscriptionMediaPlayerProps {
  /** Original file that was transcribed */
  file: File;
  /** Blob URL for the media (audio or video) */
  mediaUrl?: string;
  /** Whether this is audio or video */
  mediaType: 'audio' | 'video';
  /** Optional: metrics about the media */
  metrics?: {
    duration?: number;
    size?: number;
  };
  /** Whether to start collapsed */
  defaultCollapsed?: boolean;
}

export function TranscriptionMediaPlayer({
  file,
  mediaUrl,
  mediaType,
  metrics,
  defaultCollapsed = false,
}: TranscriptionMediaPlayerProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + ' MB';
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden mb-6">
      {/* Header - Always Visible */}
      <div 
        className="p-4 bg-gradient-to-r from-zinc-800/50 to-zinc-900/50 cursor-pointer hover:bg-zinc-800/70 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className={`flex-shrink-0 p-2 rounded-lg ${
              mediaType === 'video' 
                ? 'bg-purple-950/50 text-purple-400' 
                : 'bg-blue-950/50 text-blue-400'
            }`}>
              {mediaType === 'video' ? (
                <FileVideo className="w-5 h-5" />
              ) : (
                <FileAudio className="w-5 h-5" />
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-zinc-100 truncate">
                  {file.name}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  mediaType === 'video'
                    ? 'bg-purple-950/50 text-purple-300 border border-purple-500/30'
                    : 'bg-blue-950/50 text-blue-300 border border-blue-500/30'
                }`}>
                  {mediaType === 'video' ? '🎬 Video' : '🎵 Audio'}
                </span>
              </div>
              
              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                {metrics?.duration && (
                  <span>⏱️ {formatDuration(metrics.duration)}</span>
                )}
                {file.size && (
                  <span>💾 {formatFileSize(file.size)}</span>
                )}
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-500">
                  {isCollapsed ? 'Click to show player' : 'Click to hide player'}
                </span>
              </div>
            </div>
          </div>

          {/* Collapse Toggle */}
          <button
            className="flex-shrink-0 p-2 hover:bg-zinc-700/50 rounded-lg transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
          >
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Media Player - Collapsible */}
      {!isCollapsed && mediaUrl && (
        <div className="p-6 bg-zinc-950/50 border-t border-zinc-800">
          {mediaType === 'video' ? (
            <div>
              <p className="text-sm text-zinc-400 mb-3">
                Play the video to validate the transcription and speaker identification
              </p>
              <video
                src={mediaUrl}
                controls
                className="w-full max-w-4xl mx-auto rounded-lg shadow-2xl bg-black"
                style={{ maxHeight: '500px' }}
              >
                Your browser does not support video playback.
              </video>
            </div>
          ) : (
            <div>
              <p className="text-sm text-zinc-400 mb-3">
                Play the audio to validate the transcription and speaker identification
              </p>
              <WaveformViewer 
                audioUrl={mediaUrl}
                selectable={false}
              />
            </div>
          )}
          
          {/* Help Text */}
          <div className="mt-4 p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-300">
              <span className="font-medium">💡 Tip:</span> Listen/watch the media while reviewing the transcript below to:
            </p>
            <ul className="text-xs text-blue-400/80 mt-2 space-y-1 ml-5 list-disc">
              <li>Verify transcription accuracy</li>
              <li>Identify speaker names correctly</li>
              <li>Catch any missed or incorrect words</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}


