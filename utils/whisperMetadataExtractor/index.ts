import type { TranscriptionResult } from '@/contexts/TranscriberContext';
import type { WhisperMetadata } from '@/types/whisper-metadata';
import { countWords, estimateDuration } from './shared/wordUtils';
import { extractAllMetadata } from './registry';

export function extractWhisperMetadata(
  result: TranscriptionResult,
  audioDuration?: number
): WhisperMetadata {
  const text = result.text;
  const chunks = result.chunks || [];
  const totalWords = countWords(text);
  const totalCharacters = text.length;
  const duration = audioDuration || estimateDuration(chunks);

  const domainFields = extractAllMetadata({ text, chunks, totalWords, duration });

  return {
    duration,
    totalWords,
    totalCharacters,
    language: 'en',
    ...domainFields,
    segments: chunks.map((chunk, index) => ({
      index,
      start: chunk.timestamp[0],
      end: chunk.timestamp[1] ?? duration,
      text: chunk.text,
      confidence: undefined,
      speaker: undefined,
    })),
  } as WhisperMetadata;
}
