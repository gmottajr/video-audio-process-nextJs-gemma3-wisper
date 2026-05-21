/**
 * ParallelRuntime
 *
 * BEND-inspired runtime that automatically detects optimal parallelism
 * based on user's hardware (CPU cores, GPU, memory).
 *
 * Usage:
 *   const runtime = new ParallelRuntime();
 *   await runtime.initialize();
 *   const workers = runtime.getOptimalWorkerCount(); // Auto-detected!
 */

import {
  detectSystemCapabilities,
  calculateOptimalWorkers,
  type SystemCapabilities,
  type WorkerRecommendation,
} from './systemCapabilities';
import { parallelMap } from './functional';

export interface ParallelRuntimeConfig {
  /** Override auto-detected worker count */
  maxWorkers?: number;
  /** Override auto-detected memory budget */
  memoryBudgetMB?: number;
  /** Strategy for worker allocation */
  strategy?: 'auto' | 'conservative' | 'aggressive';
}

export class ParallelRuntime {
  private capabilities: SystemCapabilities | null = null;
  private recommendation: WorkerRecommendation | null = null;
  private config: ParallelRuntimeConfig;
  private initialized = false;

  constructor(config: ParallelRuntimeConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize runtime by detecting system capabilities.
   * Must be called before using other methods.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.capabilities = await detectSystemCapabilities();
      this.recommendation = calculateOptimalWorkers(this.capabilities);
      this.initialized = true;

      console.log('[ParallelRuntime] System detected:', {
        threads: this.capabilities.cpu.threads,
        gpu: this.capabilities.gpu.available ? this.capabilities.gpu.vendor : 'none',
        memory: `${this.capabilities.memory.availableGB.toFixed(1)}GB available`,
      });
      console.log('[ParallelRuntime] Recommendation:', {
        workers: this.recommendation.recommendedWorkers,
        maxWorkers: this.recommendation.maxWorkers,
        memoryBudget: `${(this.recommendation.memoryBudgetMB / 1024).toFixed(1)}GB`,
      });
    } catch (error) {
      console.warn('[ParallelRuntime] Detection failed, using defaults:', error);
      this.recommendation = {
        recommendedWorkers: 4,
        maxWorkers: 8,
        useGPU: false,
        useNPU: false,
        preferredDevice: 'cpu',
        reasoning: ['Detection failed, using safe defaults'],
        memoryBudgetMB: 4000,
      };
      this.initialized = true;
    }
  }

  /**
   * Get optimal worker count based on detected hardware.
   * Returns configured override if set, otherwise auto-detected value.
   */
  getOptimalWorkerCount(): number {
    this.ensureInitialized();

    if (this.config.maxWorkers !== undefined) {
      return this.config.maxWorkers;
    }

    const base = this.recommendation!.recommendedWorkers;
    switch (this.config.strategy) {
      case 'conservative':
        return Math.max(1, Math.floor(base * 0.5));
      case 'aggressive':
        return Math.min(this.recommendation!.maxWorkers, Math.ceil(base * 1.5));
      case 'auto':
      default:
        return base;
    }
  }

  /**
   * Get maximum worker count (for user override UI).
   */
  getMaxWorkerCount(): number {
    this.ensureInitialized();
    return this.recommendation!.maxWorkers;
  }

  /**
   * Get memory budget in MB.
   */
  getMemoryBudgetMB(): number {
    this.ensureInitialized();
    return this.config.memoryBudgetMB ?? this.recommendation!.memoryBudgetMB;
  }

  /**
   * Get detected system capabilities.
   */
  getCapabilities(): SystemCapabilities | null {
    return this.capabilities;
  }

  /**
   * Get full recommendation with reasoning.
   */
  getRecommendation(): WorkerRecommendation | null {
    return this.recommendation;
  }

  /**
   * Check if GPU acceleration is recommended.
   */
  shouldUseGPU(): boolean {
    this.ensureInitialized();
    return this.recommendation!.useGPU;
  }

  /**
   * BEND-like: Map with automatic parallelism.
   * Runtime decides optimal concurrency.
   */
  async map<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const concurrency = this.getOptimalWorkerCount();
    return parallelMap(items, fn, concurrency);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        '[ParallelRuntime] Not initialized. Call await runtime.initialize() first.'
      );
    }
  }
}

/**
 * Create and initialize a ParallelRuntime instance.
 * Convenience function for one-liner usage.
 */
export async function createParallelRuntime(
  config?: ParallelRuntimeConfig
): Promise<ParallelRuntime> {
  const runtime = new ParallelRuntime(config);
  await runtime.initialize();
  return runtime;
}
