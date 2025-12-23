/**
 * AI Enhancement Web Worker
 * 
 * Runs Llama 3.2 3B model inference using WebLLM for transcript enhancement.
 * Operates in a separate thread to avoid blocking the UI.
 * 
 * Model: Llama-3.2-3B-Instruct-q4f16_1-MLC (~1.7GB)
 * Requires: WebGPU support (Chrome 113+, Edge 113+, Safari 18+)
 */

// Import WebLLM from CDN (ES module)
import * as webllm from "https://esm.run/@mlc-ai/web-llm@0.2.78";

// ============================================================================
// State
// ============================================================================

let engine = null;
let isReady = false;
let currentModelId = null;
let abortController = null;

// ============================================================================
// Cache Management & Recovery
// ============================================================================

/**
 * Clear WebLLM cache from IndexedDB
 * This fixes corrupted engine states by clearing model cache
 */
async function clearWebLLMCache() {
  console.log('[EnhancerWorker] Clearing WebLLM cache...');
  
  try {
    // WebLLM stores models in IndexedDB with these database names
    const dbNames = [
      'webllm/model',      // Main model storage
      'webllm/config',     // Config storage
      'webllm/wasm',       // WASM cache
      'web-llm-cache',     // Alternative cache name
    ];
    
    // Try to delete each database
    for (const dbName of dbNames) {
      try {
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(dbName);
          request.onsuccess = () => {
            console.log(`[EnhancerWorker] Deleted database: ${dbName}`);
            resolve();
          };
          request.onerror = () => resolve(); // Ignore errors (DB might not exist)
          request.onblocked = () => {
            console.warn(`[EnhancerWorker] Database ${dbName} is blocked, forcing deletion`);
            setTimeout(resolve, 100); // Continue anyway
          };
        });
      } catch (err) {
        console.log(`[EnhancerWorker] Could not delete ${dbName}:`, err.message);
      }
    }
    
    // Also clear cache storage if available
    if (self.caches) {
      const cacheNames = await self.caches.keys();
      for (const cacheName of cacheNames) {
        if (cacheName.includes('webllm') || cacheName.includes('mlc')) {
          await self.caches.delete(cacheName);
          console.log(`[EnhancerWorker] Deleted cache: ${cacheName}`);
        }
      }
    }
    
    console.log('[EnhancerWorker] Cache cleared successfully');
    return true;
  } catch (error) {
    console.error('[EnhancerWorker] Error clearing cache:', error);
    return false;
  }
}

/**
 * Timeout wrapper for async operations
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name for logging
 * @returns {Promise} - Wrapped promise
 */
function withTimeout(promise, timeoutMs, operationName = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// ============================================================================
// System Prompt for Transcript Enhancement
// ============================================================================

const ENHANCEMENT_SYSTEM_PROMPT = `You are a professional transcript editor. Your task is to clean up speech-to-text transcripts.

## Instructions:
1. Remove ALL filler words: um, uh, like, you know, I mean, basically, actually, literally, so, well, right, okay, anyway
2. Fix grammar errors and awkward phrasing
3. Add proper punctuation (periods, commas, question marks)
4. Fix capitalization (sentences, proper nouns)
5. Break run-on sentences into clear, readable sentences
6. Remove false starts and repeated words
7. Keep contractions natural (don't → don't, it's → it's)

## Rules:
- Preserve the EXACT meaning and intent
- Keep all names, numbers, and technical terms unchanged
- Don't add information not in the original
- Don't over-formalize casual speech
- Output ONLY the cleaned transcript
- No explanations, preambles, or commentary

## Example:
Input: "So um basically what I'm trying to say is like you know the the project is actually going really well and um we should be done by Friday I think"
Output: "What I'm trying to say is the project is going really well, and we should be done by Friday."`;

// ============================================================================
// Filler Word Detection
// ============================================================================

const FILLER_WORDS = [
  'um', 'uh', 'uhm', 'umm', 'er', 'eh',
  'like', 'you know', 'i mean', 'basically',
  'actually', 'literally', 'honestly',
  'sort of', 'kind of', 'kinda', 'sorta',
  'right', 'okay', 'ok', 'so', 'well', 'anyway',
  'obviously', 'clearly', 'definitely'
];

/**
 * Detect filler words in text
 * @param {string} text - Text to analyze
 * @returns {string[]} - Array of found filler words
 */
function detectFillerWords(text) {
  const found = [];
  const lowerText = text.toLowerCase();
  
  for (const filler of FILLER_WORDS) {
    // Use word boundary regex to match whole words only
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      found.push(...matches);
    }
  }
  
  return found;
}

