/**
 * Enhancement History Manager
 * 
 * Provides higher-level analytics and history management for enhancements.
 * Works on top of feedbackManager for storage.
 * 
 * @module utils/enhancementHistoryManager
 */

import type {
  StoredEnhancementRecord,
  EnhancementAnalytics,
  AnalyticsSummary,
  EnhancementQualityMetrics,
} from '@/types/quality-metrics';

import {
  getAllRecords,
  saveEnhancementRecord,
  getRecord,
  calculateFeedbackAnalytics,
} from './feedbackManager';

// ============================================================================
// RECORD CREATION HELPERS
// ============================================================================

/**
 * Create and save an enhancement record from metrics
 * 
 * @param metrics - Quality metrics from enhancement
 * @param context - Additional context about the enhancement
 * @returns The saved record or null on failure
 */
export function recordEnhancement(
  metrics: EnhancementQualityMetrics,
  context: {
    contentType: string;
    modelId: string;
    processingTimeMs: number;
  }
): StoredEnhancementRecord | null {
  return saveEnhancementRecord({
    qualityScore: metrics.qualityScore,
    confidenceScore: metrics.confidenceScore,
    readabilityDelta: metrics.readabilityImprovement,
    compressionRatio: metrics.compressionRatio,
    originalWordCount: metrics.originalWordCount,
    enhancedWordCount: metrics.enhancedWordCount,
    contentType: context.contentType,
    modelId: context.modelId,
    processingTimeMs: context.processingTimeMs,
  });
}

// ============================================================================
// ANALYTICS CALCULATIONS
// ============================================================================

/**
 * Calculate enhancement performance analytics
 * 
 * @returns EnhancementAnalytics summary
 */
export function calculateEnhancementAnalytics(): EnhancementAnalytics {
  const records = getAllRecords();
  
  if (records.length === 0) {
    return {
      totalEnhancements: 0,
      averageQualityScore: 0,
      averageProcessingTime: 0,
      averageCompressionRatio: 0,
      averageReadabilityImprovement: 0,
      byContentType: {},
      byModel: {},
    };
  }
  
  // Calculate overall metrics
  let totalQuality = 0;
  let totalProcessing = 0;
  let totalCompression = 0;
  let totalReadability = 0;
  
  // Group by content type
  const byContentType: Record<string, {
    count: number;
    totalQuality: number;
    totalRating: number;
    ratingCount: number;
  }> = {};
  
  // Group by model
  const byModel: Record<string, {
    count: number;
    totalQuality: number;
    totalProcessing: number;
  }> = {};
  
  for (const record of records) {
    totalQuality += record.qualityScore;
    totalProcessing += record.processingTimeMs;
    totalCompression += record.compressionRatio;
    totalReadability += record.readabilityDelta;
    
    // Aggregate by content type
    const ct = record.contentType || 'unknown';
    if (!byContentType[ct]) {
      byContentType[ct] = { count: 0, totalQuality: 0, totalRating: 0, ratingCount: 0 };
    }
    byContentType[ct].count++;
    byContentType[ct].totalQuality += record.qualityScore;
    if (record.userRating) {
      byContentType[ct].totalRating += record.userRating;
      byContentType[ct].ratingCount++;
    }
    
    // Aggregate by model
    const model = record.modelId || 'unknown';
    if (!byModel[model]) {
      byModel[model] = { count: 0, totalQuality: 0, totalProcessing: 0 };
    }
    byModel[model].count++;
    byModel[model].totalQuality += record.qualityScore;
    byModel[model].totalProcessing += record.processingTimeMs;
  }
  
  // Calculate final by-content-type stats
  const byContentTypeFinal: Record<string, { count: number; avgQualityScore: number; avgRating: number }> = {};
  for (const [ct, data] of Object.entries(byContentType)) {
    byContentTypeFinal[ct] = {
      count: data.count,
      avgQualityScore: Math.round((data.totalQuality / data.count) * 10) / 10,
      avgRating: data.ratingCount > 0 
        ? Math.round((data.totalRating / data.ratingCount) * 10) / 10 
        : 0,
    };
  }
  
  // Calculate final by-model stats
  const byModelFinal: Record<string, { count: number; avgQualityScore: number; avgProcessingTime: number }> = {};
  for (const [model, data] of Object.entries(byModel)) {
    byModelFinal[model] = {
      count: data.count,
      avgQualityScore: Math.round((data.totalQuality / data.count) * 10) / 10,
      avgProcessingTime: Math.round(data.totalProcessing / data.count),
    };
  }
  
  return {
    totalEnhancements: records.length,
    averageQualityScore: Math.round((totalQuality / records.length) * 10) / 10,
    averageProcessingTime: Math.round(totalProcessing / records.length),
    averageCompressionRatio: Math.round((totalCompression / records.length) * 100) / 100,
    averageReadabilityImprovement: Math.round((totalReadability / records.length) * 10) / 10,
    byContentType: byContentTypeFinal,
    byModel: byModelFinal,
  };
}

/**
 * Get complete analytics summary
 * 
 * @returns AnalyticsSummary with feedback and enhancement analytics
 */
