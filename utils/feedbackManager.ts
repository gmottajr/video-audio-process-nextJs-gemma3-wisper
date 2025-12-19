/**
 * Feedback Manager
 * 
 * Manages user feedback collection, storage, and retrieval.
 * All data stored locally in localStorage - never sent to server.
 * 
 * @module utils/feedbackManager
 */

import type {
  UserFeedback,
  FeedbackIssue,
  StoredEnhancementRecord,
  FeedbackAnalytics,
} from '@/types/quality-metrics';

// ============================================================================
// CONSTANTS
// ============================================================================

/** localStorage key for enhancement records */
const STORAGE_KEY = 'mediaforge_enhancement_records';

/** sessionStorage key for session ID */
const SESSION_KEY = 'mediaforge_session_id';

/** Maximum number of records to store */
const MAX_RECORDS = 100;

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Get or create a session ID
 * Session persists until browser tab/window is closed
 * 
 * @returns Session ID string
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return `session_server_${Date.now()}`;
  }
  
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    sessionId = `session_${timestamp}_${random}`;
    
    try {
      sessionStorage.setItem(SESSION_KEY, sessionId);
    } catch (err) {
      console.warn('[FeedbackManager] Failed to store session ID:', err);
    }
  }
  
  return sessionId;
}

/**
 * Generate a unique enhancement ID
 * 
 * @returns Enhancement ID string (format: "enh_timestamp_random")
 */
export function generateEnhancementId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `enh_${timestamp}_${random}`;
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Get all stored enhancement records
 * 
 * @returns Array of stored records (may be empty, never null)
 */
export function getAllRecords(): StoredEnhancementRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const records: StoredEnhancementRecord[] = JSON.parse(stored);
    return Array.isArray(records) ? records : [];
  } catch (err) {
    console.error('[FeedbackManager] Failed to read records:', err);
    return [];
  }
}

/**
 * Save records to localStorage
 * 
 * @param records - Records to save
 * @returns Success boolean
 */
function saveRecords(records: StoredEnhancementRecord[]): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (err) {
    if ((err as Error).name === 'QuotaExceededError') {
      console.error('[FeedbackManager] Storage quota exceeded, cleaning up...');
      // Remove oldest 10 entries and retry
      const trimmed = records.slice(10);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        console.log('[FeedbackManager] Cleaned up storage and saved');
        return true;
      } catch (retryErr) {
        console.error('[FeedbackManager] Failed to save even after cleanup:', retryErr);
        return false;
      }
    }
    console.error('[FeedbackManager] Failed to save records:', err);
    return false;
  }
}

// ============================================================================
// RECORD MANAGEMENT
// ============================================================================

/**
 * Save a new enhancement record
 * 
 * @param record - Record to save (without feedback fields)
 * @returns The saved record with generated ID, or null on failure
 */
export function saveEnhancementRecord(
  record: Omit<StoredEnhancementRecord, 'id' | 'timestamp'>
): StoredEnhancementRecord | null {
  const id = generateEnhancementId();
  const timestamp = new Date().toISOString();
  
  const completeRecord: StoredEnhancementRecord = {
    ...record,
    id,
    timestamp,
  };
  
  const records = getAllRecords();
  records.push(completeRecord);
  
  // Enforce max records (FIFO)
  while (records.length > MAX_RECORDS) {
    const removed = records.shift();
    console.log('[FeedbackManager] Removed oldest record:', removed?.id);
  }
  
  if (saveRecords(records)) {
    console.log('[FeedbackManager] Saved enhancement record:', id);
    return completeRecord;
  }
  
  return null;
}

/**
 * Get a specific enhancement record by ID
 * 
 * @param enhancementId - The enhancement ID to find
 * @returns The record if found, null otherwise
 */
export function getRecord(enhancementId: string): StoredEnhancementRecord | null {
  const records = getAllRecords();
  return records.find(r => r.id === enhancementId) || null;
}

/**
 * Update an existing enhancement record
 * 
 * @param enhancementId - The enhancement ID to update
 * @param updates - Partial record with fields to update
 * @returns Updated record or null if not found
 */
export function updateRecord(
  enhancementId: string,
  updates: Partial<StoredEnhancementRecord>
): StoredEnhancementRecord | null {
  const records = getAllRecords();
  const index = records.findIndex(r => r.id === enhancementId);
  
  if (index === -1) {
    console.warn('[FeedbackManager] Record not found:', enhancementId);
    return null;
  }
  
  // Merge updates (don't allow changing id or timestamp)
  const { id: _id, timestamp: _ts, ...safeUpdates } = updates;
  records[index] = { ...records[index], ...safeUpdates };
  
  if (saveRecords(records)) {
    console.log('[FeedbackManager] Updated record:', enhancementId);
    return records[index];
  }
  
  return null;
}

// ============================================================================
// FEEDBACK OPERATIONS
// ============================================================================

/**
 * Save user feedback for an enhancement
 * 
 * @param enhancementId - The enhancement ID to attach feedback to
 * @param feedback - User feedback (without timestamp/sessionId)
 * @returns Success boolean
 */
