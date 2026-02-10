/**
 * TimestampMergerFast
 * 
 * Merges out-of-order chunk results into a single transcript with correct timestamps.
 * Algorithm adapted from OpenAI Whisper transcribe.py
 * 
 * BEND-inspired: Uses pure functions for timestamp adjustment, overlap filtering,
 * and segment merging. All transformation functions are exported for testing.
 */

import type { ChunkResult, FastModeTranscriptionResult, TranscriptionSegment } from '@/types/fast-mode';

/**
 * Pure function: Adjust segment timestamps by adding an offset
 * 
 * Transforms relative timestamps (from chunk start) to absolute timestamps
 * (from audio start).
 * 
 * @param segments - Array of segments with relative timestamps
 * @param startOffset - Offset in seconds to add to all timestamps
 * @returns New array of segments with adjusted timestamps
 */
export const adjustTimestamps = (
  segments: TranscriptionSegment[],
  startOffset: number
): TranscriptionSegment[] =>
  segments.map(segment => ({
    ...segment,
    start: segment.start + startOffset,
    end: segment.end + startOffset,
  }));

/**
 * Pure function: Filter segments that fall within an overlap region
 * 
 * Removes segments that would be duplicated in the next chunk's overlap.
 * 
 * @param segments - Array of segments to filter
 * @param overlapStart - Start of overlap region (undefined = no filtering)
 * @returns Filtered array of segments
 */
export const filterOverlaps = (
  segments: TranscriptionSegment[],
  overlapStart: number | undefined
): TranscriptionSegment[] =>
  overlapStart !== undefined
    ? segments.filter(segment => segment.end <= overlapStart)
    : segments;

/**
 * Pure function: Merge adjacent segments with small gaps
 * 
 * Uses reduce pattern for functional composition. Segments with gaps
 * smaller than maxGap are merged into a single segment.
 * 
 * @param segments - Array of segments to merge
 * @param maxGap - Maximum gap in seconds to merge (default: 0.5)
 * @returns Array of merged segments
 */
export const mergeAdjacentSegments = (
  segments: TranscriptionSegment[],
  maxGap: number = 0.5
): TranscriptionSegment[] => {
  if (segments.length === 0) return [];
  
  return segments.reduce<TranscriptionSegment[]>((acc, next) => {
    if (acc.length === 0) return [next];
    
    const last = acc[acc.length - 1];
    const gap = next.start - last.end;
    
    if (gap < maxGap) {
      // Merge: create new array with merged last segment
      return [
        ...acc.slice(0, -1),
        { ...last, end: next.end, text: `${last.text} ${next.text}` }
      ];
    }
    
    return [...acc, next];
  }, []);
};

/**
 * Pure function: Sort chunk results by index
 * 
 * @param results - Array of chunk results (may be out-of-order)
 * @returns New array sorted by chunkIndex
 */
export const sortByChunkIndex = (results: ChunkResult[]): ChunkResult[] =>
  [...results].sort((a, b) => a.chunkIndex - b.chunkIndex);

/**
 * Pure function: Calculate overlap start for a chunk
 * 
 * @param currentChunk - Current chunk result
 * @param nextChunk - Next chunk result (or undefined if last)
 * @returns Overlap start time, or undefined if no next chunk
 */
export const calculateOverlapStart = (
  currentChunk: ChunkResult,
  nextChunk: ChunkResult | undefined
): number | undefined => {
  if (!nextChunk) return undefined;
  return Math.max(currentChunk.startOffset, nextChunk.startOffset);
};

/**
 * Pure function: Detect duplicate text in overlap regions
 * 
 * Simple heuristic: check if last N words of chunk1 match first N words of chunk2.
 * In production, consider Levenshtein distance for better accuracy.
 * 
 * @param chunk1End - End text of first chunk
 * @param chunk2Start - Start text of second chunk
 * @param minMatches - Minimum word matches to consider overlap (default: 3)
 * @returns True if overlap detected
 */
export const detectTextOverlap = (
  chunk1End: string,
  chunk2Start: string,
  minMatches: number = 3
): boolean => {
  const words1 = chunk1End.trim().split(/\s+/).slice(-5);
  const words2 = chunk2Start.trim().split(/\s+/).slice(0, 5);

  if (words1.length === 0 || words2.length === 0) {
    return false;
  }

  const matches = words1.filter(word => words2.includes(word)).length;
  return matches >= minMatches;
};

/**
 * Pure function: Combine segment texts into single string
 * 
 * @param segments - Array of segments
 * @returns Combined text with space separator
 */
export const combineSegmentText = (segments: TranscriptionSegment[]): string =>
  segments.map(s => s.text).join(' ');

export class TimestampMergerFast {
  /**
   * Merge chunk results into single transcript using functional composition.
   * 
   * Pipeline:
   *   1. sortByChunkIndex() - ensure correct order
   *   2. adjustTimestamps() - convert relative to absolute
   *   3. filterOverlaps() - remove duplicate segments
   *   4. mergeAdjacentSegments() - combine small gaps
   *   5. combineSegmentText() - create final text
   * 
   * @param chunkResults - Array of chunk results (may be out-of-order)
   * @param totalDuration - Total audio duration in seconds
   * @param processingTime - Total processing time in milliseconds
   * @param workersUsed - Number of workers used
   * @returns Merged transcription result
   */
  mergeResults(
    chunkResults: ChunkResult[],
    totalDuration: number,
    processingTime: number,
    workersUsed: number
  ): FastModeTranscriptionResult {
    if (chunkResults.length === 0) {
      return {
        text: '',
        segments: [],
        duration: totalDuration,
        mode: 'fast',
        processingTime,
        chunksProcessed: 0,
        workersUsed,
      };
    }

    // Step 1: Sort by chunk index to ensure correct order
    const sortedResults = sortByChunkIndex(chunkResults);

    // Step 2-3: Process each chunk with functional composition
    const allSegments = sortedResults.flatMap((chunkResult, index) => {
      const nextChunkResult = sortedResults[index + 1];
      
      // Adjust timestamps: relative -> absolute
      const adjustedSegments = adjustTimestamps(
        chunkResult.segments,
        chunkResult.startOffset
      );
      
      // Filter overlaps (skip for last chunk)
      const overlapStart = calculateOverlapStart(chunkResult, nextChunkResult);
      return filterOverlaps(adjustedSegments, overlapStart);
    });

    // Step 4: Merge adjacent segments with small gaps
    const mergedSegments = mergeAdjacentSegments(allSegments);

    // Step 5: Combine text
    const text = combineSegmentText(mergedSegments);

    return {
      text,
      segments: mergedSegments,
      duration: totalDuration,
      mode: 'fast',
      processingTime,
      chunksProcessed: chunkResults.length,
      workersUsed,
    };
  }
}
