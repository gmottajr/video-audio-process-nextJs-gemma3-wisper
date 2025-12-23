/**
 * AI-Powered Speaker Identifier
 * 
 * Multi-pass analysis system:
 * Pass 1: Conversation flow analysis (pattern detection)
 * Pass 2: Speaker count detection (using patterns)
 * Pass 3: Speaker role identification (interviewer, guest, etc.)
 * Pass 4: Speaker name extraction (with role context)
 * Pass 5: Validation and consensus
 */

import type { TranscriptionChunk } from '@/types/audioSegment';
import type { SpeakerTurn } from '@/types/audioSegment';
import {
  analyzeConversationFlow,
  buildSpeakerCountPrompt,
  buildSpeakerRolePrompt,
  buildNameDetectionPrompt,
  parseSpeakerCountResponse,
  parseSpeakerRolesResponse,
  parseSpeakerNamesResponse,
  type ConversationPatterns,
  type SpeakerRole,
  type SpeakerNameResult,
} from './speakerAnalyzer';

// ============================================================================
// Types
// ============================================================================

export interface SpeakerIdentificationResult {
  speakerMap: Map<string, string>; // Maps "Speaker 1" -> "John Smith"
  confidence: Map<string, number>; // Confidence score 0-1 for each mapping
  detectionMethod: Map<string, SpeakerDetectionMethod>; // How each speaker was identified
  suggestions: SpeakerSuggestion[]; // Alternative suggestions
  warnings: string[]; // Validation warnings
}

export type SpeakerDetectionMethod = 
  | 'user-provided'
  | 'self-introduction'
  | 'name-mention'
  | 'role-indicator'
  | 'context-inference'
  | 'pattern-analysis'
  | 'unknown';

export interface SpeakerSuggestion {
  speakerLabel: string; // e.g., "Speaker 2"
  suggestedName: string;
  confidence: number;
  reason: string;
}

export interface SpeakerIdentificationOptions {
  mode: 'auto' | 'first-speaker' | 'all-speakers';
  firstSpeaker?: string;
  allSpeakers?: string[];
  useAIDetection: boolean;
  transcript: string;
  speakerTurns?: SpeakerTurn[];
}

// ============================================================================
// Main Identification Function
// ============================================================================

/**
 * Identify speakers using AI analysis and optional user input
 */
export async function identifySpeakers(
  options: SpeakerIdentificationOptions,
  llmGenerateFunction: (prompt: string) => Promise<string>
): Promise<SpeakerIdentificationResult> {
  const { mode, firstSpeaker, allSpeakers, useAIDetection, transcript, speakerTurns } = options;

  const result: SpeakerIdentificationResult = {
    speakerMap: new Map(),
    confidence: new Map(),
    detectionMethod: new Map(),
    suggestions: [],
    warnings: [],
  };

  // Count detected speakers
  const speakerCount = countSpeakers(transcript);
  
  // Mode: User provided all speakers
  if (mode === 'all-speakers' && allSpeakers && allSpeakers.length > 0) {
    const validSpeakers = allSpeakers.filter(s => s.trim());
    
    // CRITICAL FIX: Ask AI to match ALL speaker labels in transcript to provided names
    // Don't just do 1:1 mapping - need to identify when same person speaks multiple times
    console.log('[identifySpeakers] Matching all speakers to provided names:', validSpeakers);
    
    const matched = await matchSpeakersToProvidedNames(
      transcript,
      validSpeakers,
      llmGenerateFunction
    );
    
    // Use matched results
    matched.speakerMap.forEach((name, label) => {
      result.speakerMap.set(label, name);
      result.confidence.set(label, matched.confidence.get(label) || 0.8);
      result.detectionMethod.set(label, matched.detectionMethod.get(label) || 'user-provided');
    });
    
    matched.warnings.forEach(w => result.warnings.push(w));
    matched.suggestions.forEach(s => result.suggestions.push(s));
    
    return result;
  }

  // Mode: User provided first speaker only
  if (mode === 'first-speaker' && firstSpeaker?.trim()) {
    result.speakerMap.set('Speaker 1', firstSpeaker.trim());
    result.confidence.set('Speaker 1', 0.9);
    result.detectionMethod.set('Speaker 1', 'user-provided');
    
    // Use AI to detect remaining speakers with multi-pass analysis
    if (useAIDetection && speakerCount > 1) {
      console.log('[identifySpeakers] Using multi-pass detection for remaining speakers');
      const detected = await detectSpeakersMultiPass(
        transcript,
        result.speakerMap,
        llmGenerateFunction
      );
      
      // Merge detected speakers (skip Speaker 1 as it's user-provided)
      detected.speakerMap.forEach((name, label) => {
        if (!result.speakerMap.has(label)) {
          result.speakerMap.set(label, name);
          result.confidence.set(label, detected.confidence.get(label) || 0.5);
          result.detectionMethod.set(label, detected.detectionMethod.get(label) || 'context-inference');
        }
      });
      
      detected.suggestions.forEach(s => result.suggestions.push(s));
      detected.warnings.forEach(w => result.warnings.push(w));
    }
    
    return result;
  }

  // Mode: Fully automatic detection with multi-pass analysis
  if (useAIDetection) {
    console.log('[identifySpeakers] Using multi-pass AI detection');
    return await detectSpeakersMultiPass(
      transcript,
      new Map(),
      llmGenerateFunction
    );
  }

  // No detection - return generic labels
  for (let i = 1; i <= speakerCount; i++) {
    const label = `Speaker ${i}`;
    result.speakerMap.set(label, label);
    result.confidence.set(label, 0.0);
    result.detectionMethod.set(label, 'unknown');
  }

  return result;
}

