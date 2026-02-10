# Fast Mode UI Fixes

## Issues Fixed

### Issue 1: Progress Bars Never Update During Model Loading

**Problem:**
- Fast Mode workers weren't emitting progress events during model initialization
- The ModelLoadingScreen showed 0% progress throughout the entire loading process

**Root Cause:**
- `transcriber-fast.worker.js` didn't have a `progress_callback` configured for the pipeline
- WorkerPoolManagerFast wasn't forwarding progress messages to the UI

**Solution:**

1. **Added Progress Callback in Worker** (`transcriber-fast.worker.js`):
   ```javascript
   transcriber = await pipeline(
     'automatic-speech-recognition',
     MODEL_ID,
     {
       quantized: true,
       device: device,
       progress_callback: (progress) => {
         // Forward model loading progress
         self.postMessage({
           type: 'download-progress',
           requestId,
           data: {
             status: progress.status || 'progress',
             name: MODEL_ID,
             file: progress.file || 'model',
             progress: progress.progress || 0,
             loaded: progress.loaded || 0,
             total: progress.total || 0,
           },
         });
       },
     }
   );
   ```

2. **Added Progress Handler in WorkerPoolManagerFast**:
   ```typescript
   private progressCallback?: (progress: any) => void;

   constructor(config, progressCallback?) {
     this.progressCallback = progressCallback;
   }

   private handleWorkerMessage(event: MessageEvent): void {
     const { type, data } = event.data;

     // Handle progress messages
     if (type === 'download-progress') {
       if (this.progressCallback) {
         this.progressCallback(data);
       }
       return;
     }
     // ... rest of handler
   }
   ```

3. **Connected Progress to UI** (`useTranscriberFast.ts`):
   ```typescript
   const handleModelProgress = (progressData: any) => {
     setProgress(prev => ({
       ...prev,
       phase: 'initializing',
       percent: Math.round(progressData.progress || 0),
     }));
   };

   workerPoolRef.current = new WorkerPoolManagerFast(
     config,
     handleModelProgress // Pass progress callback
   );
   ```

**Result:**
- Progress bars now update in real-time during model loading
- Shows actual download/initialization progress (0-100%)
- Multiple workers show combined progress

---

### Issue 2: Processing Chunks During Model Loading Screen

**Problem:**
- Chunks were being processed while still showing the "Loading Model" screen
- User saw "Processing chunk X" logs but UI was stuck on model loading

**Root Cause:**
- Fast Mode overlay condition was too broad:
  ```typescript
  fastTranscriber.mode !== 'idle' &&
  fastTranscriber.mode !== 'complete' &&
  fastTranscriber.mode !== 'error'
  ```
- This showed the processing overlay during `initializing` phase
- Model loading screen and processing screen were fighting for display

**Solution:**

1. **Split UI Screens by Phase** (`app/page.tsx`):
   ```typescript
   {/* Fast Mode Model Loading Screen - ONLY during initializing */}
   {fastModeEnabled &&
     transcriptionMode === 'fast' &&
     fastTranscriber.mode === 'initializing' && (
       <ModelLoadingScreen
         progress={fastTranscriber.progress.percent}
         modelName="Distil-Whisper (Fast Mode)"
         onCancel={...}
       />
     )}

   {/* Fast Mode Processing Screen - ONLY during processing */}
   {fastModeEnabled &&
     transcriptionMode === 'fast' &&
     fastTranscriber.mode === 'processing' && (
       <div className="fixed inset-0 z-50 ...">
         {/* Processing UI */}
       </div>
     )}
   ```

2. **Clear Phase Transitions** (`useTranscriberFast.ts`):
   ```typescript
   // Phase 1: Initializing (load models)
   setMode('initializing');
   await workerPoolRef.current.initialize();

   // Phase 2: Processing (transcribe chunks)
   setMode('processing');
   const chunkResults = await processor.processChunks(chunks);

   // Phase 3: Merging (combine results)
   setMode('merging');
   const finalTranscript = merger.mergeChunks(chunkResults);

   // Phase 4: Complete
   setMode('complete');
   ```

