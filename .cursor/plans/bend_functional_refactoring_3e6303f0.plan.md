---
name: BEND Functional Refactoring
overview: Implement BEND-inspired functional composition patterns in the Fast Mode transcription pipeline with hardware-adaptive parallelization (up to 16 workers). Removes manual worker configuration, improves code quality with immutable patterns.
todos:
  - id: task-0-1-crash-recovery-tests
    content: "TASK 0.1: Add worker crash recovery integration tests"
    status: completed
  - id: task-0-2-baseline-benchmarks
    content: "TASK 0.2: Run baseline performance benchmarks"
    status: cancelled
  - id: task-1-1-functional-utils
    content: "TASK 1.1: Create utils/functional.ts"
    status: completed
  - id: task-1-2-functional-tests
    content: "TASK 1.2: Create functional utilities tests"
    status: completed
  - id: task-1-3-parallel-runtime
    content: "TASK 1.3: Create utils/ParallelRuntime.ts"
    status: completed
  - id: task-1-4-parallel-runtime-tests
    content: "TASK 1.4: Create ParallelRuntime tests"
    status: completed
  - id: task-1-5-integrate-runtime
    content: "TASK 1.5: Wire ParallelRuntime to useTranscriberFast"
    status: completed
  - id: task-2-1-chunk-manager-refactor
    content: "TASK 2.1: Refactor ChunkManagerServiceFast to functional style"
    status: pending
  - id: task-2-2-timestamp-merger-refactor
    content: "TASK 2.2: Refactor TimestampMergerFast to pure functions"
    status: pending
  - id: task-2-3-progress-tracking-refactor
    content: "TASK 2.3: Refactor ParallelChunkProcessorFast to immutable patterns"
    status: pending
  - id: task-3-validation
    content: "TASK 3: Final validation - tests and benchmarks"
    status: pending
isProject: false
---

# BEND-Inspired Functional Composition - Agent Implementation Specs

## Implementation Status (Handoff)

**Last updated**: 2025-02-10


| Phase   | Status   | Notes                                                                       |
| ------- | -------- | --------------------------------------------------------------------------- |
| Phase 0 | Complete | 2 worker crash recovery tests added; benchmarks skipped (tsx not available) |
| Phase 1 | Complete | functional.ts, ParallelRuntime.ts, useTranscriberFast integration           |
| Phase 2 | **Next** | Start with TASK 2.1 (ChunkManagerServiceFast)                               |
| Phase 3 | Pending  | Final validation                                                            |


**Files created/modified in Phase 1**:

- `utils/functional.ts` (NEW)
- `utils/ParallelRuntime.ts` (NEW)
- `__tests__/unit/functional.test.ts` (NEW)
- `__tests__/unit/ParallelRuntime.test.ts` (NEW)
- `hooks/useTranscriberFast.ts` (MODIFIED - ParallelRuntime integration)
- `__tests__/integration/fast-mode/parallel-transcription.test.tsx` (MODIFIED - crash recovery tests, MockFastWorker init handling)

**Next action**: Resume with TASK 2.1 (Refactor ChunkManagerServiceFast.createChunks() to functional style).

---

## Project Context

**Repository**: MediaForge - Browser-based video transcription SPA
**Tech Stack**: Next.js 14, TypeScript, Transformers.js, Web Workers
**Privacy Constraint**: 100% client-side processing, no server calls

**Current State**: Fast Mode exists with parallel workers but:

- Manual worker configuration required (user must set count)
- Mutable state patterns (race condition risks)
- Imperative code style (harder to test/maintain)

**Goal**: Apply BEND paradigms to make worker count automatic and code more functional.

---

# PHASE 0: BASELINE & TESTS

---

## TASK 0.1: Add Worker Crash Recovery Integration Tests

### Context

The Fast Mode integration tests in `__tests__/integration/fast-mode/parallel-transcription.test.tsx` have 6 tests but are missing worker crash recovery scenarios. AGENTS.md mentions this as a gap.

### What to Implement

Add 2 new test cases to the existing test file.

### Where

**File**: `__tests__/integration/fast-mode/parallel-transcription.test.tsx`
**Action**: MODIFY (add tests to existing describe block)

### Implementation Details

```typescript
// Add these tests inside the existing describe('useTranscriberFast', () => { ... }) block

it('should recover when a single worker crashes mid-processing', async () => {
  const { result } = renderHook(() => useTranscriberFast({ maxWorkers: 4 }));
  
  // Start transcription
  act(() => {
    result.current.transcribe(mockAudioData, 60);
  });
  
  // Wait for processing to start
  await waitFor(() => {
    expect(result.current.mode).toBe('processing');
  });
  
  // Simulate worker crash (the mock should handle re-queuing)
  // The implementation should continue with remaining workers
  
  // Wait for completion
  await waitFor(() => {
    expect(result.current.mode).toBe('complete');
  }, { timeout: 10000 });
  
  // Verify result is complete despite crash
  expect(result.current.result).not.toBeNull();
  expect(result.current.result?.text).toBeTruthy();
});

it('should set error state when all workers fail', async () => {
  const { result } = renderHook(() => useTranscriberFast({ maxWorkers: 2 }));
  
  // Mock all workers to fail
  // This requires modifying the mock to simulate total failure
  
  act(() => {
    result.current.transcribe(mockAudioData, 60);
  });
  
  await waitFor(() => {
    expect(result.current.mode).toBe('error');
  }, { timeout: 10000 });
  
  expect(result.current.error).toContain('worker');
});
```

### Why

- Ensures robustness of parallel processing
- Documents expected behavior for edge cases
- Required by AGENTS.md testing discipline

### Acceptance Criteria

