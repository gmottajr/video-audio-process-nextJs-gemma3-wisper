# ADR-003: Parallel Worker Implementation for Fast Mode

**Date:** February 8, 2026  
**Status:** Accepted  
**Decision Makers:** Implementation Team

## Context

Fast Mode (Phase 2) achieves 50-80% improvement via Distil-Whisper model and disabled enhancements. Phase 3 targets additional gains via parallel chunk processing using multiple Web Workers.

Current transcription processes chunks sequentially in a single worker. To achieve >= 35% additional speedup, we need to process multiple chunks simultaneously across multiple workers.

## Decision

Use a **custom worker pool implementation** adapted from workerpool library patterns, without adding workerpool as a dependency.

## Rationale

### Why Custom Implementation?

1. **No External Dependency:** Avoids adding workerpool package (~50KB), keeping bundle size minimal
2. **Fine-Grained Control:** Custom implementation allows precise control over worker lifecycle, memory monitoring, and error recovery
3. **Browser-Specific Optimizations:** Can optimize for Chrome's `performance.memory` API while providing fallbacks for Firefox/Safari
4. **Simpler API:** Only need the specific features we use (pool init, task distribution, error recovery), not full workerpool feature set

### Why NOT workerpool Library?

1. **Bundle Size:** Additional dependency increases bundle size
2. **Over-Engineering:** workerpool provides features we don't need (thread pool, complex task scheduling)
3. **Less Control:** Harder to customize memory monitoring and browser-specific behavior

### Why NOT Comlink?

1. **No Built-in Pooling:** Comlink is RPC-like communication, doesn't provide worker pool management
2. **Would Need Custom Pool:** Would still need to build pool management on top of Comlink
3. **More Complex:** Adds abstraction layer without clear benefit

## Implementation Approach

### Worker Pool Manager

```typescript
class WorkerPoolManagerFast {
  private workers: Worker[] = [];
  private workerStatus: WorkerStatus[] = [];
  private taskQueue: AudioChunk[] = [];
  
  async initialize(workerCount: number): Promise<void>
  async processChunk(chunk: AudioChunk): Promise<ChunkResult>
  async terminate(): Promise<void>
}
```

### Task Distribution

- FIFO queue: All chunks queued upfront
- Round-robin distribution: Worker 1 gets chunk 0, Worker 2 gets chunk 1, Worker 1 gets chunk 2, etc.
- Dynamic load balancing: If worker crashes, redistribute remaining tasks

### Error Recovery

- Worker crash detection: Error message or timeout
- Re-queue failed chunk to another worker
- If all workers crash: Fall back to sequential processing (existing pipeline)

### Memory Monitoring

- Poll `performance.memory` (Chrome)
- Estimate memory usage (Firefox/Safari)
- Reduce worker count if threshold exceeded
- Enforce 1.5GB budget for 2-worker configuration

## Consequences

### Positive

- **Speedup:** ~1.8x additional speedup with 2 workers (on top of Distil-Whisper gains)
- **Control:** Fine-grained control over worker lifecycle and memory management
- **No Dependencies:** Keeps bundle size minimal
- **Browser Optimization:** Can optimize for Chrome while providing Firefox/Safari fallbacks

### Negative

- **Maintenance:** Custom implementation requires maintenance
- **Testing:** Need to test worker pool behavior thoroughly
- **Complexity:** More code to maintain than using a library

### Mitigation

- **Thorough Testing:** Comprehensive unit and integration tests
- **Documentation:** Clear documentation of worker pool behavior
- **Fallback:** Always fall back to sequential if parallel fails
- **Feature Flag:** Can disable parallel processing if issues arise

## Alternatives Considered

### 1. workerpool Library

**Pros:**
- Battle-tested library
- Handles edge cases
- Good documentation

**Cons:**
- Additional dependency (~50KB)
- More features than needed
- Less control over memory monitoring

**Decision:** Rejected - prefer custom implementation for control and bundle size

### 2. Comlink

**Pros:**
- Clean RPC-like API
- Good TypeScript support

**Cons:**
- No built-in pooling
- Would need custom pool on top
- Adds abstraction layer

**Decision:** Rejected - doesn't provide pooling, would still need custom implementation

### 3. Sequential Processing Only

**Pros:**
- Simpler implementation
- No worker pool complexity

**Cons:**
- Doesn't meet speedup target
- Underutilizes multi-core CPUs

**Decision:** Rejected - doesn't meet performance requirements

## Validation Criteria

This decision is validated when:

- [ ] Worker pool successfully processes chunks in parallel
- [ ] 2-worker configuration achieves >= 1.5x speedup vs sequential
- [ ] Memory usage stays under 1.5GB for 2-worker config
- [ ] Error recovery works (worker crash → re-queue)
- [ ] Fallback to sequential works if all workers crash
- [ ] All tests pass (unit, integration, performance)

## References

- workerpool library: https://github.com/josdejong/workerpool
- Transformers.js worker examples: https://github.com/xenova/transformers.js/tree/main/examples
- OpenAI Whisper chunking: https://github.com/openai/whisper/blob/main/whisper/transcribe.py
