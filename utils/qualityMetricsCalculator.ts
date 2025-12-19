/**
 * Quality Metrics Calculator
 * 
 * Calculates comprehensive quality metrics comparing original vs enhanced transcripts.
 * Includes industry-standard readability formulas, sentiment analysis, and quality scoring.
 * 
 * @module utils/qualityMetricsCalculator
 */

import type {
  ReadabilityScore,
  ReadabilityDifficulty,
  ReadabilityAssessment,
  EnhancementQualityMetrics,
  QualityScoreBreakdown,
  Sentiment,
} from '@/types/quality-metrics';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Words that indicate positive sentiment
 */
const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'happy', 'success', 'successful', 'successfully',
  'achieved', 'achievement', 'growth', 'grew', 'improved', 'improvement', 'better',
  'best', 'wonderful', 'fantastic', 'pleased', 'pleased', 'satisfied', 'satisfaction',
  'excited', 'exciting', 'optimistic', 'positive', 'outstanding', 'impressive',
  'strong', 'stronger', 'effective', 'efficient', 'profit', 'profitable', 'gain',
  'gains', 'win', 'won', 'winning', 'benefit', 'beneficial', 'advantage', 'progress',
  'progressing', 'thriving', 'flourishing', 'exceeding', 'exceeded', 'remarkable',
  'exceptional', 'superior', 'perfect', 'ideal', 'love', 'loved', 'amazing',
]);

/**
 * Words that indicate negative sentiment
 */
const NEGATIVE_WORDS = new Set([
  'bad', 'poor', 'terrible', 'failed', 'failure', 'problem', 'problems', 'issue',
  'issues', 'declined', 'decline', 'worse', 'worst', 'difficult', 'difficulty',
  'concerned', 'concern', 'worried', 'worry', 'disappointed', 'disappointing',
  'frustrating', 'frustrated', 'challenging', 'challenge', 'unfortunate', 'weak',
  'weaker', 'ineffective', 'inefficient', 'struggling', 'struggle', 'crisis',
  'loss', 'losses', 'losing', 'lost', 'risk', 'risky', 'danger', 'dangerous',
  'threat', 'threatening', 'negative', '害', 'drop', 'dropped', 'dropping',
  'decrease', 'decreased', 'decreasing', 'deficit', 'shortage', 'lacking',
  'missing', 'error', 'errors', 'mistake', 'mistakes', 'wrong', 'fault', 'faults',
]);

/**
 * Words that negate the following sentiment
 */
const NEGATION_WORDS = new Set([
  'not', "n't", 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere',
  'hardly', 'barely', 'scarcely', 'seldom', 'rarely', 'without',
]);

/**
 * Common technical terms and patterns
 */
const TECH_PATTERNS = {
  // All caps acronyms (2+ chars)
  acronyms: /\b[A-Z]{2,}\b/g,
  // camelCase
  camelCase: /\b[a-z]+[A-Z][a-zA-Z]*\b/g,
  // PascalCase
  pascalCase: /\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b/g,
  // snake_case
  snakeCase: /\b[a-z]+_[a-z_]+\b/g,
  // Common tech keywords
  techKeywords: /\b(async|await|const|let|var|function|class|interface|type|export|import|return|null|undefined|boolean|string|number|array|object|promise|callback|api|http|https|json|xml|html|css|sql|url|uri|sdk|cdn|dns|tcp|udp|ip|ssh|ssl|tls|jwt|oauth|rest|graphql|websocket)\b/gi,
};

// ============================================================================
// SYLLABLE COUNTING
// ============================================================================

/**
 * Count syllables in a single word using improved algorithm
 * 
 * @param word - Single word to count syllables for
 * @returns Number of syllables (minimum 1)
 */
