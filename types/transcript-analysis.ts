/**
 * Types for AI-powered Transcript Analysis
 * 
 * Provides structured insights from transcribed content including
 * key points, questions, resolutions, and significant statements.
 */

// ============================================================================
// Core Analysis Types
// ============================================================================

export interface Question {
  text: string;
  speaker?: string;
  timestamp?: number;
  type: 'explicit' | 'implicit';
  category?: 'clarification' | 'concern' | 'information' | 'decision' | 'other';
  answered?: boolean;
  answerText?: string;
}

export interface Deviation {
  description: string;
  context: string;
  timestamp?: number;
  severity: 'low' | 'medium' | 'high';
  fromExpected?: string;  // What was expected
  actual?: string;        // What actually happened
}

export interface Misalignment {
  description: string;
  parties: string[];      // Who is misaligned
  topic: string;
  context: string;
  timestamp?: number;
  severity: 'low' | 'medium' | 'high';
}

export interface Resolution {
  issue: string;
  solution: string;
  context: string;
  timestamp?: number;
  agreedBy?: string[];
  actionRequired?: boolean;
}

export interface Statement {
  text: string;
  speaker?: string;
  timestamp?: number;
  significance: 'high' | 'medium' | 'low';
  category: 'assertion' | 'commitment' | 'insight' | 'decision' | 'fact' | 'opinion';
  relatedTopics?: string[];
}

export interface ActionItem {
  description: string;
  assignedTo?: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  context: string;
  timestamp?: number;
}

export interface Decision {
  description: string;
  outcome: string;
  participants?: string[];
  timestamp?: number;
  rationale?: string;
}

// ============================================================================
// Main Analysis Result
// ============================================================================

export interface TranscriptAnalysis {
  // Summary & Overview
  summary: string;
  keyPoints: string[];
  mainTopics: string[];
  
  // Questions
  questionsRaised: {
    explicit: Question[];
    implicit: Question[];
    total: number;
    answeredCount: number;
  };
  
  // Issues & Resolutions
  deviations: Deviation[];
  misalignments: Misalignment[];
  resolutions: Resolution[];
  
  // Important Content
  significantStatements: Statement[];
  actionItems: ActionItem[];
  decisions: Decision[];
  
  // Metadata
  processingTime: number;
  confidence: number;
  modelUsed: string;
  analyzedAt: string;
  transcriptLength: number;
  speakerCount?: number;
}

// ============================================================================
// Analysis Options
// ============================================================================

export interface AnalysisOptions {
  // What to analyze
  includeKeyPoints?: boolean;
  includeQuestions?: boolean;
  includeDeviations?: boolean;
  includeMisalignments?: boolean;
  includeResolutions?: boolean;
  includeSignificantStatements?: boolean;
  includeActionItems?: boolean;
  includeDecisions?: boolean;
  
  // Analysis depth
  depth?: 'quick' | 'standard' | 'deep';
  
  // Context
  contentType?: 'meeting' | 'interview' | 'lecture' | 'presentation' | 'conversation' | 'general';
  speakerNames?: Record<string, string>; // Map "Speaker 1" -> "John"
  
  // Signal for cancellation
  signal?: AbortSignal;
}

export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  includeKeyPoints: true,
  includeQuestions: true,
  includeDeviations: true,
  includeMisalignments: true,
  includeResolutions: true,
  includeSignificantStatements: true,
  includeActionItems: true,
  includeDecisions: true,
  depth: 'standard',
  contentType: 'general',
};

// ============================================================================
// Analysis State
// ============================================================================

export type AnalysisStatus = 
  | 'idle' 
  | 'analyzing' 
  | 'complete' 
  | 'error' 
  | 'cancelled';

export interface AnalysisProgress {
  status: AnalysisStatus;
  stage: string;
  progress: number;
  message: string;
  error?: string;
}

// ============================================================================
// Worker Message Types
// ============================================================================

export interface AnalyzeTranscriptRequest {
  transcript: string;
  options?: AnalysisOptions;
}

export interface AnalyzeTranscriptResponse {
  analysis: TranscriptAnalysis;
  success: boolean;
  error?: string;
}

export type AnalyzerWorkerMessageType = 'analyze' | 'cancel';

