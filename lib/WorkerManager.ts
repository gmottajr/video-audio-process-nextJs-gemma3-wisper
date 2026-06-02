import { workerManagerLog } from "./logger";

export type WorkerMessageType = 'load' | 'transcribe' | 'cancel' | 'init' | 'enhance' | 'reset';

export interface WorkerRequest {
  id: string;
  type: WorkerMessageType;
  data: any;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  timestamp: number;
  onProgress?: (progress: number, message?: string, extra?: { downloadedMB?: number; totalMB?: number; tokensGenerated?: number }) => void;
}

export interface WorkerResponse {
  requestId?: string;
  status:
    | 'ready' | 'complete' | 'error' | 'progress' | 'loading' | 'transcribing'
    | 'downloading' | 'processing' | 'streaming' | 'cancelled' | 'reset'
    // Lifecycle handshake statuses (no requestId)
    | 'worker-ready' | 'worker-init-error';
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
 * Manages a single Web Worker with proper request/response handling.
 * Supports an optional startup handshake: the worker may post
 * {status:'worker-ready'} or {status:'worker-init-error', message} without a
 * requestId. Call whenReady() to await the result.
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, WorkerRequest>();
  private requestIdCounter = 0;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private errorHandler: ((error: ErrorEvent) => void) | null = null;
  private crashed = false;
  private started = false;

  // Ready-promise infrastructure for the optional worker-ready handshake.
  private readyResolve!: () => void;
  private readyReject!: (err: Error) => void;
  private readonly readyPromise: Promise<void>;

  constructor(workerPath: string) {
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    // Suppress unhandled-rejection when no caller ever calls whenReady().
    // whenReady() uses Promise.race(), which still receives the rejection.
    this.readyPromise.catch(() => {});
    this.initialize(workerPath);
  }

