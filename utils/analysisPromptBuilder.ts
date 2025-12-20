/**
 * Analysis Prompt Builder
 * 
 * Builds structured prompts for AI-powered transcript analysis
 */

import type { AnalysisOptions } from '@/types/transcript-analysis';

/**
 * Build a comprehensive analysis prompt for the LLM
 */
export function buildAnalysisPrompt(
  transcript: string,
  options: AnalysisOptions = {}
): string {
  const {
    contentType = 'general',
    depth = 'standard',
    includeKeyPoints = true,
    includeQuestions = true,
    includeDeviations = true,
    includeMisalignments = true,
    includeResolutions = true,
    includeSignificantStatements = true,
    includeActionItems = true,
    includeDecisions = true,
  } = options;

  const sections: string[] = [];

  // System instruction
  sections.push(
    `You are an expert analyst reviewing a ${contentType} transcript. ` +
    `Analyze the following content and provide structured insights.`
  );

  // Analysis requirements
  const requirements: string[] = [];

  if (includeKeyPoints) {
    requirements.push(
      '1. KEY POINTS: List 5-7 main points or takeaways from the discussion. ' +
      'Be concise and focus on the most important information.'
    );
  }

  if (includeQuestions) {
    requirements.push(
      '2. QUESTIONS RAISED:\n' +
      '   a) Explicit Questions: Direct questions asked during the discussion\n' +
      '   b) Implicit Questions: Concerns, uncertainties, or information needs implied but not directly asked\n' +
      '   For each question, note if it was answered and provide the answer if available.'
    );
  }

  if (includeDeviations) {
    requirements.push(
      '3. DEVIATIONS: Identify any instances where the discussion went off-topic, ' +
      'diverged from expectations, or took an unexpected turn. Note the severity (low/medium/high).'
    );
  }

  if (includeMisalignments) {
    requirements.push(
      '4. MISALIGNMENTS: Identify disagreements, conflicting viewpoints, or areas where ' +
      'participants seem to have different understandings. Note who is involved and the severity.'
    );
  }

  if (includeResolutions) {
    requirements.push(
      '5. RESOLUTIONS: Identify problems or issues that were resolved during the discussion. ' +
      'Include the issue, the solution, and who agreed to it.'
    );
  }

  if (includeSignificantStatements) {
    requirements.push(
      '6. SIGNIFICANT STATEMENTS: Extract important assertions, commitments, insights, ' +
      'decisions, or notable facts. Categorize each as: assertion, commitment, insight, decision, fact, or opinion.'
    );
  }

  if (includeActionItems) {
    requirements.push(
      '7. ACTION ITEMS: List concrete tasks or actions that need to be taken. ' +
      'Include who is responsible (if mentioned) and any deadlines or priorities.'
    );
  }

  if (includeDecisions) {
    requirements.push(
      '8. DECISIONS MADE: List formal or informal decisions reached during the discussion. ' +
      'Include what was decided, the outcome, and any rationale provided.'
    );
  }

  sections.push('\nPLEASE ANALYZE:\n' + requirements.join('\n\n'));

  // Response format
  sections.push(
    '\n\nFORMAT YOUR RESPONSE AS VALID JSON with the following structure:\n' +
    '```json\n' +
    '{\n' +
    '  "summary": "Brief 2-3 sentence overview",\n' +
    '  "keyPoints": ["point 1", "point 2", ...],\n' +
    '  "mainTopics": ["topic 1", "topic 2", ...],\n' +
    '  "questionsRaised": {\n' +
    '    "explicit": [{"text": "...", "type": "explicit", "answered": true/false, "answerText": "..."}],\n' +
    '    "implicit": [{"text": "...", "type": "implicit", "category": "concern/clarification/etc"}]\n' +
    '  },\n' +
    '  "deviations": [{"description": "...", "context": "...", "severity": "low/medium/high"}],\n' +
    '  "misalignments": [{"description": "...", "parties": ["person1", "person2"], "topic": "...", "severity": "..."}],\n' +
    '  "resolutions": [{"issue": "...", "solution": "...", "context": "..."}],\n' +
    '  "significantStatements": [{"text": "...", "significance": "high/medium/low", "category": "assertion/commitment/etc"}],\n' +
    '  "actionItems": [{"description": "...", "assignedTo": "...", "priority": "high/medium/low"}],\n' +
    '  "decisions": [{"description": "...", "outcome": "..."}]\n' +
    '}\n' +
    '```\n'
  );

  // Add the transcript
  sections.push(
    '\n--- TRANSCRIPT TO ANALYZE ---\n\n' +
    transcript +
    '\n\n--- END TRANSCRIPT ---'
  );

  // Depth-specific instructions
  if (depth === 'quick') {
    sections.push(
      '\nNote: Provide a quick analysis focusing on the most obvious and important elements only.'
    );
  } else if (depth === 'deep') {
    sections.push(
      '\nNote: Provide an in-depth analysis. Look for subtle implications, underlying themes, ' +
      'and nuanced interpretations. Be thorough in your examination.'
    );
  }

  return sections.join('\n');
}

