/**
 * Transcription Web Worker - ES Module Version
 * 
 * Runs Whisper model inference in a separate thread to avoid blocking the UI.
 * Downloads models on-demand from Hugging Face when first selected.
 * 
 * NOTE: This is an ES Module worker (type="module")
 */

// Disable ONNX multi-thread proxy BEFORE transformers.min.js evaluates it.
// Firefox COEP (require-corp) blocks blob: URL workers; numThreads=1 tells
// ONNX not to create the threading sub-worker at module-init time.
self.ort = self.ort ?? {};
self.ort.env = self.ort.env ?? {};
self.ort.env.wasm = { numThreads: 1 };

// Dev-only diagnostic logging: gated on ?debug=1 in the worker URL.
// WorkerManager appends &debug=1 automatically in non-production builds.
// Interpretation on reload:
//   • No "module-top" log  → worker module itself failed to load/parse.
//   • "module-top" logs, import fails with a real error → import is the culprit.
//   • Import OK, later crash → re-open hypothesis space with the new logs.
const DEBUG = new URLSearchParams(self.location.search).has('debug');
const devLog = (msg, data) => {
  if (!DEBUG) return;
  console.log('[Worker]', msg, data ?? '');
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 'info', tag: 'Worker', message: msg, data }),
  }).catch(() => {});
};

devLog('module-top: worker module loaded, before transformers import');

// Dynamic import so the synchronous pre-config above executes first.
// The ?v=2 suffix creates a new module-cache key, bypassing any corrupted
// cache entry left behind by an earlier Strict-Mode-race termination.
// Bump this version whenever transformers.min.js is replaced.
let pipeline, env;
try {
  devLog('before transformers import');
  ({ pipeline, env } = await import('/transformers.min.js?v=2'));
  devLog('after transformers import — success');
} catch (err) {
  devLog('transformers import FAILED', { name: err.name, message: err.message, stack: err.stack });
  self.postMessage({ status: 'worker-init-error', message: `${err.name}: ${err.message}` });
  throw err; // Re-throw — worker cannot continue without transformers
}

// CONFIGURATION: On-demand model downloading
env.allowLocalModels = true;
env.allowRemoteModels = true;
env.localModelPath = '/models/';
env.useBrowserCache = true;
// Belt-and-suspenders: enforce single-thread via the transformers.js API as well.
if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads = 1;

devLog('after env config');

console.log('[Worker] Configured for on-demand model downloading');
console.log('[Worker] Local path:', env.localModelPath);
console.log('[Worker] Remote download enabled:', env.allowRemoteModels);

// State
let transcriber = null;
let isModelLoaded = false;
let currentModelName = null; // Track which model is currently loaded

/**
 * Initialize the Whisper model
 * Downloads from Hugging Face if not already cached locally
 */
