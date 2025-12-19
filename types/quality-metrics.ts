/**
 * Quality Metrics Types for Phase 3
 * 
 * Comprehensive type definitions for:
 * - Readability scoring
 * - Enhancement quality measurement
 * - User feedback collection
 * - Enhancement history tracking
 * - Analytics aggregation
 */

// ============================================================================
// READABILITY TYPES
// ============================================================================

/**
 * Complete readability score using multiple industry-standard formulas
 * 
 * Multiple metrics provide cross-validation - when they agree, we're confident.
 * Each formula emphasizes different aspects (sentence length vs word complexity).
 */
export interface ReadabilityScore {
  /** Flesch-Kincaid Reading Ease: 0-100 (higher = easier). Most recognized formula. */
  fleschKincaidReadingEase: number;
  
  /** Flesch-Kincaid Grade Level: 0-18+ (US grade level needed to understand) */
  fleschKincaidGradeLevel: number;
  
  /** SMOG Index: Years of education needed (focuses on polysyllabic words) */
  smogIndex: number;
  
  /** Automated Readability Index: Grade level (character-based, no syllable counting) */
  automatedReadabilityIndex: number;
  
  /** Coleman-Liau Index: Grade level (also character-based) */
  colemanLiauIndex: number;
  
  /** Gunning Fog Index: Years of education (penalizes complex words) */
  gunningFogIndex: number;
}

/**
 * Readability difficulty classification
 */
export type ReadabilityDifficulty = 
  | 'very_easy'      // 90-100 Reading Ease, 5th grade
  | 'easy'           // 80-89 Reading Ease, 6th grade
  | 'fairly_easy'    // 70-79 Reading Ease, 7th grade
  | 'standard'       // 60-69 Reading Ease, 8th-9th grade
  | 'fairly_hard'    // 50-59 Reading Ease, 10th-12th grade
  | 'hard'           // 30-49 Reading Ease, College
  | 'very_hard';     // 0-29 Reading Ease, College graduate

/**
 * Complete readability assessment
 */
export interface ReadabilityAssessment {
  score: ReadabilityScore;
  difficulty: ReadabilityDifficulty;
  averageGradeLevel: number;
  recommendation: string;
}

// ============================================================================
// ENHANCEMENT QUALITY METRICS
// ============================================================================

/**
 * Sentiment classification
 */
export type Sentiment = 'positive' | 'neutral' | 'negative';

/**
 * Comprehensive quality metrics comparing original vs enhanced transcript
 * 
 * This is the main output of the quality measurement system.
 * All metrics are calculated automatically after enhancement.
 */
export interface EnhancementQualityMetrics {
  // ─────────────────────────────────────────────────────────────────────────
  // LENGTH METRICS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Original text character count (including spaces) */
  originalLength: number;
  
  /** Enhanced text character count (including spaces) */
  enhancedLength: number;
  
  /** Ratio of enhanced/original length (0.75 = 25% shorter) */
  compressionRatio: number;
  
  /** Percentage reduction (0-100, negative if expanded) */
  reductionPercentage: number;
  
  // ─────────────────────────────────────────────────────────────────────────
  // WORD METRICS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Original word count */
  originalWordCount: number;
  
  /** Enhanced word count */
  enhancedWordCount: number;
  
  /** Words removed (0 if expanded) */
  wordsRemoved: number;
  
  /** Words added (0 if compressed) */
  wordsAdded: number;
  
  // ─────────────────────────────────────────────────────────────────────────
  // SENTENCE METRICS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Original sentence count */
  originalSentenceCount: number;
  
  /** Enhanced sentence count */
  enhancedSentenceCount: number;
  
  /** Average words per sentence in original */
  avgSentenceLengthOriginal: number;
  
  /** Average words per sentence in enhanced */
  avgSentenceLengthEnhanced: number;
  
  // ─────────────────────────────────────────────────────────────────────────
  // READABILITY METRICS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Readability scores before enhancement */
  readabilityBefore: ReadabilityScore;
  
  /** Readability scores after enhancement */
  readabilityAfter: ReadabilityScore;
  
  /** Delta in Flesch-Kincaid Reading Ease (positive = improved) */
  readabilityImprovement: number;
  
  // ─────────────────────────────────────────────────────────────────────────
  // FILLER WORD METRICS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Count of filler words removed */
  fillerWordsRemoved: number;
  
  /** Filler words as percentage of original words */
  fillerRemovalRate: number;
  
  // ─────────────────────────────────────────────────────────────────────────
  // PRESERVATION METRICS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Count of technical terms preserved (API, HTTP, etc.) */
  technicalTermsPreserved: number;
  
  /** Count of acronyms preserved (all-caps words) */
  acronymsPreserved: number;
  
  /** Count of numbers/percentages preserved */
  numbersPreserved: number;
  
  /** Count of proper nouns preserved */
  properNounsPreserved: number;
  
  // ─────────────────────────────────────────────────────────────────────────
  // SENTIMENT METRICS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Detected sentiment of original text */
  sentimentOriginal: Sentiment;
  
  /** Detected sentiment of enhanced text */
  sentimentEnhanced: Sentiment;
  
  /** Whether sentiment was preserved */
  sentimentPreserved: boolean;
  
  // ─────────────────────────────────────────────────────────────────────────
  // QUALITY SCORES
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Overall quality score: 0-100 (composite of all factors) */
  qualityScore: number;
  
  /** Confidence in the enhancement: 0-1 */
  confidenceScore: number;
  
  /** Breakdown of quality score components */
  qualityBreakdown: QualityScoreBreakdown;
}

/**
 * Breakdown of how quality score was calculated
 * Enables transparency and debugging
 */
