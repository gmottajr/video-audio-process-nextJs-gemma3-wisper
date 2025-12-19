/**
 * Enhancement Strategy Generator
 * 
 * Determines optimal enhancement approach based on extracted metadata.
 * Generates tailored strategies for different content types and speaking styles.
 */

import type { WhisperMetadata, EnhancementStrategy } from '@/types/whisper-metadata';

// ============================================================================
// Main Strategy Generation
// ============================================================================

/**
 * Generate enhancement strategy from metadata
 */
export function generateEnhancementStrategy(
  metadata: WhisperMetadata
): EnhancementStrategy {
  // Determine filler removal intensity
  const fillerRemoval = determineFillerRemovalIntensity(metadata);
  
  // Determine grammar correction level
  const grammarCorrection = determineGrammarCorrectionLevel(metadata);
  
  // Determine target formality
  const targetFormality = determineTargetFormality(metadata);
  
  // Determine restructuring level
  const restructureSentences = determineRestructuringLevel(metadata);
  
  // Technical term preservation
  const preserveTechnicalTerms = shouldPreserveTechnicalTerms(metadata);
  const preserveAcronyms = metadata.keywords.acronyms.length > 3;
  const preserveProperNouns = metadata.keywords.properNouns.length > 0;
  
  // Structure preservation
  const preserveSpeakerVoices = (metadata.speakerCount ?? 0) > 1;
  const maintainQuestionAnswerFormat = metadata.contentType === 'interview';
  
  // Confidence handling
  const flagLowConfidenceSegments = metadata.confidence.lowConfidenceCount > 3;
  const conservativeOnLowConfidence = metadata.confidence.averageConfidence < 0.8;
  
  return {
    fillerRemoval,
    grammarCorrection,
    targetFormality,
    restructureSentences,
    preserveTechnicalTerms,
    preserveAcronyms,
    preserveProperNouns,
    preserveSpeakerVoices,
    maintainQuestionAnswerFormat,
    flagLowConfidenceSegments,
    conservativeOnLowConfidence,
  };
}

// ============================================================================
// Strategy Determination Functions
// ============================================================================

/**
 * Determine filler removal intensity based on density and content type
 */
export function determineFillerRemovalIntensity(
  metadata: WhisperMetadata
): EnhancementStrategy['fillerRemoval'] {
  const { fillerDensity, contentType } = metadata;
  
  // Business and technical content: more aggressive filler removal
  if (contentType === 'business' || contentType === 'technical') {
    if (fillerDensity === 'very_high' || fillerDensity === 'high') {
      return 'aggressive';
    } else if (fillerDensity === 'moderate') {
      return 'moderate';
    } else {
      return 'light';
    }
  }
  
  // Casual content: preserve more natural speech patterns
  if (contentType === 'casual') {
    if (fillerDensity === 'very_high') {
      return 'moderate'; // Still remove excessive fillers
    } else if (fillerDensity === 'high') {
      return 'light';
    } else {
      return 'minimal';
    }
  }
  
  // Lecture content: balanced approach for clarity
  if (contentType === 'lecture') {
    if (fillerDensity === 'very_high' || fillerDensity === 'high') {
      return 'aggressive';
    } else if (fillerDensity === 'moderate') {
      return 'moderate';
    } else {
      return 'light';
    }
  }
  
  // Interview: maintain some natural speech while cleaning up
  if (contentType === 'interview') {
    if (fillerDensity === 'very_high') {
      return 'moderate';
    } else if (fillerDensity === 'high') {
      return 'light';
    } else {
      return 'minimal';
    }
  }
  
  // Default (unknown content): balanced approach
  if (fillerDensity === 'very_high') {
    return 'aggressive';
  } else if (fillerDensity === 'high') {
    return 'moderate';
  } else if (fillerDensity === 'moderate') {
    return 'light';
  } else {
    return 'minimal';
  }
}

/**
 * Determine grammar correction level based on content type and speaking rate
 */
export function determineGrammarCorrectionLevel(
  metadata: WhisperMetadata
): EnhancementStrategy['grammarCorrection'] {
  const { contentType, speakingRateCategory } = metadata;
  
  // Business and lecture: strict grammar for professional output
  if (contentType === 'business' || contentType === 'lecture') {
    return 'strict';
  }
  
  // Technical: balanced (preserve technical phrasing that may look unusual)
  if (contentType === 'technical') {
    return 'balanced';
  }
  
  // Casual: conservative (keep natural speech patterns)
  if (contentType === 'casual') {
    return 'conservative';
  }
  
  // Interview: balanced for readability while maintaining voice
  if (contentType === 'interview') {
    return 'balanced';
  }
  
  // Fast speaking often has more grammatical shortcuts - be lenient
  if (speakingRateCategory === 'fast') {
    return 'balanced';
  }
  
  // Default
  return 'balanced';
}

/**
 * Determine target formality level based on content type
 */
export function determineTargetFormality(
  metadata: WhisperMetadata
): EnhancementStrategy['targetFormality'] {
  const { contentType, contentTypeConfidence } = metadata;
  
  // Only apply strong formality changes with high confidence
  if (contentTypeConfidence === 'low') {
    return 'conversational';
  }
  
  switch (contentType) {
    case 'business':
      return 'professional';
    case 'technical':
      return 'professional';
    case 'lecture':
      return 'formal';
    case 'interview':
      return 'professional';
    case 'casual':
      return 'casual';
    default:
      return 'conversational';
  }
}

