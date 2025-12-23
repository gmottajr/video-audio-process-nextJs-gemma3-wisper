"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

interface FFmpegMetrics {
  speed: number | null; // FFmpeg speed metric (e.g., 1.5x)
  duration: number | null; // Duration in seconds
  bitrate: number | null; // Bitrate in kb/s
  videoCodec: string | null;
  audioCodec: string | null;
  resolution: string | null; // e.g., "1920x1080"
  fps: number | null; // Frames per second
}

interface FFmpegLog {
  type: "info" | "error" | "fferr";
  message: string;
  timestamp: number;
}

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const isLoadingRef = useRef(false); // Synchronous loading flag to prevent race conditions
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<FFmpegLog[]>([]);
  const [metrics, setMetrics] = useState<FFmpegMetrics>({
    speed: null,
    duration: null,
    bitrate: null,
    videoCodec: null,
    audioCodec: null,
    resolution: null,
    fps: null,
  });

  // Parse duration from FFmpeg log (format: HH:MM:SS.MS)
  const parseDuration = useCallback((match: RegExpMatchArray): number => {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const seconds = parseFloat(match[3]);
    return hours * 3600 + minutes * 60 + seconds;
  }, []);

  // Parse FFmpeg logs for metadata with strict type safety
  const parseLog = useCallback((type: string, message: string) => {
    const logEntry: FFmpegLog = {
      type: type as "info" | "error" | "fferr",
      message,
      timestamp: Date.now(),
    };
    
    setLogs((prev) => [...prev.slice(-99), logEntry]); // Keep last 100 logs

    // Parse metadata from stderr (fferr)
    if (type === "fferr") {
      // Duration: 00:01:23.45
      const durationMatch = message.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (durationMatch) {
        try {
          const duration = parseDuration(durationMatch);
          setMetrics((prev) => ({ ...prev, duration }));
        } catch (error) {
          console.warn("[useFFmpeg] Failed to parse duration:", error);
        }
      }

      // bitrate: 1234 kb/s
      const bitrateMatch = message.match(/bitrate:\s*(\d+)\s*kb\/s/i);
      if (bitrateMatch) {
        const bitrate = parseInt(bitrateMatch[1], 10);
        if (!isNaN(bitrate)) {
          setMetrics((prev) => ({ ...prev, bitrate }));
        }
      }

      // Video: h264 (High) or Video: vp9
      const videoCodecMatch = message.match(/Video:\s*(\w+)/);
      if (videoCodecMatch) {
        setMetrics((prev) => ({ ...prev, videoCodec: videoCodecMatch[1] }));
      }

      // Audio: aac or Audio: opus
      const audioCodecMatch = message.match(/Audio:\s*(\w+)/);
      if (audioCodecMatch) {
        setMetrics((prev) => ({ ...prev, audioCodec: audioCodecMatch[1] }));
      }

      // Resolution: 1920x1080
      const resolutionMatch = message.match(/(\d{3,4})x(\d{3,4})/);
      if (resolutionMatch) {
        setMetrics((prev) => ({
          ...prev,
          resolution: `${resolutionMatch[1]}x${resolutionMatch[2]}`,
        }));
      }

      // FPS: 30 fps or 29.97 fps
      const fpsMatch = message.match(/(\d+(?:\.\d+)?)\s*fps/);
      if (fpsMatch) {
        const fps = parseFloat(fpsMatch[1]);
        if (!isNaN(fps)) {
          setMetrics((prev) => ({ ...prev, fps }));
        }
      }

      // Speed metric: speed=1.4x (CRITICAL for CPU monitoring)
      const speedMatch = message.match(/speed=\s*(\d+(?:\.\d+)?)x/);
      if (speedMatch) {
        const speed = parseFloat(speedMatch[1]);
        if (!isNaN(speed)) {
          setMetrics((prev) => ({ ...prev, speed }));
        }
      }
    }
  }, [parseDuration]);

  // Load FFmpeg.wasm from local files
  const load = useCallback(async () => {
    // Check both state AND ref to prevent race conditions
    // Ref is checked synchronously, state updates asynchronously
    if (ffmpegRef.current || isLoadingRef.current) {
      console.log("[useFFmpeg] Already loaded or loading, skipping...");
      return;
    }

    // Set both immediately to prevent concurrent loads
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      console.log("[useFFmpeg] Starting FFmpeg load...");
      const ffmpeg = new FFmpeg();
      
      // Attach log listener for metadata parsing
      ffmpeg.on("log", ({ type, message }) => {
        parseLog(type, message);
      });

      // Progress listener
      ffmpeg.on("progress", ({ progress: prog }) => {
        setProgress(Math.round(prog * 100));
      });

      // Load FFmpeg core from local assets (not CDN) for reliability
      // Files are in /public/ffmpeg/ directory
      const baseURL = `${window.location.origin}/ffmpeg`;
      
      console.log("[useFFmpeg] Loading core files from:", baseURL);

      // Add timeout for loading to prevent indefinite hangs
      const loadPromise = ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("FFmpeg load timeout after 60 seconds. Check network and CORS headers."));
        }, 60000);
      });

      await Promise.race([loadPromise, timeoutPromise]);

      // Set ref AFTER successful load
      ffmpegRef.current = ffmpeg;
      setIsLoaded(true);
      console.log("[useFFmpeg] FFmpeg loaded successfully");
    } catch (error) {
      console.error("[useFFmpeg] Failed to load FFmpeg:", error);
      isLoadingRef.current = false; // Reset on error
      ffmpegRef.current = null;
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [parseLog]); // Removed isLoaded/isLoading from deps (use refs instead)

  // Transcode/process a file with timeout protection
  const transcode = useCallback(
    async (file: File, command: string[], timeoutMs: number = 30000): Promise<Blob> => {
      // Check only the ref (source of truth), not state (async)
      if (!ffmpegRef.current) {
        throw new Error("FFmpeg not loaded. Call load() first.");
      }

      const ffmpeg = ffmpegRef.current;

      try {
        // Check file size (warn if very large)
        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`[useFFmpeg] Input file: ${file.name} (${fileSizeMB.toFixed(2)} MB)`);
        
        if (fileSizeMB > 1500) {
          console.warn(`[useFFmpeg] ⚠️ WARNING: File is very large (${fileSizeMB.toFixed(0)} MB). This may fail or be very slow.`);
        }
        
        // Reset progress and metrics
        setProgress(0);
        setMetrics({
          speed: null,
          duration: null,
          bitrate: null,
          videoCodec: null,
          audioCodec: null,
          resolution: null,
          fps: null,
        });

        // Write input file to MEMFS
        console.log(`[useFFmpeg] Writing file to MEMFS...`);
        const inputFileName = file.name;
        await ffmpeg.writeFile(inputFileName, await fetchFile(file));
        console.log(`[useFFmpeg] File written successfully`);

        console.log(`[useFFmpeg] Running command: ffmpeg ${command.join(" ")}`);
        console.log(`[useFFmpeg] Timeout set to: ${timeoutMs / 1000}s`);

        // Execute FFmpeg command with timeout protection and progress monitoring
        const startTime = Date.now();
        let lastProgressTime = Date.now();
        let lastProgress = 0;
        let ffmpegReporting = false;
        
        // Heartbeat logger - logs every 10 seconds
        const heartbeatInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.floor((timeoutMs - (Date.now() - startTime)) / 1000);
          console.log(
            `[useFFmpeg] ⏱️ Elapsed: ${elapsed}s | Remaining: ${remaining}s | Progress: ${progress}%`
          );
          
          // Check for stalled progress
          const timeSinceProgress = Date.now() - lastProgressTime;
          if (timeSinceProgress > 60000 && progress === lastProgress && progress < 100) {
            console.warn(
              `[useFFmpeg] ⚠️ WARNING: No progress for ${Math.floor(timeSinceProgress / 1000)}s - FFmpeg may be stuck`
            );
          }
        }, 10000);
        
        // Track progress updates
        const progressTracker = setInterval(() => {
          if (progress !== lastProgress) {
            lastProgress = progress;
            lastProgressTime = Date.now();
            ffmpegReporting = true; // FFmpeg is reporting, disable fallback
          }
        }, 1000);
        
        // Fallback progress estimator (when FFmpeg doesn't report progress)
        const fallbackEstimator = setInterval(() => {
          if (!ffmpegReporting && progress < 95) {
            const elapsed = Date.now() - startTime;
            // Estimate progress based on elapsed time (cap at 95% to avoid 100% before done)
            const estimatedProgress = Math.min(95, Math.round((elapsed / timeoutMs) * 90));
            
            if (estimatedProgress > progress) {
              setProgress(estimatedProgress);
              console.log(`[useFFmpeg] 📊 Fallback progress estimation: ${estimatedProgress}%`);
            }
          }
        }, 2000); // Check every 2 seconds

        const execPromise = ffmpeg.exec(command);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error("Process timed out"));
          }, timeoutMs);
        });

        try {
          await Promise.race([execPromise, timeoutPromise]);
          clearInterval(heartbeatInterval);
          clearInterval(progressTracker);
          clearInterval(fallbackEstimator);
          setProgress(100); // Ensure progress reaches 100% when complete
          console.log(`[useFFmpeg] ✅ Command completed in ${Math.floor((Date.now() - startTime) / 1000)}s`);
        } catch (error) {
          clearInterval(heartbeatInterval);
          clearInterval(progressTracker);
          clearInterval(fallbackEstimator);
          
          // If timeout or other error, terminate FFmpeg to free resources
          if (error instanceof Error && error.message === "Process timed out") {
            console.error("[useFFmpeg] ❌ Process timed out, terminating FFmpeg");
            ffmpeg.terminate();
            ffmpegRef.current = null;
            isLoadingRef.current = false;
            setIsLoaded(false);
            throw new Error(`Process timed out after ${timeoutMs}ms. FFmpeg has been terminated.`);
          }
          throw error;
        }

        // Read output file (assume last argument is output file)
        const outputFileName = command[command.length - 1];
        const data = await ffmpeg.readFile(outputFileName);

        // Clean up MEMFS
        try {
          await ffmpeg.deleteFile(inputFileName);
          await ffmpeg.deleteFile(outputFileName);
        } catch (cleanupError) {
          console.warn("[useFFmpeg] Cleanup error:", cleanupError);
          // Non-fatal, continue
        }

        // Convert Uint8Array to Blob
        const blob = new Blob([data as BlobPart], { type: "application/octet-stream" });
        
        console.log(`[useFFmpeg] Processing complete. Output size: ${blob.size} bytes`);
        return blob;
      } catch (error) {
        console.error("[useFFmpeg] Transcode error:", error);
        throw error;
      }
    },
    [] // No dependencies - checks ref directly
  );

  // Extract audio to WAV
  const extractAudio = useCallback(
    async (file: File, timeoutMs?: number): Promise<Blob> => {
      const outputFileName = "output.wav";
      const command = [
        "-i",
        file.name,
        "-vn", // No video
        "-acodec",
        "pcm_s16le", // PCM 16-bit little-endian
        "-ar",
        "44100", // Sample rate
        "-ac",
        "2", // Stereo
        outputFileName,
      ];

      return transcode(file, command, timeoutMs);
    },
    [transcode]
  );

  // Prepare audio for AI transcription (Whisper requires 16kHz mono)
  const prepareAudioForAI = useCallback(
    async (file: File, timeoutMs?: number, maxDurationSeconds?: number): Promise<Blob> => {
      console.log("[useFFmpeg] Preparing audio for AI transcription (16kHz mono)");
      
      if (maxDurationSeconds) {
        console.log(`[useFFmpeg] 🧪 TEST MODE: Processing first ${maxDurationSeconds} seconds only`);
      }
      
      const outputFileName = "output_16k.wav";
      const command = [
        "-i",
        file.name,
        ...(maxDurationSeconds ? ["-t", maxDurationSeconds.toString()] : []), // ✅ Limit duration for testing
        "-vn", // No video
        "-acodec",
        "pcm_s16le", // PCM 16-bit little-endian
        "-ar",
        "16000", // 16kHz - Whisper requirement
        "-ac",
        "1", // Mono - AI doesn't need stereo
        outputFileName,
      ];

      return transcode(file, command, timeoutMs);
    },
    [transcode]
  );

  // Convert video to MP4 with compression
  const compressVideo = useCallback(
    async (file: File, crf: number = 28, timeoutMs?: number): Promise<Blob> => {
      const outputFileName = "output.mp4";
      const command = [
        "-i",
        file.name,
        "-c:v",
        "libx264",
        "-crf",
        crf.toString(),
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        outputFileName,
      ];

      return transcode(file, command, timeoutMs);
    },
    [transcode]
  );

  // Reset/terminate FFmpeg instance to free memory
  const reset = useCallback(async () => {
    // Check only the ref (source of truth)
    if (ffmpegRef.current) {
      try {
        // Terminate FFmpeg instance (frees WASM memory)
        ffmpegRef.current.terminate();
        console.log("[useFFmpeg] FFmpeg instance terminated");
      } catch (error) {
        console.error("[useFFmpeg] Error terminating FFmpeg:", error);
      }
      
      // Clear all refs and state
      ffmpegRef.current = null;
      isLoadingRef.current = false; // Reset loading flag
      setIsLoaded(false);
      setIsLoading(false);
      setProgress(0);
      setLogs([]);
      setMetrics({
        speed: null,
        duration: null,
        bitrate: null,
        videoCodec: null,
        audioCodec: null,
        resolution: null,
        fps: null,
      });
    }
  }, []); // No dependencies - checks ref directly

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ffmpegRef.current) {
        ffmpegRef.current.terminate();
      }
    };
  }, []);

  return {
    isLoaded,
    isLoading,
    progress,
    logs,
    metrics,
    load,
    transcode,
    extractAudio,
    prepareAudioForAI,
    compressVideo,
    reset,
  };
}