export interface QualityScoreBreakdown {
  /** Base score (always 50) */
  baseScore: number;
  
  /** Points from readability improvement (-20 to +20) */
  readabilityPoints: number;
  
  /** Points from compression quality (0 to +15) */
  compressionPoints: number;
  
  /** Points from sentiment preservation (0 to +10) */
  sentimentPoints: number;
  
  /** Points from technical term preservation (0 to +10) */
  technicalPoints: number;
  
  /** Points from filler removal (0 to +10) */
  fillerPoints: number;
  
  /** Penalty for concerning issues (0 to -15) */
  penaltyPoints: number;
  
  /** Final calculated score */
  totalScore: number;
}

// ============================================================================
// USER FEEDBACK TYPES
// ============================================================================

/**
 * Issue types users can report
 * Structured tags enable aggregation and analysis
 */
export type FeedbackIssue =
  | 'tone_wrong'           // Wrong tone or formality level
  | 'meaning_changed'      // AI changed the intended meaning
  | 'too_formal'           // Over-formalized casual speech
  | 'too_casual'           // Made business content too informal
  | 'lost_context'         // Lost important contextual information
  | 'technical_errors'     // Mishandled technical terms or jargon
  | 'grammar_issues'       // Introduced grammar or punctuation problems
  | 'incomplete'           // Incomplete or truncated enhancement
  | 'too_aggressive'       // Removed too much content
  | 'not_enough'           // Didn't improve enough
  | 'other';               // Other issue (should add comment)

/**
 * User preference signals for future enhancements
 */
export interface UserPreferences {
  fillerRemoval?: 'more' | 'less' | 'just_right';
  formality?: 'more_formal' | 'less_formal' | 'just_right';
  conciseness?: 'more_concise' | 'more_verbose' | 'just_right';
}

/**
 * User feedback on enhancement quality
 * 
 * Collected after each enhancement to measure satisfaction and identify issues.
 * All data stored locally in browser - never sent to server.
 */
export interface UserFeedback {
  /** Star rating 1-5 (required) */
  rating: 1 | 2 | 3 | 4 | 5;
  
  /** Specific issues reported (shown if rating < 4) */
  issues?: FeedbackIssue[];
  
  /** Free-form comments (max 500 chars) */
  comments?: string;
  
  /** User's preference signals */
  preferences?: UserPreferences;
  
  /** Timestamp when submitted (ISO 8601) */
  timestamp: string;
  
  /** Session identifier */
  sessionId: string;
}

// ============================================================================
// STORED RECORDS TYPES
// ============================================================================

/**
 * Lightweight record stored in localStorage
 * Contains only essential data (~200 bytes per record)
 */
export interface StoredEnhancementRecord {
  /** Unique identifier: "enh_{timestamp}" */
  id: string;
  
  /** When enhancement was performed (ISO 8601) */
  timestamp: string;
  
  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY METRICS (computed, not full metrics object)
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Overall quality score: 0-100 */
  qualityScore: number;
  
  /** Confidence score: 0-1 */
  confidenceScore: number;
  
  /** Readability improvement delta */
  readabilityDelta: number;
  
  /** Compression ratio */
  compressionRatio: number;
  
  /** Original word count */
  originalWordCount: number;
  
  /** Enhanced word count */
  enhancedWordCount: number;
  
  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Content type detected (from Phase 2) */
  contentType: string;
  
  /** Model used for enhancement */
  modelId: string;
  
  /** Processing time in milliseconds */
  processingTimeMs: number;
  
  // ─────────────────────────────────────────────────────────────────────────
  // USER FEEDBACK (optional, added when user submits)
  // ─────────────────────────────────────────────────────────────────────────
  
  /** User's rating if provided */
  userRating?: 1 | 2 | 3 | 4 | 5;
  
  /** Issues reported if any */
  userIssues?: FeedbackIssue[];
  
  /** User comments if any */
  userComments?: string;
  
  /** When feedback was submitted */
  feedbackTimestamp?: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Aggregated feedback analytics
 */
export interface FeedbackAnalytics {
  /** Total feedback entries collected */
  totalFeedbacks: number;
  
  /** Average rating (1-5) */
  averageRating: number;
  
  /** Distribution of ratings */
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  
  /** Frequency of each issue type */
  issueFrequency: Partial<Record<FeedbackIssue, number>>;
  
  /** Top 3 most reported issues */
  topIssues: FeedbackIssue[];
  
  /** Satisfaction rate (% of 4-5 star ratings) */
  satisfactionRate: number;
}

/**
 * Enhancement performance analytics
 */
export interface EnhancementAnalytics {
  /** Total enhancements performed */
  totalEnhancements: number;
  
  /** Average quality score */
  averageQualityScore: number;
  
  /** Average processing time (ms) */
  averageProcessingTime: number;
  
  /** Average compression ratio */
  averageCompressionRatio: number;
  
  /** Average readability improvement */
  averageReadabilityImprovement: number;
  
  /** Breakdown by content type */
  byContentType: Record<string, {
    count: number;
    avgQualityScore: number;
    avgRating: number;
  }>;
  
  /** Breakdown by model */
  byModel: Record<string, {
    count: number;
    avgQualityScore: number;
    avgProcessingTime: number;
  }>;
}

/**
 * Complete analytics summary
 */
export interface AnalyticsSummary {
  feedback: FeedbackAnalytics;
  enhancement: EnhancementAnalytics;
  generatedAt: string;
}

// ============================================================================
// EXPORT DATA TYPES
// ============================================================================

/**
 * Structure of exported data
 */
export interface ExportedData {
  records: StoredEnhancementRecord[];
  analytics: AnalyticsSummary;
  exportedAt: string;
  version: string;
}
