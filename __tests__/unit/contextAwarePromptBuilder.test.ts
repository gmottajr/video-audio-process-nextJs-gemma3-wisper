/**
 * Tests for Context-Aware Prompt Builder
 */

import {
  buildContextAwarePrompt,
  buildSimplePrompt,
  getPromptStats,
} from '@/utils/contextAwarePromptBuilder';
import type { WhisperMetadata, EnhancementStrategy, PromptConfiguration } from '@/types/whisper-metadata';

describe('ContextAwarePromptBuilder', () => {
  // ============================================================================
  // Test Fixtures
  // ============================================================================
  
  const createTestMetadata = (overrides: Partial<WhisperMetadata> = {}): WhisperMetadata => ({
    duration: 60,
    totalWords: 200,
    totalCharacters: 1000,
    language: 'en',
    contentType: 'business',
    contentTypeConfidence: 'high',
    contentTypeReasons: ['Found 5 business terms'],
    speakingRate: 'normal',
    wordsPerMinute: 130,
    speakingRateCategory: 'normal',
    fillerDensity: 'moderate',
    fillerWordCount: 10,
    fillerWordPercentage: 5.0,
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
      topKeywords: [
        { word: 'meeting', count: 5, frequency: 2.5 },
        { word: 'project', count: 4, frequency: 2.0 },
        { word: 'budget', count: 3, frequency: 1.5 },
      ],
      technicalTerms: [],
      properNouns: ['John', 'Microsoft'],
      acronyms: ['ROI', 'KPI'],
    },
    segments: [
      { index: 0, start: 0, end: 30, text: 'First half of the transcript about the quarterly meeting.' },
      { index: 1, start: 30, end: 60, text: 'Second half discussing budget and project details.' },
    ],
    ...overrides,
  });

  const createTestStrategy = (overrides: Partial<EnhancementStrategy> = {}): EnhancementStrategy => ({
    fillerRemoval: 'moderate',
    grammarCorrection: 'balanced',
    targetFormality: 'professional',
    restructureSentences: 'minimal',
    preserveTechnicalTerms: false,
    preserveAcronyms: true,
    preserveProperNouns: true,
    preserveSpeakerVoices: false,
    maintainQuestionAnswerFormat: false,
    flagLowConfidenceSegments: false,
    conservativeOnLowConfidence: false,
    ...overrides,
  });

  // ============================================================================
  // buildContextAwarePrompt Tests
  // ============================================================================
  
  describe('buildContextAwarePrompt', () => {
    test('should build a complete prompt with all sections', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata(),
        strategy: createTestStrategy(),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      // Should include key sections
      expect(prompt).toContain('TRANSCRIPT CONTEXT');
      expect(prompt).toContain('ENHANCEMENT INSTRUCTIONS');
      expect(prompt).toContain('STYLE GUIDELINES');
      expect(prompt).toContain('ORIGINAL TRANSCRIPT');
      expect(prompt).toContain('ENHANCED TRANSCRIPT');
    });
    
    test('should include content type in context section', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata({ contentType: 'business' }),
        strategy: createTestStrategy(),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('BUSINESS MEETING');
    });
    
    test('should include filler density information', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata({ fillerWordPercentage: 7.5 }),
        strategy: createTestStrategy(),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('7.5%');
    });
    
    test('should include speaking rate', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata({ wordsPerMinute: 150 }),
        strategy: createTestStrategy(),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('150 words/minute');
    });
    
    test('should include transcript text from segments', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata(),
        strategy: createTestStrategy(),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('quarterly meeting');
      expect(prompt).toContain('budget and project');
    });
    
    test('should include appropriate filler removal instructions', () => {
      const aggressiveConfig: PromptConfiguration = {
        metadata: createTestMetadata(),
        strategy: createTestStrategy({ fillerRemoval: 'aggressive' }),
      };
      
      const aggressivePrompt = buildContextAwarePrompt(aggressiveConfig);
      expect(aggressivePrompt).toContain('REMOVE ALL');
      
      const minimalConfig: PromptConfiguration = {
        metadata: createTestMetadata(),
        strategy: createTestStrategy({ fillerRemoval: 'minimal' }),
      };
      
      const minimalPrompt = buildContextAwarePrompt(minimalConfig);
      expect(minimalPrompt).toContain('ONLY REMOVE');
    });
    
    test('should include preservation rules in system prompt', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata({
          keywords: {
            topKeywords: [],
            technicalTerms: ['API', 'database'],
            properNouns: ['John'],
            acronyms: ['API', 'SDK', 'REST', 'HTTP'],
          },
        }),
        strategy: createTestStrategy({
          preserveTechnicalTerms: true,
          preserveAcronyms: true,
          preserveProperNouns: true,
        }),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('Technical terminology');
      expect(prompt).toContain('Acronyms');
      expect(prompt).toContain('Proper nouns');
    });
    
    test('should include custom instructions when provided', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata(),
        strategy: createTestStrategy(),
        customInstructions: 'Please keep all project code names unchanged.',
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('CUSTOM INSTRUCTIONS');
      expect(prompt).toContain('project code names');
    });
    
    test('should include examples when provided', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata(),
        strategy: createTestStrategy(),
        examples: [
          {
            before: 'Um, so basically',
            after: 'So',
            explanation: 'Removed filler words',
          },
        ],
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('EXAMPLES');
      expect(prompt).toContain('Um, so basically');
      expect(prompt).toContain('Removed filler words');
    });
    
    test('should include default examples based on content type', () => {
      const businessConfig: PromptConfiguration = {
        metadata: createTestMetadata({ contentType: 'business' }),
        strategy: createTestStrategy(),
      };
      
      const businessPrompt = buildContextAwarePrompt(businessConfig);
      expect(businessPrompt).toContain('EXAMPLES');
      
      const technicalConfig: PromptConfiguration = {
        metadata: createTestMetadata({ contentType: 'technical' }),
        strategy: createTestStrategy(),
      };
      
      const technicalPrompt = buildContextAwarePrompt(technicalConfig);
      expect(technicalPrompt).toContain('EXAMPLES');
    });
    
    test('should handle different content types with appropriate style guidance', () => {
      const contentTypes: Array<{ type: WhisperMetadata['contentType']; expectedText: string }> = [
        { type: 'business', expectedText: 'BUSINESS content' },
        { type: 'technical', expectedText: 'TECHNICAL content' },
        { type: 'casual', expectedText: 'CASUAL content' },
        { type: 'interview', expectedText: 'INTERVIEW content' },
        { type: 'lecture', expectedText: 'LECTURE content' },
      ];
      
      for (const { type, expectedText } of contentTypes) {
        const config: PromptConfiguration = {
          metadata: createTestMetadata({ contentType: type }),
          strategy: createTestStrategy(),
        };
        
        const prompt = buildContextAwarePrompt(config);
        expect(prompt).toContain(expectedText);
      }
    });
    
    test('should include special considerations for fast speaking', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata({ speakingRateCategory: 'fast' }),
        strategy: createTestStrategy(),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('Fast speaking pace');
    });
    
    test('should include special considerations for high filler density', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata({ fillerDensity: 'very_high' }),
        strategy: createTestStrategy(),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('Very high filler density');
    });
    
    test('should include key topics', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata(),
        strategy: createTestStrategy(),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('Key topics');
      expect(prompt).toContain('meeting');
    });
    
    test('should include proper nouns to preserve', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata({
          keywords: {
            topKeywords: [],
            technicalTerms: [],
            properNouns: ['John', 'Microsoft', 'Project Alpha'],
            acronyms: [],
          },
        }),
        strategy: createTestStrategy({ preserveProperNouns: true }),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('Preserve names');
      expect(prompt).toContain('John');
    });
  });

  // ============================================================================
  // buildSimplePrompt Tests
  // ============================================================================
  
  describe('buildSimplePrompt', () => {
    test('should build a simple fallback prompt', () => {
      const transcript = 'Um so like basically the meeting went well.';
      const prompt = buildSimplePrompt(transcript);
      
      expect(prompt).toContain('professional transcript editor');
      expect(prompt).toContain('ORIGINAL TRANSCRIPT');
      expect(prompt).toContain(transcript);
      expect(prompt).toContain('ENHANCED TRANSCRIPT');
    });
    
    test('should include filler word removal instructions', () => {
      const prompt = buildSimplePrompt('Test transcript');
      
      expect(prompt).toContain('Remove filler words');
      expect(prompt).toContain('um');
      expect(prompt).toContain('uh');
      expect(prompt).toContain('like');
    });
    
    test('should include grammar instructions', () => {
      const prompt = buildSimplePrompt('Test transcript');
      
      expect(prompt).toContain('Fix grammar');
      expect(prompt).toContain('punctuation');
    });
    
    test('should include preservation instructions', () => {
      const prompt = buildSimplePrompt('Test transcript');
      
      expect(prompt).toContain('Do NOT add new information');
      expect(prompt).toContain('Do NOT change numbers');
    });
  });

  // ============================================================================
  // getPromptStats Tests
  // ============================================================================
  
  describe('getPromptStats', () => {
    test('should return prompt statistics', () => {
      const prompt = 'This is a test prompt with some content.';
      const stats = getPromptStats(prompt);
      
      expect(stats.totalLength).toBe(prompt.length);
      expect(stats.estimatedTokens).toBeGreaterThan(0);
      expect(stats.sections).toBeInstanceOf(Array);
    });
    
    test('should identify sections in prompt', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata(),
        strategy: createTestStrategy(),
      };
      
      const prompt = buildContextAwarePrompt(config);
      const stats = getPromptStats(prompt);
      
      expect(stats.sections).toContain('TRANSCRIPT CONTEXT');
      expect(stats.sections).toContain('ENHANCEMENT INSTRUCTIONS');
      expect(stats.sections).toContain('STYLE GUIDELINES');
      expect(stats.sections).toContain('ORIGINAL TRANSCRIPT');
      expect(stats.sections).toContain('ENHANCED TRANSCRIPT');
    });
    
    test('should estimate tokens correctly', () => {
      const shortPrompt = 'Short text.';
      const longPrompt = 'A'.repeat(400); // ~100 tokens
      
      const shortStats = getPromptStats(shortPrompt);
      const longStats = getPromptStats(longPrompt);
      
      expect(longStats.estimatedTokens).toBeGreaterThan(shortStats.estimatedTokens);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  
  describe('Prompt Integration', () => {
    test('should produce coherent prompt for business meeting', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata({
          contentType: 'business',
          contentTypeConfidence: 'high',
          fillerDensity: 'high',
          segments: [
            { index: 0, start: 0, end: 60, text: 'Um so basically the quarterly results show that revenue increased by 15 percent compared to last quarter.' },
          ],
        }),
        strategy: createTestStrategy({
          fillerRemoval: 'aggressive',
          grammarCorrection: 'strict',
          targetFormality: 'professional',
        }),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      // Verify key elements are present
      expect(prompt).toContain('BUSINESS MEETING');
      expect(prompt).toContain('REMOVE ALL');
      expect(prompt).toContain('professional');
      expect(prompt).toContain('quarterly results');
    });
    
    test('should produce coherent prompt for technical discussion', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata({
          contentType: 'technical',
          contentTypeConfidence: 'high',
          keywords: {
            topKeywords: [{ word: 'api', count: 5, frequency: 2.5 }],
            technicalTerms: ['API', 'database', 'server'],
            properNouns: [],
            acronyms: ['API', 'REST', 'JSON'],
          },
          segments: [
            { index: 0, start: 0, end: 60, text: 'The API endpoint is returning a 404 error when we POST JSON data to the server.' },
          ],
        }),
        strategy: createTestStrategy({
          preserveTechnicalTerms: true,
          preserveAcronyms: true,
          grammarCorrection: 'balanced',
        }),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('TECHNICAL');
      expect(prompt).toContain('technical term');
      expect(prompt).toContain('API');
    });
    
    test('should produce coherent prompt for casual conversation', () => {
      const config: PromptConfiguration = {
        metadata: createTestMetadata({
          contentType: 'casual',
          contentTypeConfidence: 'high',
          fillerDensity: 'high',
          segments: [
            { index: 0, start: 0, end: 60, text: 'Yeah so like we were gonna hang out at the park but then it started raining.' },
          ],
        }),
        strategy: createTestStrategy({
          fillerRemoval: 'light',
          grammarCorrection: 'conservative',
          targetFormality: 'casual',
        }),
      };
      
      const prompt = buildContextAwarePrompt(config);
      
      expect(prompt).toContain('CASUAL');
      expect(prompt).toContain('REMOVE repetitive fillers'); // Light removal
      expect(prompt).toContain('friendly, natural tone');
    });
  });
});

