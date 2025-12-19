/**
 * Tests for Enhancement Strategy Generator
 */

import {
  generateEnhancementStrategy,
  determineFillerRemovalIntensity,
  determineGrammarCorrectionLevel,
  determineTargetFormality,
  determineRestructuringLevel,
  shouldPreserveTechnicalTerms,
  explainStrategy,
  getStrategySummary,
} from '@/utils/enhancementStrategyGenerator';
import type { WhisperMetadata, EnhancementStrategy } from '@/types/whisper-metadata';

describe('EnhancementStrategyGenerator', () => {
  // ============================================================================
  // Test Metadata Factories
  // ============================================================================
  
  const createBaseMetadata = (overrides: Partial<WhisperMetadata> = {}): WhisperMetadata => ({
    duration: 60,
    totalWords: 200,
    totalCharacters: 1000,
    language: 'en',
    contentType: 'unknown',
    contentTypeConfidence: 'medium',
    contentTypeReasons: [],
    speakingRate: 'normal',
    wordsPerMinute: 130,
    speakingRateCategory: 'normal',
    fillerDensity: 'moderate',
    fillerWordCount: 10,
    fillerWordPercentage: 5,
    fillerWordsByType: {
      basic: 3,
      discourse: 4,
      hedging: 2,
      starters: 1,
      repetition: 0,
    },
    fillerWordInstances: [],
    estimatedSentenceCount: 10,
    averageWordsPerSentence: 20,
    sentenceLengthVariation: 'consistent',
    temporal: {
      totalDuration: 60,
      speakingDuration: 55,
      silenceDuration: 5,
      averagePauseDuration: 300,
      longestPause: 2,
      pauseCount: 5,
    },
    confidence: {
      averageConfidence: 0.9,
      minConfidence: 0.7,
      maxConfidence: 1.0,
      lowConfidenceCount: 0,
      lowConfidenceSegments: [],
    },
    keywords: {
      topKeywords: [{ word: 'test', count: 5, frequency: 2.5 }],
      technicalTerms: [],
      properNouns: ['John'],
      acronyms: [],
    },
    segments: [],
    ...overrides,
  });

  // ============================================================================
  // generateEnhancementStrategy Tests
  // ============================================================================
  
  describe('generateEnhancementStrategy', () => {
    test('should generate a complete strategy object', () => {
      const metadata = createBaseMetadata();
      const strategy = generateEnhancementStrategy(metadata);
      
      expect(strategy.fillerRemoval).toBeDefined();
      expect(strategy.grammarCorrection).toBeDefined();
      expect(strategy.targetFormality).toBeDefined();
      expect(strategy.restructureSentences).toBeDefined();
      expect(strategy.preserveTechnicalTerms).toBeDefined();
      expect(strategy.preserveAcronyms).toBeDefined();
      expect(strategy.preserveProperNouns).toBeDefined();
      expect(strategy.preserveSpeakerVoices).toBeDefined();
      expect(strategy.maintainQuestionAnswerFormat).toBeDefined();
      expect(strategy.flagLowConfidenceSegments).toBeDefined();
      expect(strategy.conservativeOnLowConfidence).toBeDefined();
    });
    
    test('should generate appropriate strategy for business content', () => {
      const metadata = createBaseMetadata({
        contentType: 'business',
        contentTypeConfidence: 'high',
        fillerDensity: 'high',
      });
      
      const strategy = generateEnhancementStrategy(metadata);
      
      expect(strategy.targetFormality).toBe('professional');
      expect(['aggressive', 'moderate']).toContain(strategy.fillerRemoval);
      expect(strategy.grammarCorrection).toBe('strict');
    });
    
    test('should generate appropriate strategy for technical content', () => {
      const metadata = createBaseMetadata({
        contentType: 'technical',
        contentTypeConfidence: 'high',
        keywords: {
          topKeywords: [],
          technicalTerms: ['API', 'database', 'function'],
          properNouns: [],
          acronyms: ['API', 'SDK', 'REST', 'HTTP'], // Need >3 acronyms for preserveAcronyms
        },
      });
      
      const strategy = generateEnhancementStrategy(metadata);
      
      expect(strategy.preserveTechnicalTerms).toBe(true);
      expect(strategy.preserveAcronyms).toBe(true);
      expect(strategy.grammarCorrection).toBe('balanced');
    });
    
    test('should generate appropriate strategy for casual content', () => {
      const metadata = createBaseMetadata({
        contentType: 'casual',
        contentTypeConfidence: 'high',
        fillerDensity: 'high',
      });
      
      const strategy = generateEnhancementStrategy(metadata);
      
      expect(strategy.targetFormality).toBe('casual');
      expect(strategy.fillerRemoval).toBe('light');
      expect(strategy.grammarCorrection).toBe('conservative');
    });
    
    test('should generate appropriate strategy for interview content', () => {
      const metadata = createBaseMetadata({
        contentType: 'interview',
        contentTypeConfidence: 'high',
      });
      
      const strategy = generateEnhancementStrategy(metadata);
      
      expect(strategy.maintainQuestionAnswerFormat).toBe(true);
      expect(strategy.targetFormality).toBe('professional');
    });
    
    test('should generate appropriate strategy for lecture content', () => {
      const metadata = createBaseMetadata({
        contentType: 'lecture',
        contentTypeConfidence: 'high',
        fillerDensity: 'high',
      });
      
      const strategy = generateEnhancementStrategy(metadata);
      
      expect(strategy.targetFormality).toBe('formal');
      expect(strategy.grammarCorrection).toBe('strict');
      expect(['aggressive', 'moderate']).toContain(strategy.fillerRemoval);
    });
    
    test('should preserve speaker voices for multiple speakers', () => {
      const metadata = createBaseMetadata({
        speakerCount: 3,
      });
      
      const strategy = generateEnhancementStrategy(metadata);
      
      expect(strategy.preserveSpeakerVoices).toBe(true);
    });
    
    test('should handle low confidence appropriately', () => {
      const metadata = createBaseMetadata({
        confidence: {
          averageConfidence: 0.6,
          minConfidence: 0.4,
          maxConfidence: 0.8,
          lowConfidenceCount: 5,
          lowConfidenceSegments: [
            { index: 0, confidence: 0.5, text: 'test', start: 0, end: 1 },
          ],
        },
      });
      
      const strategy = generateEnhancementStrategy(metadata);
      
      expect(strategy.flagLowConfidenceSegments).toBe(true);
      expect(strategy.conservativeOnLowConfidence).toBe(true);
    });
  });

  // ============================================================================
  // determineFillerRemovalIntensity Tests
  // ============================================================================
  
  describe('determineFillerRemovalIntensity', () => {
    test('should be aggressive for business with high fillers', () => {
      const metadata = createBaseMetadata({
        contentType: 'business',
        fillerDensity: 'very_high',
      });
      
      expect(determineFillerRemovalIntensity(metadata)).toBe('aggressive');
    });
    
    test('should be moderate for business with moderate fillers', () => {
      const metadata = createBaseMetadata({
        contentType: 'business',
        fillerDensity: 'moderate',
      });
      
      expect(determineFillerRemovalIntensity(metadata)).toBe('moderate');
    });
    
    test('should be light for casual content', () => {
      const metadata = createBaseMetadata({
        contentType: 'casual',
        fillerDensity: 'high',
      });
      
      expect(determineFillerRemovalIntensity(metadata)).toBe('light');
    });
    
    test('should be minimal for casual with low fillers', () => {
      const metadata = createBaseMetadata({
        contentType: 'casual',
        fillerDensity: 'low',
      });
      
      expect(determineFillerRemovalIntensity(metadata)).toBe('minimal');
    });
    
    test('should handle unknown content type', () => {
      const metadata = createBaseMetadata({
        contentType: 'unknown',
        fillerDensity: 'very_high',
      });
      
      expect(determineFillerRemovalIntensity(metadata)).toBe('aggressive');
    });
  });

  // ============================================================================
  // determineGrammarCorrectionLevel Tests
  // ============================================================================
  
  describe('determineGrammarCorrectionLevel', () => {
    test('should be strict for business content', () => {
      const metadata = createBaseMetadata({ contentType: 'business' });
      expect(determineGrammarCorrectionLevel(metadata)).toBe('strict');
    });
    
    test('should be strict for lecture content', () => {
      const metadata = createBaseMetadata({ contentType: 'lecture' });
      expect(determineGrammarCorrectionLevel(metadata)).toBe('strict');
    });
    
    test('should be balanced for technical content', () => {
      const metadata = createBaseMetadata({ contentType: 'technical' });
      expect(determineGrammarCorrectionLevel(metadata)).toBe('balanced');
    });
    
    test('should be conservative for casual content', () => {
      const metadata = createBaseMetadata({ contentType: 'casual' });
      expect(determineGrammarCorrectionLevel(metadata)).toBe('conservative');
    });
    
    test('should be balanced for fast speaking', () => {
      const metadata = createBaseMetadata({
        contentType: 'unknown',
        speakingRateCategory: 'fast',
      });
      expect(determineGrammarCorrectionLevel(metadata)).toBe('balanced');
    });
  });

  // ============================================================================
  // determineTargetFormality Tests
  // ============================================================================
  
  describe('determineTargetFormality', () => {
    test('should return professional for business', () => {
      const metadata = createBaseMetadata({
        contentType: 'business',
        contentTypeConfidence: 'high',
      });
      expect(determineTargetFormality(metadata)).toBe('professional');
    });
    
    test('should return formal for lecture', () => {
      const metadata = createBaseMetadata({
        contentType: 'lecture',
        contentTypeConfidence: 'high',
      });
      expect(determineTargetFormality(metadata)).toBe('formal');
    });
    
    test('should return casual for casual content', () => {
      const metadata = createBaseMetadata({
        contentType: 'casual',
        contentTypeConfidence: 'high',
      });
      expect(determineTargetFormality(metadata)).toBe('casual');
    });
    
    test('should return conversational for low confidence', () => {
      const metadata = createBaseMetadata({
        contentType: 'business',
        contentTypeConfidence: 'low',
      });
      expect(determineTargetFormality(metadata)).toBe('conversational');
    });
  });

  // ============================================================================
  // determineRestructuringLevel Tests
  // ============================================================================
  
  describe('determineRestructuringLevel', () => {
    test('should be extensive for very long sentences', () => {
      const metadata = createBaseMetadata({
        averageWordsPerSentence: 40,
      });
      expect(determineRestructuringLevel(metadata)).toBe('extensive');
    });
    
    test('should be moderate for fast speakers with varied sentences', () => {
      const metadata = createBaseMetadata({
        speakingRateCategory: 'fast',
        sentenceLengthVariation: 'varied',
      });
      expect(determineRestructuringLevel(metadata)).toBe('moderate');
    });
    
    test('should be minimal for normal content', () => {
      const metadata = createBaseMetadata({
        contentType: 'casual',
        averageWordsPerSentence: 15,
        speakingRateCategory: 'normal',
      });
      expect(determineRestructuringLevel(metadata)).toBe('minimal');
    });
    
    test('should be moderate for business with long sentences', () => {
      const metadata = createBaseMetadata({
        contentType: 'business',
        averageWordsPerSentence: 28,
      });
      expect(determineRestructuringLevel(metadata)).toBe('moderate');
    });
  });

  // ============================================================================
  // shouldPreserveTechnicalTerms Tests
  // ============================================================================
  
  describe('shouldPreserveTechnicalTerms', () => {
    test('should return true for technical content', () => {
      const metadata = createBaseMetadata({ contentType: 'technical' });
      expect(shouldPreserveTechnicalTerms(metadata)).toBe(true);
    });
    
    test('should return true when technical terms present', () => {
      const metadata = createBaseMetadata({
        contentType: 'business',
        keywords: {
          topKeywords: [],
          technicalTerms: ['API', 'database'],
          properNouns: [],
          acronyms: [],
        },
      });
      expect(shouldPreserveTechnicalTerms(metadata)).toBe(true);
    });
    
    test('should return true when many acronyms present', () => {
      const metadata = createBaseMetadata({
        contentType: 'business',
        keywords: {
          topKeywords: [],
          technicalTerms: [],
          properNouns: [],
          acronyms: ['API', 'SDK', 'REST', 'HTTP', 'JSON', 'XML'],
        },
      });
      expect(shouldPreserveTechnicalTerms(metadata)).toBe(true);
    });
    
    test('should return false for casual without technical content', () => {
      const metadata = createBaseMetadata({
        contentType: 'casual',
        keywords: {
          topKeywords: [],
          technicalTerms: [],
          properNouns: [],
          acronyms: [],
        },
      });
      expect(shouldPreserveTechnicalTerms(metadata)).toBe(false);
    });
  });

  // ============================================================================
  // explainStrategy Tests
  // ============================================================================
  
  describe('explainStrategy', () => {
    test('should generate readable explanation', () => {
      const metadata = createBaseMetadata({
        contentType: 'business',
        contentTypeConfidence: 'high',
      });
      const strategy = generateEnhancementStrategy(metadata);
      const explanation = explainStrategy(strategy, metadata);
      
      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(0);
      expect(explanation).toContain('Content Type: BUSINESS');
    });
    
    test('should include special handling indicators', () => {
      const metadata = createBaseMetadata({
        contentType: 'technical',
        contentTypeConfidence: 'high',
        speakerCount: 2,
        keywords: {
          topKeywords: [],
          technicalTerms: ['API'],
          properNouns: [],
          acronyms: ['API', 'SDK', 'REST', 'HTTP'],
        },
      });
      const strategy = generateEnhancementStrategy(metadata);
      const explanation = explainStrategy(strategy, metadata);
      
      expect(explanation).toContain('technical terminology');
      expect(explanation).toContain('acronyms');
    });
  });

  // ============================================================================
  // getStrategySummary Tests
  // ============================================================================
  
  describe('getStrategySummary', () => {
    test('should return formatted summary object', () => {
      const metadata = createBaseMetadata({
        contentType: 'business',
        contentTypeConfidence: 'high',
      });
      const strategy = generateEnhancementStrategy(metadata);
      const summary = getStrategySummary(strategy, metadata);
      
      expect(summary.contentType).toBeDefined();
      expect(summary.fillerHandling).toBeDefined();
      expect(summary.formality).toBeDefined();
      expect(summary.specialFeatures).toBeInstanceOf(Array);
    });
    
    test('should include special features when applicable', () => {
      const metadata = createBaseMetadata({
        contentType: 'interview',
        contentTypeConfidence: 'high',
        speakerCount: 2,
      });
      const strategy = generateEnhancementStrategy(metadata);
      const summary = getStrategySummary(strategy, metadata);
      
      expect(summary.specialFeatures).toContain('Preserves Q&A structure');
      expect(summary.specialFeatures.some(f => f.includes('speaker'))).toBe(true);
    });
  });
});

