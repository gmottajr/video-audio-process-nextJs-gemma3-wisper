/**
 * @jest-environment jsdom
 */

/**
 * Tests for Enhancement History Manager
 * 
 * Tests cover:
 * - Record creation from metrics
 * - Enhancement analytics
 * - History queries and filters
 * - Trend analysis
 * - Model performance comparison
 */

import {
  recordEnhancement,
  calculateEnhancementAnalytics,
  getAnalyticsSummary,
  getEnhancementHistory,
  getContentTypes,
  getModelsUsed,
  getQualityTrend,
  compareModelPerformance,
} from '@/utils/enhancementHistoryManager';

import {
  clearAllData,
  saveEnhancementRecord,
  saveFeedback,
} from '@/utils/feedbackManager';

import type { EnhancementQualityMetrics } from '@/types/quality-metrics';

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Reset storage before each test
beforeEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
});

// ============================================================================
// MOCK DATA
// ============================================================================

const createMockMetrics = (overrides: Partial<EnhancementQualityMetrics> = {}): EnhancementQualityMetrics => ({
  originalLength: 500,
  enhancedLength: 400,
  compressionRatio: 0.8,
  reductionPercentage: 20,
  originalWordCount: 100,
  enhancedWordCount: 80,
  wordsRemoved: 20,
  wordsAdded: 0,
  originalSentenceCount: 5,
  enhancedSentenceCount: 4,
  avgSentenceLengthOriginal: 20,
  avgSentenceLengthEnhanced: 20,
  readabilityBefore: {
    fleschKincaidReadingEase: 60,
    fleschKincaidGradeLevel: 8,
    smogIndex: 10,
    automatedReadabilityIndex: 8,
    colemanLiauIndex: 9,
    gunningFogIndex: 10,
  },
  readabilityAfter: {
    fleschKincaidReadingEase: 70,
    fleschKincaidGradeLevel: 7,
    smogIndex: 9,
    automatedReadabilityIndex: 7,
    colemanLiauIndex: 8,
    gunningFogIndex: 9,
  },
  readabilityImprovement: 10,
  fillerWordsRemoved: 5,
  fillerRemovalRate: 5,
  technicalTermsPreserved: 3,
  acronymsPreserved: 2,
  numbersPreserved: 1,
  properNounsPreserved: 2,
  sentimentOriginal: 'positive',
  sentimentEnhanced: 'positive',
  sentimentPreserved: true,
  qualityScore: 75,
  confidenceScore: 0.85,
  qualityBreakdown: {
    baseScore: 50,
    readabilityPoints: 10,
    compressionPoints: 15,
    sentimentPoints: 10,
    technicalPoints: 10,
    fillerPoints: 10,
    penaltyPoints: 0,
    totalScore: 75,
  },
  ...overrides,
});

// ============================================================================
// RECORD CREATION TESTS
// ============================================================================

describe('Record Creation', () => {
  describe('recordEnhancement', () => {
    test('creates record from metrics', () => {
      const metrics = createMockMetrics();
      const context = {
        contentType: 'business',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 5000,
      };
      
      const record = recordEnhancement(metrics, context);
      
      expect(record).not.toBeNull();
      expect(record?.qualityScore).toBe(75);
      expect(record?.confidenceScore).toBe(0.85);
      expect(record?.readabilityDelta).toBe(10);
      expect(record?.compressionRatio).toBe(0.8);
      expect(record?.contentType).toBe('business');
      expect(record?.modelId).toBe('llama-3.2-3b');
    });

    test('preserves word counts', () => {
      const metrics = createMockMetrics({
        originalWordCount: 150,
        enhancedWordCount: 120,
      });
      
      const record = recordEnhancement(metrics, {
        contentType: 'technical',
        modelId: 'qwen-0.5b',
        processingTimeMs: 3000,
      });
      
      expect(record?.originalWordCount).toBe(150);
      expect(record?.enhancedWordCount).toBe(120);
    });
  });
});

// ============================================================================
// ANALYTICS TESTS
// ============================================================================