/**
 * Calculate improvement metrics
 * @param {string} original - Original text
 * @param {string} enhanced - Enhanced text
 * @returns {Object} - Improvement metrics
 */
function calculateImprovements(original, enhanced) {
  const fillerWordsRemoved = detectFillerWords(original);
  const originalWords = original.split(/\s+/).filter(w => w.length > 0);
  const enhancedWords = enhanced.split(/\s+/).filter(w => w.length > 0);
  
  const originalCharCount = original.length;
  const enhancedCharCount = enhanced.length;
  
  const compressionRatio = enhancedCharCount / originalCharCount;
  const reductionPercentage = ((originalCharCount - enhancedCharCount) / originalCharCount) * 100;
  
  // Estimate grammar fixes based on changes (rough heuristic)
  const grammarFixes = Math.max(0, Math.floor(Math.abs(originalWords.length - enhancedWords.length) * 0.3));
  
  return {
    fillerWordsRemoved,
    fillerCount: fillerWordsRemoved.length,
    grammarFixes,
    originalWordCount: originalWords.length,
    enhancedWordCount: enhancedWords.length,
    originalCharCount,
    enhancedCharCount,
    compressionRatio,
    reductionPercentage: Math.max(0, reductionPercentage),
  };
}

// ============================================================================
// Engine Management
// ============================================================================

/**
 * Initialize the WebLLM engine with the specified model
 * @param {string} modelId - Model ID from WebLLM model list
 * @param {string} requestId - Request ID for response tracking
 */
async function initEngine(modelId, requestId) {
  try {
    console.log('[EnhancerWorker] Initializing engine with model:', modelId);
    
    // If already loaded with same model, skip
    if (isReady && engine && currentModelId === modelId) {
      console.log('[EnhancerWorker] Model already loaded:', modelId);
      self.postMessage({
        requestId,
        status: 'ready',
        message: 'Model already loaded and ready',
      });
      return;
    }
    
    // If different model, reset first
    if (engine && currentModelId !== modelId) {
      console.log('[EnhancerWorker] Switching models, resetting engine...');
      await engine.unload();
      engine = null;
      isReady = false;
    }
    
    self.postMessage({
      requestId,
      status: 'downloading',
      message: 'Initializing AI model...',
      progress: 0,
    });
    
    let lastProgressUpdate = Date.now();
    
    // Create the engine with progress callback
    engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (info) => {
        const now = Date.now();
        
        // Throttle updates to every 200ms
        if (now - lastProgressUpdate < 200 && info.progress < 1) {
          return;
        }
        lastProgressUpdate = now;
        
        const progress = Math.round((info.progress || 0) * 100);
        
        // Determine status based on progress message
        let status = 'downloading';
        let message = info.text || `Downloading model: ${progress}%`;
        
        if (info.text?.includes('Loading')) {
          status = 'loading';
          message = info.text;
        }
        
        console.log(`[EnhancerWorker] ${status}: ${progress}% - ${message}`);
        
        self.postMessage({
          requestId,
          status,
          message,
          progress,
          downloadedMB: info.loaded ? Math.round(info.loaded / (1024 * 1024)) : undefined,
          totalMB: info.total ? Math.round(info.total / (1024 * 1024)) : undefined,
        });
      },
    });
    
    isReady = true;
    currentModelId = modelId;
    
    console.log('[EnhancerWorker] Engine ready with model:', modelId);
    
    self.postMessage({
      requestId,
      status: 'ready',
      message: 'AI model loaded and ready',
      progress: 100,
    });
    
  } catch (error) {
    console.error('[EnhancerWorker] Engine initialization failed:', error);
    
    isReady = false;
    engine = null;
    currentModelId = null;
    
    self.postMessage({
      requestId,
      status: 'error',
      message: error.message || 'Failed to initialize AI model',
      error: error.message,
    });
  }
}

// ============================================================================
// Text Generation (for analysis, speaker identification, etc.)
// ============================================================================

/**
 * Generate text using the AI model (for analysis, speaker identification, etc.)
 * @param {string} prompt - The prompt to send to the model
 * @param {string} requestId - Request ID for tracking
 * @param {object} options - Generation options (temperature, max_tokens)
 */
