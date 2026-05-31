import { useState, useEffect, useCallback } from 'react';
import {
  readResumeState,
  saveDownloadProgress,
  markDownloadComplete,
  clearDownloadState,
  type DownloadState,
} from '@/services/enhancer/downloadStatePersistence';

export interface UseDownloadResumePromptParams {
  isModelLoading: boolean;
  modelLoadProgress: number;
  currentModelId: string | null;
  totalDownloadMB: number;
  isModelLoaded: boolean;
}

export interface UseDownloadResumePromptResult {
  showResumePrompt: boolean;
  savedDownloadState: DownloadState | null;
  dismiss: () => void;
}

export function useDownloadResumePrompt(
  params: UseDownloadResumePromptParams
): UseDownloadResumePromptResult {
  const { isModelLoading, modelLoadProgress, currentModelId, totalDownloadMB, isModelLoaded } = params;

  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedDownloadState, setSavedDownloadState] = useState<DownloadState | null>(null);

  // Check for interrupted download on mount
  useEffect(() => {
    const state = readResumeState();
    if (state) {
      setShowResumePrompt(true);
      setSavedDownloadState(state);
    }
  }, []);

  // Persist in-progress download
  useEffect(() => {
    if (isModelLoading && modelLoadProgress > 0 && currentModelId) {
      saveDownloadProgress(currentModelId, modelLoadProgress, totalDownloadMB);
    }
  }, [isModelLoading, modelLoadProgress, currentModelId, totalDownloadMB]);

  // Mark completed
  useEffect(() => {
    if (isModelLoaded && currentModelId) {
      markDownloadComplete(currentModelId, totalDownloadMB);
      setShowResumePrompt(false);
      setSavedDownloadState(null);
    }
  }, [isModelLoaded, currentModelId, totalDownloadMB]);

  const dismiss = useCallback(() => {
    setShowResumePrompt(false);
    setSavedDownloadState(null);
    clearDownloadState();
  }, []);

  return { showResumePrompt, savedDownloadState, dismiss };
}
