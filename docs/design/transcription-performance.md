# Transcription Performance Optimization

**Status:** Phase 2 In Progress  
**Author:** Implementation Team  
**Last Updated:** February 8, 2026

## Overview

This document outlines the performance optimization strategy for MediaForge transcription, targeting >= 35% improvement through Fast Mode UI preset (Phase 2) and >= 80% improvement through parallel processing (Phase 3).

## Current Performance Baseline

- **Standard Mode:** ~1.0x real-time factor (36min video = 36min processing)
- **Bottleneck:** Whisper inference (~80% of total time)
- **Enhancement overhead:** +25-35% when enabled (normalization + compression)
- **Model loading:** One-time cost (~5-10s per model)

## Performance Targets

### Phase 2: Fast Mode UI (Target: 35-50% improvement)
- **Approach:** UI preset that auto-selects Distil-Whisper + disables enhancements
- **Speedup source:** Distil-Whisper is 5-6x faster than Whisper Small
- **Trade-offs:** English-only, sentence-level timestamps (no word-level precision)
- **Implementation:** Standard transcription flow with optimized model selection

### Phase 3: Parallel Processing (Target: 80%+ improvement)
- **Approach:** Parallel chunk processing with worker pool
- **Speedup source:** 2-4 workers processing chunks simultaneously
- **Architecture:** See `parallel-chunking-architecture.md`
- **Trade-offs:** Higher memory usage (~1.2GB for 2 workers)

## Phase 2: Fast Mode UI Implementation

### User Experience

1. **Mode Selection:** Radio button selector (Standard / Fast)
2. **Auto-configuration:** When Fast Mode selected:
   - Model: Auto-selects Distil-Whisper (`distil-whisper/distil-small.en`)
   - Enhancements: Disabled (no normalization, no compression)
   - Model selector: Disabled (locked to Distil-Whisper)
3. **Visual Indicators:**
   - "Beta" badge on Fast Mode option
   - "English Only" warning badge
   - Info popover explaining trade-offs

### Technical Implementation

#### Component Integration

```
InspectStateView
  ├─ TranscriptionModeSelector (when ENABLE_FAST_MODE flag enabled)
  ├─ ModelSelector (disabled when Fast Mode selected)
  └─ ActionSelector (auto-disables enhancements when Fast Mode selected)
```

#### Flow Control

1. User selects Fast Mode → `transcriptionMode` state set to `'fast'`
2. `useEffect` in `app/page.tsx` auto-loads Distil-Whisper model
3. `ActionSelector` detects Fast Mode → disables enhancement options
4. Standard transcription flow runs with Distil-Whisper (no parallel processing yet)

#### Code Changes

**Files Modified:**
- `app/page.tsx` - Mode state management, auto-model loading
- `components/states/InspectStateView.tsx` - Mode selector integration
- `components/ActionSelector.tsx` - Enhancement disabling logic
- `components/ModelSelector.tsx` - Disable when Fast Mode active

**Files Created:**
- `components/fast-mode/TranscriptionModeSelector.tsx` - Mode selection UI
- `components/fast-mode/FastModeInfoPopover.tsx` - User documentation
- `lib/featureFlags.ts` - Feature flag system

### Performance Expectations

**Phase 2 (Fast Mode UI):**
- Distil-Whisper: ~5-6x faster inference vs Whisper Small
- No enhancement overhead: Saves 25-35% processing time
- **Expected improvement:** 35-50% faster than Standard Mode with Whisper Small + enhancements

**Example:**
- Standard Mode (Small + enhancements): 36min video = 36min processing
- Fast Mode (Distil + no enhancements): 36min video = ~20-23min processing

## Phase 3: Parallel Processing (Future)

See `parallel-chunking-architecture.md` for detailed Phase 3 architecture.

**Key Components:**
- `ChunkManagerServiceFast` - Audio chunking (30s chunks, 3s overlap)
- `WorkerPoolManagerFast` - Worker pool management (2-4 workers)
- `ParallelChunkProcessorFast` - Parallel coordination
- `TimestampMergerFast` - Result merging with timestamp adjustment

**Expected improvement:** 80%+ faster than Standard Mode baseline

## Measurement & Validation

### Benchmarking

Performance benchmarks run via:
```bash
pnpm perf:benchmark:fast --label=baseline
pnpm perf:compare baseline.json results.json
```

### Test Fixtures

Audio test files in `test-fixtures/audio/`:
- `sample-5min-clean.wav` - Baseline clean test
- `sample-10min-noisy.wav` - Noise handling
- `sample-15min-podcast.wav` - Multi-speaker
- `sample-30min-lecture.wav` - Stress test

### Success Criteria

**Phase 2:**
- ✅ Fast Mode UI visible when feature flag enabled
- ✅ Distil-Whisper auto-selected when Fast Mode chosen
- ✅ Enhancements disabled when Fast Mode active
- ✅ >= 35% speedup vs Standard Mode (validated via benchmarks)

**Phase 3:**
- ✅ Parallel chunk processing functional
- ✅ Worker pool manages 2-4 workers efficiently
- ✅ Timestamp merging preserves accuracy
- ✅ >= 80% speedup vs Standard Mode baseline

## Privacy & Constraints

All optimizations maintain:
- ✅ 100% client-side processing (no data leaves browser)
- ✅ Offline-capable after model download
- ✅ Non-blocking (all processing in Web Workers)
- ✅ Test coverage >= 95% for new code

## References

- `AGENTS.md` - Project context and architecture
- `docs/design/parallel-chunking-architecture.md` - Phase 3 architecture
- `docs/design/adr-003-parallel-worker-implementation.md` - ADR for worker pool decision
- `docs/design/fast-mode-user-guide.md` - End-user documentation
