"use client";

import { useEffect, useState } from "react";
import type { AppState } from "@/hooks/useAppStateMachine";

interface FFmpegApi {
  load: () => Promise<void>;
  probeFile: (file: File) => Promise<void>;
}

interface Deps {
  state: AppState;
  selectedFile: File | null;
  isFFmpegLoaded: boolean;
  isFFmpegLoading: boolean;
  ffmpeg: FFmpegApi;
  failProcessing: (message: string) => void;
}

export function useFFmpegAutoLoad({
  state,
  selectedFile,
  isFFmpegLoaded,
  isFFmpegLoading,
  ffmpeg,
  failProcessing,
}: Deps) {
  const [probedFileName, setProbedFileName] = useState<string | null>(null);

  // Auto-load FFmpeg on mount (only once)
  useEffect(() => {
    const init = async () => {
      try {
        await ffmpeg.load();
        console.log("[App] FFmpeg initialized");
      } catch (error) {
        console.error("[App] FFmpeg initialization error:", error);
        failProcessing(`Failed to initialize FFmpeg: ${error}`);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure FFmpeg is loaded when entering INSPECT (handles reset/terminate cases)
  useEffect(() => {
    if (state !== "INSPECT" || isFFmpegLoaded || isFFmpegLoading) return;
    const reload = async () => {
      console.log("[App] FFmpeg not loaded in INSPECT state, reloading...");
      try {
        await ffmpeg.load();
        console.log("[App] FFmpeg reloaded successfully");
      } catch (error) {
        console.error("[App] FFmpeg reload failed:", error);
      }
    };
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isFFmpegLoaded, isFFmpegLoading]);

  // Probe file metadata once per file when entering INSPECT
  useEffect(() => {
    if (
      state !== "INSPECT" ||
      !selectedFile ||
      !isFFmpegLoaded ||
      probedFileName === selectedFile.name
    ) return;
    const probe = async () => {
      try {
        console.log("[App] Probing file for metadata:", selectedFile.name);
        await ffmpeg.probeFile(selectedFile);
        setProbedFileName(selectedFile.name);
        console.log("[App] File metadata extracted");
      } catch (error) {
        console.error("[App] Failed to probe file:", error);
      }
    };
    probe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, selectedFile, isFFmpegLoaded, probedFileName]);

  // Reset probe tracking when returning to IDLE
  useEffect(() => {
    if (state === "IDLE") setProbedFileName(null);
  }, [state]);
}
