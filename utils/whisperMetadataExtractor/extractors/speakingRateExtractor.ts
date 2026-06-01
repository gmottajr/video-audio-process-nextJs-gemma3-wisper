import type { SpeakingRate } from '@/types/whisper-metadata';
import type { ExtractorInput, MetadataExtractor } from '../types';

export function analyzeSpeakingRate(totalWords: number, duration: number): {
  wpm: number;
  category: SpeakingRate;
  simplifiedCategory: 'fast' | 'normal' | 'slow';
} {
  const wpm = duration > 0 ? (totalWords / duration) * 60 : 0;

  let category: SpeakingRate;
  let simplifiedCategory: 'fast' | 'normal' | 'slow';

  if (wpm >= 180) {
    category = 'very_fast';
    simplifiedCategory = 'fast';
  } else if (wpm >= 150) {
    category = 'fast';
    simplifiedCategory = 'fast';
  } else if (wpm >= 120) {
    category = 'normal';
    simplifiedCategory = 'normal';
  } else if (wpm >= 90) {
    category = 'slow';
    simplifiedCategory = 'slow';
  } else {
    category = 'very_slow';
    simplifiedCategory = 'slow';
  }

  return { wpm, category, simplifiedCategory };
}

const speakingRateExtractor: MetadataExtractor = {
  id: 'speaking-rate',
  extract({ totalWords, duration }: ExtractorInput) {
    const result = analyzeSpeakingRate(totalWords, duration);
    return {
      speakingRate: result.category,
      wordsPerMinute: result.wpm,
      speakingRateCategory: result.simplifiedCategory,
    };
  },
};

export default speakingRateExtractor;
