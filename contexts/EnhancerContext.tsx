"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { DEFAULT_MODEL, ENHANCEMENT_MODELS } from "@/types/enhancement";
import type { EnhancementProgress, EnhancementResult, EnhancementStage } from "@/types/enhancement";
import type { WhisperMetadata, EnhancementStrategy } from "@/types/whisper-metadata";
import type { TranscriptionResult } from "@/contexts/TranscriberContext";
import type { HardwareCapabilities } from "@/types/enhancement";
import type { DownloadState } from "@/services/enhancer/downloadStatePersistence";
import { createDefaultEnhancerEngine } from "@/services/enhancer/enhancerEngine";
import type { EnhancerEngine } from "@/services/enhancer/types";
import { buildAndLogTelemetry } from "@/services/enhancer/enhancerTelemetry";
import { useEnhancerHardware } from "@/hooks/enhancer/useEnhancerHardware";
import { useDownloadResumePrompt } from "@/hooks/enhancer/useDownloadResumePrompt";

// ============================================================================
// Context Type
// ============================================================================

interface EnhancerContextType {
  capabilities: HardwareCapabilities | null;
  isCheckingHardware: boolean;
  hardwareError: string | null;
  isModelLoaded: boolean;
  isModelLoading: boolean;
  modelLoadProgress: number;
  currentModelId: string | null;
  isEnhancing: boolean;
  progress: EnhancementProgress | null;
  error: string | null;
  lastResult: EnhancementResult | null;
  lastMetadata: WhisperMetadata | null;
  lastStrategy: EnhancementStrategy | null;
  useContextAwarePrompts: boolean;
  totalDownloadMB: number;
  showResumePrompt: boolean;
  savedDownloadState: DownloadState | null;
  dismissResumePrompt: () => void;
  loadModel: (modelId?: string) => Promise<void>;
  enhance: (transcript: string, whisperResult?: TranscriptionResult, audioDuration?: number) => Promise<EnhancementResult>;
  cancelEnhancement: () => void;
  reset: () => void;
  resetEngine: () => Promise<void>;
  clearError: () => void;
  clearResult: () => void;
}

// ============================================================================
// Context + public hooks
// ============================================================================

const EnhancerContext = createContext<EnhancerContextType | null>(null);

export function useEnhancerContext() {
  const ctx = useContext(EnhancerContext);
  if (!ctx) throw new Error("useEnhancerContext must be used within EnhancerProvider");
  return ctx;
}

export function useEnhancerContextOptional() {
  return useContext(EnhancerContext);
}

// ============================================================================
// Provider
// ============================================================================