  /**
   * Resolves when the worker posts {status:'worker-ready'}, or rejects when
   * it posts {status:'worker-init-error'} or fires an error event.
   * Times out after timeoutMs if neither arrives.
   * Workers that never post the handshake (enhancer, fast-worker) → this
   * promise simply stays pending; never call whenReady() on them.
   */
  async whenReady(timeoutMs = 30000): Promise<void> {
    return Promise.race([
      this.readyPromise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Worker did not start within ${timeoutMs}ms`)),
          timeoutMs,
        )
      ),
    ]);
  }

  /**
   * Initialize the worker
   */
  private initialize(workerPath: string): void {
    try {
      // Evaluate dev flag inline so tests can control it via process.env.NODE_ENV.
      const isDev = process.env.NODE_ENV !== 'production';
      const cacheBustedPath = `${workerPath}?v=${Date.now()}${isDev ? '&debug=1' : ''}`;
      workerManagerLog.info('Initializing worker', { url: cacheBustedPath });

      this.worker = new Worker(cacheBustedPath, { type: 'module' });

      // Bind handlers
      this.messageHandler = this.handleMessage.bind(this);
      this.errorHandler = this.handleError.bind(this);

      // Attach listeners (single handler pattern)
      this.worker.addEventListener('message', this.messageHandler);
      this.worker.addEventListener('error', this.errorHandler);

      workerManagerLog.info('Worker initialized');
    } catch (error) {
      workerManagerLog.error('Failed to initialize worker', error);
      throw error;
    }
  }

  /**
   * Handle messages from worker
   */
  private handleMessage = (event: MessageEvent): void => {
    const response: WorkerResponse = event.data;

    // Handle lifecycle messages (no requestId) — startup handshake.
    if (!response.requestId) {
      if (response.status === 'worker-ready') {
        this.started = true;
        workerManagerLog.info('Worker startup confirmed via worker-ready handshake');
        this.readyResolve();
      } else if (response.status === 'worker-init-error') {
        this.crashed = true;
        const msg = response.message || 'Worker failed to initialize';
        workerManagerLog.error('Worker init error from handshake', { message: msg });
        const err = new Error(msg);
        this.readyReject(err);
        this.rejectAllPending(new Error(`Worker init failed: ${msg}`));
      } else {
        workerManagerLog.warn('Received message without requestId', response);
      }
      return;
    }

    const request = this.pendingRequests.get(response.requestId);
    if (!request) {
      workerManagerLog.warn('Received response for unknown request', { requestId: response.requestId });
      return;
    }

    workerManagerLog.debug(`Response for ${response.requestId}: [${response.status}] ${response.message ?? '(no message)'}`);

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
        request.onProgress(response.progress || 0, response.message, {
          downloadedMB: response.downloadedMB,
          totalMB: response.totalMB,
          tokensGenerated: response.tokensGenerated,
        });
      }
      return;
    }

    // Handle terminal states (complete/ready/error/cancelled/reset)
    if (response.status === 'complete' || response.status === 'ready' || response.status === 'reset') {
      clearTimeout(request.timeout);
      this.pendingRequests.delete(response.requestId);
      workerManagerLog.info(`Request ${response.requestId} completed`);
      request.resolve(response.result || response);
    } else if (response.status === 'error') {
      clearTimeout(request.timeout);
      this.pendingRequests.delete(response.requestId);
      workerManagerLog.error(`Request ${response.requestId} failed`, { error: response.error || response.message });
      request.reject(new Error(response.error || response.message || 'Unknown error'));
    } else if (response.status === 'cancelled') {
      clearTimeout(request.timeout);
      this.pendingRequests.delete(response.requestId);
      workerManagerLog.warn(`Request ${response.requestId} cancelled`);
      request.reject(new Error('Operation cancelled'));
    }
  };

  /**
   * Handle worker errors (script load failures or uncaught exceptions).
   * An empty ErrorEvent message typically means a script-load failure
   * (COEP violation, 404, or parse error) rather than a runtime throw.
   */
  private handleError = (error: ErrorEvent): void => {
    const detail = [
      error.message   ? `message="${error.message}"`   : 'message=(empty — likely script load failure)',
      error.filename  ? `file="${error.filename}"`     : null,
      error.lineno    ? `line=${error.lineno}`         : null,
      error.colno     ? `col=${error.colno}`           : null,
      `type="${error.type}"`,
      `timeStamp=${error.timeStamp}`,
    ].filter(Boolean).join(', ');

    workerManagerLog.error(`Worker error: ${detail}`);
    workerManagerLog.error('If message is empty: check COEP headers, 404s, or syntax errors in the worker script and its imports.');

    this.crashed = true;
    const err = new Error(`Worker crashed: ${error.message || '(script load failure — see console)'}`);
    this.readyReject(err);
    this.rejectAllPending(err);
  };

  /**
   * Reject all pending requests
   */
  private rejectAllPending(error: Error): void {
    workerManagerLog.warn(`Rejecting ${this.pendingRequests.size} pending requests`);

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
      onProgress?: (progress: number, message?: string, extra?: { downloadedMB?: number; totalMB?: number; tokensGenerated?: number }) => void;
    } = {}
  ): Promise<T> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    if (this.crashed) {
      throw new Error(
        `[WorkerManager] Worker has crashed (script load failure or runtime error). ` +
        `Reload the page to recover. Request type: ${type}`
      );
    }

    const { timeoutMs = 300000, onProgress } = options;
    const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;

    workerManagerLog.debug(`Sending request ${requestId} (${type})`);

    return new Promise<T>((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        const elapsed = (timeoutMs / 1000).toFixed(0);
        workerManagerLog.error(
          `Request ${requestId} (${type}) timed out after ${elapsed}s`,
          { pendingRequests: this.pendingRequests.size }
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

      workerManagerLog.debug(`Request queued`, { pending: this.pendingRequests.size });
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
   * True if the worker script failed to load or threw an uncaught error.
   * Any sendRequest call will throw immediately rather than hanging.
   */
  isCrashed(): boolean {
    return this.crashed;
  }

  /**
   * True if the worker posted the worker-ready handshake.
   */
  isStarted(): boolean {
    return this.started;
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
        workerManagerLog.warn('Worker may be stuck', { oldestRequest: stats.oldestRequestAge });
        return false;
      }
    }

    return true;
  }

  /**
   * Dispose of the worker and clean up
   */
  dispose(): void {
    workerManagerLog.info('Disposing worker');

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
    this.crashed = false;

    workerManagerLog.info('Worker disposed');
  }
}
