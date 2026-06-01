"use client";

import { Zap, AlertCircle } from "lucide-react";
import { AILoadingIndicator } from "@/components/AILoadingIndicator";
import ModelLoadingScreen from "@/components/ModelLoadingScreen";
import TranscriptionProgressScreen from "@/components/TranscriptionProgressScreen";
import { ProcessingVisualizer } from "@/components/ProcessingVisualizer";
import FastModeProcessingScreen from "@/components/FastModeProcessingScreen";
import { getFormatById } from "@/utils/audioFormats";
import { getVideoFormatById } from "@/utils/videoFormats";
import type { AppState } from "@/hooks/useAppStateMachine";
import type { UseTranscriberFastReturn } from "@/hooks/useTranscriberFast";
import type { useMediaProcessor } from "@/hooks/useMediaProcessor";

type Processor = ReturnType<typeof useMediaProcessor>;

interface Props {
  state: AppState;
  currentAction: string | null;
  selectedFormatId: string | null;
  transcriptionMode: string;
  fastModeEnabled: boolean;
  fastTranscriber: UseTranscriberFastReturn;
  processor: Processor;
  onCancel: () => Promise<void>;
  onNavigate: () => void;
  cancelFastMode: () => void;
  cancelProcessing: () => void;
  isHighLoad: boolean;
  onSwitchToFastMode: () => void;
}

export function ForgeProcessingOverlays({
  state,
  currentAction,
  selectedFormatId,
  transcriptionMode,
  fastModeEnabled,
  fastTranscriber,
  processor,
  onCancel,
  onNavigate,
  cancelFastMode,
  cancelProcessing,
  isHighLoad,
  onSwitchToFastMode,
}: Props) {
  const isFast = fastModeEnabled && transcriptionMode === "fast";
  const isFastModeTranscribe = isFast && currentAction === "transcribe";
  const isFastModePrep = isFastModeTranscribe && fastTranscriber.mode === "idle";

  const showProcessingVisualizer =
    state === "PROCESSING" &&
    !processor.isTranscribing &&
    (!isFastModeTranscribe || isFastModePrep);

  return (
    <>
      {!isFast && (
        <AILoadingIndicator
          isLoading={processor.isModelLoading}
          isLoaded={processor.isModelLoaded}
          progress={processor.transcriptionProgress}
          message={processor.transcriptionMessage}
        />
      )}

      {processor.isTranscribing &&
        state !== "DONE" &&
        state !== "ERROR" &&
        !isFast && <TranscriptionProgressScreen />}

      {isFast && fastTranscriber.mode === "initializing" && (
        <ModelLoadingScreen
          progress={fastTranscriber.progress.percent}
          modelName="Distil-Whisper (Fast Mode)"
          onCancel={() => { cancelFastMode(); cancelProcessing(); }}
        />
      )}

      {isFast && fastTranscriber.mode === "processing" && (
        <FastModeProcessingScreen
          progress={fastTranscriber.progress}
          onCancel={() => { cancelFastMode(); cancelProcessing(); }}
        />
      )}

      {showProcessingVisualizer && (
        <ProcessingVisualizer
          progress={isFastModePrep ? processor.ffmpeg.progress : processor.status.progress}
          speed={isFastModePrep ? null : (typeof processor.status.speed === "number" ? processor.status.speed : null)}
          phase={isFastModePrep ? "processing" : processor.status.phase}
          formatName={
            currentAction === "transcribe" ? "AI"
            : currentAction === "convert_video"
            ? getVideoFormatById(selectedFormatId || "")?.name
            : getFormatById(selectedFormatId || "")?.name
          }
          onCancel={onCancel}
          onNavigate={onNavigate}
        />
      )}

      {isHighLoad && state === "PROCESSING" && transcriptionMode !== "fast" && (
        <div className="fixed bottom-4 right-4 bg-yellow-950/90 border-2 border-yellow-500/50 rounded-lg p-4 max-w-sm backdrop-blur-sm z-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-400 text-sm mb-1">File Too Large for Standard Mode</h3>
              <p className="text-xs text-yellow-300 mb-3">
                Memory is running high. <strong>Fast Mode</strong> is built for large files — it processes audio in small chunks so file size doesn&apos;t matter.
              </p>
              {fastModeEnabled && (
                <button
                  onClick={onSwitchToFastMode}
                  className="w-full text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Switch to Fast Mode
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
