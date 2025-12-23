/**
 * Unit Tests for Speaker Identifier
 * 
 * Tests AI-powered speaker identification and validation
 */

import {
  identifySpeakers,
  applySpeakerNames,
  getSpeakerIdentificationSummary,
  type SpeakerIdentificationOptions,
  type SpeakerIdentificationResult,
} from '@/utils/speakerIdentifier';

describe('speakerIdentifier', () => {
  // Mock LLM generate function
  const createMockLLM = (response: string) => {
    return jest.fn().mockResolvedValue(response);
  };

  describe('identifySpeakers', () => {
    describe('Mode: auto (fully automatic detection)', () => {
      it('should detect speakers from self-introductions', async () => {
        const transcript = `
          Speaker 1: Hi, I'm John Smith from the engineering team.
          Speaker 2: Thanks John. I'm Mary Johnson, the project lead.
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

        const options: SpeakerIdentificationOptions = {
          mode: 'auto',
          useAIDetection: true,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        expect(result.speakerMap.get('Speaker 1')).toBe('John Smith');
        expect(result.speakerMap.get('Speaker 2')).toBe('Mary Johnson');
        expect(result.confidence.get('Speaker 1')).toBe(0.95);
        expect(result.detectionMethod.get('Speaker 1')).toBe('self-introduction');
        expect(mockLLM).toHaveBeenCalledTimes(1);
      });

      it('should detect role indicators when names not available', async () => {
        const transcript = `
          Interviewer: Welcome to the show. Let's start with your background.
          Guest: Thanks for having me. I'd like to discuss my new book.
        `;

        const mockResponse = JSON.stringify({
          speakers: [
            {
              label: 'Speaker 1',
              name: 'Interviewer',
              confidence: 0.7,
              method: 'role-indicator',
              evidence: 'Identified as interviewer from context'
            },
            {
              label: 'Speaker 2',
              name: 'Guest',
              confidence: 0.7,
              method: 'role-indicator',
              evidence: 'Identified as guest from context'
            }
          ],
          suggestions: [],
          warnings: []
        });

        const mockLLM = createMockLLM(mockResponse);

        const options: SpeakerIdentificationOptions = {
          mode: 'auto',
          useAIDetection: true,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        expect(result.speakerMap.get('Speaker 1')).toBe('Interviewer');
        expect(result.speakerMap.get('Speaker 2')).toBe('Guest');
        expect(result.detectionMethod.get('Speaker 1')).toBe('role-indicator');
      });

      it('should use Unknown for speakers that cannot be identified', async () => {
        const transcript = `
          Speaker 1: The weather is nice today.
          Speaker 2: Yes, very pleasant.
        `;

        const mockResponse = JSON.stringify({
          speakers: [
            {
              label: 'Speaker 1',
              name: 'Unknown',
              confidence: 0.2,
              method: 'unknown',
              evidence: 'No identifying information found'
            },
            {
              label: 'Speaker 2',
              name: 'Unknown',
              confidence: 0.2,
              method: 'unknown',
              evidence: 'No identifying information found'
            }
          ],
          suggestions: [],
          warnings: ['Could not identify speakers with confidence']
        });

        const mockLLM = createMockLLM(mockResponse);

        const options: SpeakerIdentificationOptions = {
          mode: 'auto',
          useAIDetection: true,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        expect(result.speakerMap.get('Speaker 1')).toBe('Unknown');
        expect(result.confidence.get('Speaker 1')).toBeLessThan(0.5);
        expect(result.warnings).toContain('Could not identify speakers with confidence');
      });

      it('should handle LLM errors gracefully', async () => {
        const transcript = 'Speaker 1: Hello. Speaker 2: Hi.';

        const mockLLM = jest.fn().mockRejectedValue(new Error('LLM timeout'));

        const options: SpeakerIdentificationOptions = {
          mode: 'auto',
          useAIDetection: true,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        // Should fallback to generic labels
        expect(result.speakerMap.get('Speaker 1')).toBe('Speaker 1');
        expect(result.speakerMap.get('Speaker 2')).toBe('Speaker 2');
        expect(result.confidence.get('Speaker 1')).toBe(0.0);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('AI detection failed');
      });
    });

    describe('Mode: first-speaker (user provides first speaker)', () => {
      it('should use user-provided first speaker and detect others', async () => {
        const transcript = `
          Speaker 1: Hi everyone, let's begin the meeting.
          Speaker 2: Thanks John. I'm Mary from marketing.
          Speaker 3: And I'm Alex from sales.
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

        const options: SpeakerIdentificationOptions = {
          mode: 'first-speaker',
          firstSpeaker: 'John Smith',
          useAIDetection: true,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        expect(result.speakerMap.get('Speaker 1')).toBe('John Smith');
        expect(result.speakerMap.get('Speaker 2')).toBe('Mary');
        expect(result.speakerMap.get('Speaker 3')).toBe('Alex');
        expect(result.confidence.get('Speaker 1')).toBe(0.9); // User-provided has high confidence
        expect(result.detectionMethod.get('Speaker 1')).toBe('user-provided');
      });

      it('should work without AI detection', async () => {
        const transcript = 'Speaker 1: Hello. Speaker 2: Hi.';

        const mockLLM = jest.fn();

        const options: SpeakerIdentificationOptions = {
          mode: 'first-speaker',
          firstSpeaker: 'John',
          useAIDetection: false,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        expect(result.speakerMap.get('Speaker 1')).toBe('John');
        expect(result.speakerMap.get('Speaker 2')).toBe('Speaker 2'); // Generic fallback
        expect(mockLLM).not.toHaveBeenCalled();
      });
    });

    describe('Mode: all-speakers (user provides all speakers)', () => {
      it('should validate correct speaker names', async () => {
        const transcript = `
          Speaker 1: Hi, I'm John Smith.
          Speaker 2: Thanks John. I'm Mary Johnson.
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

        const options: SpeakerIdentificationOptions = {
          mode: 'all-speakers',
          allSpeakers: ['John Smith', 'Mary Johnson'],
          useAIDetection: true,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        expect(result.speakerMap.get('Speaker 1')).toBe('John Smith');
        expect(result.speakerMap.get('Speaker 2')).toBe('Mary Johnson');
        expect(result.confidence.get('Speaker 1')).toBeGreaterThan(0.7);
        expect(mockLLM).toHaveBeenCalledTimes(1); // Validation call
      });

      it('should warn about incorrect speaker names', async () => {
        const transcript = `
          Speaker 1: Hi, I'm Jonathan.
          Speaker 2: Thanks. I'm Maria.
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

        const options: SpeakerIdentificationOptions = {
          mode: 'all-speakers',
          allSpeakers: ['John', 'Mary'],
          useAIDetection: true,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.suggestions.some(s => s.suggestedName === 'Jonathan')).toBe(true);
      });

      it('should work without AI validation', async () => {
        const transcript = 'Speaker 1: Hello. Speaker 2: Hi.';

        const mockLLM = jest.fn();

        const options: SpeakerIdentificationOptions = {
          mode: 'all-speakers',
          allSpeakers: ['John', 'Mary'],
          useAIDetection: false,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        expect(result.speakerMap.get('Speaker 1')).toBe('John');
        expect(result.speakerMap.get('Speaker 2')).toBe('Mary');
        expect(result.confidence.get('Speaker 1')).toBe(1.0); // Full confidence without validation
        expect(mockLLM).not.toHaveBeenCalled();
      });

      it('should handle empty speaker names', async () => {
        const transcript = 'Speaker 1: Hello. Speaker 2: Hi.';

        const mockLLM = jest.fn();

        const options: SpeakerIdentificationOptions = {
          mode: 'all-speakers',
          allSpeakers: ['', 'Mary', ''],
          useAIDetection: false,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        // Should only map non-empty names
        expect(result.speakerMap.get('Speaker 1')).toBeUndefined();
        expect(result.speakerMap.get('Speaker 2')).toBe('Mary');
      });
    });

    describe('Edge cases', () => {
      it('should handle malformed JSON response', async () => {
        const transcript = 'Speaker 1: Hello.';

        const mockLLM = createMockLLM('This is not JSON {broken');

        const options: SpeakerIdentificationOptions = {
          mode: 'auto',
          useAIDetection: true,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        // Should fallback gracefully
        expect(result.speakerMap.size).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('parse'))).toBe(true);
      });

      it('should handle response without expected fields', async () => {
        const transcript = 'Speaker 1: Hello.';

        const mockResponse = JSON.stringify({
          // Missing 'speakers' field
          someOtherField: 'value'
        });

        const mockLLM = createMockLLM(mockResponse);

        const options: SpeakerIdentificationOptions = {
          mode: 'auto',
          useAIDetection: true,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        // Should provide fallback
        expect(result.speakerMap.size).toBeGreaterThan(0);
      });

      it('should handle transcripts with many speakers', async () => {
        const transcript = Array.from({ length: 10 }, (_, i) => 
          `Speaker ${i + 1}: Hello from speaker ${i + 1}.`
        ).join('\n');

        const mockResponse = JSON.stringify({
          speakers: Array.from({ length: 10 }, (_, i) => ({
            label: `Speaker ${i + 1}`,
            name: `Person ${i + 1}`,
            confidence: 0.5,
            method: 'context-inference',
            evidence: 'Inferred from pattern'
          })),
          suggestions: [],
          warnings: []
        });

        const mockLLM = createMockLLM(mockResponse);

        const options: SpeakerIdentificationOptions = {
          mode: 'auto',
          useAIDetection: true,
          transcript,
        };

        const result = await identifySpeakers(options, mockLLM);

        expect(result.speakerMap.size).toBe(10);
        expect(result.confidence.size).toBe(10);
      });
    });
  });

  describe('applySpeakerNames', () => {
    it('should replace speaker labels with identified names', () => {
      const formattedTranscript = `
**Speaker 1**: Hello everyone.

**Speaker 2**: Thanks for joining.

**Speaker 1**: Let's begin.
      `.trim();

      const speakerMap = new Map([
        ['Speaker 1', 'John Smith'],
        ['Speaker 2', 'Mary Johnson'],
      ]);

      const result = applySpeakerNames(formattedTranscript, speakerMap);

      expect(result).toContain('**John Smith**:');
      expect(result).toContain('**Mary Johnson**:');
      expect(result).not.toContain('**Speaker 1**:');
      expect(result).not.toContain('**Speaker 2**:');
    });

    it('should handle timestamps with speaker labels', () => {
      const formattedTranscript = `
[00:15] **Speaker 1**: Welcome everyone.

[00:23] **Speaker 2**: Thanks for having me.
      `.trim();

      const speakerMap = new Map([
        ['Speaker 1', 'Host'],
        ['Speaker 2', 'Guest'],
      ]);

      const result = applySpeakerNames(formattedTranscript, speakerMap);

      expect(result).toContain('[00:15] **Host**:');
      expect(result).toContain('[00:23] **Guest**:');
    });

    it('should only replace exact speaker label matches', () => {
      const formattedTranscript = `
**Speaker 1**: I mentioned Speaker 2 in my comment.

**Speaker 2**: Yes, Speaker 1 was right.
      `.trim();

      const speakerMap = new Map([
        ['Speaker 1', 'John'],
        ['Speaker 2', 'Mary'],
      ]);

      const result = applySpeakerNames(formattedTranscript, speakerMap);

      // Labels should be replaced
      expect(result).toContain('**John**: I mentioned Speaker 2');
      expect(result).toContain('**Mary**: Yes, Speaker 1');
      
      // But mentions in text should remain (we only replace **Speaker N**: pattern)
      expect(result).toContain('mentioned Speaker 2');
      expect(result).toContain('Yes, Speaker 1');
    });

    it('should handle empty speaker map', () => {
      const formattedTranscript = '**Speaker 1**: Hello.';
      const speakerMap = new Map();

      const result = applySpeakerNames(formattedTranscript, speakerMap);

      expect(result).toBe(formattedTranscript);
    });

    it('should handle partial speaker map', () => {
      const formattedTranscript = `
**Speaker 1**: Hello.
**Speaker 2**: Hi.
**Speaker 3**: Hey.
      `.trim();

      const speakerMap = new Map([
        ['Speaker 1', 'John'],
        // Speaker 2 not in map
        ['Speaker 3', 'Alex'],
      ]);

      const result = applySpeakerNames(formattedTranscript, speakerMap);

      expect(result).toContain('**John**:');
      expect(result).toContain('**Speaker 2**:'); // Not replaced
      expect(result).toContain('**Alex**:');
    });
  });

  describe('getSpeakerIdentificationSummary', () => {
    it('should calculate correct statistics', () => {
      const result: SpeakerIdentificationResult = {
        speakerMap: new Map([
          ['Speaker 1', 'John Smith'],
          ['Speaker 2', 'Mary Johnson'],
          ['Speaker 3', 'Unknown'],
          ['Speaker 4', 'Speaker 4'],
        ]),
        confidence: new Map([
          ['Speaker 1', 0.95],
          ['Speaker 2', 0.85],
          ['Speaker 3', 0.3],
          ['Speaker 4', 0.0],
        ]),
        detectionMethod: new Map(),
        suggestions: [],
        warnings: [],
      };

      const summary = getSpeakerIdentificationSummary(result);

      expect(summary.identifiedCount).toBe(2); // John and Mary
      expect(summary.unknownCount).toBe(2); // Unknown and Speaker 4
      expect(summary.averageConfidence).toBeCloseTo((0.95 + 0.85 + 0.3 + 0.0) / 4);
      expect(summary.highConfidenceCount).toBe(2); // >= 0.8
    });

    it('should handle all identified speakers', () => {
      const result: SpeakerIdentificationResult = {
        speakerMap: new Map([
          ['Speaker 1', 'John'],
          ['Speaker 2', 'Mary'],
        ]),
        confidence: new Map([
          ['Speaker 1', 0.9],
          ['Speaker 2', 0.85],
        ]),
        detectionMethod: new Map(),
        suggestions: [],
        warnings: [],
      };

      const summary = getSpeakerIdentificationSummary(result);

      expect(summary.identifiedCount).toBe(2);
      expect(summary.unknownCount).toBe(0);
      expect(summary.highConfidenceCount).toBe(2);
    });

    it('should handle all unknown speakers', () => {
      const result: SpeakerIdentificationResult = {
        speakerMap: new Map([
          ['Speaker 1', 'Unknown'],
          ['Speaker 2', 'Speaker 2'],
        ]),
        confidence: new Map([
          ['Speaker 1', 0.2],
          ['Speaker 2', 0.0],
        ]),
        detectionMethod: new Map(),
        suggestions: [],
        warnings: [],
      };

      const summary = getSpeakerIdentificationSummary(result);

      expect(summary.identifiedCount).toBe(0);
      expect(summary.unknownCount).toBe(2);
      expect(summary.highConfidenceCount).toBe(0);
    });

    it('should handle empty result', () => {
      const result: SpeakerIdentificationResult = {
        speakerMap: new Map(),
        confidence: new Map(),
        detectionMethod: new Map(),
        suggestions: [],
        warnings: [],
      };

      const summary = getSpeakerIdentificationSummary(result);

      expect(summary.identifiedCount).toBe(0);
      expect(summary.unknownCount).toBe(0);
      expect(summary.averageConfidence).toBe(0);
      expect(summary.highConfidenceCount).toBe(0);
    });
  });
});