// ============================================================================
// AI Detection Functions
// ============================================================================

/**
 * NEW: Multi-pass AI-powered speaker detection
 * Uses conversation flow analysis + role detection + name extraction
 */
async function detectSpeakersMultiPass(
  transcript: string,
  knownSpeakers: Map<string, string>,
  llmGenerateFunction: (prompt: string) => Promise<string>
): Promise<SpeakerIdentificationResult> {
  console.log('[detectSpeakersMultiPass] Starting multi-pass analysis...');
  
  try {
    // PASS 1: Analyze conversation flow (no LLM needed)
    console.log('[detectSpeakersMultiPass] Pass 1: Conversation flow analysis');
    const flowAnalysis = analyzeConversationFlow(transcript);
    console.log('[detectSpeakersMultiPass] Flow analysis:', {
      type: flowAnalysis.conversationType,
      likelySpeakers: flowAnalysis.likelySpeakerCount,
      confidence: flowAnalysis.confidence,
    });
    
    // PASS 2: Detect speaker count (LLM-assisted)
    console.log('[detectSpeakersMultiPass] Pass 2: Speaker count detection');
    const countPrompt = buildSpeakerCountPrompt(transcript, flowAnalysis);
    const countResponse = await llmGenerateFunction(countPrompt);
    const speakerCount = parseSpeakerCountResponse(countResponse);
    console.log('[detectSpeakersMultiPass] Detected speaker count:', speakerCount);
    
    // PASS 3: Identify speaker roles (LLM-assisted)
    console.log('[detectSpeakersMultiPass] Pass 3: Speaker role identification');
    const rolePrompt = buildSpeakerRolePrompt(transcript, speakerCount, flowAnalysis.conversationType);
    const roleResponse = await llmGenerateFunction(rolePrompt);
    const roles = parseSpeakerRolesResponse(roleResponse, speakerCount);
    console.log('[detectSpeakersMultiPass] Detected roles:', roles);
    
    // PASS 4: Extract speaker names (LLM-assisted with role context)
    console.log('[detectSpeakersMultiPass] Pass 4: Speaker name extraction');
    const namePrompt = buildNameDetectionPrompt(transcript, speakerCount, roles);
    const nameResponse = await llmGenerateFunction(namePrompt);
    const names = parseSpeakerNamesResponse(nameResponse, speakerCount);
    console.log('[detectSpeakersMultiPass] Detected names:', names);
    
    // PASS 5: Build final result
    const result: SpeakerIdentificationResult = {
      speakerMap: new Map(),
      confidence: new Map(),
      detectionMethod: new Map(),
      suggestions: [],
      warnings: [],
    };
    
    names.forEach((nameResult) => {
      const label = `Speaker ${nameResult.id}`;
      result.speakerMap.set(label, nameResult.name);
      result.confidence.set(label, nameResult.confidence);
      result.detectionMethod.set(label, nameResult.detectionMethod as SpeakerDetectionMethod);
      
      // Add role information as metadata
      const role = roles.find(r => r.id === nameResult.id);
      if (role) {
        result.suggestions.push({
          speakerLabel: label,
          suggestedName: `${nameResult.name} (${role.role})`,
          confidence: nameResult.confidence,
          reason: `Role: ${role.role}, Evidence: ${nameResult.evidence}`,
        });
      }
    });
    
    // Add conversation context to warnings
    result.warnings.push(`Conversation type: ${flowAnalysis.conversationType}`);
    result.warnings.push(`Flow analysis confidence: ${(flowAnalysis.confidence * 100).toFixed(0)}%`);
    flowAnalysis.evidence.forEach(e => result.warnings.push(e));
    
    console.log('[detectSpeakersMultiPass] Multi-pass analysis complete');
    return result;
    
  } catch (error) {
    console.error('[detectSpeakersMultiPass] Multi-pass analysis failed:', error);
    
    // Fallback to single-pass detection
    console.log('[detectSpeakersMultiPass] Falling back to legacy detection...');
    return detectSpeakersFromTranscript(transcript, 2, knownSpeakers, llmGenerateFunction);
  }
}

