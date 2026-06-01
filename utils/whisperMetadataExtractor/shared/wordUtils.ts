import type { TranscriptionResult } from '@/contexts/TranscriberContext';

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateDuration(chunks: TranscriptionResult['chunks']): number {
  if (!chunks || chunks.length === 0) return 0;
  const lastChunk = chunks[chunks.length - 1];
  return lastChunk.timestamp[1] ?? (lastChunk.timestamp[0] + 5);
}
