/**
 * Context-Aware Prompt Builder
 * 
 * Generates tailored prompts based on Whisper metadata and enhancement strategy.
 * Produces optimized prompts for different content types and speaking styles.
 */

import type { 
  WhisperMetadata, 
  EnhancementStrategy, 
  PromptConfiguration 
} from '@/types/whisper-metadata';

// ============================================================================
// Main Prompt Building Functions
// ============================================================================

/**
 * Build context-aware enhancement prompt
 */
export function buildContextAwarePrompt(config: PromptConfiguration): string {
  const { metadata, strategy, customInstructions, examples } = config;
  
  // Build each section
  const systemPrompt = buildSystemPrompt(strategy);
  const contextSection = buildContextSection(metadata);
  const strategySection = buildStrategySection(strategy, metadata);
  const styleGuidance = buildStyleGuidance(metadata, strategy);
  const specialInstructions = buildSpecialInstructions(metadata, strategy);
  // Always include examples - either custom or default based on content type
  const examplesSection = examples && examples.length > 0 
    ? buildExamplesSection(examples, metadata.contentType) 
    : buildDefaultExamples(metadata.contentType);
  const customSection = customInstructions ? `\nCUSTOM INSTRUCTIONS:\n${customInstructions}\n` : '';
  
  // Get the transcript text from segments
  const transcriptText = metadata.segments.map(s => s.text).join(' ').trim();
  
  // Assemble final prompt
  return `${systemPrompt}

${contextSection}

${strategySection}

${styleGuidance}

${specialInstructions}
${customSection}
${examplesSection}
ORIGINAL TRANSCRIPT:
---
${transcriptText}
---

ENHANCED TRANSCRIPT (output only the improved text, no preamble or explanation):`;
}

/**
 * Build simple prompt (fallback when no metadata available)
 */
export function buildSimplePrompt(transcript: string): string {
  return `You are a professional transcript editor. Clean up this raw speech-to-text transcript.

Instructions:
1. Remove filler words: um, uh, like, you know, I mean, basically, actually, literally
2. Fix grammar and sentence structure
3. Add proper punctuation and capitalization
4. Improve readability while preserving original meaning
5. Do NOT add new information
6. Do NOT change numbers, names, or technical terms

Output only the enhanced transcript with no explanation.

ORIGINAL TRANSCRIPT:
${transcript}

ENHANCED TRANSCRIPT:`;
}

// ============================================================================
// Section Building Functions
// ============================================================================

/**
 * Build base system prompt based on strategy
 */
function buildSystemPrompt(strategy: EnhancementStrategy): string {
  const preservationRules: string[] = [
    '- Original meaning and intent',
    '- All numbers and numerical values exactly',
  ];
  
  if (strategy.preserveTechnicalTerms) {
    preservationRules.push('- Technical terminology and jargon');
  }
  if (strategy.preserveAcronyms) {
    preservationRules.push('- Acronyms and abbreviations');
  }
  if (strategy.preserveProperNouns) {
    preservationRules.push('- Proper nouns, names, and places');
  }
  if (strategy.preserveSpeakerVoices) {
    preservationRules.push('- Distinct speaker voices and perspectives');
  }
  if (strategy.maintainQuestionAnswerFormat) {
    preservationRules.push('- Question and answer structure');
  }
  
  return `You are a professional transcript editor specializing in converting conversational speech to clear, readable text.

Your task is to enhance raw speech-to-text transcripts while PRESERVING:
${preservationRules.join('\n')}

You must NOT:
- Add information not present in the original
- Change numerical values or statistics
- Alter the speaker's intended message
- Over-formalize casual content
- Remove content that adds meaning`;
}

/**
 * Build context section from metadata
 */
