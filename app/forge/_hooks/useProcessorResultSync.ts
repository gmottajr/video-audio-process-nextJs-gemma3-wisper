"use client";

import { useEffect } from "react";
import type { ProcessingResult } from "@/hooks/useMediaProcessor";
import type { AppState } from "@/hooks/useAppStateMachine";

interface Deps {
  processorResult: ProcessingResult | null;
  processorError: string | null;
  state: AppState;
  currentAction: string | null;
  completeProcessing: (result: ProcessingResult) => void;
  failProcessing: (message: string) => void;
}

export function useProcessorResultSync({
  processorResult,
  processorError,
  state,
  currentAction,
  completeProcessing,
  failProcessing,
}: Deps) {
  // Sync transcription result to state machine
  useEffect(() => {
    if (
      processorResult?.type === "transcription" &&
      state === "PROCESSING" &&
      currentAction === "transcribe"
    ) {
      console.log("[App] Transcription complete, transitioning to DONE");
      completeProcessing(processorResult);
    }
  }, [processorResult, state, currentAction, completeProcessing]);

  // Handle transcription errors
  useEffect(() => {
    if (processorError && state === "PROCESSING") {
      failProcessing(processorError);
    }
  }, [processorError, state, failProcessing]);
}