/**
 * Parse LLM response to extract analysis
 * Handles both JSON and text responses
 */
export function parseAnalysisResponse(response: string): any {
  // Try to extract JSON from code blocks
  const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.warn('[parseAnalysisResponse] Failed to parse JSON from code block:', e);
    }
  }

  // Try to parse the entire response as JSON
  try {
    return JSON.parse(response);
  } catch (e) {
    console.warn('[parseAnalysisResponse] Response is not valid JSON:', e);
  }

  // If JSON parsing fails, try to extract structured data from text
  return parseTextResponse(response);
}

/**
 * Parse text response when JSON parsing fails
 */
function parseTextResponse(response: string): any {
  const result: any = {
    summary: '',
    keyPoints: [],
    mainTopics: [],
    questionsRaised: { explicit: [], implicit: [] },
    deviations: [],
    misalignments: [],
    resolutions: [],
    significantStatements: [],
    actionItems: [],
    decisions: [],
  };

  // Extract summary (first paragraph)
  const summaryMatch = response.match(/^(.+?)(?:\n\n|\n#)/s);
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim();
  }

  // Extract key points (look for numbered or bulleted lists)
  const keyPointsSection = response.match(/(?:key points|main points)[:\s]+(.+?)(?:\n\n|$)/is);
  if (keyPointsSection) {
    const points = keyPointsSection[1].match(/[-•*]\s*(.+?)(?:\n|$)/g);
    if (points) {
      result.keyPoints = points.map(p => p.replace(/^[-•*]\s*/, '').trim());
    }
  }

  // Similar extractions for other sections...
  // (This is a fallback, the JSON response is preferred)

  return result;
}

/**
 * Validate analysis result structure
 */
export function validateAnalysisResult(data: any): boolean {
  if (!data || typeof data !== 'object') return false;

  // Check for required fields
  const requiredFields = ['summary', 'keyPoints', 'questionsRaised'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.warn(`[validateAnalysisResult] Missing required field: ${field}`);
      return false;
    }
  }

  // Validate arrays
  if (!Array.isArray(data.keyPoints)) {
    console.warn('[validateAnalysisResult] keyPoints is not an array');
    return false;
  }

  // Validate questionsRaised structure
  if (!data.questionsRaised || typeof data.questionsRaised !== 'object') {
    console.warn('[validateAnalysisResult] Invalid questionsRaised structure');
    return false;
  }

  return true;
}

/**
 * Create default/empty analysis result
 */
export function createEmptyAnalysis(): Partial<any> {
  return {
    summary: 'No analysis available.',
    keyPoints: [],
    mainTopics: [],
    questionsRaised: {
      explicit: [],
      implicit: [],
      total: 0,
      answeredCount: 0,
    },
    deviations: [],
    misalignments: [],
    resolutions: [],
    significantStatements: [],
    actionItems: [],
    decisions: [],
  };
}

