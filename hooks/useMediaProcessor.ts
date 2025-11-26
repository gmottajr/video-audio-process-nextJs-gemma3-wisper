"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useFFmpeg } from "./useFFmpeg";
import { useAudioConverter } from "./useAudioConverter";
import { useVideoConverter } from "./useVideoConverter";
import { useTranscriberContext } from "@/contexts/TranscriberContext";
import { BlobURLManager } from "@/lib/BlobURLManager";
import type { ActionType, CompressionType } from "@/components/ActionSelector";
import { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { getSafeCompressionType } from "@/utils/compressionHelpers";

/**
 * Media Processing Result
 */
export interface ProcessingResult {
  type: "audio" | "video" | "transcription";
  blobUrl?: string;
  transcription?: {
    text: string;
    chunks?: Array<{
      text: string;
      timestamp: [number, number | null];
    }>;
  };
  metadata?: {
    normalized?: boolean; // Flag indicating if audio was normalized
    compressionType?: CompressionType; // NEW: Type of compression applied
    format?: string;
    size?: number;
  };
}

/**
 * Processing Status
 */
export interface ProcessingStatus {
  phase: "initializing" | "processing" | "finalizing";
  progress: number;
  speed?: string;
}

/**
 * Media Processor Hook
 * 
 * Orchestrates all media processing operations:
 * - Audio extraction
 * - Audio/Video conversion
 * - AI transcription
 * 
 * Follows Single Responsibility Principle - only handles processing orchestration
 */
export function useMediaProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>({
    phase: "initializing",
    progress: 0,
  });
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Blob URL Manager (proper memory management)
  const blobManager = useRef(new BlobURLManager()).current;

  // Service hooks
  const ffmpeg = useFFmpeg();
  const audioConverter = useAudioConverter();
  const videoConverter = useVideoConverter();
  const transcriber = useTranscriberContext();

  /**
   * Auto-cleanup expired blobs every minute
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const revokedCount = blobManager.revokeExpired();
      if (revokedCount > 0) {
        console.log('[MediaProcessor] Auto-cleanup revoked', revokedCount, 'expired blob URLs');
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [blobManager]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      console.log('[MediaProcessor] Component unmounting, cleaning up blobs');
      blobManager.revokeAll();
    };
  }, [blobManager]);

  /**
   * Process media file based on action type
   */
  const processFile = useCallback(
    async (
      file: File,
      action: ActionType,
      formatId: string,
      options?: {
        resolutionId?: string;
        modelKey?: ModelKey;
        testMode?: boolean;
        normalizeAudio?: boolean; // Audio normalization option
        compressionType?: CompressionType; // NEW: Audio compression option
      }
    ): Promise<ProcessingResult> => {
      setIsProcessing(true);
      setStatus({ phase: "initializing", progress: 0 });
      setError(null);
      setResult(null);

      try {
        let processResult: ProcessingResult;

        // Track progress updates
        const progressInterval = setInterval(() => {
          const prog = ffmpeg.progress;
          if (prog < 10) setStatus({ phase: "initializing", progress: prog, speed: ffmpeg.metrics.speed });
          else if (prog < 95) setStatus({ phase: "processing", progress: prog, speed: ffmpeg.metrics.speed });
          else setStatus({ phase: "finalizing", progress: prog, speed: ffmpeg.metrics.speed });
        }, 500);

        try {
          switch (action) {
            case "extract": {
              console.log("[MediaProcessor] Extracting audio from video...");
              const blob = await ffmpeg.extractAudio(file);
              
              // Validate and normalize compression type
              const compressionType = getSafeCompressionType(options?.compressionType);
              
              // Apply compression and/or normalization if requested
              let finalBlob = blob;
              const needsProcessing = options?.normalizeAudio || compressionType !== "none";
              
              console.log(`[MediaProcessor] Compression: ${compressionType}, Normalize: ${options?.normalizeAudio || false}, NeedsProcessing: ${needsProcessing}`);
              
              if (needsProcessing) {
                const processingPhases = [];
                if (compressionType !== "none") {
                  processingPhases.push(compressionType === "both" ? "speech & studio compression" : `${compressionType} compression`);
                }
                if (options?.normalizeAudio) {
                  processingPhases.push("normalization");
                }
                
                setStatus({ 
                  phase: "processing", 
                  progress: 50, 
                  speed: `applying ${processingPhases.join(" + ")}...` 
                });
                
                finalBlob = await audioConverter.convertAudio(
                  new File([blob], "extracted.wav", { type: "audio/wav" }),
                  formatId || "wav",
                  undefined,
                  { 
                    normalizeAudio: options?.normalizeAudio,
                    compressionType: compressionType
                  }
                );
              }
              
              const url = blobManager.create(finalBlob, `audio_extract_${Date.now()}`);
              
              processResult = {
                type: "audio",
                blobUrl: url,
                metadata: {
                  normalized: options?.normalizeAudio || false,
                  compressionType: compressionType,
                  format: formatId || "wav",
                  size: finalBlob.size,
                },
              };
              break;
            }

            case "convert_audio": {
              // Validate and normalize compression type
              const compressionType = getSafeCompressionType(options?.compressionType);
              
              console.log(`[MediaProcessor] Converting audio with compression: ${compressionType}, normalize: ${options?.normalizeAudio || false}`);
              
              const blob = await audioConverter.convertAudio(
                file,
                formatId,
                undefined,
                { 
                  normalizeAudio: options?.normalizeAudio,
                  compressionType: compressionType
                }
              );
              
              const url = blobManager.create(blob, `audio_convert_${formatId}_${Date.now()}`);
              
              processResult = {
                type: "audio",
                blobUrl: url,
                metadata: {
                  normalized: options?.normalizeAudio || false,
                  compressionType: compressionType,
                  format: formatId,
                  size: blob.size,
                },
              };
              break;
            }

            case "convert_video": {
              console.log("[MediaProcessor] Converting video to", formatId);
              const blob = await videoConverter.convertVideo(file, formatId, {
                resolutionId: options?.resolutionId,
              });
              const url = blobManager.create(blob, `video_convert_${formatId}_${Date.now()}`);
              processResult = { type: "video", blobUrl: url };
              break;
            }

            case "transcribe": {
              console.log("[MediaProcessor] Starting AI transcription");
              
              if (!transcriber.isModelLoaded) {
                throw new Error("AI model not loaded");
              }

              setStatus({ phase: "processing", progress: 10 });

              // Prepare audio for AI (16kHz mono WAV)
              console.log("[MediaProcessor] Preparing audio for AI...");
              let audioBlob = await ffmpeg.prepareAudioForAI(
                file,
                undefined,
                options?.testMode ? 30 : undefined
              );

              // Apply compression and/or normalization if requested (for better transcription quality)
              const compressionType = getSafeCompressionType(options?.compressionType);
              const needsEnhancement = options?.normalizeAudio || compressionType !== "none";
              
              if (needsEnhancement) {
                console.log(`[MediaProcessor] Enhancing audio for transcription - compression: ${compressionType}, normalize: ${options?.normalizeAudio || false}`);
                
                setStatus({ phase: "processing", progress: 30 });
                
                // Apply enhancements to improve transcription quality
                audioBlob = await audioConverter.convertAudio(
                  new File([audioBlob], "prepared.wav", { type: "audio/wav" }),
                  "wav",
                  undefined,
                  { 
                    normalizeAudio: options?.normalizeAudio,
                    compressionType: compressionType
                  }
                );
                
                console.log("[MediaProcessor] ✅ Audio enhanced for transcription");
              }

              setStatus({ phase: "finalizing", progress: 50 });

              // Transcribe
              console.log("[MediaProcessor] Running AI transcription...");
              const transcriptionResult = await transcriber.transcribe(audioBlob);

              console.log("[MediaProcessor] ✅ Transcription result received:", 
                transcriptionResult?.text?.length || 0, "characters");

              processResult = {
                type: "transcription",
                transcription: transcriptionResult,
                metadata: {
                  compressionType: compressionType,
                  normalized: options?.normalizeAudio || false,
                },
              };
              break;
            }

            default:
              throw new Error(`Unknown action: ${action}`);
          }
        } finally {
          clearInterval(progressInterval);
        }

        setStatus({ phase: "finalizing", progress: 100 });
        setResult(processResult);
        setIsProcessing(false);
        
        return processResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("[MediaProcessor] Processing failed:", errorMessage);
        setError(errorMessage);
        setIsProcessing(false);
        throw err;
      }
    },
    [ffmpeg, audioConverter, videoConverter, transcriber]
  );

  /**
   * Cancel ongoing processing
   */
  const cancel = useCallback(async () => {
    try {
      await audioConverter.cancelConversion();
      setIsProcessing(false);
      setStatus({ phase: "initializing", progress: 0 });
    } catch (err) {
      console.error("[MediaProcessor] Cancel failed:", err);
      throw err;
    }
  }, [audioConverter]);

  /**
   * Reset processor state
   */
  const reset = useCallback(async () => {
    // Revoke all blob URLs
    console.log('[MediaProcessor] Resetting - revoking all blob URLs');
    blobManager.revokeAll();

    // Reset FFmpeg
    await ffmpeg.reset();

    // Clear transcription
    transcriber.clearResult();

    // Reset state
    setIsProcessing(false);
    setStatus({ phase: "initializing", progress: 0 });
    setResult(null);
    setError(null);
  }, [ffmpeg, transcriber, blobManager]);

  /**
   * Cleanup (manual cleanup if needed)
   */
  const cleanup = useCallback(() => {
    blobManager.revokeAll();
  }, [blobManager]);

  /**
   * Get blob statistics for debugging/monitoring
   */
  const getBlobStats = useCallback(() => {
    return blobManager.getStats();
  }, [blobManager]);

  return {
    // State
    isProcessing,
    status,
    result,
    error,
    
    // FFmpeg state (pass-through)
    isFFmpegLoaded: ffmpeg.isLoaded,
    isFFmpegLoading: ffmpeg.isLoading,
    ffmpegMetrics: ffmpeg.metrics,
    
    // Transcriber state (pass-through)
    isModelLoading: transcriber.isModelLoading,
    isModelLoaded: transcriber.isModelLoaded,
    isTranscribing: transcriber.isTranscribing,
    currentModel: transcriber.currentModel,
    transcriptionProgress: transcriber.progress,
    transcriptionMessage: transcriber.loadingMessage,
    
    // Blob management (pass-through)
    getBlobStats,
    activeBlobs: blobManager.getActiveCount(),
    
    // Actions
    processFile,
    cancel,
    reset,
    cleanup,
    
    // Sub-services (for specific needs)
    ffmpeg,
    transcriber,
  };
}

