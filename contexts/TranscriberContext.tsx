"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

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
  transcribe: (audioBlob: Blob) => Promise<void>;
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
 * Transcriber Provider
 * 
 * ✅ Lives at the APP LEVEL - never unmounts
 * ✅ Loads model ONCE on startup
 * ✅ Worker persists for the entire session
 * ✅ No more React Strict Mode issues!
 */
export function TranscriberProvider({ children }: { children: React.ReactNode }) {
  const workerRef = useRef<Worker | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  
  /**
   * Initialize the Web Worker ONCE
   */
  useEffect(() => {
    console.log('[TranscriberContext] 🚀 Initializing worker for the entire session...');
    
    // Create worker as ES module (type: 'module')
    const worker = new Worker('/transcription.worker.js', { type: 'module' });
    workerRef.current = worker;

    // Set up message handler
    worker.onmessage = (event) => {
      const { status, message, progress: prog, result: res } = event.data;

      console.log('[TranscriberContext] Worker message:', status, message);

      switch (status) {
        case 'loading':
          setIsModelLoading(true);
          setLoadingMessage(message || 'Loading model...');
          setProgress(prog || 0);
          break;

        case 'ready':
          setIsModelLoading(false);
          setIsModelLoaded(true);
          setLoadingMessage('Model ready');
          setProgress(100);
          // Extract model name from the message if available
          if (message && message.includes('Model:')) {
            const modelMatch = message.match(/Model: ([\w\/-]+)/);
            if (modelMatch) {
              setCurrentModel(modelMatch[1]);
            }
          }
          console.log('[TranscriberContext] ✅ Model is ready');
          break;

        case 'transcribing':
          setIsTranscribing(true);
          setLoadingMessage(message || 'Transcribing...');
          setProgress(prog || 0);
          break;

        case 'complete':
          // Don't set isTranscribing(false) here - keep it true so UI can show completion state
          // It will be reset when clearResult() is called or new transcription starts
          setProgress(100);
          setResult(res);
          setLoadingMessage('Complete');
          console.log('[TranscriberContext] ✅ Transcription complete - result set');
          break;

        case 'error':
          setIsModelLoading(false);
          setIsTranscribing(false);
          setError(message || 'Unknown error');
          console.error('[TranscriberContext] ❌ Error:', message);
          break;

        default:
          console.warn('[TranscriberContext] Unknown status:', status);
      }
    };

    worker.onerror = (err) => {
      console.error('[TranscriberContext] ❌ Worker error:', err);
      setError('Worker crashed: ' + err.message);
      setIsModelLoading(false);
      setIsTranscribing(false);
    };

    console.log('[TranscriberContext] ✅ Worker initialized successfully');

    // Auto-load default model after worker is ready
    setTimeout(() => {
      const defaultModel = 'Xenova/whisper-base';
      console.log('[TranscriberContext] 🚀 Auto-loading default Whisper model:', defaultModel);
      setIsModelLoading(true);
      setLoadingMessage('Initializing model...');
      setProgress(0);
      worker.postMessage({
        type: 'load',
        data: { model: defaultModel },
      });
    }, 100); // Small delay to let worker settle

    // Cleanup on unmount
    return () => {
      console.log('[TranscriberContext] 🧹 Cleaning up worker (React Strict Mode or unmount)');
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'terminate' });
        workerRef.current.terminate();
        workerRef.current = null; // Clear the ref
      }
    };
  }, []); // Empty dependencies - recreates on each mount (Strict Mode = 2x, production = 1x)

  /**
   * Load the AI model
   */
  const loadModel = useCallback(async (modelName = 'Xenova/whisper-base'): Promise<void> => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    // Allow reloading if switching models
    if (isModelLoaded && currentModel === modelName) {
      console.log('[TranscriberContext] Same model already loaded, skipping');
      return Promise.resolve();
    }

    if (isModelLoading) {
      console.log('[TranscriberContext] Model already loading, skipping duplicate call');
      return Promise.resolve();
    }

    console.log('[TranscriberContext] 📥 Loading model:', modelName);
    
    // Mark current model as being switched
    if (currentModel && currentModel !== modelName) {
      console.log('[TranscriberContext] 🔄 Switching from', currentModel, 'to', modelName);
      setIsModelLoaded(false); // Reset loaded state when switching
    }
    
    setCurrentModel(modelName);
    
    setIsModelLoading(true);
    setLoadingMessage('Initializing model...');
    setProgress(0);
    setError(null);
    setResult(null);
    
    // Create a promise that resolves when the model is loaded
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        const { status, message } = event.data;
        
        if (status === 'ready') {
          workerRef.current?.removeEventListener('message', handleMessage);
          console.log('[TranscriberContext] ✅ Model loaded successfully!');
          resolve();
        } else if (status === 'error') {
          workerRef.current?.removeEventListener('message', handleMessage);
          setIsModelLoading(false);
          console.error('[TranscriberContext] ❌ Model loading failed:', message);
          reject(new Error(message || 'Failed to load model'));
        }
      };
      
      workerRef.current?.addEventListener('message', handleMessage);
      
      // Send load message
      workerRef.current?.postMessage({
        type: 'load',
        data: { model: modelName },
      });
      
      // Set a timeout in case the worker never responds
      setTimeout(() => {
        workerRef.current?.removeEventListener('message', handleMessage);
        setIsModelLoading(false);
        reject(new Error('Model loading timed out after 60 seconds'));
      }, 60000);
    });
  }, [isModelLoaded, isModelLoading, currentModel]);

  /**
   * Transcribe audio
   */
  const transcribe = useCallback((audioBlob: Blob): Promise<void> => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
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
    
    setError(null);
    setResult(null);
    setProgress(0);

    // Create a promise that resolves when transcription completes
    return new Promise(async (resolve, reject) => {
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
        console.log('   • Range:', `[${audioSamples[0].toFixed(4)} ... ${audioSamples[audioSamples.length-1].toFixed(4)}]`);
        
        // Set up one-time listener for completion
        const handleComplete = (event: MessageEvent) => {
          const { status, message: errorMsg } = event.data;
          
          if (status === 'complete') {
            workerRef.current?.removeEventListener('message', handleComplete);
            clearTimeout(timeout);
            console.log('\n' + '='.repeat(80));
            console.log('✅ TRANSCRIPTION COMPLETED SUCCESSFULLY');
            console.log('='.repeat(80) + '\n');
            audioContext.close(); // Clean up
            
            // DON'T reset states here - let them persist so UI can show "complete" state
            // States will be reset when starting a new transcription or during clearResult()
            console.log('[TranscriberContext] ✅ Transcription complete - keeping states for UI');
            
            resolve();
          } else if (status === 'error') {
            workerRef.current?.removeEventListener('message', handleComplete);
            clearTimeout(timeout);
            console.log('\n' + '='.repeat(80));
            console.log('❌ TRANSCRIPTION FAILED');
            console.log('='.repeat(80));
            console.error('Error:', errorMsg);
            console.log('');
            audioContext.close(); // Clean up
            
            // Keep error state visible - will be reset on clearResult() or new transcription
            console.log('[TranscriberContext] ❌ Transcription error - keeping states for error UI');
            
            reject(new Error(errorMsg || 'Transcription failed'));
          }
        };
        
        // Set up timeout (dynamic based on audio length)
        const audioDuration = audioSamples.length / 16000; // seconds
        const timeoutMs = Math.max(
          600000, // Minimum 10 minutes
          (audioDuration * 3000) + 120000 // 3x duration + 2 minutes
        );
        const timeoutMinutes = Math.ceil(timeoutMs / 60000);
        
        console.log('⏱️  Timeout Configuration:');
        console.log('   • Audio Duration:', audioDuration.toFixed(1), 'seconds');
        console.log('   • Timeout Set:', timeoutMinutes, 'minutes');
        console.log('');
        
        const timeout = setTimeout(() => {
          workerRef.current?.removeEventListener('message', handleComplete);
          audioContext.close(); // Clean up
          
          // Keep timeout error visible - will be reset on clearResult() or new transcription
          console.log('[TranscriberContext] ⏱️ Transcription timeout - keeping states for error UI');
          
          console.error('❌ Transcription timed out after', timeoutMinutes, 'minutes');
          reject(new Error(`Transcription timed out after ${timeoutMinutes} minutes`));
        }, timeoutMs);
        
        workerRef.current?.addEventListener('message', handleComplete);
        
        // Send Float32Array directly to worker
        console.log('\n🚀 STEP 2: Sending to AI Worker');
        console.log('-'.repeat(80));
        console.log('📤 Transferring audio data to worker...');
        console.log('   • Using transferable objects (zero-copy)');
        console.log('   • Worker will receive ownership of the buffer');
        
        const transferStartTime = performance.now();
        workerRef.current?.postMessage({
          type: 'transcribe',
          data: { audio: audioSamples }, // Send Float32Array directly
        }, [audioSamples.buffer]); // Transfer ownership for performance
        
        console.log('✓ Data transferred in', (performance.now() - transferStartTime).toFixed(0), 'ms');
        console.log('⏳ Waiting for worker to process...\n');
        
      } catch (error: any) {
        console.error('[TranscriberContext] ❌ Audio decoding error:', error);
        
        // Reset transcription states after decoding error
        console.log('[TranscriberContext] 🧹 Resetting transcription states after decoding error...');
        setIsTranscribing(false);
        setProgress(0);
        setLoadingMessage('');
        
        reject(new Error(`Audio decoding failed: ${error.message}`));
      }
    });
  }, [isModelLoaded, isTranscribing]);

  /**
   * Clear result and reset transcription state
   */
  const clearResult = useCallback(() => {
    console.log('[TranscriberContext] Clearing result and resetting transcription state...');
    setResult(null);
    setError(null);
    setProgress(0);
    setIsTranscribing(false);
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