export function countSyllables(word: string): number {
  // Clean the word
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  
  // Edge cases
  if (!word || word.length === 0) return 1;
  if (word.length <= 3) return 1;
  
  // Special cases for common words that break the rules
  const specialCases: Record<string, number> = {
    'area': 3, 'idea': 3, 'real': 2, 'really': 3, 'create': 2, 'created': 3,
    'being': 2, 'business': 3, 'every': 3, 'everything': 4, 'family': 3,
    'interesting': 4, 'different': 3, 'people': 2, 'probably': 3,
    'basically': 4, 'actually': 4, 'literally': 4, 'usually': 4,
    'beautiful': 3, 'comfortable': 4, 'vegetable': 4, 'separate': 3,
    'favorite': 3, 'chocolate': 3, 'camera': 3, 'average': 3,
    'evening': 3, 'opening': 3, 'quiet': 2, 'science': 2, 'society': 4,
  };
  
  if (specialCases[word]) {
    return specialCases[word];
  }
  
  // Remove silent e at end (but not 'le' endings)
  let processed = word;
  if (processed.endsWith('e') && !processed.endsWith('le')) {
    processed = processed.slice(0, -1);
  }
  
  // Handle common suffixes that don't add syllables
  processed = processed.replace(/(?:ed|es)$/, '');
  
  // Count vowel groups
  const vowelGroups = processed.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  
  // Adjust for special endings that add syllables
  if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
    count++; // 'ble', 'tle', 'ple' etc. add a syllable
  }
  if (word.endsWith('tion') || word.endsWith('sion')) {
    count = Math.max(count, 2);
  }
  if (word.endsWith('ious') || word.endsWith('eous')) {
    count = Math.max(count, 2);
  }
  
  // Minimum 1 syllable
  return Math.max(1, count);
}

/**
 * Count total syllables in text
 * 
 * @param text - Text to count syllables in
 * @returns Total syllable count
 */
export function countTotalSyllables(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.reduce((total, word) => total + countSyllables(word), 0);
}

// ============================================================================
// TEXT ANALYSIS HELPERS
// ============================================================================

/**
 * Count words in text
 * 
 * @param text - Text to count words in
 * @returns Word count
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Count sentences in text
 * Handles edge cases like abbreviations and decimals
 * 
 * @param text - Text to count sentences in
 * @returns Sentence count (minimum 1 if text has content)
 */
export function countSentences(text: string): number {
  if (!text || !text.trim()) return 0;
  
  // Replace common abbreviations to avoid false sentence breaks
  let processed = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e)\./gi, '$1<DOT>')
    .replace(/\d+\.\d+/g, match => match.replace('.', '<DOT>')); // decimals
  
  // Count sentence-ending punctuation
  const sentences = processed.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  return Math.max(1, sentences.length);
}

/**
 * Count characters (excluding spaces optionally)
 * 
 * @param text - Text to count
 * @param includeSpaces - Whether to include spaces (default true)
 * @returns Character count
 */
export function countCharacters(text: string, includeSpaces = true): number {
  if (!text) return 0;
  return includeSpaces ? text.length : text.replace(/\s/g, '').length;
}

// ============================================================================
// READABILITY CALCULATIONS
// ============================================================================

/**
 * Calculate Flesch-Kincaid Reading Ease score
 * 
 * Formula: 206.835 - (1.015 × ASL) - (84.6 × ASW)
 * Where: ASL = Average Sentence Length, ASW = Average Syllables per Word
 * 
 * @param text - Text to analyze
 * @returns Score 0-100 (higher = easier to read)
 */
