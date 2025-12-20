"use client";

import { Clock, Users, Zap } from "lucide-react";
import type { FormattingOptions } from "@/utils/speakerFormatter";

interface TranscriptFormattingControlsProps {
  options: FormattingOptions;
  onChange: (options: FormattingOptions) => void;
}

/**
 * Controls for transcript formatting options
 */
export function TranscriptFormattingControls({
  options,
  onChange,
}: TranscriptFormattingControlsProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-purple-400" />
        <h4 className="text-sm font-semibold text-zinc-200">Formatting Options</h4>
      </div>
      
      {/* Include Timestamps */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="flex items-center h-6">
          <input
            type="checkbox"
            checked={options.includeTimestamps}
            onChange={(e) => onChange({
              ...options,
              includeTimestamps: e.target.checked,
            })}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-0"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">
              Show Timestamps
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Display time markers like [00:15] for each speaker turn
          </p>
        </div>
      </label>
      
      {/* Include Speaker Labels */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="flex items-center h-6">
          <input
            type="checkbox"
            checked={options.includeSpeakerLabels}
            onChange={(e) => onChange({
              ...options,
              includeSpeakerLabels: e.target.checked,
            })}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-0"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">
              Separate by Speaker
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Each person's speech on a separate line (Speaker 1, Speaker 2, etc.)
          </p>
        </div>
      </label>
      
      {/* Speaker Detection Sensitivity */}
      {options.includeSpeakerLabels && (
        <div className="pl-7 space-y-2 animate-in fade-in duration-200">
          <label className="text-xs font-medium text-zinc-400 block">
            Speaker Detection Sensitivity
          </label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => onChange({
                  ...options,
                  speakerDetectionSensitivity: level,
                })}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-medium transition-all
                  ${options.speakerDetectionSensitivity === level
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                  }
                  border
                `}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            {options.speakerDetectionSensitivity === 'low' && '• Long pauses only (3+ seconds)'}
            {options.speakerDetectionSensitivity === 'medium' && '• Normal conversation pauses (1.5+ seconds)'}
            {options.speakerDetectionSensitivity === 'high' && '• Detects even brief pauses (0.8+ seconds)'}
          </p>
        </div>
      )}
      
      <div className="pt-2 border-t border-zinc-800">
        <p className="text-xs text-zinc-600">
          💡 <span className="text-zinc-500">Tip: Speaker detection works best with meetings or conversations with clear pauses between speakers.</span>
        </p>
      </div>
    </div>
  );
}

