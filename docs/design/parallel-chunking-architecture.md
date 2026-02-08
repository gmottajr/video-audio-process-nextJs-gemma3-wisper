# Parallel Audio Chunking Architecture

**Status:** In Progress  
**Author:** Implementation Team  
**Last Updated:** February 8, 2026

## Problem Statement

Current transcription achieves ~1.0x real-time factor (36min video = 36min processing). Target: >= 35% improvement while maintaining quality and privacy guarantees through parallel chunk processing.

## Architecture Overview

### High-Level Flow

```
Audio Input (Float32Array, 16kHz mono)
    ↓
Chunk Manager (30s chunks, 3s overlap)
    ↓
Worker Pool (2-4 workers, FIFO distribution)
    ↓
Parallel Processing (Distil-Whisper per worker)
    ↓
Timestamp Merger (sort, adjust, dedupe overlaps)
    ↓
Final Transcript
```

### Component Architecture

#### 1. ChunkManagerServiceFast

**Purpose:** Split audio into parallelizable chunks

**Algorithm:**
- Sample rate: 16000 Hz (fixed for Whisper)
- Chunk length: 30 seconds = 480,000 samples
- Overlap: 3 seconds = 48,000 samples
- Step size: 27 seconds = 432,000 samples

**Edge Cases:**
- Audio shorter than 30s: Single chunk, no overlap
- Last chunk smaller than overlap: Extend to end, no overlap

**Output:** Array of `AudioChunk` objects with metadata

#### 2. WorkerPoolManagerFast

**Purpose:** Manage Web Worker lifecycle and task distribution

**Responsibilities:**
- Initialize N workers (default: 2)
- Load Distil-Whisper model in each worker
- Distribute chunks via FIFO queue
- Track worker status (idle/busy/crashed)
- Handle crashes: re-queue to surviving worker
- Memory monitoring: reduce workers if pressure detected
- Graceful termination

**Pattern:** Adapted from workerpool library API design

#### 3. ParallelChunkProcessorFast

**Purpose:** Coordinate parallel chunk processing

**Responsibilities:**
- Accept chunks from ChunkManagerServiceFast
- Submit all chunks to WorkerPoolManagerFast
- Track completion (may be out-of-order)
- Emit progress events
- Handle timeouts (per-chunk: 2min, total: 30min)
- Collect all ChunkResults

**Progress Reporting:**
- Phase: initializing → processing → merging → complete
- Chunks completed / total
- ETA calculation based on completion rate

#### 4. TimestampMergerFast

**Purpose:** Merge out-of-order chunk results into single transcript

**Algorithm (adapted from OpenAI Whisper):**

1. **Sort by chunkIndex:** Ensure correct order regardless of completion order
2. **Adjust timestamps:** Add chunk startOffset to each segment timestamp
3. **Detect overlaps:** Compare last N words of chunk[i] with first N words of chunk[i+1]
4. **Deduplicate:** Keep segments from earlier chunk, remove duplicates from later chunk
5. **Merge adjacent:** Combine segments with gaps < 0.5 seconds

**Output:** Single `FastModeTranscriptionResult` with absolute timestamps

#### 5. MemoryMonitorFast

**Purpose:** Monitor memory usage and trigger scaling

**Implementation:**
- Poll `performance.memory` (Chrome only)
- Fallback estimation for Firefox/Safari
- Warn when usage > 80% of budget (1.5GB for 2 workers)
- Recommend worker reduction
- Track peak usage for reporting

## Memory Budget

### Per-Worker Breakdown

- Model (Distil-Whisper): ~166 MB (cached in IndexedDB after first load)
- Audio buffer (30s chunk): ~240 MB (480,000 samples × 4 bytes)
- Overhead: ~100 MB
- **Total per worker:** ~500 MB

### System Total

- **2 workers:** ~1.2 GB peak
- **4 workers:** ~2.4 GB peak (only on high-memory devices)

### Scaling Strategy

- Default: 2 workers
- If memory > 80% threshold: Reduce to 1 worker
- If all workers crash: Fall back to sequential processing

## Error Handling

### Worker Crashes

1. Detect crash via error message or timeout
2. Mark worker as crashed
3. Re-queue chunk to another worker
4. If all workers crash: Fall back to sequential (existing pipeline)

### Memory Pressure

1. Monitor `performance.memory` (Chrome) or estimate (Firefox/Safari)
2. If usage > 80% of budget: Reduce worker count
3. If still failing: Abort and suggest Standard Mode

### Timeouts

- Per-chunk timeout: 2 minutes
- Total timeout: 30 minutes
- On timeout: Abort processing, show error with "Try Standard Mode" option

## Performance Expectations

### Speedup Targets

- **Minimum:** >= 35% faster than Standard Mode
- **Target:** >= 50% faster than Standard Mode
- **With 2 workers:** ~1.8x speedup vs sequential (not perfect 2x due to overhead)

### Bottlenecks

- Model loading: First chunk per worker (cached after)
- Worker startup: One-time overhead
- Merging: Minimal overhead (< 5% of total time)
- Main bottleneck: Whisper inference (parallelized)

## Data Flow

### Chunk Creation

```
Full Audio (5 minutes = 4,800,000 samples)
    ↓
Chunk 0: [0-30s]     (480,000 samples)
Chunk 1: [27-57s]    (480,000 samples, 48,000 overlap)
Chunk 2: [54-84s]    (480,000 samples, 48,000 overlap)
...
Chunk 10: [270-300s] (480,000 samples, 48,000 overlap)
= 11 chunks total
```

### Parallel Processing

```
Worker 1: Chunk 0 → Chunk 2 → Chunk 4 → ...
Worker 2: Chunk 1 → Chunk 3 → Chunk 5 → ...

Results arrive out-of-order:
Chunk 3 completes first
Chunk 1 completes second
Chunk 0 completes third
...
```

### Merging

```
1. Sort by chunkIndex: [0, 1, 2, 3, ...]
2. Adjust timestamps: segment.start += chunk.startOffset
3. Detect overlaps: Compare chunk[i].end with chunk[i+1].start
4. Deduplicate: Remove duplicate segments
5. Merge adjacent: Combine segments with small gaps
```

## Browser Compatibility

| Browser | Worker Support | Memory API | Behavior |
|---------|---------------|------------|----------|
| Chrome 90+ | Full | Yes | Full functionality, dynamic scaling |
| Firefox 90+ | Full | No | No dynamic memory scaling, conservative defaults |
| Safari 15+ | Full | No | No dynamic memory scaling, conservative defaults |
| Edge 90+ | Full | Yes | Same as Chrome |

## References

- OpenAI Whisper `transcribe.py`: Chunking algorithm, overlap handling
- workerpool library: Worker pool API patterns
- Transformers.js examples: Worker communication patterns
- whisper.cpp: Job queue model, progress reporting
