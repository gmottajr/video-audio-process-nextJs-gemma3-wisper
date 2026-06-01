"use client";

import { useEffect } from "react";
import { WHISPER_MODELS, type ModelKey } from "@/components/ModelSelector";
import type { AppState } from "@/hooks/useAppStateMachine";

interface Deps {
  state: AppState;
  selectedFile: File | null;
  transcriptionMode: string;
  fastModeEnabled: boolean;
  selectedModelKey: ModelKey;
  loadModel: (modelId: string) => void;
}

export function useModelAutoLoad({
  state,
  selectedFile,
  transcriptionMode,
  fastModeEnabled,
  selectedModelKey,
  loadModel,
}: Deps) {
  useEffect(() => {
    if (state !== "INSPECT" || !selectedFile) return;
    if (transcriptionMode === "fast" && fastModeEnabled) {
      console.log(`[App] Fast Mode - workers will load model: ${WHISPER_MODELS[selectedModelKey].id}`);
    } else {
      const modelToLoad = WHISPER_MODELS[selectedModelKey].id;
      console.log("[App] Standard Mode - loading model:", modelToLoad);
      loadModel(modelToLoad);
    }
  }, [state, selectedFile, transcriptionMode, fastModeEnabled, selectedModelKey, loadModel]);
}