function buildContextSection(metadata: WhisperMetadata): string {
  const durationMin = Math.floor(metadata.duration / 60);
  const durationSec = Math.round(metadata.duration % 60);
  const durationStr = durationMin > 0 
    ? `${durationMin}m ${durationSec}s` 
    : `${durationSec}s`;
  
  const speakerInfo = metadata.speakerCount 
    ? `${metadata.speakerCount} speaker${metadata.speakerCount > 1 ? 's' : ''}`
    : 'Speaker count unknown';
  
  const confidenceLevel = metadata.confidence.averageConfidence >= 0.9 ? 'high' 
    : metadata.confidence.averageConfidence >= 0.7 ? 'medium' 
    : 'low';
  
  let section = `TRANSCRIPT CONTEXT:
- Content Type: ${formatContentType(metadata.contentType)} ${metadata.contentTypeConfidence === 'high' ? '(confident)' : ''}
- Duration: ${durationStr}
- Word Count: ${metadata.totalWords.toLocaleString()} words
- Speakers: ${speakerInfo}
- Speaking Rate: ${Math.round(metadata.wordsPerMinute)} words/minute (${metadata.speakingRateCategory})
- Filler Word Density: ${metadata.fillerWordPercentage.toFixed(1)}% (${metadata.fillerDensity})`;

  if (confidenceLevel !== 'high') {
    section += `\n- Transcription Confidence: ${confidenceLevel}`;
  }
  
  if (metadata.contentTypeReasons.length > 0 && metadata.contentTypeConfidence === 'high') {
    section += `\n- Classification Reasons: ${metadata.contentTypeReasons.slice(0, 2).join('; ')}`;
  }
  
  return section;
}

/**
 * Build strategy section
 */
function buildStrategySection(
  strategy: EnhancementStrategy, 
  metadata: WhisperMetadata
): string {
  const instructions: string[] = [];
  
  // Filler removal instructions
  const fillerInstructions = {
    aggressive: `REMOVE ALL filler words and verbal tics including: um, uh, like, you know, I mean, basically, actually, literally, sort of, kind of, right, okay, so (at sentence starts)`,
    moderate: `REMOVE most filler words (um, uh, like, you know, I mean) but keep occasional natural markers`,
    light: `REMOVE repetitive fillers (um, uh) but preserve conversational markers (like, you know) that add rhythm`,
    minimal: `ONLY REMOVE excessive repetitions and obvious mistakes, preserve natural speech flow`,
  };
  instructions.push(fillerInstructions[strategy.fillerRemoval]);
  
  // Grammar instructions
  const grammarInstructions = {
    strict: `Apply formal grammar rules: complete sentences, proper subject-verb agreement, clear punctuation`,
    balanced: `Fix clear grammatical errors while allowing some conversational constructions`,
    conservative: `Only fix obvious grammatical mistakes that impede understanding`,
  };
  instructions.push(grammarInstructions[strategy.grammarCorrection]);
  
  // Sentence restructuring
  if (strategy.restructureSentences === 'extensive') {
    instructions.push(`Break long run-on sentences into clear, digestible sentences (target 15-25 words per sentence)`);
  } else if (strategy.restructureSentences === 'moderate') {
    instructions.push(`Improve sentence structure where clarity would benefit, split very long sentences`);
  }
  
  // Technical term handling
  if (strategy.preserveTechnicalTerms && metadata.keywords.technicalTerms.length > 0) {
    instructions.push(`PRESERVE technical terms: ${metadata.keywords.technicalTerms.slice(0, 8).join(', ')}`);
  }
  
  // Acronym handling
  if (strategy.preserveAcronyms && metadata.keywords.acronyms.length > 0) {
    instructions.push(`PRESERVE acronyms exactly: ${metadata.keywords.acronyms.slice(0, 10).join(', ')}`);
  }
  
  // Low confidence handling
  if (strategy.conservativeOnLowConfidence && metadata.confidence.lowConfidenceCount > 0) {
    instructions.push(`${metadata.confidence.lowConfidenceCount} segments have low transcription confidence - be conservative with those sections`);
  }
  
  return `ENHANCEMENT INSTRUCTIONS:
${instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}`;
}

/**
 * Build style guidance based on content type
 */
function buildStyleGuidance(
  metadata: WhisperMetadata, 
  strategy: EnhancementStrategy
): string {
  const contentGuidelines = getContentTypeGuidelines(metadata.contentType);
  const formalityGuidelines = getFormalityGuidelines(strategy.targetFormality);
  
  return `STYLE GUIDELINES:
${contentGuidelines}

${formalityGuidelines}`;
}

/**
 * Get content type specific guidelines
 */
