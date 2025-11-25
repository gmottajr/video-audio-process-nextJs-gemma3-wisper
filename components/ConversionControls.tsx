"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { SUPPORTED_AUDIO_FORMATS, type AudioFormatConfig } from "@/utils/audioFormats";

/**
 * Conversion Controls Component
 * 
 * Follows Interface Segregation Principle:
 * - Strictly handles user input for conversion parameters
 * - Doesn't know about FFmpeg or conversion logic
 * - Only communicates via callbacks
 */

interface ConversionControlsProps {
  onConvert: (formatId: string) => void;
  isProcessing: boolean;
  disabled: boolean;
  className?: string;
}

export function ConversionControls({
  onConvert,
  isProcessing,
  disabled,
  className,
}: ConversionControlsProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>("mp3");

  const handleConvert = () => {
    if (selectedFormat && !isProcessing && !disabled) {
      onConvert(selectedFormat);
    }
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFormat(e.target.value);
  };

  const selectedFormatConfig = SUPPORTED_AUDIO_FORMATS.find(
    (f) => f.id === selectedFormat
  );

  return (
    <div className={cn("bg-zinc-900 border border-zinc-800 rounded-lg p-6", className)}>
      <div className="space-y-4">
        {/* Format Selector */}
        <div>
          <label htmlFor="format-select" className="block text-sm font-medium text-zinc-300 mb-2">
            Target Format
          </label>
          <select
            id="format-select"
            value={selectedFormat}
            onChange={handleFormatChange}
            disabled={isProcessing || disabled}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {SUPPORTED_AUDIO_FORMATS.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name} ({format.extension}) - {format.quality}
              </option>
            ))}
          </select>

          {/* Format Info */}
          {selectedFormatConfig && (
            <div className="mt-2 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded text-xs text-zinc-400">
              <p className="font-medium text-zinc-300 mb-1">
                {selectedFormatConfig.description}
              </p>
              <div className="flex items-center gap-4 text-xs">
                <span>Quality: {selectedFormatConfig.quality}</span>
                <span>•</span>
                <span>MIME: {selectedFormatConfig.mimeType}</span>
              </div>
            </div>
          )}
        </div>

        {/* Convert Button */}
        <button
          onClick={handleConvert}
          disabled={!selectedFormat || isProcessing || disabled}
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg disabled:shadow-none"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Convert to {selectedFormatConfig?.name || "Audio"}
            </>
          )}
        </button>

        {/* Hint */}
        {!isProcessing && (
          <p className="text-sm text-zinc-500 text-center">
            {disabled
              ? "Upload a file to begin conversion"
              : `Convert audio to ${selectedFormatConfig?.name} format`}
          </p>
        )}
      </div>
    </div>
  );
}