describe('Enhancement Analytics', () => {
  describe('calculateEnhancementAnalytics', () => {
    test('returns zeros when no records', () => {
      const analytics = calculateEnhancementAnalytics();
      
      expect(analytics.totalEnhancements).toBe(0);
      expect(analytics.averageQualityScore).toBe(0);
      expect(analytics.averageProcessingTime).toBe(0);
    });

    test('calculates averages correctly', () => {
      // Create records with different quality scores
      recordEnhancement(createMockMetrics({ qualityScore: 60 }), {
        contentType: 'business',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 4000,
      });
      
      recordEnhancement(createMockMetrics({ qualityScore: 80 }), {
        contentType: 'technical',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 6000,
      });
      
      const analytics = calculateEnhancementAnalytics();
      
      expect(analytics.totalEnhancements).toBe(2);
      expect(analytics.averageQualityScore).toBe(70); // (60+80)/2
      expect(analytics.averageProcessingTime).toBe(5000); // (4000+6000)/2
    });

    test('groups by content type', () => {
      recordEnhancement(createMockMetrics({ qualityScore: 70 }), {
        contentType: 'business',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 5000,
      });
      
      recordEnhancement(createMockMetrics({ qualityScore: 80 }), {
        contentType: 'business',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 5000,
      });
      
      recordEnhancement(createMockMetrics({ qualityScore: 90 }), {
        contentType: 'technical',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 5000,
      });
      
      const analytics = calculateEnhancementAnalytics();
      
      expect(analytics.byContentType['business'].count).toBe(2);
      expect(analytics.byContentType['business'].avgQualityScore).toBe(75);
      expect(analytics.byContentType['technical'].count).toBe(1);
      expect(analytics.byContentType['technical'].avgQualityScore).toBe(90);
    });

    test('groups by model', () => {
      recordEnhancement(createMockMetrics({ qualityScore: 70 }), {
        contentType: 'business',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 5000,
      });
      
      recordEnhancement(createMockMetrics({ qualityScore: 60 }), {
        contentType: 'business',
        modelId: 'qwen-0.5b',
        processingTimeMs: 2000,
      });
      
      const analytics = calculateEnhancementAnalytics();
      
      expect(analytics.byModel['llama-3.2-3b'].count).toBe(1);
      expect(analytics.byModel['llama-3.2-3b'].avgProcessingTime).toBe(5000);
      expect(analytics.byModel['qwen-0.5b'].count).toBe(1);
      expect(analytics.byModel['qwen-0.5b'].avgProcessingTime).toBe(2000);
    });
  });

  describe('getAnalyticsSummary', () => {
    test('returns complete summary', () => {
      recordEnhancement(createMockMetrics(), {
        contentType: 'business',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 5000,
      });
      
      const summary = getAnalyticsSummary();
      
      expect(summary).toHaveProperty('feedback');
      expect(summary).toHaveProperty('enhancement');
      expect(summary).toHaveProperty('generatedAt');
      expect(summary.enhancement.totalEnhancements).toBe(1);
    });
  });
});

// ============================================================================
// HISTORY QUERY TESTS
// ============================================================================