async function loadModel(modelName = 'Xenova/whisper-base', requestId = null) {
  try {
    console.log('\n🔵 ====== MODEL LOADING START ======');
    console.log('[Worker] Model:', modelName);
    console.log('[Worker] Request ID:', requestId || 'none');
    console.log('[Worker] Timestamp:', new Date().toISOString());
    console.log('[Worker] Environment Config:');
    console.log('  - allowLocalModels:', env.allowLocalModels);
    console.log('  - allowRemoteModels:', env.allowRemoteModels);
    console.log('  - localModelPath:', env.localModelPath);
    console.log('  - useBrowserCache:', env.useBrowserCache);
    console.log('=====================================\n');
    
    self.postMessage({
      requestId,
      status: 'loading',
      message: 'Loading AI model from local storage...',
      progress: 0,
    });

    // Track files being loaded
    const filesTracking = new Map();

    // Create transcription pipeline
    // The library will now look for files in: /models/Xenova/whisper-tiny/
    transcriber = await pipeline('automatic-speech-recognition', modelName, {
      quantized: true, // Use quantized model
      progress_callback: (progress) => {
        // Enhanced logging with cache detection
        const { status, file, loaded, total } = progress;
        
        // Initialize tracking for this file
        if (file && !filesTracking.has(file)) {
          filesTracking.set(file, { 
            startTime: Date.now(),
            status: status,
            loaded: 0,
            total: total || 0
          });
        }
        
        // Update tracking
        if (file && filesTracking.has(file)) {
          const tracking = filesTracking.get(file);
          tracking.status = status;
          tracking.loaded = loaded || 0;
          tracking.total = total || 0;
        }

        // Detailed status-specific logging
        if (status === 'initiate') {
          console.log(`\n📂 [INITIATE] ${file || 'unknown'}`);
          console.log(`   └─ Starting to load file...`);
        } 
        else if (status === 'download') {
          console.log(`\n⬇️  [DOWNLOAD] ${file || 'unknown'}`);
          console.log(`   └─ Fetching from server (not in cache)`);
          console.log(`   └─ URL: /models/${modelName}/${file}`);
          
          // Check if progress provides response info
          if (progress.response) {
            console.log(`   └─ Response Status: ${progress.response.status || 'unknown'}`);
            console.log(`   └─ Content-Type: ${progress.response.headers?.get('content-type') || 'unknown'}`);
            console.log(`   └─ Content-Length: ${progress.response.headers?.get('content-length') || 'unknown'}`);
          }
        } 
        else if (status === 'progress') {
          const tracking = filesTracking.get(file);
          const elapsed = Date.now() - tracking.startTime;
          const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
          const sizeMB = (loaded / (1024 * 1024)).toFixed(2);
          const totalMB = (total / (1024 * 1024)).toFixed(2);
          const speed = elapsed > 0 ? ((loaded / 1024) / (elapsed / 1000)).toFixed(2) : '0';
          
          console.log(`📊 [PROGRESS] ${file || 'unknown'}: ${percentage}% (${sizeMB}/${totalMB} MB) @ ${speed} KB/s`);
          
          if (progress.status === 'progress' && total > 0) {
            self.postMessage({
              requestId,
              status: 'loading',
              message: `Loading ${file}... ${percentage}%`,
              progress: percentage,
            });
          }
        } 
        else if (status === 'done') {
          const tracking = filesTracking.get(file);
          const elapsed = Date.now() - tracking.startTime;
          const sizeMB = (tracking.loaded / (1024 * 1024)).toFixed(2);
          
          console.log(`\n✅ [DONE] ${file || 'unknown'}`);
          console.log(`   └─ Size: ${sizeMB} MB`);
          console.log(`   └─ Time: ${elapsed}ms`);
          console.log(`   └─ Source: ${elapsed < 100 ? '🚀 CACHE (fast load)' : '🌐 NETWORK (fresh download)'}`);
        } 
        else if (status === 'ready') {
          console.log('\n🎉 [READY] Model initialization complete!');
          self.postMessage({
            requestId,
            status: 'loading',
            message: 'Model files loaded, initializing...',
            progress: 90,
          });
        }
        else {
          // Log any other status we haven't handled
          console.log(`[Worker] Progress [${status}]:`, progress);
        }
      },
    });

    isModelLoaded = true;
    currentModelName = modelName; // Track the loaded model
    
    console.log('\n🎉 ====== MODEL LOADING SUCCESS ======');
    console.log('[Worker] Model:', modelName);
    console.log('[Worker] Status: READY');
    console.log('[Worker] All files loaded successfully');
    console.log('======================================\n');
    
    self.postMessage({
      requestId,
      status: 'ready',
      message: `AI model loaded and ready - Model: ${modelName}`,
    });

  } catch (error) {
    console.error('\n❌ ====== MODEL LOADING FAILED ======');
    console.error('[Worker] Model:', modelName);
    console.error('[Worker] Error Type:', error.constructor.name);
    console.error('[Worker] Error Message:', error.message);
    console.error('[Worker] Error Stack:', error.stack);
    console.error('\n🔍 Possible Causes:');
    console.error('   1. Corrupted browser cache (IndexedDB/Cache Storage)');
    console.error('   2. Missing model files on server');
    console.error('   3. Network request blocked/failed');
    console.error('   4. Invalid model file format');
    console.error('\n💡 Troubleshooting Steps:');
    console.error('   1. Clear browser storage (DevTools → Application → Clear site data)');
    console.error('   2. Hard refresh (Ctrl+Shift+R)');
    console.error('   3. Check: http://localhost:3000/models/' + modelName.split('/')[1] + '/config.json');
    console.error('   4. Run: npm run validate-models');
    console.error('   5. Run: npm run reset-models');
    console.error('======================================\n');
    
    self.postMessage({
      requestId,
      status: 'error',
      message: `Failed to load model: ${error.message}. Make sure you ran 'npm run setup-models'.`,
    });
  }
}

