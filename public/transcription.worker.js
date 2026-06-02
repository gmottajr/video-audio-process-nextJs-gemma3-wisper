/**
 * Transcription Web Worker - ES Module Version
 *
 * Runs Whisper model inference in a separate thread to avoid blocking the UI.
 * Downloads models on-demand from Hugging Face when first selected.
 *
 * Sections
 *   1. Initialization  — ORT pre-config + dev diagnostic setup
 *   2. Config          — env wiring after transformers import
 *   3. State           — worker-level model state
 *   4. loadModel       — pipeline creation + progress reporting
 *   5. transcribe      — inference + progress reporting
 *   6. Handlers        — OCP registry (add a type = add one entry, no branch edits)
 *   7. Message router  — dispatches to handlers
 *   8. Startup         — worker-ready handshake
 */

// =============================================================================
// 1. INITIALIZATION
// =============================================================================

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
  throw err; // Worker cannot continue without transformers
}

// =============================================================================
// 2. CONFIG
// =============================================================================

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

// =============================================================================
// 3. STATE
// =============================================================================

let transcriber = null;
let isModelLoaded = false;
let currentModelName = null;

// =============================================================================
// 4. loadModel
// =============================================================================

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

    const filesTracking = new Map();

    transcriber = await pipeline('automatic-speech-recognition', modelName, {
      quantized: true,
      progress_callback: (progress) => {
        const { status, file, loaded, total } = progress;

        if (file && !filesTracking.has(file)) {
          filesTracking.set(file, { startTime: Date.now(), status, loaded: 0, total: total || 0 });
        }
        if (file && filesTracking.has(file)) {
          const t = filesTracking.get(file);
          t.status = status;
          t.loaded = loaded || 0;
          t.total = total || 0;
        }

        if (status === 'initiate') {
          console.log(`\n📂 [INITIATE] ${file || 'unknown'}`);
          console.log(`   └─ Starting to load file...`);
        } else if (status === 'download') {
          console.log(`\n⬇️  [DOWNLOAD] ${file || 'unknown'}`);
          console.log(`   └─ Fetching from server (not in cache)`);
          console.log(`   └─ URL: /models/${modelName}/${file}`);
          if (progress.response) {
            console.log(`   └─ Response Status: ${progress.response.status || 'unknown'}`);
            console.log(`   └─ Content-Type: ${progress.response.headers?.get('content-type') || 'unknown'}`);
            console.log(`   └─ Content-Length: ${progress.response.headers?.get('content-length') || 'unknown'}`);
          }
        } else if (status === 'progress') {
          const tracking = filesTracking.get(file);
          const elapsed = Date.now() - tracking.startTime;
          const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
          const sizeMB = (loaded / (1024 * 1024)).toFixed(2);
          const totalMB = (total / (1024 * 1024)).toFixed(2);
          const speed = elapsed > 0 ? ((loaded / 1024) / (elapsed / 1000)).toFixed(2) : '0';

          console.log(`📊 [PROGRESS] ${file || 'unknown'}: ${percentage}% (${sizeMB}/${totalMB} MB) @ ${speed} KB/s`);

          if (total > 0) {
            self.postMessage({
              requestId,
              status: 'loading',
              message: `Loading ${file}... ${percentage}%`,
              progress: percentage,
            });
          }
        } else if (status === 'done') {
          const tracking = filesTracking.get(file);
          const elapsed = Date.now() - tracking.startTime;
          const sizeMB = (tracking.loaded / (1024 * 1024)).toFixed(2);
          console.log(`\n✅ [DONE] ${file || 'unknown'}`);
          console.log(`   └─ Size: ${sizeMB} MB`);
          console.log(`   └─ Time: ${elapsed}ms`);
          console.log(`   └─ Source: ${elapsed < 100 ? '🚀 CACHE (fast load)' : '🌐 NETWORK (fresh download)'}`);
        } else if (status === 'ready') {
          console.log('\n🎉 [READY] Model initialization complete!');
          self.postMessage({
            requestId,
            status: 'loading',
            message: 'Model files loaded, initializing...',
            progress: 90,
          });
        } else {
          console.log(`[Worker] Progress [${status}]:`, progress);
        }
      },
    });

    isModelLoaded = true;
    currentModelName = modelName;

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

// =============================================================================
// 5. transcribe
// =============================================================================

