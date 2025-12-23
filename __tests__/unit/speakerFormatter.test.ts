/**
 * Unit Tests for Speaker Formatter
 * 
 * Tests the speaker-aware transcript formatting functionality including
 * speaker detection, timestamp formatting, and various sensitivity levels.
 */

import {
  formatTimestamp,
  detectSpeakerChanges,
  groupIntoSpeakerTurns,
  formatTranscriptWithSpeakers,
  formatEnhancedTranscriptWithSpeakers,
  getSpeakerStats,
  type FormattingOptions,
  type SpeakerTurn,
} from '@/utils/speakerFormatter';
import type { TranscriptionResult } from '@/contexts/TranscriberContext';

describe('speakerFormatter', () => {
  describe('formatTimestamp', () => {
    it('should format seconds as [MM:SS]', () => {
      expect(formatTimestamp(65)).toBe('[01:05]');
      expect(formatTimestamp(125)).toBe('[02:05]');
      expect(formatTimestamp(0)).toBe('[00:00]');
    });

    it('should format hours as [HH:MM:SS]', () => {
      expect(formatTimestamp(3661)).toBe('[01:01:01]');
      expect(formatTimestamp(7325)).toBe('[02:02:05]');
      expect(formatTimestamp(3600)).toBe('[01:00:00]');
    });

    it('should pad single digits with zero', () => {
      expect(formatTimestamp(5)).toBe('[00:05]');
      expect(formatTimestamp(65)).toBe('[01:05]');
    });

    it('should handle edge cases', () => {
      expect(formatTimestamp(0)).toBe('[00:00]');
      expect(formatTimestamp(59)).toBe('[00:59]');
      expect(formatTimestamp(60)).toBe('[01:00]');
      expect(formatTimestamp(3599)).toBe('[59:59]');
    });

    it('should round down fractional seconds', () => {
      expect(formatTimestamp(65.7)).toBe('[01:05]');
      expect(formatTimestamp(125.999)).toBe('[02:05]');
    });
  });

  describe('detectSpeakerChanges', () => {
    const createChunks = (timings: Array<[number, number]>, texts?: string[]) => {
      return timings.map(([start, end], i) => ({
        text: texts?.[i] || `Text ${i}`,
        timestamp: [start, end] as [number, number | null],
      }));
    };

    it('should detect changes based on long pauses (low sensitivity)', () => {
      const chunks = createChunks([
        [0, 5],
        [8.5, 12], // 3.5 second pause
        [15, 20],
      ]);

      const changes = detectSpeakerChanges(chunks, 'low');
      
      expect(changes).toContain(0); // Always includes first
      expect(changes).toContain(1); // Should detect the 3.5s pause
    });

    it('should detect changes based on medium pauses', () => {
      const chunks = createChunks([
        [0, 5],
        [7, 10], // 2 second pause
        [10.5, 15], // 0.5 second pause
      ]);

      const changes = detectSpeakerChanges(chunks, 'medium');
      
      expect(changes).toContain(0);
      expect(changes).toContain(1); // Should detect 2s pause
      expect(changes).not.toContain(2); // Should not detect 0.5s pause
    });

    it('should detect changes based on short pauses (high sensitivity)', () => {
      const chunks = createChunks([
        [0, 5],
        [5.9, 10], // 0.9 second pause
        [11, 15], // 1 second pause
      ]);

      const changes = detectSpeakerChanges(chunks, 'high');
      
      expect(changes).toContain(0);
      expect(changes).toContain(1); // Should detect 0.9s pause
      expect(changes).toContain(2); // Should detect 1s pause
    });

    it('should detect question-answer patterns', () => {
      const chunks = createChunks(
        [
          [0, 5],
          [5.5, 10],
        ],
        ['What do you think?', 'I agree with that.']
      );

      const changes = detectSpeakerChanges(chunks, 'medium');
      
      expect(changes).toContain(1); // Should detect question followed by answer
    });

    it('should detect conversational markers', () => {
      const chunks = createChunks(
        [
          [0, 5],
          [5.3, 10],
          [10.4, 15],
        ],
        [
          'Here is my point.',
          'Yeah I understand that.',
          'Okay so what now.',
        ]
      );

      const changes = detectSpeakerChanges(chunks, 'medium');
      
      // Should detect "Yeah" and "Okay" as conversation starters
      expect(changes.length).toBeGreaterThan(1);
    });

    it('should handle empty chunks array', () => {
      const changes = detectSpeakerChanges([], 'medium');
      expect(changes).toEqual([]);
    });

    it('should handle single chunk', () => {
      const chunks = createChunks([[0, 5]]);
      const changes = detectSpeakerChanges(chunks, 'medium');
      
      expect(changes).toEqual([0]);
    });

    it('should always include first chunk', () => {
      const chunks = createChunks([
        [0, 5],
        [5.1, 10],
        [10.1, 15],
      ]);

      const changes = detectSpeakerChanges(chunks, 'low');
      
      expect(changes[0]).toBe(0);
    });

    it('should handle null end timestamps', () => {
      const chunks = [
        { text: 'First', timestamp: [0, null] as [number, number | null] },
        { text: 'Second', timestamp: [5, null] as [number, number | null] },
      ];

      const changes = detectSpeakerChanges(chunks, 'medium');
      
      expect(changes).toContain(0);
    });
  });

  describe('groupIntoSpeakerTurns', () => {
    const createChunks = (count: number) => {
      return Array.from({ length: count }, (_, i) => ({
        text: `Text ${i}`,
        timestamp: [i * 5, (i + 1) * 5] as [number, number | null],
      }));
    };

    it('should group consecutive chunks into turns', () => {
      const chunks = createChunks(6);
      const changePoints = [0, 2, 4]; // Chunks 0-1, 2-3, 4-5

      const turns = groupIntoSpeakerTurns(chunks, changePoints);

      expect(turns).toHaveLength(3);
      expect(turns[0].speaker).toBe('Speaker 1');
      expect(turns[1].speaker).toBe('Speaker 2');
      expect(turns[2].speaker).toBe('Speaker 3');
    });

    it('should combine text from multiple chunks', () => {
      const chunks = [
        { text: 'Hello', timestamp: [0, 5] as [number, number | null] },
        { text: 'world', timestamp: [5, 10] as [number, number | null] },
        { text: 'today', timestamp: [12, 17] as [number, number | null] },
      ];
      const changePoints = [0, 2];

      const turns = groupIntoSpeakerTurns(chunks, changePoints);

      expect(turns[0].text).toBe('Hello world');
      expect(turns[1].text).toBe('today');
    });

    it('should set correct start and end times', () => {
      const chunks = createChunks(3);
      const changePoints = [0, 2];

      const turns = groupIntoSpeakerTurns(chunks, changePoints);

      expect(turns[0].startTime).toBe(0);
      expect(turns[0].endTime).toBe(10);
      expect(turns[1].startTime).toBe(10);
      expect(turns[1].endTime).toBe(15);
    });

    it('should track chunk indices', () => {
      const chunks = createChunks(4);
      const changePoints = [0, 2];

      const turns = groupIntoSpeakerTurns(chunks, changePoints);

      expect(turns[0].chunks).toEqual([0, 1]);
      expect(turns[1].chunks).toEqual([2, 3]);
    });

    it('should handle empty chunks array', () => {
      const turns = groupIntoSpeakerTurns([], []);
      expect(turns).toEqual([]);
    });

    it('should handle single chunk', () => {
      const chunks = createChunks(1);
      const turns = groupIntoSpeakerTurns(chunks, [0]);

      expect(turns).toHaveLength(1);
      expect(turns[0].speaker).toBe('Speaker 1');
    });

    it('should trim whitespace from text', () => {
      const chunks = [
        { text: '  Hello  ', timestamp: [0, 5] as [number, number | null] },
        { text: '  world  ', timestamp: [5, 10] as [number, number | null] },
      ];
      const changePoints = [0];

      const turns = groupIntoSpeakerTurns(chunks, changePoints);

      expect(turns[0].text).toBe('Hello     world');
    });

    it('should handle null end timestamps', () => {
      const chunks = [
        { text: 'Hello', timestamp: [0, null] as [number, number | null] },
      ];
      const changePoints = [0];

      const turns = groupIntoSpeakerTurns(chunks, changePoints);

      expect(turns[0].endTime).toBe(0); // Uses start time when end is null
    });
  });

  describe('formatTranscriptWithSpeakers', () => {
    const createMockResult = (): TranscriptionResult => ({
      text: 'Hello world. How are you? I am fine.',
      chunks: [
        { text: 'Hello world.', timestamp: [0, 3] },
        { text: 'How are you?', timestamp: [5, 8] },
        { text: 'I am fine.', timestamp: [10, 13] },
      ],
    });

    it('should return original text when no transcription result', () => {
      const text = 'Plain text';
      const result = formatTranscriptWithSpeakers(text, null, {
        includeTimestamps: false,
        includeSpeakerLabels: false,
        speakerDetectionSensitivity: 'medium',
      });

      expect(result).toBe(text);
    });

    it('should format with speaker labels', () => {
      const mockResult = createMockResult();
      const options: FormattingOptions = {
        includeTimestamps: false,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      };

      const result = formatTranscriptWithSpeakers(mockResult.text, mockResult, options);

      expect(result).toContain('**Speaker 1**:');
      expect(result).toContain('Hello world.');
    });

    it('should format with timestamps', () => {
      const mockResult = createMockResult();
      const options: FormattingOptions = {
        includeTimestamps: true,
        includeSpeakerLabels: false,
        speakerDetectionSensitivity: 'medium',
      };

      const result = formatTranscriptWithSpeakers(mockResult.text, mockResult, options);

      expect(result).toContain('[00:00]');
      expect(result).toContain('Hello world.');
    });

    it('should format with both timestamps and speakers', () => {
      const mockResult = createMockResult();
      const options: FormattingOptions = {
        includeTimestamps: true,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      };

      const result = formatTranscriptWithSpeakers(mockResult.text, mockResult, options);

      expect(result).toContain('[00:00] **Speaker 1**:');
      expect(result).toContain('Hello world.');
    });

    it('should separate speakers with blank lines', () => {
      const mockResult = createMockResult();
      const options: FormattingOptions = {
        includeTimestamps: false,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      };

      const result = formatTranscriptWithSpeakers(mockResult.text, mockResult, options);

      expect(result).toContain('\n\n'); // Double newline between speakers
    });

    it('should handle different sensitivity levels', () => {
      const mockResult = createMockResult();
      
      const lowSensitivity = formatTranscriptWithSpeakers(mockResult.text, mockResult, {
        includeTimestamps: false,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'low',
      });

      const highSensitivity = formatTranscriptWithSpeakers(mockResult.text, mockResult, {
        includeTimestamps: false,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'high',
      });

      // High sensitivity should detect more speakers (or same)
      const lowSpeakerCount = (lowSensitivity.match(/\*\*Speaker/g) || []).length;
      const highSpeakerCount = (highSensitivity.match(/\*\*Speaker/g) || []).length;

      expect(highSpeakerCount).toBeGreaterThanOrEqual(lowSpeakerCount);
    });

    it('should handle empty chunks', () => {
      const emptyResult: TranscriptionResult = {
        text: 'Some text',
        chunks: [],
      };

      const result = formatTranscriptWithSpeakers(emptyResult.text, emptyResult, {
        includeTimestamps: false,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      });

      expect(result).toBe('Some text');
    });
  });

  describe('formatEnhancedTranscriptWithSpeakers', () => {
    const createMockResult = (): TranscriptionResult => ({
      text: 'Um hello world. Uh how are you? Well I am fine.',
      chunks: [
        { text: 'Um hello world.', timestamp: [0, 3] },
        { text: 'Uh how are you?', timestamp: [5, 8] },
        { text: 'Well I am fine.', timestamp: [10, 13] },
      ],
    });

    it('should return enhanced text when no transcription result', () => {
      const enhancedText = 'Enhanced text without filler words';
      const result = formatEnhancedTranscriptWithSpeakers(enhancedText, null, {
        includeTimestamps: false,
        includeSpeakerLabels: false,
        speakerDetectionSensitivity: 'medium',
      });

      expect(result).toBe(enhancedText);
    });

    it('should apply speaker detection to enhanced text', () => {
      const mockResult = createMockResult();
      const enhancedText = 'Hello world. How are you? I am fine.';
      
      const result = formatEnhancedTranscriptWithSpeakers(enhancedText, mockResult, {
        includeTimestamps: false,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      });

      expect(result).toContain('**Speaker');
      expect(result).toContain('Hello world');
    });

    it('should map enhanced sentences to original timing', () => {
      const mockResult = createMockResult();
      const enhancedText = 'Hello world. How are you? I am fine.';
      
      const result = formatEnhancedTranscriptWithSpeakers(enhancedText, mockResult, {
        includeTimestamps: true,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      });

      expect(result).toContain('[00:00]'); // Should have timestamp from original
      expect(result).toContain('Hello world'); // Enhanced text content
    });

    it('should handle enhanced text with different sentence count', () => {
      const mockResult = createMockResult();
      const enhancedText = 'Hello world. How are you?';
      
      const result = formatEnhancedTranscriptWithSpeakers(enhancedText, mockResult, {
        includeTimestamps: false,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      });

      expect(result).toBeTruthy();
      expect(result).toContain('Speaker');
    });

    it('should handle enhanced text with more sentences than original', () => {
      const mockResult = createMockResult();
      const enhancedText = 'Hello. World. How. Are. You. I. Am. Fine.';
      
      const result = formatEnhancedTranscriptWithSpeakers(enhancedText, mockResult, {
        includeTimestamps: false,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      });

      expect(result).toBeTruthy();
      // Should handle all sentences
      const sentenceCount = (result.match(/\./g) || []).length;
      expect(sentenceCount).toBeGreaterThan(0);
    });
  });

  describe('getSpeakerStats', () => {
    it('should calculate total speakers', () => {
      const turns: SpeakerTurn[] = [
        {
          speaker: 'Speaker 1',
          text: 'Hello',
          startTime: 0,
          endTime: 5,
          chunks: [0],
        },
        {
          speaker: 'Speaker 2',
          text: 'Hi',
          startTime: 5,
          endTime: 10,
          chunks: [1],
        },
      ];

      const stats = getSpeakerStats(turns);
      expect(stats.totalSpeakers).toBe(2);
    });

    it('should calculate speaking time per speaker', () => {
      const turns: SpeakerTurn[] = [
        {
          speaker: 'Speaker 1',
          text: 'Hello',
          startTime: 0,
          endTime: 5,
          chunks: [0],
        },
        {
          speaker: 'Speaker 2',
          text: 'Hi',
          startTime: 5,
          endTime: 12,
          chunks: [1],
        },
        {
          speaker: 'Speaker 1',
          text: 'Goodbye',
          startTime: 12,
          endTime: 15,
          chunks: [2],
        },
      ];

      const stats = getSpeakerStats(turns);
      
      expect(stats.speakingTime['Speaker 1']).toBe(8); // 5 + 3
      expect(stats.speakingTime['Speaker 2']).toBe(7);
    });

    it('should calculate turn counts per speaker', () => {
      const turns: SpeakerTurn[] = [
        { speaker: 'Speaker 1', text: 'A', startTime: 0, endTime: 5, chunks: [0] },
        { speaker: 'Speaker 2', text: 'B', startTime: 5, endTime: 10, chunks: [1] },
        { speaker: 'Speaker 1', text: 'C', startTime: 10, endTime: 15, chunks: [2] },
        { speaker: 'Speaker 1', text: 'D', startTime: 15, endTime: 20, chunks: [3] },
      ];

      const stats = getSpeakerStats(turns);
      
      expect(stats.turnCounts['Speaker 1']).toBe(3);
      expect(stats.turnCounts['Speaker 2']).toBe(1);
    });

    it('should handle empty turns array', () => {
      const stats = getSpeakerStats([]);
      
      expect(stats.totalSpeakers).toBe(0);
      expect(stats.speakingTime).toEqual({});
      expect(stats.turnCounts).toEqual({});
    });

    it('should handle single speaker', () => {
      const turns: SpeakerTurn[] = [
        { speaker: 'Speaker 1', text: 'Monologue', startTime: 0, endTime: 100, chunks: [0] },
      ];

      const stats = getSpeakerStats(turns);
      
      expect(stats.totalSpeakers).toBe(1);
      expect(stats.speakingTime['Speaker 1']).toBe(100);
      expect(stats.turnCounts['Speaker 1']).toBe(1);
    });
  });

  describe('integration tests', () => {
    it('should handle complete workflow with realistic data', () => {
      const mockResult: TranscriptionResult = {
        text: 'Hello everyone. Thank you for joining. Does anyone have questions? Yes I do. Great let me answer that.',
        chunks: [
          { text: 'Hello everyone.', timestamp: [0, 2] },
          { text: 'Thank you for joining.', timestamp: [2, 5] },
          { text: 'Does anyone have questions?', timestamp: [5, 8] },
          { text: 'Yes I do.', timestamp: [10, 12] },
          { text: 'Great let me answer that.', timestamp: [12, 15] },
        ],
      };

      const options: FormattingOptions = {
        includeTimestamps: true,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      };

      const result = formatTranscriptWithSpeakers(mockResult.text, mockResult, options);

      // Should detect at least 2 speakers (question-answer pattern)
      const speakerMatches = result.match(/\*\*Speaker/g);
      expect(speakerMatches).toBeTruthy();
      expect(speakerMatches!.length).toBeGreaterThanOrEqual(2);

      // Should have timestamps
      expect(result).toContain('[00:');

      // Should have content
      expect(result).toContain('Hello everyone');
      expect(result).toContain('Yes I do');
    });

    it('should preserve all text content through formatting', () => {
      const mockResult: TranscriptionResult = {
        text: 'First sentence. Second sentence. Third sentence.',
        chunks: [
          { text: 'First sentence.', timestamp: [0, 3] },
          { text: 'Second sentence.', timestamp: [5, 8] },
          { text: 'Third sentence.', timestamp: [10, 13] },
        ],
      };

      const result = formatTranscriptWithSpeakers(mockResult.text, mockResult, {
        includeTimestamps: true,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'high',
      });

      // All original content should be present (ignoring formatting)
      const cleanResult = result.replace(/\[.*?\]|\*\*/g, '').trim();
      expect(cleanResult).toContain('First sentence');
      expect(cleanResult).toContain('Second sentence');
      expect(cleanResult).toContain('Third sentence');
    });
  });
});





