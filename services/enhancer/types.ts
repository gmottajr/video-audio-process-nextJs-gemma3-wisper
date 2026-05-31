import type { EnhancementResult } from '@/types/enhancement';
import type { TranscriptionResult } from '@/contexts/TranscriberContext';
import type { WhisperMetadata, EnhancementStrategy } from '@/types/whisper-metadata';

export interface ProgressExtra {
  totalMB?: number;
  downloadedMB?: number;
}

export type ProgressCallback = (
  progress: number,
  message?: string,
  extra?: ProgressExtra
) => void;

export interface LoadModelOptions {
  onProgress: ProgressCallback;
}

export interface EnhanceInput {
  transcript: string;
  whisperResult?: TranscriptionResult;
  audioDuration?: number;
}

export interface EnhanceOptions {
  onProgress: ProgressCallback;
  onMetadataExtracted?: (metadata: WhisperMetadata, strategy: EnhancementStrategy) => void;
}

export interface EnhancerEngine {
  loadModel(modelId: string, options: LoadModelOptions): Promise<void>;
  enhance(input: EnhanceInput, options: EnhanceOptions): Promise<EnhancementResult>;
  cancel(): void;
  reset(): Promise<void>;
  dispose(): void;
}
