"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { withRetry, MODEL_LOAD_RETRY, isCacheError } from "@/lib/retry";
import { useTranscriberWorker } from "./useTranscriberWorker";
import { decodeToMono16k } from "@/lib/audio/decodeToMono16k";

/**
 * Transcription Result
 */
export interface TranscriptionResult {
  text: string;
  chunks?: Array<{
    text: string;
    timestamp: [number, number | null];
  }>;
}

/**
 * Transcriber Context Interface
 */
interface TranscriberContextType {
  isModelLoading: boolean;
  isModelLoaded: boolean;
  isTranscribing: boolean;
  progress: number;
  loadingMessage: string;
  result: TranscriptionResult | null;
  error: string | null;
  currentModel: string | null;

  loadModel: (modelName?: string) => Promise<void>;
  transcribe: (audioBlob: Blob) => Promise<TranscriptionResult>;
  clearResult: () => void;
  retryWorker: () => void;
}

const TranscriberContext = createContext<TranscriberContextType | null>(null);

export function useTranscriberContext() {
  const context = useContext(TranscriberContext);
  if (!context) {
    throw new Error("useTranscriberContext must be used within TranscriberProvider");
  }
  return context;
}

/**
 * TranscriberProvider
 *
 * Owns React state (model loading, transcription progress, error).
 * Worker lifecycle is delegated to useTranscriberWorker (SRP).
 * Audio decoding is delegated to decodeToMono16k (SRP).
 */
