import keywordExtractor, { extractKeywords } from '@/utils/whisperMetadataExtractor/extractors/keywordExtractor';
import type { ExtractorInput } from '@/utils/whisperMetadataExtractor/types';

describe('keywordExtractor', () => {
  describe('extractKeywords', () => {
    test('extracts top keywords by frequency', () => {
      const result = extractKeywords(
        'The meeting was about revenue. Revenue is important. The company revenue grew.',
        10
      );
      expect(result.topKeywords.length).toBeGreaterThan(0);
      const rev = result.topKeywords.find(k => k.word === 'revenue');
      expect(rev).toBeDefined();
      expect(rev!.count).toBe(3);
    });

    test('detects acronyms', () => {
      const result = extractKeywords(
        'The API and SDK are important. Also check the ROI and KPI metrics.',
        10
      );
      expect(result.acronyms).toContain('API');
      expect(result.acronyms).toContain('SDK');
      expect(result.acronyms).toContain('ROI');
    });

    test('detects proper nouns', () => {
      const result = extractKeywords(
        'John spoke with Microsoft about the project. Sarah joined the call.',
        10
      );
      expect(result.properNouns.length).toBeGreaterThan(0);
    });

    test('detects technical terms', () => {
      const result = extractKeywords(
        'We use the api and database and server in the backend deployment.',
        10
      );
      expect(result.technicalTerms.length).toBeGreaterThan(0);
    });

    test('returns empty arrays for empty text', () => {
      const result = extractKeywords('', 0);
      expect(result.topKeywords).toHaveLength(0);
      expect(result.acronyms).toHaveLength(0);
    });
  });

  describe('MetadataExtractor impl', () => {
    test('extract returns keywords field', () => {
      const input: ExtractorInput = {
        text: 'The API endpoint needs work. The database and server need checking.',
        chunks: [],
        totalWords: 12,
        duration: 5,
      };
      const result = keywordExtractor.extract(input);
      expect(result.keywords).toBeDefined();
      expect(result.keywords!.topKeywords).toBeInstanceOf(Array);
      expect(result.keywords!.acronyms).toContain('API');
    });

    test('id is "keyword"', () => {
      expect(keywordExtractor.id).toBe('keyword');
    });
  });
});
