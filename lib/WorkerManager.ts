/**
 * WorkerManager - Request/Response Pattern for Web Workers
 * 
 * Eliminates race conditions by:
 * - Assigning unique IDs to each request
 * - Using a single message handler
 * - Properly tracking pending requests
 * - Cleaning up listeners on completion
 */

export type WorkerMessageType = 'load' | 'transcribe' | 'cancel' | 'init' | 'enhance' | 'reset';

export interface WorkerRequest {
  id: string;
  type: WorkerMessageType;
  data: any;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  timestamp: number;
  onProgress?: (progress: number, message?: string) => void;
}

export interface WorkerResponse {
  requestId: string;
  status: 'ready' | 'complete' | 'error' | 'progress' | 'loading' | 'transcribing' | 'downloading' | 'processing' | 'streaming' | 'cancelled' | 'reset';
  message?: string;
  progress?: number;
  result?: any;
  error?: string;
  // Enhancement-specific fields
  downloadedMB?: number;
  totalMB?: number;
  tokensGenerated?: number;
}

/**
 * WorkerManager Class
 * 
 * Manages a single Web Worker with proper request/response handling
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, WorkerRequest>();
  private requestIdCounter = 0;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private errorHandler: ((error: ErrorEvent) => void) | null = null;

  constructor(workerPath: string) {
    this.initialize(workerPath);
  }

  /**
   * Initialize the worker
   */
  private initialize(workerPath: string): void {
    try {
      console.log('[WorkerManager] 🚀 Initializing worker from:', workerPath);
      
      this.worker = new Worker(workerPath, { type: 'module' });
      
      // Bind handlers
      this.messageHandler = this.handleMessage.bind(this);
      this.errorHandler = this.handleError.bind(this);
      
      // Attach listeners (single handler pattern)
      this.worker.addEventListener('message', this.messageHandler);
      this.worker.addEventListener('error', this.errorHandler);

      console.log('[WorkerManager] ✅ Worker initialized successfully');
    } catch (error) {
      console.error('[WorkerManager] ❌ Failed to initialize worker:', error);
      throw error;
    }
  }

  /**
   * Handle messages from worker
   */
  private handleMessage = (event: MessageEvent): void => {
    const response: WorkerResponse = event.data;
    
    if (!response.requestId) {
      console.warn('[WorkerManager] ⚠️ Received message without requestId:', response);
      return;
    }

    const request = this.pendingRequests.get(response.requestId);
    if (!request) {
      console.warn('[WorkerManager] ⚠️ Received response for unknown request:', response.requestId);
      return;
    }

    console.log(`[WorkerManager] 📨 Response for ${response.requestId}: [${response.status}] ${response.message || '(no message)'}`);

    // Handle progress updates (non-terminal)
    if (
      response.status === 'progress' || 
      response.status === 'loading' || 
      response.status === 'transcribing' ||
      response.status === 'downloading' ||
      response.status === 'processing' ||
      response.status === 'streaming'
    ) {
      if (request.onProgress) {
        request.onProgress(response.progress || 0, response.message);
      }
      return; // Don't complete the request
    }

    // Handle terminal states (complete/ready/error/cancelled/reset)
    if (response.status === 'complete' || response.status === 'ready' || response.status === 'reset') {
      clearTimeout(request.timeout);
      this.pendingRequests.delete(response.requestId);
      console.log(`[WorkerManager] ✅ Request ${response.requestId} completed successfully`);
      request.resolve(response.result || response);
    } else if (response.status === 'error') {
      clearTimeout(request.timeout);
      this.pendingRequests.delete(response.requestId);
      console.error(`[WorkerManager] ❌ Request ${response.requestId} failed:`, response.error || response.message);
      request.reject(new Error(response.error || response.message || 'Unknown error'));
    } else if (response.status === 'cancelled') {
      clearTimeout(request.timeout);
      this.pendingRequests.delete(response.requestId);
      console.log(`[WorkerManager] ⚠️ Request ${response.requestId} was cancelled`);
      request.reject(new Error('Operation cancelled'));
    }
  };

  /**
   * Handle worker errors
   */
  private handleError = (error: ErrorEvent): void => {
    console.error('[WorkerManager] ❌ Worker error:', error);
    this.rejectAllPending(new Error(`Worker crashed: ${error.message}`));
  };

  /**
   * Reject all pending requests
   */
  private rejectAllPending(error: Error): void {
    console.warn(`[WorkerManager] ⚠️ Rejecting ${this.pendingRequests.size} pending requests`);
    
    this.pendingRequests.forEach((request) => {
      clearTimeout(request.timeout);
      request.reject(error);
    });
    
    this.pendingRequests.clear();
  }

  /**
   * Send a request to the worker
   */
  async sendRequest<T = any>(
    type: WorkerMessageType,
    data: any,
    options: {
      timeoutMs?: number;
      onProgress?: (progress: number, message?: string) => void;
    } = {}
  ): Promise<T> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const { timeoutMs = 300000, onProgress } = options;
    const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;

    console.log(`[WorkerManager] 📤 Sending request ${requestId} (${type})`);

    return new Promise<T>((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        const elapsed = (timeoutMs / 1000).toFixed(0);
        console.error(
          `[WorkerManager] ⏱️ Request ${requestId} (${type}) timed out after ${elapsed}s. ` +
          `Pending requests: ${this.pendingRequests.size}`
        );
        reject(new Error(
          `Request timed out after ${elapsed}s. ` +
          `Pending requests: ${this.pendingRequests.size}`
        ));
      }, timeoutMs);

      // Store request
      this.pendingRequests.set(requestId, {
        id: requestId,
        type,
        data,
        resolve,
        reject,
        timeout,
        timestamp: Date.now(),
        onProgress
      });

      // Send message to worker
      this.worker!.postMessage({ requestId, type, data });
      
      console.log(`[WorkerManager] 📋 Request queued. Pending: ${this.pendingRequests.size}`);
    });
  }

  /**
   * Get statistics about pending requests
   */
  getStats() {
    const oldestRequestAge = this.getOldestRequestAge();
    
    return {
      pendingRequests: this.pendingRequests.size,
      isActive: !!this.worker,
      oldestRequestAge: oldestRequestAge ? `${(oldestRequestAge / 1000).toFixed(1)}s` : null
    };
  }

  /**
   * Get age of oldest pending request
   */
  private getOldestRequestAge(): number | null {
    if (this.pendingRequests.size === 0) return null;
    
    const now = Date.now();
    let oldest = 0;
    
    this.pendingRequests.forEach(req => {
      const age = now - req.timestamp;
      if (age > oldest) oldest = age;
    });
    
    return oldest;
  }

  /**
   * Check if worker is healthy
   */
  isHealthy(): boolean {
    if (!this.worker) return false;
    
    const stats = this.getStats();
    
    // Worker is unhealthy if requests are stuck for > 5 minutes
    if (stats.oldestRequestAge) {
      const ageMs = this.getOldestRequestAge();
      if (ageMs && ageMs > 300000) {
        console.warn('[WorkerManager] ⚠️ Worker may be stuck. Oldest request:', stats.oldestRequestAge);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Dispose of the worker and clean up
   */
  dispose(): void {
    console.log('[WorkerManager] 🧹 Disposing worker...');
    console.log(`[WorkerManager] Rejecting ${this.pendingRequests.size} pending requests`);
    
    // Reject all pending requests only if there are any
    if (this.pendingRequests.size > 0) {
      this.rejectAllPending(new Error('Worker disposed'));
    }

    // Clean up listeners
    if (this.worker) {
      if (this.messageHandler) {
        this.worker.removeEventListener('message', this.messageHandler);
      }
      if (this.errorHandler) {
        this.worker.removeEventListener('error', this.errorHandler);
      }
      
      // Terminate worker
      this.worker.terminate();
    }

    // Clear references
    this.worker = null;
    this.messageHandler = null;
    this.errorHandler = null;

    console.log('[WorkerManager] ✅ Worker disposed');
  }
}


