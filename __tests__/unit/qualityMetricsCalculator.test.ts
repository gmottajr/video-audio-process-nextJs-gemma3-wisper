/**
 * Tests for Quality Metrics Calculator
 * 
 * Tests cover:
 * - Syllable counting
 * - Readability score calculations
 * - Sentiment analysis
 * - Preservation metrics
 * - Quality score calculation
 * - Edge cases and performance
 */

import {
  countSyllables,
  countTotalSyllables,
  countWords,
  countSentences,
  countCharacters,
  calculateFleschKincaidReadingEase,
  calculateFleschKincaidGradeLevel,
  calculateSmogIndex,
  calculateARI,
  calculateColemanLiauIndex,
  calculateGunningFogIndex,
  calculateReadabilityScore,
  getReadabilityDifficulty,
  assessReadability,
  analyzeSentiment,
  extractTechnicalTerms,
  countPreservedTechnicalTerms,
  extractNumbers,
  countPreservedNumbers,
  extractProperNouns,
  countPreservedProperNouns,
  calculateEnhancementQualityMetrics,
  formatMetricsSummary,
  getQualityLabel,
  getConfidenceLabel,
} from '@/utils/qualityMetricsCalculator';

// ============================================================================
// SYLLABLE COUNTING TESTS
// ============================================================================

describe('Syllable Counting', () => {
  describe('countSyllables', () => {
    test('single syllable words', () => {
      expect(countSyllables('cat')).toBe(1);
      expect(countSyllables('dog')).toBe(1);
      expect(countSyllables('I')).toBe(1);
      expect(countSyllables('a')).toBe(1);
      expect(countSyllables('the')).toBe(1);
      expect(countSyllables('through')).toBe(1);
      expect(countSyllables('thought')).toBe(1);
    });

    test('two syllable words', () => {
      expect(countSyllables('happy')).toBe(2);
      expect(countSyllables('create')).toBe(2);
      expect(countSyllables('water')).toBe(2);
      expect(countSyllables('paper')).toBe(2);
      expect(countSyllables('quiet')).toBe(2);
    });

    test('three syllable words', () => {
      expect(countSyllables('beautiful')).toBe(3);
      expect(countSyllables('important')).toBe(3);
      expect(countSyllables('different')).toBe(3);
      expect(countSyllables('company')).toBe(3);
    });

    test('four+ syllable words', () => {
      expect(countSyllables('education')).toBe(4);
      expect(countSyllables('information')).toBe(4);
      expect(countSyllables('actually')).toBe(4);
      expect(countSyllables('basically')).toBe(4);
    });

    test('edge cases', () => {
      expect(countSyllables('')).toBe(1);
      expect(countSyllables('123')).toBe(1);
      expect(countSyllables('a')).toBe(1);
      expect(countSyllables('I')).toBe(1);
    });

    test('words with punctuation', () => {
      expect(countSyllables('hello,')).toBe(2);
      expect(countSyllables('world!')).toBe(1);
      expect(countSyllables("don't")).toBe(1);
    });
  });

  describe('countTotalSyllables', () => {
    test('counts syllables in sentence', () => {
      const text = 'The cat sat on the mat';
      expect(countTotalSyllables(text)).toBe(6); // 1+1+1+1+1+1
    });

    test('handles empty string', () => {
      expect(countTotalSyllables('')).toBe(0);
    });

    test('handles multi-syllable sentence', () => {
      const text = 'Beautiful information';
      expect(countTotalSyllables(text)).toBe(7); // 3+4
    });
  });
});

// ============================================================================
// TEXT ANALYSIS HELPERS TESTS
// ============================================================================

