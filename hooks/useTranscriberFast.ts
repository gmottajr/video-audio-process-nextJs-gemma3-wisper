/**
 * useTranscriberFast
 * 
 * React hook orchestrating the Fast Mode parallel transcription pipeline.
 * Manages state machine, progress reporting, and cancellation.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FastModeProgress, FastModeTranscriptionResult, DevicePreference } from '@/types/fast-mode';
import { ChunkManagerServiceFast } from '@/services/fast-mode/ChunkManagerServiceFast';
import { WorkerPoolManagerFast } from '@/services/fast-mode/WorkerPoolManagerFast';
import { ParallelChunkProcessorFast } from '@/services/fast-mode/ParallelChunkProcessorFast';
import { TimestampMergerFast } from '@/services/fast-mode/TimestampMergerFast';
import { ParallelRuntime } from '@/utils/ParallelRuntime';
import { isFeatureEnabled } from '@/lib/featureFlags';

export interface UseTranscriberFastConfig {
  /** Number of parallel workers (default: auto-detect) */
  maxWorkers?: number;
  /** Memory budget in MB (default: auto-calculate) */
  memoryBudgetMB?: number;
  /** Model ID to use for transcription (default: distil-whisper/distil-small.en) */
  modelId?: string;
  /** Device preference for inference (default: 'auto') */
  devicePreference?: DevicePreference;
}

export interface UseTranscriberFastReturn {
  /** Current state */
  mode: FastModeProgress['phase'];
  /** Progress information */
  progress: FastModeProgress;
  /** Transcription result */
  result: FastModeTranscriptionResult | null;
  /** Error message if any */
  error: string | null;
  /** Start transcription - returns the result directly for immediate use */
  transcribe: (audioData: Float32Array, duration: number) => Promise<FastModeTranscriptionResult | null>;
  /** Cancel transcription */
  cancel: () => void;
  /** Reset state */
  reset: () => void;
  /** Update worker configuration */
  updateConfig: (config: UseTranscriberFastConfig) => void;
}

