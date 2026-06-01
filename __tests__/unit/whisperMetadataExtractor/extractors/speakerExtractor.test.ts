import speakerExtractor, { analyzeSpeakers } from '@/utils/whisperMetadataExtractor/extractors/speakerExtractor';
import type { ExtractorInput } from '@/utils/whisperMetadataExtractor/types';

describe('speakerExtractor', () => {
  describe('analyzeSpeakers', () => {
    test('returns empty object when no chunks', () => {
      const result = analyzeSpeakers([]);
      expect(result).toEqual({});
    });

    test('returns empty object when no speaker data in chunks', () => {
      const result = analyzeSpeakers([
        { text: 'Hello', timestamp: [0, 1] },
      ]);
      expect(result).toEqual({});
    });

    test('identifies speakers when diarization data is present', () => {
      const chunks = [
        { text: 'Hello', timestamp: [0, 2] as [number, number | null], speaker: 'A' },
        { text: 'World', timestamp: [2, 4] as [number, number | null], speaker: 'B' },
        { text: 'Again', timestamp: [4, 6] as [number, number | null], speaker: 'A' },
      ] as any;

      const result = analyzeSpeakers(chunks);
      expect(result.count).toBe(2);
      expect(result.speakers).toHaveLength(2);
      expect(result.dominant).toBeDefined();
    });

    test('calculates dominance percentages correctly', () => {
      const chunks = [
        { text: 'One two three', timestamp: [0, 6] as [number, number | null], speaker: 'A' },
        { text: 'Four', timestamp: [6, 8] as [number, number | null], speaker: 'B' },
      ] as any;

      const result = analyzeSpeakers(chunks);
      expect(result.dominant).toBe('A');
      const speakerA = result.speakers!.find(s => s.speaker === 'A');
      expect(speakerA!.dominance).toBeGreaterThan(50);
    });
  });

  describe('MetadataExtractor impl', () => {
    test('extract returns speaker fields as undefined when no diarization', () => {
      const input: ExtractorInput = {
        text: 'Hello world',
        chunks: [{ text: 'Hello world', timestamp: [0, 2] }],
        totalWords: 2,
        duration: 2,
      };
      const result = speakerExtractor.extract(input);
      expect(result.speakerCount).toBeUndefined();
      expect(result.speakers).toBeUndefined();
      expect(result.dominantSpeaker).toBeUndefined();
    });

    test('id is "speaker"', () => {
      expect(speakerExtractor.id).toBe('speaker');
    });
  });
});
