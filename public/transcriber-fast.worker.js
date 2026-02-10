/**
 * transcriber-fast.worker.js
 * 
 * Web Worker for Fast Mode parallel chunk processing.
 * Supports any Whisper model for parallel transcription.
 * 
 * Message Protocol:
 * - init: Load specified Whisper model (modelId in payload)
 * - transcribe: Process audio chunk
 * - terminate: Cleanup and close
 * 
 * NOTE: This is an ES Module worker (type="module")
 */

// Import Transformers.js from CDN (same as standard worker)
import { pipeline, env } from '/transformers.min.js';

// CONFIGURATION: Use CDN for model downloading
env.allowLocalModels = false;  // Don't check local /models/ folder
env.allowRemoteModels = true;  // Download from Hugging Face CDN
env.useBrowserCache = true;    // Cache downloaded models in browser

console.log('[FastWorker] Configured for CDN model downloading');
console.log('[FastWorker] Remote download enabled:', env.allowRemoteModels);

// Model configuration - now dynamic
const DEFAULT_MODEL_ID = 'distil-whisper/distil-small.en';
let currentModelId = null;
let transcriber = null;
let isInitialized = false;

/**
 * Detect best available device based on preference
 * Fallback chain: NPU -> GPU -> CPU
 *
 * @param {string} preference - 'auto' | 'npu' | 'gpu' | 'cpu'
 * @returns {Promise<{device: string, deviceType?: string}>}
 */
async function detectBestDevice(preference = 'auto') {
  console.log(`[FastWorker] Detecting best device (preference: ${preference})`);

  // If user explicitly wants CPU, skip detection
  if (preference === 'cpu') {
    console.log('[FastWorker] User preference: CPU (WASM)');
    return { device: 'wasm' };
  }

  // Try NPU via WebNN (if preference is 'npu' or 'auto')
  if (preference === 'npu' || preference === 'auto') {
    try {
      if ('ml' in navigator && navigator.ml) {
        const context = await navigator.ml.createContext({ deviceType: 'npu' });
        if (context) {
          console.log('[FastWorker] WebNN NPU available - using NPU acceleration');
          return { device: 'webnn', deviceType: 'npu' };
        }
      }
    } catch (error) {
      console.warn('[FastWorker] WebNN NPU not available:', error);
    }
  }

  // If user explicitly wanted NPU but it's not available, warn and continue
  if (preference === 'npu') {
    console.warn('[FastWorker] NPU requested but not available, falling back to GPU');
  }

  // Try GPU via WebGPU (if preference is 'gpu' or 'auto' or NPU failed)
  if (preference !== 'cpu') {
    try {
      if ('gpu' in navigator) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          console.log('[FastWorker] WebGPU available - using GPU acceleration');
          return { device: 'webgpu' };
        }
      }
    } catch (error) {
      console.warn('[FastWorker] WebGPU not available:', error);
    }
  }

  // Fallback to WASM (CPU)
  console.log('[FastWorker] Falling back to WASM (CPU)');
  return { device: 'wasm' };
}

/**
 * Check if model is English-only (affects language parameter)
 */
function isEnglishOnlyModel(modelId) {
  const englishOnlyModels = [
    'distil-whisper/distil-small.en',
    'distil-whisper/distil-medium.en',
    'distil-whisper/distil-large-v2',
    'Xenova/whisper-tiny.en',
    'Xenova/whisper-base.en',
    'Xenova/whisper-small.en',
    'Xenova/whisper-medium.en',
  ];
  return englishOnlyModels.some(m => modelId.includes(m) || modelId.endsWith('.en'));
}

/**
 * Initialize worker - load specified Whisper model
 */
async function initialize(requestId, modelId, devicePreference = 'auto') {
  try {
    // Use provided modelId or default
    currentModelId = modelId || DEFAULT_MODEL_ID;
    console.log(`[FastWorker] Initializing worker, loading model: ${currentModelId}`);
    console.log(`[FastWorker] Device preference: ${devicePreference}`);

    // Send initial progress
    self.postMessage({
      type: 'download-progress',
      requestId,
      data: {
        status: 'initiate',
        name: currentModelId,
        file: 'model',
        progress: 0,
        loaded: 0,
        total: 0,
      },
    });
    
    // Detect best device based on user preference
    const deviceConfig = await detectBestDevice(devicePreference);
    console.log(`[FastWorker] Using device: ${deviceConfig.device}${deviceConfig.deviceType ? ` (${deviceConfig.deviceType})` : ''}`);

    // Send device detection progress
    self.postMessage({
      type: 'download-progress',
      requestId,
      data: {
        status: 'progress',
        name: currentModelId,
        file: `device-${deviceConfig.device}`,
        progress: 10,
        loaded: 10,
        total: 100,
      },
    });

    // Build pipeline options based on device config
    const pipelineOptions = {
      quantized: true,
      progress_callback: (progress) => {
        // Forward model loading progress
        self.postMessage({
          type: 'download-progress',
          requestId,
          data: {
            status: progress.status || 'progress',
            name: currentModelId,
            file: progress.file || 'model',
            progress: progress.progress || 0,
            loaded: progress.loaded || 0,
            total: progress.total || 0,
          },
        });
      },
    };

    // Set device configuration
    if (deviceConfig.device === 'webnn') {
      // WebNN with specific device type (npu or gpu)
      pipelineOptions.device = 'webnn';
      if (deviceConfig.deviceType) {
        pipelineOptions.deviceType = deviceConfig.deviceType;
      }
    } else {
      // WebGPU or WASM
      pipelineOptions.device = deviceConfig.device;
    }

    console.log(`[FastWorker] Creating pipeline with options:`, {
      device: pipelineOptions.device,
      deviceType: pipelineOptions.deviceType
    });

    transcriber = await pipeline(
      'automatic-speech-recognition',
      currentModelId,
      pipelineOptions
    );
    
    isInitialized = true;
    console.log(`[FastWorker] Model loaded successfully: ${currentModelId}`);
    
    // Send completion progress
    self.postMessage({
      type: 'download-progress',
      requestId,
      data: {
        status: 'done',
        name: currentModelId,
        file: 'model',
        progress: 100,
        loaded: 100,
        total: 100,
      },
    });
    
    self.postMessage({
      type: 'init-complete',
      requestId,
      data: {
        success: true,
        modelId: currentModelId,
      },
    });
  } catch (error) {
    console.error(`[FastWorker] Initialization failed:`, error);
    isInitialized = false;
    
    self.postMessage({
      type: 'error',
      requestId,
      data: {
        error: `Failed to load model: ${error.message}`,
      },
    });
  }
}

