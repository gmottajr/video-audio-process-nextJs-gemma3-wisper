import type React from "react";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import type { CompressionType } from "@/components/ActionSelector";
import type { ModelKey } from "@/components/ModelSelector";
import type { WaveformSelection } from "@/components/WaveformViewer";

export interface DoneStateViewProps {
  result: ProcessingResult;
  file: File;
  formatId: string | null;
  selectedModelKey: ModelKey;
  currentModel: string | null;
  metrics: any;
  memoryUsageMB: number;
  onDownload: () => void;
  onReset: () => void;
  isModelLoaded?: boolean;
  isModelLoading?: boolean;
  modelLoadingProgress?: number;
  onModelSelect?: (modelKey: ModelKey) => void;
  onTranscribe?: (compressionType: CompressionType, normalizeAudio: boolean, modelKey: ModelKey, segmentFile?: File) => void;
  processingStartTime?: number | null;
  processingEndTime?: number | null;
}

export interface DoneActionContext {
  result: ProcessingResult;
  file: File;
  format: { name: string } | null;
  onDownload: () => void;
  onReset: () => void;
  onTranscribe?: DoneStateViewProps["onTranscribe"];
  showStats: boolean;
  setShowStats: (v: boolean) => void;
  waveformSelection: WaveformSelection | null;
}

export interface DoneActionStrategy {
  id: string;
  label: (ctx: DoneActionContext) => string;
  icon: React.ComponentType<{ className?: string }>;
  isEnabled: (ctx: DoneActionContext) => boolean;
  onInvoke: (ctx: DoneActionContext) => void;
  style: "primary" | "secondary" | "accent";
}