async function transcribe(audioData, requestId = null) {
  try {
    if (!isModelLoaded || !transcriber) {
      console.error('\n❌ MODEL NOT READY FOR TRANSCRIPTION');
      console.error('-'.repeat(80));
      console.error('   • isModelLoaded:', isModelLoaded);
      console.error('   • transcriber:', transcriber ? 'exists' : 'null');
      console.error('-'.repeat(80) + '\n');
      throw new Error('Model not loaded. Please wait for model to finish loading before transcribing.');
    }

    const transcriptionStartTime = performance.now();
    const isDistilModel = currentModelName?.includes('distil-whisper');

    console.log('🎯 Transcription Configuration:');
    console.log('   • Model:', currentModelName || 'unknown');
    console.log('   • Model Type:', isDistilModel ? 'Distil-Whisper (optimized)' : 'Whisper (standard)');
    console.log('   • Request ID:', requestId || 'none');
    console.log('   • Chunk Length: 30 seconds');
    console.log('   • Stride (overlap): 5 seconds');

    if (!(audioData instanceof Float32Array)) {
      throw new Error(`Expected Float32Array, got ${audioData.constructor.name}`);
    }
    if (audioData.length === 0) {
      throw new Error('Audio data is empty!');
    }

    self.postMessage({ requestId, status: 'transcribing', message: 'Transcribing audio...', progress: 0 });

    console.log('\n⏳ Running AI Model...');
    const audioDurationSeconds = audioData.length / 16000;
    const estimatedMinutes = Math.ceil(audioDurationSeconds / 30);
    console.log('⏱️  Estimated Processing Time:', estimatedMinutes, 'minutes\n');

    const inferenceStartTime = performance.now();
    let lastProgressUpdate = performance.now();
    let progressCount = 0;

    const isDistilWhisper = currentModelName?.includes('distil-whisper');
    const timestampOption = isDistilWhisper ? false : 'word';
    console.log('   • Timestamp Mode:', isDistilWhisper ? 'DISABLED (distil-whisper compatibility)' : 'word-level');

    const output = await transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: timestampOption,
      language: 'english',
      callback_function: (_beams) => {
        const now = performance.now();
        const elapsed = Math.floor((now - inferenceStartTime) / 1000);
        if (now - lastProgressUpdate >= 10000) {
          progressCount++;
          lastProgressUpdate = now;
          const estimatedTotalTime = audioDurationSeconds * 2;
          const estimatedProgress = Math.min(95, Math.round((elapsed / estimatedTotalTime) * 100));
          console.log(`   ⏳ Processing... ${elapsed}s elapsed (estimated ${estimatedProgress}%)`);
          self.postMessage({
            requestId,
            status: 'transcribing',
            message: `Processing... ${Math.floor(elapsed / 60)}min ${elapsed % 60}s elapsed`,
            progress: estimatedProgress,
          });
        }
      },
    });

    const inferenceTime = performance.now() - inferenceStartTime;
    const totalTime = performance.now() - transcriptionStartTime;

    console.log('✅ AI Processing Complete!');
    console.log('   • Inference Time:', (inferenceTime / 1000).toFixed(2), 'seconds');
    console.log('   • Total Time:', (totalTime / 1000).toFixed(2), 'seconds');
    console.log('\n📊 Transcription Results:');
    console.log('   • Text Length:', (output.text?.length || 0).toLocaleString(), 'characters');
    console.log('   • Word Chunks:', (output.chunks?.length || 0).toLocaleString());

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
        processingTime: Math.round(inferenceTime),
      },
    });
  } catch (error) {
    console.error('\n❌ TRANSCRIPTION ERROR');
    console.error('-'.repeat(80));
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('-'.repeat(80) + '\n');

    self.postMessage({ requestId, status: 'error', message: `Transcription failed: ${error.message}` });
  }
}

// =============================================================================
// 6. HANDLERS REGISTRY (OCP)
//    Add a new message type = add one entry here. No switch edits needed.
// =============================================================================

const handlers = {
  async load(data, requestId) {
    await loadModel(data?.model || 'Xenova/whisper-base', requestId);
  },

  async transcribe(data, requestId) {
    // Validate model readiness before touching audio data.
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

    const audioSamples = data.audio;
    console.log('📥 WORKER: Audio Data Received');
    console.log('-'.repeat(80));
    console.log('✓ Model Status: Ready');
    console.log('\n📋 Data Validation:');
    console.log('   • Type:', audioSamples?.constructor?.name || 'undefined');
    console.log('   • Length:', audioSamples?.length?.toLocaleString() || 'N/A');

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
      self.postMessage({ status: 'error', message: 'Audio samples array is empty' });
      return;
    }

    const duration = (audioSamples.length / 16000).toFixed(2);
    console.log('   • Duration:', duration, 'seconds');
    console.log('   • Sample Range:', `[${audioSamples[0].toFixed(4)} ... ${audioSamples[audioSamples.length - 1].toFixed(4)}]`);
    console.log('✓ Validation passed\n');
    console.log('🤖 STEP 3: AI Transcription');
    console.log('-'.repeat(80));

    await transcribe(audioSamples, requestId);
  },

  terminate(_data, _requestId) {
    console.log('[Worker] Terminating...');
    self.close();
  },
};

// =============================================================================
// 7. MESSAGE ROUTER
// =============================================================================

self.addEventListener('message', async (event) => {
  const { requestId, type, data } = event.data;

  if (!requestId) {
    console.error('[Worker] ❌ Received message without requestId');
    return;
  }

  const handler = handlers[type];
  if (!handler) {
    console.warn('[Worker] Unknown message type:', type);
    self.postMessage({ requestId, status: 'error', message: `Unknown message type: ${type}` });
    return;
  }

  console.log(`[Worker] 📥 Processing request ${requestId}: ${type}`);
  try {
    await handler(data, requestId);
  } catch (error) {
    console.error(`[Worker] ❌ Request ${requestId} failed:`, error);
    self.postMessage({ requestId, status: 'error', message: error.message });
  }
});

// =============================================================================
// 8. STARTUP HANDSHAKE
// =============================================================================

devLog('worker-ready: message listener attached, posting worker-ready handshake');
self.postMessage({ status: 'worker-ready' });
console.log('[Worker] Self-hosted transcription worker initialized');