export function useTranscriberFast(initialConfig?: UseTranscriberFastConfig): UseTranscriberFastReturn {
  const [mode, setMode] = useState<FastModeProgress['phase']>('idle');
  const [progress, setProgress] = useState<FastModeProgress>({
    phase: 'idle',
    percent: 0,
    chunksCompleted: 0,
    chunksTotal: 0,
    workersActive: 0,
  });
  const [result, setResult] = useState<FastModeTranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<UseTranscriberFastConfig>(initialConfig || {});

  const chunkManagerRef = useRef<ChunkManagerServiceFast | null>(null);
  const workerPoolRef = useRef<WorkerPoolManagerFast | null>(null);
  const processorRef = useRef<ParallelChunkProcessorFast | null>(null);
  const mergerRef = useRef<TimestampMergerFast | null>(null);
  const runtimeRef = useRef<ParallelRuntime | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  /**
   * Initialize services
   */
  const initializeServices = useCallback(async () => {
    if (!isFeatureEnabled('ENABLE_FAST_MODE')) {
      throw new Error('Fast Mode is not enabled');
    }

    // BEND-like: Runtime auto-detects optimal parallelism
    if (!runtimeRef.current) {
      runtimeRef.current = new ParallelRuntime({
        maxWorkers: config.maxWorkers,
        memoryBudgetMB: config.memoryBudgetMB,
      });
      await runtimeRef.current.initialize();
    }

    const runtime = runtimeRef.current;
    const optimalWorkers = runtime.getOptimalWorkerCount();
    const memoryBudget = runtime.getMemoryBudgetMB();

    console.log(
      `[useTranscriberFast] Auto-detected: ${optimalWorkers} workers, ${memoryBudget}MB budget`
    );

    // Create services with auto-detected configuration
    chunkManagerRef.current = new ChunkManagerServiceFast();

    // Progress callback for model loading
    const handleModelProgress = (progressData: any) => {
      console.log('[useTranscriberFast] Model loading progress:', progressData);

      setProgress((prev) => ({
        ...prev,
        phase: 'initializing',
        percent: Math.round(progressData.progress || 0),
      }));
    };

    workerPoolRef.current = new WorkerPoolManagerFast(
      {
        maxWorkers: optimalWorkers,
        memoryThresholdMB: memoryBudget,
      },
      handleModelProgress
    );

    // Set the model ID before initialization
    const modelId = config.modelId || 'distil-whisper/distil-small.en';
    workerPoolRef.current.setModelId(modelId);

    // Set the device preference before initialization
    const devicePreference = config.devicePreference || 'auto';
    workerPoolRef.current.setDevicePreference(devicePreference);

    console.log(`[useTranscriberFast] Device preference: ${devicePreference}`);

    processorRef.current = new ParallelChunkProcessorFast(workerPoolRef.current);
    mergerRef.current = new TimestampMergerFast();

    // Initialize worker pool (this loads models)
    console.log(`[useTranscriberFast] Initializing worker pool with model: ${modelId}...`);
    setMode('initializing');
    setProgress({
      phase: 'initializing',
      percent: 0,
      chunksCompleted: 0,
      chunksTotal: 0,
      workersActive: 0,
    });
    
    await workerPoolRef.current.initialize();
    
    console.log('[useTranscriberFast] Worker pool initialized');
    setProgress({
      phase: 'initializing',
      percent: 100,
      chunksCompleted: 0,
      chunksTotal: 0,
      workersActive: 0,
    });
  }, [config]);

  /**
   * Cleanup services
   */
  const cleanupServices = useCallback(async () => {
    if (workerPoolRef.current) {
      await workerPoolRef.current.terminate();
      workerPoolRef.current = null;
    }
    chunkManagerRef.current = null;
    processorRef.current = null;
    mergerRef.current = null;
    runtimeRef.current = null;
  }, []);

  /**
   * Start transcription
   * Returns the result directly for immediate use (since React state updates are async)
   */
  const transcribe = useCallback(async (audioData: Float32Array, duration: number): Promise<FastModeTranscriptionResult | null> => {
    try {
      isCancelledRef.current = false;
      setError(null);
      setResult(null);
      setMode('initializing');

      // Initialize services if needed
      if (!chunkManagerRef.current || !workerPoolRef.current) {
        await initializeServices();
      }

      if (isCancelledRef.current) {
        return null;
      }

      const chunkManager = chunkManagerRef.current!;
      const workerPool = workerPoolRef.current!;
      const processor = processorRef.current!;
      const merger = mergerRef.current!;

      // Set up progress callback
      processor.onProgress((progressUpdate) => {
        if (!isCancelledRef.current) {
          setProgress(progressUpdate);
          setMode(progressUpdate.phase);
        }
      });

      // Create chunks
      console.log('[useTranscriberFast] Creating audio chunks...');
      const chunks = chunkManager.createChunks(audioData);
      const chunksTotal = chunks.length;
      console.log(`[useTranscriberFast] Created ${chunksTotal} chunks`);

      // Transition to processing phase
      console.log('[useTranscriberFast] ⚡ Transitioning to PROCESSING mode');
      setMode('processing');
      setProgress({
        phase: 'processing',
        percent: 0,
        chunksCompleted: 0,
        chunksTotal,
        workersActive: workerPool.getStatus().busy,
      });
      console.log('[useTranscriberFast] ✅ Mode set to PROCESSING, UI should update now');

      if (isCancelledRef.current) {
        return null;
      }

      // Process chunks in parallel
      console.log('[useTranscriberFast] Starting parallel chunk processing...');
      const startTime = Date.now();
      const chunkResults = await processor.processChunks(chunks);
      const processingTime = Date.now() - startTime;
      
      // Log completion stats
      const successCount = chunkResults.length;
      const failedCount = chunksTotal - successCount;
      if (failedCount > 0) {
        console.warn(`[useTranscriberFast] ${successCount}/${chunksTotal} chunks completed (${failedCount} failed)`);
      } else {
        console.log(`[useTranscriberFast] All ${chunksTotal} chunks processed in ${processingTime}ms`);
      }

      if (isCancelledRef.current) {
        return null;
      }

      // Merge results (handles partial results gracefully)
      setMode('merging');
      setProgress({
        phase: 'merging',
        percent: 95,
        chunksCompleted: successCount,
        chunksTotal,
        workersActive: 0,
      });

      const finalResult = merger.mergeResults(
        chunkResults,
        duration,
        processingTime,
        workerPool.getStatus().total
      );
      
      // Add info about failed chunks if any
      if (failedCount > 0) {
        console.warn(`[useTranscriberFast] Final result has ${failedCount} missing chunks - transcript may have gaps`);
      }

      if (isCancelledRef.current) {
        return null;
      }

      // Complete
      setMode('complete');
      setProgress({
        phase: 'complete',
        percent: 100,
        chunksCompleted: chunksTotal,
        chunksTotal,
        workersActive: 0,
      });
      setResult(finalResult);
      
      // Return the result directly for immediate use by caller
      return finalResult;
    } catch (err) {
      if (isCancelledRef.current) {
        return null;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setMode('error');
      setProgress({
        phase: 'error',
        percent: 0,
        chunksCompleted: 0,
        chunksTotal: 0,
        workersActive: 0,
      });
      return null;
    }
  }, [initializeServices]);

  /**
   * Cancel transcription
   */
  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    if (processorRef.current) {
      processorRef.current.cancel();
    }
    setMode('error');
    setError('Transcription cancelled');
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    isCancelledRef.current = false;
    setMode('idle');
    setProgress({
      phase: 'idle',
      percent: 0,
      chunksCompleted: 0,
      chunksTotal: 0,
      workersActive: 0,
    });
    setResult(null);
    setError(null);
  }, []);

  /**
   * Update worker configuration
   * Note: Requires re-initialization if workers are already running
   */
  const updateConfig = useCallback((newConfig: UseTranscriberFastConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    
    // If services are already initialized, need to cleanup and reinit
    if (workerPoolRef.current) {
      console.log('[useTranscriberFast] Config changed - will reinitialize on next transcription');
      cleanupServices();
    }
  }, [cleanupServices]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cleanupServices();
    };
  }, [cleanupServices]);

  return {
    mode,
    progress,
    result,
    error,
    transcribe,
    cancel,
    reset,
    updateConfig,
  };
}