/**
 * LEGACY: Single-pass speaker detection (fallback)
 * Use AI to detect speakers from transcript content
 */
async function detectSpeakersFromTranscript(
  transcript: string,
  expectedSpeakerCount: number,
  knownSpeakers: Map<string, string>,
  llmGenerateFunction: (prompt: string) => Promise<string>
): Promise<SpeakerIdentificationResult> {
  const prompt = buildSpeakerDetectionPrompt(transcript, expectedSpeakerCount, knownSpeakers);
  
  try {
    const response = await llmGenerateFunction(prompt);
    return parseSpeakerDetectionResponse(response, expectedSpeakerCount);
  } catch (error) {
    console.error('[detectSpeakersFromTranscript] Error:', error);
    
    // Fallback: return generic labels
    const result: SpeakerIdentificationResult = {
      speakerMap: new Map(),
      confidence: new Map(),
      detectionMethod: new Map(),
      suggestions: [],
      warnings: [`AI detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
    
    for (let i = 1; i <= expectedSpeakerCount; i++) {
      const label = `Speaker ${i}`;
      result.speakerMap.set(label, knownSpeakers.get(label) || label);
      result.confidence.set(label, 0.0);
      result.detectionMethod.set(label, 'unknown');
    }
    
    return result;
  }
}

/**
 * Match ALL speakers in transcript to provided names
 * This is the KEY fix for speaker identification
 */
async function matchSpeakersToProvidedNames(
  transcript: string,
  providedNames: string[],
  llmGenerateFunction: (prompt: string) => Promise<string>
): Promise<SpeakerIdentificationResult> {
  const prompt = buildMatchingPrompt(transcript, providedNames);
  
  try {
    console.log('[matchSpeakersToProvidedNames] Sending matching request to AI...');
    const response = await llmGenerateFunction(prompt);
    console.log('[matchSpeakersToProvidedNames] AI response received');
    return parseMatchingResponse(response, providedNames);
  } catch (error) {
    console.error('[matchSpeakersToProvidedNames] Error:', error);
    
    // Fallback: simple 1:1 mapping
    const result: SpeakerIdentificationResult = {
      speakerMap: new Map(),
      confidence: new Map(),
      detectionMethod: new Map(),
      suggestions: [],
      warnings: [`AI matching failed: ${error instanceof Error ? error.message : 'Unknown error'}. Using simple mapping.`],
    };
    
    providedNames.forEach((name, index) => {
      const label = `Speaker ${index + 1}`;
      result.speakerMap.set(label, name.trim());
      result.confidence.set(label, 0.6);
      result.detectionMethod.set(label, 'user-provided');
    });
    
    return result;
  }
}

/**
 * Validate user-provided speaker names against transcript
 */
async function validateSpeakerNames(
  transcript: string,
  providedNames: Map<string, string>,
  llmGenerateFunction: (prompt: string) => Promise<string>
): Promise<{
  confidence: Map<string, number>;
  warnings: string[];
  suggestions: SpeakerSuggestion[];
}> {
  const prompt = buildValidationPrompt(transcript, providedNames);
  
  try {
    const response = await llmGenerateFunction(prompt);
    return parseValidationResponse(response, providedNames);
  } catch (error) {
    console.error('[validateSpeakerNames] Error:', error);
    
    // Return default confidence
    const confidence = new Map<string, number>();
    providedNames.forEach((_, label) => confidence.set(label, 0.7));
    
    return {
      confidence,
      warnings: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      suggestions: [],
    };
  }
}

// ============================================================================
// Prompt Builders
// ============================================================================

function buildSpeakerDetectionPrompt(
  transcript: string,
  expectedSpeakerCount: number,
  knownSpeakers: Map<string, string>
): string {
  const knownSpeakersText = Array.from(knownSpeakers.entries())
    .map(([label, name]) => `- ${label}: ${name}`)
    .join('\n');

  // CRITICAL FIX: Only send a SAMPLE of the transcript to avoid exceeding context window
  // For Llama 3.2 3B, we can send more but still need to be cautious
  const maxTranscriptChars = 5000;
  const transcriptSample = transcript.length > maxTranscriptChars
    ? transcript.substring(0, maxTranscriptChars) + '\n\n[... transcript continues ...]'
    : transcript;

  return `You are a speaker identification AI. Analyze this transcript and identify each speaker.

TRANSCRIPT:
${transcriptSample}

EXPECTED SPEAKERS: ${expectedSpeakerCount}
${knownSpeakers.size > 0 ? `\nKNOWN SPEAKERS:\n${knownSpeakersText}` : ''}

INSTRUCTIONS:
1. Look for names mentioned in the transcript (self-introductions, others addressing them)
2. If you find a name, assign it to the correct Speaker label
3. If no name is found, use "Unknown" 
4. Give confidence 0-1: 1.0=certain, 0.8=likely, 0.5=guess

OUTPUT FORMAT - Return ONLY valid JSON, no markdown, no explanation:
{
  "speakers": [
    {"label": "Speaker 1", "name": "John", "confidence": 0.9, "method": "self-introduction", "evidence": "Said 'I'm John'"},
    {"label": "Speaker 2", "name": "Unknown", "confidence": 0.0, "method": "unknown", "evidence": "No name found"}
  ],
  "suggestions": [],
  "warnings": []
}

CRITICAL: Return ONLY the JSON object above. Do not add any text before or after. Do not use markdown code blocks.`;
}

function buildMatchingPrompt(
  transcript: string,
  providedNames: string[]
): string {
  const namesText = providedNames.map((name, i) => `${i + 1}. ${name}`).join('\n');
  const speakerCount = countSpeakers(transcript);

  // Sample transcript to stay within context window
  const maxTranscriptChars = 6000;
  const transcriptSample = transcript.length > maxTranscriptChars
    ? transcript.substring(0, maxTranscriptChars) + '\n\n[... transcript continues ...]'
    : transcript;

  return `You are analyzing a conversation transcript. The user has provided these participant names:

${namesText}

Your task: Match EVERY speaker in the transcript (Speaker 1, Speaker 2, ... Speaker ${speakerCount}) to one of these names.

TRANSCRIPT:
${transcriptSample}

INSTRUCTIONS:
1. Analyze the conversation to figure out who is who
2. Look for context clues: names mentioned, roles, speaking patterns
3. Match EVERY speaker label to one of the provided names
4. If there are more speakers than provided names, some people spoke multiple times - identify which speakers are the same person
5. If you're not sure, make your best guess based on context

OUTPUT FORMAT - Return ONLY valid JSON, no markdown, no explanation:
{
  "matches": [
    {"label": "Speaker 1", "name": "PJ", "confidence": 0.9, "evidence": "Self-introduced as PJ"},
    {"label": "Speaker 2", "name": "Michael", "confidence": 0.8, "evidence": "Called 'Michael' by others"},
    {"label": "Speaker 6", "name": "PJ", "confidence": 0.7, "evidence": "Same speaking style as Speaker 1"},
    {"label": "Speaker 7", "name": "Nick", "confidence": 0.6, "evidence": "Referenced earlier discussion"}
  ],
  "warnings": []
}

CRITICAL: Return ONLY the JSON object. Do not add any text before or after. Do not use markdown code blocks.`;
}

function buildValidationPrompt(
  transcript: string,
  providedNames: Map<string, string>
): string {
  const namesText = Array.from(providedNames.entries())
    .map(([label, name]) => `- ${label}: ${name}`)
    .join('\n');

  // CRITICAL FIX: Only send a SAMPLE of the transcript to avoid exceeding context window
  const maxTranscriptChars = 5000;
  const transcriptSample = transcript.length > maxTranscriptChars
    ? transcript.substring(0, maxTranscriptChars) + '\n\n[... transcript continues ...]'
    : transcript;

  return `Validate if these speaker names appear in the transcript.

TRANSCRIPT:
${transcriptSample}

USER PROVIDED NAMES:
${namesText}

Check if each name appears in the transcript. Give confidence 0-1.

OUTPUT FORMAT - Return ONLY valid JSON, no markdown:
{
  "validations": [
    {"label": "Speaker 1", "providedName": "John", "confidence": 0.9, "validated": true, "evidence": "Name appears", "suggestions": []},
    {"label": "Speaker 2", "providedName": "Mary", "confidence": 0.5, "validated": false, "evidence": "Not found", "suggestions": ["Maria"]}
  ],
  "warnings": []
}

CRITICAL: Return ONLY the JSON object. No markdown, no explanation.`;
}

// ============================================================================
// Response Parsers
// ============================================================================

function parseSpeakerDetectionResponse(
  response: string,
  expectedSpeakerCount: number
): SpeakerIdentificationResult {
  console.log('[parseSpeakerDetectionResponse] Raw AI response:', response.substring(0, 500));
  
  const result: SpeakerIdentificationResult = {
    speakerMap: new Map(),
    confidence: new Map(),
    detectionMethod: new Map(),
    suggestions: [],
    warnings: [],
  };

  try {
    // Try multiple extraction strategies
    let jsonString: string | null = null;
    
    // Strategy 1: Extract from markdown code block ```json ... ```
    const markdownMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (markdownMatch) {
      jsonString = markdownMatch[1];
      console.log('[parseSpeakerDetectionResponse] Found JSON in markdown block');
    }
    
    // Strategy 2: Extract from plain JSON object
    if (!jsonString) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
        console.log('[parseSpeakerDetectionResponse] Found JSON object');
      }
    }
    
    if (!jsonString) {
      console.error('[parseSpeakerDetectionResponse] No JSON found in response');
      console.error('[parseSpeakerDetectionResponse] Full response:', response);
      throw new Error('No JSON found in response');
    }

    console.log('[parseSpeakerDetectionResponse] Extracted JSON:', jsonString.substring(0, 300));
    const data = JSON.parse(jsonString);
    console.log('[parseSpeakerDetectionResponse] Parsed data:', data);

    // Parse speakers
    if (data.speakers && Array.isArray(data.speakers)) {
      data.speakers.forEach((speaker: any) => {
        const label = speaker.label || `Speaker ${result.speakerMap.size + 1}`;
        const name = speaker.name || label;
        result.speakerMap.set(label, name);
        result.confidence.set(label, speaker.confidence || 0.5);
        result.detectionMethod.set(
          label,
          (speaker.method as SpeakerDetectionMethod) || 'context-inference'
        );
      });
    }

    // Parse suggestions
    if (data.suggestions && Array.isArray(data.suggestions)) {
      data.suggestions.forEach((sug: any) => {
        result.suggestions.push({
          speakerLabel: sug.speaker || '',
          suggestedName: sug.possibleName || '',
          confidence: sug.confidence || 0.5,
          reason: sug.reason || '',
        });
      });
    }

    // Parse warnings
    if (data.warnings && Array.isArray(data.warnings)) {
      result.warnings = data.warnings;
    }
  } catch (error) {
    console.error('[parseSpeakerDetectionResponse] Parse error:', error);
    result.warnings.push('Failed to parse AI response. Using generic labels.');
    
    // Fallback
    for (let i = 1; i <= expectedSpeakerCount; i++) {
      const label = `Speaker ${i}`;
      result.speakerMap.set(label, label);
      result.confidence.set(label, 0.0);
      result.detectionMethod.set(label, 'unknown');
    }
  }

  return result;
}

function parseMatchingResponse(
  response: string,
  providedNames: string[]
): SpeakerIdentificationResult {
  console.log('[parseMatchingResponse] Parsing AI matching response...');
  console.log('[parseMatchingResponse] Raw response:', response.substring(0, 500));
  
  const result: SpeakerIdentificationResult = {
    speakerMap: new Map(),
    confidence: new Map(),
    detectionMethod: new Map(),
    suggestions: [],
    warnings: [],
  };

  try {
    // Extract JSON using multiple strategies
    let jsonString: string | null = null;
    
    // Strategy 1: Extract from markdown code block
    const markdownMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (markdownMatch) {
      jsonString = markdownMatch[1];
      console.log('[parseMatchingResponse] Found JSON in markdown block');
    }
    
    // Strategy 2: Extract from plain JSON object
    if (!jsonString) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
        console.log('[parseMatchingResponse] Found plain JSON object');
      }
    }
    
    if (!jsonString) {
      console.error('[parseMatchingResponse] No JSON found in response');
      throw new Error('No JSON found in AI response');
    }

    console.log('[parseMatchingResponse] Extracted JSON:', jsonString.substring(0, 300));
    const data = JSON.parse(jsonString);

    // Parse matches
    if (data.matches && Array.isArray(data.matches)) {
      console.log('[parseMatchingResponse] Found', data.matches.length, 'matches');
      data.matches.forEach((match: any) => {
        const label = match.label;
        const name = match.name;
        result.speakerMap.set(label, name);
        result.confidence.set(label, match.confidence || 0.7);
        result.detectionMethod.set(label, 'user-provided');
        
        console.log(`[parseMatchingResponse] Matched ${label} → ${name} (confidence: ${match.confidence})`);
      });
    }

    // Parse warnings
    if (data.warnings && Array.isArray(data.warnings)) {
      result.warnings.push(...data.warnings);
    }
    
    console.log('[parseMatchingResponse] Successfully matched', result.speakerMap.size, 'speakers');
  } catch (error) {
    console.error('[parseMatchingResponse] Parse error:', error);
    result.warnings.push('Failed to parse AI matching response. Using simple mapping.');
    
    // Fallback: simple 1:1 mapping
    providedNames.forEach((name, index) => {
      const label = `Speaker ${index + 1}`;
      result.speakerMap.set(label, name);
      result.confidence.set(label, 0.6);
      result.detectionMethod.set(label, 'user-provided');
    });
  }

  return result;
}

function parseValidationResponse(
  response: string,
  providedNames: Map<string, string>
): {
  confidence: Map<string, number>;
  warnings: string[];
  suggestions: SpeakerSuggestion[];
} {
  const confidence = new Map<string, number>();
  const warnings: string[] = [];
  const suggestions: SpeakerSuggestion[] = [];

  try {
    // Try multiple extraction strategies (same as speaker detection)
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

    // Parse validations
    if (data.validations && Array.isArray(data.validations)) {
      data.validations.forEach((val: any) => {
        const label = val.label;
        confidence.set(label, val.confidence || 0.7);
        
        // Add suggestions if validation failed
        if (!val.validated && val.suggestions && Array.isArray(val.suggestions)) {
          val.suggestions.forEach((sug: string) => {
            suggestions.push({
              speakerLabel: label,
              suggestedName: sug,
              confidence: 0.6,
              reason: val.evidence || 'Possible alternative name',
            });
          });
        }
      });
    }

    // Parse warnings
    if (data.warnings && Array.isArray(data.warnings)) {
      warnings.push(...data.warnings);
    }
  } catch (error) {
    console.error('[parseValidationResponse] Parse error:', error);
    warnings.push('Failed to validate names. Proceeding with provided names.');
    
    // Default confidence for all provided names
    providedNames.forEach((_, label) => confidence.set(label, 0.7));
  }

  return { confidence, warnings, suggestions };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Count approximate number of speakers in transcript
 */
function countSpeakers(transcript: string): number {
  const matches = transcript.match(/Speaker \d+/g);
  if (!matches) return 2; // Default assumption
  
  const uniqueSpeakers = new Set(matches);
  return uniqueSpeakers.size;
}

/**
 * Apply speaker identification to formatted transcript
 */
export function applySpeakerNames(
  formattedTranscript: string,
  speakerMap: Map<string, string>
): string {
  let result = formattedTranscript;
  
  // Replace each speaker label with identified name
  speakerMap.forEach((name, label) => {
    // Match patterns like "**Speaker 1**:" or "[00:15] **Speaker 1**:"
    const regex = new RegExp(`(\\*\\*${label}\\*\\*:)`, 'g');
    result = result.replace(regex, `**${name}**:`);
  });
  
  return result;
}

/**
 * Get summary of speaker identification results
 */
export function getSpeakerIdentificationSummary(
  result: SpeakerIdentificationResult
): {
  identifiedCount: number;
  unknownCount: number;
  averageConfidence: number;
  highConfidenceCount: number;
} {
  let identifiedCount = 0;
  let unknownCount = 0;
  let totalConfidence = 0;
  let highConfidenceCount = 0;

  result.speakerMap.forEach((name, label) => {
    const confidence = result.confidence.get(label) || 0;
    totalConfidence += confidence;
    
    if (name.toLowerCase().includes('unknown') || name.startsWith('Speaker ')) {
      unknownCount++;
    } else {
      identifiedCount++;
      if (confidence >= 0.8) {
        highConfidenceCount++;
      }
    }
  });

  return {
    identifiedCount,
    unknownCount,
    averageConfidence: result.speakerMap.size > 0 ? totalConfidence / result.speakerMap.size : 0,
    highConfidenceCount,
  };
}


