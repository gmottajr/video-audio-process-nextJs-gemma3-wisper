import sentenceExtractor, { analyzeSentences } from '@/utils/whisperMetadataExtractor/extractors/sentenceExtractor';
import type { ExtractorInput } from '@/utils/whisperMetadataExtractor/types';

describe('sentenceExtractor', () => {
  describe('analyzeSentences', () => {
    test('counts sentences correctly', () => {
      const result = analyzeSentences('First sentence. Second sentence! Third question?');
      expect(result.count).toBe(3);
    });

    test('calculates average words per sentence', () => {
      const result = analyzeSentences('Hello world. This is test. Short.');
      expect(result.avgWords).toBeGreaterThan(0);
    });

    test('classifies varied sentence lengths', () => {
      const result = analyzeSentences(
        'Short. This is a much longer sentence with many more words in it. Tiny.'
      );
      expect(result.variation).toBe('varied');
    });

    test('classifies consistent sentence lengths', () => {
      const result = analyzeSentences(
        'Three word sentence. Another three words. More three words.'
      );
      expect(result.variation).toBe('consistent');
    });

    test('handles empty text', () => {
      const result = analyzeSentences('');
      expect(result.count).toBe(0);
      expect(result.avgWords).toBe(0);
      expect(result.variation).toBe('consistent');
    });
  });

  describe('MetadataExtractor impl', () => {
    test('extract returns sentence fields', () => {
      const input: ExtractorInput = {
        text: 'Hello world. This is a test.',
        chunks: [],
        totalWords: 6,
        duration: 3,
      };
      const result = sentenceExtractor.extract(input);
      expect(result.estimatedSentenceCount).toBe(2);
      expect(result.averageWordsPerSentence).toBeGreaterThan(0);
      expect(result.sentenceLengthVariation).toBeDefined();
    });

    test('id is "sentence"', () => {
      expect(sentenceExtractor.id).toBe('sentence');
    });
  });
});
