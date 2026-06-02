import { workerManagerLog } from "./logger";
import { PendingRequestRegistry } from "./PendingRequestRegistry";

export type WorkerMessageType = 'load' | 'transcribe' | 'cancel' | 'init' | 'enhance' | 'reset';

/** DIP: inject a custom factory to create Worker instances (useful for tests). */
export type WorkerFactory = (url: string) => Worker;

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
    | 'worker-ready' | 'worker-init-error';
  message?: string;
  progress?: number;
  result?: any;
  error?: string;
  downloadedMB?: number;
  totalMB?: number;
  tokensGenerated?: number;
}

// ---------------------------------------------------------------------------
// Status → category classifier (OCP: add a new status = add one table entry)
// ---------------------------------------------------------------------------
type MessageCategory =
  | 'progress'
  | 'resolve'
  | 'reject-error'
  | 'reject-cancel'
  | 'lifecycle-ready'
  | 'lifecycle-error';

const STATUS_CATEGORY: Readonly<Record<string, MessageCategory>> = {
  progress:            'progress',
  loading:             'progress',
  transcribing:        'progress',
  downloading:         'progress',
  processing:          'progress',
  streaming:           'progress',
  complete:            'resolve',
  ready:               'resolve',
  reset:               'resolve',
  error:               'reject-error',
  cancelled:           'reject-cancel',
  'worker-ready':      'lifecycle-ready',
  'worker-init-error': 'lifecycle-error',
};

const defaultWorkerFactory: WorkerFactory = (url) =>
  new Worker(url, { type: 'module' });

/**
 * WorkerManager — thin coordinator over PendingRequestRegistry (pending
 * request lifecycle), status classifier (message routing), and the Worker
 * transport (postMessage / addEventListener).
 *
 * Supports an optional startup handshake: the worker may post
 * {status:'worker-ready'} or {status:'worker-init-error', message} (no
 * requestId). Call whenReady() to await the result.
 */
export class WorkerManager {
  private worker: Worker | null = null;
  /** Registry is intentionally non-private so tests can inspect pending state. */
  readonly registry = new PendingRequestRegistry();
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private errorHandler: ((error: ErrorEvent) => void) | null = null;
  private crashed = false;
  private started = false;

  private readyResolve!: () => void;
  private readyReject!: (err: Error) => void;
  private readonly readyPromise: Promise<void>;

  constructor(
    workerPath: string,
    workerFactory: WorkerFactory = defaultWorkerFactory,
  ) {
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    // Suppress unhandled-rejection when no caller ever calls whenReady().
    this.readyPromise.catch(() => {});
    this.initialize(workerPath, workerFactory);
  }

