/**
 * Tests for Whisper Metadata Extractor
 */

import {
  extractWhisperMetadata,
  countWords,
  analyzeFillerWords,
  detectContentType,
  analyzeSpeakingRate,
  analyzeConfidence,
  analyzeTemporalPatterns,
  extractKeywords,
  analyzeSentences,
} from '@/utils/whisperMetadataExtractor';
import type { TranscriptionResult } from '@/contexts/TranscriberContext';

describe('WhisperMetadataExtractor', () => {
  // ============================================================================
  // Test Data
  // ============================================================================
  
  const businessTranscript: TranscriptionResult = {
    text: 'So um basically we need to look at the quarterly results. The revenue was um pretty good. Client satisfaction is up by 15 percent. I think we should schedule another meeting to discuss the budget and strategy.',
    chunks: [
      { text: 'So um basically we need to look at the quarterly results.', timestamp: [0, 4] },
      { text: 'The revenue was um pretty good.', timestamp: [4, 7] },
      { text: 'Client satisfaction is up by 15 percent.', timestamp: [7, 11] },
      { text: 'I think we should schedule another meeting to discuss the budget and strategy.', timestamp: [11, 17] },
    ],
  };
  
  const technicalTranscript: TranscriptionResult = {
    text: 'So the API endpoint is returning a 404 error when we POST the data. We need to debug the server code and check the database connection. The function should handle the exception properly.',
    chunks: [
      { text: 'So the API endpoint is returning a 404 error when we POST the data.', timestamp: [0, 5] },
      { text: 'We need to debug the server code and check the database connection.', timestamp: [5, 10] },
      { text: 'The function should handle the exception properly.', timestamp: [10, 14] },
    ],
  };
  
  const casualTranscript: TranscriptionResult = {
    text: 'So like we were just hanging out at the park and it was like really cool. Yeah gonna grab some food later, wanna come?',
    chunks: [
      { text: 'So like we were just hanging out at the park and it was like really cool.', timestamp: [0, 5] },
      { text: 'Yeah gonna grab some food later, wanna come?', timestamp: [5, 8] },
    ],
  };
  
  const highFillerTranscript: TranscriptionResult = {
    text: 'Um so like basically you know I mean we should um actually like you know consider this um option basically.',
    chunks: [
      { text: 'Um so like basically you know I mean we should um actually like you know consider this um option basically.', timestamp: [0, 8] },
    ],
  };

  // ============================================================================
  // Basic Extraction Tests
  // ============================================================================
  
  describe('extractWhisperMetadata', () => {
    test('should extract basic metrics correctly', () => {
      const metadata = extractWhisperMetadata(businessTranscript, 17);
      
      expect(metadata.duration).toBe(17);
      expect(metadata.totalWords).toBeGreaterThan(0);
      expect(metadata.totalCharacters).toBeGreaterThan(0);
      expect(metadata.language).toBe('en');
    });
    
    test('should include all required properties', () => {
      const metadata = extractWhisperMetadata(businessTranscript, 17);
      
      // Content classification
      expect(metadata.contentType).toBeDefined();
      expect(metadata.contentTypeConfidence).toBeDefined();
      expect(metadata.contentTypeReasons).toBeInstanceOf(Array);
      
      // Speaking characteristics
      expect(metadata.speakingRate).toBeDefined();
      expect(metadata.wordsPerMinute).toBeDefined();
      expect(metadata.speakingRateCategory).toBeDefined();
      
      // Filler analysis
      expect(metadata.fillerDensity).toBeDefined();
      expect(metadata.fillerWordCount).toBeDefined();
      expect(metadata.fillerWordPercentage).toBeDefined();
      expect(metadata.fillerWordsByType).toBeDefined();
      expect(metadata.fillerWordInstances).toBeInstanceOf(Array);
      
      // Sentence analysis
      expect(metadata.estimatedSentenceCount).toBeDefined();
      expect(metadata.averageWordsPerSentence).toBeDefined();
      expect(metadata.sentenceLengthVariation).toBeDefined();
      
      // Temporal analysis
      expect(metadata.temporal).toBeDefined();
      expect(metadata.temporal.totalDuration).toBeDefined();
      
      // Confidence
      expect(metadata.confidence).toBeDefined();
      expect(metadata.confidence.averageConfidence).toBeDefined();
      
      // Keywords
      expect(metadata.keywords).toBeDefined();
      expect(metadata.keywords.topKeywords).toBeInstanceOf(Array);
      
      // Segments
      expect(metadata.segments).toBeInstanceOf(Array);
      expect(metadata.segments.length).toBe(businessTranscript.chunks?.length);
    });
    
    test('should handle empty transcript', () => {
      const emptyTranscript: TranscriptionResult = {
        text: '',
        chunks: [],
      };
      
      const metadata = extractWhisperMetadata(emptyTranscript, 0);
      
      expect(metadata.totalWords).toBe(0);
      expect(metadata.duration).toBe(0);
      expect(metadata.fillerWordCount).toBe(0);
    });
    
    test('should estimate duration from chunks if not provided', () => {
      const metadata = extractWhisperMetadata(businessTranscript);
      
      expect(metadata.duration).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Helper Function Tests
  // ============================================================================
  
  describe('countWords', () => {
    test('should count words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('One two three four five')).toBe(5);
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
      expect(countWords('  multiple   spaces  ')).toBe(2);
    });
  });

  describe('analyzeFillerWords', () => {
    test('should detect basic fillers', () => {
      const result = analyzeFillerWords('Um so like basically you know', 5);
      
      expect(result.count).toBeGreaterThan(0);
      expect(result.byType.basic).toBeGreaterThan(0); // 'um'
      expect(result.byType.discourse).toBeGreaterThan(0); // 'like', 'you know'
    });
    
    test('should calculate correct density categories', () => {
      // Very high filler density (>8%)
      const veryHigh = analyzeFillerWords('Um um uh um like um', 6);
      expect(veryHigh.density).toBe('very_high');
      
      // Low filler density (<2%)
      const low = analyzeFillerWords('This is a normal sentence without many fillers and it continues with proper grammar', 15);
      expect(['low', 'very_low']).toContain(low.density);
    });
    
    test('should track filler word instances with positions', () => {
      const result = analyzeFillerWords('Hello um world', 3);
      
      expect(result.instances.length).toBeGreaterThan(0);
      expect(result.instances[0].word).toBeDefined();
      expect(result.instances[0].position).toBeDefined();
      expect(result.instances[0].category).toBeDefined();
    });
  });

  describe('detectContentType', () => {
    test('should detect business content', () => {
      const result = detectContentType(
        'We need to discuss the quarterly revenue, client budget, and sales strategy for the meeting.',
        { density: 'low' }
      );
      
      expect(result.type).toBe('business');
      expect(result.reasons.length).toBeGreaterThan(0);
    });
    
    test('should detect technical content', () => {
      const result = detectContentType(
        'The API endpoint needs debugging. Check the server code, database connection, and error handling.',
        { density: 'low' }
      );
      
      expect(result.type).toBe('technical');
    });
    
    test('should detect casual content', () => {
      const result = detectContentType(
        'Hey dude, gonna hang out later? It would be cool and awesome to chill.',
        { density: 'very_high' }
      );
      
      expect(result.type).toBe('casual');
    });
    
    test('should detect lecture content', () => {
      const result = detectContentType(
        'Today we will learn about the key concept. First, remember that this principle is important to understand. For example, let me explain the main idea.',
        { density: 'low' }
      );
      
      expect(result.type).toBe('lecture');
    });
    
    test('should return unknown for ambiguous content', () => {
      const result = detectContentType(
        'Hello there.',
        { density: 'low' }
      );
      
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe('low');
    });
    
    test('should provide confidence levels', () => {
      // High confidence
      const highConf = detectContentType(
        'We have a meeting about quarterly revenue, client budget, sales forecast, stakeholder ROI, and strategy proposals.',
        { density: 'low' }
      );
      expect(highConf.confidence).toBe('high');
      
      // Low confidence
      const lowConf = detectContentType(
        'Something happened.',
        { density: 'low' }
      );
      expect(lowConf.confidence).toBe('low');
    });
  });

  describe('analyzeSpeakingRate', () => {
    test('should categorize speaking rates correctly', () => {
      // Very fast (180+ WPM)
      expect(analyzeSpeakingRate(200, 60).category).toBe('very_fast');
      expect(analyzeSpeakingRate(200, 60).simplifiedCategory).toBe('fast');
      
      // Fast (150-180 WPM)
      expect(analyzeSpeakingRate(160, 60).category).toBe('fast');
      
      // Normal (120-150 WPM)
      expect(analyzeSpeakingRate(135, 60).category).toBe('normal');
      expect(analyzeSpeakingRate(135, 60).simplifiedCategory).toBe('normal');
      
      // Slow (90-120 WPM)
      expect(analyzeSpeakingRate(100, 60).category).toBe('slow');
      
      // Very slow (<90 WPM)
      expect(analyzeSpeakingRate(80, 60).category).toBe('very_slow');
      expect(analyzeSpeakingRate(80, 60).simplifiedCategory).toBe('slow');
    });
    
    test('should handle edge cases', () => {
      expect(analyzeSpeakingRate(0, 60).wpm).toBe(0);
      expect(analyzeSpeakingRate(100, 0).wpm).toBe(0);
    });
  });

  describe('analyzeConfidence', () => {
    test('should return defaults when no confidence data available', () => {
      const result = analyzeConfidence([
        { text: 'Hello', timestamp: [0, 1] },
      ]);
      
      expect(result.averageConfidence).toBe(1.0);
      expect(result.lowConfidenceCount).toBe(0);
      expect(result.lowConfidenceSegments).toHaveLength(0);
    });
    
    test('should handle empty chunks', () => {
      const result = analyzeConfidence([]);
      
      expect(result.averageConfidence).toBe(1.0);
    });
  });

  describe('analyzeTemporalPatterns', () => {
    test('should calculate timing metrics from chunks', () => {
      const chunks = [
        { text: 'First sentence', timestamp: [0, 3] as [number, number | null] },
        { text: 'Second sentence', timestamp: [4, 7] as [number, number | null] }, // 1s pause
        { text: 'Third sentence', timestamp: [7.5, 10] as [number, number | null] }, // 0.5s pause
      ];
      
      const result = analyzeTemporalPatterns(chunks, 10);
      
      expect(result.totalDuration).toBe(10);
      expect(result.pauseCount).toBeGreaterThanOrEqual(0);
    });
    
    test('should handle empty chunks', () => {
      const result = analyzeTemporalPatterns([], 10);
      
      expect(result.totalDuration).toBe(10);
      expect(result.speakingDuration).toBe(10);
      expect(result.pauseCount).toBe(0);
    });
  });

  describe('extractKeywords', () => {
    test('should extract top keywords', () => {
      const result = extractKeywords(
        'The meeting was about revenue. Revenue is important. The company revenue grew.',
        10
      );
      
      expect(result.topKeywords.length).toBeGreaterThan(0);
      // 'revenue' should be a top keyword
      const revenueKeyword = result.topKeywords.find(k => k.word === 'revenue');
      expect(revenueKeyword).toBeDefined();
    });
    
    test('should detect acronyms', () => {
      const result = extractKeywords(
        'The API and SDK are important. Also check the ROI and KPI metrics.',
        10
      );
      
      expect(result.acronyms).toContain('API');
      expect(result.acronyms).toContain('SDK');
      expect(result.acronyms).toContain('ROI');
    });
    
    test('should detect proper nouns', () => {
      const result = extractKeywords(
        'John spoke with Microsoft about the project. Sarah joined the call.',
        10
      );
      
      expect(result.properNouns.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeSentences', () => {
    test('should count sentences correctly', () => {
      const result = analyzeSentences('First sentence. Second sentence! Third question?');
      
      expect(result.count).toBe(3);
    });
    
    test('should calculate average words per sentence', () => {
      const result = analyzeSentences('Hello world. This is test. Short.');
      
      expect(result.avgWords).toBeGreaterThan(0);
    });
    
    test('should detect sentence length variation', () => {
      // Varied lengths
      const varied = analyzeSentences(
        'Short. This is a much longer sentence with many more words in it. Tiny.'
      );
      expect(varied.variation).toBe('varied');
      
      // Consistent lengths
      const consistent = analyzeSentences(
        'Three word sentence. Another three words. More three words.'
      );
      expect(consistent.variation).toBe('consistent');
    });
    
    test('should handle empty text', () => {
      const result = analyzeSentences('');
      
      expect(result.count).toBe(0);
      expect(result.avgWords).toBe(0);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  
  describe('Full Extraction Integration', () => {
    test('should extract business meeting metadata correctly', () => {
      const metadata = extractWhisperMetadata(businessTranscript, 17);
      
      expect(metadata.contentType).toBe('business');
      expect(metadata.fillerWordCount).toBeGreaterThan(0); // 'um', 'basically'
      expect(metadata.segments.length).toBe(4);
    });
    
    test('should extract technical discussion metadata correctly', () => {
      const metadata = extractWhisperMetadata(technicalTranscript, 14);
      
      expect(metadata.contentType).toBe('technical');
      expect(metadata.keywords.technicalTerms.length).toBeGreaterThan(0);
    });
    
    test('should extract casual conversation metadata correctly', () => {
      const metadata = extractWhisperMetadata(casualTranscript, 8);
      
      expect(metadata.contentType).toBe('casual');
    });
    
    test('should correctly identify high filler density', () => {
      const metadata = extractWhisperMetadata(highFillerTranscript, 8);
      
      expect(metadata.fillerDensity).toBe('very_high');
      expect(metadata.fillerWordPercentage).toBeGreaterThan(8);
    });
  });
});



