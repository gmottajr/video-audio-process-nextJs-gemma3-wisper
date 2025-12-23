/**
 * Speaker-Aware Transcript Formatter
 * 
 * Formats transcripts with speaker detection, timestamps, and improved readability
 */

import type { TranscriptionResult } from '@/contexts/TranscriberContext';

export interface FormattingOptions {
  includeTimestamps: boolean;
  includeSpeakerLabels: boolean;
  speakerDetectionSensitivity: 'low' | 'medium' | 'high';
  speakerNames?: Map<string, string>; // Maps "Speaker 1" -> "John Smith"
}

export interface SpeakerTurn {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  chunks: number[]; // Indices of chunks that belong to this turn
}

/**
 * Format timestamp as [MM:SS] or [HH:MM:SS]
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `[${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
  }
  return `[${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
}

/**
 * Detect speaker changes based on pauses and timing
 * Uses silence detection and conversational patterns
 */
export function detectSpeakerChanges(
  chunks: TranscriptionResult['chunks'],
  sensitivity: 'low' | 'medium' | 'high' = 'medium'
): number[] {
  if (!chunks || chunks.length === 0) return [];
  
  const changePoints: number[] = [0]; // Always start with first chunk
  
  // Pause thresholds (in seconds) that indicate speaker changes
  const pauseThreshold = {
    low: 3.0,    // Long pauses only (very conservative)
    medium: 1.5, // Normal pauses
    high: 0.8,   // Even short pauses (aggressive)
  }[sensitivity];
  
  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1];
    const currentChunk = chunks[i];
    
    const prevEnd = prevChunk.timestamp[1] ?? prevChunk.timestamp[0];
    const currentStart = currentChunk.timestamp[0];
    
    const pause = currentStart - prevEnd;
    
    // Detect speaker change based on pause
    if (pause >= pauseThreshold) {
      changePoints.push(i);
      continue;
    }
    
    // Additional heuristics for speaker detection
    const prevText = prevChunk.text.trim().toLowerCase();
    const currentText = currentChunk.text.trim().toLowerCase();
    
    // Detect question-answer patterns
    if (prevText.endsWith('?') && pause > 0.3) {
      changePoints.push(i);
      continue;
    }
    
    // Detect conversational markers indicating speaker change
    const conversationStarters = [
      'yeah', 'yes', 'no', 'okay', 'ok', 'alright', 'right',
      'so', 'well', 'um', 'uh', 'anyway', 'actually',
      'hey', 'hi', 'hello'
    ];
    
    const startsWithMarker = conversationStarters.some(marker => 
      currentText.startsWith(marker + ' ') || currentText === marker
    );
    
    if (startsWithMarker && pause > 0.2) {
      changePoints.push(i);
    }
  }
  
  return changePoints;
}

/**
 * Group chunks into speaker turns
 */
export function groupIntoSpeakerTurns(
  chunks: TranscriptionResult['chunks'],
  changePoints: number[]
): SpeakerTurn[] {
  if (!chunks || chunks.length === 0) return [];
  
  const turns: SpeakerTurn[] = [];
  
  for (let i = 0; i < changePoints.length; i++) {
    const startIdx = changePoints[i];
    const endIdx = i < changePoints.length - 1 ? changePoints[i + 1] : chunks.length;
    
    const turnChunks = chunks.slice(startIdx, endIdx);
    if (turnChunks.length === 0) continue;
    
    const text = turnChunks.map(c => c.text).join(' ').trim();
    const startTime = turnChunks[0].timestamp[0];
    const endTime = turnChunks[turnChunks.length - 1].timestamp[1] ?? 
                    turnChunks[turnChunks.length - 1].timestamp[0];
    
    turns.push({
      speaker: `Speaker ${turns.length + 1}`,
      text,
      startTime,
      endTime,
      chunks: Array.from({ length: endIdx - startIdx }, (_, idx) => startIdx + idx),
    });
  }
  
  return turns;
}

/**
 * Format transcript with speaker detection
 */
