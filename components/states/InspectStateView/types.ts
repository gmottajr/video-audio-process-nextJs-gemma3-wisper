import type { ModelKey } from "@/components/ModelSelector";
import type { TranscriptionMode, DevicePreference } from "@/types/fast-mode";
import type { ActionType, ActionOptions } from "@/components/ActionSelector";

export interface InspectStateViewProps {
  file: File;
  metrics: any;
  selectedModelKey: ModelKey;
  currentModel: string | null;
  isModelLoading: boolean;
  isTranscribing: boolean;
  onModelSelect: (modelKey: ModelKey) => void;
  transcriptionMode: TranscriptionMode;
  onModeChange: (mode: TranscriptionMode) => void;
  onWorkerConfigChange?: (config: {
    workers: number;
    useGPU: boolean;
    memoryBudgetMB: number;
    devicePreference: DevicePreference;
  }) => void;
  onAction: (action: ActionType, formatId: string, options?: ActionOptions) => void;
  onBack: () => void;
  isFFmpegLoaded: boolean;
  isFFmpegLoading?: boolean;
  isModelLoaded: boolean;
  modelLoadingProgress: number;
  transcriptionError?: string | null;
}

export type FileKind = "video" | "audio" | "unknown";

export interface DetectedCaps {
  cpuThreads: number;
  gpu: boolean;
  gpuDevice: string | null;
  ramGB: number;
  recommendedWorkers: number;
  maxWorkers: number;
}

export const SECTION_LABEL = "font-mono text-[11px] tracking-[0.18em] uppercase";
export const MODE_STORAGE_KEY = "mediaforge_transcription_mode";
