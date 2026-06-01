import confidenceExtractor, { analyzeConfidence } from '@/utils/whisperMetadataExtractor/extractors/confidenceExtractor';
import type { ExtractorInput } from '@/utils/whisperMetadataExtractor/types';

describe('confidenceExtractor', () => {
  describe('analyzeConfidence', () => {
    test('defaults to 1.0 when no confidence data in chunks', () => {
      const result = analyzeConfidence([{ text: 'Hello', timestamp: [0, 1] }]);
      expect(result.averageConfidence).toBe(1.0);
      expect(result.lowConfidenceCount).toBe(0);
      expect(result.lowConfidenceSegments).toHaveLength(0);
    });

    test('defaults to 1.0 for empty chunks', () => {
      const result = analyzeConfidence([]);
      expect(result.averageConfidence).toBe(1.0);
      expect(result.minConfidence).toBe(1.0);
      expect(result.maxConfidence).toBe(1.0);
    });

    test('computes averages when confidence data is present', () => {
      const chunks = [
        { text: 'Good', timestamp: [0, 1] as [number, number | null], confidence: 0.9 },
        { text: 'Bad', timestamp: [1, 2] as [number, number | null], confidence: 0.5 },
      ] as any;
      const result = analyzeConfidence(chunks);
      expect(result.averageConfidence).toBeCloseTo(0.7);
      expect(result.minConfidence).toBe(0.5);
      expect(result.maxConfidence).toBe(0.9);
      expect(result.lowConfidenceCount).toBe(1);
    });
  });

  describe('MetadataExtractor impl', () => {
    test('extract returns confidence field', () => {
      const input: ExtractorInput = {
        text: '',
        chunks: [],
        totalWords: 0,
        duration: 0,
      };
      const result = confidenceExtractor.extract(input);
      expect(result.confidence).toBeDefined();
      expect(result.confidence!.averageConfidence).toBe(1.0);
    });

    test('id is "confidence"', () => {
      expect(confidenceExtractor.id).toBe('confidence');
    });
  });
});