  /**
   * Resolves when the worker posts {status:'worker-ready'}, rejects on
   * {status:'worker-init-error'} or an error event, and times out after
   * timeoutMs if neither arrives.
   * Workers that never post the handshake (enhancer, fast-worker) → promise
   * stays pending; never call whenReady() on them.
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

  private initialize(workerPath: string, workerFactory: WorkerFactory): void {
    try {
      const isDev = process.env.NODE_ENV !== 'production';
      const cacheBustedPath = `${workerPath}?v=${Date.now()}${isDev ? '&debug=1' : ''}`;
      workerManagerLog.info('Initializing worker', { url: cacheBustedPath });

      this.worker = workerFactory(cacheBustedPath);

      this.messageHandler = this.handleMessage.bind(this);
      this.errorHandler = this.handleError.bind(this);

      this.worker.addEventListener('message', this.messageHandler);
      this.worker.addEventListener('error', this.errorHandler);

      workerManagerLog.info('Worker initialized');
    } catch (error) {
      workerManagerLog.error('Failed to initialize worker', error);
      throw error;
    }
  }

  private handleMessage = (event: MessageEvent): void => {
    const response: WorkerResponse = event.data;
    const category = STATUS_CATEGORY[response.status];

    // --- Lifecycle messages (no requestId) ---
    if (category === 'lifecycle-ready') {
      this.started = true;
      workerManagerLog.info('Worker startup confirmed via worker-ready handshake');
      this.readyResolve();
      return;
    }
    if (category === 'lifecycle-error') {
      this.crashed = true;
      const msg = response.message || 'Worker failed to initialize';
      workerManagerLog.error('Worker init error from handshake', { message: msg });
      const err = new Error(msg);
      this.readyReject(err);
      this.registry.rejectAll(new Error(`Worker init failed: ${msg}`));
      return;
    }

    // --- Routed messages (require a requestId) ---
    if (!response.requestId) {
      workerManagerLog.warn('Received message without requestId', response);
      return;
    }

    const request = this.registry.get(response.requestId);
    if (!request) {
      workerManagerLog.warn('Received response for unknown request', { requestId: response.requestId });
      return;
    }

    workerManagerLog.debug(`Response for ${response.requestId}: [${response.status}] ${response.message ?? '(no message)'}`);

    switch (category) {
      case 'progress':
        request.onProgress?.(response.progress || 0, response.message, {
          downloadedMB: response.downloadedMB,
          totalMB: response.totalMB,
          tokensGenerated: response.tokensGenerated,
        });
        break;

      case 'resolve':
        clearTimeout(request.timeout);
        this.registry.delete(response.requestId);
        workerManagerLog.info(`Request ${response.requestId} completed`);
        request.resolve(response.result || response);
        break;

      case 'reject-error':
        clearTimeout(request.timeout);
        this.registry.delete(response.requestId);
        workerManagerLog.error(`Request ${response.requestId} failed`, { error: response.error || response.message });
        request.reject(new Error(response.error || response.message || 'Unknown error'));
        break;

      case 'reject-cancel':
        clearTimeout(request.timeout);
        this.registry.delete(response.requestId);
        workerManagerLog.warn(`Request ${response.requestId} cancelled`);
        request.reject(new Error('Operation cancelled'));
        break;

      default:
        workerManagerLog.warn(`Received message with unrecognised status "${response.status}"`, { requestId: response.requestId });
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
    this.registry.rejectAll(err);
  };

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
    const requestId = this.registry.nextId();

    workerManagerLog.debug(`Sending request ${requestId} (${type})`);

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.registry.delete(requestId);
        const elapsed = (timeoutMs / 1000).toFixed(0);
        workerManagerLog.error(
          `Request ${requestId} (${type}) timed out after ${elapsed}s`,
          { pendingRequests: this.registry.size }
        );
        reject(new Error(
          `Request timed out after ${elapsed}s. ` +
          `Pending requests: ${this.registry.size}`
        ));
      }, timeoutMs);

      this.registry.add(requestId, {
        id: requestId,
        type,
        data,
        resolve,
        reject,
        timeout,
        timestamp: Date.now(),
        onProgress,
      });

      this.worker!.postMessage({ requestId, type, data });

      workerManagerLog.debug(`Request queued`, { pending: this.registry.size });
    });
  }

  getStats() {
    const ageMs = this.registry.oldestAge();
    return {
      pendingRequests: this.registry.size,
      isActive: !!this.worker,
      oldestRequestAge: ageMs ? `${(ageMs / 1000).toFixed(1)}s` : null,
    };
  }

  isCrashed(): boolean {
    return this.crashed;
  }

  isStarted(): boolean {
    return this.started;
  }

  isHealthy(): boolean {
    if (!this.worker) return false;
    const ageMs = this.registry.oldestAge();
    if (ageMs && ageMs > 300000) {
      workerManagerLog.warn('Worker may be stuck', {
        oldestRequest: `${(ageMs / 1000).toFixed(1)}s`,
      });
      return false;
    }
    return true;
  }

  dispose(): void {
    workerManagerLog.info('Disposing worker');

    if (this.registry.size > 0) {
      this.registry.rejectAll(new Error('Worker disposed'));
    }

    if (this.worker) {
      if (this.messageHandler) {
        this.worker.removeEventListener('message', this.messageHandler);
      }
      if (this.errorHandler) {
        this.worker.removeEventListener('error', this.errorHandler);
      }
      this.worker.terminate();
    }

    this.worker = null;
    this.messageHandler = null;
    this.errorHandler = null;
    this.crashed = false;

    workerManagerLog.info('Worker disposed');
  }
}
