import type React from "react";
import type { AppState } from "@/hooks/useAppStateMachine";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import type { ModelKey } from "@/components/ModelSelector";
import type { ActionType, ActionOptions, CompressionType } from "@/components/ActionSelector";
import type { TranscriptionMode } from "@/types/fast-mode";

export interface LargeFileBannerBag {
  dismissed: boolean;
  isLargeFile: boolean;
  dismiss: () => void;
}

/** All page-level values passed to state-view renderers. */
export interface ForgePageBag {
  // State machine
  selectedFile: File | null;
  selectedFormatId: string | null;
  result: ProcessingResult | null;
  error: string | null;

  // Processor
  isFFmpegLoaded: boolean;
  isFFmpegLoading: boolean;
  isModelLoading: boolean;
  isModelLoaded: boolean;
  isTranscribing: boolean;
  transcriptionProgress: number;
  currentModel: string | null;
  ffmpegMetrics: unknown;
  memoryUsageMB: number;

  // Model / mode
  selectedModelKey: ModelKey;
  transcriptionMode: TranscriptionMode;
  fastModeEnabled: boolean;

  // Timing
  processingStartTime: number | null;
  processingEndTime: number | null;

  // Callbacks
  onFileSelect: (file: File | null) => void;
  onAction: (action: ActionType, formatId: string, options?: ActionOptions) => Promise<void>;
  onDownload: () => void;
  onReset: () => Promise<void>;
  onModelSelect: (modelKey: ModelKey) => void;
  onTranscribeFromDone: (
    compressionType: CompressionType,
    normalizeAudio: boolean,
    modelKey: ModelKey,
    segmentFile?: File
  ) => Promise<void>;
  onWorkerConfigChange: (config: {
    workers: number;
    useGPU: boolean;
    memoryBudgetMB: number;
    devicePreference: import("@/types/fast-mode").DevicePreference;
  }) => void;
  onModeChange: (mode: TranscriptionMode) => void;
  onRetry: () => void;

  // Hardware / large-file banner
  hardware: unknown;
  largeFileBanner: LargeFileBannerBag;
}

export interface StateViewStrategy {
  state: AppState;
  render(bag: ForgePageBag): React.ReactNode;
}
