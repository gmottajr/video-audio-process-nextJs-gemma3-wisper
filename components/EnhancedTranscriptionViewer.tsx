"use client";

/**
 * Enhanced Transcription Viewer
 * 
 * Displays transcription with toggle between raw and AI-enhanced versions.
 * Shows improvement metrics and allows exporting either version.
 */

import { useState } from "react";
import { 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Clock, 
  Sparkles, 
  ArrowRight,
  TrendingDown,
  Zap
} from "lucide-react";
import { cn } from "@/utils/cn";
import type { TranscriptionResult } from "@/contexts/TranscriberContext";
import type { EnhancementResult } from "@/types/enhancement";

interface EnhancedTranscriptionViewerProps {
  /** Raw transcription result from Whisper */
  rawResult: TranscriptionResult;
  /** Enhanced result from AI (optional) */
  enhancedResult?: EnhancementResult | null;
  /** Base filename for exports */
  filename?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whisper model name used */
  modelName?: string;
}

type ViewMode = 'raw' | 'enhanced' | 'comparison';

export function EnhancedTranscriptionViewer({
  rawResult,
  enhancedResult,
  filename = "transcription",
  className,
  modelName,
}: EnhancedTranscriptionViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(enhancedResult ? 'enhanced' : 'raw');
  const [copied, setCopied] = useState(false);

  const hasEnhancement = !!enhancedResult;
  const currentText = viewMode === 'enhanced' && enhancedResult 
    ? enhancedResult.enhancedText 
    : rawResult.text;

  // ============================================================================
  // Format Helpers
  // ============================================================================

  const formatTimestamp = (seconds: number | null): string => {
    if (seconds === null) return "??:??";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatSRTTime = (seconds: number | null): string => {
    if (seconds === null) return "00:00:00,000";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
  };

  // ============================================================================
  // Actions
  // ============================================================================

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDownloadTXT = () => {
    const suffix = viewMode === 'enhanced' ? '-enhanced' : '-raw';
    const blob = new Blob([currentText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}${suffix}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const suffix = viewMode === 'enhanced' ? '-enhanced' : '-raw';
    const data = viewMode === 'enhanced' && enhancedResult
      ? {
          text: enhancedResult.enhancedText,
          originalText: enhancedResult.originalText,
          improvements: enhancedResult.improvements,
          processingTime: enhancedResult.processingTime,
          modelUsed: enhancedResult.modelUsed,
          timestamp: enhancedResult.timestamp,
        }
      : rawResult;
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}${suffix}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSRT = () => {
    if (!rawResult.chunks || rawResult.chunks.length === 0) {
      alert("No timestamp data available for SRT format");
      return;
    }

    let srt = "";
    rawResult.chunks.forEach((chunk, index) => {
      const [start, end] = chunk.timestamp;
      if (start !== null) {
        srt += `${index + 1}\n`;
        srt += `${formatSRTTime(start)} --> ${formatSRTTime(end || start + 5)}\n`;
        srt += `${chunk.text.trim()}\n\n`;
      }
    });

    const blob = new Blob([srt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.srt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={cn("bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-gradient-to-r from-purple-950/30 to-pink-950/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              hasEnhancement && viewMode === 'enhanced' 
                ? "bg-gradient-to-br from-purple-600 to-pink-600" 
                : "bg-purple-600"
            )}>
              {hasEnhancement && viewMode === 'enhanced' ? (
                <Sparkles className="w-5 h-5 text-white" />
              ) : (
                <FileText className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100">
                {hasEnhancement && viewMode === 'enhanced' ? 'AI Enhanced' : 'AI Transcription'}
              </h3>
              <p className="text-xs text-zinc-400">
                {modelName ? `Model: ${modelName} • ` : 'Powered by Whisper • '}
                {currentText.length} characters
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleDownloadTXT}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="Download as TXT"
            >
              <Download className="w-4 h-4" />
              <span>TXT</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="Download as JSON"
            >
              <Download className="w-4 h-4" />
              <span>JSON</span>
            </button>

            {rawResult.chunks && rawResult.chunks.length > 0 && viewMode === 'raw' && (
              <button
                onClick={handleDownloadSRT}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                title="Download as SRT (subtitles)"
              >
                <Download className="w-4 h-4" />
                <span>SRT</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Version Toggle (if enhanced available) */}
      {hasEnhancement && (
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('raw')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                viewMode === 'raw'
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              Raw Transcript
            </button>
            <button
              onClick={() => setViewMode('enhanced')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                viewMode === 'enhanced'
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Enhanced
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                viewMode === 'comparison'
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                  : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              Compare
            </button>
          </div>
        </div>
      )}

      {/* Enhancement Metrics (if enhanced and viewing enhanced) */}
      {hasEnhancement && enhancedResult && (viewMode === 'enhanced' || viewMode === 'comparison') && (
        <div className="p-4 border-b border-zinc-800 bg-gradient-to-r from-green-950/20 to-emerald-950/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-500/20 rounded">
                <TrendingDown className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Filler Words Removed</p>
                <p className="text-sm font-semibold text-green-400">
                  {enhancedResult.improvements.fillerCount}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/20 rounded">
                <ArrowRight className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Size Reduction</p>
                <p className="text-sm font-semibold text-blue-400">
                  {enhancedResult.improvements.reductionPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/20 rounded">
                <FileText className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Words</p>
                <p className="text-sm font-semibold text-purple-400">
                  {enhancedResult.improvements.originalWordCount} → {enhancedResult.improvements.enhancedWordCount}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-500/20 rounded">
                <Zap className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Processing Time</p>
                <p className="text-sm font-semibold text-orange-400">
                  {enhancedResult.processingTime.toFixed(1)}s
                </p>
              </div>
            </div>
          </div>

          {/* Filler words that were removed */}
          {enhancedResult.improvements.fillerWordsRemoved.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-500/20">
              <p className="text-xs text-zinc-500 mb-2">Removed filler words:</p>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(enhancedResult.improvements.fillerWordsRemoved)).slice(0, 10).map((word, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 bg-red-950/50 border border-red-500/30 rounded text-xs text-red-300 line-through"
                  >
                    {word}
                  </span>
                ))}
                {enhancedResult.improvements.fillerWordsRemoved.length > 10 && (
                  <span className="px-2 py-0.5 text-xs text-zinc-500">
                    +{enhancedResult.improvements.fillerWordsRemoved.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transcript Content */}
      <div className="p-6 bg-zinc-950/50">
        {viewMode === 'comparison' && enhancedResult ? (
          /* Side-by-side comparison */
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                Original
              </h4>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-h-80 overflow-y-auto">
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {rawResult.text}
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-purple-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Enhanced
              </h4>
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-lg p-4 max-h-80 overflow-y-auto">
                <p className="text-zinc-100 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {enhancedResult.enhancedText}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Single view */
          <>
            <h4 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider flex items-center gap-2">
              {viewMode === 'enhanced' && <Sparkles className="w-4 h-4 text-purple-400" />}
              {viewMode === 'enhanced' ? 'Enhanced Transcript' : 'Full Transcript'}
            </h4>
            <div className={cn(
              "border rounded-lg p-4 max-h-60 overflow-y-auto",
              viewMode === 'enhanced' 
                ? "bg-purple-950/20 border-purple-500/30" 
                : "bg-zinc-900 border-zinc-800"
            )}>
              <p className={cn(
                "leading-relaxed whitespace-pre-wrap font-mono text-sm",
                viewMode === 'enhanced' ? "text-zinc-100" : "text-zinc-100"
              )}>
                {currentText}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Timestamped Chunks (only for raw view) */}
      {viewMode === 'raw' && rawResult.chunks && rawResult.chunks.length > 0 && (
        <div className="p-6 border-t border-zinc-800">
          <h4 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timestamped Segments
          </h4>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {rawResult.chunks.map((chunk, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <div className="flex-shrink-0">
                  <span className="px-3 py-1 bg-purple-950/50 border border-purple-500/30 rounded text-xs font-mono text-purple-400">
                    {formatTimestamp(chunk.timestamp[0])}
                    {chunk.timestamp[1] && ` - ${formatTimestamp(chunk.timestamp[1])}`}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 flex-1">{chunk.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/30">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {viewMode === 'raw' && rawResult.chunks 
              ? `${rawResult.chunks.length} segments` 
              : viewMode === 'enhanced' && enhancedResult
                ? `Enhanced by ${enhancedResult.modelUsed.split('/').pop()}`
                : "No timestamp data"
            }
          </span>
          <span>
            {Math.ceil(currentText.split(" ").length / 150)} min read
          </span>
        </div>
      </div>
    </div>
  );
}