export function saveFeedback(
  enhancementId: string,
  feedback: Omit<UserFeedback, 'timestamp' | 'sessionId'>
): boolean {
  // Validate inputs
  if (!enhancementId || typeof enhancementId !== 'string') {
    console.error('[FeedbackManager] Invalid enhancementId:', enhancementId);
    return false;
  }
  
  if (!feedback || !feedback.rating || feedback.rating < 1 || feedback.rating > 5) {
    console.error('[FeedbackManager] Invalid feedback - rating must be 1-5');
    return false;
  }
  
  const records = getAllRecords();
  const index = records.findIndex(r => r.id === enhancementId);
  
  if (index === -1) {
    console.warn('[FeedbackManager] Record not found for feedback:', enhancementId);
    return false;
  }
  
  // Add feedback fields to record
  records[index] = {
    ...records[index],
    userRating: feedback.rating,
    userIssues: feedback.issues,
    userComments: feedback.comments?.substring(0, 500), // Enforce max length
    feedbackTimestamp: new Date().toISOString(),
  };
  
  if (saveRecords(records)) {
    console.log('[FeedbackManager] Feedback saved for:', enhancementId);
    return true;
  }
  
  return false;
}

/**
 * Get feedback for a specific enhancement
 * 
 * @param enhancementId - The enhancement ID
 * @returns UserFeedback if exists, null otherwise
 */
export function getFeedback(enhancementId: string): UserFeedback | null {
  const record = getRecord(enhancementId);
  
  if (!record || !record.userRating) {
    return null;
  }
  
  return {
    rating: record.userRating,
    issues: record.userIssues,
    comments: record.userComments,
    timestamp: record.feedbackTimestamp || record.timestamp,
    sessionId: getOrCreateSessionId(),
  };
}

/**
 * Check if an enhancement has feedback
 * 
 * @param enhancementId - The enhancement ID
 * @returns Boolean indicating if feedback exists
 */
export function hasFeedback(enhancementId: string): boolean {
  const record = getRecord(enhancementId);
  return record?.userRating !== undefined;
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Calculate feedback analytics from all records
 * 
 * @returns FeedbackAnalytics summary
 */
export function calculateFeedbackAnalytics(): FeedbackAnalytics {
  const records = getAllRecords();
  const withFeedback = records.filter(r => r.userRating !== undefined);
  
  if (withFeedback.length === 0) {
    return {
      totalFeedbacks: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      issueFrequency: {},
      topIssues: [],
      satisfactionRate: 0,
    };
  }
  
  // Calculate rating distribution
  const ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRating = 0;
  let satisfiedCount = 0;
  
  for (const record of withFeedback) {
    const rating = record.userRating!;
    ratingDistribution[rating]++;
    totalRating += rating;
    if (rating >= 4) satisfiedCount++;
  }
  
  // Calculate issue frequency
  const issueFrequency: Partial<Record<FeedbackIssue, number>> = {};
  for (const record of withFeedback) {
    if (record.userIssues) {
      for (const issue of record.userIssues) {
        issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
      }
    }
  }
  
  // Get top 3 issues
  const topIssues = Object.entries(issueFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([issue]) => issue as FeedbackIssue);
  
  return {
    totalFeedbacks: withFeedback.length,
    averageRating: Math.round((totalRating / withFeedback.length) * 10) / 10,
    ratingDistribution,
    issueFrequency,
    topIssues,
    satisfactionRate: Math.round((satisfiedCount / withFeedback.length) * 100),
  };
}

/**
 * Get recent feedback entries
 * 
 * @param limit - Maximum number of entries to return
 * @returns Array of recent records with feedback
 */
export function getRecentFeedback(limit: number = 10): StoredEnhancementRecord[] {
  const records = getAllRecords();
  return records
    .filter(r => r.userRating !== undefined)
    .sort((a, b) => new Date(b.feedbackTimestamp || b.timestamp).getTime() - 
                    new Date(a.feedbackTimestamp || a.timestamp).getTime())
    .slice(0, limit);
}

// ============================================================================
// DATA EXPORT & CLEANUP
// ============================================================================

/**
 * Export all data as JSON string
 * 
 * @returns JSON string with all records and analytics
 */
export function exportAllData(): string {
  const records = getAllRecords();
  const analytics = calculateFeedbackAnalytics();
  
  return JSON.stringify({
    records,
    analytics,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }, null, 2);
}

/**
 * Clear all stored data
 * 
 * WARNING: This is destructive and cannot be undone!
 */
export function clearAllData(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[FeedbackManager] All data cleared');
  } catch (err) {
    console.error('[FeedbackManager] Failed to clear data:', err);
  }
}

/**
 * Get storage statistics
 * 
 * @returns Object with storage stats
 */
export function getStorageStats(): {
  recordCount: number;
  feedbackCount: number;
  estimatedSizeKB: number;
  oldestRecord: string | null;
  newestRecord: string | null;
} {
  const records = getAllRecords();
  const withFeedback = records.filter(r => r.userRating !== undefined);
  
  // Estimate size
  const stored = localStorage.getItem(STORAGE_KEY) || '';
  const estimatedSizeKB = Math.round((stored.length * 2) / 1024); // UTF-16 = 2 bytes per char
  
  // Get date range
  const sorted = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  return {
    recordCount: records.length,
    feedbackCount: withFeedback.length,
    estimatedSizeKB,
    oldestRecord: sorted[0]?.timestamp || null,
    newestRecord: sorted[sorted.length - 1]?.timestamp || null,
  };
}
