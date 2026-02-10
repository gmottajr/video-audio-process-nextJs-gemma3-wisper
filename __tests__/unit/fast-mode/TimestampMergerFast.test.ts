/**
 * Unit tests for TimestampMergerFast
 */

import { TimestampMergerFast } from '@/services/fast-mode/TimestampMergerFast';
import type { ChunkResult } from '@/types/fast-mode';

describe('TimestampMergerFast', () => {
  const merger = new TimestampMergerFast();

  describe('mergeResults', () => {
    it('sorts chunk results by index', () => {
      const chunkResults: ChunkResult[] = [
        {
          chunkIndex: 2,
          text: 'Third chunk',
          segments: [{ start: 0, end: 5, text: 'Third chunk' }],
          processingTime: 1000,
          startOffset: 54,
          endOffset: 84,
        },
        {
          chunkIndex: 0,
          text: 'First chunk',
          segments: [{ start: 0, end: 5, text: 'First chunk' }],
          processingTime: 1000,
          startOffset: 0,
          endOffset: 30,
        },
        {
          chunkIndex: 1,
          text: 'Second chunk',
          segments: [{ start: 0, end: 5, text: 'Second chunk' }],
          processingTime: 1000,
          startOffset: 27,
          endOffset: 57,
        },
      ];

      const result = merger.mergeResults(chunkResults, 84, 3000, 2);

      expect(result.segments[0].text).toBe('First chunk');
      expect(result.segments[1].text).toBe('Second chunk');
      expect(result.segments[2].text).toBe('Third chunk');
    });

    it('adjusts segment timestamps by chunk offset', () => {
      const chunkResults: ChunkResult[] = [
        {
          chunkIndex: 0,
          text: 'Test',
          segments: [{ start: 5, end: 10, text: 'Test' }],
          processingTime: 1000,
          startOffset: 0,
          endOffset: 30,
        },
        {
          chunkIndex: 1,
          text: 'Test 2',
          segments: [{ start: 2, end: 7, text: 'Test 2' }],
          processingTime: 1000,
          startOffset: 27,
          endOffset: 57,
        },
      ];

      const result = merger.mergeResults(chunkResults, 57, 2000, 2);

      // First chunk: 5 + 0 = 5, 10 + 0 = 10
      expect(result.segments[0].start).toBeCloseTo(5, 1);
      expect(result.segments[0].end).toBeCloseTo(10, 1);

      // Second chunk: 2 + 27 = 29, 7 + 27 = 34
      expect(result.segments[1].start).toBeCloseTo(29, 1);
      expect(result.segments[1].end).toBeCloseTo(34, 1);
    });

    it('handles empty results', () => {
      const result = merger.mergeResults([], 0, 0, 0);

      expect(result.text).toBe('');
      expect(result.segments).toEqual([]);
      expect(result.chunksProcessed).toBe(0);
    });

    it('merges adjacent segments with small gaps', () => {
      const chunkResults: ChunkResult[] = [
        {
          chunkIndex: 0,
          text: 'First Second',
          segments: [
            { start: 0, end: 5, text: 'First' },
            { start: 5.2, end: 10, text: 'Second' }, // 0.2s gap - should merge
          ],
          processingTime: 1000,
          startOffset: 0,
          endOffset: 30,
        },
      ];

      const result = merger.mergeResults(chunkResults, 30, 1000, 1);

      // Should merge segments with gap < 0.5s
      expect(result.segments.length).toBe(1);
      expect(result.segments[0].start).toBeCloseTo(0, 1);
      expect(result.segments[0].end).toBeCloseTo(10, 1);
    });

    it('preserves segment order within chunks (with gaps > 0.5s)', () => {
      const chunkResults: ChunkResult[] = [
        {
          chunkIndex: 0,
          text: 'A B C',
          segments: [
            { start: 0, end: 2, text: 'A' },
            { start: 3, end: 5, text: 'B' },  // 1s gap from A - should NOT merge
            { start: 6, end: 8, text: 'C' },  // 1s gap from B - should NOT merge
          ],
          processingTime: 1000,
          startOffset: 0,
          endOffset: 30,
        },
      ];

      const result = merger.mergeResults(chunkResults, 30, 1000, 1);

      expect(result.segments.length).toBe(3);
      expect(result.segments[0].text).toBe('A');
      expect(result.segments[1].text).toBe('B');
      expect(result.segments[2].text).toBe('C');
    });

    it('merges consecutive segments with no gaps', () => {
      // Segments with gaps < 0.5s should be merged
      const chunkResults: ChunkResult[] = [
        {
          chunkIndex: 0,
          text: 'A B C',
          segments: [
            { start: 0, end: 2, text: 'A' },
            { start: 2, end: 4, text: 'B' },  // No gap - should merge
            { start: 4, end: 6, text: 'C' },  // No gap - should merge
          ],
          processingTime: 1000,
          startOffset: 0,
          endOffset: 30,
        },
      ];

      const result = merger.mergeResults(chunkResults, 30, 1000, 1);

      // All segments should merge into one
      expect(result.segments.length).toBe(1);
      expect(result.segments[0].text).toBe('A B C');
      expect(result.segments[0].start).toBe(0);
      expect(result.segments[0].end).toBe(6);
    });

    it('handles chunks with no segments', () => {
      const chunkResults: ChunkResult[] = [
        {
          chunkIndex: 0,
          text: '',
          segments: [],
          processingTime: 1000,
          startOffset: 0,
          endOffset: 30,
        },
      ];

      const result = merger.mergeResults(chunkResults, 30, 1000, 1);

      expect(result.text).toBe('');
      expect(result.segments).toEqual([]);
    });
  });
});
