import type { SpeakerSegment } from '@/types/whisper-metadata';
import type { TranscriptionResult } from '@/contexts/TranscriberContext';
import { countWords } from '../shared/wordUtils';
import type { ExtractorInput, MetadataExtractor } from '../types';

export function analyzeSpeakers(chunks: TranscriptionResult['chunks']): {
  count?: number;
  speakers?: SpeakerSegment[];
  dominant?: string;
} {
  if (!chunks || chunks.length === 0) return {};

  const speakerChunks = chunks.filter(c => (c as any).speaker);
  if (speakerChunks.length === 0) return {};

  const speakerSet = new Set(speakerChunks.map(c => (c as any).speaker));
  const count = speakerSet.size;
  if (count === 0) return {};

  const speakerStats = new Map<string, {
    duration: number;
    wordCount: number;
    segments: Array<{ start: number; end: number }>;
  }>();

  for (const chunk of speakerChunks) {
    const speaker = (chunk as any).speaker;
    const start = chunk.timestamp[0];
    const end = chunk.timestamp[1] ?? start;
    const duration = end - start;
    const wordCount = countWords(chunk.text);

    const existing = speakerStats.get(speaker);
    if (existing) {
      existing.duration += duration;
      existing.wordCount += wordCount;
      existing.segments.push({ start, end });
    } else {
      speakerStats.set(speaker, { duration, wordCount, segments: [{ start, end }] });
    }
  }

  const totalDuration = Array.from(speakerStats.values())
    .reduce((sum, s) => sum + s.duration, 0);

  const speakers: SpeakerSegment[] = Array.from(speakerStats.entries())
    .map(([speaker, stats]) => ({
      speaker,
      start: Math.min(...stats.segments.map(s => s.start)),
      end: Math.max(...stats.segments.map(s => s.end)),
      duration: stats.duration,
      wordCount: stats.wordCount,
      dominance: totalDuration > 0 ? (stats.duration / totalDuration) * 100 : 0,
    }));

  const dominant = speakers.sort((a, b) => b.dominance - a.dominance)[0]?.speaker;

  return { count, speakers, dominant };
}

const speakerExtractor: MetadataExtractor = {
  id: 'speaker',
  extract({ chunks }: ExtractorInput) {
    const result = analyzeSpeakers(chunks);
    return {
      speakerCount: result.count,
      speakers: result.speakers,
      dominantSpeaker: result.dominant,
    };
  },
};

export default speakerExtractor;