describe('History Queries', () => {
  beforeEach(() => {
    // Create some test records
    recordEnhancement(createMockMetrics({ qualityScore: 60 }), {
      contentType: 'business',
      modelId: 'llama-3.2-3b',
      processingTimeMs: 5000,
    });
    
    recordEnhancement(createMockMetrics({ qualityScore: 80 }), {
      contentType: 'technical',
      modelId: 'qwen-0.5b',
      processingTimeMs: 2000,
    });
    
    recordEnhancement(createMockMetrics({ qualityScore: 70 }), {
      contentType: 'business',
      modelId: 'llama-3.2-3b',
      processingTimeMs: 4000,
    });
  });

  describe('getEnhancementHistory', () => {
    test('returns all records by default', () => {
      const history = getEnhancementHistory();
      
      expect(history.length).toBe(3);
    });

    test('filters by content type', () => {
      const history = getEnhancementHistory({ contentType: 'business' });
      
      expect(history.length).toBe(2);
      expect(history.every(r => r.contentType === 'business')).toBe(true);
    });

    test('filters by model', () => {
      const history = getEnhancementHistory({ modelId: 'qwen-0.5b' });
      
      expect(history.length).toBe(1);
      expect(history[0].modelId).toBe('qwen-0.5b');
    });

    test('filters by minimum quality score', () => {
      const history = getEnhancementHistory({ minQualityScore: 70 });
      
      expect(history.length).toBe(2);
      expect(history.every(r => r.qualityScore >= 70)).toBe(true);
    });

    test('sorts by quality score', () => {
      const history = getEnhancementHistory({
        sortBy: 'qualityScore',
        sortOrder: 'desc',
      });
      
      expect(history[0].qualityScore).toBe(80);
      expect(history[history.length - 1].qualityScore).toBe(60);
    });

    test('respects limit', () => {
      const history = getEnhancementHistory({ limit: 2 });
      
      expect(history.length).toBe(2);
    });

    test('filters by hasRating', () => {
      // Add rating to one record
      const records = getEnhancementHistory();
      saveFeedback(records[0].id, { rating: 5 });
      
      const withRating = getEnhancementHistory({ hasRating: true });
      const withoutRating = getEnhancementHistory({ hasRating: false });
      
      expect(withRating.length).toBe(1);
      expect(withoutRating.length).toBe(2);
    });
  });

  describe('getContentTypes', () => {
    test('returns unique content types', () => {
      const types = getContentTypes();
      
      expect(types).toContain('business');
      expect(types).toContain('technical');
      expect(types.length).toBe(2);
    });
  });

  describe('getModelsUsed', () => {
    test('returns unique model IDs', () => {
      const models = getModelsUsed();
      
      expect(models).toContain('llama-3.2-3b');
      expect(models).toContain('qwen-0.5b');
      expect(models.length).toBe(2);
    });
  });
});

// ============================================================================
// TREND ANALYSIS TESTS
// ============================================================================

describe('Trend Analysis', () => {
  describe('getQualityTrend', () => {
    test('returns empty array when no records', () => {
      const trend = getQualityTrend();
      
      expect(trend).toEqual([]);
    });

    test('groups by date', () => {
      // Create records (all should be today)
      recordEnhancement(createMockMetrics({ qualityScore: 70 }), {
        contentType: 'business',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 5000,
      });
      
      recordEnhancement(createMockMetrics({ qualityScore: 80 }), {
        contentType: 'business',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 5000,
      });
      
      const trend = getQualityTrend(30);
      
      expect(trend.length).toBe(1); // All today
      expect(trend[0].avgQualityScore).toBe(75); // (70+80)/2
      expect(trend[0].count).toBe(2);
    });
  });

  describe('compareModelPerformance', () => {
    test('compares models correctly', () => {
      recordEnhancement(createMockMetrics({ qualityScore: 80 }), {
        contentType: 'business',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 5000,
      });
      
      recordEnhancement(createMockMetrics({ qualityScore: 60 }), {
        contentType: 'business',
        modelId: 'qwen-0.5b',
        processingTimeMs: 2000,
      });
      
      const comparison = compareModelPerformance();
      
      expect(comparison.length).toBe(2);
      // Should be sorted by quality score descending
      expect(comparison[0].modelId).toBe('llama-3.2-3b');
      expect(comparison[0].avgQualityScore).toBe(80);
      expect(comparison[1].modelId).toBe('qwen-0.5b');
      expect(comparison[1].avgProcessingTime).toBe(2000);
    });

    test('calculates satisfaction rate with ratings', () => {
      const r1 = recordEnhancement(createMockMetrics({ qualityScore: 80 }), {
        contentType: 'business',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 5000,
      });
      
      const r2 = recordEnhancement(createMockMetrics({ qualityScore: 75 }), {
        contentType: 'business',
        modelId: 'llama-3.2-3b',
        processingTimeMs: 5000,
      });
      
      saveFeedback(r1!.id, { rating: 5 });
      saveFeedback(r2!.id, { rating: 3 });
      
      const comparison = compareModelPerformance();
      const llamaStats = comparison.find(c => c.modelId === 'llama-3.2-3b');
      
      expect(llamaStats?.avgRating).toBe(4); // (5+3)/2
      expect(llamaStats?.satisfactionRate).toBe(50); // 1/2 satisfied
    });
  });
});