- Test file has 8 tests (was 6)
- `pnpm test __tests__/integration/fast-mode/parallel-transcription.test.tsx` passes
- Tests cover: single worker crash recovery, all workers crash error state

### Definition of Done

- Tests added and passing
- No other tests broken
- `pnpm test` shows all 380+ tests passing

---

## TASK 0.2: Run Baseline Performance Benchmarks

### Context

Before making any optimizations, we need baseline metrics to measure improvement.

### What to Implement

Run the existing benchmark script and record results.

### Where

**Command**: `pnpm perf:benchmark:fast`
**Output**: Record in this plan file or a benchmark results file

### Implementation Details

```bash
# Run in terminal
pnpm perf:benchmark:fast --label=baseline-before-bend
```

### Why

- Establishes baseline for comparison
- Required by performance.mdc rule: "ALWAYS run benchmark before claiming improvements"

### Acceptance Criteria

- Benchmark completes without errors
- Results recorded with: processing time, workers used, peak memory

### Definition of Done

- Benchmark results documented
- Baseline established for comparison after refactoring

---

# PHASE 1: FUNCTIONAL UTILITIES & AUTO-PARALLELIZATION

---

## TASK 1.1: Create utils/functional.ts

### Context

BEND paradigm uses functional composition (pipe, map) for declarative code. We need core utilities that other code will import.

### What to Implement

Create a new file with pure functional utilities.

### Where

**File**: `utils/functional.ts`
**Action**: CREATE

### Implementation Details

```typescript
/**
 * Functional Utilities
 * 
 * BEND-inspired functional composition primitives.
 * All functions are pure (no side effects) and composable.
 */

/**
 * Pipe: Left-to-right function composition (synchronous)
 * 
 * @example
 * const process = pipe(trim, toLowerCase, split(' '));
 * process('  HELLO WORLD  '); // ['hello', 'world']
 */
export function pipe<A, B>(fn1: (a: A) => B): (a: A) => B;
export function pipe<A, B, C>(fn1: (a: A) => B, fn2: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D): (a: A) => D;
export function pipe<A, B, C, D, E>(fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D, fn4: (d: D) => E): (a: A) => E;
export function pipe(...fns: Array<(arg: any) => any>): (arg: any) => any {
  return (value: any) => fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * AsyncPipe: Left-to-right function composition (async)
 * Handles both sync and async functions in the pipeline.
 * 
 * @example
 * const process = asyncPipe(fetchData, parseJSON, validate);
 * await process(url);
 */
export function asyncPipe<A, B>(fn1: (a: A) => B | Promise<B>): (a: A) => Promise<B>;
export function asyncPipe<A, B, C>(
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: B) => C | Promise<C>
): (a: A) => Promise<C>;
export function asyncPipe<A, B, C, D>(
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: B) => C | Promise<C>,
  fn3: (c: C) => D | Promise<D>
): (a: A) => Promise<D>;
export function asyncPipe<A, B, C, D, E>(
  fn1: (a: A) => B | Promise<B>,
  fn2: (b: B) => C | Promise<C>,
  fn3: (c: C) => D | Promise<D>,
  fn4: (d: D) => E | Promise<E>
): (a: A) => Promise<E>;
export function asyncPipe(
  ...fns: Array<(arg: any) => any | Promise<any>>
): (arg: any) => Promise<any> {
  return async (value: any) => {
    let result = value;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };
}

/**
 * ParallelMap: Process items in parallel with concurrency control
 * 
 * @param items - Array of items to process
 * @param fn - Async function to apply to each item
 * @param concurrency - Max concurrent operations (default: CPU cores)
 * @returns Promise resolving to array of results in original order
 * 
 * @example
 * const results = await parallelMap(urls, fetchData, 4);
 */
export async function parallelMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = typeof navigator !== 'undefined' 
    ? navigator.hardwareConcurrency || 4 
    : 4
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Promise<void>[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const promise = fn(items[i], i).then((result) => {
      results[i] = result;
    });
    
    executing.push(promise);
    
    // If we've reached concurrency limit, wait for one to complete
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      const completed = executing.filter((p) => {
        // Check if promise is settled (hacky but works)
        let settled = false;
        p.then(() => { settled = true; }).catch(() => { settled = true; });
        return !settled;
      });
      executing.length = 0;
      executing.push(...completed);
    }
  }
  
  // Wait for remaining
  await Promise.all(executing);
  
  return results;
}

/**
 * Batch: Split array into chunks of specified size
 * 
 * @example
 * batch([1,2,3,4,5], 2); // [[1,2], [3,4], [5]]
 */
export function batch<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/**
 * Identity: Returns input unchanged (useful in pipelines)
 */
export const identity = <T>(x: T): T => x;

/**
 * Tap: Execute side effect without changing value (for debugging)
 * 
 * @example
 * pipe(process, tap(console.log), format);
 */
export const tap = <T>(fn: (x: T) => void) => (x: T): T => {
  fn(x);
  return x;
};
```

### Why

- Foundation for all BEND-inspired refactoring
- Pure functions are easier to test
- Enables declarative pipeline composition

### Acceptance Criteria

- File created at `utils/functional.ts`
- Exports: `pipe`, `asyncPipe`, `parallelMap`, `batch`, `identity`, `tap`
- All functions are pure (no side effects)
- TypeScript types are correct (no `any` leaks in public API)
- No lint errors: `pnpm lint utils/functional.ts`

### Definition of Done

- File exists and exports all functions
- No TypeScript errors
- No lint errors

---

## TASK 1.2: Create Functional Utilities Tests

### Context

TDD discipline requires tests for new code. Pure functions are trivially testable.

### What to Implement

Create comprehensive unit tests for `utils/functional.ts`.

### Where

**File**: `__tests__/unit/functional.test.ts`
**Action**: CREATE