export function TranscriberProvider({ children }: { children: React.ReactNode }) {
  const { managerRef, recreate } = useTranscriberWorker();

  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);

  const loadModel = useCallback(async (modelName = 'Xenova/whisper-base'): Promise<void> => {
    if (!managerRef.current) {
      throw new Error('WorkerManager not initialized');
    }

    if (isModelLoaded && currentModel === modelName) {
      console.log('[TranscriberContext] ℹ️ Model already loaded:', modelName);
      return;
    }

    if (isModelLoading && currentModel === modelName) {
      console.log('[TranscriberContext] ℹ️ Model already loading:', modelName);
      return;
    }

    // Surface a crashed worker immediately instead of hanging for 5 minutes.
    if (managerRef.current.isCrashed()) {
      const msg = 'Transcription worker failed to start. The worker script was blocked by a browser security policy (COEP/CORP). Click "Retry" below, or do a hard refresh (Ctrl+Shift+R).';
      console.error('[TranscriberContext] ❌', msg);
      setError(msg);
      setIsModelLoading(false);
      return;
    }

    console.log('\n🔵 ====== TRANSCRIBER CONTEXT: LOAD MODEL ======');
    console.log('[TranscriberContext] 📥 Model requested:', modelName);
    console.log('[TranscriberContext] Current model:', currentModel || 'none');

    if (currentModel && currentModel !== modelName) {
      console.log('[TranscriberContext] 🔄 SWITCHING MODELS');
      console.log('   └─ From:', currentModel);
      console.log('   └─ To:', modelName);
      setIsModelLoaded(false);
    }
    console.log('================================================\n');

    setCurrentModel(modelName);
    setIsModelLoading(true);
    setLoadingMessage('Initializing model...');
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      await withRetry(
        async () => {
          await managerRef.current!.sendRequest('load', { model: modelName }, {
            timeoutMs: 300000,
            onProgress: (prog, msg) => {
              setProgress(prog);
              setLoadingMessage(msg || 'Loading model...');
            },
          });
        },
        {
          ...MODEL_LOAD_RETRY,
          onRetry: (attempt, error, nextDelay) => {
            console.warn(
              `[TranscriberContext] ⚠️ Load attempt ${attempt} failed: ${error.message}. ` +
              `Retrying in ${nextDelay}ms...`
            );
            if (isCacheError(error)) {
              setError(`Model loading failed (attempt ${attempt}/3). If this persists, try clearing your browser cache.`);
            } else {
              setError(`Retrying... (attempt ${attempt}/3)`);
            }
          },
        }
      );

      setIsModelLoaded(true);
      setProgress(100);
      setLoadingMessage('Model ready');
      setError(null);

      console.log('\n✅ ====== MODEL LOAD SUCCESS ======');
      console.log('[TranscriberContext] Model:', modelName);
      console.log('===================================\n');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      console.error('\n❌ ====== MODEL LOAD ERROR ======');
      console.error('[TranscriberContext] Model:', modelName);
      console.error('[TranscriberContext] Error:', errorMsg);
      console.error('==================================\n');

      setIsModelLoading(false);
      setIsModelLoaded(false);
      setError(errorMsg);
      throw error;
    } finally {
      setIsModelLoading(false);
    }
  }, [isModelLoaded, currentModel, managerRef]);

  const transcribe = useCallback(async (audioBlob: Blob): Promise<TranscriptionResult> => {
    if (!managerRef.current) {
      throw new Error('WorkerManager not initialized');
    }

    if (!isModelLoaded) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    if (isTranscribing) {
      throw new Error('Transcription already in progress');
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎙️  TRANSCRIPTION STARTED');
    console.log('='.repeat(80));
    console.log('📊 Audio Input:');
    console.log('   • Size:', (audioBlob.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('   • Type:', audioBlob.type || 'application/octet-stream');

    setIsTranscribing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setLoadingMessage('Preparing audio...');

    try {
      console.log('\n📡 STEP 1: Audio Decoding (Main Thread)');
      console.log('-'.repeat(80));
      const decodeStartTime = performance.now();

      const audioSamples = await decodeToMono16k(audioBlob);
      const decodeTime = performance.now() - decodeStartTime;

      console.log('✅ Audio Decoded Successfully!');
      console.log('   • Samples:', audioSamples.length.toLocaleString());
      console.log('   • Decode Time:', decodeTime.toFixed(0), 'ms');

      setLoadingMessage('Transcribing...');

      console.log('\n🚀 STEP 2: Sending to AI Worker');
      console.log('-'.repeat(80));

      const durationSeconds = audioSamples.length / 16000;
      const transcriptionResult = await managerRef.current.sendRequest<TranscriptionResult>(
        'transcribe',
        { audio: audioSamples },
        {
          timeoutMs: Math.max(600000, durationSeconds * 3000 + 120000),
          onProgress: (prog, msg) => {
            setProgress(prog);
            setLoadingMessage(msg || 'Transcribing...');
          },
        }
      );

      setResult(transcriptionResult);
      setProgress(100);
      setLoadingMessage('Complete');

      console.log('\n' + '='.repeat(80));
      console.log('✅ TRANSCRIPTION COMPLETED SUCCESSFULLY');
      console.log('='.repeat(80) + '\n');

      return transcriptionResult;
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TranscriberContext] ❌ Transcription failed:', errorMsg);
      setError(errorMsg);
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  }, [isModelLoaded, isTranscribing, managerRef]);

  /**
   * Dispose the crashed worker and spin up a fresh instance, then reset all
   * model/loading state so loadModel() can be retried without a page reload.
   */
  const retryWorker = useCallback(() => {
    console.log('[TranscriberContext] 🔄 Retrying worker...');
    const initError = recreate();
    setError(initError);
    setIsModelLoaded(false);
    setIsModelLoading(false);
    setProgress(0);
    setLoadingMessage('');
  }, [recreate]);

  const clearResult = useCallback(() => {
    console.log('[TranscriberContext] Clearing result...');
    setResult(null);
    setError(null);
    setProgress(0);
    setLoadingMessage('');
  }, []);

  const value: TranscriberContextType = {
    isModelLoading,
    isModelLoaded,
    isTranscribing,
    progress,
    loadingMessage,
    result,
    error,
    currentModel,
    loadModel,
    transcribe,
    clearResult,
    retryWorker,
  };

  return (
    <TranscriberContext.Provider value={value}>
      {children}
    </TranscriberContext.Provider>
  );
}
