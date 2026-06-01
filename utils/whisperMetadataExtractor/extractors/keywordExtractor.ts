import type { KeywordAnalysis } from '@/types/whisper-metadata';
import type { ExtractorInput, MetadataExtractor } from '../types';

export function extractKeywords(text: string, totalWords: number): KeywordAnalysis {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);

  const stopWords = new Set([
    'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
    'were', 'will', 'would', 'could', 'should', 'about', 'which', 'their',
    'there', 'where', 'when', 'what', 'who', 'how', 'why', 'also',
    'just', 'only', 'more', 'some', 'very', 'than', 'then', 'into',
    'over', 'after', 'before', 'being', 'each', 'most', 'such', 'through',
  ]);

  const wordCounts = new Map<string, number>();
  for (const word of words) {
    if (!stopWords.has(word)) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }

  const topKeywords = Array.from(wordCounts.entries())
    .map(([word, count]) => ({
      word,
      count,
      frequency: (count / totalWords) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const acronyms = Array.from(text.matchAll(/\b[A-Z]{2,}\b/g)).map(m => m[0]);
  const uniqueAcronyms = Array.from(new Set(acronyms));

  const properNouns = Array.from(
    text.matchAll(/(?<![.!?]\s)[A-Z][a-z]+/g)
  ).map(m => m[0]);
  const uniqueProperNouns = Array.from(new Set(properNouns)).slice(0, 20);

  const technicalDictionary = new Set([
    'api', 'sdk', 'framework', 'database', 'server', 'client', 'backend',
    'frontend', 'middleware', 'endpoint', 'authentication', 'authorization',
    'encryption', 'algorithm', 'interface', 'implementation', 'repository',
    'deployment', 'infrastructure', 'container', 'microservice', 'webhook',
  ]);

  const technicalTerms = words.filter(w => technicalDictionary.has(w));
  const uniqueTechnicalTerms = Array.from(new Set(technicalTerms));

  return {
    topKeywords,
    technicalTerms: uniqueTechnicalTerms,
    properNouns: uniqueProperNouns,
    acronyms: uniqueAcronyms,
  };
}

const keywordExtractor: MetadataExtractor = {
  id: 'keyword',
  extract({ text, totalWords }: ExtractorInput) {
    return { keywords: extractKeywords(text, totalWords) };
  },
};

export default keywordExtractor;