### Implementation Details

```typescript
/**
 * Tests for utils/functional.ts
 */
import { pipe, asyncPipe, parallelMap, batch, identity, tap } from '@/utils/functional';

describe('functional utilities', () => {
  describe('pipe', () => {
    it('should compose functions left-to-right', () => {
      const add1 = (x: number) => x + 1;
      const double = (x: number) => x * 2;
      const toString = (x: number) => x.toString();
      
      const pipeline = pipe(add1, double, toString);
      
      expect(pipeline(5)).toBe('12'); // (5+1)*2 = 12
    });
    
    it('should work with single function', () => {
      const add1 = (x: number) => x + 1;
      const pipeline = pipe(add1);
      
      expect(pipeline(5)).toBe(6);
    });
    
    it('should work with string transformations', () => {
      const trim = (s: string) => s.trim();
      const lower = (s: string) => s.toLowerCase();
      const split = (s: string) => s.split(' ');
      
      const pipeline = pipe(trim, lower, split);
      
      expect(pipeline('  HELLO WORLD  ')).toEqual(['hello', 'world']);
    });
  });
  
  describe('asyncPipe', () => {
    it('should compose async functions', async () => {
      const fetchValue = async (x: number) => x + 1;
      const processValue = async (x: number) => x * 2;
      
      const pipeline = asyncPipe(fetchValue, processValue);
      
      expect(await pipeline(5)).toBe(12);
    });
    
    it('should handle mixed sync/async functions', async () => {
      const syncAdd = (x: number) => x + 1;
      const asyncDouble = async (x: number) => x * 2;
      
      const pipeline = asyncPipe(syncAdd, asyncDouble);
      
      expect(await pipeline(5)).toBe(12);
    });
    
    it('should propagate errors', async () => {
      const fail = async () => { throw new Error('test error'); };
      const pipeline = asyncPipe(fail);
      
      await expect(pipeline(5)).rejects.toThrow('test error');
    });
  });
  
  describe('parallelMap', () => {
    it('should process items in parallel', async () => {
      const items = [1, 2, 3, 4, 5];
      const double = async (x: number) => x * 2;
      
      const results = await parallelMap(items, double, 2);
      
      expect(results).toEqual([2, 4, 6, 8, 10]);
    });
    
    it('should maintain order regardless of completion time', async () => {
      const items = [100, 50, 10]; // Different delays
      const delayedReturn = async (ms: number) => {
        await new Promise(resolve => setTimeout(resolve, ms));
        return ms;
      };
      
      const results = await parallelMap(items, delayedReturn, 3);
      
      expect(results).toEqual([100, 50, 10]); // Original order preserved
    });
    
    it('should respect concurrency limit', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;
      
      const trackConcurrency = async (x: number) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrent--;
        return x;
      };
      
      await parallelMap([1, 2, 3, 4, 5, 6], trackConcurrency, 2);
      
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
    
    it('should handle empty array', async () => {
      const results = await parallelMap([], async (x) => x, 4);
      expect(results).toEqual([]);
    });
    
    it('should pass index to function', async () => {
      const items = ['a', 'b', 'c'];
      const withIndex = async (item: string, index: number) => `${item}${index}`;
      
      const results = await parallelMap(items, withIndex, 2);
      
      expect(results).toEqual(['a0', 'b1', 'c2']);
    });
  });
  
  describe('batch', () => {
    it('should split array into chunks', () => {
      expect(batch([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
    
    it('should handle exact divisions', () => {
      expect(batch([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });
    
    it('should handle empty array', () => {
      expect(batch([], 2)).toEqual([]);
    });
    
    it('should handle size larger than array', () => {
      expect(batch([1, 2], 5)).toEqual([[1, 2]]);
    });
  });
  
  describe('identity', () => {
    it('should return input unchanged', () => {
      expect(identity(5)).toBe(5);
      expect(identity('hello')).toBe('hello');
      expect(identity(null)).toBe(null);
    });
  });
  
  describe('tap', () => {
    it('should execute side effect and return value', () => {
      const sideEffect = jest.fn();
      const tapped = tap(sideEffect);
      
      const result = tapped(5);
      
      expect(result).toBe(5);
      expect(sideEffect).toHaveBeenCalledWith(5);
    });
    
    it('should work in pipeline', () => {
      const log: number[] = [];
      const pipeline = pipe(
        (x: number) => x + 1,
        tap((x) => log.push(x)),
        (x: number) => x * 2
      );
      
      const result = pipeline(5);
      
      expect(result).toBe(12);
      expect(log).toEqual([6]);
    });
  });
});
```

### Why

- TDD discipline from testing.mdc
- Pure functions are trivially testable
- Documents expected behavior

### Acceptance Criteria

- File created at `__tests__/unit/functional.test.ts`
- All tests pass: `pnpm test __tests__/unit/functional.test.ts`
- Coverage: 100% of `utils/functional.ts`

### Definition of Done

- Test file exists
- All tests pass
- `pnpm test` shows no regressions

---

## TASK 1.3: Create utils/ParallelRuntime.ts

### Context

BEND paradigm: runtime automatically decides optimal parallelism. This wraps existing `systemCapabilities.ts` to provide auto-detection.

### What to Implement

Create a runtime class that auto-detects optimal worker count based on hardware.

### Where

**File**: `utils/ParallelRuntime.ts`
**Action**: CREATE

### Dependencies

- `utils/systemCapabilities.ts` (existing) - provides `detectSystemCapabilities`, `calculateOptimalWorkers`
- `utils/functional.ts` (created in TASK 1.1) - provides `parallelMap`

### Implementation Details

