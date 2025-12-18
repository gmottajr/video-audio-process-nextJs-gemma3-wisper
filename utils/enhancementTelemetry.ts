/**
 * Enhancement Telemetry Utility
 * 
 * Tracks AI enhancement performance metrics for analysis and optimization.
 * All data stays local in localStorage - no external analytics.
 */

// ============================================================================
// Types
// ============================================================================

export interface EnhancementTelemetry {
  /** Model used for enhancement */
  modelId: string;
  /** GPU tier detected */
  gpuTier: 'high' | 'medium' | 'low' | 'unsupported';
  /** GPU description */
  gpuInfo?: string;
  /** Time to download model (seconds, 0 if cached) */
  downloadTime: number;
  /** Time to process transcript (seconds) */
  processingTime: number;
  /** Input transcript length (characters) */
  transcriptLength: number;
  /** Output transcript length (characters) */
  enhancedLength: number;
  /** Number of filler words removed */
  fillerWordsRemoved: number;
  /** Tokens generated */
  tokensGenerated: number;
  /** Whether model was already cached */
  wasCached: boolean;
  /** Timestamp */
  timestamp: string;
}

export interface TelemetrySummary {
  /** Total enhancements performed */
  totalEnhancements: number;
  /** Average processing time (seconds) */
  avgProcessingTime: number;
  /** Average download time for non-cached (seconds) */
  avgDownloadTime: number;
  /** Average tokens per second */
  avgTokensPerSecond: number;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Average filler words removed per enhancement */
  avgFillerWordsRemoved: number;
  /** Performance by model */
  byModel: Record<string, {
    count: number;
    avgProcessingTime: number;
    avgTokensPerSecond: number;
  }>;
  /** Performance by GPU tier */
  byGpuTier: Record<string, {
    count: number;
    avgProcessingTime: number;
    avgTokensPerSecond: number;
  }>;
}

// ============================================================================
// Constants
// ============================================================================

const TELEMETRY_KEY = 'mediaforge_enhancement_metrics';
const MAX_ENTRIES = 50;

// ============================================================================
// Functions
// ============================================================================

/**
 * Log enhancement metrics to localStorage
 */
export function logEnhancementMetrics(metrics: EnhancementTelemetry): void {
  try {
    // Get existing metrics
    const existing = getEnhancementMetrics();
    
    // Add new entry
    existing.push({
      ...metrics,
      timestamp: metrics.timestamp || new Date().toISOString(),
    });
    
    // Keep only last N entries
    while (existing.length > MAX_ENTRIES) {
      existing.shift();
    }
    
    // Save back
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(existing));
    
    // Log summary for this hardware
    const summary = getSummaryForHardware(metrics.modelId, metrics.gpuTier);
    if (summary) {
      console.log(
        `[Telemetry] ${metrics.modelId} on ${metrics.gpuTier} GPU: ` +
        `avg ${summary.avgProcessingTime.toFixed(1)}s processing, ` +
        `${summary.avgTokensPerSecond.toFixed(1)} tokens/sec ` +
        `(${summary.count} samples)`
      );
    }
  } catch (err) {
    console.warn('[Telemetry] Failed to save metrics:', err);
  }
}

/**
 * Get all stored enhancement metrics
 */
