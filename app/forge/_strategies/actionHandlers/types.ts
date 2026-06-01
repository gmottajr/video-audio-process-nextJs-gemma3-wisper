import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import type { ActionOptions, ActionType, CompressionType } from "@/components/ActionSelector";
import type { ModelKey } from "@/components/ModelSelector";
import type {
  FastTranscriberApi,
  FFmpegApi,
} from "../../_services/transcriptionDispatcher";

export interface ActionHandlerContext {
  file: File;
  formatId: string;
  options?: ActionOptions;
  transcriptionMode: string;
  selectedModelKey: ModelKey;
  fastModeEnabled: boolean;
  processFile: (
    file: File,
    action: ActionType,
    formatId: string,
    options?: {
      resolutionId?: string;
      modelKey?: ModelKey;
      testMode?: boolean;
      normalizeAudio?: boolean;
      compressionType?: CompressionType;
    }
  ) => Promise<ProcessingResult>;
  completeProcessing: (result: ProcessingResult) => void;
  fastTranscriber: FastTranscriberApi;
  ffmpeg: FFmpegApi;
}

export interface ActionHandler {
  id: ActionType;
  handle(ctx: ActionHandlerContext): Promise<void>;
}
