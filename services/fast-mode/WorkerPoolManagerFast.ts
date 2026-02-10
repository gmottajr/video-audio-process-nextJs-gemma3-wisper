/**
 * WorkerPoolManagerFast
 * 
 * Manages a pool of Web Workers for parallel chunk processing.
 * Pattern adapted from workerpool library, implemented without external dependency.
 */

import type { AudioChunk, ChunkResult, WorkerPoolConfig, WorkerPoolStatus, WorkerStatus, DevicePreference } from '@/types/fast-mode';
import { MemoryMonitorFast } from './MemoryMonitorFast';

const DEFAULT_CONFIG: WorkerPoolConfig = {
  minWorkers: 1,
  maxWorkers: 16, // Optimized for i9 Core Ultra (16 E-cores for parallel workload)
  memoryThresholdMB: 10000, // ~10GB budget (16 workers * ~600MB each)
};

export class WorkerPoolManagerFast {
  private workers: Worker[] = [];
  private workerStatus: WorkerStatus[] = [];
  private config: WorkerPoolConfig;
  private memoryMonitor: MemoryMonitorFast;
  private requestIdCounter: number = 0;
  private pendingRequests: Map<string, {
    resolve: (result: ChunkResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private taskQueue: Array<{
    chunk: AudioChunk;
    resolve: (result: ChunkResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private isInitialized: boolean = false;
  private modelLoaded: boolean = false;
  private progressCallback?: (progress: any) => void;
  private modelId: string = 'distil-whisper/distil-small.en';
  private devicePreference: DevicePreference = 'auto';

  constructor(config: Partial<WorkerPoolConfig> = {}, progressCallback?: (progress: any) => void) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memoryMonitor = new MemoryMonitorFast({
      totalMB: this.config.memoryThresholdMB,
    });
    this.progressCallback = progressCallback;
  }

  /**
   * Set the model ID to use for transcription
   */
  setModelId(modelId: string): void {
    this.modelId = modelId;
  }

  /**
   * Get the current model ID
   */
  getModelId(): string {
    return this.modelId;
  }

  /**
   * Set the device preference for inference
   * @param preference - 'auto' | 'npu' | 'gpu' | 'cpu'
   */
  setDevicePreference(preference: DevicePreference): void {
    this.devicePreference = preference;
    console.log(`[WorkerPool] Device preference set to: ${preference}`);
  }

  /**
   * Get the current device preference
   */
  getDevicePreference(): DevicePreference {
    return this.devicePreference;
  }

  /**
   * Initialize worker pool
   * Creates workers and loads Distil-Whisper model in each
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const workerCount = this.config.maxWorkers;
    this.workers = [];
    this.workerStatus = [];

    // Create workers
    // NOTE: Load from public directory to avoid webpack bundling
    // This allows the worker to import Transformers.js from CDN
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker('/transcriber-fast.worker.js', { type: 'module' });
      
      worker.onmessage = this.handleWorkerMessage.bind(this);
      worker.onerror = this.handleWorkerError.bind(this, i);
      
      this.workers.push(worker);
      this.workerStatus.push('idle');
    }

    // Initialize all workers (load model)
    const initPromises = this.workers.map((worker, index) => {
      return this.initWorker(worker, index);
    });

    await Promise.all(initPromises);
    this.modelLoaded = true;
    this.isInitialized = true;
  }

  /**
   * Initialize a single worker (load model)
   */
  private async initWorker(worker: Worker, index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Worker ${index} initialization timeout`));
      }, 60000); // 60s timeout for model loading

      this.pendingRequests.set(requestId, {
        resolve: (result: any) => {
          clearTimeout(timeout);
          if (result.success) {
            resolve();
          } else {
            reject(new Error(`Worker ${index} failed to load model`));
          }
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout,
      });

      // Pass modelId and devicePreference to worker for initialization
      worker.postMessage({
        type: 'init',
        requestId,
        modelId: this.modelId,
        devicePreference: this.devicePreference,
      });
    });
  }

  /**
   * Process a chunk using an available worker
   * If no workers available, queues the task and returns a promise
   */
  async processChunk(chunk: AudioChunk): Promise<ChunkResult> {
    if (!this.isInitialized) {
      throw new Error('Worker pool not initialized');
    }

    return new Promise((resolve, reject) => {
      // Try to process immediately if worker available
      const workerIndex = this.findAvailableWorker();
      
      if (workerIndex !== -1) {
        // Worker available - process immediately
        this.executeChunk(chunk, workerIndex, resolve, reject);
      } else {
        // No workers available - queue the task
        this.taskQueue.push({ chunk, resolve, reject });
      }
    });
  }

  /**
   * Execute chunk processing on a specific worker
   */
  private executeChunk(
    chunk: AudioChunk,
    workerIndex: number,
    resolve: (result: ChunkResult) => void,
    reject: (error: Error) => void
  ): void {
    const worker = this.workers[workerIndex];
    this.workerStatus[workerIndex] = 'busy';

    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Per-chunk timeout: 5 minutes (increased from 2 min for long/complex audio)
    // Some chunks may take longer due to complex audio or GPU memory pressure
    const timeout = setTimeout(() => {
      this.pendingRequests.delete(requestId);
      this.workerStatus[workerIndex] = 'idle';
      this.processNextInQueue(); // Process next queued task
      console.warn(`[WorkerPool] Chunk ${chunk.index} timed out after 5 minutes`);
      reject(new Error(`Chunk ${chunk.index} processing timeout`));
    }, 300000);

    this.pendingRequests.set(requestId, {
      resolve: (result: ChunkResult) => {
        clearTimeout(timeout);
        this.workerStatus[workerIndex] = 'idle';
        resolve({
          ...result,
          processingTime: Date.now() - startTime,
        });
        // Process next queued task
        this.processNextInQueue();
      },
      reject: (error: Error) => {
        clearTimeout(timeout);
        this.workerStatus[workerIndex] = 'crashed';
        reject(error);
        // Process next queued task
        this.processNextInQueue();
      },
      timeout,
    });

    // Transfer audio data via Transferable objects for zero-copy
    worker.postMessage({
      type: 'transcribe',
      requestId,
      chunkIndex: chunk.index,
      audioData: chunk.audioData,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
    }, [chunk.audioData.buffer]);
  }

  /**
   * Process next task in queue when a worker becomes available
   */
  private processNextInQueue(): void {
    if (this.taskQueue.length === 0) {
      return;
    }

    const workerIndex = this.findAvailableWorker();
    if (workerIndex === -1) {
      return; // No workers available yet
    }

    const task = this.taskQueue.shift();
    if (task) {
      this.executeChunk(task.chunk, workerIndex, task.resolve, task.reject);
    }
  }

  /**
   * Find available worker (round-robin)
   */
  private findAvailableWorker(): number {
    // Find first idle worker
    for (let i = 0; i < this.workerStatus.length; i++) {
      if (this.workerStatus[i] === 'idle') {
        return i;
      }
    }
    return -1;
  }

  /**
   * Re-queue chunk to another worker after failure
   */
  private async reQueueChunk(chunk: AudioChunk, originalError: Error): Promise<void> {
    // Try to find another available worker
    const availableIndex = this.findAvailableWorker();
    if (availableIndex === -1) {
      // All workers failed - this will be handled by ParallelChunkProcessorFast
      throw new Error(`All workers failed, cannot re-queue chunk ${chunk.index}: ${originalError.message}`);
    }

    // Retry with another worker
    try {
      await this.processChunk(chunk);
    } catch (error) {
      throw new Error(`Failed to re-queue chunk ${chunk.index}: ${error}`);
    }
  }

  /**
   * Reduce number of workers due to memory pressure
   */
  private async reduceWorkers(targetCount: number): Promise<void> {
    const workersToTerminate = this.workers.length - targetCount;
    for (let i = 0; i < workersToTerminate; i++) {
      const index = this.workers.length - 1;
      await this.terminateWorker(index);
    }
  }

  /**
   * Terminate a specific worker
   */
  private async terminateWorker(index: number): Promise<void> {
    if (index >= this.workers.length) {
      return;
    }

    const worker = this.workers[index];
    const requestId = this.generateRequestId();

    // Send terminate message
    worker.postMessage({
      type: 'terminate',
      requestId,
    });

    // Wait a bit for cleanup, then terminate
    await new Promise(resolve => setTimeout(resolve, 100));
    worker.terminate();

    // Remove from arrays
    this.workers.splice(index, 1);
    this.workerStatus.splice(index, 1);
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { type, requestId, data } = event.data;

    // Handle progress messages (don't need pending request)
    if (type === 'download-progress') {
      if (this.progressCallback) {
        this.progressCallback(data);
      }
      return;
    }

    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      console.warn(`[WorkerPool] Received message for unknown request: ${requestId}`);
      return;
    }

    if (type === 'init-complete') {
      pending.resolve({ success: data.success } as any);
      this.pendingRequests.delete(requestId);
    } else if (type === 'result') {
      pending.resolve(data as ChunkResult);
      this.pendingRequests.delete(requestId);
    } else if (type === 'error') {
      pending.reject(new Error(data.error || 'Worker error'));
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerIndex: number, error: ErrorEvent): void {
    console.error(`[WorkerPool] Worker ${workerIndex} error:`, error);
    this.workerStatus[workerIndex] = 'crashed';
    
    // Reject any pending requests for this worker
    // (In practice, requests are tracked by requestId, not worker)
  }

  /**
   * Get worker pool status
   */
  getStatus(): WorkerPoolStatus {
    return {
      total: this.workers.length,
      idle: this.workerStatus.filter(s => s === 'idle').length,
      busy: this.workerStatus.filter(s => s === 'busy').length,
      crashed: this.workerStatus.filter(s => s === 'crashed').length,
      workers: [...this.workerStatus],
    };
  }

  /**
   * Terminate all workers
   */
  async terminate(): Promise<void> {
    // Cancel all pending requests
    for (const [requestId, pending] of Array.from(this.pendingRequests.entries())) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Worker pool terminated'));
    }
    this.pendingRequests.clear();

    // Terminate all workers
    const terminatePromises = this.workers.map((worker, index) => {
      return this.terminateWorker(index);
    });

    await Promise.all(terminatePromises);
    this.workers = [];
    this.workerStatus = [];
    this.isInitialized = false;
    this.modelLoaded = false;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }
}