export function formatTranscriptWithSpeakers(
  text: string,
  transcriptionResult: TranscriptionResult | null,
  options: FormattingOptions
): string {
  // If no transcription result (just raw text), return as-is or with simple formatting
  if (!transcriptionResult || !transcriptionResult.chunks || transcriptionResult.chunks.length === 0) {
    return text;
  }
  
  // Detect speaker changes
  const changePoints = detectSpeakerChanges(
    transcriptionResult.chunks,
    options.speakerDetectionSensitivity
  );
  
  // Group into speaker turns
  const turns = groupIntoSpeakerTurns(transcriptionResult.chunks, changePoints);
  
  // Format output
  const lines: string[] = [];
  
  for (const turn of turns) {
    let line = '';
    
    // Add timestamp if requested
    if (options.includeTimestamps) {
      line += `${formatTimestamp(turn.startTime)} `;
    }
    
    // Add speaker label if requested
    if (options.includeSpeakerLabels) {
      // Use identified name if available, otherwise use generic label
      const speakerName = options.speakerNames?.get(turn.speaker) || turn.speaker;
      line += `**${speakerName}**: `;
    }
    
    // Add text
    line += turn.text;
    
    lines.push(line);
  }
  
  return lines.join('\n\n');
}

/**
 * Format enhanced transcript with speakers
 * Uses the enhanced text but applies speaker detection from original Whisper result
 */
export function formatEnhancedTranscriptWithSpeakers(
  enhancedText: string,
  originalTranscriptionResult: TranscriptionResult | null,
  options: FormattingOptions
): string {
  // If no original transcription result, return enhanced text as-is
  if (!originalTranscriptionResult || !originalTranscriptionResult.chunks) {
    return enhancedText;
  }
  
  // Detect speaker changes from original
  const changePoints = detectSpeakerChanges(
    originalTranscriptionResult.chunks,
    options.speakerDetectionSensitivity
  );
  
  // Group original chunks into turns to get timing
  const originalTurns = groupIntoSpeakerTurns(
    originalTranscriptionResult.chunks,
    changePoints
  );
  
  // Split enhanced text into sentences
  const enhancedSentences = enhancedText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  
  // Map enhanced sentences to speaker turns (approximate)
  const lines: string[] = [];
  let sentenceIdx = 0;
  const sentencesPerTurn = Math.ceil(enhancedSentences.length / originalTurns.length);
  
  for (let i = 0; i < originalTurns.length && sentenceIdx < enhancedSentences.length; i++) {
    const turn = originalTurns[i];
    let line = '';
    
    // Add timestamp if requested
    if (options.includeTimestamps) {
      line += `${formatTimestamp(turn.startTime)} `;
    }
    
    // Add speaker label if requested
    if (options.includeSpeakerLabels) {
      // Use identified name if available, otherwise use generic label
      const speakerName = options.speakerNames?.get(turn.speaker) || turn.speaker;
      line += `**${speakerName}**: `;
    }
    
    // Collect sentences for this turn
    const turnSentences: string[] = [];
    const endIdx = Math.min(sentenceIdx + sentencesPerTurn, enhancedSentences.length);
    
    while (sentenceIdx < endIdx) {
      turnSentences.push(enhancedSentences[sentenceIdx]);
      sentenceIdx++;
    }
    
    line += turnSentences.join(' ');
    lines.push(line);
  }
  
  // Add any remaining sentences
  if (sentenceIdx < enhancedSentences.length) {
    const remaining = enhancedSentences.slice(sentenceIdx).join(' ');
    if (remaining) {
      let line = '';
      if (options.includeSpeakerLabels) {
        const finalSpeakerLabel = `Speaker ${originalTurns.length + 1}`;
        const speakerName = options.speakerNames?.get(finalSpeakerLabel) || finalSpeakerLabel;
        line += `**${speakerName}**: `;
      }
      line += remaining;
      lines.push(line);
    }
  }
  
  return lines.join('\n\n');
}

/**
 * Get speaker statistics
 */
export function getSpeakerStats(turns: SpeakerTurn[]): {
  totalSpeakers: number;
  speakingTime: Record<string, number>;
  turnCounts: Record<string, number>;
} {
  const speakingTime: Record<string, number> = {};
  const turnCounts: Record<string, number> = {};
  
  for (const turn of turns) {
    const duration = turn.endTime - turn.startTime;
    speakingTime[turn.speaker] = (speakingTime[turn.speaker] || 0) + duration;
    turnCounts[turn.speaker] = (turnCounts[turn.speaker] || 0) + 1;
  }
  
  return {
    totalSpeakers: Object.keys(speakingTime).length,
    speakingTime,
    turnCounts,
  };
}


