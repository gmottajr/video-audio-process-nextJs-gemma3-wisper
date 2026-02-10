# Automatic Cache Recovery Implementation

## Problem
The WebLLM engine was getting stuck/corrupted during `engine.chat.completions.create()` calls, causing timeouts after 300 seconds. This happened because the IndexedDB cache or the engine instance entered a corrupted state.

## Solution
Implemented **automatic detection and recovery** when the engine hangs:

### 1. **Cache Clearing Function** (`clearWebLLMCache`)
- Automatically clears IndexedDB databases used by WebLLM:
  - `webllm/model` (main model storage)
  - `webllm/config` (config storage)  
  - `webllm/wasm` (WASM cache)
  - `web-llm-cache` (alternative cache)
- Also clears Cache API entries for WebLLM
- Located in: `public/enhancer.worker.js`

### 2. **Timeout Detection** (`withTimeout`)
- Wraps `engine.chat.completions.create()` calls with a **30-second timeout**
- Detects when the engine is hung (not responding)
- Implemented for both:
  - `enhanceTranscript()` - main transcript enhancement
  - `generateText()` - speaker identification & analysis

### 3. **Automatic Recovery Flow**
When the engine hangs:
1. **Detect**: 30-second timeout triggers
2. **Unload**: Attempts to unload the broken engine
3. **Clear**: Runs `clearWebLLMCache()` to delete corrupted data
4. **Reset**: Resets all worker state variables
5. **Notify**: Informs the UI with `ENGINE_CORRUPTED_AND_RESET` error
6. **User Action**: User can click "Enhance" again to re-download the model

### 4. **Manual Reset Button**
Added a **"Reset AI Engine & Clear Cache"** button that appears when:
- Enhancement times out
- Error message contains "timed out", "corrupted", or "hung"

Location: `components/states/DoneStateView.tsx`

The button calls `enhancer.resetEngine()` which:
- Cancels ongoing operations
- Sends reset command to worker
- Clears all state
- Forces cache deletion

### 5. **Enhanced Reset Function**
Updated `resetEngine()` in the worker to:
- Unload the engine gracefully
- Call `clearWebLLMCache()` to delete IndexedDB
- Reset all state variables
- Send progress messages to UI

## Files Modified

1. **`public/enhancer.worker.js`**
   - Added `clearWebLLMCache()` function
   - Added `withTimeout()` helper
   - Wrapped engine calls in timeout detection
   - Enhanced `resetEngine()` to clear cache
   - Auto-recovery on hang detection

2. **`contexts/EnhancerContext.tsx`**
   - Added `resetEngine()` method to context type
   - Implemented `resetEngine()` callback
   - Exposed to components via context

3. **`components/states/DoneStateView.tsx`**
   - Added "Reset AI Engine" button in error display
   - Button appears for timeout/corruption errors
   - Calls `enhancer.resetEngine()` on click

## How It Works

### Automatic Recovery (No User Action)
```
User clicks "Enhance" 
→ Worker starts processing
→ engine.chat.completions.create() hangs
→ 30s timeout triggers
→ Auto-recovery:
   - Unload engine
   - Clear IndexedDB cache
   - Reset state
   - Show error message
→ User clicks "Enhance" again
→ Model re-downloads (fresh cache)
→ Enhancement works! ✅
```

### Manual Recovery (User-Triggered)
```
Enhancement times out
→ Error message shows with "Reset Engine" button
→ User clicks "Reset AI Engine & Clear Cache"
→ Worker resets and clears cache
→ User clicks "Enhance"
→ Model re-downloads
→ Enhancement works! ✅
```

## Testing

To test the recovery:
1. **Trigger a timeout** (wait for 300s)
2. **Check console** for:
   - `[EnhancerWorker] Engine is hung! Attempting auto-recovery...`
   - `[EnhancerWorker] Clearing WebLLM cache...`
   - `[EnhancerWorker] Deleted database: webllm/model`
3. **Click "Enhance" again** - model should re-download
4. **Or click "Reset Engine" button** for manual reset

## Benefits

✅ **No manual browser actions required** - users don't need to clear storage  
✅ **Automatic detection** - catches hung engine calls within 30s  
✅ **Self-healing** - clears corruption and resets automatically  
✅ **User-friendly** - clear error messages and recovery buttons  
✅ **Prevents long waits** - 30s timeout vs 300s before  
✅ **Preserves other data** - only clears WebLLM cache, not entire browser storage  

## Limitations

- Model needs to be **re-downloaded** after cache clear (~1.5GB for Llama 3.2 1B)
- First use after reset will take longer
- Cannot recover from genuine WebGPU hardware failures (only cache corruption)

## Future Improvements

- Add telemetry to track how often recovery is needed
- Implement partial cache validation (fix vs full clear)
- Add cache health checks on startup
- Persist model files separately from IndexedDB for faster recovery





