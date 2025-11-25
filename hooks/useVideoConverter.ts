"use client";

import { useCallback } from "react";
import { useFFmpeg } from "./useFFmpeg";
import {
  getVideoFormatById,
  isVideoFormatSupported,
  canRemux,
  getResolutionById,
  type VideoFormatConfig,
  type ResolutionConfig,
} from "@/utils/videoFormats";

/**
 * Video Converter Hook
 * 
 * Follows Single Responsibility Principle:
 * - Responsible ONLY for video conversion logic
 * - Delegates FFmpeg execution to useFFmpeg hook (Dependency Inversion)
 * 
 * Implements "Smart Remux" Strategy:
 * - MKV to MP4 with same codecs → Use -c copy (instant, lossless)
 * - Other conversions → Full re-encoding
 */

export interface VideoConversionError extends Error {
  code: "UNSUPPORTED_FORMAT" | "CONVERSION_FAILED" | "INVALID_INPUT";
}

/**
 * Calculate appropriate timeout based on file size and operation type
 * 
 * @param file Input file
 * @param isRemux True if operation is remux (instant), false if re-encoding
 * @returns Timeout in milliseconds
 */
function calculateTimeout(file: File, isRemux: boolean): number {
  const fileSizeMB = file.size / (1024 * 1024);
  
  if (isRemux) {
    // Remux is very fast (just container swap)
    // ~1-2 seconds per 100MB
    return Math.max(30000, fileSizeMB * 200); // 0.2s per MB, min 30s
  } else {
    // Re-encoding is much slower
    // Rough estimate: 1-2 minutes per 100MB for H.264, more for HEVC/VP9
    // Use generous timeout to avoid false failures
    const baseTime = fileSizeMB * 60000; // 60s per MB
    const minTimeout = 120000; // Minimum 2 minutes
    const maxTimeout = 1800000; // Maximum 30 minutes
    
    return Math.min(Math.max(baseTime, minTimeout), maxTimeout);
  }
}

export function useVideoConverter() {
  // Dependency: Inject the FFmpeg engine
  const { transcode, isLoaded, progress, metrics, load } = useFFmpeg();

  /**
   * Convert video file to target format
   * 
   * SMART REMUX LOGIC:
   * - If MKV → MP4 and codecs match: Use -c copy (2 seconds)
   * - Otherwise: Full re-encode (10 minutes)
   * 
   * @param file Input video file
   * @param targetFormatId Target format ID (e.g., 'mp4', 'webm')
   * @param options Optional conversion options (resolution, timeout)
   * @returns Promise<Blob> Converted video blob
   * @throws VideoConversionError if conversion fails
   */
  const convertVideo = useCallback(
    async (
      file: File,
      targetFormatId: string,
      options?: {
        resolutionId?: string;
        timeoutMs?: number;
      }
    ): Promise<Blob> => {
      const { resolutionId = "original", timeoutMs } = options || {};
      // Ensure FFmpeg is loaded
      if (!isLoaded) {
        console.log("[useVideoConverter] FFmpeg not loaded, loading now...");
        await load();
      }

      // Validate inputs
      if (!file) {
        const error = new Error("Input file is required") as VideoConversionError;
        error.code = "INVALID_INPUT";
        throw error;
      }

      if (!targetFormatId) {
        const error = new Error("Target format ID is required") as VideoConversionError;
        error.code = "INVALID_INPUT";
        throw error;
      }

      // Check if format is supported
      if (!isVideoFormatSupported(targetFormatId)) {
        const error = new Error(
          `Unsupported format: ${targetFormatId}`
        ) as VideoConversionError;
        error.code = "UNSUPPORTED_FORMAT";
        throw error;
      }

      // Get format configuration (Dependency Inversion - depends on abstraction)
      const formatConfig = getVideoFormatById(targetFormatId);
      if (!formatConfig) {
        const error = new Error(
          `Format configuration not found: ${targetFormatId}`
        ) as VideoConversionError;
        error.code = "UNSUPPORTED_FORMAT";
        throw error;
      }

      try {
        const outputFileName = `output${formatConfig.extension}`;
        let command: string[];

        // Get resolution configuration
        const resolutionConfig = getResolutionById(resolutionId);
        const shouldScale = resolutionConfig && resolutionConfig.id !== "original";

        // SMART REMUX STRATEGY
        // Check if we can do instant container swap (remux)
        // NOTE: Remux only works if we're not changing resolution
        if (canRemux(file, targetFormatId) && !shouldScale) {
          console.log(
            `[useVideoConverter] 🚀 SMART REMUX detected! MKV → MP4 with -c copy`
          );
          console.log(
            `[useVideoConverter] This will be INSTANT (no re-encoding required)`
          );

          // Remux command: Just copy streams without re-encoding
          command = [
            "-i",
            file.name,
            "-c", "copy", // Copy all streams without re-encoding
            "-movflags", "+faststart", // Optimize for web streaming
            outputFileName,
          ];
        } else {
          console.log(
            `[useVideoConverter] Converting to ${formatConfig.name} with re-encoding`
          );
          if (shouldScale) {
            console.log(
              `[useVideoConverter] Scaling to ${resolutionConfig?.name}`
            );
          }

          // Build command with format-specific arguments
          command = ["-i", file.name];

          // Add resolution scaling filter if needed
          if (shouldScale && resolutionConfig?.ffmpegScale) {
            command.push("-vf", resolutionConfig.ffmpegScale);
          }

          // Add format-specific encoding arguments
          command.push(...formatConfig.ffmpegArgs);

          // Add output file
          command.push(outputFileName);
        }

        console.log(`[useVideoConverter] Command: ffmpeg ${command.join(" ")}`);

        // Delegate to FFmpeg engine (Dependency Inversion)
        // Use custom timeout or calculate based on file size and operation type
        const effectiveTimeout = timeoutMs || calculateTimeout(file, canRemux(file, targetFormatId) && !shouldScale);
        console.log(`[useVideoConverter] Using timeout: ${effectiveTimeout / 1000}s`);
        
        const blob = await transcode(file, command, effectiveTimeout);

        console.log(
          `[useVideoConverter] Conversion complete: ${blob.size} bytes`
        );

        return blob;
      } catch (error) {
        console.error("[useVideoConverter] Conversion failed:", error);
        const conversionError = new Error(
          `Conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`
        ) as VideoConversionError;
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
   * @returns Object with valid flag, error message, and remux hint
   */
  const validateConversion = useCallback(
    (file: File | null, targetFormatId: string): { 
      valid: boolean; 
      error?: string;
      willRemux?: boolean; // Hint for UX: "This will be instant!"
    } => {
      if (!file) {
        return { valid: false, error: "No file selected" };
      }

      if (!isLoaded) {
        return { valid: false, error: "FFmpeg not loaded" };
      }

      if (!targetFormatId) {
        return { valid: false, error: "No target format selected" };
      }

      if (!isVideoFormatSupported(targetFormatId)) {
        return { valid: false, error: `Unsupported format: ${targetFormatId}` };
      }

      // Check if remux is possible (UX hint)
      const willRemux = canRemux(file, targetFormatId);

      return { 
        valid: true,
        willRemux, // UI can show "⚡ Instant conversion!" badge
      };
    },
    [isLoaded]
  );

  /**
   * Get format configuration
   * 
   * @param formatId Format ID
   * @returns Format configuration or undefined
   */
  const getFormat = useCallback((formatId: string): VideoFormatConfig | undefined => {
    return getVideoFormatById(formatId);
  }, []);

  return {
    convertVideo,
    validateConversion,
    getFormat,
    isLoaded,
    progress,
    metrics,
  };
}

