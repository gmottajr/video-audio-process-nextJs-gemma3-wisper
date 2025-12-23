/**
 * Advanced Speaker Analysis System
 * 
 * Multi-pass LLM-based speaker detection with conversation flow analysis
 * Dramatically improved over simple pause-based detection
 */

import type { TranscriptionResult } from '@/types/audioSegment';

export interface ConversationPatterns {
  likelySpeakerCount: number;
  conversationType: 'interview' | 'meeting' | 'podcast' | 'presentation' | 'casual' | 'panel';
  confidence: number;
  patterns: {
    questionAnswerPairs: number;
    agreements: number;
    disagreements: number;
    interruptions: number;
    topicShifts: number;
  };
  evidence: string[];
}

export interface SpeakerRole {
  id: number;
  role: 'interviewer' | 'guest' | 'moderator' | 'participant' | 'presenter' | 'audience' | 'host' | 'unknown';
  expertise: 'technical' | 'business' | 'general' | 'mixed';
  authority: 'leader' | 'peer' | 'subordinate' | 'expert' | 'neutral';
  tone: 'formal' | 'casual' | 'professional' | 'friendly' | 'mixed';
  confidence: number;
}

export interface SpeakerNameResult {
  id: number;
  name: string;
  confidence: number;
  evidence: string;
  firstMentionTimestamp?: number;
  detectionMethod: 'self-introduction' | 'direct-address' | 'third-person' | 'context' | 'unknown';
}

/**
 * Analyze conversation flow to detect speaker patterns
 */
