"use client";

/**
 * AI Enhancement Context
 * 
 * Provides state management for the AI transcript enhancement feature.
 * Similar pattern to TranscriberContext but for LLM-based enhancement.
 */

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { WorkerManager } from "@/lib/WorkerManager";
import { useHardwareCapabilities } from "@/hooks/useHardwareCapabilities";
import type { 
  EnhancementProgress, 
  EnhancementResult, 
  EnhancementStage,
  HardwareCapabilities 
} from "@/types/enhancement";
import { DEFAULT_MODEL } from "@/types/enhancement";

// ============================================================================
// Context Type Definition
// ============================================================================

interface EnhancerContextType {
  // Hardware capabilities
  capabilities: HardwareCapabilities | null;
  isCheckingHardware: boolean;
  hardwareError: string | null;
  
  // Model state
  isModelLoaded: boolean;
  isModelLoading: boolean;
  modelLoadProgress: number;
  currentModelId: string | null;
  
  // Enhancement state
  isEnhancing: boolean;
  progress: EnhancementProgress | null;
  error: string | null;
  
  // Results
  lastResult: EnhancementResult | null;
  
  // Actions
  loadModel: (modelId?: string) => Promise<void>;
  enhance: (transcript: string) => Promise<EnhancementResult>;
  cancelEnhancement: () => void;
  reset: () => void;
  clearError: () => void;
  clearResult: () => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const EnhancerContext = createContext<EnhancerContextType | null>(null);

/**
 * Hook to access the Enhancer context
 * @throws Error if used outside of EnhancerProvider
 */
export function useEnhancerContext() {
  const context = useContext(EnhancerContext);
  if (!context) {
    throw new Error("useEnhancerContext must be used within EnhancerProvider");
  }
  return context;
}

/**
 * Optional hook that returns null if outside provider
 * Useful for conditional rendering
 */
export function useEnhancerContextOptional() {
  return useContext(EnhancerContext);
}

// ============================================================================
// Provider Component
// ============================================================================

interface EnhancerProviderProps {
  children: React.ReactNode;
}

export function EnhancerProvider({ children }: EnhancerProviderProps) {
  // Hardware detection
  const { 
    isChecking: isCheckingHardware, 
    capabilities, 
    error: hardwareError 
  } = useHardwareCapabilities();
  
  // Worker reference
  const workerRef = useRef<WorkerManager | null>(null);
  
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
  
  // Request tracking for cancellation
  const currentRequestIdRef = useRef<string | null>(null);

  // ============================================================================
  // Worker Management
  // ============================================================================

  /**
   * Initialize the worker if not already created
   */
  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      console.log('[EnhancerContext] Initializing worker...');
      try {
        workerRef.current = new WorkerManager('/enhancer.worker.js');
        console.log('[EnhancerContext] Worker initialized');
      } catch (err) {
        console.error('[EnhancerContext] Failed to initialize worker:', err);
        setError('Failed to initialize AI worker');
        throw err;
      }
    }
    return workerRef.current;
  }, []);

  /**
   * Cleanup worker on unmount
   */
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        console.log('[EnhancerContext] Disposing worker on unmount');
        workerRef.current.dispose();
        workerRef.current = null;
      }
    };
  }, []);

  // ============================================================================
  // Model Loading
  // ============================================================================

  /**
   * Load the AI model
   * Downloads and caches the model on first use (~1.7GB for Llama 3.2 3B)
   */
  const loadModel = useCallback(async (modelId?: string) => {
    // Check hardware capability
    if (!capabilities?.isCapable) {
      const errorMsg = capabilities?.recommendation.warnings.join(' ') || 'Hardware not capable';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    const targetModelId = modelId || capabilities.recommendation.suggestedModel || DEFAULT_MODEL.id;

    // Skip if already loaded with same model
    if (isModelLoaded && currentModelId === targetModelId) {
      console.log('[EnhancerContext] Model already loaded:', targetModelId);
      return;
    }

    // Skip if already loading
    if (isModelLoading) {
      console.log('[EnhancerContext] Model loading already in progress');
      return;
    }

    console.log('[EnhancerContext] Loading model:', targetModelId);

    setIsModelLoading(true);
    setIsModelLoaded(false);
    setModelLoadProgress(0);
    setError(null);
    setProgress({
      stage: 'downloading',
      progress: 0,
      message: 'Initializing AI model...',
    });

    try {
      const worker = initWorker();

      await worker.sendRequest('init', { modelId: targetModelId }, {
        timeoutMs: 600000, // 10 minutes for download
        onProgress: (prog, msg) => {
          setModelLoadProgress(prog);
          
          // Determine stage based on message
          let stage: EnhancementStage = 'downloading';
          if (msg?.toLowerCase().includes('loading')) {
            stage = 'loading';
          }
          
          setProgress({
            stage,
            progress: prog,
            message: msg || `Downloading: ${prog}%`,
          });
        },
      });

      setIsModelLoaded(true);
      setCurrentModelId(targetModelId);
      setModelLoadProgress(100);
      setProgress({
        stage: 'idle',
        progress: 100,
        message: 'Model ready',
      });

      console.log('[EnhancerContext] Model loaded successfully:', targetModelId);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load model';
      console.error('[EnhancerContext] Model loading failed:', errorMsg);
      
      setError(errorMsg);
      setProgress({
        stage: 'error',
        progress: 0,
        message: errorMsg,
      });
      
      throw err;
    } finally {
      setIsModelLoading(false);
    }
  }, [capabilities, isModelLoaded, isModelLoading, currentModelId, initWorker]);

  // ============================================================================
  // Enhancement
  // ============================================================================

  /**
   * Enhance a transcript using the loaded model
   */
  const enhance = useCallback(async (transcript: string): Promise<EnhancementResult> => {
    // Validate model is loaded
    if (!isModelLoaded || !workerRef.current) {
      const errorMsg = 'Model not loaded. Please load the model first.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    // Validate input
    if (!transcript || transcript.trim().length === 0) {
      const errorMsg = 'No transcript provided';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    // Prevent concurrent enhancements
    if (isEnhancing) {
      const errorMsg = 'Enhancement already in progress';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    console.log('[EnhancerContext] Starting enhancement...');
    console.log('[EnhancerContext] Transcript length:', transcript.length, 'chars');

    setIsEnhancing(true);
    setError(null);
    setProgress({
      stage: 'processing',
      progress: 0,
      message: 'Starting enhancement...',
    });

    try {
      const result = await workerRef.current.sendRequest<EnhancementResult>('enhance', {
        transcript: transcript.trim(),
      }, {
        timeoutMs: 300000, // 5 minutes for processing
        onProgress: (prog, msg) => {
          setProgress({
            stage: prog < 100 ? 'streaming' : 'complete',
            progress: prog,
            message: msg || 'Processing...',
          });
        },
      });

      // Convert timestamp string to Date if needed
      const enhancementResult: EnhancementResult = {
        ...result,
        timestamp: typeof result.timestamp === 'string' 
          ? new Date(result.timestamp) 
          : result.timestamp,
      };

      setLastResult(enhancementResult);
      setProgress({
        stage: 'complete',
        progress: 100,
        message: 'Enhancement complete',
      });

      console.log('[EnhancerContext] Enhancement complete');
      console.log('[EnhancerContext] Improvements:', enhancementResult.improvements);

      return enhancementResult;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Enhancement failed';
      console.error('[EnhancerContext] Enhancement failed:', errorMsg);
      
      setError(errorMsg);
      setProgress({
        stage: 'error',
        progress: 0,
        message: errorMsg,
      });
      
      throw err;
    } finally {
      setIsEnhancing(false);
      currentRequestIdRef.current = null;
    }
  }, [isModelLoaded, isEnhancing]);

  // ============================================================================
  // Cancellation
  // ============================================================================

  /**
   * Cancel ongoing enhancement
   */
  const cancelEnhancement = useCallback(() => {
    if (!isEnhancing || !workerRef.current) {
      return;
    }

    console.log('[EnhancerContext] Cancelling enhancement...');

    workerRef.current.sendRequest('cancel', {}, { timeoutMs: 5000 })
      .catch(err => console.warn('[EnhancerContext] Cancel request failed:', err));

    setIsEnhancing(false);
    setProgress({
      stage: 'cancelled',
      progress: 0,
      message: 'Enhancement cancelled',
    });
  }, [isEnhancing]);

  // ============================================================================
  // Reset & Cleanup
  // ============================================================================

  /**
   * Full reset - unload model and clear all state
   */
  const reset = useCallback(() => {
    console.log('[EnhancerContext] Resetting...');

    // Cancel any ongoing operation
    if (isEnhancing) {
      cancelEnhancement();
    }

    // Reset worker
    if (workerRef.current) {
      workerRef.current.sendRequest('reset', {}, { timeoutMs: 5000 })
        .catch(err => console.warn('[EnhancerContext] Reset request failed:', err));
    }

    // Reset all state
    setIsModelLoaded(false);
    setIsModelLoading(false);
    setModelLoadProgress(0);
    setCurrentModelId(null);
    setIsEnhancing(false);
    setProgress(null);
    setError(null);
    setLastResult(null);
  }, [isEnhancing, cancelEnhancement]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear last result
   */
  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: EnhancerContextType = {
    // Hardware
    capabilities,
    isCheckingHardware,
    hardwareError,
    
    // Model state
    isModelLoaded,
    isModelLoading,
    modelLoadProgress,
    currentModelId,
    
    // Enhancement state
    isEnhancing,
    progress,
    error,
    
    // Results
    lastResult,
    
    // Actions
    loadModel,
    enhance,
    cancelEnhancement,
    reset,
    clearError,
    clearResult,
  };

  return (
    <EnhancerContext.Provider value={value}>
      {children}
    </EnhancerContext.Provider>
  );
}