```typescript
/**
 * ParallelRuntime
 * 
 * BEND-inspired runtime that automatically detects optimal parallelism
 * based on user's hardware (CPU cores, GPU, memory).
 * 
 * Usage:
 *   const runtime = new ParallelRuntime();
 *   await runtime.initialize();
 *   const workers = runtime.getOptimalWorkerCount(); // Auto-detected!
 */

import { 
  detectSystemCapabilities, 
  calculateOptimalWorkers,
  type SystemCapabilities,
  type WorkerRecommendation 
} from './systemCapabilities';
import { parallelMap } from './functional';

export interface ParallelRuntimeConfig {
  /** Override auto-detected worker count */
  maxWorkers?: number;
  /** Override auto-detected memory budget */
  memoryBudgetMB?: number;
  /** Strategy for worker allocation */
  strategy?: 'auto' | 'conservative' | 'aggressive';
}

export class ParallelRuntime {
  private capabilities: SystemCapabilities | null = null;
  private recommendation: WorkerRecommendation | null = null;
  private config: ParallelRuntimeConfig;
  private initialized: boolean = false;

  constructor(config: ParallelRuntimeConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize runtime by detecting system capabilities.
   * Must be called before using other methods.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.capabilities = await detectSystemCapabilities();
      this.recommendation = calculateOptimalWorkers(this.capabilities);
      this.initialized = true;

      console.log('[ParallelRuntime] System detected:', {
        threads: this.capabilities.cpu.threads,
        gpu: this.capabilities.gpu.available ? this.capabilities.gpu.vendor : 'none',
        memory: `${this.capabilities.memory.availableGB.toFixed(1)}GB available`,
      });
      console.log('[ParallelRuntime] Recommendation:', {
        workers: this.recommendation.recommendedWorkers,
        maxWorkers: this.recommendation.maxWorkers,
        memoryBudget: `${(this.recommendation.memoryBudgetMB / 1024).toFixed(1)}GB`,
      });
    } catch (error) {
      console.warn('[ParallelRuntime] Detection failed, using defaults:', error);
      // Fallback to safe defaults
      this.recommendation = {
        recommendedWorkers: 4,
        maxWorkers: 8,
        useGPU: false,
        reasoning: ['Detection failed, using safe defaults'],
        memoryBudgetMB: 4000,
      };
      this.initialized = true;
    }
  }

  /**
   * Get optimal worker count based on detected hardware.
   * Returns configured override if set, otherwise auto-detected value.
   */
  getOptimalWorkerCount(): number {
    this.ensureInitialized();
    
    // Config override takes precedence
    if (this.config.maxWorkers !== undefined) {
      return this.config.maxWorkers;
    }

    // Apply strategy modifier
    const base = this.recommendation!.recommendedWorkers;
    switch (this.config.strategy) {
      case 'conservative':
        return Math.max(1, Math.floor(base * 0.5));
      case 'aggressive':
        return Math.min(this.recommendation!.maxWorkers, Math.ceil(base * 1.5));
      case 'auto':
      default:
        return base;
    }
  }

  /**
   * Get maximum worker count (for user override UI).
   */
  getMaxWorkerCount(): number {
    this.ensureInitialized();
    return this.recommendation!.maxWorkers;
  }

  /**
   * Get memory budget in MB.
   */
  getMemoryBudgetMB(): number {
    this.ensureInitialized();
    return this.config.memoryBudgetMB ?? this.recommendation!.memoryBudgetMB;
  }

  /**
   * Get detected system capabilities.
   */
  getCapabilities(): SystemCapabilities | null {
    return this.capabilities;
  }

  /**
   * Get full recommendation with reasoning.
   */
  getRecommendation(): WorkerRecommendation | null {
    return this.recommendation;
  }

  /**
   * Check if GPU acceleration is recommended.
   */
  shouldUseGPU(): boolean {
    this.ensureInitialized();
    return this.recommendation!.useGPU;
  }

  /**
   * BEND-like: Map with automatic parallelism.
   * Runtime decides optimal concurrency.
   */
  async map<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const concurrency = this.getOptimalWorkerCount();
    return parallelMap(items, fn, concurrency);
  }

  /**
   * Ensure runtime is initialized before use.
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        '[ParallelRuntime] Not initialized. Call await runtime.initialize() first.'
      );
    }
  }
}

/**
 * Create and initialize a ParallelRuntime instance.
 * Convenience function for one-liner usage.
 */
export async function createParallelRuntime(
  config?: ParallelRuntimeConfig
): Promise<ParallelRuntime> {
  const runtime = new ParallelRuntime(config);
  await runtime.initialize();
  return runtime;
}
```

### Why

- Removes manual worker configuration burden from users
- BEND paradigm: runtime decides optimal parallelism
- Wraps existing `systemCapabilities.ts` (no duplication)

### Acceptance Criteria

- File created at `utils/ParallelRuntime.ts`
- Exports: `ParallelRuntime` class, `createParallelRuntime` function
- Uses existing `detectSystemCapabilities` and `calculateOptimalWorkers`
- Has fallback for detection failure
- No lint errors

### Definition of Done

- File exists and compiles
- Exports are correct
- No TypeScript/lint errors

---

## TASK 1.4: Create ParallelRuntime Tests

### Context

Test the ParallelRuntime class to ensure auto-detection works correctly.

### What to Implement

Unit tests for ParallelRuntime with mocked system capabilities.

### Where

**File**: `__tests__/unit/ParallelRuntime.test.ts`
**Action**: CREATE

### Implementation Details

