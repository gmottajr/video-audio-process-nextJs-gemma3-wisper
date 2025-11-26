"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { WorkerManager } from "@/lib/WorkerManager";
import { withRetry, MODEL_LOAD_RETRY, isCacheError } from "@/lib/retry";

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
  // State
  isModelLoading: boolean;
  isModelLoaded: boolean;
  isTranscribing: boolean;
  progress: number;
  loadingMessage: string;
  result: TranscriptionResult | null;
  error: string | null;
  currentModel: string | null; // Currently loaded model ID

  // Actions
  loadModel: (modelName?: string) => Promise<void>;
  transcribe: (audioBlob: Blob) => Promise<TranscriptionResult>;
  clearResult: () => void;
}

/**
 * Create Context
 */
const TranscriberContext = createContext<TranscriberContextType | null>(null);

/**
 * Hook to use the Transcriber Context
 */
export function useTranscriberContext() {
  const context = useContext(TranscriberContext);
  if (!context) {
    throw new Error("useTranscriberContext must be used within TranscriberProvider");
  }
  return context;
}

/**
 * Transcriber Provider (Refactored with WorkerManager)
 * 
 * ✅ Uses WorkerManager for proper request/response handling
 * ✅ Eliminates race conditions
 * ✅ Proper cleanup and error handling
 * ✅ Retry logic with exponential backoff
 */
export function TranscriberProvider({ children }: { children: React.ReactNode }) {
  const workerManagerRef = useRef<WorkerManager | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  
  /**
   * Initialize WorkerManager ONCE on mount
   */
  useEffect(() => {
    console.log('[TranscriberContext] 🚀 Initializing WorkerManager...');
    
    try {
      workerManagerRef.current = new WorkerManager('/transcription.worker.js');
      console.log('[TranscriberContext] ✅ WorkerManager initialized');
      
      // Auto-load default model
      const autoLoad = async () => {
        try {
          const defaultModel = 'Xenova/whisper-base';
          console.log('[TranscriberContext] 📥 Auto-loading default model:', defaultModel);
          setCurrentModel(defaultModel);
          setIsModelLoading(true);
          setLoadingMessage('Loading AI model...');
          
          await workerManagerRef.current!.sendRequest('load', { model: defaultModel }, {
            timeoutMs: 300000, // 5 minutes
            onProgress: (prog, msg) => {
              setProgress(prog);
              setLoadingMessage(msg || 'Loading model...');
            }
          });
          
          setIsModelLoaded(true);
          setIsModelLoading(false);
          setProgress(100);
          console.log('[TranscriberContext] ✅ Default model loaded');
        } catch (error) {
          console.error('[TranscriberContext] ❌ Auto-load failed:', error);
          setIsModelLoading(false);
          setError(error instanceof Error ? error.message : 'Failed to load model');
        }
      };
      
      // Small delay to let worker initialize
      setTimeout(autoLoad, 100);
    } catch (error) {
      console.error('[TranscriberContext] ❌ Failed to initialize WorkerManager:', error);
      setError('Failed to initialize transcription worker');
    }

    // Cleanup on unmount
    return () => {
      console.log('[TranscriberContext] 🧹 Cleaning up WorkerManager');
      workerManagerRef.current?.dispose();
      workerManagerRef.current = null;
    };
  }, []); // Empty deps - only run once

  /**
   * Load a Whisper model with retry logic
   */
  const loadModel = useCallback(async (modelName = 'Xenova/whisper-base'): Promise<void> => {
    if (!workerManagerRef.current) {
      throw new Error('WorkerManager not initialized');
    }

    // Skip if already loaded
    if (isModelLoaded && currentModel === modelName) {
      console.log('[TranscriberContext] ℹ️ Model already loaded:', modelName);
      return;
    }

    console.log('\n🔵 ====== TRANSCRIBER CONTEXT: LOAD MODEL ======');
    console.log('[TranscriberContext] 📥 Model requested:', modelName);
    console.log('[TranscriberContext] Current model:', currentModel || 'none');
    
    // Mark model change
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
      // Use retry logic for model loading
      await withRetry(
        async () => {
          await workerManagerRef.current!.sendRequest('load', { model: modelName }, {
            timeoutMs: 300000, // 5 minutes
            onProgress: (prog, msg) => {
              setProgress(prog);
              setLoadingMessage(msg || 'Loading model...');
            }
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
              setError(
                `Model loading failed (attempt ${attempt}/3). ` +
                `If this persists, try clearing your browser cache.`
              );
            } else {
              setError(`Retrying... (attempt ${attempt}/3)`);
            }
          }
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
  }, [isModelLoaded, currentModel]);

  /**
   * Transcribe audio with proper cleanup
   */
  const transcribe = useCallback(async (audioBlob: Blob): Promise<TranscriptionResult> => {
    if (!workerManagerRef.current) {
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
      // 🔥 DECODE AUDIO IN MAIN THREAD (AudioContext not available in workers!)
      console.log('\n📡 STEP 1: Audio Decoding (Main Thread)');
      console.log('-'.repeat(80));
      const decodeStartTime = performance.now();
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      console.log('✓ WAV file loaded:', (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB');
      
      // Create AudioContext in main thread
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      console.log('✓ AudioContext created (16kHz)');
      
      // Decode the WAV file to AudioBuffer
      console.log('⏳ Decoding WAV to AudioBuffer...');
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const decodeTime = performance.now() - decodeStartTime;
      
      console.log('✅ Audio Decoded Successfully!');
      console.log('   • Channels:', audioBuffer.numberOfChannels, '(mono)');
      console.log('   • Sample Rate:', audioBuffer.sampleRate, 'Hz');
      console.log('   • Duration:', audioBuffer.duration.toFixed(2), 'seconds');
      console.log('   • Decode Time:', decodeTime.toFixed(0), 'ms');
      
      // Extract mono channel as Float32Array
      const audioSamples = audioBuffer.getChannelData(0);
      console.log('\n📦 Audio Data Prepared:');
      console.log('   • Type:', audioSamples.constructor.name);
      console.log('   • Samples:', audioSamples.length.toLocaleString());
      console.log('   • Size:', (audioSamples.length * 4 / 1024 / 1024).toFixed(2), 'MB');
      
      setLoadingMessage('Transcribing...');
      
      // Send to worker using WorkerManager
      console.log('\n🚀 STEP 2: Sending to AI Worker');
      console.log('-'.repeat(80));
      
      const transcriptionResult = await workerManagerRef.current.sendRequest<TranscriptionResult>(
        'transcribe',
        { audio: audioSamples },
        {
          timeoutMs: Math.max(600000, audioBuffer.duration * 3000 + 120000), // Dynamic timeout
          onProgress: (prog, msg) => {
            setProgress(prog);
            setLoadingMessage(msg || 'Transcribing...');
          }
        }
      );
      
      // Close audio context
      audioContext.close();
      
      // Set result
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
  }, [isModelLoaded, isTranscribing]);

  /**
   * Clear result and reset transcription state
   */
  const clearResult = useCallback(() => {
    console.log('[TranscriberContext] Clearing result...');
    setResult(null);
    setError(null);
    setProgress(0);
    setLoadingMessage('');
  }, []);

  const value: TranscriberContextType = {
    // State
    isModelLoading,
    isModelLoaded,
    isTranscribing,
    progress,
    loadingMessage,
    result,
    error,
    currentModel,

    // Actions
    loadModel,
    transcribe,
    clearResult,
  };

  return (
    <TranscriberContext.Provider value={value}>
      {children}
    </TranscriberContext.Provider>
  );
}
