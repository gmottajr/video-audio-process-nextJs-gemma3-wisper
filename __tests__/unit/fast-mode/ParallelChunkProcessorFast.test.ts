/**
 * Unit tests for ParallelChunkProcessorFast pure functions
 *
 * Tests the exported pure functions: markComplete, calculateETA, calculateProgress.
 * The processor class is exercised via integration tests.
 */

import {
  markComplete,
  calculateETA,
  calculateProgress,
} from '@/services/fast-mode/ParallelChunkProcessorFast';

describe('ParallelChunkProcessorFast pure functions', () => {
  describe('markComplete', () => {
    it('adds index to empty set', () => {
      const result = markComplete(new Set(), 0);
      expect(result.size).toBe(1);
      expect(result.has(0)).toBe(true);
    });

    it('adds index to existing set', () => {
      const prev = new Set([0, 1]);
      const result = markComplete(prev, 2);
      expect(result.size).toBe(3);
      expect(result.has(0)).toBe(true);
      expect(result.has(1)).toBe(true);
      expect(result.has(2)).toBe(true);
    });

    it('returns new Set (immutable)', () => {
      const prev = new Set([0, 1]);
      const result = markComplete(prev, 2);
      expect(result).not.toBe(prev);
      expect(prev.size).toBe(2);
    });

    it('does not mutate ReadonlySet input', () => {
      const prev = new Set([0, 1]) as ReadonlySet<number>;
      markComplete(prev, 2);
      expect(prev.size).toBe(2);
    });
  });

  describe('calculateETA', () => {
    it('returns undefined when completed is 0', () => {
      expect(calculateETA(0, 10, 1000)).toBeUndefined();
    });

    it('returns undefined when completed >= total', () => {
      expect(calculateETA(10, 10, 1000)).toBeUndefined();
      expect(calculateETA(11, 10, 1000)).toBeUndefined();
    });

    it('calculates ETA based on remaining chunks and avg time', () => {
      // 5 completed, 5 remaining, 2s per chunk = 10s total
      const eta = calculateETA(5, 10, 2000);
      expect(eta).toBe(10);
    });

    it('rounds to nearest second', () => {
      const eta = calculateETA(1, 9, 1500);
      expect(eta).toBe(Math.round(8 * 1.5));
    });

    it('handles single remaining chunk', () => {
      const eta = calculateETA(4, 5, 3000);
      expect(eta).toBe(3); // 1 remaining * 3s
    });
  });

  describe('calculateProgress', () => {
    it('creates progress with correct structure', () => {
      const completed = new Set([0, 1]);
      const progress = calculateProgress(completed, 10, 4);

      expect(progress.phase).toBe('processing');
      expect(progress.percent).toBe(20); // 2/10 * 100
      expect(progress.chunksCompleted).toBe(2);
      expect(progress.chunksTotal).toBe(10);
      expect(progress.workersActive).toBe(4);
    });

    it('includes etaSeconds when lastChunkTimeMs provided', () => {
      const completed = new Set([0, 1]);
      const progress = calculateProgress(completed, 5, 2, 2000);

      expect(progress.etaSeconds).toBe(6); // 3 remaining * 2s
    });

    it('excludes etaSeconds when lastChunkTimeMs not provided', () => {
      const completed = new Set([0, 1]);
      const progress = calculateProgress(completed, 5, 2);

      expect(progress.etaSeconds).toBeUndefined();
    });

    it('returns 100 percent when all complete', () => {
      const completed = new Set([0, 1, 2, 3, 4]);
      const progress = calculateProgress(completed, 5, 0, 1000);

      expect(progress.percent).toBe(100);
      expect(progress.etaSeconds).toBeUndefined();
    });

    it('returns 0 percent when none complete', () => {
      const completed = new Set<number>();
      const progress = calculateProgress(completed, 10, 4);

      expect(progress.percent).toBe(0);
      expect(progress.chunksCompleted).toBe(0);
    });
  });
});