export function analyzeConversationFlow(transcript: string): ConversationPatterns {
  const lines = transcript.split('\n').filter(l => l.trim());
  
  let questionAnswerPairs = 0;
  let agreements = 0;
  let disagreements = 0;
  let interruptions = 0;
  let topicShifts = 0;
  const evidence: string[] = [];
  
  // Question indicators
  const questionWords = ['what', 'when', 'where', 'who', 'why', 'how', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does'];
  
  // Agreement indicators
  const agreementWords = ['yes', 'yeah', 'yep', 'right', 'exactly', 'agreed', 'absolutely', 'correct', 'true', 'definitely'];
  
  // Disagreement indicators
  const disagreementWords = ['no', 'but', 'however', 'although', 'actually', 'disagree', 'wrong', 'not really'];
  
  // Interruption indicators
  const interruptionWords = ['wait', 'hold on', 'sorry', 'excuse me', 'let me', 'just to clarify'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const nextLine = i < lines.length - 1 ? lines[i + 1].toLowerCase() : '';
    
    // Detect question-answer pairs
    if (line.endsWith('?') || questionWords.some(q => line.startsWith(q + ' '))) {
      questionAnswerPairs++;
      evidence.push('Q&A pattern detected');
    }
    
    // Detect agreements
    if (agreementWords.some(a => line.startsWith(a) || line.includes(' ' + a + ' '))) {
      agreements++;
    }
    
    // Detect disagreements
    if (disagreementWords.some(d => line.startsWith(d) || line.includes(' ' + d + ' '))) {
      disagreements++;
    }
    
    // Detect interruptions
    if (interruptionWords.some(int => line.startsWith(int))) {
      interruptions++;
    }
    
    // Detect topic shifts (significant vocabulary change)
    if (i > 0 && nextLine) {
      const prevWords = new Set(lines[i - 1].toLowerCase().split(/\s+/));
      const currWords = new Set(line.split(/\s+/));
      const overlap = [...prevWords].filter(w => currWords.has(w)).length;
      if (overlap / prevWords.size < 0.2) {
        topicShifts++;
      }
    }
  }
  
  // Estimate speaker count based on patterns
  let likelySpeakerCount = 2; // Default assumption
  
  if (questionAnswerPairs > 5) {
    likelySpeakerCount = Math.max(2, Math.min(4, Math.ceil(questionAnswerPairs / 10)));
    evidence.push(`${questionAnswerPairs} Q&A pairs suggest ${likelySpeakerCount} speakers`);
  }
  
  if (agreements + disagreements > 10) {
    likelySpeakerCount = Math.max(likelySpeakerCount, 3);
    evidence.push('Multiple agreements/disagreements suggest group discussion');
  }
  
  if (interruptions > 3) {
    likelySpeakerCount = Math.max(likelySpeakerCount, 3);
    evidence.push('Interruptions suggest lively multi-person conversation');
  }
  
  // Determine conversation type
  let conversationType: ConversationPatterns['conversationType'] = 'casual';
  if (questionAnswerPairs > 10 && agreements < 3) {
    conversationType = 'interview';
  } else if (questionAnswerPairs > 5 && agreements > 5) {
    conversationType = 'meeting';
  } else if (questionAnswerPairs < 5 && topicShifts > 10) {
    conversationType = 'podcast';
  } else if (agreements + disagreements > 15) {
    conversationType = 'panel';
  }
  
  // Calculate confidence
  const totalPatterns = questionAnswerPairs + agreements + disagreements + interruptions + topicShifts;
  const confidence = Math.min(0.95, 0.5 + (totalPatterns / 100));
  
  return {
    likelySpeakerCount,
    conversationType,
    confidence,
    patterns: {
      questionAnswerPairs,
      agreements,
      disagreements,
      interruptions,
      topicShifts,
    },
    evidence,
  };
}

/**
 * Build enhanced speaker count detection prompt
 */
export function buildSpeakerCountPrompt(transcript: string, flowAnalysis: ConversationPatterns): string {
  const transcriptSample = transcript.length > 5000 
    ? transcript.substring(0, 5000) + '\n... [transcript continues] ...'
    : transcript;
  
  return `Count the number of distinct speakers in this ${flowAnalysis.conversationType} conversation.

TRANSCRIPT:
${transcriptSample}

CONVERSATION ANALYSIS:
- Type: ${flowAnalysis.conversationType}
- Question-Answer Pairs: ${flowAnalysis.patterns.questionAnswerPairs}
- Agreements/Disagreements: ${flowAnalysis.patterns.agreements + flowAnalysis.patterns.disagreements}
- Estimated speakers: ${flowAnalysis.likelySpeakerCount}

INSTRUCTIONS:
Look for evidence of distinct speakers:
1. Turn-taking (questions followed by answers)
2. Different perspectives or opinions
3. People addressing each other ("Thanks John", "Mary said...")
4. Role differences (interviewer/guest, leader/team)
5. Pronoun references (he/she indicating someone else)

CRITICAL: Return ONLY a single number (1-10). Nothing else.

Number of distinct speakers:`;
}

/**
 * Build speaker role detection prompt
 */
export function buildSpeakerRolePrompt(
  transcript: string,
  speakerCount: number,
  conversationType: string
): string {
  const transcriptSample = transcript.length > 5000 
    ? transcript.substring(0, 5000) + '\n... [transcript continues] ...'
    : transcript;
  
  return `Analyze the roles of ${speakerCount} speakers in this ${conversationType}.

TRANSCRIPT:
${transcriptSample}

For each of the ${speakerCount} speakers, identify their:
- Role: interviewer, guest, moderator, participant, presenter, host, audience
- Expertise: technical, business, general, mixed
- Authority: leader, peer, subordinate, expert, neutral
- Tone: formal, casual, professional, friendly, mixed

Look for clues:
- Who asks questions? (likely interviewer/moderator)
- Who provides expertise? (likely guest/expert)
- Who makes decisions? (likely leader)
- Who agrees/disagrees? (likely peers)
- Formal vs casual language

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "speakers": [
    {"id": 1, "role": "interviewer", "expertise": "general", "authority": "neutral", "tone": "professional"},
    {"id": 2, "role": "guest", "expertise": "technical", "authority": "expert", "tone": "casual"}
  ]
}

CRITICAL: Return ONLY the JSON object. No markdown, no explanation.`;
}

/**
 * Build enhanced name detection prompt with role context
 */
export function buildNameDetectionPrompt(
  transcript: string,
  speakerCount: number,
  roles: SpeakerRole[]
): string {
  const transcriptSample = transcript.length > 6000 
    ? transcript.substring(0, 6000) + '\n... [transcript continues] ...'
    : transcript;
  
  const rolesContext = roles.map(r => 
    `Speaker ${r.id}: ${r.role} (${r.expertise} expertise, ${r.tone} tone)`
  ).join('\n');
  
  return `Identify names for these ${speakerCount} speakers based on their roles:

${rolesContext}

TRANSCRIPT:
${transcriptSample}

Find each speaker's name by looking for:

1. **Self-introductions** (BEST):
   - "I'm John", "This is Mary", "My name is..."
   - "I'm [name] and I'll be..."
   
2. **Direct address** (GOOD):
   - "Thanks John for joining"
   - "Mary, what do you think?"
   - "As Bob mentioned..."
   
3. **Third-person mentions** (OK):
   - "John will handle that"
   - "Mary said earlier..."
   - "According to Bob..."
   
4. **Context clues** (WEAK):
   - Email signatures, titles, credentials mentioned
   - Company/team affiliations

MATCHING RULES:
- Match names to speaker IDs based on role context
- The ${roles[0]?.role || 'first person'} is likely Speaker 1
- The ${roles[1]?.role || 'second person'} is likely Speaker 2
- Use conversation flow to distinguish speakers

CONFIDENCE GUIDELINES:
- 0.9-1.0: Self-introduction or clear direct address
- 0.7-0.9: Multiple mentions with consistent context
- 0.5-0.7: Single mention or ambiguous context
- 0.0-0.5: Guessing or very unclear

OUTPUT FORMAT - Return ONLY valid JSON:
{
  "speakers": [
    {
      "id": 1,
      "name": "John Smith",
      "confidence": 0.95,
      "evidence": "Said 'I'm John and I'll be interviewing you today'",
      "method": "self-introduction"
    },
    {
      "id": 2,
      "name": "Unknown",
      "confidence": 0.0,
      "evidence": "No name mentioned",
      "method": "unknown"
    }
  ]
}

CRITICAL RULES:
- Only use names EXPLICITLY mentioned in the transcript
- Match names to correct speaker based on role context
- If unsure, use "Unknown"
- Provide exact quote as evidence
- Return ONLY the JSON object. No markdown, no explanation.`;
}

/**
 * Parse speaker count response
 */
export function parseSpeakerCountResponse(response: string): number {
  // Extract number from response
  const match = response.match(/\d+/);
  if (match) {
    const count = parseInt(match[0], 10);
    return Math.max(1, Math.min(10, count)); // Clamp between 1-10
  }
  return 2; // Default
}

/**
 * Parse speaker roles response with better error handling
 */
export function parseSpeakerRolesResponse(response: string, speakerCount: number): SpeakerRole[] {
  try {
    // Try multiple extraction strategies
    let jsonString: string | null = null;
    
    // Strategy 1: Extract from markdown code block
    const markdownMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (markdownMatch) {
      jsonString = markdownMatch[1];
    }
    
    // Strategy 2: Extract from plain JSON object
    if (!jsonString) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
    }
    
    if (!jsonString) {
      throw new Error('No JSON found in response');
    }
    
    const data = JSON.parse(jsonString);
    
    if (data.speakers && Array.isArray(data.speakers)) {
      return data.speakers.map((s: any) => ({
        id: s.id || 0,
        role: s.role || 'unknown',
        expertise: s.expertise || 'general',
        authority: s.authority || 'neutral',
        tone: s.tone || 'mixed',
        confidence: s.confidence || 0.7,
      }));
    }
  } catch (error) {
    console.error('[parseSpeakerRolesResponse] Parse error:', error);
  }
  
  // Fallback: create generic roles
  const roles: SpeakerRole[] = [];
  for (let i = 1; i <= speakerCount; i++) {
    roles.push({
      id: i,
      role: i === 1 ? 'host' : 'participant',
      expertise: 'general',
      authority: 'neutral',
      tone: 'mixed',
      confidence: 0.5,
    });
  }
  return roles;
}

