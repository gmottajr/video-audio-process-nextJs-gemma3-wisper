import type { VideoMode } from "@/components/VideoModeTabs";
import type { TranscriptionMode, DevicePreference } from "@/types/fast-mode";
import type { DetectedCaps, FileKind } from "../types";

export function resolveUseGpu(
  devicePreference: DevicePreference,
  caps: DetectedCaps | null
): boolean {
  return devicePreference === "gpu" || (devicePreference === "auto" && !!caps?.gpu);
}

export function resolveMemoryBudgetMB(workerCount: number, useGPU: boolean): number {
  const memoryPerWorkerMB = useGPU ? 300 : 600;
  return workerCount * memoryPerWorkerMB + 1000;
}

export function resolveCtaLabel(
  actionTile: VideoMode,
  transcriptionMode: TranscriptionMode,
  kind: FileKind
): string {
  if (actionTile === "transcribe") {
    return transcriptionMode === "fast"
      ? "Start transcription · Fast Mode"
      : "Start transcription";
  }
  if (actionTile === "extract") return "Extract audio";
  return kind === "audio" ? "Convert format" : "Convert video";
}
