/**
 * Text Statistics Utilities
 * 
 * Provides word counting, sentence counting, and text analysis
 * for the tabbed transcription view.
 */

/**
 * Count words in text
 * Uses simple whitespace splitting with filtering
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count sentences in text
 * Splits on sentence-ending punctuation with smart handling
 */
export function countSentences(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  // Match sentence-ending punctuation
  // Handle abbreviations and numbers (e.g., "Dr.", "3.5")
  const sentences = text
    .replace(/([.!?])\s*(?=[A-Z])/g, '$1|')  // Add marker after sentence enders followed by capital
    .split('|')
    .filter(s => s.trim().length > 0);
  
  return Math.max(1, sentences.length);
}

/**
 * Calculate average words per sentence
 */
export function avgWordsPerSentence(text: string): number {
  const words = countWords(text);
  const sentences = countSentences(text);
  if (sentences === 0) return 0;
  return Math.round((words / sentences) * 10) / 10;
}

/**
 * Estimate reading time in minutes
 * Assumes average reading speed of 200 words per minute
 */
export function estimateReadingTime(text: string): number {
  const words = countWords(text);
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Calculate character count (with and without spaces)
 */
export function characterCount(text: string): { total: number; noSpaces: number } {
  if (!text || typeof text !== 'string') {
    return { total: 0, noSpaces: 0 };
  }
  return {
    total: text.length,
    noSpaces: text.replace(/\s/g, '').length,
  };
}

/**
 * Format number with commas (e.g., 1234 -> "1,234")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format duration in human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Text statistics summary
 */
export interface TextStatistics {
  wordCount: number;
  sentenceCount: number;
  characterCount: number;
  avgWordsPerSentence: number;
  readingTimeMinutes: number;
}

/**
 * Get comprehensive text statistics
 */
export function getTextStatistics(text: string): TextStatistics {
  return {
    wordCount: countWords(text),
    sentenceCount: countSentences(text),
    characterCount: text?.length || 0,
    avgWordsPerSentence: avgWordsPerSentence(text),
    readingTimeMinutes: estimateReadingTime(text),
  };
}

/**
 * Compare two texts and return change statistics
 */
export function compareTexts(original: string, enhanced: string): {
  originalStats: TextStatistics;
  enhancedStats: TextStatistics;
  wordDelta: number;
  sentenceDelta: number;
  charDelta: number;
  compressionPercent: number;
} {
  const originalStats = getTextStatistics(original);
  const enhancedStats = getTextStatistics(enhanced);
  
  const charDelta = enhancedStats.characterCount - originalStats.characterCount;
  const compressionPercent = originalStats.characterCount > 0
    ? Math.round((1 - enhancedStats.characterCount / originalStats.characterCount) * 100)
    : 0;
  
  return {
    originalStats,
    enhancedStats,
    wordDelta: enhancedStats.wordCount - originalStats.wordCount,
    sentenceDelta: enhancedStats.sentenceCount - originalStats.sentenceCount,
    charDelta,
    compressionPercent,
  };
}