/**
 * Determine sentence restructuring level
 */
export function determineRestructuringLevel(
  metadata: WhisperMetadata
): EnhancementStrategy['restructureSentences'] {
  const { 
    speakingRateCategory, 
    sentenceLengthVariation, 
    averageWordsPerSentence,
    contentType 
  } = metadata;
  
  // Very long sentences need extensive restructuring
  if (averageWordsPerSentence > 35) {
    return 'extensive';
  }
  
  // Very short choppy sentences might need moderate restructuring
  if (averageWordsPerSentence < 6 && sentenceLengthVariation === 'varied') {
    return 'moderate';
  }
  
  // Fast speaking often produces run-on sentences
  if (speakingRateCategory === 'fast' && sentenceLengthVariation === 'varied') {
    return 'moderate';
  }
  
  // Business and technical: clarity is important
  if (contentType === 'business' || contentType === 'technical') {
    if (averageWordsPerSentence > 25) {
      return 'moderate';
    }
    return 'minimal';
  }
  
  // Lecture: restructure for educational clarity
  if (contentType === 'lecture' && averageWordsPerSentence > 20) {
    return 'moderate';
  }
  
  // Default: minimal restructuring to preserve voice
  return 'minimal';
}

/**
 * Determine if technical terms should be preserved
 */
export function shouldPreserveTechnicalTerms(
  metadata: WhisperMetadata
): boolean {
  // Always preserve for technical content
  if (metadata.contentType === 'technical') {
    return true;
  }
  
  // Preserve if we detected technical terms
  if (metadata.keywords.technicalTerms.length > 0) {
    return true;
  }
  
  // Preserve if many acronyms detected
  if (metadata.keywords.acronyms.length > 5) {
    return true;
  }
  
  return false;
}

// ============================================================================
// Strategy Explanation Functions
// ============================================================================

/**
 * Generate human-readable explanation of the strategy
 */
export function explainStrategy(
  strategy: EnhancementStrategy,
  metadata: WhisperMetadata
): string {
  const lines: string[] = [];
  
  // Content type
  lines.push(`Content Type: ${metadata.contentType.toUpperCase()} (${metadata.contentTypeConfidence} confidence)`);
  
  // Filler removal
  const fillerDesc = {
    aggressive: 'Aggressively removing fillers for professional output',
    moderate: 'Removing most fillers while maintaining some natural flow',
    light: 'Lightly cleaning up obvious fillers',
    minimal: 'Preserving natural speech patterns with minimal filler removal',
  };
  lines.push(`Filler Removal: ${fillerDesc[strategy.fillerRemoval]}`);
  
  // Grammar
  const grammarDesc = {
    strict: 'Applying strict grammar rules for formal output',
    balanced: 'Balanced grammar correction for clarity',
    conservative: 'Conservative grammar - preserving speech patterns',
  };
  lines.push(`Grammar: ${grammarDesc[strategy.grammarCorrection]}`);
  
  // Formality
  lines.push(`Target Tone: ${strategy.targetFormality}`);
  
  // Special handling
  if (strategy.preserveTechnicalTerms) {
    lines.push('⚙️ Preserving technical terminology');
  }
  if (strategy.preserveAcronyms) {
    lines.push(`📝 Preserving acronyms: ${metadata.keywords.acronyms.slice(0, 5).join(', ')}`);
  }
  if (strategy.preserveSpeakerVoices) {
    lines.push(`👥 Maintaining ${metadata.speakerCount} distinct speaker voices`);
  }
  if (strategy.conservativeOnLowConfidence) {
    lines.push('⚠️ Being conservative due to low transcription confidence');
  }
  
  return lines.join('\n');
}

/**
 * Get strategy summary for UI display
 */
export function getStrategySummary(
  strategy: EnhancementStrategy,
  metadata: WhisperMetadata
): {
  contentType: string;
  fillerHandling: string;
  formality: string;
  specialFeatures: string[];
} {
  const specialFeatures: string[] = [];
  
  if (strategy.preserveTechnicalTerms) {
    specialFeatures.push('Preserves technical terms');
  }
  if (strategy.preserveAcronyms && metadata.keywords.acronyms.length > 0) {
    specialFeatures.push(`Preserves ${metadata.keywords.acronyms.length} acronyms`);
  }
  if (strategy.preserveSpeakerVoices && metadata.speakerCount && metadata.speakerCount > 1) {
    specialFeatures.push(`Maintains ${metadata.speakerCount} speaker voices`);
  }
  if (strategy.maintainQuestionAnswerFormat) {
    specialFeatures.push('Preserves Q&A structure');
  }
  if (strategy.conservativeOnLowConfidence) {
    specialFeatures.push('Conservative on uncertain segments');
  }
  
  const fillerDescMap: Record<string, string> = {
    aggressive: 'Aggressive cleanup',
    moderate: 'Moderate cleanup',
    light: 'Light cleanup',
    minimal: 'Minimal changes',
  };
  
  const formalityDescMap: Record<string, string> = {
    formal: 'Formal',
    professional: 'Professional',
    conversational: 'Conversational',
    casual: 'Casual',
  };
  
  return {
    contentType: `${metadata.contentType} (${metadata.contentTypeConfidence})`,
    fillerHandling: fillerDescMap[strategy.fillerRemoval],
    formality: formalityDescMap[strategy.targetFormality],
    specialFeatures,
  };
}


