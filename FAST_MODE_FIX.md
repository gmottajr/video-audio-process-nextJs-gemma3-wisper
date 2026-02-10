# Fast Mode Transcription Fix

## Issue

Fast Mode transcription was failing with "Array buffer allocation failed" errors when trying to load the Distil-Whisper model. The error logs showed:

1. **2800+ pending requests** in the WorkerManager queue
2. Multiple attempts to load `distil-whisper/distil-small.en` in the standard transcriber
3. Memory allocation failures due to concurrent model loading attempts

## Root Causes

### 1. Webpack Bundling Issue with Fast Mode Worker
The Fast Mode worker was being bundled by webpack, which caused it to try to import `@xenova/transformers` from node_modules. This included the `onnxruntime-node` dependency, which doesn't work in the browser and caused the error:

```
Uncaught ReferenceError: onnxruntime is not defined
```

**Location:** `services/fast-mode/WorkerPoolManagerFast.ts` line 54

```typescript
// BEFORE (causes webpack bundling):
const worker = new Worker(
  new URL('../../public/transcriber-fast.worker.js', import.meta.url),
  { type: 'module' }
);
```

**Location:** `public/transcriber-fast.worker.js` line 13

```typescript
// BEFORE (imports from node_modules):
import { pipeline, env } from '@xenova/transformers';
```

### 2. Incorrect Model Loading Path
When Fast Mode was selected, the code was attempting to load Distil-Whisper in the **standard transcriber** (`TranscriberContext.tsx` + `transcription.worker.js`) instead of using the Fast Mode workers (`transcriber-fast.worker.js`).

**Location:** `app/page.tsx` lines 66-71

```typescript
// BEFORE (incorrect):
useEffect(() => {
  if (transcriptionMode === 'fast' && fastModeEnabled) {
    setSelectedModelKey('distil-small');
    processor.transcriber.loadModel(WHISPER_MODELS['distil-small'].id); // ❌ Wrong path!
  }
}, [transcriptionMode, fastModeEnabled, processor.transcriber]);
```

### 3. Missing Guard for Concurrent Model Loads
The `loadModel` function in `TranscriberContext.tsx` checked if a model was already **loaded**, but not if a load was **in progress**. This allowed multiple concurrent load requests to be created.

**Location:** `contexts/TranscriberContext.tsx` lines 129-138

```typescript
// BEFORE (missing guard):
if (isModelLoaded && currentModel === modelName) {
  console.log('[TranscriberContext] ℹ️ Model already loaded:', modelName);
  return;
}
// ❌ No check for isModelLoading!
```

### 4. Dependency Array Causing Re-renders
The `useEffect` dependency array included `processor.transcriber`, which could trigger unnecessary re-renders and multiple model load attempts.

## Fixes Applied

### Fix 1: Prevent Webpack Bundling of Fast Mode Worker

**File:** `services/fast-mode/WorkerPoolManagerFast.ts`

```typescript
// AFTER (load from public directory):
// NOTE: Load from public directory to avoid webpack bundling
// This allows the worker to import Transformers.js from CDN
for (let i = 0; i < workerCount; i++) {
  const worker = new Worker('/transcriber-fast.worker.js', { type: 'module' });
  
  worker.onmessage = this.handleWorkerMessage.bind(this);
  worker.onerror = this.handleWorkerError.bind(this, i);
  
  this.workers.push(worker);
  this.workerStatus.push('idle');
}
```

**File:** `public/transcriber-fast.worker.js`

```typescript
// AFTER (import from CDN):
// Import Transformers.js from CDN (same as standard worker)
import { pipeline, env } from '/transformers.min.js';

// CONFIGURATION: Use CDN for model downloading
env.allowLocalModels = false;  // Don't check local /models/ folder
env.allowRemoteModels = true;  // Download from Hugging Face CDN
env.useBrowserCache = true;    // Cache downloaded models in browser
```

**Rationale:**
- Using `new URL(..., import.meta.url)` causes webpack to bundle the worker
- Bundled workers try to import from node_modules, which includes browser-incompatible dependencies
- Loading from `/transcriber-fast.worker.js` keeps the worker separate from the bundle
- Worker can then import Transformers.js from CDN, which is browser-compatible

### Fix 2: Conditional Model Loading Based on Parallel Workers Flag

**File:** `app/page.tsx`

```typescript
// AFTER (correct):
useEffect(() => {
  if (transcriptionMode === 'fast' && fastModeEnabled) {
    setSelectedModelKey('distil-small');
    
    // Only load in standard transcriber if NOT using parallel workers
    // Parallel workers load their own models independently
    const parallelWorkersEnabled = isFeatureEnabled('ENABLE_PARALLEL_WORKERS');
    if (!parallelWorkersEnabled) {
      console.log('[App] Fast Mode without parallel workers - loading Distil-Whisper in standard transcriber');
      processor.transcriber.loadModel(WHISPER_MODELS['distil-small'].id).catch(err => {
        console.error('[App] Failed to load Distil-Whisper:', err);
      });
    } else {
      console.log('[App] Fast Mode with parallel workers - skipping standard transcriber model load');
    }
  }
}, [transcriptionMode, fastModeEnabled]); // ✅ Removed processor.transcriber from deps
```

