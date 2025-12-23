/**
 * Integration Tests for Speaker Identification Flow
 * 
 * Tests the complete speaker identification workflow from UI to formatting
 */

import { identifySpeakers, applySpeakerNames } from '@/utils/speakerIdentifier';
import { formatTranscriptWithSpeakers, formatEnhancedTranscriptWithSpeakers } from '@/utils/speakerFormatter';
import type { TranscriptionResult } from '@/contexts/TranscriberContext';
import type { SpeakerIdentificationOptions } from '@/utils/speakerIdentifier';
import type { FormattingOptions } from '@/utils/speakerFormatter';

describe('Speaker Identification Integration', () => {
  // Mock transcription result
  const mockTranscription: TranscriptionResult = {
    text: 'Speaker 1: Hello everyone. Speaker 2: Thanks for joining.',
    chunks: [
      { text: 'Hello everyone.', timestamp: [0, 2000] },
      { text: 'Thanks for joining.', timestamp: [2500, 4500] },
    ],
    tps: 1,
  };

  // Mock LLM
  const createMockLLM = (response: string) => {
    return jest.fn().mockResolvedValue(response);
  };

  describe('End-to-End: Auto Detection → Formatting', () => {
    it('should detect speakers and format transcript with names', async () => {
      // Step 1: AI Detection
      const transcript = `
        Speaker 1: Hi, I'm John Smith from engineering.
        Speaker 2: Thanks John. I'm Mary Johnson from marketing.
      `;

      const mockResponse = JSON.stringify({
        speakers: [
          {
            label: 'Speaker 1',
            name: 'John Smith',
            confidence: 0.95,
            method: 'self-introduction',
            evidence: "Said 'I'm John Smith'"
          },
          {
            label: 'Speaker 2',
            name: 'Mary Johnson',
            confidence: 0.95,
            method: 'self-introduction',
            evidence: "Said 'I'm Mary Johnson'"
          }
        ],
        suggestions: [],
        warnings: []
      });

      const mockLLM = createMockLLM(mockResponse);

      const identificationOptions: SpeakerIdentificationOptions = {
        mode: 'auto',
        useAIDetection: true,
        transcript,
      };

      const identificationResult = await identifySpeakers(identificationOptions, mockLLM);

      // Verify identification
      expect(identificationResult.speakerMap.get('Speaker 1')).toBe('John Smith');
      expect(identificationResult.speakerMap.get('Speaker 2')).toBe('Mary Johnson');

      // Step 2: Apply to formatted transcript
      const mockTranscriptionWithSpeakers: TranscriptionResult = {
        text: transcript,
        chunks: [
          { text: "Hi, I'm John Smith from engineering.", timestamp: [0, 3000] },
          { text: "Thanks John. I'm Mary Johnson from marketing.", timestamp: [3500, 7000] },
        ],
        tps: 1,
      };

      const formattingOptions: FormattingOptions = {
        includeTimestamps: true,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
        speakerNames: identificationResult.speakerMap,
      };

      const formatted = formatTranscriptWithSpeakers(
        transcript,
        mockTranscriptionWithSpeakers,
        formattingOptions
      );

      // Verify formatting includes actual names
      expect(formatted).toContain('John Smith');
      expect(formatted).toContain('Mary Johnson');
      expect(formatted).not.toContain('Speaker 1');
      expect(formatted).not.toContain('Speaker 2');
    });

    it('should work with enhanced transcript', async () => {
      // Step 1: Identify speakers
      const originalTranscript = `
        Speaker 1: Um, so, like, I'm John.
        Speaker 2: Thanks, uh, I'm Mary.
      `;

      const mockResponse = JSON.stringify({
        speakers: [
          { label: 'Speaker 1', name: 'John', confidence: 0.85, method: 'self-introduction', evidence: "Said 'I'm John'" },
          { label: 'Speaker 2', name: 'Mary', confidence: 0.85, method: 'self-introduction', evidence: "Said 'I'm Mary'" }
        ],
        suggestions: [],
        warnings: []
      });

      const mockLLM = createMockLLM(mockResponse);

      const identificationResult = await identifySpeakers({
        mode: 'auto',
        useAIDetection: true,
        transcript: originalTranscript,
      }, mockLLM);

      // Step 2: Format enhanced transcript
      const enhancedText = "I'm John. Thanks, I'm Mary."; // Filler words removed

      const mockOriginalResult: TranscriptionResult = {
        text: originalTranscript,
        chunks: [
          { text: "Um, so, like, I'm John.", timestamp: [0, 2000] },
          { text: "Thanks, uh, I'm Mary.", timestamp: [2500, 4500] },
        ],
        tps: 1,
      };

      const formattingOptions: FormattingOptions = {
        includeTimestamps: true,
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
        speakerNames: identificationResult.speakerMap,
      };

      const formatted = formatEnhancedTranscriptWithSpeakers(
        enhancedText,
        mockOriginalResult,
        formattingOptions
      );

      // Verify names are applied to enhanced text
      expect(formatted).toContain('John');
      expect(formatted).toContain('Mary');
      expect(formatted).not.toContain('Speaker 1');
    });
  });

  describe('End-to-End: User Input → Validation → Formatting', () => {
    it('should validate correct user-provided names', async () => {
      const transcript = `
        Speaker 1: I'm John Smith.
        Speaker 2: Thanks. I'm Mary Johnson.
      `;

      const mockResponse = JSON.stringify({
        validations: [
          {
            label: 'Speaker 1',
            providedName: 'John Smith',
            confidence: 0.95,
            validated: true,
            evidence: 'Name matches transcript',
            suggestions: []
          },
          {
            label: 'Speaker 2',
            providedName: 'Mary Johnson',
            confidence: 0.95,
            validated: true,
            evidence: 'Name matches transcript',
            suggestions: []
          }
        ],
        warnings: []
      });

      const mockLLM = createMockLLM(mockResponse);

      const result = await identifySpeakers({
        mode: 'all-speakers',
        allSpeakers: ['John Smith', 'Mary Johnson'],
        useAIDetection: true,
        transcript,
      }, mockLLM);

      expect(result.speakerMap.get('Speaker 1')).toBe('John Smith');
      expect(result.speakerMap.get('Speaker 2')).toBe('Mary Johnson');
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about incorrect user-provided names and suggest corrections', async () => {
      const transcript = `
        Speaker 1: I'm Jonathan.
        Speaker 2: I'm Maria.
      `;

      const mockResponse = JSON.stringify({
        validations: [
          {
            label: 'Speaker 1',
            providedName: 'John',
            confidence: 0.6,
            validated: false,
            evidence: 'Transcript shows "Jonathan" not "John"',
            suggestions: ['Jonathan']
          },
          {
            label: 'Speaker 2',
            providedName: 'Mary',
            confidence: 0.6,
            validated: false,
            evidence: 'Transcript shows "Maria" not "Mary"',
            suggestions: ['Maria']
          }
        ],
        warnings: [
          'Speaker 1: Provided "John" but transcript mentions "Jonathan"',
          'Speaker 2: Provided "Mary" but transcript mentions "Maria"'
        ]
      });

      const mockLLM = createMockLLM(mockResponse);

      const result = await identifySpeakers({
        mode: 'all-speakers',
        allSpeakers: ['John', 'Mary'],
        useAIDetection: true,
        transcript,
      }, mockLLM);

      // Should still use provided names (user input takes precedence)
      expect(result.speakerMap.get('Speaker 1')).toBe('John');
      expect(result.speakerMap.get('Speaker 2')).toBe('Mary');

      // But should provide warnings
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toContain('Jonathan');
      expect(result.warnings[1]).toContain('Maria');

      // And suggestions
      expect(result.suggestions.some(s => s.suggestedName === 'Jonathan')).toBe(true);
      expect(result.suggestions.some(s => s.suggestedName === 'Maria')).toBe(true);
    });
  });

  describe('End-to-End: First Speaker → Detection → Formatting', () => {
    it('should use first speaker from user and detect others', async () => {
      const transcript = `
        Speaker 1: Welcome everyone.
        Speaker 2: Thanks John. I'm Mary.
        Speaker 3: And I'm Alex.
      `;

      const mockResponse = JSON.stringify({
        speakers: [
          {
            label: 'Speaker 2',
            name: 'Mary',
            confidence: 0.85,
            method: 'self-introduction',
            evidence: "Said 'I'm Mary'"
          },
          {
            label: 'Speaker 3',
            name: 'Alex',
            confidence: 0.85,
            method: 'self-introduction',
            evidence: "Said 'I'm Alex'"
          }
        ],
        suggestions: [],
        warnings: []
      });

      const mockLLM = createMockLLM(mockResponse);

      const result = await identifySpeakers({
        mode: 'first-speaker',
        firstSpeaker: 'John Smith',
        useAIDetection: true,
        transcript,
      }, mockLLM);

      expect(result.speakerMap.get('Speaker 1')).toBe('John Smith');
      expect(result.speakerMap.get('Speaker 2')).toBe('Mary');
      expect(result.speakerMap.get('Speaker 3')).toBe('Alex');
      expect(result.detectionMethod.get('Speaker 1')).toBe('user-provided');
    });
  });

  describe('Error Recovery', () => {
    it('should fallback to generic labels when AI fails', async () => {
      const transcript = 'Speaker 1: Hello. Speaker 2: Hi.';

      const mockLLM = jest.fn().mockRejectedValue(new Error('AI timeout'));

      const result = await identifySpeakers({
        mode: 'auto',
        useAIDetection: true,
        transcript,
      }, mockLLM);

      // Should use generic labels
      expect(result.speakerMap.get('Speaker 1')).toBe('Speaker 1');
      expect(result.speakerMap.get('Speaker 2')).toBe('Speaker 2');
      expect(result.confidence.get('Speaker 1')).toBe(0.0);
      expect(result.warnings.some(w => w.includes('AI detection failed'))).toBe(true);

      // Should still be able to format
      const formatted = formatTranscriptWithSpeakers(
        transcript,
        mockTranscription,
        {
          includeTimestamps: false,
          includeSpeakerLabels: true,
          speakerDetectionSensitivity: 'medium',
          speakerNames: result.speakerMap,
        }
      );

      expect(formatted).toContain('Speaker 1');
      expect(formatted).toContain('Speaker 2');
    });

    it('should handle malformed AI response gracefully', async () => {
      const transcript = 'Speaker 1: Hello.';

      const mockLLM = createMockLLM('This is not valid JSON {broken');

      const result = await identifySpeakers({
        mode: 'auto',
        useAIDetection: true,
        transcript,
      }, mockLLM);

      // Should provide fallback
      expect(result.speakerMap.size).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle interview with roles', async () => {
      const transcript = `
        Interviewer: Welcome to the show.
        Guest: Thanks for having me.
        Interviewer: Let's discuss your book.
        Guest: I'd love to.
      `;

      const mockResponse = JSON.stringify({
        speakers: [
          {
            label: 'Speaker 1',
            name: 'Interviewer',
            confidence: 0.8,
            method: 'role-indicator',
            evidence: 'Identified as interviewer from context'
          },
          {
            label: 'Speaker 2',
            name: 'Guest',
            confidence: 0.8,
            method: 'role-indicator',
            evidence: 'Identified as guest from context'
          }
        ],
        suggestions: [],
        warnings: []
      });

      const mockLLM = createMockLLM(mockResponse);

      const result = await identifySpeakers({
        mode: 'auto',
        useAIDetection: true,
        transcript,
      }, mockLLM);

      expect(result.speakerMap.get('Speaker 1')).toBe('Interviewer');
      expect(result.speakerMap.get('Speaker 2')).toBe('Guest');
    });

    it('should handle meeting with multiple participants', async () => {
      const transcript = `
        Speaker 1: I'm John, project lead.
        Speaker 2: I'm Mary from engineering.
        Speaker 3: I'm Alex from design.
        Speaker 4: And I'm Sarah from marketing.
      `;

      const mockResponse = JSON.stringify({
        speakers: [
          { label: 'Speaker 1', name: 'John', confidence: 0.9, method: 'self-introduction', evidence: "Said 'I'm John'" },
          { label: 'Speaker 2', name: 'Mary', confidence: 0.9, method: 'self-introduction', evidence: "Said 'I'm Mary'" },
          { label: 'Speaker 3', name: 'Alex', confidence: 0.9, method: 'self-introduction', evidence: "Said 'I'm Alex'" },
          { label: 'Speaker 4', name: 'Sarah', confidence: 0.9, method: 'self-introduction', evidence: "Said 'I'm Sarah'" }
        ],
        suggestions: [],
        warnings: []
      });

      const mockLLM = createMockLLM(mockResponse);

      const result = await identifySpeakers({
        mode: 'auto',
        useAIDetection: true,
        transcript,
      }, mockLLM);

      expect(result.speakerMap.size).toBe(4);
      expect(result.speakerMap.get('Speaker 1')).toBe('John');
      expect(result.speakerMap.get('Speaker 4')).toBe('Sarah');
    });

    it('should handle name mentions in conversation', async () => {
      const transcript = `
        Speaker 1: What do you think, Alex?
        Speaker 2: Good question. Sarah, can you weigh in?
        Speaker 3: I agree with Alex's point.
      `;

      const mockResponse = JSON.stringify({
        speakers: [
          { label: 'Speaker 1', name: 'Unknown', confidence: 0.3, method: 'unknown', evidence: 'No clear identification' },
          { label: 'Speaker 2', name: 'Alex', confidence: 0.75, method: 'name-mention', evidence: 'Mentioned by Speaker 1' },
          { label: 'Speaker 3', name: 'Sarah', confidence: 0.75, method: 'name-mention', evidence: 'Mentioned by Speaker 2' }
        ],
        suggestions: [],
        warnings: ['Speaker 1 could not be identified']
      });

      const mockLLM = createMockLLM(mockResponse);

      const result = await identifySpeakers({
        mode: 'auto',
        useAIDetection: true,
        transcript,
      }, mockLLM);

      expect(result.speakerMap.get('Speaker 2')).toBe('Alex');
      expect(result.speakerMap.get('Speaker 3')).toBe('Sarah');
      expect(result.speakerMap.get('Speaker 1')).toBe('Unknown');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle empty transcript', async () => {
      const transcript = '';

      const mockLLM = jest.fn();

      const result = await identifySpeakers({
        mode: 'auto',
        useAIDetection: true,
        transcript,
      }, mockLLM);

      // Should handle gracefully
      expect(result.speakerMap.size).toBeGreaterThanOrEqual(0);
    });

    it('should handle transcript with no speaker labels', async () => {
      const transcript = 'Just some text without any speaker labels.';

      const mockResponse = JSON.stringify({
        speakers: [],
        suggestions: [],
        warnings: ['No speaker labels found in transcript']
      });

      const mockLLM = createMockLLM(mockResponse);

      const result = await identifySpeakers({
        mode: 'auto',
        useAIDetection: true,
        transcript,
      }, mockLLM);

      expect(result.warnings.some(w => w.includes('speaker labels'))).toBe(true);
    });

    it('should handle very long transcript efficiently', async () => {
      const longTranscript = Array.from({ length: 100 }, (_, i) => 
        `Speaker ${(i % 5) + 1}: This is utterance number ${i + 1}.`
      ).join('\n');

      const mockResponse = JSON.stringify({
        speakers: Array.from({ length: 5 }, (_, i) => ({
          label: `Speaker ${i + 1}`,
          name: `Person ${i + 1}`,
          confidence: 0.6,
          method: 'context-inference',
          evidence: 'Inferred from pattern'
        })),
        suggestions: [],
        warnings: []
      });

      const mockLLM = createMockLLM(mockResponse);

      const startTime = Date.now();
      const result = await identifySpeakers({
        mode: 'auto',
        useAIDetection: true,
        transcript: longTranscript,
      }, mockLLM);
      const endTime = Date.now();

      expect(result.speakerMap.size).toBe(5);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast (excluding actual LLM time)
    });
  });
});




