import { extractAudioSegment } from "@/utils/audioExtraction";
import {
  shouldUseFastMode,
  dispatchFastModeTranscription,
  dispatchStandardProcessing,
} from "../../_services/transcriptionDispatcher";
import type { ActionHandler, ActionHandlerContext } from "./types";

const transcribe: ActionHandler = {
  id: "transcribe",
  async handle({
    file,
    formatId,
    options,
    transcriptionMode,
    selectedModelKey,
    fastModeEnabled,
    processFile,
    completeProcessing,
    fastTranscriber,
    ffmpeg,
  }: ActionHandlerContext) {
    let fileToProcess: File = file;

    // Extract segment for audio files when a time range is requested
    if (options?.segment && file.type.startsWith("audio/")) {
      console.log("[App] Extracting audio segment:", options.segment);
      const originalBlob = new Blob([await file.arrayBuffer()], { type: file.type });
      const segmentBlob = await extractAudioSegment(
        originalBlob,
        options.segment.startTime,
        options.segment.endTime
      );
      const segmentFileName = `segment_${options.segment.startTime.toFixed(1)}-${options.segment.endTime.toFixed(1)}_${file.name}`;
      fileToProcess = new File([segmentBlob], segmentFileName, { type: "audio/wav" });
      console.log("[App] Segment extracted:", fileToProcess.name, fileToProcess.size, "bytes");
    }

    if (shouldUseFastMode("transcribe", transcriptionMode, fastModeEnabled)) {
      console.log("[App] 🚀 Using Fast Mode with parallel processing");
      const { processingResult } = await dispatchFastModeTranscription({
        file: fileToProcess,
        options,
        selectedModelKey,
        fastTranscriber,
        ffmpeg,
      });
      completeProcessing(processingResult);
      console.log("[App] ✅ Fast Mode transcription complete");
      return;
    }

    // Standard / non-parallel-fast processing — result lands via useProcessorResultSync
    await dispatchStandardProcessing({
      file: fileToProcess,
      action: "transcribe",
      formatId,
      options,
      transcriptionMode,
      selectedModelKey,
      processFile,
    });
  },
};

export default transcribe;