function getContentTypeGuidelines(contentType: string): string {
  const guidelines: Record<string, string> = {
    business: `For BUSINESS content:
- Focus on clarity and actionable information
- Ensure decisions and action items are clear
- Maintain professional terminology
- Numbers and metrics must be exact`,

    technical: `For TECHNICAL content:
- Preserve all code references, commands, and syntax exactly
- Keep technical explanations intact
- Don't simplify technical concepts
- Maintain precision in technical descriptions`,

    casual: `For CASUAL content:
- Maintain friendly, natural tone
- Keep colloquialisms that add character
- Don't over-professionalize the language
- Preserve humor and personality`,

    interview: `For INTERVIEW content:
- Clearly distinguish questions from answers
- Maintain interviewer/interviewee dynamic
- Preserve the Q&A flow
- Keep personal stories and examples intact`,

    lecture: `For LECTURE content:
- Maintain educational, instructional tone
- Preserve clear explanations and examples
- Keep topic transitions visible
- Ensure key concepts remain clear`,

    unknown: `For GENERAL content:
- Balanced, neutral tone
- Clear and readable output
- Professional but not overly formal
- Preserve the original voice`,
  };
  
  return guidelines[contentType] || guidelines.unknown;
}

/**
 * Get formality guidelines
 */
function getFormalityGuidelines(formality: string): string {
  const guidelines: Record<string, string> = {
    formal: `Formality: FORMAL
- Use complete, well-structured sentences
- Third-person where appropriate
- Avoid contractions
- Professional vocabulary throughout`,

    professional: `Formality: PROFESSIONAL
- Clear, direct statements
- Active voice preferred
- Contractions acceptable
- Industry-appropriate language`,

    conversational: `Formality: CONVERSATIONAL
- Natural, flowing sentences
- First-person preserved
- Contractions welcome
- Accessible, friendly language`,

    casual: `Formality: CASUAL
- Keep relaxed, informal tone
- Personality and voice preserved
- Contractions and colloquialisms okay
- Don't make it sound corporate`,
  };
  
  return guidelines[formality] || guidelines.conversational;
}

/**
 * Build special instructions for edge cases
 */
function buildSpecialInstructions(
  metadata: WhisperMetadata, 
  strategy: EnhancementStrategy
): string {
  const instructions: string[] = [];
  
  // Speaking rate considerations
  if (metadata.speakingRateCategory === 'fast') {
    instructions.push('⚡ Fast speaking pace - expect run-on sentences that may need breaking up');
  } else if (metadata.speakingRateCategory === 'slow') {
    instructions.push('🐢 Slow speaking pace - sentences may be naturally shorter');
  }
  
  // Very high filler density
  if (metadata.fillerDensity === 'very_high') {
    instructions.push('🎤 Very high filler density (>8%) - significant cleanup needed while preserving meaning');
  } else if (metadata.fillerDensity === 'high') {
    instructions.push('🎤 High filler density - moderate cleanup needed');
  }
  
  // Multiple speakers
  if (metadata.speakerCount && metadata.speakerCount > 2) {
    instructions.push(`👥 ${metadata.speakerCount} speakers detected - maintain distinct voices and perspectives`);
  }
  
  // Sentence structure
  if (metadata.averageWordsPerSentence > 30) {
    instructions.push(`📝 Long average sentence length (${Math.round(metadata.averageWordsPerSentence)} words) - consider breaking up for readability`);
  } else if (metadata.averageWordsPerSentence < 8) {
    instructions.push(`📝 Short average sentence length - may need combining short fragments`);
  }
  
  // Low confidence segments
  if (metadata.confidence.lowConfidenceCount > 0 && strategy.flagLowConfidenceSegments) {
    const examples = metadata.confidence.lowConfidenceSegments
      .slice(0, 2)
      .map(s => `"${s.text.substring(0, 40)}..."`)
      .join(', ');
    instructions.push(`⚠️ ${metadata.confidence.lowConfidenceCount} low-confidence segment(s) - be conservative: ${examples}`);
  }
  
  // Key topics hint
  if (metadata.keywords.topKeywords.length > 0) {
    const topWords = metadata.keywords.topKeywords
      .slice(0, 6)
      .map(k => k.word)
      .join(', ');
    instructions.push(`💡 Key topics: ${topWords}`);
  }
  
  // Proper nouns
  if (metadata.keywords.properNouns.length > 0) {
    const names = metadata.keywords.properNouns.slice(0, 5).join(', ');
    instructions.push(`📛 Preserve names/proper nouns: ${names}`);
  }
  
  if (instructions.length === 0) {
    return '';
  }
  
  return `SPECIAL CONSIDERATIONS:
${instructions.map(i => `- ${i}`).join('\n')}`;
}