/**
 * Transcribe audio (expects Float32Array of audio samples)
 */
async function transcribe(audioData, requestId = null) {
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
    
    // Detect Distil-Whisper models for configuration adjustments
    const isDistilModel = currentModelName?.includes('distil-whisper');
    
    console.log('🎯 Transcription Configuration:');
    console.log('   • Model:', currentModelName || 'unknown');
    console.log('   • Model Type:', isDistilModel ? 'Distil-Whisper (optimized)' : 'Whisper (standard)');
    console.log('   • Request ID:', requestId || 'none');
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
      requestId,
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
    
    // Distil-Whisper models don't support word-level timestamps (different architecture)
    // Disable timestamps entirely for distil models to avoid _extract_token_timestamps error
    const isDistilWhisper = currentModelName?.includes('distil-whisper');
    const timestampOption = isDistilWhisper ? false : 'word'; // false = no timestamps, 'word' = word-level
    
    console.log('   • Timestamp Mode:', isDistilWhisper ? 'DISABLED (distil-whisper compatibility)' : 'word-level');
    
    const output = await transcriber(audioData, {
      chunk_length_s: 30, // Process in 30-second chunks
      stride_length_s: 5, // 5-second overlap between chunks
      return_timestamps: timestampOption, // Sentence-level for distil, word-level for others
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
            requestId,
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
      requestId,
      status: 'complete',
      message: 'Transcription complete',
      result: {
        text: output.text || '',
        chunks: output.chunks || [],
        processingTime: Math.round(inferenceTime), // Actual AI inference time in milliseconds
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
      requestId,
      status: 'error',
      message: `Transcription failed: ${error.message}`,
    });
  }
}

/**
 * Message handler - Request/Response Pattern
 */
self.addEventListener('message', async (event) => {
  const { requestId, type, data } = event.data;

  // Validate requestId
  if (!requestId) {
    console.error('[Worker] ❌ Received message without requestId');
    return;
  }

  console.log(`[Worker] 📥 Processing request ${requestId}: ${type}`);

  try {
    switch (type) {
      case 'load':
        await loadModel(data?.model || 'Xenova/whisper-base', requestId);
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
            requestId,
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
        await transcribe(audioSamples, requestId);
        break;

      case 'terminate':
        console.log('[Worker] Terminating...');
        self.close();
        break;

      default:
        console.warn('[Worker] Unknown message type:', type);
        self.postMessage({
          requestId,
          status: 'error',
          message: `Unknown message type: ${type}`,
        });
    }
  } catch (error) {
    console.error(`[Worker] ❌ Request ${requestId} failed:`, error);
    self.postMessage({
      requestId,
      status: 'error',
      message: error.message,
    });
  }
});

devLog('worker-ready: message listener attached, posting worker-ready handshake');
self.postMessage({ status: 'worker-ready' });
console.log('[Worker] Self-hosted transcription worker initialized');
