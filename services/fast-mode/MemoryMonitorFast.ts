/**
 * MemoryMonitorFast
 * 
 * Monitors memory usage and provides recommendations for worker scaling.
 * Uses performance.memory API (Chrome) with fallback estimation for other browsers.
 */

export interface MemoryInfo {
  /** Current memory usage in MB */
  usedMB: number;
  /** Total available memory in MB (Chrome only) */
  totalMB?: number;
  /** Memory limit in MB (Chrome only) */
  limitMB?: number;
  /** Percentage of budget used (0-100) */
  percentUsed: number;
  /** Is memory pressure detected? */
  isPressure: boolean;
  /** Recommended worker count based on memory */
  recommendedWorkers: number;
}

export interface MemoryBudget {
  /** Budget per worker in MB */
  perWorkerMB: number;
  /** Total budget in MB */
  totalMB: number;
  /** Threshold percentage for pressure (default: 80) */
  pressureThreshold: number;
}

const DEFAULT_BUDGET: MemoryBudget = {
  perWorkerMB: 500, // ~500MB per worker (model + audio + overhead)
  totalMB: 8000,    // 8GB total budget for up to 16 workers
  pressureThreshold: 80,
};

export class MemoryMonitorFast {
  private budget: MemoryBudget;
  private peakUsedMB: number = 0;

  constructor(budget: Partial<MemoryBudget> = {}) {
    this.budget = { ...DEFAULT_BUDGET, ...budget };
  }

  /**
   * Get current memory information
   * 
   * Chrome: Uses performance.memory API
   * Firefox/Safari: Estimates based on worker count
   */
  getMemoryInfo(activeWorkers: number): MemoryInfo {
    const performanceMemory = this.getPerformanceMemory();
    
    let usedMB: number;
    let totalMB: number | undefined;
    let limitMB: number | undefined;
    
    if (performanceMemory) {
      // Chrome: Use actual memory API
      usedMB = performanceMemory.usedJSHeapSize / (1024 * 1024);
      totalMB = performanceMemory.totalJSHeapSize / (1024 * 1024);
      limitMB = performanceMemory.jsHeapSizeLimit / (1024 * 1024);
    } else {
      // Firefox/Safari: Estimate based on workers
      usedMB = activeWorkers * this.budget.perWorkerMB;
      totalMB = undefined;
      limitMB = undefined;
    }
    
    // Track peak usage
    if (usedMB > this.peakUsedMB) {
      this.peakUsedMB = usedMB;
    }
    
    const percentUsed = (usedMB / this.budget.totalMB) * 100;
    const isPressure = percentUsed >= this.budget.pressureThreshold;
    
    // Recommend worker count based on memory
    const recommendedWorkers = this.calculateRecommendedWorkers(usedMB, isPressure);
    
    return {
      usedMB,
      totalMB,
      limitMB,
      percentUsed,
      isPressure,
      recommendedWorkers,
    };
  }

  /**
   * Check if memory pressure is detected
   */
  isMemoryPressure(activeWorkers: number): boolean {
    return this.getMemoryInfo(activeWorkers).isPressure;
  }

  /**
   * Get recommended worker count based on current memory usage
   */
  getRecommendedWorkerCount(activeWorkers: number, maxWorkers: number): number {
    const info = this.getMemoryInfo(activeWorkers);
    
    if (info.isPressure && activeWorkers > 1) {
      // Reduce workers if pressure detected
      return Math.max(1, activeWorkers - 1);
    }
    
    // Don't exceed maxWorkers
    return Math.min(info.recommendedWorkers, maxWorkers);
  }

  /**
   * Get peak memory usage during monitoring
   */
  getPeakUsageMB(): number {
    return this.peakUsedMB;
  }

  /**
   * Reset peak usage tracking
   */
  resetPeakUsage(): void {
    this.peakUsedMB = 0;
  }

  /**
   * Get performance.memory API (Chrome only)
   */
  private getPerformanceMemory(): PerformanceMemory | null {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory as PerformanceMemory;
    }
    return null;
  }

  /**
   * Calculate recommended worker count based on memory usage
   */
  private calculateRecommendedWorkers(usedMB: number, isPressure: boolean): number {
    if (isPressure) {
      // Under pressure: reduce to 1 worker
      return 1;
    }
    
    // Calculate how many workers can fit in budget
    const availableMB = this.budget.totalMB - usedMB;
    const workersThatFit = Math.floor(availableMB / this.budget.perWorkerMB);
    
    // Scale dynamically based on available memory (1-16 workers)
    // Cap at 16 workers max (hardware limit for most systems)
    return Math.max(1, Math.min(workersThatFit, 16));
  }
}

/**
 * Performance.memory interface (Chrome only)
 */
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}