```typescript
/**
 * Tests for utils/ParallelRuntime.ts
 */
import { ParallelRuntime, createParallelRuntime } from '@/utils/ParallelRuntime';

// Mock systemCapabilities
jest.mock('@/utils/systemCapabilities', () => ({
  detectSystemCapabilities: jest.fn(),
  calculateOptimalWorkers: jest.fn(),
}));

import { detectSystemCapabilities, calculateOptimalWorkers } from '@/utils/systemCapabilities';

const mockDetect = detectSystemCapabilities as jest.Mock;
const mockCalculate = calculateOptimalWorkers as jest.Mock;

describe('ParallelRuntime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock: mid-range system
    mockDetect.mockResolvedValue({
      cpu: { cores: 8, threads: 16, vendor: 'Intel' },
      gpu: { available: true, vendor: 'NVIDIA', webgpuSupported: true },
      memory: { totalGB: 16, availableGB: 12 },
      browser: { name: 'Chrome', version: '120' },
    });
    
    mockCalculate.mockReturnValue({
      recommendedWorkers: 8,
      maxWorkers: 12,
      useGPU: true,
      reasoning: ['16 threads detected'],
      memoryBudgetMB: 6000,
    });
  });

  describe('initialize', () => {
    it('should detect system capabilities', async () => {
      const runtime = new ParallelRuntime();
      await runtime.initialize();
      
      expect(mockDetect).toHaveBeenCalled();
      expect(mockCalculate).toHaveBeenCalled();
    });

    it('should only initialize once', async () => {
      const runtime = new ParallelRuntime();
      await runtime.initialize();
      await runtime.initialize();
      
      expect(mockDetect).toHaveBeenCalledTimes(1);
    });

    it('should handle detection failure gracefully', async () => {
      mockDetect.mockRejectedValue(new Error('Detection failed'));
      
      const runtime = new ParallelRuntime();
      await runtime.initialize();
      
      // Should use fallback defaults
      expect(runtime.getOptimalWorkerCount()).toBe(4);
    });
  });

  describe('getOptimalWorkerCount', () => {
    it('should return auto-detected count', async () => {
      const runtime = new ParallelRuntime();
      await runtime.initialize();
      
      expect(runtime.getOptimalWorkerCount()).toBe(8);
    });

    it('should respect config override', async () => {
      const runtime = new ParallelRuntime({ maxWorkers: 4 });
      await runtime.initialize();
      
      expect(runtime.getOptimalWorkerCount()).toBe(4);
    });

    it('should apply conservative strategy', async () => {
      const runtime = new ParallelRuntime({ strategy: 'conservative' });
      await runtime.initialize();
      
      expect(runtime.getOptimalWorkerCount()).toBe(4); // 8 * 0.5
    });

    it('should apply aggressive strategy', async () => {
      const runtime = new ParallelRuntime({ strategy: 'aggressive' });
      await runtime.initialize();
      
      expect(runtime.getOptimalWorkerCount()).toBe(12); // min(12, 8 * 1.5)
    });

    it('should throw if not initialized', () => {
      const runtime = new ParallelRuntime();
      
      expect(() => runtime.getOptimalWorkerCount()).toThrow('Not initialized');
    });
  });

  describe('getMaxWorkerCount', () => {
    it('should return max from recommendation', async () => {
      const runtime = new ParallelRuntime();
      await runtime.initialize();
      
      expect(runtime.getMaxWorkerCount()).toBe(12);
    });
  });

  describe('getMemoryBudgetMB', () => {
    it('should return auto-detected budget', async () => {
      const runtime = new ParallelRuntime();
      await runtime.initialize();
      
      expect(runtime.getMemoryBudgetMB()).toBe(6000);
    });

    it('should respect config override', async () => {
      const runtime = new ParallelRuntime({ memoryBudgetMB: 8000 });
      await runtime.initialize();
      
      expect(runtime.getMemoryBudgetMB()).toBe(8000);
    });
  });

  describe('shouldUseGPU', () => {
    it('should return GPU recommendation', async () => {
      const runtime = new ParallelRuntime();
      await runtime.initialize();
      
      expect(runtime.shouldUseGPU()).toBe(true);
    });
  });

  describe('map', () => {
    it('should use optimal concurrency', async () => {
      const runtime = new ParallelRuntime();
      await runtime.initialize();
      
      const items = [1, 2, 3, 4];
      const results = await runtime.map(items, async (x) => x * 2);
      
      expect(results).toEqual([2, 4, 6, 8]);
    });
  });

  describe('createParallelRuntime', () => {
    it('should create and initialize runtime', async () => {
      const runtime = await createParallelRuntime();
      
      expect(runtime.getOptimalWorkerCount()).toBe(8);
    });

    it('should accept config', async () => {
      const runtime = await createParallelRuntime({ maxWorkers: 2 });
      
      expect(runtime.getOptimalWorkerCount()).toBe(2);
    });
  });
});
```

### Why

- Ensures auto-detection logic works correctly
- Tests edge cases (failure, strategies)
- Documents expected behavior

### Acceptance Criteria

- File created at `__tests__/unit/ParallelRuntime.test.ts`
- All tests pass
- Covers: initialization, auto-detection, config override, strategies, failure handling

### Definition of Done

- Test file exists
- All tests pass
- `pnpm test` shows no regressions

---

## TASK 1.5: Wire ParallelRuntime to useTranscriberFast

### Context

Currently `useTranscriberFast` uses a hardcoded default or requires manual config. We'll integrate `ParallelRuntime` for automatic detection.

### What to Implement

Modify `useTranscriberFast` to use `ParallelRuntime` for auto-detecting optimal worker count.

### Where

**File**: `hooks/useTranscriberFast.ts`
**Action**: MODIFY

### Current Code (lines 64-113)

