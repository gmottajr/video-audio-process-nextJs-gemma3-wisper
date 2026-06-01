import type { TranscriptionResult } from '@/contexts/TranscriberContext';
import type { WhisperMetadata } from '@/types/whisper-metadata';

export interface ExtractorInput {
  text: string;
  chunks: TranscriptionResult['chunks'];
  totalWords: number;
  duration: number;
}

export interface MetadataExtractor {
  id: string;
  extract(input: ExtractorInput): Partial<WhisperMetadata>;
}
