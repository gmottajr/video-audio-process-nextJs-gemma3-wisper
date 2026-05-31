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

  // Probe file to extract metadata without processing
  const probeFile = useCallback(async (file: File): Promise<void> => {
    if (!ffmpegRef.current) {
      console.warn("[useFFmpeg] FFmpeg not loaded, cannot probe file");
      return;
    }

    try {
      console.log("[useFFmpeg] Probing file for metadata:", file.name);
      
      // Reset metrics before probing
      setMetrics({
        speed: null,
        duration: null,
        bitrate: null,
        videoCodec: null,
        audioCodec: null,
        resolution: null,
        fps: null,
      });

      const inputFileName = "probe_input";
      
      // Clean up any existing probe file first
      try {
        await ffmpegRef.current.deleteFile(inputFileName);
      } catch {
        // File doesn't exist, that's fine
      }
      
      // Write file to FFmpeg file system
      await ffmpegRef.current.writeFile(inputFileName, await fetchFile(file));
      
      // Run FFmpeg with -i to get metadata (will fail but output metadata to stderr)
      // We catch the error because FFmpeg returns non-zero when no output is specified
      try {
        await ffmpegRef.current.exec(["-i", inputFileName]);
      } catch (error) {
        // Expected error - FFmpeg outputs metadata to stderr even on "failure"
        // The parseLog callback will have captured the metadata
        console.log("[useFFmpeg] Probe completed (expected error), metadata extracted");
      }
      
      // Cleanup
      try {
        await ffmpegRef.current.deleteFile(inputFileName);
        console.log("[useFFmpeg] Probe file cleaned up");
      } catch (cleanupError) {
        console.warn("[useFFmpeg] Failed to cleanup probe file:", cleanupError);
      }
      
      console.log("[useFFmpeg] Metadata probing complete");
      
    } catch (error) {
      console.error("[useFFmpeg] Failed to probe file:", error);
      // Don't throw - metadata extraction is optional
    }
  }, []); // ✅ No dependencies - parseLog callback is already attached via FFmpeg.on("log")

  // Load FFmpeg.wasm from local files — 3-minute watchdog covers toBlobURL + ffmpeg.load,
  // auto-retries up to 3 times on timeout before giving up.
  const load = useCallback(async () => {
    if (ffmpegRef.current || isLoadingRef.current) {
      console.log("[useFFmpeg] Already loaded or loading, skipping...");
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);

    const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
    const MAX_ATTEMPTS = 3;
    const baseURL = `${window.location.origin}/ffmpeg`;

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`[useFFmpeg] Load attempt ${attempt}/${MAX_ATTEMPTS}…`);
      const ffmpeg = new FFmpeg();

      ffmpeg.on("log", ({ type, message }) => parseLog(type, message));
      ffmpeg.on("progress", ({ progress: prog }) => setProgress(Math.round(prog * 100)));

      try {
        // Race the ENTIRE fetch+load sequence (including toBlobURL) against the watchdog.
        // The old code only timed out ffmpeg.load() — toBlobURL hangs were invisible to it.
        await Promise.race([
          (async () => {
            console.log("[useFFmpeg] Fetching core files from:", baseURL);
            const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
            const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm");
            await ffmpeg.load({ coreURL, wasmURL });
          })(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`FFmpeg load timed out after ${TIMEOUT_MS / 1000}s`)),
              TIMEOUT_MS
            )
          ),
        ]);

        ffmpegRef.current = ffmpeg;
        isLoadingRef.current = false;
        setIsLoaded(true);
        setIsLoading(false);
        console.log("[useFFmpeg] FFmpeg loaded successfully");
        return; // success — exit retry loop
      } catch (error) {
        lastError = error;
        console.error(`[useFFmpeg] Attempt ${attempt}/${MAX_ATTEMPTS} failed:`, error);

        // Terminate the stalled instance before retrying
        try { ffmpeg.terminate(); } catch { /* ignore */ }

        if (attempt < MAX_ATTEMPTS) {
          console.log("[useFFmpeg] Restarting load from scratch in 2 s…");
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }

    // All attempts exhausted
    console.error("[useFFmpeg] All load attempts failed:", lastError);
    isLoadingRef.current = false;
    ffmpegRef.current = null;
    setIsLoading(false);
    throw lastError;
  }, [parseLog]);

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
    probeFile,
    transcode,
    extractAudio,
    prepareAudioForAI,
    compressVideo,
    reset,
  };
}

