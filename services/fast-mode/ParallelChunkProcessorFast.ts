/**
 * ParallelChunkProcessorFast
 *
 * Coordinates parallel chunk processing, tracks progress, and handles timeouts.
 *
 * BEND-inspired: Uses immutable Set updates and pure functions for progress
 * calculation. No mutable counters - completed indices are the single source of truth.
 */

import type { AudioChunk, ChunkResult, FastModeProgress } from '@/types/fast-mode';
import { WorkerPoolManagerFast } from './WorkerPoolManagerFast';

export interface ProgressCallback {
  (progress: FastModeProgress): void;
}

/**
 * Pure function: Add index to completed set (immutable update)
 *
 * Returns a new Set instead of mutating. Used to prevent race conditions
 * when multiple chunks complete in parallel.
 *
 * @param prev - Previous set of completed chunk indices
 * @param index - Chunk index to mark complete
 * @returns New Set with index added
 */
export const markComplete = (
  prev: ReadonlySet<number>,
  index: number
): Set<number> => new Set([...prev, index]);

/**
 * Pure function: Calculate ETA based on completion rate
 *
 * Uses last chunk processing time as estimate for remaining chunks.
 *
 * @param completedCount - Number of chunks completed
 * @param total - Total number of chunks
 * @param lastChunkTimeMs - Processing time of most recent chunk in ms
 * @returns Estimated seconds remaining, or undefined if done/unknown
 */
export const calculateETA = (
  completedCount: number,
  total: number,
  lastChunkTimeMs: number
): number | undefined => {
  if (completedCount === 0 || completedCount >= total) {
    return undefined;
  }

  const remaining = total - completedCount;
  const avgTimePerChunkSec = lastChunkTimeMs / 1000;
  const estimatedSeconds = remaining * avgTimePerChunkSec;

  return Math.round(estimatedSeconds);
};

/**
 * Pure function: Calculate progress from completed set
 *
 * @param completedIndices - Set of completed chunk indices
 * @param totalChunks - Total number of chunks
 * @param workersActive - Number of busy workers
 * @param lastChunkTimeMs - Optional; used for ETA calculation
 * @returns FastModeProgress object
 */
export const calculateProgress = (
  completedIndices: ReadonlySet<number>,
  totalChunks: number,
  workersActive: number,
  lastChunkTimeMs?: number
): FastModeProgress => ({
  phase: 'processing',
  percent: Math.round((completedIndices.size / totalChunks) * 100),
  chunksCompleted: completedIndices.size,
  chunksTotal: totalChunks,
  workersActive,
  etaSeconds: lastChunkTimeMs !== undefined
    ? calculateETA(completedIndices.size, totalChunks, lastChunkTimeMs)
    : undefined,
});

export class ParallelChunkProcessorFast {
  private workerPool: WorkerPoolManagerFast;
  private progressCallback?: ProgressCallback;
  private isCancelled: boolean = false;

  constructor(workerPool: WorkerPoolManagerFast) {
    this.workerPool = workerPool;
  }

  /**
   * Set progress callback
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Process all chunks in parallel with automatic queuing
   *
   * Submits all chunks immediately - WorkerPoolManagerFast handles queuing
   * internally when workers are busy. This achieves true parallelism.
   *
   * Uses immutable Set for completed tracking; progress derived via pure calculateProgress().
   *
   * @param chunks - Array of audio chunks to process
   * @returns Array of chunk results (may be out-of-order)
   */
  async processChunks(chunks: AudioChunk[]): Promise<ChunkResult[]> {
    if (chunks.length === 0) {
      return [];
    }

    this.isCancelled = false;
    const totalChunks = chunks.length;

    // Immutable tracking: ref holds current Set; we replace with new Set on each completion
    const completedRef: { current: Set<number> } = { current: new Set() };

    // Emit initial progress via pure function
    this.emitProgress(
      calculateProgress(completedRef.current, totalChunks, this.workerPool.getStatus().busy)
    );

    // Submit ALL chunks immediately - worker pool handles queuing
    const promises = chunks.map(async (chunk) => {
      if (this.isCancelled) {
        throw new Error('Processing cancelled');
      }

      try {
        const result = await this.workerPool.processChunk(chunk);

        if (this.isCancelled) {
          return null;
        }

        // Immutable update: replace Set with new Set containing this index
        if (!completedRef.current.has(chunk.index)) {
          completedRef.current = markComplete(completedRef.current, chunk.index);

          this.emitProgress(
            calculateProgress(
              completedRef.current,
              totalChunks,
              this.workerPool.getStatus().busy,
              result.processingTime
            )
          );
        }

        return result;
      } catch (error) {
        if (this.isCancelled) {
          return null;
        }

        console.error(`[ParallelProcessor] Error processing chunk ${chunk.index}:`, error);
        throw error;
      }
    });

    // Wait for all chunks to complete
    const allResults = await Promise.all(promises);

    // Filter out null results (from cancellation)
    const validResults = allResults.filter((r): r is ChunkResult => r !== null);

    if (this.isCancelled) {
      throw new Error('Processing cancelled');
    }

    return validResults;
  }

  /**
   * Cancel processing
   */
  cancel(): void {
    this.isCancelled = true;
    this.emitProgress({
      phase: 'error',
      percent: 0,
      chunksCompleted: 0,
      chunksTotal: 0,
      workersActive: 0,
    });
  }

  /**
   * Emit progress update
   */
  private emitProgress(progress: FastModeProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}
