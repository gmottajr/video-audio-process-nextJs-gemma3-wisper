"use client";

import { useCallback, useRef } from "react";
import { useFFmpeg } from "./useFFmpeg";
import { getFormatById, isFormatSupported, type AudioFormatConfig } from "@/utils/audioFormats";
import type { CompressionType } from "@/components/ActionSelector";

/**
 * Audio Converter Hook
 * 
 * Follows Single Responsibility Principle:
 * - Responsible ONLY for audio conversion logic
 * - Delegates FFmpeg execution to useFFmpeg hook (Dependency Inversion)
 * 
 * Follows Dependency Inversion Principle:
 * - Depends on abstract interface (AudioFormatConfig)
 * - Not coupled to specific format implementations
 */

export interface ConversionError extends Error {
  code: "UNSUPPORTED_FORMAT" | "CONVERSION_FAILED" | "INVALID_INPUT";
}

/**
 * Calculate appropriate timeout for audio conversion based on file size
 * Audio conversion is much faster than video re-encoding
 * 
 * @param file Input file
 * @param compressionType Compression type (adds overhead)
 * @param normalizeAudio Whether normalization is enabled (adds overhead)
 * @returns Timeout in milliseconds
 */
function calculateAudioTimeout(file: File, compressionType: CompressionType = "none", normalizeAudio: boolean = false): number {
  const fileSizeMB = file.size / (1024 * 1024);
  
  // Audio conversion is relatively fast
  // Rough estimate: 5-10 seconds per 100MB
  let baseTime = fileSizeMB * 10000; // 10s per MB
  
  // Add overhead for compression
  if (compressionType === "speech") {
    baseTime *= 1.15; // +15% for speech compression
  } else if (compressionType === "studio") {
    baseTime *= 1.12; // +12% for studio compression
  } else if (compressionType === "both") {
    baseTime *= 1.25; // +25% for both compressions
  }
  
  // Add overhead for normalization
  if (normalizeAudio) {
    baseTime *= 1.1; // +10% for normalization
  }
  
  const minTimeout = 60000; // Minimum 1 minute
  const maxTimeout = 600000; // Maximum 10 minutes
  
  return Math.min(Math.max(baseTime, minTimeout), maxTimeout);
}

