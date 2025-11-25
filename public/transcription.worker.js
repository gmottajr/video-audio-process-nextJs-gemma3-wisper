/**
 * Transcription Web Worker - ES Module Version
 * 
 * Runs Whisper model inference in a separate thread to avoid blocking the UI.
 * Uses locally hosted models for maximum stability and privacy.
 * 
 * NOTE: This is an ES Module worker (type="module")
 */

// Import Transformers.js using ES module syntax
import { pipeline, env } from '/transformers.min.js';

// CRITICAL CONFIGURATION FOR SELF-HOSTING
env.allowLocalModels = true;
env.allowRemoteModels = false; // Force offline mode - no external requests!
env.localModelPath = '/models/'; // Path to models folder (relative to public/)
env.useBrowserCache = true;

console.log('[Worker] Configured for self-hosted models');
console.log('[Worker] Model path:', env.localModelPath);

// State
let transcriber = null;
let isModelLoaded = false;

/**
 * Initialize the Whisper model from local files
 */
async function loadModel(modelName = 'Xenova/whisper-base') {
  try {
    console.log('[Worker] Loading Whisper model from local storage:', modelName);
    
    self.postMessage({
      status: 'loading',
      message: 'Loading AI model from local storage...',
      progress: 0,
    });

    // Create transcription pipeline
    // The library will now look for files in: /models/Xenova/whisper-tiny/
    transcriber = await pipeline('automatic-speech-recognition', modelName, {
      quantized: true, // Use quantized model
      progress_callback: (progress) => {
        // Report loading progress
        console.log('[Worker] Progress:', progress);
        
        if (progress.status === 'progress' && progress.total > 0) {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          self.postMessage({
            status: 'loading',
            message: `Loading model files... ${percentage}%`,
            progress: percentage,
          });
        } else if (progress.status === 'ready') {
          self.postMessage({
            status: 'loading',
            message: 'Model files loaded, initializing...',
            progress: 90,
          });
        }
      },
    });

    isModelLoaded = true;
    
    console.log('[Worker] Model loaded successfully from local storage');
    
    self.postMessage({
      status: 'ready',
      message: `AI model loaded and ready - Model: ${modelName}`,
    });

  } catch (error) {
    console.error('[Worker] Model loading failed:', error);
    self.postMessage({
      status: 'error',
      message: `Failed to load model: ${error.message}. Make sure you ran 'npm run setup-models'.`,
    });
  }
}

/**
 * Transcribe audio (expects Float32Array of audio samples)
 */
async function transcribe(audioData) {
  try {
    // 🔥 CRITICAL: Check BOTH flags to ensure model is actually ready
    if (!isModelLoaded || !transcriber) {
      console.error('\n❌ MODEL NOT READY FOR TRANSCRIPTION');
      console.error('-'.repeat(80));
      console.error('   • isModelLoaded:', isModelLoaded);
      console.error('   • transcriber:', transcriber ? 'exists' : 'null');
      console.error('-'.repeat(80) + '\n');
      throw new Error('Model not loaded. Please wait for model to finish loading before transcribing.');
    }

    const transcriptionStartTime = performance.now();
    
    console.log('🎯 Transcription Configuration:');
    console.log('   • Model:', 'Xenova/whisper-base');
    console.log('   • Chunk Length: 30 seconds');
    console.log('   • Stride (overlap): 5 seconds');
    
    // Verify we have Float32Array
    if (!(audioData instanceof Float32Array)) {
      throw new Error(`Expected Float32Array, got ${audioData.constructor.name}`);
    }
    
    if (audioData.length === 0) {
      throw new Error('Audio data is empty!');
    }
    
    self.postMessage({
      status: 'transcribing',
      message: 'Transcribing audio...',
      progress: 0,
    });

    console.log('\n⏳ Running AI Model...');
    console.log('   This may take a minute for long audio files...\n');
    
    // Calculate estimated time
    const audioDurationSeconds = audioData.length / 16000;
    const estimatedMinutes = Math.ceil(audioDurationSeconds / 30); // ~30 seconds audio per minute of processing
    console.log('⏱️  Estimated Processing Time:', estimatedMinutes, 'minutes');
    console.log('   (Based on ~1-2 seconds per audio second)\n');
    
    // Run inference with progress callback
    const inferenceStartTime = performance.now();
    
    // Track progress with simple time-based updates (callback data is unreliable)
    let lastProgressUpdate = performance.now(); // ✅ FIX: Use performance.now() consistently
    let progressCount = 0;
    
    const output = await transcriber(audioData, {
      chunk_length_s: 30, // Process in 30-second chunks
      stride_length_s: 5, // 5-second overlap between chunks
      return_timestamps: 'word', // Return word-level timestamps
      language: 'english', // Can be made dynamic
      // ✅ SAFE CALLBACK: Just track elapsed time, don't access chunk properties
      callback_function: (beams) => {
        const now = performance.now(); // ✅ FIX: Use performance.now() instead of Date.now()
        const elapsed = Math.floor((now - inferenceStartTime) / 1000);
        
        // Update every 10 seconds
        if (now - lastProgressUpdate >= 10000) {
          progressCount++;
          lastProgressUpdate = now;
          
          // Estimate progress based on time (very rough)
          const estimatedTotalTime = audioDurationSeconds * 2; // 2 seconds per audio second
          const estimatedProgress = Math.min(95, Math.round((elapsed / estimatedTotalTime) * 100));
          
          console.log(`   ⏳ Processing... ${elapsed}s elapsed (estimated ${estimatedProgress}%)`);
          
          self.postMessage({
            status: 'transcribing',
            message: `Processing... ${Math.floor(elapsed / 60)}min ${elapsed % 60}s elapsed`,
            progress: estimatedProgress,
          });
        }
      }
    });

    const inferenceTime = performance.now() - inferenceStartTime;
    const totalTime = performance.now() - transcriptionStartTime;
    
    console.log('✅ AI Processing Complete!');
    console.log('   • Inference Time:', (inferenceTime / 1000).toFixed(2), 'seconds');
    console.log('   • Total Time:', (totalTime / 1000).toFixed(2), 'seconds');
    
    console.log('\n📊 Transcription Results:');
    console.log('   • Text Length:', (output.text?.length || 0).toLocaleString(), 'characters');
    console.log('   • Word Chunks:', (output.chunks?.length || 0).toLocaleString());
    console.log('   • Words per Second:', ((output.chunks?.length || 0) / (inferenceTime / 1000)).toFixed(1));
    
    if (output.text && output.text.length > 0) {
      console.log('\n📝 Preview (first 150 characters):');
      console.log('   "' + output.text.substring(0, 150) + (output.text.length > 150 ? '...' : '') + '"');
    } else {
      console.warn('\n⚠️  Warning: Transcription returned empty text!');
    }
    
    self.postMessage({
      status: 'complete',
      message: 'Transcription complete',
      result: {
        text: output.text || '',
        chunks: output.chunks || [],
      },
    });

  } catch (error) {
    console.error('\n❌ TRANSCRIPTION ERROR');
    console.error('-'.repeat(80));
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('-'.repeat(80) + '\n');
    
    self.postMessage({
      status: 'error',
      message: `Transcription failed: ${error.message}`,
    });
  }
}