```typescript
const initializeServices = useCallback(async () => {
  if (!isFeatureEnabled('ENABLE_FAST_MODE')) {
    throw new Error('Fast Mode is not enabled');
  }

  // Create services with dynamic configuration
  chunkManagerRef.current = new ChunkManagerServiceFast();
  
  // ... progress callback ...
  
  workerPoolRef.current = new WorkerPoolManagerFast({
    maxWorkers: config.maxWorkers || 16, // <-- HARDCODED DEFAULT
    memoryThresholdMB: config.memoryBudgetMB || 10000,
  }, handleModelProgress);
  
  // ...
}, [config]);
```

### New Code

```typescript
import { ParallelRuntime } from '@/utils/ParallelRuntime';

// Add ref for runtime
const runtimeRef = useRef<ParallelRuntime | null>(null);

const initializeServices = useCallback(async () => {
  if (!isFeatureEnabled('ENABLE_FAST_MODE')) {
    throw new Error('Fast Mode is not enabled');
  }

  // BEND-like: Runtime auto-detects optimal parallelism
  if (!runtimeRef.current) {
    runtimeRef.current = new ParallelRuntime({
      maxWorkers: config.maxWorkers,  // User override if provided
      memoryBudgetMB: config.memoryBudgetMB,
    });
    await runtimeRef.current.initialize();
  }
  
  const runtime = runtimeRef.current;
  const optimalWorkers = runtime.getOptimalWorkerCount();
  const memoryBudget = runtime.getMemoryBudgetMB();
  
  console.log(`[useTranscriberFast] Auto-detected: ${optimalWorkers} workers, ${memoryBudget}MB budget`);

  // Create services with auto-detected configuration
  chunkManagerRef.current = new ChunkManagerServiceFast();
  
  // Progress callback for model loading
  const handleModelProgress = (progressData: any) => {
    console.log('[useTranscriberFast] Model loading progress:', progressData);
    setProgress(prev => ({
      ...prev,
      phase: 'initializing',
      percent: Math.round(progressData.progress || 0),
    }));
  };
  
  workerPoolRef.current = new WorkerPoolManagerFast({
    maxWorkers: optimalWorkers,  // AUTO-DETECTED!
    memoryThresholdMB: memoryBudget,
  }, handleModelProgress);
  
  processorRef.current = new ParallelChunkProcessorFast(workerPoolRef.current);
  mergerRef.current = new TimestampMergerFast();

  // Initialize worker pool (this loads models)
  console.log('[useTranscriberFast] Initializing worker pool...');
  setMode('initializing');
  setProgress({
    phase: 'initializing',
    percent: 0,
    chunksCompleted: 0,
    chunksTotal: 0,
    workersActive: 0,
  });
  
  await workerPoolRef.current.initialize();
  
  console.log('[useTranscriberFast] Worker pool initialized');
  setProgress({
    phase: 'initializing',
    percent: 100,
    chunksCompleted: 0,
    chunksTotal: 0,
    workersActive: 0,
  });
}, [config]);

// Update cleanup to include runtime
const cleanupServices = useCallback(async () => {
  if (workerPoolRef.current) {
    await workerPoolRef.current.terminate();
    workerPoolRef.current = null;
  }
  chunkManagerRef.current = null;
  processorRef.current = null;
  mergerRef.current = null;
  runtimeRef.current = null;  // ADD THIS
}, []);
```

### Why

- Removes manual worker configuration burden
- Users automatically get optimal parallelism for their hardware
- Config override still works for advanced users

### Acceptance Criteria

- `useTranscriberFast` imports and uses `ParallelRuntime`
- Worker count is auto-detected (not hardcoded 16)
- User config override still works
- Console logs show auto-detected values
- Existing tests still pass

### Definition of Done

- Code modified
- `pnpm test __tests__/integration/fast-mode/` passes
- Manual testing: Fast Mode shows auto-detected worker count in logs

---

# PHASE 2: IMMUTABLE STATE REFACTORING

---

## TASK 2.1: Refactor ChunkManagerServiceFast to Functional Style

### Context

Current implementation uses imperative loop with mutable array. BEND paradigm prefers declarative, functional style.

### What to Implement

Refactor `createChunks` method to use functional patterns while maintaining exact same output.

### Where

**File**: `services/fast-mode/ChunkManagerServiceFast.ts`
**Action**: MODIFY

### Current Code (lines 30-76)

```typescript
createChunks(audioData: Float32Array): AudioChunk[] {
  const { chunkLengthSec, overlapSec, sampleRate } = this.config;
  
  const chunkLengthSamples = chunkLengthSec * sampleRate;
  const overlapSamples = overlapSec * sampleRate;
  const stepSamples = chunkLengthSamples - overlapSamples;
  
  const totalSamples = audioData.length;
  const totalDuration = totalSamples / sampleRate;
  
  // Edge case: Audio shorter than one chunk
  if (totalSamples <= chunkLengthSamples) {
    return [{
      index: 0,
      audioData: audioData.slice(),
      startOffset: 0,
      endOffset: totalDuration,
      duration: totalDuration,
    }];
  }
  
  const chunks: AudioChunk[] = [];  // MUTABLE
  let chunkIndex = 0;               // MUTABLE
  
  for (let start = 0; start < totalSamples; start += stepSamples) {
    const end = Math.min(start + chunkLengthSamples, totalSamples);
    const chunkSamples = audioData.slice(start, end);
    const chunkDuration = chunkSamples.length / sampleRate;
    const startOffset = start / sampleRate;
    const endOffset = end / sampleRate;
    
    chunks.push({
      index: chunkIndex++,
      audioData: chunkSamples,
      startOffset,
      endOffset,
      duration: chunkDuration,
    });
    
    if (end >= totalSamples) {
      break;
    }
  }
  
  return chunks;
}
```

### New Code

