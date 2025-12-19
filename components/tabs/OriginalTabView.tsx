"use client";

/**
 * Original Tab View
 * 
 * Displays the raw transcription from Whisper with basic formatting
 * and statistics. Users need to see the original to understand what changed.
 */

import { useMemo } from "react";
import { FileText, Clock, Hash, AlignLeft } from "lucide-react";
import { getTextStatistics, formatNumber } from "@/utils/textStatistics";
import type { ReadabilityScore } from "@/types/quality-metrics";

interface OriginalTabViewProps {
  /** The original transcript text */
  text: string;
  /** Optional readability score from Phase 3 */
  readabilityScore?: ReadabilityScore;
  /** Optional className for styling */
  className?: string;
}

/**
 * Get readability difficulty label
 */
function getReadabilityLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Very Easy", color: "text-green-400" };
  if (score >= 80) return { label: "Easy", color: "text-green-400" };
  if (score >= 70) return { label: "Fairly Easy", color: "text-blue-400" };
  if (score >= 60) return { label: "Standard", color: "text-blue-400" };
  if (score >= 50) return { label: "Fairly Hard", color: "text-yellow-400" };
  if (score >= 30) return { label: "Hard", color: "text-orange-400" };
  return { label: "Very Hard", color: "text-red-400" };
}

export function OriginalTabView({ 
  text, 
  readabilityScore,
  className = "" 
}: OriginalTabViewProps) {
  // Calculate statistics
  const stats = useMemo(() => getTextStatistics(text), [text]);
  
  // Get readability info if available
  const readability = useMemo(() => {
    if (!readabilityScore) return null;
    return {
      score: Math.round(readabilityScore.fleschKincaidReadingEase),
      ...getReadabilityLabel(readabilityScore.fleschKincaidReadingEase),
    };
  }, [readabilityScore]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
        <div className="p-2 bg-zinc-800 rounded-lg">
          <FileText className="w-4 h-4 text-zinc-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Original Transcription</h3>
          <p className="text-xs text-zinc-500">Raw output from speech recognition</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        <div 
          className="h-full max-h-[400px] overflow-y-auto bg-zinc-900/50 border border-zinc-800 rounded-lg p-4"
          style={{ scrollbarGutter: 'stable' }}
        >
          <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono text-sm select-text">
            {text || "No transcription available."}
          </p>
        </div>
      </div>

      {/* Statistics Footer */}
      <div className="mt-4 pt-3 border-t border-zinc-800">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Word Count */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-800/50 rounded">
              <Hash className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Words</p>
              <p className="text-sm font-medium text-zinc-300">
                {formatNumber(stats.wordCount)}
              </p>
            </div>
          </div>

          {/* Sentence Count */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-800/50 rounded">
              <AlignLeft className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Sentences</p>
              <p className="text-sm font-medium text-zinc-300">
                {formatNumber(stats.sentenceCount)}
              </p>
            </div>
          </div>

          {/* Reading Time */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-800/50 rounded">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Read Time</p>
              <p className="text-sm font-medium text-zinc-300">
                {stats.readingTimeMinutes} min
              </p>
            </div>
          </div>

          {/* Readability (if available) */}
          {readability && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-zinc-800/50 rounded">
                <span className="text-xs">📊</span>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Readability</p>
                <p className={`text-sm font-medium ${readability.color}`}>
                  {readability.score} ({readability.label})
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OriginalTabView;

