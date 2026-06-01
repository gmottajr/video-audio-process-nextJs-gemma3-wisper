import type {
  FillerDensity,
  FillerWordInstance,
} from '@/types/whisper-metadata';
import { FILLER_PATTERNS } from '@/types/whisper-metadata';
import type { ExtractorInput, MetadataExtractor } from '../types';

export function analyzeFillerWords(text: string, totalWords: number): {
  count: number;
  percentage: number;
  density: FillerDensity;
  byType: Record<keyof typeof FILLER_PATTERNS, number>;
  instances: FillerWordInstance[];
} {
  const lowerText = text.toLowerCase();
  const instances: FillerWordInstance[] = [];
  const byType: Record<keyof typeof FILLER_PATTERNS, number> = {
    basic: 0,
    discourse: 0,
    hedging: 0,
    starters: 0,
    repetition: 0,
  };

  for (const [category, patterns] of Object.entries(FILLER_PATTERNS)) {
    for (const pattern of patterns) {
      const escapedPattern = pattern.replace(/\s+/g, '\\s+');
      const regex = new RegExp(`\\b${escapedPattern}\\b`, 'gi');
      let match;

      while ((match = regex.exec(lowerText)) !== null) {
        instances.push({
          word: pattern,
          category: category as keyof typeof FILLER_PATTERNS,
          position: match.index,
        });
        byType[category as keyof typeof FILLER_PATTERNS]++;
      }
    }
  }

  const count = instances.length;
  const percentage = totalWords > 0 ? (count / totalWords) * 100 : 0;

  let density: FillerDensity;
  if (percentage > 8) density = 'very_high';
  else if (percentage > 5) density = 'high';
  else if (percentage > 2) density = 'moderate';
  else if (percentage > 1) density = 'low';
  else density = 'very_low';

  return { count, percentage, density, byType, instances };
}

const fillerExtractor: MetadataExtractor = {
  id: 'filler',
  extract({ text, totalWords }: ExtractorInput) {
    const analysis = analyzeFillerWords(text, totalWords);
    return {
      fillerDensity: analysis.density,
      fillerWordCount: analysis.count,
      fillerWordPercentage: analysis.percentage,
      fillerWordsByType: analysis.byType,
      fillerWordInstances: analysis.instances,
    };
  },
};

export default fillerExtractor;
