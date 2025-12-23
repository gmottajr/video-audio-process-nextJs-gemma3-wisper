/**
 * Integration Tests for AI Analysis Feature
 * 
 * Tests the complete AI analysis workflow from button click to results display
 */

import { buildAnalysisPrompt, parseAnalysisResponse, validateAnalysisResult, createEmptyAnalysis } from '@/utils/analysisPromptBuilder';
import type { AnalysisOptions, TranscriptAnalysis } from '@/types/transcript-analysis';

describe('AI Analysis Integration', () => {
  describe('Prompt Building', () => {
    it('should build comprehensive analysis prompt', () => {
      const transcript = 'Speaker 1: I think we should implement this feature. Speaker 2: What are the risks?';
      
      const prompt = buildAnalysisPrompt(transcript, {
        contentType: 'meeting',
        depth: 'standard',
      });

      expect(prompt).toContain('meeting transcript');
      expect(prompt).toContain('KEY POINTS');
      expect(prompt).toContain('QUESTIONS RAISED');
      expect(prompt).toContain('FORMAT YOUR RESPONSE AS VALID JSON');
      expect(prompt).toContain(transcript);
    });

    it('should include all analysis types by default', () => {
      const transcript = 'Test transcript';
      const prompt = buildAnalysisPrompt(transcript);

      expect(prompt).toContain('KEY POINTS');
      expect(prompt).toContain('QUESTIONS RAISED');
      expect(prompt).toContain('DEVIATIONS');
      expect(prompt).toContain('MISALIGNMENTS');
      expect(prompt).toContain('RESOLUTIONS');
      expect(prompt).toContain('SIGNIFICANT STATEMENTS');
      expect(prompt).toContain('ACTION ITEMS');
      expect(prompt).toContain('DECISIONS MADE');
    });

    it('should respect selective inclusion options', () => {
      const transcript = 'Test transcript';
      const prompt = buildAnalysisPrompt(transcript, {
        includeKeyPoints: true,
        includeQuestions: true,
        includeDeviations: false,
        includeMisalignments: false,
        includeResolutions: false,
        includeSignificantStatements: false,
        includeActionItems: false,
        includeDecisions: false,
      });

      expect(prompt).toContain('KEY POINTS');
      expect(prompt).toContain('QUESTIONS RAISED');
      expect(prompt).not.toContain('DEVIATIONS');
      expect(prompt).not.toContain('MISALIGNMENTS');
    });

    it('should adjust prompt based on depth', () => {
      const transcript = 'Test transcript';
      
      const quickPrompt = buildAnalysisPrompt(transcript, { depth: 'quick' });
      const deepPrompt = buildAnalysisPrompt(transcript, { depth: 'deep' });

      expect(quickPrompt).toContain('quick analysis');
      expect(deepPrompt).toContain('in-depth analysis');
      expect(deepPrompt).toContain('subtle implications');
    });

    it('should handle different content types', () => {
      const transcript = 'Test transcript';
      
      const meetingPrompt = buildAnalysisPrompt(transcript, { contentType: 'meeting' });
      const interviewPrompt = buildAnalysisPrompt(transcript, { contentType: 'interview' });
      const lecturePrompt = buildAnalysisPrompt(transcript, { contentType: 'lecture' });

      expect(meetingPrompt).toContain('meeting transcript');
      expect(interviewPrompt).toContain('interview transcript');
      expect(lecturePrompt).toContain('lecture transcript');
    });
  });

  describe('Response Parsing', () => {
    it('should parse valid JSON response', () => {
      const mockResponse = JSON.stringify({
        summary: 'Meeting about new feature implementation',
        keyPoints: ['Point 1', 'Point 2', 'Point 3'],
        mainTopics: ['Feature', 'Timeline', 'Resources'],
        questionsRaised: {
          explicit: [
            { text: 'What are the risks?', type: 'explicit' as const, answered: false }
          ],
          implicit: [
            { text: 'Do we have enough resources?', type: 'implicit' as const, category: 'concern' as const }
          ]
        },
        deviations: [],
        misalignments: [],
        resolutions: [],
        significantStatements: [],
        actionItems: [],
        decisions: []
      });

      const result = parseAnalysisResponse(mockResponse);

      expect(result.summary).toBe('Meeting about new feature implementation');
      expect(result.keyPoints).toHaveLength(3);
      expect(result.mainTopics).toContain('Feature');
      expect(result.questionsRaised.explicit).toHaveLength(1);
      expect(result.questionsRaised.implicit).toHaveLength(1);
    });

    it('should parse JSON from code blocks', () => {
      const mockResponse = `
Here's the analysis:
\`\`\`json
{
  "summary": "Test summary",
  "keyPoints": ["Point 1"],
  "mainTopics": [],
  "questionsRaised": { "explicit": [], "implicit": [] }
}
\`\`\`
`;

      const result = parseAnalysisResponse(mockResponse);

      expect(result.summary).toBe('Test summary');
      expect(result.keyPoints).toHaveLength(1);
    });

    it('should handle malformed JSON gracefully', () => {
      const mockResponse = 'This is not valid JSON {broken';

      const result = parseAnalysisResponse(mockResponse);

      // Should return an object with default structure
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('keyPoints');
      expect(result).toHaveProperty('questionsRaised');
    });

    it('should parse complex analysis with all types', () => {
      const mockResponse = JSON.stringify({
        summary: 'Comprehensive meeting analysis',
        keyPoints: ['Point 1', 'Point 2'],
        mainTopics: ['Topic 1', 'Topic 2'],
        questionsRaised: {
          explicit: [{ text: 'Q1?', type: 'explicit' as const, answered: true, answerText: 'A1' }],
          implicit: [{ text: 'Q2?', type: 'implicit' as const, category: 'concern' as const }],
          total: 2,
          answeredCount: 1
        },
        deviations: [
          { description: 'Off-topic discussion', context: 'During planning', severity: 'low' as const }
        ],
        misalignments: [
          { description: 'Different priorities', parties: ['Team A', 'Team B'], topic: 'Timeline', severity: 'medium' as const, context: 'Sprint planning' }
        ],
        resolutions: [
          { issue: 'Resource conflict', solution: 'Hire contractor', context: 'Budget meeting' }
        ],
        significantStatements: [
          { text: 'We commit to Q4 launch', significance: 'high' as const, category: 'commitment' as const }
        ],
        actionItems: [
          { description: 'Review design', assignedTo: 'John', priority: 'high' as const, context: 'Next sprint' }
        ],
        decisions: [
          { description: 'Use React', outcome: 'Approved', rationale: 'Team expertise' }
        ]
      });

      const result = parseAnalysisResponse(mockResponse);

      expect(result.deviations).toHaveLength(1);
      expect(result.misalignments).toHaveLength(1);
      expect(result.resolutions).toHaveLength(1);
      expect(result.significantStatements).toHaveLength(1);
      expect(result.actionItems).toHaveLength(1);
      expect(result.decisions).toHaveLength(1);
    });
  });

  describe('Validation', () => {
    it('should validate correct analysis structure', () => {
      const validAnalysis = {
        summary: 'Test summary',
        keyPoints: ['Point 1', 'Point 2'],
        questionsRaised: {
          explicit: [],
          implicit: []
        }
      };

      expect(validateAnalysisResult(validAnalysis)).toBe(true);
    });

    it('should reject analysis without required fields', () => {
      const invalidAnalysis = {
        summary: 'Test summary',
        // Missing keyPoints and questionsRaised
      };

      expect(validateAnalysisResult(invalidAnalysis)).toBe(false);
    });

    it('should reject analysis with wrong types', () => {
      const invalidAnalysis = {
        summary: 'Test summary',
        keyPoints: 'Not an array', // Should be array
        questionsRaised: {
          explicit: [],
          implicit: []
        }
      };

      expect(validateAnalysisResult(invalidAnalysis)).toBe(false);
    });

    it('should reject non-object values', () => {
      expect(validateAnalysisResult(null)).toBe(false);
      expect(validateAnalysisResult(undefined)).toBe(false);
      expect(validateAnalysisResult('string')).toBe(false);
      expect(validateAnalysisResult(123)).toBe(false);
    });

    it('should validate questionsRaised structure', () => {
      const invalidAnalysis = {
        summary: 'Test',
        keyPoints: [],
        questionsRaised: 'Not an object' // Should be object
      };

      expect(validateAnalysisResult(invalidAnalysis)).toBe(false);
    });
  });

  describe('Empty Analysis Creation', () => {
    it('should create valid empty analysis', () => {
      const empty = createEmptyAnalysis();

      expect(empty.summary).toBeDefined();
      expect(empty.keyPoints).toEqual([]);
      expect(empty.questionsRaised).toHaveProperty('explicit');
      expect(empty.questionsRaised).toHaveProperty('implicit');
      expect(empty.deviations).toEqual([]);
      expect(empty.misalignments).toEqual([]);
      expect(empty.resolutions).toEqual([]);
      expect(empty.significantStatements).toEqual([]);
      expect(empty.actionItems).toEqual([]);
      expect(empty.decisions).toEqual([]);
    });

    it('should pass validation', () => {
      const empty = createEmptyAnalysis();
      expect(validateAnalysisResult(empty)).toBe(true);
    });
  });

  describe('End-to-End Analysis Flow', () => {
    it('should complete full analysis pipeline', () => {
      // Step 1: Build prompt
      const transcript = `
        Speaker 1: I'm John, project lead. We need to discuss the Q4 roadmap.
        Speaker 2: Thanks John. I'm Mary from engineering. What are the priorities?
        Speaker 1: Our top priority is the new dashboard feature.
        Speaker 2: Are there any technical risks?
        Speaker 1: Good question. We'll need to assess database scalability.
        Speaker 2: I can lead that assessment.
        Speaker 1: Perfect. Let's also decide on the timeline today.
        Speaker 2: I propose 6 weeks for MVP.
        Speaker 1: Agreed. That works with our launch date.
      `;

      const prompt = buildAnalysisPrompt(transcript, {
        contentType: 'meeting',
        depth: 'standard',
      });

      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(100);

      // Step 2: Simulate LLM response
      const mockLLMResponse = JSON.stringify({
        summary: 'Project meeting about Q4 roadmap and dashboard feature timeline',
        keyPoints: [
          'New dashboard feature is top priority for Q4',
          'Database scalability needs assessment',
          'MVP timeline set to 6 weeks',
          'Mary will lead technical assessment'
        ],
        mainTopics: ['Q4 Roadmap', 'Dashboard Feature', 'Timeline', 'Technical Risks'],
        questionsRaised: {
          explicit: [
            {
              text: 'What are the priorities?',
              type: 'explicit' as const,
              answered: true,
              answerText: 'New dashboard feature is top priority',
              speaker: 'Mary'
            },
            {
              text: 'Are there any technical risks?',
              type: 'explicit' as const,
              answered: true,
              answerText: 'Need to assess database scalability',
              speaker: 'Mary'
            }
          ],
          implicit: [
            {
              text: 'Do we have resources for scalability assessment?',
              type: 'implicit' as const,
              category: 'concern' as const
            }
          ],
          total: 3,
          answeredCount: 2
        },
        deviations: [],
        misalignments: [],
        resolutions: [
          {
            issue: 'Database scalability uncertainty',
            solution: 'Mary to lead assessment',
            context: 'Technical planning discussion'
          }
        ],
        significantStatements: [
          {
            text: 'Our top priority is the new dashboard feature',
            speaker: 'John',
            significance: 'high' as const,
            category: 'assertion' as const
          }
        ],
        actionItems: [
          {
            description: 'Lead database scalability assessment',
            assignedTo: 'Mary',
            priority: 'high' as const,
            context: 'Technical evaluation'
          }
        ],
        decisions: [
          {
            description: 'MVP Timeline',
            outcome: '6 weeks approved',
            participants: ['John', 'Mary'],
            rationale: 'Aligns with launch date'
          }
        ]
      });

      // Step 3: Parse response
      const analysis = parseAnalysisResponse(mockLLMResponse);

      // Step 4: Validate result
      expect(validateAnalysisResult(analysis)).toBe(true);

      // Step 5: Verify content
      expect(analysis.summary).toContain('dashboard');
      expect(analysis.keyPoints).toHaveLength(4);
      expect(analysis.questionsRaised.explicit).toHaveLength(2);
      expect(analysis.questionsRaised.implicit).toHaveLength(1);
      expect(analysis.resolutions).toHaveLength(1);
      expect(analysis.actionItems).toHaveLength(1);
      expect(analysis.decisions).toHaveLength(1);
      expect(analysis.significantStatements).toHaveLength(1);

      // Step 6: Verify structured data
      expect(analysis.questionsRaised.total).toBe(3);
      expect(analysis.questionsRaised.answeredCount).toBe(2);
      expect(analysis.actionItems[0].assignedTo).toBe('Mary');
      expect(analysis.decisions[0].outcome).toBe('6 weeks approved');
    });

    it('should handle interview analysis', () => {
      const transcript = `
        Interviewer: Welcome! Tell me about your background.
        Candidate: I have 5 years in software engineering.
        Interviewer: What's your biggest achievement?
        Candidate: I led a team that reduced latency by 40%.
        Interviewer: Impressive! Any challenges you faced?
        Candidate: Yes, we had to migrate legacy systems without downtime.
      `;

      const prompt = buildAnalysisPrompt(transcript, {
        contentType: 'interview',
        depth: 'standard',
      });

      expect(prompt).toContain('interview');

      const mockResponse = JSON.stringify({
        summary: 'Technical interview discussing background and achievements',
        keyPoints: [
          '5 years software engineering experience',
          'Led team to reduce latency by 40%',
          'Experience with zero-downtime migrations'
        ],
        mainTopics: ['Background', 'Achievements', 'Challenges'],
        questionsRaised: {
          explicit: [
            { text: 'Tell me about your background', type: 'explicit' as const, answered: true },
            { text: "What's your biggest achievement?", type: 'explicit' as const, answered: true },
            { text: 'Any challenges you faced?', type: 'explicit' as const, answered: true }
          ],
          implicit: [],
          total: 3,
          answeredCount: 3
        },
        deviations: [],
        misalignments: [],
        resolutions: [],
        significantStatements: [
          {
            text: 'I led a team that reduced latency by 40%',
            significance: 'high' as const,
            category: 'assertion' as const,
            speaker: 'Candidate'
          }
        ],
        actionItems: [],
        decisions: []
      });

      const analysis = parseAnalysisResponse(mockResponse);

      expect(validateAnalysisResult(analysis)).toBe(true);
      expect(analysis.questionsRaised.explicit).toHaveLength(3);
      expect(analysis.questionsRaised.answeredCount).toBe(3);
      expect(analysis.significantStatements[0].text).toContain('40%');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty transcript', () => {
      const prompt = buildAnalysisPrompt('');
      expect(prompt).toBeDefined();
    });

    it('should handle very long transcript', () => {
      const longTranscript = 'Speaker 1: Hello. '.repeat(1000);
      const prompt = buildAnalysisPrompt(longTranscript);
      expect(prompt).toBeDefined();
      expect(prompt).toContain(longTranscript);
    });

    it('should handle special characters in transcript', () => {
      const transcript = 'Speaker 1: Test with "quotes" and \'apostrophes\' and emoji 🎉';
      const prompt = buildAnalysisPrompt(transcript);
      expect(prompt).toContain('quotes');
      expect(prompt).toContain('apostrophes');
    });

    it('should create fallback when parsing fails completely', () => {
      const invalidResponse = 'Complete gibberish with no structure at all!!!';
      const result = parseAnalysisResponse(invalidResponse);

      // Should still return a valid structure
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('keyPoints');
      expect(Array.isArray(result.keyPoints)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should build prompts quickly', () => {
      const transcript = 'Speaker 1: Hello. '.repeat(100);
      
      const startTime = Date.now();
      buildAnalysisPrompt(transcript);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });

    it('should parse responses quickly', () => {
      const mockResponse = JSON.stringify({
        summary: 'Test',
        keyPoints: Array(50).fill('Point'),
        mainTopics: Array(10).fill('Topic'),
        questionsRaised: {
          explicit: Array(20).fill({ text: 'Q?', type: 'explicit' }),
          implicit: Array(10).fill({ text: 'Q?', type: 'implicit', category: 'concern' })
        },
        deviations: [],
        misalignments: [],
        resolutions: [],
        significantStatements: [],
        actionItems: [],
        decisions: []
      });

      const startTime = Date.now();
      parseAnalysisResponse(mockResponse);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});




