/**
 * Whisper Transcription Metadata Types
 * 
 * Type definitions for metadata extracted from Whisper output
 * Used for context-aware enhancement prompting
 */

// ============================================================================
// Content Type Detection
// ============================================================================

/**
 * Detected content type based on language patterns and keywords
 */
export type ContentType = 
  | 'business'      // Meetings, presentations, sales calls
  | 'technical'     // Engineering, coding, IT discussions
  | 'casual'        // Personal conversations, informal chats
  | 'interview'     // Job interviews, podcasts, Q&A
  | 'lecture'       // Educational content, tutorials
  | 'unknown';      // Cannot determine

/**
 * Confidence level for content type detection
 */
export type DetectionConfidence = 'high' | 'medium' | 'low';

// ============================================================================
// Speaking Characteristics
// ============================================================================

/**
 * Speaking rate category
 */
export type SpeakingRate = 
  | 'very_fast'  // 180+ WPM
  | 'fast'       // 150-180 WPM
  | 'normal'     // 120-150 WPM
  | 'slow'       // 90-120 WPM
  | 'very_slow'; // <90 WPM

/**
 * Filler word density category
 */
export type FillerDensity =
  | 'very_high'  // >8%
  | 'high'       // 5-8%
  | 'moderate'   // 2-5%
  | 'low'        // 1-2%
  | 'very_low';  // <1%

// ============================================================================
// Filler Word Analysis
// ============================================================================

/**
 * Common filler word patterns
 */
export const FILLER_PATTERNS = {
  // Basic fillers
  basic: ['um', 'uh', 'er', 'ah', 'mm', 'hmm'],
  
  // Discourse markers
  discourse: ['like', 'you know', 'i mean', 'sort of', 'kind of'],
  
  // Hedging
  hedging: ['basically', 'actually', 'literally', 'honestly', 'technically'],
  
  // Sentence starters
  starters: ['so', 'well', 'okay', 'right', 'now'],
  
  // Repetition indicators
  repetition: ['and and', 'the the', 'but but', 'or or'],
} as const;

/**
 * Filler word instance with location
 */
export interface FillerWordInstance {
  word: string;
  category: keyof typeof FILLER_PATTERNS;
  position: number;        // Character position in transcript
  segment?: number;        // Segment/chunk index
  timestamp?: number;      // Time in seconds
}

// ============================================================================
// Speaker Information
// ============================================================================

/**
 * Speaker segment information (if diarization available)
 */
export interface SpeakerSegment {
  speaker: string;         // "Speaker A", "Speaker B", etc.
  start: number;           // Start time in seconds
  end: number;             // End time in seconds
  duration: number;        // Segment duration
  wordCount: number;       // Words spoken in segment
  dominance: number;       // Percentage of total speaking time (0-100)
  avgConfidence?: number;  // Average confidence for this speaker
}

// ============================================================================
// Temporal Analysis
// ============================================================================

/**
 * Pause and timing information
 */
export interface TemporalAnalysis {
  totalDuration: number;           // Total audio duration (seconds)
  speakingDuration: number;        // Time with speech (seconds)
  silenceDuration: number;         // Total silence (seconds)
  averagePauseDuration: number;    // Average pause between words (ms)
  longestPause: number;            // Longest pause (seconds)
  pauseCount: number;              // Number of significant pauses (>500ms)
}

// ============================================================================
// Confidence Analysis
// ============================================================================

/**
 * Transcription confidence metrics
 */
export interface ConfidenceAnalysis {
  averageConfidence: number;       // 0-1, overall transcript confidence
  minConfidence: number;           // Lowest segment confidence
  maxConfidence: number;           // Highest segment confidence
  lowConfidenceCount: number;      // Segments with confidence <0.7
  lowConfidenceSegments: Array<{
    index: number;
    confidence: number;
    text: string;
    start: number;
    end: number;
  }>;
}

// ============================================================================
// Keyword & Topic Analysis
// ============================================================================

/**
 * Topic keyword extraction
 */
export interface KeywordAnalysis {
  topKeywords: Array<{
    word: string;
    count: number;
    frequency: number;      // Percentage of total words
  }>;
  technicalTerms: string[];  // Detected technical/domain terms
  properNouns: string[];     // Names, places, companies
  acronyms: string[];        // Detected acronyms (all caps)
}

// ============================================================================
// Main Metadata Interface
// ============================================================================

/**
 * Complete Whisper transcription metadata
 */
export interface WhisperMetadata {
  // Basic info
  duration: number;              // Total duration in seconds
  totalWords: number;            // Word count
  totalCharacters: number;       // Character count
  language: string;              // Detected language
  
  // Content classification
  contentType: ContentType;
  contentTypeConfidence: DetectionConfidence;
  contentTypeReasons: string[];  // Why this type was detected
  
  // Speaking characteristics
  speakingRate: SpeakingRate;
  wordsPerMinute: number;
  speakingRateCategory: 'fast' | 'normal' | 'slow';
  
  // Filler word analysis
  fillerDensity: FillerDensity;
  fillerWordCount: number;
  fillerWordPercentage: number;
  fillerWordsByType: Record<keyof typeof FILLER_PATTERNS, number>;
  fillerWordInstances: FillerWordInstance[];
  
  // Sentence analysis
  estimatedSentenceCount: number;
  averageWordsPerSentence: number;
  sentenceLengthVariation: 'varied' | 'consistent';
  
  // Speaker information (optional)
  speakerCount?: number;
  speakers?: SpeakerSegment[];
  dominantSpeaker?: string;
  
  // Temporal analysis
  temporal: TemporalAnalysis;
  
  // Confidence metrics
  confidence: ConfidenceAnalysis;
  
  // Keywords & topics
  keywords: KeywordAnalysis;
  
  // Segments (from Whisper chunks)
  segments: Array<{
    index: number;
    start: number;
    end: number;
    text: string;
    confidence?: number;
    speaker?: string;
  }>;
}

// ============================================================================
// Enhancement Strategy
// ============================================================================

/**
 * Enhancement strategy based on metadata
 */
export interface EnhancementStrategy {
  // Filler removal intensity
  fillerRemoval: 'aggressive' | 'moderate' | 'light' | 'minimal';
  
  // Grammar correction level
  grammarCorrection: 'strict' | 'balanced' | 'conservative';
  
  // Formality adjustment
  targetFormality: 'formal' | 'professional' | 'conversational' | 'casual';
  
  // Sentence restructuring
  restructureSentences: 'extensive' | 'moderate' | 'minimal';
  
  // Technical term handling
  preserveTechnicalTerms: boolean;
  preserveAcronyms: boolean;
  preserveProperNouns: boolean;
  
  // Structure preservation
  preserveSpeakerVoices: boolean;
  maintainQuestionAnswerFormat: boolean;
  
  // Confidence handling
  flagLowConfidenceSegments: boolean;
  conservativeOnLowConfidence: boolean;
}

// ============================================================================
// Prompt Configuration
// ============================================================================

/**
 * Configuration for prompt generation
 */
export interface PromptConfiguration {
  metadata: WhisperMetadata;
  strategy: EnhancementStrategy;
  customInstructions?: string;
  examples?: Array<{
    before: string;
    after: string;
    explanation: string;
  }>;
}


