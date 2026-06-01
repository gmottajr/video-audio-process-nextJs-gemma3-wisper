import contentTypeExtractor, { detectContentType } from '@/utils/whisperMetadataExtractor/extractors/contentTypeExtractor';
import type { ExtractorInput } from '@/utils/whisperMetadataExtractor/types';

describe('contentTypeExtractor', () => {
  describe('detectContentType', () => {
    test('detects business content', () => {
      const result = detectContentType(
        'We need to discuss the quarterly revenue, client budget, and sales strategy for the meeting.',
        { density: 'low' }
      );
      expect(result.type).toBe('business');
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    test('detects technical content', () => {
      const result = detectContentType(
        'The API endpoint needs debugging. Check the server code, database connection, and error handling.',
        { density: 'low' }
      );
      expect(result.type).toBe('technical');
    });

    test('detects casual content via high filler density', () => {
      const result = detectContentType(
        'Hey dude, gonna hang out later? It would be cool and awesome to chill.',
        { density: 'very_high' }
      );
      expect(result.type).toBe('casual');
    });

    test('detects lecture content', () => {
      const result = detectContentType(
        'Today we will learn about the key concept. First, remember that this principle is important to understand.',
        { density: 'low' }
      );
      expect(result.type).toBe('lecture');
    });

    test('returns unknown for ambiguous short text', () => {
      const result = detectContentType('Hello there.', { density: 'low' });
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe('low');
    });

    test('confidence is high when score >= 10', () => {
      const result = detectContentType(
        'We have a meeting about quarterly revenue, client budget, sales forecast, stakeholder ROI, and strategy proposals.',
        { density: 'low' }
      );
      expect(result.confidence).toBe('high');
    });
  });

  describe('MetadataExtractor impl', () => {
    test('extract returns content type fields', () => {
      const input: ExtractorInput = {
        text: 'The API endpoint needs debugging. Check the server code, database connection.',
        chunks: [],
        totalWords: 13,
        duration: 5,
      };
      const result = contentTypeExtractor.extract(input);
      expect(result.contentType).toBe('technical');
      expect(result.contentTypeConfidence).toBeDefined();
      expect(result.contentTypeReasons).toBeInstanceOf(Array);
    });

    test('id is "content-type"', () => {
      expect(contentTypeExtractor.id).toBe('content-type');
    });
  });
});