describe('Text Analysis Helpers', () => {
  describe('countWords', () => {
    test('counts words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('One two three four five')).toBe(5);
      expect(countWords('Single')).toBe(1);
    });

    test('handles edge cases', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
      expect(countWords('  Hello  world  ')).toBe(2);
    });

    test('handles punctuation', () => {
      expect(countWords('Hello, world!')).toBe(2);
      expect(countWords('One. Two. Three.')).toBe(3);
    });
  });

  describe('countSentences', () => {
    test('counts sentences correctly', () => {
      expect(countSentences('Hello. World.')).toBe(2);
      expect(countSentences('One sentence.')).toBe(1);
      expect(countSentences('Question? Answer!')).toBe(2);
    });

    test('handles abbreviations', () => {
      expect(countSentences('Dr. Smith went home.')).toBe(1);
      expect(countSentences('I met Mr. Jones.')).toBe(1);
    });

    test('handles decimals', () => {
      expect(countSentences('The price is 3.14 dollars.')).toBe(1);
    });

    test('handles edge cases', () => {
      expect(countSentences('')).toBe(0);
      expect(countSentences('No punctuation')).toBe(1);
    });
  });

  describe('countCharacters', () => {
    test('counts with spaces', () => {
      expect(countCharacters('Hello world', true)).toBe(11);
    });

    test('counts without spaces', () => {
      expect(countCharacters('Hello world', false)).toBe(10);
    });

    test('handles empty string', () => {
      expect(countCharacters('')).toBe(0);
    });
  });
});

// ============================================================================
// READABILITY TESTS
// ============================================================================

