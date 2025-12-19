/**
 * @jest-environment jsdom
 */

/**
 * Tests for Feedback Manager
 * 
 * Tests cover:
 * - Session ID generation
 * - Record CRUD operations
 * - Feedback storage and retrieval
 * - Analytics calculations
 * - Storage limits and cleanup
 */

import {
  getOrCreateSessionId,
  generateEnhancementId,
  getAllRecords,
  saveEnhancementRecord,
  getRecord,
  updateRecord,
  saveFeedback,
  getFeedback,
  hasFeedback,
  calculateFeedbackAnalytics,
  getRecentFeedback,
  exportAllData,
  clearAllData,
  getStorageStats,
} from '@/utils/feedbackManager';

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
// SESSION ID TESTS
// ============================================================================

describe('Session Management', () => {
  describe('getOrCreateSessionId', () => {
    test('creates new session ID on first call', () => {
      const sessionId = getOrCreateSessionId();
      
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    test('returns same session ID on subsequent calls', () => {
      const first = getOrCreateSessionId();
      const second = getOrCreateSessionId();
      
      expect(first).toBe(second);
    });

    test('stores session ID in sessionStorage', () => {
      const sessionId = getOrCreateSessionId();
      const stored = sessionStorage.getItem('mediaforge_session_id');
      
      expect(stored).toBe(sessionId);
    });
  });

  describe('generateEnhancementId', () => {
    test('generates unique IDs', () => {
      const id1 = generateEnhancementId();
      const id2 = generateEnhancementId();
      
      expect(id1).not.toBe(id2);
    });

    test('follows expected format', () => {
      const id = generateEnhancementId();
      
      expect(id).toMatch(/^enh_\d+_[a-z0-9]+$/);
    });
  });
});

// ============================================================================
// RECORD OPERATIONS TESTS
// ============================================================================

describe('Record Operations', () => {
  const mockRecord = {
    qualityScore: 75,
    confidenceScore: 0.85,
    readabilityDelta: 5.2,
    compressionRatio: 0.82,
    originalWordCount: 100,
    enhancedWordCount: 82,
    contentType: 'business',
    modelId: 'llama-3.2-3b',
    processingTimeMs: 5000,
  };

  describe('saveEnhancementRecord', () => {
    test('saves record successfully', () => {
      const saved = saveEnhancementRecord(mockRecord);
      
      expect(saved).not.toBeNull();
      expect(saved?.id).toBeDefined();
      expect(saved?.timestamp).toBeDefined();
      expect(saved?.qualityScore).toBe(75);
    });

    test('generates unique ID', () => {
      const saved1 = saveEnhancementRecord(mockRecord);
      const saved2 = saveEnhancementRecord(mockRecord);
      
      expect(saved1?.id).not.toBe(saved2?.id);
    });

    test('adds timestamp', () => {
      const saved = saveEnhancementRecord(mockRecord);
      
      expect(saved?.timestamp).toBeDefined();
      expect(new Date(saved!.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('getAllRecords', () => {
    test('returns empty array when no records', () => {
      const records = getAllRecords();
      
      expect(records).toEqual([]);
    });

    test('returns saved records', () => {
      saveEnhancementRecord(mockRecord);
      saveEnhancementRecord(mockRecord);
      
      const records = getAllRecords();
      
      expect(records).toHaveLength(2);
    });
  });

  describe('getRecord', () => {
    test('returns record by ID', () => {
      const saved = saveEnhancementRecord(mockRecord);
      const retrieved = getRecord(saved!.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(saved?.id);
      expect(retrieved?.qualityScore).toBe(75);
    });

    test('returns null for non-existent ID', () => {
      const retrieved = getRecord('non_existent_id');
      
      expect(retrieved).toBeNull();
    });
  });

  describe('updateRecord', () => {
    test('updates existing record', () => {
      const saved = saveEnhancementRecord(mockRecord);
      const updated = updateRecord(saved!.id, { qualityScore: 90 });
      
      expect(updated).not.toBeNull();
      expect(updated?.qualityScore).toBe(90);
      // Other fields should be preserved
      expect(updated?.contentType).toBe('business');
    });

    test('returns null for non-existent ID', () => {
      const updated = updateRecord('non_existent_id', { qualityScore: 90 });
      
      expect(updated).toBeNull();
    });

    test('does not allow changing ID', () => {
      const saved = saveEnhancementRecord(mockRecord);
      const updated = updateRecord(saved!.id, { id: 'new_id' } as any);
      
      expect(updated?.id).toBe(saved?.id);
    });
  });
});

// ============================================================================
// FEEDBACK TESTS
// ============================================================================

describe('Feedback Operations', () => {
  const mockRecord = {
    qualityScore: 75,
    confidenceScore: 0.85,
    readabilityDelta: 5.2,
    compressionRatio: 0.82,
    originalWordCount: 100,
    enhancedWordCount: 82,
    contentType: 'business',
    modelId: 'llama-3.2-3b',
    processingTimeMs: 5000,
  };

  describe('saveFeedback', () => {
    test('saves feedback for existing record', () => {
      const saved = saveEnhancementRecord(mockRecord);
      const success = saveFeedback(saved!.id, {
        rating: 4,
        issues: ['technical_errors'],
        comments: 'Good enhancement',
      });
      
      expect(success).toBe(true);
    });

    test('returns false for non-existent record', () => {
      const success = saveFeedback('non_existent_id', { rating: 4 });
      
      expect(success).toBe(false);
    });

    test('validates rating is 1-5', () => {
      const saved = saveEnhancementRecord(mockRecord);
      
      expect(saveFeedback(saved!.id, { rating: 0 as any })).toBe(false);
      expect(saveFeedback(saved!.id, { rating: 6 as any })).toBe(false);
      expect(saveFeedback(saved!.id, { rating: 3 })).toBe(true);
    });

    test('truncates long comments', () => {
      const saved = saveEnhancementRecord(mockRecord);
      const longComment = 'a'.repeat(1000);
      
      saveFeedback(saved!.id, { rating: 4, comments: longComment });
      
      const feedback = getFeedback(saved!.id);
      expect(feedback?.comments?.length).toBeLessThanOrEqual(500);
    });
  });

  describe('getFeedback', () => {
    test('retrieves saved feedback', () => {
      const saved = saveEnhancementRecord(mockRecord);
      saveFeedback(saved!.id, {
        rating: 4,
        issues: ['tone_wrong'],
        comments: 'Test comment',
      });
      
      const feedback = getFeedback(saved!.id);
      
      expect(feedback).not.toBeNull();
      expect(feedback?.rating).toBe(4);
      expect(feedback?.issues).toContain('tone_wrong');
      expect(feedback?.comments).toBe('Test comment');
    });

    test('returns null for record without feedback', () => {
      const saved = saveEnhancementRecord(mockRecord);
      const feedback = getFeedback(saved!.id);
      
      expect(feedback).toBeNull();
    });

    test('returns null for non-existent record', () => {
      const feedback = getFeedback('non_existent_id');
      
      expect(feedback).toBeNull();
    });
  });

  describe('hasFeedback', () => {
    test('returns true when feedback exists', () => {
      const saved = saveEnhancementRecord(mockRecord);
      saveFeedback(saved!.id, { rating: 4 });
      
      expect(hasFeedback(saved!.id)).toBe(true);
    });

    test('returns false when no feedback', () => {
      const saved = saveEnhancementRecord(mockRecord);
      
      expect(hasFeedback(saved!.id)).toBe(false);
    });
  });
});

// ============================================================================
// ANALYTICS TESTS
// ============================================================================

describe('Feedback Analytics', () => {
  const mockRecord = {
    qualityScore: 75,
    confidenceScore: 0.85,
    readabilityDelta: 5.2,
    compressionRatio: 0.82,
    originalWordCount: 100,
    enhancedWordCount: 82,
    contentType: 'business',
    modelId: 'llama-3.2-3b',
    processingTimeMs: 5000,
  };

  describe('calculateFeedbackAnalytics', () => {
    test('returns zeros when no feedback', () => {
      const analytics = calculateFeedbackAnalytics();
      
      expect(analytics.totalFeedbacks).toBe(0);
      expect(analytics.averageRating).toBe(0);
      expect(analytics.satisfactionRate).toBe(0);
    });

    test('calculates average rating correctly', () => {
      // Create records with ratings 3, 4, 5
      const r1 = saveEnhancementRecord(mockRecord);
      const r2 = saveEnhancementRecord(mockRecord);
      const r3 = saveEnhancementRecord(mockRecord);
      
      saveFeedback(r1!.id, { rating: 3 });
      saveFeedback(r2!.id, { rating: 4 });
      saveFeedback(r3!.id, { rating: 5 });
      
      const analytics = calculateFeedbackAnalytics();
      
      expect(analytics.totalFeedbacks).toBe(3);
      expect(analytics.averageRating).toBe(4); // (3+4+5)/3
    });

    test('calculates rating distribution', () => {
      const r1 = saveEnhancementRecord(mockRecord);
      const r2 = saveEnhancementRecord(mockRecord);
      const r3 = saveEnhancementRecord(mockRecord);
      
      saveFeedback(r1!.id, { rating: 5 });
      saveFeedback(r2!.id, { rating: 5 });
      saveFeedback(r3!.id, { rating: 3 });
      
      const analytics = calculateFeedbackAnalytics();
      
      expect(analytics.ratingDistribution[5]).toBe(2);
      expect(analytics.ratingDistribution[3]).toBe(1);
      expect(analytics.ratingDistribution[1]).toBe(0);
    });

    test('calculates satisfaction rate', () => {
      // 2 satisfied (4,5), 1 not (3)
      const r1 = saveEnhancementRecord(mockRecord);
      const r2 = saveEnhancementRecord(mockRecord);
      const r3 = saveEnhancementRecord(mockRecord);
      
      saveFeedback(r1!.id, { rating: 5 });
      saveFeedback(r2!.id, { rating: 4 });
      saveFeedback(r3!.id, { rating: 3 });
      
      const analytics = calculateFeedbackAnalytics();
      
      expect(analytics.satisfactionRate).toBe(67); // 2/3 ≈ 67%
    });

    test('tracks issue frequency', () => {
      const r1 = saveEnhancementRecord(mockRecord);
      const r2 = saveEnhancementRecord(mockRecord);
      
      saveFeedback(r1!.id, { rating: 2, issues: ['tone_wrong', 'too_formal'] });
      saveFeedback(r2!.id, { rating: 3, issues: ['tone_wrong'] });
      
      const analytics = calculateFeedbackAnalytics();
      
      expect(analytics.issueFrequency['tone_wrong']).toBe(2);
      expect(analytics.issueFrequency['too_formal']).toBe(1);
    });

    test('identifies top issues', () => {
      const r1 = saveEnhancementRecord(mockRecord);
      const r2 = saveEnhancementRecord(mockRecord);
      const r3 = saveEnhancementRecord(mockRecord);
      
      saveFeedback(r1!.id, { rating: 2, issues: ['tone_wrong', 'technical_errors'] });
      saveFeedback(r2!.id, { rating: 2, issues: ['tone_wrong', 'meaning_changed'] });
      saveFeedback(r3!.id, { rating: 3, issues: ['tone_wrong'] });
      
      const analytics = calculateFeedbackAnalytics();
      
      expect(analytics.topIssues[0]).toBe('tone_wrong'); // Most frequent
    });
  });

  describe('getRecentFeedback', () => {
    test('returns recent feedback sorted by date', () => {
      const r1 = saveEnhancementRecord(mockRecord);
      const r2 = saveEnhancementRecord(mockRecord);
      
      saveFeedback(r1!.id, { rating: 3 });
      saveFeedback(r2!.id, { rating: 5 });
      
      const recent = getRecentFeedback(10);
      
      expect(recent.length).toBe(2);
      // Both should have ratings
      expect(recent.every(r => r.userRating !== undefined)).toBe(true);
      // Total ratings should match what we saved
      const ratings = recent.map(r => r.userRating).sort();
      expect(ratings).toEqual([3, 5]);
    });

    test('respects limit', () => {
      for (let i = 0; i < 5; i++) {
        const r = saveEnhancementRecord(mockRecord);
        saveFeedback(r!.id, { rating: 4 });
      }
      
      const recent = getRecentFeedback(3);
      
      expect(recent.length).toBe(3);
    });
  });
});

// ============================================================================
// DATA EXPORT & CLEANUP TESTS
// ============================================================================

describe('Data Management', () => {
  const mockRecord = {
    qualityScore: 75,
    confidenceScore: 0.85,
    readabilityDelta: 5.2,
    compressionRatio: 0.82,
    originalWordCount: 100,
    enhancedWordCount: 82,
    contentType: 'business',
    modelId: 'llama-3.2-3b',
    processingTimeMs: 5000,
  };

  describe('exportAllData', () => {
    test('exports all data as JSON', () => {
      saveEnhancementRecord(mockRecord);
      
      const exported = exportAllData();
      const parsed = JSON.parse(exported);
      
      expect(parsed).toHaveProperty('records');
      expect(parsed).toHaveProperty('analytics');
      expect(parsed).toHaveProperty('exportedAt');
      expect(parsed).toHaveProperty('version');
      expect(parsed.records.length).toBe(1);
    });

    test('exports empty data correctly', () => {
      const exported = exportAllData();
      const parsed = JSON.parse(exported);
      
      expect(parsed.records).toEqual([]);
    });
  });

  describe('clearAllData', () => {
    test('removes all records', () => {
      saveEnhancementRecord(mockRecord);
      saveEnhancementRecord(mockRecord);
      
      expect(getAllRecords().length).toBe(2);
      
      clearAllData();
      
      expect(getAllRecords().length).toBe(0);
    });
  });

  describe('getStorageStats', () => {
    test('returns accurate stats', () => {
      const r1 = saveEnhancementRecord(mockRecord);
      const r2 = saveEnhancementRecord(mockRecord);
      saveFeedback(r1!.id, { rating: 4 });
      
      const stats = getStorageStats();
      
      expect(stats.recordCount).toBe(2);
      expect(stats.feedbackCount).toBe(1);
      expect(stats.estimatedSizeKB).toBeGreaterThan(0);
      expect(stats.oldestRecord).toBeDefined();
      expect(stats.newestRecord).toBeDefined();
    });

    test('handles empty storage', () => {
      const stats = getStorageStats();
      
      expect(stats.recordCount).toBe(0);
      expect(stats.feedbackCount).toBe(0);
      expect(stats.oldestRecord).toBeNull();
      expect(stats.newestRecord).toBeNull();
    });
  });
});

// ============================================================================
// STORAGE LIMITS TESTS
// ============================================================================

describe('Storage Limits', () => {
  const mockRecord = {
    qualityScore: 75,
    confidenceScore: 0.85,
    readabilityDelta: 5.2,
    compressionRatio: 0.82,
    originalWordCount: 100,
    enhancedWordCount: 82,
    contentType: 'business',
    modelId: 'llama-3.2-3b',
    processingTimeMs: 5000,
  };

  test('enforces maximum record limit', () => {
    // Save 105 records
    for (let i = 0; i < 105; i++) {
      saveEnhancementRecord({ ...mockRecord, qualityScore: i });
    }
    
    const records = getAllRecords();
    
    // Should be capped at 100
    expect(records.length).toBe(100);
    // Oldest records should be removed (FIFO)
    expect(records[0].qualityScore).toBe(5); // First 5 were removed
  });
});
