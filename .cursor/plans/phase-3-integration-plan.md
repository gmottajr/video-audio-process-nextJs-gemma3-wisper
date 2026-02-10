# Phase 3: Parallel Processing Integration Plan

**Status:** Ready to Start  
**Target:** 80%+ speedup via parallel chunk processing  
**Date:** February 8, 2026

## Current Status

### ✅ Already Built (Phase 3 Infrastructure)
- `services/fast-mode/ChunkManagerServiceFast.ts` - Audio chunking (30s, 3s overlap)
- `services/fast-mode/WorkerPoolManagerFast.ts` - Worker pool management
- `services/fast-mode/ParallelChunkProcessorFast.ts` - Parallel coordination
- `services/fast-mode/TimestampMergerFast.ts` - Result merging
- `services/fast-mode/MemoryMonitorFast.ts` - Memory monitoring
- `hooks/useTranscriberFast.ts` - React hook orchestration
- `components/fast-mode/FastModeProgressIndicator.tsx` - Progress UI
- `public/transcriber-fast.worker.js` - Fast mode worker
- `types/fast-mode.ts` - Type definitions
- `__tests__/unit/fast-mode/` - Unit tests

### ⚠️ Needs Integration
- Wire `useTranscriberFast` into main transcription flow
- Add Fast Mode worker initialization
- Connect progress indicators
- Add cancellation support
- Integration tests
- Performance benchmarks

## Integration Tasks

### Task 1: Wire useTranscriberFast into App
**File:** `app/page.tsx`
**Changes:**
1. Use `useTranscriberFast` when `transcriptionMode === 'fast'` and `ENABLE_PARALLEL_WORKERS === true`
2. Route transcription through fast path vs standard path
3. Connect progress callbacks
4. Handle cancellation

**Pseudo-code:**
```typescript
const fastTranscriber = useTranscriberFast();

const handleTranscribe = async (audioBlob: Blob) => {
  if (transcriptionMode === 'fast' && isFeatureEnabled('ENABLE_PARALLEL_WORKERS')) {
    // Fast path: parallel processing
    const audioData = await extractAudioData(audioBlob);
    await fastTranscriber.transcribe(audioData, duration);
    const result = fastTranscriber.result;
  } else {
    // Standard path: existing flow
    await processor.transcriber.transcribe(audioBlob);
  }
};
```

### Task 2: Create Fast Mode Worker
**File:** `public/transcriber-fast.worker.js`
**Status:** Already exists, verify it's properly configured

**Requirements:**
- Load Distil-Whisper model
- Handle chunk transcription requests
- Return ChunkResult format
- Support cancellation

### Task 3: Add Progress Indicator to UI
**File:** `components/states/InspectStateView.tsx` or `TranscriptionProgressScreen.tsx`
**Changes:**
1. Show `FastModeProgressIndicator` when fast mode is active
2. Display chunks completed, workers active, ETA
3. Show worker status badges

### Task 4: Add Cancellation Support
**Files:** `hooks/useTranscriberFast.ts`, `services/fast-mode/ParallelChunkProcessorFast.ts`
**Changes:**
1. Implement cancellation token pattern
2. Terminate workers on cancel
3. Clean up pending chunks
4. Update UI state

### Task 5: Integration Tests
**File:** `__tests__/integration/fast-mode/parallel-transcription.test.tsx` (NEW)
**Test Cases:**
1. Full pipeline: audio → chunks → parallel processing → merged result
2. Worker crash recovery
3. Cancellation mid-processing
4. Memory pressure handling
5. Progress reporting accuracy

### Task 6: Performance Benchmarks
**File:** `scripts/perf-benchmark-fast.ts` (already exists)
**Verify:**
1. Run benchmarks with 2 workers vs 1 worker
2. Measure speedup: target >= 35% (Phase 2) → 80%+ (Phase 3)
3. Compare against baseline
4. Document results

## Implementation Order

### Step 1: Wire Fast Path (30 min)
- [ ] Update `app/page.tsx` to route through `useTranscriberFast`
- [ ] Add conditional logic for fast vs standard mode
- [ ] Connect progress callbacks

### Step 2: UI Integration (20 min)
- [ ] Add `FastModeProgressIndicator` to processing screen
- [ ] Show worker status
- [ ] Display ETA

### Step 3: Cancellation (15 min)
- [ ] Implement cancel in `useTranscriberFast`
- [ ] Wire cancel button in UI
- [ ] Test cancellation flow

### Step 4: Testing (45 min)
- [ ] Write integration tests
- [ ] Run existing unit tests
- [ ] Manual testing with sample audio

### Step 5: Benchmarking (30 min)
- [ ] Run performance benchmarks
- [ ] Compare 1 worker vs 2 workers
- [ ] Document speedup achieved
- [ ] Verify >= 80% improvement target

### Step 6: Documentation (15 min)
- [ ] Update AGENTS.md with Phase 3 complete
- [ ] Document performance results
- [ ] Update README with Fast Mode instructions

## Success Criteria

- ✅ Fast Mode with parallel processing works end-to-end
- ✅ >= 80% speedup vs baseline (36min video → ~7min processing)
- ✅ All tests pass (unit + integration)
- ✅ Progress indicators show accurate status
- ✅ Cancellation works properly
- ✅ Memory usage stays within budget (1.5GB for 2 workers)
- ✅ No regressions in Standard Mode

## Risk Mitigation

1. **Memory Pressure**: MemoryMonitorFast will reduce workers if needed
2. **Worker Crashes**: WorkerPoolManagerFast re-queues to surviving workers
3. **Timeout**: Per-chunk timeout (2min) prevents hanging
4. **Quality**: Timestamp merging ensures no word splitting at boundaries

## Rollout Plan

1. **Development**: Enable via `ENABLE_PARALLEL_WORKERS: true` (already set)
2. **Testing**: Run benchmarks, verify quality
3. **Gradual Rollout**: Feature flag allows disabling if issues found
4. **Production**: Default enabled after validation

## Estimated Time

- **Integration**: 2 hours
- **Testing**: 1 hour
- **Documentation**: 30 minutes
- **Total**: ~3.5 hours

## Next Steps

1. Start with Task 1: Wire fast path into app
2. Verify worker is properly configured
3. Add progress UI
4. Test end-to-end
5. Run benchmarks
6. Document results
