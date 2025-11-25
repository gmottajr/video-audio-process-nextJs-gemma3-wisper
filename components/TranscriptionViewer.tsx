"use client";

import { useState } from "react";
import { Download, Copy, Check, FileText, Clock } from "lucide-react";
import { cn } from "@/utils/cn";
import type { TranscriptionResult } from "@/hooks/useTranscriber";

interface TranscriptionViewerProps {
  result: TranscriptionResult;
  filename?: string;
  className?: string;
  modelName?: string; // Display which Whisper model was used
}

export function TranscriptionViewer({
  result,
  filename = "transcription",
  className,
  modelName,
}: TranscriptionViewerProps) {
  const [copied, setCopied] = useState(false);

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (seconds: number | null): string => {
    if (seconds === null) return "??:??";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  /**
   * Copy text to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  /**
   * Download as TXT
   */
  const handleDownloadTXT = () => {
    const blob = new Blob([result.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Download as JSON
   */
  const handleDownloadJSON = () => {
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Download as SRT (subtitle format)
   */
  const handleDownloadSRT = () => {
    if (!result.chunks || result.chunks.length === 0) {
      alert("No timestamp data available for SRT format");
      return;
    }

    let srt = "";
    result.chunks.forEach((chunk, index) => {
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

  /**
   * Format time for SRT (HH:MM:SS,mmm)
   */
  const formatSRTTime = (seconds: number | null): string => {
    if (seconds === null) return "00:00:00,000";
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
  };

  return (
    <div className={cn("bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-purple-950/30 to-pink-950/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600 rounded-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-100">AI Transcription</h3>
            <p className="text-xs text-zinc-400">
              {modelName ? `Model: ${modelName} • ` : 'Powered by Whisper • '}{result.text.length} characters
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

          {result.chunks && result.chunks.length > 0 && (
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

      {/* Full Text */}
      <div className="p-6 bg-zinc-950/50">
        <h4 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
          Full Transcript
        </h4>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-h-60 overflow-y-auto">
          <p className="text-zinc-100 leading-relaxed whitespace-pre-wrap font-mono text-sm">
            {result.text}
          </p>
        </div>
      </div>

      {/* Timestamped Chunks */}
      {result.chunks && result.chunks.length > 0 && (
        <div className="p-6 border-t border-zinc-800">
          <h4 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timestamped Segments
          </h4>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {result.chunks.map((chunk, index) => (
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
            {result.chunks ? `${result.chunks.length} segments` : "No timestamp data"}
          </span>
          <span>
            {Math.ceil(result.text.split(" ").length / 150)} min read
          </span>
        </div>
      </div>
    </div>
  );
}

