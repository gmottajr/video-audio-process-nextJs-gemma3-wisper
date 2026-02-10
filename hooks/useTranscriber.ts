"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Transcription Result
 */
export interface TranscriptionResult {
  text: string;
  chunks?: Array<{
    text: string;
    timestamp: [number, number | null];
  }>;
  processingTime?: number; // Actual AI inference time in milliseconds
}

/**
 * Transcription Hook
 * 
 * Manages the Web Worker for AI transcription using Whisper.
 * Follows Single Responsibility Principle - only handles transcription logic.
 */
export function useTranscriber() {
  const workerRef = useRef<Worker | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize the Web Worker
   */
  useEffect(() => {
    console.log('[useTranscriber] Initializing worker...');
    
    // 🔥 CRITICAL: Reset states when worker is (re)created
    // This is especially important for React Strict Mode
    setIsModelLoaded(false);
    setIsModelLoading(false);
    setIsTranscribing(false);
    setProgress(0);
    setError(null);
    
    // Create worker as ES module (type: 'module')
    // Cache-bust to ensure latest worker code is loaded
    const workerUrl = `/transcription.worker.js?v=${Date.now()}`;
    const worker = new Worker(workerUrl, { type: 'module' });
    workerRef.current = worker;

    // Set up message handler
    worker.onmessage = (event) => {
      const { status, message, progress: prog, result: res } = event.data;

      console.log('[useTranscriber] Worker message:', status, message);

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
          console.log('[useTranscriber] Model is ready');
          break;

        case 'transcribing':
          setIsTranscribing(true);
          setLoadingMessage(message || 'Transcribing...');
          setProgress(prog || 0);
          break;

        case 'complete':
          setIsTranscribing(false);
          setProgress(100);
          setResult(res);
          setLoadingMessage('Complete');
          console.log('[useTranscriber] Transcription complete');
          break;

        case 'error':
          setIsModelLoading(false);
          setIsTranscribing(false);
          setError(message || 'Unknown error');
          console.error('[useTranscriber] Error:', message);
          break;

        default:
          console.warn('[useTranscriber] Unknown status:', status);
      }
    };

    worker.onerror = (err) => {
      console.error('[useTranscriber] Worker error:', err);
      setError('Worker crashed: ' + err.message);
      setIsModelLoading(false);
      setIsTranscribing(false);
    };

    console.log('[useTranscriber] Worker initialized');

    // Cleanup
    return () => {
      console.log('[useTranscriber] Terminating worker');
      worker.postMessage({ type: 'terminate' });
      worker.terminate();
    };
  }, []);

  /**
   * Load the AI model
   */
  const loadModel = useCallback(async (modelName = 'Xenova/whisper-tiny'): Promise<void> => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    // Check current loading state without adding to dependencies
    if (isModelLoaded) {
      console.log('[useTranscriber] Model already loaded, skipping');
      return Promise.resolve();
    }

    if (isModelLoading) {
      console.log('[useTranscriber] Model already loading, skipping duplicate call');
      return Promise.resolve();
    }

    console.log('[useTranscriber] Loading model:', modelName);
    
    // 🔥 CRITICAL: Set loading state IMMEDIATELY before sending message
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
          resolve();
        } else if (status === 'error') {
          workerRef.current?.removeEventListener('message', handleMessage);
          setIsModelLoading(false);
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
  }, []); // Empty dependencies - function is stable

  /**
   * Transcribe audio
   * Returns a Promise that resolves when transcription is complete
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
            reject(new Error(errorMsg || 'Transcription failed'));
          }
        };
        
        // Set up timeout (dynamic based on audio length)
        // Whisper Tiny processes ~1-2 seconds of audio per second
        // For safety, we use 3x the audio duration + 2 minutes base
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
          setIsTranscribing(false); // Reset state
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
        console.error('[useTranscriber] ❌ Audio decoding error:', error);
        reject(new Error(`Audio decoding failed: ${error.message}`));
      }
    });
  }, [isModelLoaded, isTranscribing]);

  /**
   * Clear result
   */
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    // State
    isModelLoading,
    isModelLoaded,
    isTranscribing,
    progress,
    loadingMessage,
    result,
    error,

    // Actions
    loadModel,
    transcribe,
    clearResult,
  };
}

