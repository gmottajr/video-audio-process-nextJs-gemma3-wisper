import type { TranscriptionResult } from '@/contexts/TranscriberContext';
import type { WhisperMetadata, EnhancementStrategy } from '@/types/whisper-metadata';

export interface PromptSelectionContext {
  useContextAware: boolean;
  whisperResult?: TranscriptionResult;
  audioDuration?: number;
}

export interface PromptBuildResult {
  promptText: string | null;
  metadata: WhisperMetadata | null;
  enhancementStrategy: EnhancementStrategy | null;
}

export interface PromptStrategy {
  id: string;
  isApplicable(ctx: PromptSelectionContext): boolean;
  build(ctx: PromptSelectionContext): PromptBuildResult;
}