/**
 * Message handler
 */
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'load':
        await loadModel(data?.model || 'Xenova/whisper-base');
        break;

      case 'transcribe':
        // 🔥 CRITICAL: Verify model is loaded BEFORE processing audio
        if (!isModelLoaded || !transcriber) {
          console.error('\n❌ TRANSCRIPTION BLOCKED: Model Not Ready');
          console.error('-'.repeat(80));
          console.error('   • isModelLoaded:', isModelLoaded);
          console.error('   • transcriber:', transcriber ? 'exists' : 'null');
          console.error('   • Action: Rejecting transcription request');
          console.error('-'.repeat(80) + '\n');
          
          self.postMessage({
            status: 'error',
            message: 'Model is not loaded yet. Please wait for model loading to complete before transcribing.',
          });
          return;
        }
        
        console.log('📥 WORKER: Audio Data Received');
        console.log('-'.repeat(80));
        console.log('✓ Model Status: Ready');
        console.log('');
        
        // Audio is already decoded to Float32Array in main thread
        // (AudioContext not available in workers!)
        const audioSamples = data.audio;
        
        console.log('📋 Data Validation:');
        console.log('   • Type:', audioSamples?.constructor?.name || 'undefined');
        console.log('   • Length:', audioSamples?.length?.toLocaleString() || 'N/A');
        
        // Validate audio data
        if (!(audioSamples instanceof Float32Array)) {
          console.error('\n❌ VALIDATION FAILED');
          console.error('   Expected: Float32Array');
          console.error('   Received:', audioSamples?.constructor?.name || 'undefined');
          self.postMessage({
            status: 'error',
            message: `Invalid audio data type: ${audioSamples?.constructor?.name}. Expected Float32Array.`,
          });
          return;
        }
        
        if (audioSamples.length === 0) {
          console.error('\n❌ VALIDATION FAILED');
          console.error('   Audio samples array is empty');
          self.postMessage({
            status: 'error',
            message: 'Audio samples array is empty',
          });
          return;
        }
        
        const duration = (audioSamples.length / 16000).toFixed(2);
        console.log('   • Duration:', duration, 'seconds');
        console.log('   • Sample Range:', `[${audioSamples[0].toFixed(4)} ... ${audioSamples[audioSamples.length-1].toFixed(4)}]`);
        console.log('✓ Validation passed\n');
        
        // Transcribe the Float32Array
        console.log('🤖 STEP 3: AI Transcription');
        console.log('-'.repeat(80));
        await transcribe(audioSamples);
        break;

      case 'terminate':
        console.log('[Worker] Terminating...');
        self.close();
        break;

      default:
        console.warn('[Worker] Unknown message type:', type);
    }
  } catch (error) {
    console.error('[Worker] Error handling message:', error);
    self.postMessage({
      status: 'error',
      message: error.message,
    });
  }
});

console.log('[Worker] Self-hosted transcription worker initialized');