async function generateText(prompt, requestId, options = {}) {
  if (!isReady || !engine) {
    self.postMessage({
      requestId,
      status: 'error',
      message: 'Model not loaded yet',
      error: 'Not ready',
    });
    return;
  }
  
  // Validate input
  if (!prompt || typeof prompt !== 'string') {
    self.postMessage({
      requestId,
      status: 'error',
      message: 'Invalid prompt provided',
      error: 'Invalid input',
    });
    return;
  }
  
  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length === 0) {
    self.postMessage({
      requestId,
      status: 'error',
      message: 'Prompt is empty',
      error: 'Empty input',
    });
    return;
  }
  
  try {
    console.log('[EnhancerWorker] Starting text generation...');
    console.log('[EnhancerWorker] Prompt length:', trimmedPrompt.length, 'chars');
    
    // Create abort controller for this request
    abortController = new AbortController();
    
    self.postMessage({
      requestId,
      status: 'processing',
      message: 'Generating response...',
      progress: 0,
    });
    
    const startTime = performance.now();
    let generatedText = '';
    let tokenCount = 0;
    
    // Extract options with defaults
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.max_tokens ?? 2000;
    
    // Build messages
    const messages = [
      { role: 'user', content: trimmedPrompt },
    ];
    
    // Create streaming completion with timeout detection
    console.log('[EnhancerWorker] Calling engine for text generation...');
    let stream;
    try {
      stream = await withTimeout(
        engine.chat.completions.create({
          messages,
          temperature,
          top_p: 0.9,
          max_tokens: maxTokens,
          stream: true,
        }),
        30000, // 30 second timeout
        'Engine text generation initialization'
      );
      
      console.log('[EnhancerWorker] Stream created successfully for text generation');
    } catch (timeoutError) {
      if (timeoutError.message.includes('timed out')) {
        console.error('[EnhancerWorker] Engine is hung! Attempting auto-recovery...');
        
        // Unload the broken engine
        try {
          if (engine) {
            await engine.unload();
          }
        } catch (e) {
          console.log('[EnhancerWorker] Could not unload engine:', e.message);
        }
        
        // Clear the cache
        await clearWebLLMCache();
        
        // Reset state
        engine = null;
        isReady = false;
        currentModelId = null;
        abortController = null;
        
        // Inform the main thread to retry
        self.postMessage({
          requestId,
          status: 'error',
          message: 'Engine was corrupted and has been reset. Please reload the page and try again.',
          error: 'ENGINE_CORRUPTED_AND_RESET',
          needsRetry: true,
        });
        return;
      }
      
      throw timeoutError;
    }
    
    console.log('[EnhancerWorker] Streaming response...');
    
    // Process stream
    for await (const chunk of stream) {
      // Check for cancellation (check if abortController exists first)
      if (abortController && abortController.signal.aborted) {
        console.log('[EnhancerWorker] Generation cancelled');
        self.postMessage({
          requestId,
          status: 'cancelled',
          message: 'Generation cancelled by user',
        });
        return;
      }
      
      const content = chunk.choices[0]?.delta?.content || '';
      generatedText += content;
      tokenCount++;
    }
    
    const processingTime = (performance.now() - startTime) / 1000;
    
    console.log('[EnhancerWorker] Generation complete');
    console.log('[EnhancerWorker] Processing time:', processingTime.toFixed(2), 'seconds');
    console.log('[EnhancerWorker] Tokens generated:', tokenCount);
    
    // Clean up the output
    generatedText = generatedText.trim();
    
    // Send complete result
    self.postMessage({
      requestId,
      status: 'complete',
      message: 'Generation complete',
      progress: 100,
      text: generatedText,
      tokensGenerated: tokenCount,
      processingTime,
    });
    
  } catch (error) {
    console.error('[EnhancerWorker] Generation failed:', error);
    
    self.postMessage({
      requestId,
      status: 'error',
      message: error.message || 'Generation failed',
      error: error.message,
    });
  } finally {
    abortController = null;
  }
}

// ============================================================================
// Transcript Enhancement
// ============================================================================

/**
 * Enhance a transcript using the loaded model
 * @param {string} transcript - Raw transcript text
 * @param {string} requestId - Request ID for response tracking
 * @param {string} [customPrompt] - Optional custom prompt (Phase 2 context-aware)
 * @param {Object} [metadata] - Optional metadata about the content
 */