/**
 * Parse speaker names response with better error handling
 */
export function parseSpeakerNamesResponse(response: string, speakerCount: number): SpeakerNameResult[] {
  try {
    // Try multiple extraction strategies
    let jsonString: string | null = null;
    
    // Strategy 1: Extract from markdown code block
    const markdownMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (markdownMatch) {
      jsonString = markdownMatch[1];
    }
    
    // Strategy 2: Extract from plain JSON object
    if (!jsonString) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
    }
    
    if (!jsonString) {
      throw new Error('No JSON found in response');
    }
    
    const data = JSON.parse(jsonString);
    
    if (data.speakers && Array.isArray(data.speakers)) {
      return data.speakers.map((s: any) => ({
        id: s.id || 0,
        name: s.name || 'Unknown',
        confidence: s.confidence || 0.0,
        evidence: s.evidence || 'No evidence provided',
        detectionMethod: s.method || 'unknown',
      }));
    }
  } catch (error) {
    console.error('[parseSpeakerNamesResponse] Parse error:', error);
  }
  
  // Fallback: create generic names
  const names: SpeakerNameResult[] = [];
  for (let i = 1; i <= speakerCount; i++) {
    names.push({
      id: i,
      name: `Speaker ${i}`,
      confidence: 0.0,
      evidence: 'Failed to parse AI response',
      detectionMethod: 'unknown',
    });
  }
  return names;
}


