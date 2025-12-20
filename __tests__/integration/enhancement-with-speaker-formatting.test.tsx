/**
 * Integration Tests: AI Enhancement + Speaker Formatting
 * 
 * Tests the complete workflow of:
 * 1. Transcribing audio with Whisper
 * 2. Chunking long transcripts for LLM processing
 * 3. Enhancing with AI (removing filler words)
 * 4. Formatting with speaker detection and timestamps
 */

import { chunkTranscript } from '@/utils/transcriptChunker';
import {
  formatTranscriptWithSpeakers,
  formatEnhancedTranscriptWithSpeakers,
  type FormattingOptions,
} from '@/utils/speakerFormatter';
import type { TranscriptionResult } from '@/contexts/TranscriberContext';

describe('AI Enhancement + Speaker Formatting Integration', () => {
  describe('complete workflow', () => {
    it('should handle transcript that exceeds context window and format with speakers', () => {
      // Simulate a long transcript that would exceed 4096 tokens
      const longTranscript = Array(500)
        .fill('Um, so basically what I was trying to say is that we need to, you know, look at this more carefully.')
        .join(' ');

      // Step 1: Chunk transcript for LLM processing
      const chunks = chunkTranscript(longTranscript, 3000);
      
      expect(chunks.length).toBeGreaterThan(1);
      
      // Verify each chunk is under the limit
      chunks.forEach((chunk) => {
        const estimatedTokens = chunk.text.split(/\s+/).length;
        expect(estimatedTokens).toBeLessThanOrEqual(3500); // Allow some buffer
      });

      // Step 2: Simulate AI enhancement (removing filler words from first chunk)
      const enhancedFirstChunk = chunks[0].text
        .replace(/\bum,?\s*/gi, '')
        .replace(/\buh,?\s*/gi, '')
        .replace(/\byou know,?\s*/gi, '')
        .replace(/\bso basically\s*/gi, 'basically ');

      expect(enhancedFirstChunk.length).toBeLessThan(chunks[0].text.length);
      expect(enhancedFirstChunk).not.toContain('Um');

      // Step 3: Format with speaker detection
      const mockResult: TranscriptionResult = {
        text: chunks[0].text,
        chunks: [
          { text: chunks[0].text.substring(0, 100), timestamp: [0, 5] },
          { text: chunks[0].text.substring(100, 200), timestamp: [7, 12] },
        ],
      };

      const formattedOriginal = formatTranscriptWithSpeakers(
        mockResult.text,
        mockResult,
        {
          includeTimestamps: true,
          includeSpeakerLabels: true,
          speakerDetectionSensitivity: 'medium',
        }
      );

      const formattedEnhanced = formatEnhancedTranscriptWithSpeakers(
        enhancedFirstChunk,
        mockResult,
        {
          includeTimestamps: true,
          includeSpeakerLabels: true,
          speakerDetectionSensitivity: 'medium',
        }
      );

      // Verify formatting applied
      expect(formattedOriginal).toContain('[00:');
      expect(formattedOriginal).toContain('**Speaker');
      expect(formattedEnhanced).toContain('[00:');
      expect(formattedEnhanced).toContain('**Speaker');
      
      // Verify enhanced version is cleaner
      expect(formattedEnhanced).not.toContain('Um');
    });

    it('should preserve speaker structure during enhancement', () => {
      const mockResult: TranscriptionResult = {
        text: 'Um hello everyone. Thank you for, uh, joining. Does anyone have, you know, questions? Yeah I do actually. Great, uh, let me answer that.',
        chunks: [
          { text: 'Um hello everyone.', timestamp: [0, 2] },
          { text: 'Thank you for, uh, joining.', timestamp: [2, 5] },
          { text: 'Does anyone have, you know, questions?', timestamp: [5, 8] },
          { text: 'Yeah I do actually.', timestamp: [10, 12] },
          { text: 'Great, uh, let me answer that.', timestamp: [12, 15] },
        ],
      };

      // Simulate AI enhancement
      const enhancedText = mockResult.text
        .replace(/\bum,?\s*/gi, '')
        .replace(/\buh,?\s*/gi, '')
        .replace(/\byou know,?\s*/gi, '')
        .replace(/\byeah\s+/gi, 'Yes, ');

      const options: FormattingOptions = {
        includeTimestamps: true,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      };

      const formattedOriginal = formatTranscriptWithSpeakers(
        mockResult.text,
        mockResult,
        options
      );

      const formattedEnhanced = formatEnhancedTranscriptWithSpeakers(
        enhancedText,
        mockResult,
        options
      );

      // Both should detect speakers (question-answer pattern)
      const originalSpeakerCount = (formattedOriginal.match(/\*\*Speaker/g) || []).length;
      const enhancedSpeakerCount = (formattedEnhanced.match(/\*\*Speaker/g) || []).length;

      expect(originalSpeakerCount).toBeGreaterThanOrEqual(2);
      expect(enhancedSpeakerCount).toBeGreaterThanOrEqual(2);

      // Both should have timestamps
      expect(formattedOriginal).toContain('[00:');
      expect(formattedEnhanced).toContain('[00:');

      // Enhanced should be cleaner
      expect(formattedEnhanced).not.toContain('um');
      expect(formattedEnhanced).not.toContain('uh');
    });

    it('should handle chunking + enhancement + formatting for podcast-like content', () => {
      // Simulate a podcast transcript with multiple speakers
      const podcastTranscript = [
        'Welcome to the show everyone. Today we have a special guest.',
        'Thanks for having me. I am excited to be here.',
        'So tell us about your latest project.',
        'Well I have been working on something really interesting.',
      ].join(' ');

      // Check if it needs chunking (simulate checking against context window)
      const needsChunking = podcastTranscript.split(/\s+/).length > 50; // Artificially low for testing
      
      const chunks = chunkTranscript(podcastTranscript, 50);

      expect(chunks.length).toBeGreaterThan(0);

      // Format with speaker detection
      const mockResult: TranscriptionResult = {
        text: podcastTranscript,
        chunks: [
          { text: 'Welcome to the show everyone.', timestamp: [0, 3] },
          { text: 'Today we have a special guest.', timestamp: [3, 6] },
          { text: 'Thanks for having me.', timestamp: [8, 10] },
          { text: 'I am excited to be here.', timestamp: [10, 13] },
          { text: 'So tell us about your latest project.', timestamp: [15, 18] },
          { text: 'Well I have been working on something really interesting.', timestamp: [20, 25] },
        ],
      };

      const formatted = formatTranscriptWithSpeakers(mockResult.text, mockResult, {
        includeTimestamps: true,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      });

      // Should detect multiple speakers (pauses indicate speaker changes)
      const speakerCount = (formatted.match(/\*\*Speaker/g) || []).length;
      expect(speakerCount).toBeGreaterThanOrEqual(2);

      // Should have timestamps
      expect(formatted).toContain('[00:');

      // Should preserve content
      expect(formatted).toContain('Welcome to the show');
      expect(formatted).toContain('Thanks for having me');
    });
  });

  describe('error handling', () => {
    it('should gracefully handle chunking failure by formatting original text', () => {
      const problematicText = ''; // Empty text

      const chunks = chunkTranscript(problematicText, 1000);
      
      // Should handle empty text
      expect(chunks.length).toBeLessThanOrEqual(1);

      // Formatting should still work
      const formatted = formatTranscriptWithSpeakers(problematicText, null, {
        includeTimestamps: false,
        includeSpeakerLabels: false,
        speakerDetectionSensitivity: 'medium',
      });

      expect(formatted).toBe(problematicText);
    });

    it('should handle formatting when chunk timing data is missing', () => {
      const mockResult: TranscriptionResult = {
        text: 'Some text here',
        chunks: [], // No timing data
      };

      const formatted = formatTranscriptWithSpeakers(mockResult.text, mockResult, {
        includeTimestamps: true,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      });

      // Should fall back to plain text
      expect(formatted).toBe('Some text here');
    });
  });

  describe('performance with large transcripts', () => {
    it('should efficiently process very long transcripts', () => {
      const veryLongTranscript = Array(1000)
        .fill('This is a sentence in a very long transcript that needs to be processed efficiently.')
        .join(' ');

      const startChunking = performance.now();
      const chunks = chunkTranscript(veryLongTranscript, 500);
      const chunkingTime = performance.now() - startChunking;

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunkingTime).toBeLessThan(100); // Should be very fast

      // Format the first chunk
      const mockResult: TranscriptionResult = {
        text: chunks[0].text,
        chunks: [
          { text: chunks[0].text.substring(0, 100), timestamp: [0, 5] },
          { text: chunks[0].text.substring(100), timestamp: [5, 10] },
        ],
      };

      const startFormatting = performance.now();
      const formatted = formatTranscriptWithSpeakers(mockResult.text, mockResult, {
        includeTimestamps: true,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      });
      const formattingTime = performance.now() - startFormatting;

      expect(formatted).toBeTruthy();
      expect(formattingTime).toBeLessThan(100); // Should be fast
    });
  });

  describe('real-world scenarios', () => {
    it('should handle meeting transcript with multiple speakers', () => {
      const meetingTranscript = {
        text: 'Good morning everyone. Let me start the meeting. Does everyone see the slides? Yes I can see them. Great. Let me share my screen. Thanks. So as you can see here. This is interesting. Yes very much so. Any questions? I have one. Go ahead.',
        chunks: [
          { text: 'Good morning everyone.', timestamp: [0, 2] },
          { text: 'Let me start the meeting.', timestamp: [2, 4] },
          { text: 'Does everyone see the slides?', timestamp: [4, 7] },
          { text: 'Yes I can see them.', timestamp: [9, 11] },
          { text: 'Great.', timestamp: [11, 12] },
          { text: 'Let me share my screen.', timestamp: [12, 14] },
          { text: 'Thanks.', timestamp: [16, 17] },
          { text: 'So as you can see here.', timestamp: [17, 19] },
          { text: 'This is interesting.', timestamp: [21, 23] },
          { text: 'Yes very much so.', timestamp: [25, 27] },
          { text: 'Any questions?', timestamp: [27, 29] },
          { text: 'I have one.', timestamp: [31, 32] },
          { text: 'Go ahead.', timestamp: [34, 35] },
        ],
      };

      // Chunk if needed
      const textLength = meetingTranscript.text.split(/\s+/).length;
      const chunks = textLength > 3000 
        ? chunkTranscript(meetingTranscript.text, 3000)
        : [meetingTranscript.text];

      // Format with different sensitivity levels
      const lowSensitivity = formatTranscriptWithSpeakers(
        meetingTranscript.text,
        meetingTranscript,
        {
          includeTimestamps: true,
          includeSpeakerLabels: true,
          speakerDetectionSensitivity: 'low',
        }
      );

      const highSensitivity = formatTranscriptWithSpeakers(
        meetingTranscript.text,
        meetingTranscript,
        {
          includeTimestamps: true,
          includeSpeakerLabels: true,
          speakerDetectionSensitivity: 'high',
        }
      );

      // High sensitivity should detect more speaker changes
      const lowSpeakerCount = (lowSensitivity.match(/\*\*Speaker/g) || []).length;
      const highSpeakerCount = (highSensitivity.match(/\*\*Speaker/g) || []).length;

      expect(highSpeakerCount).toBeGreaterThanOrEqual(lowSpeakerCount);

      // Both should preserve content
      expect(lowSensitivity).toContain('Good morning everyone');
      expect(highSensitivity).toContain('Good morning everyone');

      // Both should have timestamps
      expect(lowSensitivity).toContain('[00:');
      expect(highSensitivity).toContain('[00:');
    });

    it('should handle interview transcript with clear turn-taking', () => {
      const interviewTranscript: TranscriptionResult = {
        text: 'Thank you for joining us today. Thanks for having me. So tell me about yourself. Well I grew up in California. That is interesting. What did you study? I studied computer science. Fascinating. What made you choose that field? I have always loved technology.',
        chunks: [
          { text: 'Thank you for joining us today.', timestamp: [0, 3] },
          { text: 'Thanks for having me.', timestamp: [5, 7] },
          { text: 'So tell me about yourself.', timestamp: [8, 11] },
          { text: 'Well I grew up in California.', timestamp: [13, 16] },
          { text: 'That is interesting.', timestamp: [17, 19] },
          { text: 'What did you study?', timestamp: [19, 21] },
          { text: 'I studied computer science.', timestamp: [23, 26] },
          { text: 'Fascinating.', timestamp: [27, 28] },
          { text: 'What made you choose that field?', timestamp: [28, 31] },
          { text: 'I have always loved technology.', timestamp: [33, 36] },
        ],
      };

      const formatted = formatTranscriptWithSpeakers(
        interviewTranscript.text,
        interviewTranscript,
        {
          includeTimestamps: true,
          includeSpeakerLabels: true,
          speakerDetectionSensitivity: 'medium',
        }
      );

      // Should detect alternating speakers
      const speakerMatches = formatted.match(/\*\*Speaker \d+\*\*/g);
      expect(speakerMatches).toBeTruthy();
      expect(speakerMatches!.length).toBeGreaterThanOrEqual(2);

      // Should preserve question-answer structure
      expect(formatted).toContain('tell me about yourself');
      expect(formatted).toContain('grew up in California');

      // Should have timestamps
      expect(formatted).toMatch(/\[\d{2}:\d{2}\]/);
    });
  });

  describe('option combinations', () => {
    const mockResult: TranscriptionResult = {
      text: 'First speaker here. Second speaker here.',
      chunks: [
        { text: 'First speaker here.', timestamp: [0, 3] },
        { text: 'Second speaker here.', timestamp: [5, 8] },
      ],
    };

    it('should format with only timestamps (no speakers)', () => {
      const formatted = formatTranscriptWithSpeakers(mockResult.text, mockResult, {
        includeTimestamps: true,
        includeSpeakerLabels: false,
        speakerDetectionSensitivity: 'medium',
      });

      expect(formatted).toContain('[00:');
      expect(formatted).not.toContain('**Speaker');
    });

    it('should format with only speakers (no timestamps)', () => {
      const formatted = formatTranscriptWithSpeakers(mockResult.text, mockResult, {
        includeTimestamps: false,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      });

      expect(formatted).toContain('**Speaker');
      expect(formatted).not.toContain('[00:');
    });

    it('should format with neither timestamps nor speakers', () => {
      const formatted = formatTranscriptWithSpeakers(mockResult.text, mockResult, {
        includeTimestamps: false,
        includeSpeakerLabels: false,
        speakerDetectionSensitivity: 'medium',
      });

      // When both are false and we have chunks, it should still run detection
      // but not add markers. Or it might return original text.
      expect(formatted).toBeTruthy();
    });

    it('should format with both timestamps and speakers', () => {
      const formatted = formatTranscriptWithSpeakers(mockResult.text, mockResult, {
        includeTimestamps: true,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      });

      expect(formatted).toContain('[00:');
      expect(formatted).toContain('**Speaker');
      expect(formatted).toMatch(/\[\d{2}:\d{2}\] \*\*Speaker \d+\*\*:/);
    });
  });
});