describe('Readability Calculations', () => {
  const simpleText = 'The cat sat on the mat. The dog ran fast. It was fun.';
  const complexText = 'Notwithstanding the aforementioned considerations, the implementation of comprehensive methodological frameworks necessitates substantial deliberation.';

  describe('Flesch-Kincaid Reading Ease', () => {
    test('simple text scores high', () => {
      const score = calculateFleschKincaidReadingEase(simpleText);
      expect(score).toBeGreaterThan(70);
    });

    test('complex text scores low', () => {
      const score = calculateFleschKincaidReadingEase(complexText);
      expect(score).toBeLessThan(40);
    });

    test('handles empty text', () => {
      expect(calculateFleschKincaidReadingEase('')).toBe(0);
    });

    test('returns value in 0-100 range', () => {
      const score = calculateFleschKincaidReadingEase(simpleText);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Flesch-Kincaid Grade Level', () => {
    test('simple text has low grade level', () => {
      const grade = calculateFleschKincaidGradeLevel(simpleText);
      expect(grade).toBeLessThan(6);
    });

    test('complex text has high grade level', () => {
      const grade = calculateFleschKincaidGradeLevel(complexText);
      expect(grade).toBeGreaterThan(10);
    });

    test('handles empty text', () => {
      expect(calculateFleschKincaidGradeLevel('')).toBe(0);
    });
  });

  describe('SMOG Index', () => {
    test('calculates SMOG index', () => {
      const smog = calculateSmogIndex(simpleText);
      expect(smog).toBeGreaterThan(0);
    });

    test('handles empty text', () => {
      expect(calculateSmogIndex('')).toBe(0);
    });
  });

  describe('ARI', () => {
    test('calculates ARI', () => {
      const ari = calculateARI(simpleText);
      // ARI can be 0 or negative for very simple text
      expect(typeof ari).toBe('number');
    });

    test('handles empty text', () => {
      expect(calculateARI('')).toBe(0);
    });

    test('complex text has higher ARI', () => {
      const complexAri = calculateARI(complexText);
      const simpleAri = calculateARI(simpleText);
      expect(complexAri).toBeGreaterThan(simpleAri);
    });
  });

  describe('Coleman-Liau Index', () => {
    test('calculates Coleman-Liau', () => {
      const cli = calculateColemanLiauIndex(simpleText);
      expect(cli).toBeGreaterThanOrEqual(0);
    });

    test('handles empty text', () => {
      expect(calculateColemanLiauIndex('')).toBe(0);
    });
  });

  describe('Gunning Fog Index', () => {
    test('calculates Gunning Fog', () => {
      const fog = calculateGunningFogIndex(simpleText);
      expect(fog).toBeGreaterThan(0);
    });

    test('handles empty text', () => {
      expect(calculateGunningFogIndex('')).toBe(0);
    });
  });

  describe('calculateReadabilityScore', () => {
    test('returns all scores', () => {
      const score = calculateReadabilityScore(simpleText);
      
      expect(score).toHaveProperty('fleschKincaidReadingEase');
      expect(score).toHaveProperty('fleschKincaidGradeLevel');
      expect(score).toHaveProperty('smogIndex');
      expect(score).toHaveProperty('automatedReadabilityIndex');
      expect(score).toHaveProperty('colemanLiauIndex');
      expect(score).toHaveProperty('gunningFogIndex');
    });
  });

  describe('getReadabilityDifficulty', () => {
    test('classifies correctly', () => {
      expect(getReadabilityDifficulty(95)).toBe('very_easy');
      expect(getReadabilityDifficulty(85)).toBe('easy');
      expect(getReadabilityDifficulty(75)).toBe('fairly_easy');
      expect(getReadabilityDifficulty(65)).toBe('standard');
      expect(getReadabilityDifficulty(55)).toBe('fairly_hard');
      expect(getReadabilityDifficulty(40)).toBe('hard');
      expect(getReadabilityDifficulty(20)).toBe('very_hard');
    });
  });

  describe('assessReadability', () => {
    test('returns complete assessment', () => {
      const assessment = assessReadability(simpleText);
      
      expect(assessment).toHaveProperty('score');
      expect(assessment).toHaveProperty('difficulty');
      expect(assessment).toHaveProperty('averageGradeLevel');
      expect(assessment).toHaveProperty('recommendation');
      expect(typeof assessment.recommendation).toBe('string');
    });
  });
});

// ============================================================================
// SENTIMENT ANALYSIS TESTS
// ============================================================================

describe('Sentiment Analysis', () => {
  describe('analyzeSentiment', () => {
    test('detects positive sentiment', () => {
      expect(analyzeSentiment('This is excellent work! Great job!')).toBe('positive');
      expect(analyzeSentiment('The results were good and successful.')).toBe('positive');
      expect(analyzeSentiment('We achieved amazing growth this quarter.')).toBe('positive');
    });

    test('detects negative sentiment', () => {
      expect(analyzeSentiment('This is terrible and disappointing.')).toBe('negative');
      expect(analyzeSentiment('We failed to meet our goals. Poor results.')).toBe('negative');
      expect(analyzeSentiment('The project has serious problems and issues.')).toBe('negative');
    });

    test('detects neutral sentiment', () => {
      expect(analyzeSentiment('The meeting is at 3pm.')).toBe('neutral');
      expect(analyzeSentiment('We will discuss the report tomorrow.')).toBe('neutral');
    });

    test('handles negation correctly', () => {
      // "not good" should be negative, not positive
      expect(analyzeSentiment('This is not good at all.')).toBe('negative');
      // "not bad" should be positive, not negative
      expect(analyzeSentiment('The results were not bad.')).toBe('positive');
    });

    test('handles empty text', () => {
      expect(analyzeSentiment('')).toBe('neutral');
    });
  });
});

// ============================================================================
// PRESERVATION METRICS TESTS
// ============================================================================

describe('Preservation Metrics', () => {
  describe('extractTechnicalTerms', () => {
    test('extracts acronyms', () => {
      const terms = extractTechnicalTerms('The API returned HTTP 200 with JSON data.');
      expect(terms.has('API')).toBe(true);
      expect(terms.has('HTTP')).toBe(true);
      expect(terms.has('JSON')).toBe(true);
    });

    test('extracts camelCase', () => {
      const terms = extractTechnicalTerms('Call the getUserData function.');
      expect(terms.has('getUserData')).toBe(true);
    });

    test('extracts tech keywords', () => {
      const terms = extractTechnicalTerms('Use async await for the callback.');
      expect(terms.size).toBeGreaterThan(0);
    });
  });

  describe('countPreservedTechnicalTerms', () => {
    test('counts preserved terms', () => {
      const original = 'The API returns JSON from the HTTP endpoint.';
      const enhanced = 'The API successfully returns JSON data.';
      
      const preserved = countPreservedTechnicalTerms(original, enhanced);
      expect(preserved).toBeGreaterThan(0);
    });

    test('detects missing terms', () => {
      const original = 'The API and SDK work together.';
      const enhanced = 'The system works well.';
      
      const preserved = countPreservedTechnicalTerms(original, enhanced);
      expect(preserved).toBe(0);
    });
  });

  describe('extractNumbers', () => {
    test('extracts various number formats', () => {
      const numbers = extractNumbers('Revenue grew 15% to $100M in Q3.');
      expect(numbers.has('15')).toBe(true);
      expect(numbers.has('100')).toBe(true);
    });

    test('extracts decimals', () => {
      const numbers = extractNumbers('The price is 3.14 dollars.');
      expect(numbers.has('3.14')).toBe(true);
    });
  });

  describe('countPreservedNumbers', () => {
    test('counts preserved numbers', () => {
      const original = 'Revenue grew 15% to $100M.';
      const enhanced = 'Revenue grew 15 percent to 100 million dollars.';
      
      const preserved = countPreservedNumbers(original, enhanced);
      expect(preserved).toBeGreaterThan(0);
    });

    test('detects missing numbers', () => {
      const original = 'Revenue grew 15% to $100M.';
      const enhanced = 'Revenue grew significantly.';
      
      const preserved = countPreservedNumbers(original, enhanced);
      expect(preserved).toBe(0);
    });
  });

  describe('extractProperNouns', () => {
    test('extracts proper nouns', () => {
      const nouns = extractProperNouns('John met with Microsoft about the Google project.');
      expect(nouns.has('John') || nouns.has('Microsoft') || nouns.has('Google')).toBe(true);
    });
  });

  describe('countPreservedProperNouns', () => {
    test('counts preserved proper nouns', () => {
      const original = 'John and Sarah discussed the Microsoft deal.';
      const enhanced = 'John and Sarah reviewed the Microsoft agreement.';
      
      const preserved = countPreservedProperNouns(original, enhanced);
      expect(preserved).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// MAIN QUALITY METRICS TESTS
// ============================================================================

describe('calculateEnhancementQualityMetrics', () => {
  describe('basic functionality', () => {
    test('returns complete metrics object', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'Um, so like, the quarterly results were really good.',
        'The quarterly results were excellent.'
      );
      
      // Check all required properties exist
      expect(metrics).toHaveProperty('originalLength');
      expect(metrics).toHaveProperty('enhancedLength');
      expect(metrics).toHaveProperty('compressionRatio');
      expect(metrics).toHaveProperty('reductionPercentage');
      expect(metrics).toHaveProperty('originalWordCount');
      expect(metrics).toHaveProperty('enhancedWordCount');
      expect(metrics).toHaveProperty('readabilityBefore');
      expect(metrics).toHaveProperty('readabilityAfter');
      expect(metrics).toHaveProperty('readabilityImprovement');
      expect(metrics).toHaveProperty('qualityScore');
      expect(metrics).toHaveProperty('confidenceScore');
      expect(metrics).toHaveProperty('qualityBreakdown');
    });

    test('calculates compression ratio correctly', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'This is a longer text with many words.',
        'Shorter text.'
      );
      
      expect(metrics.compressionRatio).toBeLessThan(1);
      expect(metrics.reductionPercentage).toBeGreaterThan(0);
    });

    test('handles expansion correctly', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'Short.',
        'This is a much longer and more detailed text.'
      );
      
      expect(metrics.compressionRatio).toBeGreaterThan(1);
      expect(metrics.reductionPercentage).toBeLessThan(0);
    });
  });

  describe('quality scoring', () => {
    test('good enhancement scores reasonably', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'Um, so like, the quarterly results, you know, were really good. I mean, very successful.',
        'The quarterly results were excellent and successful.',
        5 // fillerWordsRemoved
      );
      
      // Quality score should be at least base score (50)
      expect(metrics.qualityScore).toBeGreaterThanOrEqual(50);
      // Should have sentiment preserved
      expect(metrics.sentimentPreserved).toBe(true);
    });

    test('poor enhancement scores low', () => {
      // Enhancement that changes meaning and loses content
      const metrics = calculateEnhancementQualityMetrics(
        'The quarterly results were excellent and showed 15% growth.',
        'Bad results.',
        0
      );
      
      expect(metrics.qualityScore).toBeLessThan(60);
    });

    test('includes quality breakdown', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'Test text with some content.',
        'Test text.'
      );
      
      const breakdown = metrics.qualityBreakdown;
      expect(breakdown).toHaveProperty('baseScore');
      expect(breakdown).toHaveProperty('readabilityPoints');
      expect(breakdown).toHaveProperty('compressionPoints');
      expect(breakdown).toHaveProperty('sentimentPoints');
      expect(breakdown).toHaveProperty('totalScore');
      expect(breakdown.baseScore).toBe(50);
    });
  });

  describe('confidence scoring', () => {
    test('normal enhancement has good confidence', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'The results were good and showed positive growth.',
        'The results were excellent with positive growth.'
      );
      
      expect(metrics.confidenceScore).toBeGreaterThanOrEqual(0.6);
    });

    test('extreme compression lowers confidence', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'This is a very long text with lots of content that should not be dramatically shortened to just a few words.',
        'Short.'
      );
      
      expect(metrics.confidenceScore).toBeLessThan(0.7);
    });

    test('confidence is between 0 and 1', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'Any text here.',
        'Any text.'
      );
      
      expect(metrics.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(metrics.confidenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    test('handles empty strings', () => {
      const metrics = calculateEnhancementQualityMetrics('', '');
      
      expect(metrics.originalLength).toBe(0);
      expect(metrics.enhancedLength).toBe(0);
      expect(metrics.compressionRatio).toBe(1);
      // Quality score includes base + compression points for ratio of 1.0
      expect(metrics.qualityScore).toBeGreaterThanOrEqual(50);
    });

    test('handles identical texts', () => {
      const text = 'Same text unchanged.';
      const metrics = calculateEnhancementQualityMetrics(text, text);
      
      expect(metrics.compressionRatio).toBe(1);
      expect(metrics.wordsRemoved).toBe(0);
      expect(metrics.wordsAdded).toBe(0);
    });

    test('handles null/undefined inputs', () => {
      // Should not throw
      const metrics = calculateEnhancementQualityMetrics(
        null as any,
        undefined as any
      );
      
      expect(metrics).toBeDefined();
      expect(metrics.originalLength).toBe(0);
    });
  });

  describe('preservation detection', () => {
    test('detects technical term preservation', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'The API returned HTTP 200 with JSON response.',
        'The API successfully returned JSON data.'
      );
      
      expect(metrics.technicalTermsPreserved).toBeGreaterThan(0);
    });

    test('detects number preservation', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'Revenue grew 15% to $100 million.',
        'Revenue increased 15 percent to 100 million dollars.'
      );
      
      expect(metrics.numbersPreserved).toBeGreaterThan(0);
    });

    test('detects sentiment preservation', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'This is excellent work!',
        'This is great work!'
      );
      
      expect(metrics.sentimentPreserved).toBe(true);
      expect(metrics.sentimentOriginal).toBe('positive');
      expect(metrics.sentimentEnhanced).toBe('positive');
    });

    test('detects sentiment change', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'This is excellent work!',
        'This is terrible work!'
      );
      
      expect(metrics.sentimentPreserved).toBe(false);
    });
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('Helper Functions', () => {
  describe('formatMetricsSummary', () => {
    test('generates formatted summary', () => {
      const metrics = calculateEnhancementQualityMetrics(
        'Um, so like, the results were good.',
        'The results were excellent.',
        3
      );
      
      const summary = formatMetricsSummary(metrics);
      
      expect(summary).toContain('Enhancement Quality Report');
      expect(summary).toContain('Compression:');
      expect(summary).toContain('Readability:');
      expect(summary).toContain('Quality Score:');
    });
  });

  describe('getQualityLabel', () => {
    test('returns correct labels', () => {
      expect(getQualityLabel(95)).toBe('Excellent');
      expect(getQualityLabel(85)).toBe('Very Good');
      expect(getQualityLabel(75)).toBe('Good');
      expect(getQualityLabel(65)).toBe('Fair');
      expect(getQualityLabel(55)).toBe('Needs Review');
      expect(getQualityLabel(30)).toBe('Poor');
    });
  });

  describe('getConfidenceLabel', () => {
    test('returns correct labels', () => {
      expect(getConfidenceLabel(0.95)).toBe('Very Confident');
      expect(getConfidenceLabel(0.80)).toBe('Confident');
      expect(getConfidenceLabel(0.60)).toBe('Uncertain');
      expect(getConfidenceLabel(0.30)).toBe('Low Confidence');
    });
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance', () => {
  test('completes within 100ms for large text', () => {
    const largeText = 'The quick brown fox jumps over the lazy dog. '.repeat(200);
    
    const start = Date.now();
    calculateEnhancementQualityMetrics(largeText, largeText);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });

  test('handles very long text without errors', () => {
    const veryLongText = 'Word '.repeat(10000);
    
    expect(() => {
      calculateEnhancementQualityMetrics(veryLongText, veryLongText);
    }).not.toThrow();
  });
});