export function getAnalyticsSummary(): AnalyticsSummary {
  return {
    feedback: calculateFeedbackAnalytics(),
    enhancement: calculateEnhancementAnalytics(),
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// HISTORY QUERIES
// ============================================================================

/**
 * Get enhancement history with optional filters
 * 
 * @param options - Filter options
 * @returns Filtered array of records
 */
export function getEnhancementHistory(options: {
  limit?: number;
  contentType?: string;
  modelId?: string;
  minQualityScore?: number;
  hasRating?: boolean;
  sortBy?: 'timestamp' | 'qualityScore' | 'rating';
  sortOrder?: 'asc' | 'desc';
} = {}): StoredEnhancementRecord[] {
  let records = getAllRecords();
  
  // Apply filters
  if (options.contentType) {
    records = records.filter(r => r.contentType === options.contentType);
  }
  if (options.modelId) {
    records = records.filter(r => r.modelId === options.modelId);
  }
  if (options.minQualityScore !== undefined) {
    records = records.filter(r => r.qualityScore >= options.minQualityScore!);
  }
  if (options.hasRating !== undefined) {
    records = options.hasRating 
      ? records.filter(r => r.userRating !== undefined)
      : records.filter(r => r.userRating === undefined);
  }
  
  // Sort
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
  switch (options.sortBy) {
    case 'qualityScore':
      records.sort((a, b) => (a.qualityScore - b.qualityScore) * sortOrder);
      break;
    case 'rating':
      records.sort((a, b) => ((a.userRating || 0) - (b.userRating || 0)) * sortOrder);
      break;
    case 'timestamp':
    default:
      records.sort((a, b) => 
        (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * sortOrder
      );
  }
  
  // Apply limit
  if (options.limit && options.limit > 0) {
    records = records.slice(0, options.limit);
  }
  
  return records;
}

/**
 * Get unique content types from history
 * 
 * @returns Array of content type strings
 */
export function getContentTypes(): string[] {
  const records = getAllRecords();
  const types = new Set<string>();
  
  for (const record of records) {
    if (record.contentType) {
      types.add(record.contentType);
    }
  }
  
  return Array.from(types);
}

/**
 * Get unique models used from history
 * 
 * @returns Array of model ID strings
 */
export function getModelsUsed(): string[] {
  const records = getAllRecords();
  const models = new Set<string>();
  
  for (const record of records) {
    if (record.modelId) {
      models.add(record.modelId);
    }
  }
  
  return Array.from(models);
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Get quality trend over time
 * 
 * @param days - Number of days to analyze (default 30)
 * @returns Array of daily averages
 */
export function getQualityTrend(days: number = 30): Array<{
  date: string;
  avgQualityScore: number;
  avgRating: number;
  count: number;
}> {
  const records = getAllRecords();
  const now = Date.now();
  const cutoff = now - (days * 24 * 60 * 60 * 1000);
  
  // Filter to date range
  const recentRecords = records.filter(
    r => new Date(r.timestamp).getTime() >= cutoff
  );
  
  // Group by date
  const byDate: Record<string, {
    totalQuality: number;
    totalRating: number;
    ratingCount: number;
    count: number;
  }> = {};
  
  for (const record of recentRecords) {
    const date = record.timestamp.split('T')[0]; // YYYY-MM-DD
    
    if (!byDate[date]) {
      byDate[date] = { totalQuality: 0, totalRating: 0, ratingCount: 0, count: 0 };
    }
    
    byDate[date].totalQuality += record.qualityScore;
    byDate[date].count++;
    
    if (record.userRating) {
      byDate[date].totalRating += record.userRating;
      byDate[date].ratingCount++;
    }
  }
  
  // Convert to array and sort by date
  return Object.entries(byDate)
    .map(([date, data]) => ({
      date,
      avgQualityScore: Math.round((data.totalQuality / data.count) * 10) / 10,
      avgRating: data.ratingCount > 0 
        ? Math.round((data.totalRating / data.ratingCount) * 10) / 10 
        : 0,
      count: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get performance comparison between models
 * 
 * @returns Comparison data for each model
 */
export function compareModelPerformance(): Array<{
  modelId: string;
  count: number;
  avgQualityScore: number;
  avgProcessingTime: number;
  avgRating: number;
  satisfactionRate: number;
}> {
  const records = getAllRecords();
  
  // Group by model
  const byModel: Record<string, {
    count: number;
    totalQuality: number;
    totalProcessing: number;
    totalRating: number;
    ratingCount: number;
    satisfiedCount: number;
  }> = {};
  
  for (const record of records) {
    const model = record.modelId || 'unknown';
    
    if (!byModel[model]) {
      byModel[model] = {
        count: 0,
        totalQuality: 0,
        totalProcessing: 0,
        totalRating: 0,
        ratingCount: 0,
        satisfiedCount: 0,
      };
    }
    
    byModel[model].count++;
    byModel[model].totalQuality += record.qualityScore;
    byModel[model].totalProcessing += record.processingTimeMs;
    
    if (record.userRating) {
      byModel[model].totalRating += record.userRating;
      byModel[model].ratingCount++;
      if (record.userRating >= 4) {
        byModel[model].satisfiedCount++;
      }
    }
  }
  
  // Convert to array
  return Object.entries(byModel)
    .map(([modelId, data]) => ({
      modelId,
      count: data.count,
      avgQualityScore: Math.round((data.totalQuality / data.count) * 10) / 10,
      avgProcessingTime: Math.round(data.totalProcessing / data.count),
      avgRating: data.ratingCount > 0 
        ? Math.round((data.totalRating / data.ratingCount) * 10) / 10 
        : 0,
      satisfactionRate: data.ratingCount > 0 
        ? Math.round((data.satisfiedCount / data.ratingCount) * 100) 
        : 0,
    }))
    .sort((a, b) => b.avgQualityScore - a.avgQualityScore);
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

export {
  getAllRecords,
  getRecord,
  calculateFeedbackAnalytics,
} from './feedbackManager';