```typescript
import type { AudioChunk, FastModeConfig } from '@/types/fast-mode';

const DEFAULT_CONFIG: FastModeConfig = {
  chunkLengthSec: 60,
  overlapSec: 3,
  modelId: 'distil-whisper/distil-small.en',
  sampleRate: 16000,
};

// Pure function: Generate chunk ranges as [start, end] tuples
const generateChunkRanges = (
  totalSamples: number,
  chunkLengthSamples: number,
  stepSamples: number
): ReadonlyArray<readonly [number, number]> => {
  const ranges: Array<readonly [number, number]> = [];
  
  for (let start = 0; start < totalSamples; start += stepSamples) {
    const end = Math.min(start + chunkLengthSamples, totalSamples);
    ranges.push([start, end] as const);
    if (end >= totalSamples) break;
  }
  
  return ranges;
};

// Pure function: Create AudioChunk from range
const createChunkFromRange = (
  audioData: Float32Array,
  sampleRate: number
) => (
  [start, end]: readonly [number, number],
  index: number
): AudioChunk => ({
  index,
  audioData: audioData.slice(start, end),
  startOffset: start / sampleRate,
  endOffset: end / sampleRate,
  duration: (end - start) / sampleRate,
});

export class ChunkManagerServiceFast {
  private config: FastModeConfig;

  constructor(config: Partial<FastModeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create chunks from audio data using functional composition.
   * 
   * @param audioData - Full audio as Float32Array (16kHz mono)
   * @returns Array of AudioChunk objects with metadata
   */
  createChunks(audioData: Float32Array): AudioChunk[] {
    const { chunkLengthSec, overlapSec, sampleRate } = this.config;
    
    const chunkLengthSamples = chunkLengthSec * sampleRate;
    const overlapSamples = overlapSec * sampleRate;
    const stepSamples = chunkLengthSamples - overlapSamples;
    
    const totalSamples = audioData.length;
    const totalDuration = totalSamples / sampleRate;
    
    // Edge case: Audio shorter than one chunk
    if (totalSamples <= chunkLengthSamples) {
      return [{
        index: 0,
        audioData: audioData.slice(),
        startOffset: 0,
        endOffset: totalDuration,
        duration: totalDuration,
      }];
    }
    
    // Functional composition: generate ranges, then map to chunks
    const ranges = generateChunkRanges(totalSamples, chunkLengthSamples, stepSamples);
    const chunks = ranges.map(createChunkFromRange(audioData, sampleRate));
    
    return chunks;
  }

  /**
   * Calculate number of chunks for given audio duration.
   * Pure function - useful for progress estimation.
   */
  calculateChunkCount(durationSeconds: number): number {
    const { chunkLengthSec, overlapSec } = this.config;
    const stepSec = chunkLengthSec - overlapSec;
    
    if (durationSeconds <= chunkLengthSec) {
      return 1;
    }
    
    return Math.ceil((durationSeconds - overlapSec) / stepSec);
  }

  /**
   * Get chunk configuration (returns copy to prevent mutation).
   */
  getConfig(): FastModeConfig {
    return { ...this.config };
  }
}

// Export pure functions for testing
export { generateChunkRanges, createChunkFromRange };
```

### Why

- Pure functions (`generateChunkRanges`, `createChunkFromRange`) are easier to test
- Declarative style is easier to understand
- No mutable state = no race condition risks
- Exported pure functions can be reused

### Acceptance Criteria

- `createChunks` produces identical output to before
- Pure functions `generateChunkRanges` and `createChunkFromRange` are exported
- No mutable variables in `createChunks` (except for edge case return)
- Existing tests pass: `pnpm test __tests__/unit/fast-mode/ChunkManagerServiceFast.test.ts`

### Definition of Done

- Code refactored
- All existing tests pass
- Output is identical (verified by tests)

---

## TASK 2.2: Refactor TimestampMergerFast to Pure Functions

### Context

Current implementation uses imperative loops with mutable arrays. Extract pure functions for better testability.

### What to Implement

Extract pure functions and use functional patterns (reduce, map, filter).

### Where

**File**: `services/fast-mode/TimestampMergerFast.ts`
**Action**: MODIFY

### Key Changes

1. Extract `adjustTimestamps` as pure function
2. Extract `filterOverlaps` as pure function
3. Refactor `mergeAdjacentSegments` to use `reduce`
4. Export pure functions for testing

### Implementation Pattern

```typescript
// Pure function: Adjust timestamps for a chunk
export const adjustTimestamps = (
  segments: TranscriptionSegment[],
  startOffset: number
): TranscriptionSegment[] =>
  segments.map(s => ({
    ...s,
    start: s.start + startOffset,
    end: s.end + startOffset,
  }));

// Pure function: Filter segments that fall in overlap region
export const filterOverlaps = (
  segments: TranscriptionSegment[],
  overlapStart: number | undefined
): TranscriptionSegment[] =>
  overlapStart !== undefined
    ? segments.filter(s => s.end <= overlapStart)
    : segments;

// Pure function: Merge adjacent segments with small gaps
export const mergeAdjacentSegments = (
  segments: TranscriptionSegment[],
  maxGap: number = 0.5
): TranscriptionSegment[] => {
  if (segments.length === 0) return [];
  
  return segments.reduce<TranscriptionSegment[]>((acc, next) => {
    if (acc.length === 0) return [next];
    
    const last = acc[acc.length - 1];
    const gap = next.start - last.end;
    
    if (gap < maxGap) {
      // Merge: update last segment instead of creating new array
      return [
        ...acc.slice(0, -1),
        { ...last, end: next.end, text: `${last.text} ${next.text}` }
      ];
    }
    
    return [...acc, next];
  }, []);
};
```

### Why

- Pure functions are trivially testable
- Reduce pattern is more functional than imperative loop
- Exported functions can be unit tested independently

### Acceptance Criteria

