import { countWords } from '../shared/wordUtils';
import type { ExtractorInput, MetadataExtractor } from '../types';

export function analyzeSentences(text: string): {
  count: number;
  avgWords: number;
  variation: 'varied' | 'consistent';
} {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const count = sentences.length;

  if (count === 0) {
    return { count: 0, avgWords: 0, variation: 'consistent' };
  }

  const sentenceLengths = sentences.map(s => countWords(s));
  const total = sentenceLengths.reduce((sum, len) => sum + len, 0);
  const avgWords = total / count;

  const variance = sentenceLengths.reduce(
    (sum, len) => sum + Math.pow(len - avgWords, 2),
    0
  ) / count;
  const stdDev = Math.sqrt(variance);

  const variation = stdDev > avgWords * 0.5 ? 'varied' : 'consistent';

  return { count, avgWords, variation };
}

const sentenceExtractor: MetadataExtractor = {
  id: 'sentence',
  extract({ text }: ExtractorInput) {
    const result = analyzeSentences(text);
    return {
      estimatedSentenceCount: result.count,
      averageWordsPerSentence: result.avgWords,
      sentenceLengthVariation: result.variation,
    };
  },
};

export default sentenceExtractor;