async function enhanceTranscript(transcript, requestId, customPrompt = null, metadata = null) {
  if (!engine || !isReady) {
    self.postMessage({
      requestId,
      status: 'error',
      message: 'Model not loaded. Please wait for model to finish loading.',
      error: 'Model not initialized',
    });
    return;
  }
  
  // Validate input
  if (!transcript || typeof transcript !== 'string') {
    self.postMessage({
      requestId,
      status: 'error',
      message: 'Invalid transcript provided',
      error: 'Invalid input',
    });
    return;
  }
  
  const trimmedTranscript = transcript.trim();
  if (trimmedTranscript.length === 0) {
    self.postMessage({
      requestId,
      status: 'error',
      message: 'Transcript is empty',
      error: 'Empty input',
    });
    return;
  }
  
  try {
    console.log('[EnhancerWorker] Starting enhancement...');
    console.log('[EnhancerWorker] Transcript length:', trimmedTranscript.length, 'chars');
    
    // Create abort controller for this request
    abortController = new AbortController();
    
    self.postMessage({
      requestId,
      status: 'processing',
      message: 'Starting transcript enhancement...',
      progress: 0,
    });
    
    const startTime = performance.now();
    let enhancedText = '';
    let tokenCount = 0;
    let lastProgressUpdate = Date.now();
    
    // Estimate expected tokens (roughly 1.3x input tokens for enhancement)
    const estimatedInputTokens = Math.ceil(trimmedTranscript.split(/\s+/).length * 1.3);
    const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.9);
    
    // Build messages based on whether we have a custom prompt (Phase 2)
    let messages;
    if (customPrompt) {
      // Phase 2: Context-aware prompt - use the full custom prompt as user message
      console.log('[EnhancerWorker] Using Phase 2 context-aware prompt');
      if (metadata) {
        console.log('[EnhancerWorker] Content metadata:', metadata);
      }
      messages = [
        { role: 'user', content: customPrompt },
      ];
    } else {
      // Phase 1: Simple prompt - use system prompt + transcript
      console.log('[EnhancerWorker] Using Phase 1 simple prompt');
      messages = [
        { role: 'system', content: ENHANCEMENT_SYSTEM_PROMPT },
        { role: 'user', content: trimmedTranscript },
      ];
    }
    
    // Create streaming completion with timeout detection
    console.log('[EnhancerWorker] Calling engine.chat.completions.create()...');
    let stream;
    try {
      // Wrap the engine call with a 30-second timeout
      // If it hangs here, the engine is corrupted
      stream = await withTimeout(
        engine.chat.completions.create({
          messages,
          temperature: 0.2,  // Low temperature for consistent output
          top_p: 0.9,
          max_tokens: Math.max(estimatedOutputTokens * 2, 2048),
          stream: true,
        }),
        30000, // 30 second timeout for the initial call
        'Engine chat completion initialization'
      );
      
      console.log('[EnhancerWorker] Stream created successfully');
    } catch (timeoutError) {
      if (timeoutError.message.includes('timed out')) {
        console.error('[EnhancerWorker] Engine is hung! Attempting auto-recovery...');
        
        // Send recovery status
        self.postMessage({
          requestId,
          status: 'processing',
          message: 'Engine corrupted, clearing cache and resetting...',
          progress: 0,
        });
        
        // Unload the broken engine
        try {
          if (engine) {
            await engine.unload();
          }
        } catch (e) {
          console.log('[EnhancerWorker] Could not unload engine:', e.message);
        }
        
        // Clear the cache
        await clearWebLLMCache();
        
        // Reset state
        engine = null;
        isReady = false;
        currentModelId = null;
        abortController = null;
        
        // Inform the main thread to retry
        self.postMessage({
          requestId,
          status: 'error',
          message: 'Engine was corrupted and has been reset. Please try enhancement again - the model will be re-downloaded.',
          error: 'ENGINE_CORRUPTED_AND_RESET',
          needsRetry: true,
        });
        return;
      }
      
      // Re-throw other errors
      throw timeoutError;
    }
    
    console.log('[EnhancerWorker] Streaming response...');
    
    // Process stream
    for await (const chunk of stream) {
      // Check for cancellation (check if abortController exists first)
      if (abortController && abortController.signal.aborted) {
        console.log('[EnhancerWorker] Enhancement cancelled');
        self.postMessage({
          requestId,
          status: 'cancelled',
          message: 'Enhancement cancelled by user',
        });
        return;
      }
      
      const content = chunk.choices[0]?.delta?.content || '';
      enhancedText += content;
      tokenCount++;
      
      // Progress update every 200ms or 20 tokens
      const now = Date.now();
      if (now - lastProgressUpdate >= 200 || tokenCount % 20 === 0) {
        lastProgressUpdate = now;
        
        const progress = Math.min(95, Math.round((tokenCount / estimatedOutputTokens) * 100));
        
        self.postMessage({
          requestId,
          status: 'streaming',
          message: `Generating enhanced text... (${tokenCount} tokens)`,
          progress,
          tokensGenerated: tokenCount,
        });
      }
    }
    
    const processingTime = (performance.now() - startTime) / 1000;
    
    console.log('[EnhancerWorker] Enhancement complete');
    console.log('[EnhancerWorker] Processing time:', processingTime.toFixed(2), 'seconds');
    console.log('[EnhancerWorker] Tokens generated:', tokenCount);
    
    // Clean up the output
    enhancedText = enhancedText.trim();
    
    // Sometimes the model adds quotes or extra formatting, clean it up
    if (enhancedText.startsWith('"') && enhancedText.endsWith('"')) {
      enhancedText = enhancedText.slice(1, -1);
    }
    
    // Calculate improvements
    const improvements = calculateImprovements(trimmedTranscript, enhancedText);
    
    console.log('[EnhancerWorker] Improvements:', {
      fillerCount: improvements.fillerCount,
      reductionPercentage: improvements.reductionPercentage.toFixed(1) + '%',
      originalWords: improvements.originalWordCount,
      enhancedWords: improvements.enhancedWordCount,
    });
    
    // Send complete result
    self.postMessage({
      requestId,
      status: 'complete',
      message: 'Enhancement complete',
      progress: 100,
      result: {
        originalText: trimmedTranscript,
        enhancedText,
        improvements,
        processingTime,
        tokensGenerated: tokenCount,
        modelUsed: currentModelId,
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('[EnhancerWorker] Enhancement failed:', error);
    
    self.postMessage({
      requestId,
      status: 'error',
      message: error.message || 'Enhancement failed',
      error: error.message,
    });
  } finally {
    abortController = null;
  }
}

/**
 * Cancel ongoing enhancement
 * @param {string} requestId - Request ID
 */
function cancelEnhancement(requestId) {
  if (abortController) {
    abortController.abort();
    console.log('[EnhancerWorker] Cancellation requested');
  }
  
  self.postMessage({
    requestId,
    status: 'cancelled',
    message: 'Enhancement cancelled',
  });
}

/**
 * Reset the engine and free resources
 * @param {string} requestId - Request ID
 */
async function resetEngine(requestId) {
  try {
    console.log('[EnhancerWorker] Starting engine reset...');
    
    // Unload the engine if it exists
    if (engine) {
      try {
        await engine.unload();
        console.log('[EnhancerWorker] Engine unloaded');
      } catch (e) {
        console.log('[EnhancerWorker] Could not unload engine:', e.message);
      }
    }
    
    // Clear the IndexedDB cache
    self.postMessage({
      requestId,
      status: 'processing',
      message: 'Clearing model cache...',
    });
    
    const cacheCleared = await clearWebLLMCache();
    
    if (cacheCleared) {
      console.log('[EnhancerWorker] Cache cleared successfully');
    }
    
    // Reset state
    engine = null;
    isReady = false;
    currentModelId = null;
    abortController = null;
    
    console.log('[EnhancerWorker] Engine reset complete');
    
    self.postMessage({
      requestId,
      status: 'reset',
      message: 'Engine reset complete. Cache cleared. Model will be re-downloaded on next use.',
    });
    
  } catch (error) {
    console.error('[EnhancerWorker] Reset failed:', error);
    
    self.postMessage({
      requestId,
      status: 'error',
      message: error.message || 'Reset failed',
      error: error.message,
    });
  }
}

// ============================================================================
// Message Handler
// ============================================================================

self.addEventListener('message', async (event) => {
  const { requestId, type, data } = event.data;
  
  if (!requestId) {
    console.error('[EnhancerWorker] Message missing requestId');
    return;
  }
  
  console.log(`[EnhancerWorker] Received: ${type} (${requestId})`);
  
  try {
    switch (type) {
      case 'init':
        // Use f32 (32-bit float) models for maximum WebGPU compatibility
        // f16 models require the WebGPU f16 extension which isn't universally supported
        await initEngine(data?.modelId || 'Llama-3.2-1B-Instruct-q4f32_1-MLC', requestId);
        break;
        
      case 'enhance':
        await enhanceTranscript(data?.transcript, requestId, data?.prompt, data?.metadata);
        break;
        
      case 'generate':
        await generateText(data?.prompt, requestId, {
          temperature: data?.temperature,
          max_tokens: data?.max_tokens,
        });
        break;
        
      case 'cancel':
        cancelEnhancement(requestId);
        break;
        
      case 'reset':
        await resetEngine(requestId);
        break;
        
      default:
        console.warn('[EnhancerWorker] Unknown message type:', type);
        self.postMessage({
          requestId,
          status: 'error',
          message: `Unknown message type: ${type}`,
        });
    }
  } catch (error) {
    console.error(`[EnhancerWorker] Error handling ${type}:`, error);
    self.postMessage({
      requestId,
      status: 'error',
      message: error.message || 'Unknown error',
      error: error.message,
    });
  }
});

console.log('[EnhancerWorker] AI Enhancement worker initialized');