export function getEnhancementMetrics(): EnhancementTelemetry[] {
  try {
    const data = localStorage.getItem(TELEMETRY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn('[Telemetry] Failed to read metrics:', err);
    return [];
  }
}

/**
 * Get summary statistics
 */
export function getTelemetrySummary(): TelemetrySummary | null {
  const metrics = getEnhancementMetrics();
  
  if (metrics.length === 0) {
    return null;
  }
  
  // Calculate totals
  let totalProcessingTime = 0;
  let totalDownloadTime = 0;
  let totalTokensPerSecond = 0;
  let totalFillerWords = 0;
  let cachedCount = 0;
  let downloadCount = 0;
  
  const byModel: TelemetrySummary['byModel'] = {};
  const byGpuTier: TelemetrySummary['byGpuTier'] = {};
  
  for (const m of metrics) {
    totalProcessingTime += m.processingTime;
    totalFillerWords += m.fillerWordsRemoved;
    
    const tokensPerSec = m.processingTime > 0 
      ? m.tokensGenerated / m.processingTime 
      : 0;
    totalTokensPerSecond += tokensPerSec;
    
    if (m.wasCached) {
      cachedCount++;
    } else {
      totalDownloadTime += m.downloadTime;
      downloadCount++;
    }
    
    // By model
    if (!byModel[m.modelId]) {
      byModel[m.modelId] = { count: 0, avgProcessingTime: 0, avgTokensPerSecond: 0 };
    }
    byModel[m.modelId].count++;
    byModel[m.modelId].avgProcessingTime += m.processingTime;
    byModel[m.modelId].avgTokensPerSecond += tokensPerSec;
    
    // By GPU tier
    if (!byGpuTier[m.gpuTier]) {
      byGpuTier[m.gpuTier] = { count: 0, avgProcessingTime: 0, avgTokensPerSecond: 0 };
    }
    byGpuTier[m.gpuTier].count++;
    byGpuTier[m.gpuTier].avgProcessingTime += m.processingTime;
    byGpuTier[m.gpuTier].avgTokensPerSecond += tokensPerSec;
  }
  
  // Calculate averages for byModel
  for (const model of Object.keys(byModel)) {
    const count = byModel[model].count;
    byModel[model].avgProcessingTime /= count;
    byModel[model].avgTokensPerSecond /= count;
  }
  
  // Calculate averages for byGpuTier
  for (const tier of Object.keys(byGpuTier)) {
    const count = byGpuTier[tier].count;
    byGpuTier[tier].avgProcessingTime /= count;
    byGpuTier[tier].avgTokensPerSecond /= count;
  }
  
  return {
    totalEnhancements: metrics.length,
    avgProcessingTime: totalProcessingTime / metrics.length,
    avgDownloadTime: downloadCount > 0 ? totalDownloadTime / downloadCount : 0,
    avgTokensPerSecond: totalTokensPerSecond / metrics.length,
    cacheHitRate: cachedCount / metrics.length,
    avgFillerWordsRemoved: totalFillerWords / metrics.length,
    byModel,
    byGpuTier,
  };
}

/**
 * Get summary for specific hardware configuration
 */
export function getSummaryForHardware(
  modelId: string, 
  gpuTier: string
): { avgProcessingTime: number; avgTokensPerSecond: number; count: number } | null {
  const metrics = getEnhancementMetrics();
  
  const matching = metrics.filter(
    m => m.modelId === modelId && m.gpuTier === gpuTier
  );
  
  if (matching.length === 0) {
    return null;
  }
  
  let totalProcessingTime = 0;
  let totalTokensPerSecond = 0;
  
  for (const m of matching) {
    totalProcessingTime += m.processingTime;
    const tokensPerSec = m.processingTime > 0 
      ? m.tokensGenerated / m.processingTime 
      : 0;
    totalTokensPerSecond += tokensPerSec;
  }
  
  return {
    avgProcessingTime: totalProcessingTime / matching.length,
    avgTokensPerSecond: totalTokensPerSecond / matching.length,
    count: matching.length,
  };
}

/**
 * Estimate processing time based on historical data
 */
export function estimateProcessingTime(
  modelId: string,
  gpuTier: string,
  transcriptLength: number
): number | null {
  const metrics = getEnhancementMetrics();
  
  const matching = metrics.filter(
    m => m.modelId === modelId && m.gpuTier === gpuTier
  );
  
  if (matching.length < 3) {
    // Not enough data for reliable estimate
    return null;
  }
  
  // Calculate average chars per second
  let totalCharsPerSecond = 0;
  for (const m of matching) {
    if (m.processingTime > 0) {
      totalCharsPerSecond += m.transcriptLength / m.processingTime;
    }
  }
  const avgCharsPerSecond = totalCharsPerSecond / matching.length;
  
  if (avgCharsPerSecond <= 0) {
    return null;
  }
  
  return transcriptLength / avgCharsPerSecond;
}

/**
 * Clear all telemetry data
 */
export function clearTelemetry(): void {
  try {
    localStorage.removeItem(TELEMETRY_KEY);
    console.log('[Telemetry] Cleared all metrics');
  } catch (err) {
    console.warn('[Telemetry] Failed to clear metrics:', err);
  }
}

/**
 * Export telemetry data as JSON
 */
export function exportTelemetry(): string {
  const metrics = getEnhancementMetrics();
  const summary = getTelemetrySummary();
  
  return JSON.stringify({
    metrics,
    summary,
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