/**
 * Transcribe audio chunk
 */
async function transcribeChunk(requestId, chunkIndex, audioData, startOffset, endOffset) {
  if (!isInitialized || !transcriber) {
    self.postMessage({
      type: 'error',
      requestId,
      data: {
        error: 'Worker not initialized',
        chunkIndex,
      },
    });
    return;
  }

  try {
    console.log(`[FastWorker] Processing chunk ${chunkIndex} (${startOffset.toFixed(1)}s - ${endOffset.toFixed(1)}s)`);
    
    // Send progress update
    self.postMessage({
      type: 'progress',
      requestId,
      data: {
        chunkIndex,
        percent: 0,
      },
    });

    // Build transcription options
    const transcribeOptions = {
      return_timestamps: true,
      chunk_length_s: 30,
    };
    
    // Only set language for English-only models
    if (isEnglishOnlyModel(currentModelId)) {
      transcribeOptions.language = 'en';
    }

    // Transcribe chunk
    const result = await transcriber(audioData, transcribeOptions);

    // Send progress update
    self.postMessage({
      type: 'progress',
      requestId,
      data: {
        chunkIndex,
        percent: 100,
      },
    });

    // Extract segments (sentence-level timestamps)
    const segments = result.chunks || [];
    const segmentsFormatted = segments.map(chunk => ({
      start: chunk.timestamp[0] || 0,
      end: chunk.timestamp[1] || 0,
      text: chunk.text || '',
    }));

    // Send result
    self.postMessage({
      type: 'result',
      requestId,
      data: {
        chunkIndex,
        text: result.text || '',
        segments: segmentsFormatted,
        startOffset,
        endOffset,
      },
    });

    console.log(`[FastWorker] Chunk ${chunkIndex} completed: ${segmentsFormatted.length} segments`);
  } catch (error) {
    console.error(`[FastWorker] Transcription failed for chunk ${chunkIndex}:`, error);
    
    self.postMessage({
      type: 'error',
      requestId,
      data: {
        error: `Transcription failed: ${error.message}`,
        chunkIndex,
      },
    });
  }
}

/**
 * Terminate worker
 */
function terminate(requestId) {
  console.log(`[FastWorker] Terminating worker`);
  
  // Cleanup
  transcriber = null;
  isInitialized = false;
  currentModelId = null;
  
  self.postMessage({
    type: 'terminate',
    requestId,
    data: {
      success: true,
    },
  });
  
  // Close worker
  self.close();
}

/**
 * Message handler
 */
self.onmessage = async (event) => {
  const { type, requestId, modelId, devicePreference, chunkIndex, audioData, startOffset, endOffset } = event.data;

  try {
    switch (type) {
      case 'init':
        // Accepts modelId and devicePreference parameters
        await initialize(requestId, modelId, devicePreference);
        break;
        
      case 'transcribe':
        await transcribeChunk(requestId, chunkIndex, audioData, startOffset, endOffset);
        break;
        
      case 'terminate':
        terminate(requestId);
        break;
        
      default:
        console.warn(`[FastWorker] Unknown message type: ${type}`);
        self.postMessage({
          type: 'error',
          requestId,
          data: {
            error: `Unknown message type: ${type}`,
          },
        });
    }
  } catch (error) {
    console.error(`[FastWorker] Error handling message:`, error);
    self.postMessage({
      type: 'error',
      requestId,
      data: {
        error: `Worker error: ${error.message}`,
      },
    });
  }
};

/**
 * Error handler
 */
self.onerror = (error) => {
  console.error(`[FastWorker] Worker error:`, error);
};

/**
 * Unhandled rejection handler
 */
self.onunhandledrejection = (event) => {
  console.error(`[FastWorker] Unhandled rejection:`, event.reason);
};