3. **Added Logging for Debugging**:
   ```typescript
   console.log('[useTranscriberFast] Initializing worker pool...');
   console.log('[useTranscriberFast] Worker pool initialized');
   console.log('[useTranscriberFast] Creating audio chunks...');
   console.log('[useTranscriberFast] Starting parallel chunk processing...');
   ```

**Result:**
- Model loading screen shows ONLY during initialization
- Processing screen shows ONLY during chunk transcription
- Clean transitions between phases
- No more processing during loading screen

---

## Phase Flow

```
User clicks "Transcribe"
        ↓
[INITIALIZING Phase]
- Show: ModelLoadingScreen
- Action: Load Distil-Whisper models in all workers
- Progress: 0-100% (model download + compilation)
- Duration: 30-60s (first time), 5-10s (cached)
        ↓
[PROCESSING Phase]
- Show: Fast Mode Processing Screen
- Action: Transcribe audio chunks in parallel
- Progress: X/Y chunks completed
- Duration: Varies by audio length
        ↓
[MERGING Phase]
- Show: Fast Mode Processing Screen (same)
- Action: Merge chunk results, adjust timestamps
- Progress: 95-100%
- Duration: <1s
        ↓
[COMPLETE Phase]
- Show: Done State View
- Action: Display transcript
```

## Files Modified

1. `public/transcriber-fast.worker.js`
   - Added `progress_callback` to pipeline
   - Emit `download-progress` messages during model loading

2. `services/fast-mode/WorkerPoolManagerFast.ts`
   - Added `progressCallback` parameter to constructor
   - Handle `download-progress` messages in `handleWorkerMessage`

3. `hooks/useTranscriberFast.ts`
   - Added `handleModelProgress` callback
   - Pass callback to WorkerPoolManagerFast
   - Clear phase transitions with logging

4. `app/page.tsx`
   - Split Fast Mode UI into two screens:
     - ModelLoadingScreen for `initializing` phase
     - Processing overlay for `processing` phase

## Testing

To verify the fixes:

1. **Enable Fast Mode**:
   ```javascript
   localStorage.setItem('featureFlags', JSON.stringify({ ENABLE_FAST_MODE: true }))
   ```

2. **Clear browser cache** (to force model re-download):
   - Chrome: DevTools → Application → Storage → Clear site data

3. **Select a video and start Fast Mode transcription**

4. **Expected behavior**:
   - ✅ ModelLoadingScreen appears with "Loading Model..." title
   - ✅ Progress bar animates from 0% to 100%
   - ✅ Console shows: `[FastWorker] Using device: webgpu` (if GPU available)
   - ✅ Screen transitions to "Fast Mode Processing" when models loaded
   - ✅ Chunk processing begins ONLY after transition
   - ✅ Progress shows: "Processing chunk X (Y.Ys - Z.Zs)"

5. **Console output should look like**:
   ```
   [useTranscriberFast] Initializing worker pool...
   [FastWorker] Using device: webgpu
   [FastWorker] Model loaded successfully
   [useTranscriberFast] Worker pool initialized
   [useTranscriberFast] Creating audio chunks...
   [useTranscriberFast] Created 83 chunks
   [useTranscriberFast] Starting parallel chunk processing...
   [FastWorker] Processing chunk 0 (0.0s - 60.0s)
   [FastWorker] Processing chunk 1 (57.0s - 117.0s)
   ...
   ```

## Performance Impact

- **Model Loading**: No performance change, just visible progress now
- **Chunk Processing**: No change, still parallel with queue
- **UI Responsiveness**: Improved - clear feedback at each phase

## Known Limitations

1. **Progress granularity**: Model loading progress depends on Transformers.js callbacks
2. **Multiple workers**: Progress shows combined/average across all workers
3. **Cached models**: Very fast loading (5-10s) may make progress bar flash quickly