/**
 * Build examples section with content-appropriate examples
 */
function buildExamplesSection(
  examples: Array<{ before: string; after: string; explanation: string }>,
  contentType: string
): string {
  if (examples.length === 0) {
    // Use default examples based on content type
    return buildDefaultExamples(contentType);
  }
  
  let section = '\nEXAMPLES:\n';
  
  examples.forEach((ex, i) => {
    section += `\nExample ${i + 1}:\n`;
    section += `Before: "${ex.before}"\n`;
    section += `After: "${ex.after}"\n`;
    section += `Why: ${ex.explanation}\n`;
  });
  
  return section;
}

/**
 * Build default examples based on content type
 */
function buildDefaultExamples(contentType: string): string {
  const examples: Record<string, string> = {
    business: `
EXAMPLES:
Before: "So um we need to like look at the Q3 numbers and uh basically the revenue was um pretty good"
After: "We need to look at the Q3 numbers. The revenue was strong."
Why: Removed fillers, split into clear sentences, professional tone

Before: "I think what we should do is you know maybe consider the the option of expanding"
After: "We should consider the option of expanding."
Why: Removed hedging and repetition, direct statement`,

    technical: `
EXAMPLES:
Before: "So um the API endpoint is like returning a 404 error when you try to uh POST the data"
After: "The API endpoint is returning a 404 error when you try to POST the data."
Why: Removed fillers while preserving technical terms exactly

Before: "We need to basically refactor the the authentication middleware to um handle JWT tokens"
After: "We need to refactor the authentication middleware to handle JWT tokens."
Why: Cleaned up fillers, preserved technical terminology`,

    casual: `
EXAMPLES:
Before: "So like we were just um hanging out at the the park and it was like really nice"
After: "We were just hanging out at the park and it was really nice."
Why: Light cleanup of fillers while keeping casual tone

Before: "I was gonna say that um the movie was actually pretty good you know"
After: "I was gonna say that the movie was actually pretty good."
Why: Minimal changes to preserve natural casual speech`,

    interview: `
EXAMPLES:
Before: "Can you um tell me about your experience with um project management?"
After: "Can you tell me about your experience with project management?"

Before: "So basically I've been um working in like software development for um five years"
After: "I've been working in software development for five years."
Why: Clean up fillers while maintaining Q&A format`,

    lecture: `
EXAMPLES:
Before: "So um today we're going to like talk about um the French Revolution"
After: "Today we're going to talk about the French Revolution."

Before: "The key point here is that um basically the economy was um in trouble"
After: "The key point here is that the economy was in trouble."
Why: Clear educational content without verbal fillers`,

    unknown: `
EXAMPLES:
Before: "So um I think that like basically we should consider this option"
After: "I think we should consider this option."
Why: Removed fillers while preserving meaning`,
  };
  
  return examples[contentType] || examples.unknown;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format content type for display
 */
function formatContentType(type: string): string {
  const formats: Record<string, string> = {
    business: 'BUSINESS MEETING',
    technical: 'TECHNICAL DISCUSSION',
    casual: 'CASUAL CONVERSATION',
    interview: 'INTERVIEW/Q&A',
    lecture: 'LECTURE/EDUCATIONAL',
    unknown: 'GENERAL',
  };
  return formats[type] || 'GENERAL';
}

/**
 * Get prompt statistics for debugging/telemetry
 */
export function getPromptStats(prompt: string): {
  totalLength: number;
  estimatedTokens: number;
  sections: string[];
} {
  // Rough token estimation (1 token ≈ 4 chars for English)
  const estimatedTokens = Math.ceil(prompt.length / 4);
  
  // Identify sections
  const sectionHeaders = [
    'TRANSCRIPT CONTEXT',
    'ENHANCEMENT INSTRUCTIONS',
    'STYLE GUIDELINES',
    'SPECIAL CONSIDERATIONS',
    'EXAMPLES',
    'ORIGINAL TRANSCRIPT',
    'ENHANCED TRANSCRIPT',
  ];
  
  const foundSections = sectionHeaders.filter(header => 
    prompt.includes(header)
  );
  
  return {
    totalLength: prompt.length,
    estimatedTokens,
    sections: foundSections,
  };
}


