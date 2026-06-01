import speakingRateExtractor, { analyzeSpeakingRate } from '@/utils/whisperMetadataExtractor/extractors/speakingRateExtractor';
import type { ExtractorInput } from '@/utils/whisperMetadataExtractor/types';

describe('speakingRateExtractor', () => {
  describe('analyzeSpeakingRate', () => {
    test('categorizes very_fast at 180+ WPM', () => {
      const result = analyzeSpeakingRate(200, 60);
      expect(result.category).toBe('very_fast');
      expect(result.simplifiedCategory).toBe('fast');
      expect(result.wpm).toBeCloseTo(200);
    });

    test('categorizes fast at 150-180 WPM', () => {
      expect(analyzeSpeakingRate(160, 60).category).toBe('fast');
    });

    test('categorizes normal at 120-150 WPM', () => {
      const result = analyzeSpeakingRate(135, 60);
      expect(result.category).toBe('normal');
      expect(result.simplifiedCategory).toBe('normal');
    });

    test('categorizes slow at 90-120 WPM', () => {
      expect(analyzeSpeakingRate(100, 60).category).toBe('slow');
    });

    test('categorizes very_slow below 90 WPM', () => {
      const result = analyzeSpeakingRate(80, 60);
      expect(result.category).toBe('very_slow');
      expect(result.simplifiedCategory).toBe('slow');
    });

    test('returns wpm 0 when duration is 0', () => {
      expect(analyzeSpeakingRate(100, 0).wpm).toBe(0);
    });

    test('returns wpm 0 when totalWords is 0', () => {
      expect(analyzeSpeakingRate(0, 60).wpm).toBe(0);
    });
  });

  describe('MetadataExtractor impl', () => {
    test('extract returns speaking rate fields', () => {
      const input: ExtractorInput = {
        text: '',
        chunks: [],
        totalWords: 135,
        duration: 60,
      };
      const result = speakingRateExtractor.extract(input);
      expect(result.speakingRate).toBe('normal');
      expect(result.wordsPerMinute).toBeCloseTo(135);
      expect(result.speakingRateCategory).toBe('normal');
    });

    test('id is "speaking-rate"', () => {
      expect(speakingRateExtractor.id).toBe('speaking-rate');
    });
  });
});