export function useAudioConverter() {
  // Dependency: Inject the FFmpeg engine
  const { transcode, isLoaded, progress, metrics, reset: terminateFFmpeg, load } = useFFmpeg();
  
  // Cancellation support
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Convert audio file to target format
   * 
   * @param file Input audio/video file
   * @param targetFormatId Target format ID (e.g., 'mp3', 'wav')
   * @param timeoutMs Optional timeout in milliseconds
   * @param options Optional conversion options (normalize, compression, etc.)
   * @returns Promise<Blob> Converted audio blob
   * @throws ConversionError if conversion fails
   */
  const convertAudio = useCallback(
    async (
      file: File,
      targetFormatId: string,
      timeoutMs?: number,
      options?: { normalizeAudio?: boolean; compressionType?: CompressionType }
    ): Promise<Blob> => {
      // Ensure FFmpeg is loaded
      if (!isLoaded) {
        console.log("[useAudioConverter] FFmpeg not loaded, loading now...");
        await load();
      }

      // Validate inputs
      if (!file) {
        const error = new Error("Input file is required") as ConversionError;
        error.code = "INVALID_INPUT";
        throw error;
      }

      if (!targetFormatId) {
        const error = new Error("Target format ID is required") as ConversionError;
        error.code = "INVALID_INPUT";
        throw error;
      }

      // Check if format is supported
      if (!isFormatSupported(targetFormatId)) {
        const error = new Error(
          `Unsupported format: ${targetFormatId}`
        ) as ConversionError;
        error.code = "UNSUPPORTED_FORMAT";
        throw error;
      }

      // Get format configuration (Dependency Inversion - depends on abstraction)
      const formatConfig = getFormatById(targetFormatId);
      if (!formatConfig) {
        const error = new Error(
          `Format configuration not found: ${targetFormatId}`
        ) as ConversionError;
        error.code = "UNSUPPORTED_FORMAT";
        throw error;
      }

      try {
        // Construct FFmpeg command dynamically based on format config
        const outputFileName = `output${formatConfig.extension}`;
        const command = [
          "-i",
          file.name,
          "-vn", // No video (audio only)
        ];

        // Build audio filter chain
        const filters: string[] = [];
        const compressionType = options?.compressionType || "none";

        // Add compression filter(s) FIRST (order matters: compress → normalize)
        if (compressionType === "speech") {
          filters.push("dynaudnorm=f=200:g=15:p=0.9:m=15:s=15");
          console.log("[useAudioConverter] Applying speech compression (dynaudnorm)");
        } else if (compressionType === "studio") {
          filters.push("acompressor=threshold=-20dB:ratio=4:attack=20:release=250");
          console.log("[useAudioConverter] Applying studio compression (acompressor)");
        } else if (compressionType === "both") {
          filters.push("dynaudnorm=f=200:g=15:p=0.9:m=15:s=15");
          filters.push("acompressor=threshold=-20dB:ratio=4:attack=20:release=250");
          console.log("[useAudioConverter] Applying both compressions (speech + studio)");
        }

        // Add normalization filter AFTER compression (if requested)
        if (options?.normalizeAudio) {
          filters.push("loudnorm=I=-16:TP=-1.5:LRA=11:print_format=summary");
          console.log("[useAudioConverter] Applying normalization (loudnorm)");
        }

        // Apply filter chain if any filters were added
        if (filters.length > 0) {
          command.push("-af", filters.join(","));
        }

        // Add format-specific arguments
        command.push(...formatConfig.ffmpegArgs, outputFileName);

        // Use custom timeout or calculate based on file size and options
        const effectiveTimeout = timeoutMs || calculateAudioTimeout(file, compressionType, options?.normalizeAudio);

        console.log(`[useAudioConverter] Timeout: ${effectiveTimeout}ms (compression: ${compressionType}, normalize: ${options?.normalizeAudio})`);

        // Delegate to FFmpeg engine (Dependency Inversion)
        const blob = await transcode(file, command, effectiveTimeout);

        return blob;
      } catch (error) {
        console.error("[useAudioConverter] Conversion failed:", error);
        const conversionError = new Error(
          `Conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`
        ) as ConversionError;
        conversionError.code = "CONVERSION_FAILED";
        throw conversionError;
      }
    },
    [transcode, load, isLoaded]
  );

  /**
   * Validate if conversion is possible
   * 
   * @param file Input file
   * @param targetFormatId Target format ID
   * @returns Object with valid flag and error message
   */
  const validateConversion = useCallback(
    (file: File | null, targetFormatId: string): { valid: boolean; error?: string } => {
      if (!file) {
        return { valid: false, error: "No file selected" };
      }

      if (!isLoaded) {
        return { valid: false, error: "FFmpeg not loaded" };
      }

      if (!targetFormatId) {
        return { valid: false, error: "No target format selected" };
      }

      if (!isFormatSupported(targetFormatId)) {
        return { valid: false, error: `Unsupported format: ${targetFormatId}` };
      }

      return { valid: true };
    },
    [isLoaded]
  );

  /**
   * Get format configuration
   * 
   * @param formatId Format ID
   * @returns Format configuration or undefined
   */
  const getFormat = useCallback((formatId: string): AudioFormatConfig | undefined => {
    return getFormatById(formatId);
  }, []);

  /**
   * Cancel ongoing conversion
   * Terminates FFmpeg and cleans up
   */
  const cancelConversion = useCallback(async () => {
    console.log("[useAudioConverter] Cancelling conversion...");
    
    // Abort the current operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Terminate FFmpeg to force stop
    await terminateFFmpeg();
    
    console.log("[useAudioConverter] Conversion cancelled");
  }, [terminateFFmpeg]);

  return {
    convertAudio,
    validateConversion,
    getFormat,
    cancelConversion,
    isLoaded,
    progress,
    metrics,
  };
}

