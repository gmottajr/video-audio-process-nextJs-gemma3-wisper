import temporalExtractor, { analyzeTemporalPatterns } from '@/utils/whisperMetadataExtractor/extractors/temporalExtractor';
import type { ExtractorInput } from '@/utils/whisperMetadataExtractor/types';

describe('temporalExtractor', () => {
  describe('analyzeTemporalPatterns', () => {
    test('returns safe defaults for empty chunks', () => {
      const result = analyzeTemporalPatterns([], 10);
      expect(result.totalDuration).toBe(10);
      expect(result.speakingDuration).toBe(10);
      expect(result.silenceDuration).toBe(0);
      expect(result.pauseCount).toBe(0);
    });

    test('counts pauses greater than 500ms', () => {
      const chunks = [
        { text: 'First', timestamp: [0, 3] as [number, number | null] },
        { text: 'Second', timestamp: [4, 7] as [number, number | null] },  // 1s pause
        { text: 'Third', timestamp: [7.3, 10] as [number, number | null] }, // 0.3s — not counted
      ];
      const result = analyzeTemporalPatterns(chunks, 10);
      expect(result.pauseCount).toBe(1);
      expect(result.longestPause).toBeCloseTo(1);
    });

    test('calculates total silence correctly', () => {
      const chunks = [
        { text: 'A', timestamp: [0, 2] as [number, number | null] },
        { text: 'B', timestamp: [3, 5] as [number, number | null] },  // 1s pause
        { text: 'C', timestamp: [7, 9] as [number, number | null] },  // 2s pause
      ];
      const result = analyzeTemporalPatterns(chunks, 9);
      expect(result.silenceDuration).toBeCloseTo(3);
      expect(result.longestPause).toBeCloseTo(2);
    });
  });

  describe('MetadataExtractor impl', () => {
    test('extract returns temporal field', () => {
      const input: ExtractorInput = {
        text: '',
        chunks: [{ text: 'hello', timestamp: [0, 2] }],
        totalWords: 1,
        duration: 5,
      };
      const result = temporalExtractor.extract(input);
      expect(result.temporal).toBeDefined();
      expect(result.temporal!.totalDuration).toBe(5);
    });

    test('id is "temporal"', () => {
      expect(temporalExtractor.id).toBe('temporal');
    });
  });
});
