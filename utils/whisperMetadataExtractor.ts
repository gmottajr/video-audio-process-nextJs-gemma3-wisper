/**
 * Whisper Metadata Extractor
 * 
 * Analyzes Whisper transcription output to extract rich metadata
 * for context-aware enhancement prompting.
 */

import type { TranscriptionResult } from '@/contexts/TranscriberContext';
import type {
  WhisperMetadata,
  ContentType,
  DetectionConfidence,
  SpeakingRate,
  FillerDensity,
  FillerWordInstance,
  SpeakerSegment,
  TemporalAnalysis,
  ConfidenceAnalysis,
  KeywordAnalysis,
} from '@/types/whisper-metadata';
import { FILLER_PATTERNS } from '@/types/whisper-metadata';

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract comprehensive metadata from Whisper transcription
 */
export function extractWhisperMetadata(
  result: TranscriptionResult,
  audioDuration?: number
): WhisperMetadata {
  const text = result.text;
  const chunks = result.chunks || [];
  
  // Calculate basic metrics
  const totalWords = countWords(text);
  const totalCharacters = text.length;
  const duration = audioDuration || estimateDuration(chunks);
  
  // Extract filler words
  const fillerAnalysis = analyzeFillerWords(text, totalWords);
  
  // Detect content type
  const contentAnalysis = detectContentType(text, fillerAnalysis);
  
  // Analyze speaking rate
  const speakingAnalysis = analyzeSpeakingRate(totalWords, duration);
  
  // Analyze confidence (if available)
  const confidenceAnalysis = analyzeConfidence(chunks);
  
  // Extract temporal information
  const temporalAnalysis = analyzeTemporalPatterns(chunks, duration);
  
  // Extract keywords
  const keywordAnalysis = extractKeywords(text, totalWords);
  
  // Analyze sentence structure
  const sentenceAnalysis = analyzeSentences(text);
  
  // Detect speakers (if available)
  const speakerAnalysis = analyzeSpeakers(chunks);
  
  return {
    // Basic info
    duration,
    totalWords,
    totalCharacters,
    language: 'en', // Could be extracted from Whisper if multilingual
    
    // Content classification
    contentType: contentAnalysis.type,
    contentTypeConfidence: contentAnalysis.confidence,
    contentTypeReasons: contentAnalysis.reasons,
    
    // Speaking characteristics
    speakingRate: speakingAnalysis.category,
    wordsPerMinute: speakingAnalysis.wpm,
    speakingRateCategory: speakingAnalysis.simplifiedCategory,
    
    // Filler word analysis
    fillerDensity: fillerAnalysis.density,
    fillerWordCount: fillerAnalysis.count,
    fillerWordPercentage: fillerAnalysis.percentage,
    fillerWordsByType: fillerAnalysis.byType,
    fillerWordInstances: fillerAnalysis.instances,
    
    // Sentence analysis
    estimatedSentenceCount: sentenceAnalysis.count,
    averageWordsPerSentence: sentenceAnalysis.avgWords,
    sentenceLengthVariation: sentenceAnalysis.variation,
    
    // Speaker information
    speakerCount: speakerAnalysis.count,
    speakers: speakerAnalysis.speakers,
    dominantSpeaker: speakerAnalysis.dominant,
    
    // Temporal analysis
    temporal: temporalAnalysis,
    
    // Confidence metrics
    confidence: confidenceAnalysis,
    
    // Keywords
    keywords: keywordAnalysis,
    
    // Segments
    segments: chunks.map((chunk, index) => ({
      index,
      start: chunk.timestamp[0],
      end: chunk.timestamp[1] ?? duration,
      text: chunk.text,
      confidence: undefined, // Add if Whisper provides confidence scores
      speaker: undefined, // Add if using diarization
    })),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate duration from chunks if not provided
 */
function estimateDuration(chunks: TranscriptionResult['chunks']): number {
  if (!chunks || chunks.length === 0) return 0;
  const lastChunk = chunks[chunks.length - 1];
  return lastChunk.timestamp[1] ?? (lastChunk.timestamp[0] + 5);
}

/**
 * Analyze filler words in transcript
 */
export function analyzeFillerWords(text: string, totalWords: number): {
  count: number;
  percentage: number;
  density: FillerDensity;
  byType: Record<keyof typeof FILLER_PATTERNS, number>;
  instances: FillerWordInstance[];
} {
  const lowerText = text.toLowerCase();
  const instances: FillerWordInstance[] = [];
  const byType: Record<keyof typeof FILLER_PATTERNS, number> = {
    basic: 0,
    discourse: 0,
    hedging: 0,
    starters: 0,
    repetition: 0,
  };
  
  // Search for each filler pattern
  for (const [category, patterns] of Object.entries(FILLER_PATTERNS)) {
    for (const pattern of patterns) {
      // Use word boundaries for accurate matching
      const escapedPattern = pattern.replace(/\s+/g, '\\s+');
      const regex = new RegExp(`\\b${escapedPattern}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(lowerText)) !== null) {
        instances.push({
          word: pattern,
          category: category as keyof typeof FILLER_PATTERNS,
          position: match.index,
        });
        byType[category as keyof typeof FILLER_PATTERNS]++;
      }
    }
  }
  
  const count = instances.length;
  const percentage = totalWords > 0 ? (count / totalWords) * 100 : 0;
  
  // Determine density category
  let density: FillerDensity;
  if (percentage > 8) density = 'very_high';
  else if (percentage > 5) density = 'high';
  else if (percentage > 2) density = 'moderate';
  else if (percentage > 1) density = 'low';
  else density = 'very_low';
  
  return {
    count,
    percentage,
    density,
    byType,
    instances,
  };
}

/**
 * Detect content type from text patterns and keywords
 */
export function detectContentType(
  text: string, 
  fillerAnalysis: { density: FillerDensity }
): {
  type: ContentType;
  confidence: DetectionConfidence;
  reasons: string[];
} {
  const lowerText = text.toLowerCase();
  const reasons: string[] = [];
  const scores: Record<ContentType, number> = {
    business: 0,
    technical: 0,
    casual: 0,
    interview: 0,
    lecture: 0,
    unknown: 0,
  };
  
  // Business indicators
  const businessTerms = [
    'meeting', 'quarter', 'revenue', 'sales', 'client', 'customer',
    'strategy', 'budget', 'forecast', 'stakeholder', 'roi', 'kpi',
    'proposal', 'deadline', 'deliverable', 'milestone', 'agenda',
    'project', 'team', 'manager', 'executive', 'report', 'analysis',
    'growth', 'market', 'business', 'company', 'corporate', 'profit'
  ];
  const businessCount = businessTerms.filter(term => 
    lowerText.includes(term)
  ).length;
  if (businessCount >= 3) {
    scores.business += businessCount * 2;
    reasons.push(`Found ${businessCount} business terms`);
  }
  
  // Technical indicators
  const technicalTerms = [
    'code', 'function', 'variable', 'api', 'database', 'server',
    'algorithm', 'debug', 'compile', 'deploy', 'repository', 'git',
    'framework', 'library', 'syntax', 'error', 'exception', 'method',
    'class', 'object', 'array', 'string', 'integer', 'boolean',
    'component', 'module', 'package', 'npm', 'python', 'javascript',
    'typescript', 'react', 'node', 'docker', 'kubernetes', 'aws'
  ];
  const technicalCount = technicalTerms.filter(term =>
    lowerText.includes(term)
  ).length;
  if (technicalCount >= 3) {
    scores.technical += technicalCount * 2;
    reasons.push(`Found ${technicalCount} technical terms`);
  }
  
  // Casual indicators
  const casualPhrases = [
    'hang out', 'chill', 'cool', 'awesome', 'dude', 'hey',
    'gonna', 'wanna', 'kinda', 'sorta', 'yeah', 'nah',
    'fun', 'crazy', 'weird', 'stuff', 'things', 'hanging',
    'weekend', 'party', 'friends', 'movie', 'game', 'food'
  ];
  const casualCount = casualPhrases.filter(phrase =>
    lowerText.includes(phrase)
  ).length;
  if (casualCount >= 2 || fillerAnalysis.density === 'very_high') {
    scores.casual += casualCount * 2;
    if (fillerAnalysis.density === 'very_high') {
      scores.casual += 3;
      reasons.push('Very high filler word density suggests casual speech');
    }
    if (casualCount >= 2) {
      reasons.push(`Found ${casualCount} casual phrases`);
    }
  }
  
  // Interview indicators
  const interviewPatterns = [
    'can you tell me', 'walk me through', 'experience with',
    'strengths and weaknesses', 'why do you', 'how would you',
    'what is your', 'describe a time', 'tell me about',
    'background', 'resume', 'position', 'role', 'opportunity',
    'qualified', 'skills', 'career', 'goals', 'achievements'
  ];
  const interviewCount = interviewPatterns.filter(pattern =>
    lowerText.includes(pattern)
  ).length;
  if (interviewCount >= 2) {
    scores.interview += interviewCount * 3;
    reasons.push(`Found ${interviewCount} interview question patterns`);
  }
  
  // Lecture indicators
  const lectureTerms = [
    'today we', "let me explain", 'important to understand',
    'for example', 'in other words', 'to summarize', 'remember that',
    'key point', 'main idea', 'first', 'second', 'third', 'finally',
    'concept', 'definition', 'theory', 'principle', 'chapter',
    'lesson', 'topic', 'understand', 'learn', 'study', 'course'
  ];
  const lectureCount = lectureTerms.filter(term =>
    lowerText.includes(term)
  ).length;
  if (lectureCount >= 3) {
    scores.lecture += lectureCount * 2;
    reasons.push(`Found ${lectureCount} educational/lecture patterns`);
  }
  
  // Determine winner
  let maxScore = 0;
  let detectedType: ContentType = 'unknown';
  
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = type as ContentType;
    }
  }
  
  // Determine confidence
  let confidence: DetectionConfidence;
  if (maxScore >= 10) confidence = 'high';
  else if (maxScore >= 5) confidence = 'medium';
  else confidence = 'low';
  
  if (detectedType === 'unknown') {
    reasons.push('No strong indicators for any specific content type');
  }
  
  return {
    type: detectedType,
    confidence,
    reasons,
  };
}

/**
 * Analyze speaking rate
 */
export function analyzeSpeakingRate(totalWords: number, duration: number): {
  wpm: number;
  category: SpeakingRate;
  simplifiedCategory: 'fast' | 'normal' | 'slow';
} {
  const wpm = duration > 0 ? (totalWords / duration) * 60 : 0;
  
  let category: SpeakingRate;
  let simplifiedCategory: 'fast' | 'normal' | 'slow';
  
  if (wpm >= 180) {
    category = 'very_fast';
    simplifiedCategory = 'fast';
  } else if (wpm >= 150) {
    category = 'fast';
    simplifiedCategory = 'fast';
  } else if (wpm >= 120) {
    category = 'normal';
    simplifiedCategory = 'normal';
  } else if (wpm >= 90) {
    category = 'slow';
    simplifiedCategory = 'slow';
  } else {
    category = 'very_slow';
    simplifiedCategory = 'slow';
  }
  
  return {
    wpm,
    category,
    simplifiedCategory,
  };
}

/**
 * Analyze confidence scores from chunks
 */
export function analyzeConfidence(
  chunks: TranscriptionResult['chunks']
): ConfidenceAnalysis {
  // Note: Whisper doesn't always provide confidence scores
  // This handles the case when confidence data is available
  
  if (!chunks || chunks.length === 0) {
    return {
      averageConfidence: 1.0,
      minConfidence: 1.0,
      maxConfidence: 1.0,
      lowConfidenceCount: 0,
      lowConfidenceSegments: [],
    };
  }
  
  const confidences = chunks
    .map(chunk => (chunk as any).confidence)
    .filter((c): c is number => typeof c === 'number');
  
  if (confidences.length === 0) {
    return {
      averageConfidence: 1.0,
      minConfidence: 1.0,
      maxConfidence: 1.0,
      lowConfidenceCount: 0,
      lowConfidenceSegments: [],
    };
  }
  
  const avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  const min = Math.min(...confidences);
  const max = Math.max(...confidences);
  
  const lowConfidenceSegments = chunks
    .map((chunk, index) => ({
      index,
      confidence: (chunk as any).confidence ?? 1.0,
      text: chunk.text,
      start: chunk.timestamp[0],
      end: chunk.timestamp[1] ?? 0,
    }))
    .filter(seg => seg.confidence < 0.7);
  
  return {
    averageConfidence: avg,
    minConfidence: min,
    maxConfidence: max,
    lowConfidenceCount: lowConfidenceSegments.length,
    lowConfidenceSegments,
  };
}

/**
 * Analyze temporal patterns (pauses, timing)
 */
export function analyzeTemporalPatterns(
  chunks: TranscriptionResult['chunks'],
  totalDuration: number
): TemporalAnalysis {
  if (!chunks || chunks.length === 0) {
    return {
      totalDuration,
      speakingDuration: totalDuration,
      silenceDuration: 0,
      averagePauseDuration: 0,
      longestPause: 0,
      pauseCount: 0,
    };
  }
  
  // Calculate pauses between chunks
  const pauses: number[] = [];
  let longestPause = 0;
  
  for (let i = 1; i < chunks.length; i++) {
    const prevEnd = chunks[i - 1].timestamp[1] ?? chunks[i - 1].timestamp[0];
    const currStart = chunks[i].timestamp[0];
    const pause = currStart - prevEnd;
    
    if (pause > 0.5) { // Significant pause (>500ms)
      pauses.push(pause);
      if (pause > longestPause) {
        longestPause = pause;
      }
    }
  }
  
  const totalSilence = pauses.reduce((sum, p) => sum + p, 0);
  const speakingDuration = totalDuration - totalSilence;
  const avgPause = pauses.length > 0 
    ? (pauses.reduce((sum, p) => sum + p, 0) / pauses.length) * 1000 
    : 0;
  
  return {
    totalDuration,
    speakingDuration,
    silenceDuration: totalSilence,
    averagePauseDuration: avgPause,
    longestPause,
    pauseCount: pauses.length,
  };
}

/**
 * Extract keywords and topics
 */
export function extractKeywords(text: string, totalWords: number): KeywordAnalysis {
  // Simple keyword extraction (can be improved with NLP libraries)
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3); // Skip short words
  
  // Stop words to ignore
  const stopWords = new Set([
    'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
    'were', 'will', 'would', 'could', 'should', 'about', 'which', 'their',
    'there', 'where', 'when', 'what', 'who', 'how', 'why', 'also',
    'just', 'only', 'more', 'some', 'very', 'than', 'then', 'into',
    'over', 'after', 'before', 'being', 'each', 'most', 'such', 'through'
  ]);
  
  // Count word frequency
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    if (!stopWords.has(word)) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }
  
  // Get top keywords
  const topKeywords = Array.from(wordCounts.entries())
    .map(([word, count]) => ({
      word,
      count,
      frequency: (count / totalWords) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Detect acronyms (all caps, 2+ chars)
  const acronyms = Array.from(
    text.matchAll(/\b[A-Z]{2,}\b/g)
  ).map(m => m[0]);
  const uniqueAcronyms = [...new Set(acronyms)];
  
  // Detect proper nouns (capitalized words not at sentence start)
  const properNouns = Array.from(
    text.matchAll(/(?<![.!?]\s)[A-Z][a-z]+/g)
  ).map(m => m[0]);
  const uniqueProperNouns = [...new Set(properNouns)].slice(0, 20);
  
  // Detect technical terms (common programming/technical vocabulary)
  const technicalDictionary = new Set([
    'api', 'sdk', 'framework', 'database', 'server', 'client', 'backend',
    'frontend', 'middleware', 'endpoint', 'authentication', 'authorization',
    'encryption', 'algorithm', 'interface', 'implementation', 'repository',
    'deployment', 'infrastructure', 'container', 'microservice', 'webhook'
  ]);
  
  const technicalTerms = words.filter(w => technicalDictionary.has(w));
  const uniqueTechnicalTerms = [...new Set(technicalTerms)];
  
  return {
    topKeywords,
    technicalTerms: uniqueTechnicalTerms,
    properNouns: uniqueProperNouns,
    acronyms: uniqueAcronyms,
  };
}

/**
 * Analyze sentence structure
 */
export function analyzeSentences(text: string): {
  count: number;
  avgWords: number;
  variation: 'varied' | 'consistent';
} {
  // Simple sentence detection (can be improved)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const count = sentences.length;
  
  if (count === 0) {
    return {
      count: 0,
      avgWords: 0,
      variation: 'consistent',
    };
  }
  
  const sentenceLengths = sentences.map(s => countWords(s));
  const totalWords = sentenceLengths.reduce((sum, len) => sum + len, 0);
  const avgWords = totalWords / count;
  
  // Calculate variation (standard deviation)
  const variance = sentenceLengths.reduce(
    (sum, len) => sum + Math.pow(len - avgWords, 2),
    0
  ) / count;
  const stdDev = Math.sqrt(variance);
  
  const variation = stdDev > avgWords * 0.5 ? 'varied' : 'consistent';
  
  return {
    count,
    avgWords,
    variation,
  };
}

/**
 * Analyze speaker information (if available from diarization)
 */
export function analyzeSpeakers(chunks: TranscriptionResult['chunks']): {
  count?: number;
  speakers?: SpeakerSegment[];
  dominant?: string;
} {
  if (!chunks || chunks.length === 0) {
    return {};
  }
  
  // Check if any chunks have speaker information
  const speakerChunks = chunks.filter(c => (c as any).speaker);
  
  if (speakerChunks.length === 0) {
    return {};
  }
  
  // Count unique speakers
  const speakerSet = new Set(speakerChunks.map(c => (c as any).speaker));
  const count = speakerSet.size;
  
  if (count === 0) {
    return {};
  }
  
  // Calculate speaking time and word count per speaker
  const speakerStats = new Map<string, {
    duration: number;
    wordCount: number;
    segments: Array<{ start: number; end: number }>;
  }>();
  
  for (const chunk of speakerChunks) {
    const speaker = (chunk as any).speaker;
    const start = chunk.timestamp[0];
    const end = chunk.timestamp[1] ?? start;
    const duration = end - start;
    const wordCount = countWords(chunk.text);
    
    const existing = speakerStats.get(speaker);
    if (existing) {
      existing.duration += duration;
      existing.wordCount += wordCount;
      existing.segments.push({ start, end });
    } else {
      speakerStats.set(speaker, {
        duration,
        wordCount,
        segments: [{ start, end }],
      });
    }
  }
  
  // Calculate total duration
  const totalDuration = Array.from(speakerStats.values())
    .reduce((sum, s) => sum + s.duration, 0);
  
  // Build speaker segments
  const speakers: SpeakerSegment[] = Array.from(speakerStats.entries())
    .map(([speaker, stats]) => ({
      speaker,
      start: Math.min(...stats.segments.map(s => s.start)),
      end: Math.max(...stats.segments.map(s => s.end)),
      duration: stats.duration,
      wordCount: stats.wordCount,
      dominance: totalDuration > 0 ? (stats.duration / totalDuration) * 100 : 0,
    }));
  
  // Find dominant speaker
  const dominant = speakers.sort((a, b) => b.dominance - a.dominance)[0]?.speaker;
  
  return {
    count,
    speakers,
    dominant,
  };
}


