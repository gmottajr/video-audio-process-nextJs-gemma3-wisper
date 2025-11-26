"use client";

import { useCallback, useState, useRef } from "react";
import { useFFmpeg } from "./useFFmpeg";
import { useAudioConverter } from "./useAudioConverter";
import { useVideoConverter } from "./useVideoConverter";
import { useTranscriberContext } from "@/contexts/TranscriberContext";
import type { ActionType } from "@/components/ActionSelector";
import { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";

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

  // Blob URL tracking for cleanup
  const blobUrlRefs = useRef<string[]>([]);

  // Service hooks
  const ffmpeg = useFFmpeg();
  const audioConverter = useAudioConverter();
  const videoConverter = useVideoConverter();
  const transcriber = useTranscriberContext();

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
              console.log("[MediaProcessor] Extracting audio to", formatId);
              const blob = await ffmpeg.extractAudio(file);
              const url = URL.createObjectURL(blob);
              blobUrlRefs.current.push(url);
              processResult = { type: "audio", blobUrl: url };
              break;
            }

            case "convert_audio": {
              console.log("[MediaProcessor] Converting audio to", formatId);
              const blob = await audioConverter.convertAudio(file, formatId);
              const url = URL.createObjectURL(blob);
              blobUrlRefs.current.push(url);
              processResult = { type: "audio", blobUrl: url };
              break;
            }

            case "convert_video": {
              console.log("[MediaProcessor] Converting video to", formatId);
              const blob = await videoConverter.convertVideo(file, formatId, {
                resolutionId: options?.resolutionId,
              });
              const url = URL.createObjectURL(blob);
              blobUrlRefs.current.push(url);
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
              const audioBlob = await ffmpeg.prepareAudioForAI(
                file,
                undefined,
                options?.testMode ? 30 : undefined
              );

              setStatus({ phase: "finalizing", progress: 50 });

              // Transcribe
              console.log("[MediaProcessor] Running AI transcription...");
              const transcriptionResult = await transcriber.transcribe(audioBlob);

              console.log("[MediaProcessor] ✅ Transcription result received:", 
                transcriptionResult?.text?.length || 0, "characters");

              processResult = {
                type: "transcription",
                transcription: transcriptionResult,
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
    blobUrlRefs.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlRefs.current = [];

    // Reset FFmpeg
    await ffmpeg.reset();

    // Clear transcription
    transcriber.clearResult();

    // Reset state
    setIsProcessing(false);
    setStatus({ phase: "initializing", progress: 0 });
    setResult(null);
    setError(null);
  }, [ffmpeg, transcriber]);

  /**
   * Cleanup on unmount
   */
  const cleanup = useCallback(() => {
    blobUrlRefs.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlRefs.current = [];
  }, []);

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

