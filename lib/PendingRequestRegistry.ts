import { workerManagerLog } from "./logger";
import type { WorkerRequest } from "./WorkerManager";

/**
 * Owns the pending-request Map for WorkerManager: ID generation, storage,
 * timeout tracking, bulk-rejection, and oldest-age calculation.
 * Extracted from WorkerManager to satisfy SRP.
 */
export class PendingRequestRegistry {
  private readonly _requests = new Map<string, WorkerRequest>();
  private _counter = 0;

  /** Generate the next unique request ID. */
  nextId(): string {
    return `req_${++this._counter}_${Date.now()}`;
  }

  add(id: string, request: WorkerRequest): void {
    this._requests.set(id, request);
  }

  get(id: string): WorkerRequest | undefined {
    return this._requests.get(id);
  }

  delete(id: string): void {
    this._requests.delete(id);
  }

  get size(): number {
    return this._requests.size;
  }

  keys(): IterableIterator<string> {
    return this._requests.keys();
  }

  values(): IterableIterator<WorkerRequest> {
    return this._requests.values();
  }

  forEach(cb: (request: WorkerRequest) => void): void {
    this._requests.forEach((req) => cb(req));
  }

  /** Reject and clear every pending request. */
  rejectAll(error: Error): void {
    workerManagerLog.warn(`Rejecting ${this._requests.size} pending requests`);
    this._requests.forEach((request) => {
      clearTimeout(request.timeout);
      request.reject(error);
    });
    this._requests.clear();
  }

  /** Milliseconds since the oldest pending request was enqueued, or null if empty. */
  oldestAge(): number | null {
    if (this._requests.size === 0) return null;
    const now = Date.now();
    let oldest = 0;
    this._requests.forEach((req) => {
      const age = now - req.timestamp;
      if (age > oldest) oldest = age;
    });
    return oldest;
  }
}
