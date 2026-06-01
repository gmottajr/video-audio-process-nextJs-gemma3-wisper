"use client";

import { useCallback, useMemo } from "react";
import { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import { getFormatById } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import type { ActionType, ActionOptions, CompressionType } from "@/components/ActionSelector";
import { TranscriptionService } from "@/services/TranscriptionService";
import { errorHandler } from "@/services/ErrorHandlingService";
import type { TranscriptionMode } from "@/types/fast-mode";
import { getActionHandler } from "../_strategies/actionHandlers/registry";
import type { useAppStateMachine } from "@/hooks/useAppStateMachine";
import type { useMediaProcessor, ProcessingResult } from "@/hooks/useMediaProcessor";
import type { useTranscriberFast } from "@/hooks/useTranscriberFast";

type StateMachine = ReturnType<typeof useAppStateMachine>;
type Processor = ReturnType<typeof useMediaProcessor>;
type FastTranscriber = ReturnType<typeof useTranscriberFast>;

interface Deps {
  stateMachine: StateMachine;
  processor: Processor;
  transcriptionMode: TranscriptionMode;
  selectedModelKey: ModelKey;
  fastModeEnabled: boolean;
  fastTranscriber: FastTranscriber;
  setSelectedModelKey: (key: ModelKey) => void;
}

export function useForgeHandlers({
  stateMachine,
  processor,
  transcriptionMode,
  selectedModelKey,
  fastModeEnabled,
  fastTranscriber,
  setSelectedModelKey,
}: Deps) {
  const transcriptionService = useMemo(() => new TranscriptionService(processor), [processor]);

  const handleAction = useCallback(
    async (action: ActionType, formatId: string, options?: ActionOptions) => {
      if (!stateMachine.selectedFile || !processor.isFFmpegLoaded) return;
      stateMachine.startProcessing(action, formatId, {
        normalizeAudio: options?.normalizeAudio,
        compressionType: options?.compressionType,
      });
      try {
        await getActionHandler(action).handle({
          file: stateMachine.selectedFile,
          formatId,
          options,
          transcriptionMode,
          selectedModelKey,
          fastModeEnabled,
          processFile: processor.processFile,
          completeProcessing: stateMachine.completeProcessing,
          fastTranscriber,
          ffmpeg: processor.ffmpeg,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error("[App] Processing failed:", msg);
        stateMachine.failProcessing(`Processing failed: ${msg}`);
      }
    },
    [stateMachine, processor, transcriptionMode, selectedModelKey, fastModeEnabled, fastTranscriber]
  );

  const handleDownload = useCallback(() => {
    const { result, selectedFile, selectedFormatId } = stateMachine;
    if (!result?.blobUrl || !selectedFile || !selectedFormatId) return;
    const format =
      result.type === "audio"
        ? getFormatById(selectedFormatId)
        : getVideoFormatById(selectedFormatId);
    if (!format) return;
    const link = document.createElement("a");
    link.href = result.blobUrl;
    link.download = `${selectedFile.name.split(".")[0]}-converted${format.extension}`;
    link.click();
  }, [stateMachine]);

  const handleReset = useCallback(async () => {
    await processor.reset();
    stateMachine.reset();
  }, [processor, stateMachine]);

  const handleModelSelect = useCallback(
    (modelKey: ModelKey) => {
      setSelectedModelKey(modelKey);
      processor.transcriber.loadModel(WHISPER_MODELS[modelKey].id);
    },
    [processor.transcriber, setSelectedModelKey]
  );

  const handleTranscribeFromDone = useCallback(
    async (
      compressionType: CompressionType,
      normalizeAudio: boolean,
      modelKey: ModelKey,
      segmentFile?: File
    ) => {
      stateMachine.startProcessing("transcribe", "", { compressionType, normalizeAudio });
      try {
        if (segmentFile) {
          const segmentBlobUrl = URL.createObjectURL(segmentFile);
          const segmentResult: ProcessingResult = {
            type: "audio",
            blobUrl: segmentBlobUrl,
            metadata: {
              format: "wav",
              size: segmentFile.size,
              compressionType: "none",
              normalized: false,
            },
          };
          await transcriptionService.transcribeFromResult(segmentResult, segmentFile.name, {
            modelKey,
            compressionType,
            normalizeAudio,
            testMode: false,
          });
          URL.revokeObjectURL(segmentBlobUrl);
        } else {
          await transcriptionService.transcribeFromResult(
            stateMachine.result,
            stateMachine.selectedFile?.name,
            { modelKey, compressionType, normalizeAudio, testMode: false }
          );
        }
      } catch (error) {
        stateMachine.failProcessing(errorHandler.handleError(error, "Transcription from done"));
      }
    },
    [stateMachine, transcriptionService]
  );

  return { handleAction, handleDownload, handleReset, handleModelSelect, handleTranscribeFromDone };
}
