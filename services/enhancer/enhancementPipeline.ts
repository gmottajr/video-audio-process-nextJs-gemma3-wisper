import { chunkTranscript, mergeChunks, getChunkingInfo } from '@/utils/transcriptChunker';
import type { EnhancementResult } from '@/types/enhancement';
import type { WorkerManager } from '@/lib/WorkerManager';
import type { WhisperMetadata } from '@/types/whisper-metadata';
import type { ProgressCallback } from './types';

const MAX_CHUNK_TOKENS = 2000;

export interface PipelineInput {
  transcript: string;
  promptText: string | null;
  metadata: WhisperMetadata | null;
  currentModelId: string | null;
}

export interface PipelineOptions {
  onProgress: ProgressCallback;
}

export async function runEnhancementPipeline(
  worker: WorkerManager,
  input: PipelineInput,
  options: PipelineOptions
): Promise<EnhancementResult> {
  const { transcript, promptText, metadata, currentModelId } = input;
  const { onProgress } = options;
  const chunkingInfo = getChunkingInfo(transcript, MAX_CHUNK_TOKENS);

  if (chunkingInfo.needsChunking) {
    return runChunkedPipeline(worker, input, options, chunkingInfo.estimatedChunks);
  }
  return runSinglePipeline(worker, transcript, promptText, metadata, onProgress);
}

async function runSinglePipeline(
  worker: WorkerManager,
  transcript: string,
  promptText: string | null,
  metadata: WhisperMetadata | null,
  onProgress: ProgressCallback
): Promise<EnhancementResult> {
  const result = await worker.sendRequest<EnhancementResult>('enhance', {
    transcript,
    prompt: promptText ?? undefined,
    metadata: metadata ? {
      contentType: metadata.contentType,
      fillerDensity: metadata.fillerDensity,
      speakingRate: metadata.speakingRateCategory,
    } : undefined,
  }, {
    timeoutMs: 300000,
    onProgress: (prog, msg) => {
      onProgress(prog, msg ?? 'Processing...', undefined);
    },
  });

  return normaliseTimestamp(result);
}

async function runChunkedPipeline(
  worker: WorkerManager,
  input: PipelineInput,
  options: PipelineOptions,
  estimatedChunks: number
): Promise<EnhancementResult> {
  const { transcript, promptText, metadata, currentModelId } = input;
  const { onProgress } = options;

  const chunks = chunkTranscript(transcript, MAX_CHUNK_TOKENS);
  const enhancedChunks: string[] = [];
  let totalTokens = 0;
  let totalFillerWords = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    onProgress(
      Math.round((i / chunks.length) * 90),
      `Processing chunk ${i + 1}/${chunks.length}...`
    );

    const chunkResult = await worker.sendRequest<EnhancementResult>('enhance', {
      transcript: chunk.text,
      prompt: promptText ?? undefined,
      metadata: metadata ? {
        contentType: metadata.contentType,
        fillerDensity: metadata.fillerDensity,
        speakingRate: metadata.speakingRateCategory,
      } : undefined,
    }, {
      timeoutMs: 300000,
      onProgress: (prog, msg) => {
        const overall = Math.round(((i + prog / 100) / chunks.length) * 90);
        onProgress(overall, `Chunk ${i + 1}/${chunks.length}: ${msg ?? 'Processing...'}`);
      },
    });

    enhancedChunks.push(chunkResult.enhancedText);
    totalTokens += chunkResult.tokensGenerated || 0;
    totalFillerWords += chunkResult.improvements?.fillerCount || 0;
  }

  onProgress(95, 'Combining enhanced chunks...');
  const mergedText = mergeChunks(enhancedChunks);

  const originalWords = transcript.split(/\s+/).length;
  const enhancedWords = mergedText.split(/\s+/).length;
  const originalChars = transcript.length;
  const enhancedChars = mergedText.length;

  return {
    originalText: transcript,
    enhancedText: mergedText,
    improvements: {
      fillerWordsRemoved: [],
      fillerCount: totalFillerWords,
      grammarFixes: Math.max(0, Math.floor(Math.abs(originalWords - enhancedWords) * 0.3)),
      originalWordCount: originalWords,
      enhancedWordCount: enhancedWords,
      originalCharCount: originalChars,
      enhancedCharCount: enhancedChars,
      compressionRatio: enhancedChars / originalChars,
      reductionPercentage: Math.max(0, ((originalChars - enhancedChars) / originalChars) * 100),
    },
    processingTime: 0,
    tokensGenerated: totalTokens,
    modelUsed: currentModelId || 'unknown',
    timestamp: new Date(),
  };
}

function normaliseTimestamp(result: EnhancementResult): EnhancementResult {
  return {
    ...result,
    timestamp: typeof result.timestamp === 'string'
      ? new Date(result.timestamp)
      : result.timestamp,
  };
}