export function EnhancerProvider({ children }: { children: React.ReactNode }) {
  const { capabilities, isCheckingHardware, hardwareError } = useEnhancerHardware();

  const engineRef = useRef<EnhancerEngine | null>(null);

  const getEngine = useCallback((): EnhancerEngine => {
    if (!engineRef.current) engineRef.current = createDefaultEnhancerEngine();
    return engineRef.current;
  }, []);

  useEffect(() => () => { engineRef.current?.dispose(); engineRef.current = null; }, []);

  // Model state
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);

  // Enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [progress, setProgress] = useState<EnhancementProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [lastResult, setLastResult] = useState<EnhancementResult | null>(null);
  const [lastMetadata, setLastMetadata] = useState<WhisperMetadata | null>(null);
  const [lastStrategy, setLastStrategy] = useState<EnhancementStrategy | null>(null);

  // Phase 2 context-aware prompts disabled (prompts exceed 1B model context window)
  const useContextAwarePrompts = false;

  const [totalDownloadMB, setTotalDownloadMB] = useState(0);

  const { showResumePrompt, savedDownloadState, dismiss: dismissResumePrompt } =
    useDownloadResumePrompt({ isModelLoading, modelLoadProgress, currentModelId, totalDownloadMB, isModelLoaded });

  // ============================================================================
  // loadModel
  // ============================================================================

  const loadModel = useCallback(async (modelId?: string) => {
    if (!capabilities?.isCapable) {
      const msg = capabilities?.recommendation.warnings.join(' ') || 'Hardware not capable';
      setError(msg);
      throw new Error(msg);
    }

    let targetModelId = modelId || capabilities.recommendation.suggestedModel || DEFAULT_MODEL.id;
    if (modelId && ENHANCEMENT_MODELS[modelId]) {
      targetModelId = ENHANCEMENT_MODELS[modelId].id;
    }

    if (isModelLoaded && currentModelId === targetModelId) return;
    if (isModelLoading) return;

    setIsModelLoading(true);
    setIsModelLoaded(false);
    setModelLoadProgress(0);
    setError(null);
    setProgress({ stage: 'downloading', progress: 0, message: 'Initializing AI model...' });

    try {
      await getEngine().loadModel(targetModelId, {
        onProgress: (prog, msg, extra) => {
          setModelLoadProgress(prog);
          if (extra?.totalMB) setTotalDownloadMB(extra.totalMB);
          const stage: EnhancementStage = msg?.toLowerCase().includes('loading') ? 'loading' : 'downloading';
          setProgress({ stage, progress: prog, message: msg || `Downloading: ${prog}%`, ...extra });
        },
      });

      setIsModelLoaded(true);
      setCurrentModelId(targetModelId);
      setModelLoadProgress(100);
      setProgress({ stage: 'idle', progress: 100, message: 'Model ready' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load model';
      setError(msg);
      setProgress({ stage: 'error', progress: 0, message: msg });
      throw err;
    } finally {
      setIsModelLoading(false);
    }
  }, [capabilities, isModelLoaded, isModelLoading, currentModelId, getEngine]);

  // ============================================================================
  // enhance
  // ============================================================================

  const enhance = useCallback(async (
    transcript: string,
    whisperResult?: TranscriptionResult,
    audioDuration?: number
  ): Promise<EnhancementResult> => {
    if (!isModelLoaded) {
      const msg = 'Model not loaded';
      setError(msg);
      throw new Error(msg);
    }
    if (!transcript?.trim()) {
      const msg = 'No transcript provided';
      setError(msg);
      throw new Error(msg);
    }
    if (isEnhancing) {
      const msg = 'Enhancement already in progress';
      setError(msg);
      throw new Error(msg);
    }

    setIsEnhancing(true);
    setError(null);
    setLastMetadata(null);
    setLastStrategy(null);
    setProgress({ stage: 'processing', progress: 0, message: 'Analyzing transcript...' });

    try {
      const result = await getEngine().enhance(
        { transcript: transcript.trim(), whisperResult, audioDuration },
        {
          onProgress: (prog, msg) => setProgress({
            stage: prog < 100 ? 'streaming' : 'complete',
            progress: prog,
            message: msg || 'Processing...',
          }),
          onMetadataExtracted: (meta, strat) => {
            setLastMetadata(meta);
            setLastStrategy(strat);
          },
        }
      );

      setLastResult(result);
      setProgress({ stage: 'complete', progress: 100, message: 'Enhancement complete' });

      if (capabilities && currentModelId) {
        buildAndLogTelemetry({ modelId: currentModelId, capabilities, result, transcriptLength: transcript.length });
      }

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Enhancement failed';
      setError(msg);
      setProgress({ stage: 'error', progress: 0, message: msg });
      throw err;
    } finally {
      setIsEnhancing(false);
    }
  }, [isModelLoaded, isEnhancing, capabilities, currentModelId, getEngine]);

  // ============================================================================
  // cancel / reset
  // ============================================================================

  const cancelEnhancement = useCallback(() => {
    if (!isEnhancing) return;
    engineRef.current?.cancel();
    setIsEnhancing(false);
    setProgress({ stage: 'cancelled', progress: 0, message: 'Enhancement cancelled' });
  }, [isEnhancing]);

  const resetEngine = useCallback(async () => {
    if (isEnhancing) cancelEnhancement();
    if (engineRef.current) {
      await engineRef.current.reset();
    }
    setIsModelLoaded(false);
    setIsModelLoading(false);
    setModelLoadProgress(0);
    setCurrentModelId(null);
    setIsEnhancing(false);
    setProgress(null);
    setError(null);
    setLastResult(null);
    setLastMetadata(null);
    setLastStrategy(null);
  }, [isEnhancing, cancelEnhancement]);

  const reset = useCallback(() => {
    if (isEnhancing) cancelEnhancement();
    engineRef.current?.reset().catch(() => {});
    setIsModelLoaded(false);
    setIsModelLoading(false);
    setModelLoadProgress(0);
    setCurrentModelId(null);
    setIsEnhancing(false);
    setProgress(null);
    setError(null);
    setLastResult(null);
  }, [isEnhancing, cancelEnhancement]);

  const clearError = useCallback(() => setError(null), []);
  const clearResult = useCallback(() => setLastResult(null), []);

  // ============================================================================
  // Context value
  // ============================================================================

  const value: EnhancerContextType = {
    capabilities,
    isCheckingHardware,
    hardwareError,
    isModelLoaded,
    isModelLoading,
    modelLoadProgress,
    currentModelId,
    isEnhancing,
    progress,
    error,
    lastResult,
    lastMetadata,
    lastStrategy,
    useContextAwarePrompts,
    totalDownloadMB,
    showResumePrompt,
    savedDownloadState,
    dismissResumePrompt,
    loadModel,
    enhance,
    cancelEnhancement,
    reset,
    resetEngine,
    clearError,
    clearResult,
  };

  return (
    <EnhancerContext.Provider value={value}>
      {children}
    </EnhancerContext.Provider>
  );
}
