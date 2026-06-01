import { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import type { ActionOptions, ActionType, CompressionType } from "@/components/ActionSelector";
import { isFeatureEnabled } from "@/lib/featureFlags";

// 🧪 TEST MODE: Set to true to only process first 30 seconds of audio
const TEST_MODE = false;

export interface FastTranscriberApi {
  mode: string;
  error: string | null;
  progress: { percent: number };
  updateConfig: (cfg: { modelId?: string; [key: string]: unknown }) => void;
  transcribeFromWav: (blob: Blob, duration: number) => Promise<{
    text: string;
    segments: { text: string; start: number; end: number }[];
    processingTime: number;
    workersUsed: number;
  } | null>;
}

export interface FFmpegApi {
  prepareAudioForAI: (
    file: File,
    timeoutMs?: number,
    maxDurationSeconds?: number
  ) => Promise<Blob>;
}

export interface DispatchFastModeInput {
  file: File;
  options: ActionOptions | undefined;
  selectedModelKey: ModelKey;
  fastTranscriber: FastTranscriberApi;
  ffmpeg: FFmpegApi;
}

export interface DispatchFastModeResult {
  processingResult: ProcessingResult;
}

export async function dispatchFastModeTranscription({
  file,
  options,
  selectedModelKey,
  fastTranscriber,
  ffmpeg,
}: DispatchFastModeInput): Promise<DispatchFastModeResult> {
  const modelId = WHISPER_MODELS[selectedModelKey].id;
  console.log(`[App] Starting Fast Mode transcription with model: ${modelId}`);

  fastTranscriber.updateConfig({ modelId });

  const audioBlob = await ffmpeg.prepareAudioForAI(
    file,
    undefined,
    options?.testMode ? 30 : undefined
  );

  const { getWavDurationFromHeader } = await import("@/utils/audioDataExtraction");
  const duration = await getWavDurationFromHeader(audioBlob);

  console.log(
    `[App] Audio prepared: ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB WAV, ${duration.toFixed(2)}s`
  );

  const transcriptionResult = await fastTranscriber.transcribeFromWav(audioBlob, duration);

  if (fastTranscriber.error) {
    throw new Error(fastTranscriber.error);
  }

  if (!transcriptionResult) {
    throw new Error(
      "Transcription failed or was cancelled. Try again or switch to Standard mode."
    );
  }

  const processingResult: ProcessingResult = {
    type: "transcription",
    transcription: {
      text: transcriptionResult.text,
      chunks: transcriptionResult.segments.map((seg) => ({
        text: seg.text,
        timestamp: [seg.start, seg.end] as [number, number | null],
      })),
      processingTime: transcriptionResult.processingTime,
    },
    metadata: {
      compressionType: "none",
      normalized: false,
      fastMode: true,
      workersUsed: transcriptionResult.workersUsed,
      processingTime: transcriptionResult.processingTime,
      modelId: WHISPER_MODELS[selectedModelKey].id,
    },
  };

  return { processingResult };
}

export interface DispatchStandardInput {
  file: File;
  action: ActionType;
  formatId: string;
  options: ActionOptions | undefined;
  transcriptionMode: string;
  selectedModelKey: ModelKey;
  processFile: (
    file: File,
    action: ActionType,
    formatId: string,
    options?: {
      resolutionId?: string;
      modelKey?: ModelKey;
      testMode?: boolean;
      normalizeAudio?: boolean;
      compressionType?: CompressionType;
    }
  ) => Promise<ProcessingResult>;
}

export async function dispatchStandardProcessing({
  file,
  action,
  formatId,
  options,
  transcriptionMode,
  selectedModelKey,
  processFile,
}: DispatchStandardInput): Promise<ProcessingResult> {
  const effectiveModelKey =
    transcriptionMode === "fast" ? "distil-small" : selectedModelKey;
  const effectiveNormalizeAudio =
    transcriptionMode === "fast" ? false : (options?.normalizeAudio ?? false);
  const effectiveCompressionType =
    transcriptionMode === "fast" ? "none" : (options?.compressionType ?? "none");

  return processFile(file, action, formatId, {
    resolutionId: options?.resolutionId,
    modelKey: effectiveModelKey,
    testMode: TEST_MODE,
    normalizeAudio: effectiveNormalizeAudio,
    compressionType: effectiveCompressionType,
  });
}

export function shouldUseFastMode(
  action: string,
  transcriptionMode: string,
  fastModeEnabled: boolean
): boolean {
  return (
    action === "transcribe" &&
    transcriptionMode === "fast" &&
    fastModeEnabled &&
    isFeatureEnabled("ENABLE_PARALLEL_WORKERS")
  );
}
