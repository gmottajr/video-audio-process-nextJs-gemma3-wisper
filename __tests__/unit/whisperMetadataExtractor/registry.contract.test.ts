import { registry, extractAllMetadata } from '@/utils/whisperMetadataExtractor/registry';
import type { ExtractorInput } from '@/utils/whisperMetadataExtractor/types';

const EXPECTED_IDS = [
  'filler',
  'content-type',
  'speaking-rate',
  'confidence',
  'temporal',
  'keyword',
  'sentence',
  'speaker',
];

describe('whisperMetadataExtractor registry contract', () => {
  test('contains exactly the expected extractor ids', () => {
    const ids = registry.map(e => e.id);
    expect(ids).toEqual(EXPECTED_IDS);
  });

  test('has no duplicate ids', () => {
    const ids = registry.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every extractor implements the MetadataExtractor interface', () => {
    for (const extractor of registry) {
      expect(typeof extractor.id).toBe('string');
      expect(typeof extractor.extract).toBe('function');
    }
  });

  test('extractAllMetadata returns merged partial WhisperMetadata', () => {
    const input: ExtractorInput = {
      text: 'Hello world. This is a test sentence.',
      chunks: [{ text: 'Hello world.', timestamp: [0, 2] }],
      totalWords: 7,
      duration: 5,
    };

    const result = extractAllMetadata(input);

    expect(result.fillerDensity).toBeDefined();
    expect(result.contentType).toBeDefined();
    expect(result.speakingRate).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.temporal).toBeDefined();
    expect(result.keywords).toBeDefined();
    expect(result.estimatedSentenceCount).toBeDefined();
  });

  test('extractAllMetadata keys do not overlap across extractors', () => {
    const input: ExtractorInput = {
      text: 'Test text',
      chunks: [],
      totalWords: 2,
      duration: 1,
    };

    const individualResults = registry.map(e => Object.keys(e.extract(input)));
    const allKeys = individualResults.flat();
    const definedKeys = allKeys.filter(k => {
      const results = registry.map(e => e.extract(input));
      return results.some(r => (r as any)[k] !== undefined);
    });

    // Each key should appear only once across all extractors
    const duplicates = allKeys.filter((k, i) => allKeys.indexOf(k) !== i);
    expect(duplicates).toHaveLength(0);
  });
});
