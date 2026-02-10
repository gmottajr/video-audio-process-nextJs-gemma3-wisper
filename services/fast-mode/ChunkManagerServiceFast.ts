/**
 * ChunkManagerServiceFast
 * 
 * Splits audio into parallelizable chunks with overlap for boundary handling.
 * Algorithm adapted from OpenAI Whisper transcribe.py
 * 
 * BEND-inspired: Uses functional composition with pure functions for
 * chunk generation and mapping.
 */

import type { AudioChunk, FastModeConfig } from '@/types/fast-mode';

const DEFAULT_CONFIG: FastModeConfig = {
  chunkLengthSec: 60, // Increased from 30s to 60s for better throughput
  overlapSec: 3,
  modelId: 'distil-whisper/distil-small.en',
  sampleRate: 16000,
};

/**
 * Pure function: Generate chunk ranges as [start, end] tuples
 * 
 * Pattern: Adapted from OpenAI Whisper transcribe.py chunking algorithm
 * 
 * @param totalSamples - Total number of audio samples
 * @param chunkLengthSamples - Number of samples per chunk
 * @param stepSamples - Step size between chunk starts (chunkLength - overlap)
 * @returns Array of [start, end] sample index tuples
 */
export const generateChunkRanges = (
  totalSamples: number,
  chunkLengthSamples: number,
  stepSamples: number
): ReadonlyArray<readonly [number, number]> => {
  const ranges: Array<readonly [number, number]> = [];
  
  for (let start = 0; start < totalSamples; start += stepSamples) {
    const end = Math.min(start + chunkLengthSamples, totalSamples);
    ranges.push([start, end] as const);
    if (end >= totalSamples) break;
  }
  
  return ranges;
};

/**
 * Pure function: Create AudioChunk from a sample range
 * 
 * Returns a curried function for use with Array.map()
 * 
 * @param audioData - Full audio data array
 * @param sampleRate - Audio sample rate (e.g., 16000)
 * @returns Function that transforms [start, end] tuple to AudioChunk
 */
export const createChunkFromRange = (
  audioData: Float32Array,
  sampleRate: number
) => (
  [start, end]: readonly [number, number],
  index: number
): AudioChunk => ({
  index,
  audioData: audioData.slice(start, end),
  startOffset: start / sampleRate,
  endOffset: end / sampleRate,
  duration: (end - start) / sampleRate,
});

export class ChunkManagerServiceFast {
  private config: FastModeConfig;

  constructor(config: Partial<FastModeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create chunks from audio data using functional composition.
   * 
   * BEND-inspired: Declarative pipeline using pure functions:
   *   1. generateChunkRanges() - compute sample boundaries
   *   2. createChunkFromRange() - map boundaries to AudioChunk objects
   * 
   * @param audioData - Full audio as Float32Array (16kHz mono)
   * @returns Array of AudioChunk objects with metadata
   */
  createChunks(audioData: Float32Array): AudioChunk[] {
    const { chunkLengthSec, overlapSec, sampleRate } = this.config;
    
    const chunkLengthSamples = chunkLengthSec * sampleRate;
    const overlapSamples = overlapSec * sampleRate;
    const stepSamples = chunkLengthSamples - overlapSamples;
    
    const totalSamples = audioData.length;
    const totalDuration = totalSamples / sampleRate;
    
    // Edge case: Audio shorter than one chunk
    if (totalSamples <= chunkLengthSamples) {
      return [{
        index: 0,
        audioData: audioData.slice(),
        startOffset: 0,
        endOffset: totalDuration,
        duration: totalDuration,
      }];
    }
    
    // Functional composition: generate ranges, then map to chunks
    const ranges = generateChunkRanges(totalSamples, chunkLengthSamples, stepSamples);
    const chunks = ranges.map(createChunkFromRange(audioData, sampleRate));
    
    return chunks;
  }

  /**
   * Calculate number of chunks for given audio duration.
   * Pure function - useful for progress estimation.
   * 
   * @param durationSeconds - Audio duration in seconds
   * @returns Number of chunks that will be created
   */
  calculateChunkCount(durationSeconds: number): number {
    const { chunkLengthSec, overlapSec } = this.config;
    const stepSec = chunkLengthSec - overlapSec;
    
    if (durationSeconds <= chunkLengthSec) {
      return 1;
    }
    
    return Math.ceil((durationSeconds - overlapSec) / stepSec);
  }

  /**
   * Get chunk configuration (returns copy to prevent mutation).
   */
  getConfig(): FastModeConfig {
    return { ...this.config };
  }
}
