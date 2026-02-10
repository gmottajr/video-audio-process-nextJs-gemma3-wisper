/**
 * Unit tests for ChunkManagerServiceFast
 * 
 * Note: Default config uses 60s chunks with 3s overlap (step = 57s)
 */

import { ChunkManagerServiceFast, generateChunkRanges, createChunkFromRange } from '@/services/fast-mode/ChunkManagerServiceFast';

describe('ChunkManagerServiceFast', () => {
  const sampleRate = 16000;
  // Default config: 60s chunks, 3s overlap
  const defaultChunkLengthSec = 60;
  const defaultOverlapSec = 3;
  const defaultStepSec = defaultChunkLengthSec - defaultOverlapSec; // 57 seconds

  describe('createChunks', () => {
    it('creates correct number of chunks for N-minute audio', () => {
      // 5 minutes = 300 seconds
      // With 60s chunks and 57s step: ceil((300 - 3) / 57) = ceil(5.2) = 6 chunks
      const durationSec = 300;
      const totalSamples = durationSec * sampleRate;
      const audioData = new Float32Array(totalSamples);

      const service = new ChunkManagerServiceFast();
      const chunks = service.createChunks(audioData);

      // Expected: ceil((300 - 3) / 57) = 6 chunks
      expect(chunks.length).toBe(6);
    });

    it('applies 3-second overlap between adjacent chunks', () => {
      const durationSec = 120; // 2 minutes (needs multiple chunks with 60s default)
      const totalSamples = durationSec * sampleRate;
      const audioData = new Float32Array(totalSamples);

      const service = new ChunkManagerServiceFast();
      const chunks = service.createChunks(audioData);

      if (chunks.length > 1) {
        // Check overlap between first two chunks
        const chunk0End = chunks[0].endOffset;
        const chunk1Start = chunks[1].startOffset;
        const overlap = chunk0End - chunk1Start;
        expect(overlap).toBeCloseTo(defaultOverlapSec, 1);
      }
    });

    it('calculates startOffset and endOffset correctly', () => {
      const durationSec = 120; // 2 minutes
      const totalSamples = durationSec * sampleRate;
      const audioData = new Float32Array(totalSamples);

      const service = new ChunkManagerServiceFast();
      const chunks = service.createChunks(audioData);

      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[0].endOffset).toBeCloseTo(defaultChunkLengthSec, 1);

      if (chunks.length > 1) {
        expect(chunks[1].startOffset).toBeCloseTo(defaultChunkLengthSec - defaultOverlapSec, 1);
      }
    });

    it('handles audio shorter than chunk length (single chunk)', () => {
      const durationSec = 15; // 15 seconds
      const totalSamples = durationSec * sampleRate;
      const audioData = new Float32Array(totalSamples);

      const service = new ChunkManagerServiceFast();
      const chunks = service.createChunks(audioData);

      expect(chunks.length).toBe(1);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[0].endOffset).toBeCloseTo(durationSec, 1);
      expect(chunks[0].duration).toBeCloseTo(durationSec, 1);
    });

    it('handles audio exactly at chunk length (single chunk, no overlap)', () => {
      const durationSec = 60; // Exactly one 60s chunk
      const totalSamples = durationSec * sampleRate;
      const audioData = new Float32Array(totalSamples);

      const service = new ChunkManagerServiceFast();
      const chunks = service.createChunks(audioData);

      expect(chunks.length).toBe(1);
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[0].endOffset).toBeCloseTo(60, 1);
    });

    it('handles last chunk being smaller than full chunk size', () => {
      // Create audio that doesn't divide evenly
      const durationSec = 70; // 70 seconds - first chunk is 60s, second is smaller
      const totalSamples = durationSec * sampleRate;
      const audioData = new Float32Array(totalSamples);

      const service = new ChunkManagerServiceFast();
      const chunks = service.createChunks(audioData);

      expect(chunks.length).toBeGreaterThan(0);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.endOffset).toBeCloseTo(durationSec, 1);
    });

    it('handles empty audio input gracefully', () => {
      const audioData = new Float32Array(0);

      const service = new ChunkManagerServiceFast();
      const chunks = service.createChunks(audioData);

      expect(chunks.length).toBe(1);
      expect(chunks[0].audioData.length).toBe(0);
      expect(chunks[0].duration).toBe(0);
    });

    it('respects custom config for chunk length', () => {
      const durationSec = 300;
      const totalSamples = durationSec * sampleRate;
      const audioData = new Float32Array(totalSamples);

      // Use 30s chunks like the old default
      const service = new ChunkManagerServiceFast({ chunkLengthSec: 30, overlapSec: 3 });
      const chunks = service.createChunks(audioData);

      // With 30s chunks and 27s step: ceil((300 - 3) / 27) = 11 chunks
      expect(chunks.length).toBe(11);
    });
  });

  describe('calculateChunkCount', () => {
    it('returns 1 for audio shorter than chunk length', () => {
      const service = new ChunkManagerServiceFast();
      expect(service.calculateChunkCount(15)).toBe(1);
      expect(service.calculateChunkCount(60)).toBe(1); // Exactly at chunk length
    });

    it('calculates correct count for longer audio', () => {
      const service = new ChunkManagerServiceFast();
      // 5 minutes = 300 seconds
      // With 60s chunks and 57s step: ceil((300 - 3) / 57) = 6
      expect(service.calculateChunkCount(300)).toBe(6);
    });

    it('calculates correct count with custom config', () => {
      const service = new ChunkManagerServiceFast({ chunkLengthSec: 30, overlapSec: 3 });
      // 5 minutes = 300 seconds
      // With 30s chunks and 27s step: ceil((300 - 3) / 27) = 11
      expect(service.calculateChunkCount(300)).toBe(11);
    });
  });

  describe('pure functions', () => {
    describe('generateChunkRanges', () => {
      it('generates correct ranges for simple case', () => {
        // 100 samples, 30 sample chunks, 10 sample step
        const ranges = generateChunkRanges(100, 30, 10);
        
        expect(ranges.length).toBe(8); // ceil((100 - 0) / 10) with overlap handling
        expect(ranges[0]).toEqual([0, 30]);
        expect(ranges[1]).toEqual([10, 40]);
      });

      it('handles edge case where total equals chunk length', () => {
        const ranges = generateChunkRanges(30, 30, 20);
        
        expect(ranges.length).toBe(1);
        expect(ranges[0]).toEqual([0, 30]);
      });

      it('handles last chunk being smaller', () => {
        const ranges = generateChunkRanges(50, 30, 20);
        
        expect(ranges.length).toBe(2);
        expect(ranges[0]).toEqual([0, 30]);
        expect(ranges[1]).toEqual([20, 50]); // Last chunk ends at total
      });
    });

    describe('createChunkFromRange', () => {
      it('creates AudioChunk with correct properties', () => {
        const audioData = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        const sampleRate = 2; // 2 samples per second for easy math
        
        const chunkCreator = createChunkFromRange(audioData, sampleRate);
        const chunk = chunkCreator([2, 6], 0);
        
        expect(chunk.index).toBe(0);
        expect(chunk.audioData).toEqual(new Float32Array([3, 4, 5, 6]));
        expect(chunk.startOffset).toBe(1); // 2 / 2
        expect(chunk.endOffset).toBe(3); // 6 / 2
        expect(chunk.duration).toBe(2); // (6 - 2) / 2
      });

      it('preserves index from map callback', () => {
        const audioData = new Float32Array(100);
        const chunkCreator = createChunkFromRange(audioData, 10);
        
        const chunk = chunkCreator([0, 10], 5);
        expect(chunk.index).toBe(5);
      });
    });
  });
});
