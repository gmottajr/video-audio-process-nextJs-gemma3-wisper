import type { ContentType, DetectionConfidence, FillerDensity } from '@/types/whisper-metadata';
import { analyzeFillerWords } from './fillerExtractor';
import type { ExtractorInput, MetadataExtractor } from '../types';

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

  const businessTerms = [
    'meeting', 'quarter', 'revenue', 'sales', 'client', 'customer',
    'strategy', 'budget', 'forecast', 'stakeholder', 'roi', 'kpi',
    'proposal', 'deadline', 'deliverable', 'milestone', 'agenda',
    'project', 'team', 'manager', 'executive', 'report', 'analysis',
    'growth', 'market', 'business', 'company', 'corporate', 'profit',
  ];
  const businessCount = businessTerms.filter(term => lowerText.includes(term)).length;
  if (businessCount >= 3) {
    scores.business += businessCount * 2;
    reasons.push(`Found ${businessCount} business terms`);
  }

  const technicalTerms = [
    'code', 'function', 'variable', 'api', 'database', 'server',
    'algorithm', 'debug', 'compile', 'deploy', 'repository', 'git',
    'framework', 'library', 'syntax', 'error', 'exception', 'method',
    'class', 'object', 'array', 'string', 'integer', 'boolean',
    'component', 'module', 'package', 'npm', 'python', 'javascript',
    'typescript', 'react', 'node', 'docker', 'kubernetes', 'aws',
  ];
  const technicalCount = technicalTerms.filter(term => lowerText.includes(term)).length;
  if (technicalCount >= 3) {
    scores.technical += technicalCount * 2;
    reasons.push(`Found ${technicalCount} technical terms`);
  }

  const casualPhrases = [
    'hang out', 'chill', 'cool', 'awesome', 'dude', 'hey',
    'gonna', 'wanna', 'kinda', 'sorta', 'yeah', 'nah',
    'fun', 'crazy', 'weird', 'stuff', 'things', 'hanging',
    'weekend', 'party', 'friends', 'movie', 'game', 'food',
  ];
  const casualCount = casualPhrases.filter(phrase => lowerText.includes(phrase)).length;
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

  const interviewPatterns = [
    'can you tell me', 'walk me through', 'experience with',
    'strengths and weaknesses', 'why do you', 'how would you',
    'what is your', 'describe a time', 'tell me about',
    'background', 'resume', 'position', 'role', 'opportunity',
    'qualified', 'skills', 'career', 'goals', 'achievements',
  ];
  const interviewCount = interviewPatterns.filter(pattern => lowerText.includes(pattern)).length;
  if (interviewCount >= 2) {
    scores.interview += interviewCount * 3;
    reasons.push(`Found ${interviewCount} interview question patterns`);
  }

  const lectureTerms = [
    'today we', 'let me explain', 'important to understand',
    'for example', 'in other words', 'to summarize', 'remember that',
    'key point', 'main idea', 'first', 'second', 'third', 'finally',
    'concept', 'definition', 'theory', 'principle', 'chapter',
    'lesson', 'topic', 'understand', 'learn', 'study', 'course',
  ];
  const lectureCount = lectureTerms.filter(term => lowerText.includes(term)).length;
  if (lectureCount >= 3) {
    scores.lecture += lectureCount * 2;
    reasons.push(`Found ${lectureCount} educational/lecture patterns`);
  }

  let maxScore = 0;
  let detectedType: ContentType = 'unknown';

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = type as ContentType;
    }
  }

  let confidence: DetectionConfidence;
  if (maxScore >= 10) confidence = 'high';
  else if (maxScore >= 5) confidence = 'medium';
  else confidence = 'low';

  if (detectedType === 'unknown') {
    reasons.push('No strong indicators for any specific content type');
  }

  return { type: detectedType, confidence, reasons };
}

const contentTypeExtractor: MetadataExtractor = {
  id: 'content-type',
  extract({ text, totalWords }: ExtractorInput) {
    const { density } = analyzeFillerWords(text, totalWords);
    const result = detectContentType(text, { density });
    return {
      contentType: result.type,
      contentTypeConfidence: result.confidence,
      contentTypeReasons: result.reasons,
    };
  },
};

export default contentTypeExtractor;
