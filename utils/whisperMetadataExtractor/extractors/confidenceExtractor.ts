import type { ConfidenceAnalysis } from '@/types/whisper-metadata';
import type { TranscriptionResult } from '@/contexts/TranscriberContext';
import type { ExtractorInput, MetadataExtractor } from '../types';

export function analyzeConfidence(
  chunks: TranscriptionResult['chunks']
): ConfidenceAnalysis {
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

const confidenceExtractor: MetadataExtractor = {
  id: 'confidence',
  extract({ chunks }: ExtractorInput) {
    return { confidence: analyzeConfidence(chunks) };
  },
};

export default confidenceExtractor;