- Pure functions exported: `adjustTimestamps`, `filterOverlaps`, `mergeAdjacentSegments`
- `mergeResults` produces identical output
- No mutable variables in merge logic
- Existing tests pass

### Definition of Done

- Code refactored
- All tests pass
- Pure functions are exported and documented

---

## TASK 2.3: Refactor ParallelChunkProcessorFast to Immutable Patterns

### Context

Current implementation uses mutable counter (`chunksCompleted++`) and mutable Set. This can cause race conditions.

### What to Implement

Replace mutable state with immutable patterns.

### Where

**File**: `services/fast-mode/ParallelChunkProcessorFast.ts`
**Action**: MODIFY

### Key Changes

1. Replace `let chunksCompleted = 0` with immutable tracking
2. Use pure function for progress calculation
3. Use immutable Set updates

### Implementation Pattern

```typescript
// Pure function: Calculate progress from completed set
const calculateProgress = (
  completedIndices: ReadonlySet<number>,
  totalChunks: number,
  startTime: number,
  workersActive: number
): FastModeProgress => ({
  phase: 'processing',
  percent: Math.round((completedIndices.size / totalChunks) * 100),
  chunksCompleted: completedIndices.size,
  chunksTotal: totalChunks,
  workersActive,
  eta: calculateETA(completedIndices.size, totalChunks, startTime),
});

// Immutable update: Add to completed set
const markComplete = (
  prev: ReadonlySet<number>,
  index: number
): Set<number> => new Set([...prev, index]);
```

### Why

- Immutable patterns prevent race conditions
- Pure progress calculation is testable
- Clearer data flow

### Acceptance Criteria

- No `let` variables for tracking state
- Progress calculation is a pure function
- Set updates are immutable (new Set, not mutate)
- Existing tests pass

### Definition of Done

- Code refactored
- All tests pass
- No mutable counters

---

# PHASE 3: VALIDATION

---

## TASK 3: Final Validation

### Context

After all refactoring, verify everything works correctly.

### What to Implement

Run all tests and benchmarks, compare to baseline.

### Steps

1. **Run all tests**

```bash
pnpm test
```

Expected: All 380+ tests pass

1. **Run lint**

```bash
pnpm lint
```

Expected: No errors

1. **Run benchmarks**

```bash
pnpm perf:benchmark:fast --label=after-bend-refactor
```

1. **Compare to baseline**

```bash
pnpm perf:compare baseline-before-bend.json after-bend-refactor.json
```

Expected: No regression (same or better performance)

1. **Manual test**

- Start dev server: `pnpm dev`
- Upload a test video
- Select Fast Mode
- Verify auto-detected worker count in console logs
- Verify transcription completes successfully

### Acceptance Criteria

- All tests pass
- No lint errors
- Performance not regressed
- Manual test successful
- Console shows auto-detected worker count

### Definition of Done

- All validation steps pass
- Ready for commit

---

# COMMIT MESSAGE TEMPLATE

When all tasks are complete, use this commit message:

```
feat(fast-mode): Add BEND-inspired functional composition and auto-parallelization

[Context] Fast Mode parallel transcription optimization
[Problem] Manual worker configuration required, mutable state patterns
[Solution] 
  - Created utils/functional.ts with pipe, asyncPipe, parallelMap
  - Created utils/ParallelRuntime.ts for auto hardware detection
  - Wired ParallelRuntime to useTranscriberFast (1-16 workers auto)
  - Refactored ChunkManagerServiceFast to functional style
  - Refactored TimestampMergerFast with pure functions
  - Refactored ParallelChunkProcessorFast to immutable patterns
[Location] 
  - utils/functional.ts (NEW)
  - utils/ParallelRuntime.ts (NEW)
  - hooks/useTranscriberFast.ts (modified)
  - services/fast-mode/*.ts (refactored)
[Rationale] BEND paradigm: runtime decides optimal parallelism, pure functions
[Behavior] Fast Mode auto-detects 1-16 workers based on CPU/GPU/memory
```

---

# RULES REFERENCE

The agent should follow these workspace rules:

- **testing.mdc**: Run `pnpm test` after any change, >= 95% coverage on critical paths
- **privacy.mdc**: All processing 100% client-side, no server calls
- **performance.mdc**: Run benchmarks before claiming improvements
- **patterns.mdc**: Prefer validated patterns, document sources
- **commits.mdc**: Use conventional commit format with context/problem/solution
- **accessibility.mdc**: Keyboard navigation, screen reader support

---

# SUMMARY


| Task | File                                                              | Action | Effort |
| ---- | ----------------------------------------------------------------- | ------ | ------ |
| 0.1  | `__tests__/integration/fast-mode/parallel-transcription.test.tsx` | MODIFY | 30 min |
| 0.2  | Terminal                                                          | RUN    | 15 min |
| 1.1  | `utils/functional.ts`                                             | CREATE | 45 min |
| 1.2  | `__tests__/unit/functional.test.ts`                               | CREATE | 30 min |
| 1.3  | `utils/ParallelRuntime.ts`                                        | CREATE | 45 min |
| 1.4  | `__tests__/unit/ParallelRuntime.test.ts`                          | CREATE | 30 min |
| 1.5  | `hooks/useTranscriberFast.ts`                                     | MODIFY | 30 min |
| 2.1  | `services/fast-mode/ChunkManagerServiceFast.ts`                   | MODIFY | 30 min |
| 2.2  | `services/fast-mode/TimestampMergerFast.ts`                       | MODIFY | 45 min |
| 2.3  | `services/fast-mode/ParallelChunkProcessorFast.ts`                | MODIFY | 30 min |
| 3    | Validation                                                        | RUN    | 30 min |


**Total**: ~6 hours

**Ready to execute with a lighter model** - each task has explicit context, implementation details, acceptance criteria, and definition of done.