export function calculateFleschKincaidReadingEase(text: string): number {
  const words = countWords(text);
  const sentences = countSentences(text);
  const syllables = countTotalSyllables(text);
  
  if (words === 0 || sentences === 0) return 0;
  
  const asl = words / sentences; // Average Sentence Length
  const asw = syllables / words; // Average Syllables per Word
  
  const score = 206.835 - (1.015 * asl) - (84.6 * asw);
  
  // Clamp to 0-100 and round to 1 decimal
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/**
 * Calculate Flesch-Kincaid Grade Level
 * 
 * Formula: 0.39 × ASL + 11.8 × ASW - 15.59
 * 
 * @param text - Text to analyze
 * @returns US grade level (0-18+)
 */
export function calculateFleschKincaidGradeLevel(text: string): number {
  const words = countWords(text);
  const sentences = countSentences(text);
  const syllables = countTotalSyllables(text);
  
  if (words === 0 || sentences === 0) return 0;
  
  const asl = words / sentences;
  const asw = syllables / words;
  
  const grade = (0.39 * asl) + (11.8 * asw) - 15.59;
  
  return Math.round(Math.max(0, grade) * 10) / 10;
}

/**
 * Calculate SMOG Index (Simple Measure of Gobbledygook)
 * 
 * Formula: 1.0430 × √(polysyllables × 30/sentences) + 3.1291
 * Polysyllables = words with 3+ syllables
 * 
 * @param text - Text to analyze
 * @returns Years of education needed (5-18)
 */
export function calculateSmogIndex(text: string): number {
  const sentences = countSentences(text);
  if (sentences === 0) return 0;
  
  const words = text.trim().split(/\s+/).filter(Boolean);
  const polysyllables = words.filter(word => countSyllables(word) >= 3).length;
  
  const smog = 1.0430 * Math.sqrt(polysyllables * (30 / sentences)) + 3.1291;
  
  return Math.round(Math.max(0, smog) * 10) / 10;
}

/**
 * Calculate Automated Readability Index (ARI)
 * 
 * Formula: 4.71 × (characters/words) + 0.5 × (words/sentences) - 21.43
 * 
 * @param text - Text to analyze
 * @returns Grade level (1-14)
 */
export function calculateARI(text: string): number {
  const words = countWords(text);
  const sentences = countSentences(text);
  const characters = countCharacters(text, false); // exclude spaces
  
  if (words === 0 || sentences === 0) return 0;
  
  const ari = (4.71 * (characters / words)) + (0.5 * (words / sentences)) - 21.43;
  
  return Math.round(Math.max(0, ari) * 10) / 10;
}

/**
 * Calculate Coleman-Liau Index
 * 
 * Formula: 5.89 × L - 0.3 × S - 15.8
 * Where: L = avg letters per 100 words, S = avg sentences per 100 words
 * 
 * @param text - Text to analyze
 * @returns Grade level (1-16)
 */
export function calculateColemanLiauIndex(text: string): number {
  const words = countWords(text);
  const sentences = countSentences(text);
  const letters = text.replace(/[^a-zA-Z]/g, '').length;
  
  if (words === 0) return 0;
  
  const L = (letters / words) * 100;
  const S = (sentences / words) * 100;
  
  const cli = (0.0588 * L) - (0.296 * S) - 15.8;
  
  return Math.round(Math.max(0, cli) * 10) / 10;
}

/**
 * Calculate Gunning Fog Index
 * 
 * Formula: 0.4 × [(words/sentences) + 100 × (complex/words)]
 * Complex words = 3+ syllables (excluding proper nouns, compounds, common suffixes)
 * 
 * @param text - Text to analyze
 * @returns Years of education needed (6-17)
 */
export function calculateGunningFogIndex(text: string): number {
  const words = countWords(text);
  const sentences = countSentences(text);
  
  if (words === 0 || sentences === 0) return 0;
  
  const wordList = text.trim().split(/\s+/).filter(Boolean);
  
  // Count complex words (3+ syllables, excluding common suffixes)
  const complexWords = wordList.filter(word => {
    const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
    // Exclude words ending in common suffixes that don't add complexity
    if (cleaned.endsWith('ing') || cleaned.endsWith('ed') || cleaned.endsWith('es')) {
      const base = cleaned.replace(/(ing|ed|es)$/, '');
      return countSyllables(base) >= 3;
    }
    return countSyllables(cleaned) >= 3;
  }).length;
  
  const fog = 0.4 * ((words / sentences) + (100 * (complexWords / words)));
  
  return Math.round(Math.max(0, fog) * 10) / 10;
}

/**
 * Calculate all readability scores
 * 
 * @param text - Text to analyze
 * @returns Complete ReadabilityScore object
 */
export function calculateReadabilityScore(text: string): ReadabilityScore {
  return {
    fleschKincaidReadingEase: calculateFleschKincaidReadingEase(text),
    fleschKincaidGradeLevel: calculateFleschKincaidGradeLevel(text),
    smogIndex: calculateSmogIndex(text),
    automatedReadabilityIndex: calculateARI(text),
    colemanLiauIndex: calculateColemanLiauIndex(text),
    gunningFogIndex: calculateGunningFogIndex(text),
  };
}

/**
 * Get readability difficulty classification
 * 
 * @param readingEase - Flesch-Kincaid Reading Ease score
 * @returns Difficulty classification
 */
export function getReadabilityDifficulty(readingEase: number): ReadabilityDifficulty {
  if (readingEase >= 90) return 'very_easy';
  if (readingEase >= 80) return 'easy';
  if (readingEase >= 70) return 'fairly_easy';
  if (readingEase >= 60) return 'standard';
  if (readingEase >= 50) return 'fairly_hard';
  if (readingEase >= 30) return 'hard';
  return 'very_hard';
}

/**
 * Get complete readability assessment
 * 
 * @param text - Text to analyze
 * @returns Complete assessment with score, difficulty, and recommendation
 */
export function assessReadability(text: string): ReadabilityAssessment {
  const score = calculateReadabilityScore(text);
  const difficulty = getReadabilityDifficulty(score.fleschKincaidReadingEase);
  
  // Average the grade levels for more accurate assessment
  const gradeLevels = [
    score.fleschKincaidGradeLevel,
    score.smogIndex,
    score.automatedReadabilityIndex,
    score.colemanLiauIndex,
    score.gunningFogIndex,
  ].filter(g => g > 0);
  
  const averageGradeLevel = gradeLevels.length > 0
    ? Math.round((gradeLevels.reduce((a, b) => a + b, 0) / gradeLevels.length) * 10) / 10
    : 0;
  
  const recommendations: Record<ReadabilityDifficulty, string> = {
    very_easy: 'Text is very easy to read. Suitable for all audiences.',
    easy: 'Text is easy to read. Suitable for general audiences.',
    fairly_easy: 'Text is fairly easy to read. Good for most content.',
    standard: 'Text has standard readability. Appropriate for most business content.',
    fairly_hard: 'Text is somewhat difficult. Consider simplifying for broader audiences.',
    hard: 'Text is difficult. May need simplification for general audiences.',
    very_hard: 'Text is very difficult. Strongly consider simplification.',
  };
  
  return {
    score,
    difficulty,
    averageGradeLevel,
    recommendation: recommendations[difficulty],
  };
}

// ============================================================================
// SENTIMENT ANALYSIS
// ============================================================================

/**
 * Analyze sentiment of text with negation handling
 * 
 * @param text - Text to analyze
 * @returns Sentiment classification
 */
export function analyzeSentiment(text: string): Sentiment {
  const words = text.toLowerCase().split(/\s+/);
  let positiveScore = 0;
  let negativeScore = 0;
  let negationActive = false;
  let wordsSinceNegation = 0;
  
  for (const rawWord of words) {
    const word = rawWord.replace(/[^a-z']/g, '');
    if (!word) continue;
    
    // Check for negation
    if (NEGATION_WORDS.has(word) || word.endsWith("n't")) {
      negationActive = true;
      wordsSinceNegation = 0;
      continue;
    }
    
    // Apply sentiment with negation consideration
    if (POSITIVE_WORDS.has(word)) {
      if (negationActive) {
        negativeScore++;
      } else {
        positiveScore++;
      }
    } else if (NEGATIVE_WORDS.has(word)) {
      if (negationActive) {
        positiveScore++;
      } else {
        negativeScore++;
      }
    }
    
    // Reset negation after 3 words
    if (negationActive) {
      wordsSinceNegation++;
      if (wordsSinceNegation >= 3) {
        negationActive = false;
      }
    }
  }
  
  // Classify based on scores with threshold
  const threshold = 1.5;
  if (positiveScore > negativeScore * threshold && positiveScore > 0) {
    return 'positive';
  } else if (negativeScore > positiveScore * threshold && negativeScore > 0) {
    return 'negative';
  }
  return 'neutral';
}

// ============================================================================
// PRESERVATION METRICS
// ============================================================================

/**
 * Extract technical terms from text
 * 
 * @param text - Text to analyze
 * @returns Set of technical terms found
 */
export function extractTechnicalTerms(text: string): Set<string> {
  const terms = new Set<string>();
  
  // Find acronyms
  const acronyms = text.match(TECH_PATTERNS.acronyms) || [];
  acronyms.forEach(a => terms.add(a));
  
  // Find camelCase
  const camel = text.match(TECH_PATTERNS.camelCase) || [];
  camel.forEach(c => terms.add(c));
  
  // Find PascalCase
  const pascal = text.match(TECH_PATTERNS.pascalCase) || [];
  pascal.forEach(p => terms.add(p));
  
  // Find snake_case
  const snake = text.match(TECH_PATTERNS.snakeCase) || [];
  snake.forEach(s => terms.add(s));
  
  // Find tech keywords
  const keywords = text.match(TECH_PATTERNS.techKeywords) || [];
  keywords.forEach(k => terms.add(k.toUpperCase())); // Normalize to uppercase
  
  return terms;
}

/**
 * Count preserved technical terms
 * 
 * @param original - Original text
 * @param enhanced - Enhanced text
 * @returns Count of preserved terms
 */
export function countPreservedTechnicalTerms(original: string, enhanced: string): number {
  const originalTerms = extractTechnicalTerms(original);
  const enhancedTerms = extractTechnicalTerms(enhanced);
  
  let preserved = 0;
  originalTerms.forEach(term => {
    // Case-sensitive check for acronyms, case-insensitive for keywords
    if (enhancedTerms.has(term) || enhanced.toLowerCase().includes(term.toLowerCase())) {
      preserved++;
    }
  });
  
  return preserved;
}

/**
 * Extract numbers from text (normalized)
 * 
 * @param text - Text to analyze
 * @returns Set of normalized numbers
 */
export function extractNumbers(text: string): Set<string> {
  const numbers = new Set<string>();
  
  // Match various number formats
  const patterns = [
    /\$?[\d,]+\.?\d*%?/g,  // $100, 1,000, 15%, 3.14
    /\d+(?:st|nd|rd|th)/gi, // 1st, 2nd, 3rd
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(m => {
      // Normalize: remove $ , and convert to just the number
      const normalized = m.replace(/[$,%]|(?:st|nd|rd|th)/gi, '').replace(/,/g, '');
      if (normalized && !isNaN(parseFloat(normalized))) {
        numbers.add(normalized);
      }
    });
  });
  
  return numbers;
}

/**
 * Count preserved numbers
 * 
 * @param original - Original text
 * @param enhanced - Enhanced text
 * @returns Count of preserved numbers
 */
export function countPreservedNumbers(original: string, enhanced: string): number {
  const originalNumbers = extractNumbers(original);
  const enhancedNumbers = extractNumbers(enhanced);
  
  let preserved = 0;
  originalNumbers.forEach(num => {
    if (enhancedNumbers.has(num)) {
      preserved++;
    }
  });
  
  return preserved;
}

/**
 * Extract proper nouns (capitalized words not at sentence start)
 * 
 * @param text - Text to analyze
 * @returns Set of proper nouns
 */
export function extractProperNouns(text: string): Set<string> {
  const properNouns = new Set<string>();
  
  // Split into sentences and analyze each
  const sentences = text.split(/[.!?]+/);
  
  sentences.forEach(sentence => {
    const words = sentence.trim().split(/\s+/);
    // Skip first word (might be capitalized due to sentence start)
    for (let i = 1; i < words.length; i++) {
      const word = words[i].replace(/[^a-zA-Z]/g, '');
      // Capitalized word not all caps (those are acronyms)
      if (word.length > 1 && /^[A-Z][a-z]+$/.test(word)) {
        properNouns.add(word);
      }
    }
  });
  
  return properNouns;
}

/**
 * Count preserved proper nouns
 * 
 * @param original - Original text
 * @param enhanced - Enhanced text
 * @returns Count of preserved proper nouns
 */
export function countPreservedProperNouns(original: string, enhanced: string): number {
  const originalNouns = extractProperNouns(original);
  const enhancedNouns = extractProperNouns(enhanced);
  
  let preserved = 0;
  originalNouns.forEach(noun => {
    if (enhancedNouns.has(noun) || enhanced.includes(noun)) {
      preserved++;
    }
  });
  
  return preserved;
}

// ============================================================================
// QUALITY SCORE CALCULATION
// ============================================================================

/**
 * Calculate quality score breakdown
 * 
 * @param metrics - Partial metrics for calculation
 * @returns Quality score breakdown
 */
function calculateQualityBreakdown(metrics: {
  readabilityImprovement: number;
  compressionRatio: number;
  sentimentPreserved: boolean;
  technicalTermsPreserved: number;
  fillerRemovalRate: number;
  originalWordCount: number;
}): QualityScoreBreakdown {
  let baseScore = 50;
  
  // Readability improvement: -20 to +20 points
  let readabilityPoints = Math.max(-20, Math.min(20, metrics.readabilityImprovement));
  
  // Compression quality: 0 to +15 points
  // Sweet spot is 0.65-0.95 (removed 5-35% of content)
  let compressionPoints = 0;
  if (metrics.compressionRatio >= 0.65 && metrics.compressionRatio <= 0.95) {
    compressionPoints = 15;
  } else if (metrics.compressionRatio >= 0.50 && metrics.compressionRatio < 0.65) {
    compressionPoints = 10; // Aggressive but acceptable
  } else if (metrics.compressionRatio > 0.95 && metrics.compressionRatio <= 1.05) {
    compressionPoints = 5; // Minimal change
  }
  // Expansion (> 1.05) or extreme compression (< 0.50) = 0 points
  
  // Sentiment preservation: 0 to +10 points
  const sentimentPoints = metrics.sentimentPreserved ? 10 : 0;
  
  // Technical term preservation: 0 to +10 points
  let technicalPoints = 0;
  if (metrics.technicalTermsPreserved >= 3) {
    technicalPoints = 10;
  } else if (metrics.technicalTermsPreserved >= 1) {
    technicalPoints = 5;
  }
  
  // Filler removal: 0 to +10 points
  // Sweet spot is 2-15% removal rate
  let fillerPoints = 0;
  if (metrics.fillerRemovalRate >= 2 && metrics.fillerRemovalRate <= 15) {
    fillerPoints = 10;
  } else if (metrics.fillerRemovalRate > 0 && metrics.fillerRemovalRate < 2) {
    fillerPoints = 5; // Some removal
  } else if (metrics.fillerRemovalRate > 15 && metrics.fillerRemovalRate <= 25) {
    fillerPoints = 5; // Aggressive but might be needed
  }
  // > 25% removal rate suggests over-aggressive cleanup = 0 points
  
  // Penalties for concerning issues
  let penaltyPoints = 0;
  if (metrics.compressionRatio < 0.40) {
    penaltyPoints -= 10; // Lost too much content
    console.warn('[QualityMetrics] Extreme compression detected:', metrics.compressionRatio);
  }
  if (metrics.compressionRatio > 1.50) {
    penaltyPoints -= 5; // Significant expansion
    console.warn('[QualityMetrics] Significant expansion detected:', metrics.compressionRatio);
  }
  if (!metrics.sentimentPreserved) {
    penaltyPoints -= 5; // Sentiment changed
  }
  
  const totalScore = Math.max(0, Math.min(100,
    baseScore + readabilityPoints + compressionPoints + sentimentPoints + 
    technicalPoints + fillerPoints + penaltyPoints
  ));
  
  return {
    baseScore,
    readabilityPoints: Math.round(readabilityPoints * 10) / 10,
    compressionPoints,
    sentimentPoints,
    technicalPoints,
    fillerPoints,
    penaltyPoints,
    totalScore: Math.round(totalScore),
  };
}

/**
 * Calculate confidence score
 * 
 * @param metrics - Metrics for confidence calculation
 * @returns Confidence score 0-1
 */
function calculateConfidenceScore(metrics: {
  compressionRatio: number;
  sentimentPreserved: boolean;
  readabilityImprovement: number;
}): number {
  let confidence = 0.80;
  
  // Penalize extreme compression or expansion
  if (metrics.compressionRatio < 0.50 || metrics.compressionRatio > 1.30) {
    confidence -= 0.20;
  } else if (metrics.compressionRatio < 0.60 || metrics.compressionRatio > 1.15) {
    confidence -= 0.10;
  }
  
  // Penalize sentiment change
  if (!metrics.sentimentPreserved) {
    confidence -= 0.10;
  }
  
  // Penalize very large readability swings
  if (Math.abs(metrics.readabilityImprovement) > 30) {
    confidence -= 0.10;
  } else if (Math.abs(metrics.readabilityImprovement) > 20) {
    confidence -= 0.05;
  }
  
  return Math.round(Math.max(0, Math.min(1, confidence)) * 100) / 100;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Calculate comprehensive quality metrics comparing original vs enhanced transcript
 * 
 * This is the main entry point for quality measurement. Call this function after
 * enhancement completes to get objective metrics on enhancement quality.
 * 
 * @param originalText - The raw transcript before AI enhancement
 * @param enhancedText - The transcript after AI enhancement
 * @param fillerWordsRemoved - Optional count from enhancement result
 * @returns Complete EnhancementQualityMetrics object
 * 
 * @example
 * const metrics = calculateEnhancementQualityMetrics(
 *   "Um, so like, the quarterly results were good.",
 *   "The quarterly results were excellent.",
 *   4
 * );
 * console.log(metrics.qualityScore); // 85
 */
export function calculateEnhancementQualityMetrics(
  originalText: string,
  enhancedText: string,
  fillerWordsRemoved: number = 0
): EnhancementQualityMetrics {
  // Input validation
  const original = typeof originalText === 'string' ? originalText : '';
  const enhanced = typeof enhancedText === 'string' ? enhancedText : '';
  
  // Length metrics
  const originalLength = original.length;
  const enhancedLength = enhanced.length;
  const compressionRatio = originalLength > 0 
    ? Math.round((enhancedLength / originalLength) * 100) / 100 
    : 1;
  const reductionPercentage = originalLength > 0
    ? Math.round((1 - compressionRatio) * 1000) / 10
    : 0;
  
  // Word metrics
  const originalWordCount = countWords(original);
  const enhancedWordCount = countWords(enhanced);
  const wordsRemoved = Math.max(0, originalWordCount - enhancedWordCount);
  const wordsAdded = Math.max(0, enhancedWordCount - originalWordCount);
  
  // Sentence metrics
  const originalSentenceCount = countSentences(original);
  const enhancedSentenceCount = countSentences(enhanced);
  const avgSentenceLengthOriginal = originalSentenceCount > 0
    ? Math.round((originalWordCount / originalSentenceCount) * 10) / 10
    : 0;
  const avgSentenceLengthEnhanced = enhancedSentenceCount > 0
    ? Math.round((enhancedWordCount / enhancedSentenceCount) * 10) / 10
    : 0;
  
  // Readability metrics
  const readabilityBefore = calculateReadabilityScore(original);
  const readabilityAfter = calculateReadabilityScore(enhanced);
  const readabilityImprovement = Math.round(
    (readabilityAfter.fleschKincaidReadingEase - readabilityBefore.fleschKincaidReadingEase) * 10
  ) / 10;
  
  // Filler metrics
  const fillerRemovalRate = originalWordCount > 0
    ? Math.round((fillerWordsRemoved / originalWordCount) * 1000) / 10
    : 0;
  
  // Preservation metrics
  const technicalTermsPreserved = countPreservedTechnicalTerms(original, enhanced);
  const acronymsPreserved = (() => {
    const origAcronyms = (original.match(/\b[A-Z]{2,}\b/g) || []);
    const enhAcronyms = new Set(enhanced.match(/\b[A-Z]{2,}\b/g) || []);
    return origAcronyms.filter(a => enhAcronyms.has(a)).length;
  })();
  const numbersPreserved = countPreservedNumbers(original, enhanced);
  const properNounsPreserved = countPreservedProperNouns(original, enhanced);
  
  // Sentiment metrics
  const sentimentOriginal = analyzeSentiment(original);
  const sentimentEnhanced = analyzeSentiment(enhanced);
  const sentimentPreserved = sentimentOriginal === sentimentEnhanced;
  
  // Calculate quality breakdown and scores
  const qualityBreakdown = calculateQualityBreakdown({
    readabilityImprovement,
    compressionRatio,
    sentimentPreserved,
    technicalTermsPreserved,
    fillerRemovalRate,
    originalWordCount,
  });
  
  const confidenceScore = calculateConfidenceScore({
    compressionRatio,
    sentimentPreserved,
    readabilityImprovement,
  });
  
  // Warnings for edge cases
  if (qualityBreakdown.totalScore < 30) {
    console.warn('[QualityMetrics] Very low quality score:', qualityBreakdown.totalScore);
  }
  
  return {
    // Length metrics
    originalLength,
    enhancedLength,
    compressionRatio,
    reductionPercentage,
    
    // Word metrics
    originalWordCount,
    enhancedWordCount,
    wordsRemoved,
    wordsAdded,
    
    // Sentence metrics
    originalSentenceCount,
    enhancedSentenceCount,
    avgSentenceLengthOriginal,
    avgSentenceLengthEnhanced,
    
    // Readability
    readabilityBefore,
    readabilityAfter,
    readabilityImprovement,
    
    // Filler words
    fillerWordsRemoved,
    fillerRemovalRate,
    
    // Preservation
    technicalTermsPreserved,
    acronymsPreserved,
    numbersPreserved,
    properNounsPreserved,
    
    // Sentiment
    sentimentOriginal,
    sentimentEnhanced,
    sentimentPreserved,
    
    // Quality scores
    qualityScore: qualityBreakdown.totalScore,
    confidenceScore,
    qualityBreakdown,
  };
}

/**
 * Format metrics as human-readable summary
 * 
 * @param metrics - Metrics to format
 * @returns Formatted string summary
 */
export function formatMetricsSummary(metrics: EnhancementQualityMetrics): string {
  const lines = [
    'Enhancement Quality Report',
    '==========================',
    '',
    'Compression:',
    `  Original: ${metrics.originalWordCount} words (${metrics.originalLength} chars)`,
    `  Enhanced: ${metrics.enhancedWordCount} words (${metrics.enhancedLength} chars)`,
    `  Reduction: ${metrics.reductionPercentage}%`,
    '',
    'Readability:',
    `  Before: ${metrics.readabilityBefore.fleschKincaidReadingEase} (Grade ${metrics.readabilityBefore.fleschKincaidGradeLevel})`,
    `  After: ${metrics.readabilityAfter.fleschKincaidReadingEase} (Grade ${metrics.readabilityAfter.fleschKincaidGradeLevel})`,
    `  Improvement: ${metrics.readabilityImprovement > 0 ? '+' : ''}${metrics.readabilityImprovement}`,
    '',
    'Changes:',
    `  Filler words removed: ${metrics.fillerWordsRemoved}`,
    `  Words removed: ${metrics.wordsRemoved}`,
    `  Words added: ${metrics.wordsAdded}`,
    '',
    'Preservation:',
    `  Technical terms: ${metrics.technicalTermsPreserved}`,
    `  Acronyms: ${metrics.acronymsPreserved}`,
    `  Numbers: ${metrics.numbersPreserved}`,
    `  Sentiment: ${metrics.sentimentPreserved ? 'Preserved' : 'Changed'} (${metrics.sentimentOriginal} → ${metrics.sentimentEnhanced})`,
    '',
    `Overall Quality Score: ${metrics.qualityScore}/100`,
    `Confidence: ${Math.round(metrics.confidenceScore * 100)}%`,
  ];
  
  return lines.join('\n');
}

/**
 * Get a simple quality label based on score
 * 
 * @param score - Quality score 0-100
 * @returns Human-readable quality label
 */
export function getQualityLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 50) return 'Needs Review';
  return 'Poor';
}

/**
 * Get confidence label
 * 
 * @param confidence - Confidence score 0-1
 * @returns Human-readable confidence label
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.90) return 'Very Confident';
  if (confidence >= 0.70) return 'Confident';
  if (confidence >= 0.50) return 'Uncertain';
  return 'Low Confidence';
}