**Rationale:**
- When `ENABLE_PARALLEL_WORKERS` is `true` (default), Fast Mode uses dedicated workers that load their own models
- The standard transcriber should NOT load Distil-Whisper in this case
- Only when parallel workers are disabled should the standard transcriber load Distil-Whisper

### Fix 3: Guard Against Concurrent Model Loads

**File:** `contexts/TranscriberContext.tsx`

```typescript
// AFTER (with guard):
// Skip if already loaded
if (isModelLoaded && currentModel === modelName) {
  console.log('[TranscriberContext] ℹ️ Model already loaded:', modelName);
  return;
}

// Skip if already loading the same model
if (isModelLoading && currentModel === modelName) {
  console.log('[TranscriberContext] ℹ️ Model already loading:', modelName);
  return;
}
```

**Rationale:**
- Prevents multiple concurrent load requests for the same model
- Reduces memory pressure and request queue buildup
- Provides clear logging for debugging

## Architecture Flow

### Standard Mode (No Changes)
```
User selects Standard Mode
  → TranscriberContext loads selected Whisper model (tiny/base/small)
  → Uses transcription.worker.js
  → Single-threaded sequential processing
```

### Fast Mode (Fixed Flow)
```
User selects Fast Mode
  → UI sets transcriptionMode = 'fast'
  → selectedModelKey = 'distil-small'
  
  IF ENABLE_PARALLEL_WORKERS = true (default):
    → Standard transcriber does NOT load model
    → When transcription starts:
      → useTranscriberFast.transcribe() called
      → WorkerPoolManagerFast creates 2 workers
      → Each worker loads distil-whisper/distil-small.en independently
      → Parallel chunk processing
  
  IF ENABLE_PARALLEL_WORKERS = false:
    → Standard transcriber loads distil-whisper/distil-small.en
    → Uses transcription.worker.js
    → Single-threaded processing with Distil-Whisper
```

## Testing Checklist

- [ ] Fast Mode with parallel workers enabled (default)
  - [ ] Model loads successfully in Fast Mode workers
  - [ ] No errors in standard transcriber
  - [ ] Transcription completes successfully
  
- [ ] Fast Mode with parallel workers disabled
  - [ ] Distil-Whisper loads in standard transcriber
  - [ ] Transcription completes successfully
  
- [ ] Standard Mode (unchanged)
  - [ ] Selected model loads correctly
  - [ ] Transcription works as before
  
- [ ] Model switching
  - [ ] No duplicate load requests
  - [ ] Concurrent load attempts are blocked
  - [ ] Pending request count stays reasonable (<10)

## Feature Flags

Current defaults in `lib/featureFlags.ts`:

```typescript
export const DEFAULT_FLAGS: FeatureFlags = {
  ENABLE_FAST_MODE: true,               // Fast Mode UI enabled
  ENABLE_PARALLEL_WORKERS: true,        // Parallel processing enabled
  MAX_WORKER_COUNT: 2,                  // 2 workers (1.2GB memory budget)
  ENABLE_WEBGPU: false,                 // Future feature
  SHOW_PERF_METRICS: false,             // Debug only
};
```

## Expected Behavior After Fix

1. **No more "onnxruntime is not defined" errors**
2. **No more "Array buffer allocation failed" errors**
3. **Pending request count stays low** (<10 requests)
4. **Fast Mode uses dedicated workers** for Distil-Whisper
5. **Standard transcriber is not invoked** when Fast Mode + parallel workers are enabled
6. **Workers load successfully from CDN**
7. **Clear console logging** showing which path is being used

### Expected Console Output

```
[App] Fast Mode with parallel workers - skipping standard transcriber model load
[App] 🚀 Using Fast Mode with parallel processing
[App] Starting Fast Mode transcription...
[FastWorker] Configured for CDN model downloading
[FastWorker] Remote download enabled: true
[FastWorker] Initializing worker, loading model: distil-whisper/distil-small.en
```

## Files Modified

1. `services/fast-mode/WorkerPoolManagerFast.ts` - Fixed worker loading to prevent webpack bundling
2. `public/transcriber-fast.worker.js` - Changed import to use CDN instead of node_modules
3. `app/page.tsx` - Fixed Fast Mode model loading logic + fixed file probing render loop
4. `contexts/TranscriberContext.tsx` - Added guard for concurrent loads
5. `components/fast-mode/FastModeInfoPopover.tsx` - Fixed button nesting hydration error
6. `FAST_MODE_FIX.md` - This documentation

## Related Files (No Changes Needed)

- `hooks/useTranscriberFast.ts` - Fast Mode hook (working correctly)
- `services/fast-mode/WorkerPoolManagerFast.ts` - Worker pool manager (working correctly)
- `public/transcriber-fast.worker.js` - Fast Mode worker (working correctly)
- `lib/featureFlags.ts` - Feature flags (correct defaults)

## Next Steps

1. Test the fix with a sample video file
2. Verify console logs show correct path being used
3. Monitor pending request count (should stay <10)
4. Confirm transcription completes successfully
5. If issues persist, check browser console for additional errors
