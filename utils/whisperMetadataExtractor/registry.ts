import type { WhisperMetadata } from '@/types/whisper-metadata';
import type { ExtractorInput, MetadataExtractor } from './types';
import fillerExtractor from './extractors/fillerExtractor';
import contentTypeExtractor from './extractors/contentTypeExtractor';
import speakingRateExtractor from './extractors/speakingRateExtractor';
import confidenceExtractor from './extractors/confidenceExtractor';
import temporalExtractor from './extractors/temporalExtractor';
import keywordExtractor from './extractors/keywordExtractor';
import sentenceExtractor from './extractors/sentenceExtractor';
import speakerExtractor from './extractors/speakerExtractor';

const registry: MetadataExtractor[] = [
  fillerExtractor,
  contentTypeExtractor,
  speakingRateExtractor,
  confidenceExtractor,
  temporalExtractor,
  keywordExtractor,
  sentenceExtractor,
  speakerExtractor,
];

export function extractAllMetadata(input: ExtractorInput): Partial<WhisperMetadata> {
  return registry.reduce<Partial<WhisperMetadata>>(
    (acc, extractor) => ({ ...acc, ...extractor.extract(input) }),
    {}
  );
}

export { registry };
