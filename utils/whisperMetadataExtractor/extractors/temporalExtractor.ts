import type { TemporalAnalysis } from '@/types/whisper-metadata';
import type { TranscriptionResult } from '@/contexts/TranscriberContext';
import type { ExtractorInput, MetadataExtractor } from '../types';

export function analyzeTemporalPatterns(
  chunks: TranscriptionResult['chunks'],
  totalDuration: number
): TemporalAnalysis {
  if (!chunks || chunks.length === 0) {
    return {
      totalDuration,
      speakingDuration: totalDuration,
      silenceDuration: 0,
      averagePauseDuration: 0,
      longestPause: 0,
      pauseCount: 0,
    };
  }

  const pauses: number[] = [];
  let longestPause = 0;

  for (let i = 1; i < chunks.length; i++) {
    const prevEnd = chunks[i - 1].timestamp[1] ?? chunks[i - 1].timestamp[0];
    const currStart = chunks[i].timestamp[0];
    const pause = currStart - prevEnd;

    if (pause > 0.5) {
      pauses.push(pause);
      if (pause > longestPause) longestPause = pause;
    }
  }

  const totalSilence = pauses.reduce((sum, p) => sum + p, 0);
  const speakingDuration = totalDuration - totalSilence;
  const avgPause = pauses.length > 0
    ? (pauses.reduce((sum, p) => sum + p, 0) / pauses.length) * 1000
    : 0;

  return {
    totalDuration,
    speakingDuration,
    silenceDuration: totalSilence,
    averagePauseDuration: avgPause,
    longestPause,
    pauseCount: pauses.length,
  };
}

const temporalExtractor: MetadataExtractor = {
  id: 'temporal',
  extract({ chunks, duration }: ExtractorInput) {
    return { temporal: analyzeTemporalPatterns(chunks, duration) };
  },
};

export default temporalExtractor;
