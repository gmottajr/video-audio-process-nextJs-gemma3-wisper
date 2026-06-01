import fillerExtractor, { analyzeFillerWords } from '@/utils/whisperMetadataExtractor/extractors/fillerExtractor';
import type { ExtractorInput } from '@/utils/whisperMetadataExtractor/types';

describe('fillerExtractor', () => {
  describe('analyzeFillerWords', () => {
    test('detects basic filler words', () => {
      const result = analyzeFillerWords('Um uh er yeah', 4);
      expect(result.count).toBeGreaterThan(0);
      expect(result.byType.basic).toBeGreaterThan(0);
    });

    test('classifies very_high density above 8%', () => {
      const result = analyzeFillerWords('Um um uh um like um', 6);
      expect(result.density).toBe('very_high');
    });

    test('classifies very_low density below 1%', () => {
      const result = analyzeFillerWords(
        'This is a perfectly normal sentence without any filler words at all',
        13
      );
      expect(result.density).toBe('very_low');
    });

    test('tracks instance positions', () => {
      const result = analyzeFillerWords('Hello um world', 3);
      expect(result.instances.length).toBeGreaterThan(0);
      expect(result.instances[0].position).toBeGreaterThanOrEqual(0);
      expect(result.instances[0].category).toBeDefined();
    });

    test('returns zero count on empty text', () => {
      const result = analyzeFillerWords('', 0);
      expect(result.count).toBe(0);
      expect(result.density).toBe('very_low');
    });
  });

  describe('MetadataExtractor impl', () => {
    test('extract returns filler metadata fields', () => {
      const input: ExtractorInput = {
        text: 'Um so like basically you know',
        chunks: [],
        totalWords: 5,
        duration: 3,
      };
      const result = fillerExtractor.extract(input);
      expect(result.fillerDensity).toBeDefined();
      expect(result.fillerWordCount).toBeGreaterThan(0);
      expect(result.fillerWordPercentage).toBeGreaterThan(0);
      expect(result.fillerWordsByType).toBeDefined();
      expect(result.fillerWordInstances).toBeInstanceOf(Array);
    });

    test('id is "filler"', () => {
      expect(fillerExtractor.id).toBe('filler');
    });
  });
});
