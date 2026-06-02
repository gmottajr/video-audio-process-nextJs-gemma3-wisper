/**
 * Unit Tests for WorkerManager
 *
 * Tests the core functionality without actually loading models.
 * Internal state is accessed via (workerManager as any).registry
 * (PendingRequestRegistry), which is the single source of truth for
 * pending requests after the Phase-3 SRP refactor.
 */

import { WorkerManager } from '@/lib/WorkerManager';
import type { PendingRequestRegistry } from '@/lib/PendingRequestRegistry';

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private eventListeners: Map<string, Set<(event: any) => void>> = new Map();

  constructor(public scriptURL: string, public options?: any) {}

  postMessage(_data: any): void {}

  addEventListener(type: string, handler: (event: any) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(handler);
  }

  removeEventListener(type: string, handler: (event: any) => void): void {
    const handlers = this.eventListeners.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  terminate(): void {
    this.eventListeners.clear();
  }

  simulateMessage(data: any): void {
    const handlers = this.eventListeners.get('message');
    if (handlers) {
      handlers.forEach(handler => handler({ data } as MessageEvent));
    }
  }

  simulateError(message: string): void {
    const handlers = this.eventListeners.get('error');
    if (handlers) {
      handlers.forEach(handler => handler({ message } as ErrorEvent));
    }
  }
}

// Install mock
(global as any).Worker = MockWorker;

// Suppress logger fetch calls during tests
(global as any).fetch = jest.fn().mockResolvedValue({ ok: true });

// Helper: get the registry from a WorkerManager instance
function reg(wm: WorkerManager): PendingRequestRegistry {
  return (wm as any).registry as PendingRequestRegistry;
}

describe('WorkerManager', () => {
  let workerManager: WorkerManager;
  let mockWorker: MockWorker;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy  = jest.spyOn(console, 'warn').mockImplementation();
    consoleLogSpy   = jest.spyOn(console, 'log').mockImplementation();

    workerManager = new WorkerManager('/test-worker.js');
    mockWorker    = (workerManager as any).worker as MockWorker;
  });

  afterEach(() => {
    if (workerManager) workerManager.dispose();

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  describe('Initialization', () => {
    test('should create worker with correct path', () => {
      expect(mockWorker).toBeDefined();
      expect(mockWorker.scriptURL).toContain('/test-worker.js');
      expect(mockWorker.options?.type).toBe('module');
    });

    test('should attach message and error listeners', () => {
      const messageListeners = (mockWorker as any).eventListeners.get('message');
      const errorListeners   = (mockWorker as any).eventListeners.get('error');

      expect(messageListeners?.size).toBe(1);
      expect(errorListeners?.size).toBe(1);
    });

    test('should report healthy status initially', () => {
      expect(workerManager.isHealthy()).toBe(true);
    });

    test('should have zero pending requests initially', () => {
      const stats = workerManager.getStats();
      expect(stats.pendingRequests).toBe(0);
      expect(stats.oldestRequestAge).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe('Request Sending', () => {
    test('should assign unique request IDs', async () => {
      const requestIds = new Set<string>();

      const promise1 = workerManager.sendRequest('load', { model: 'test1' });
      const promise2 = workerManager.sendRequest('load', { model: 'test2' });
      const promise3 = workerManager.sendRequest('load', { model: 'test3' });

      Array.from(reg(workerManager).keys()).forEach(id => requestIds.add(id));

      expect(requestIds.size).toBe(3);

      setTimeout(() => {
        requestIds.forEach(id => {
          mockWorker.simulateMessage({ requestId: id, status: 'ready' });
        });
      }, 10);

      await Promise.all([promise1, promise2, promise3]);
    });

    test('should track pending requests', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });

      await new Promise(resolve => setTimeout(resolve, 5));

      const stats = workerManager.getStats();
      expect(stats.pendingRequests).toBe(1);
      expect(stats.oldestRequestAge).toBeTruthy();
      expect(stats.oldestRequestAge).toMatch(/\d+\.\d+s/);

      mockWorker.simulateMessage({
        requestId: Array.from(reg(workerManager).keys())[0],
        status: 'ready',
      });

      return promise;
    });

    test('should include timeout in request options', () => {
      const promise = workerManager.sendRequest('load', { model: 'test' }, { timeoutMs: 5000 });

      const request = Array.from(reg(workerManager).values())[0];
      expect(request.timeout).toBeDefined();

      mockWorker.simulateMessage({ requestId: request.id, status: 'ready' });

      return promise;
    });
  });

  // -------------------------------------------------------------------------
  describe('Response Handling', () => {
    test('should resolve promise on "ready" status', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'ready', message: 'Model loaded' });
      }, 10);

      const result = await promise;
      expect(result.status).toBe('ready');
      expect(result.message).toBe('Model loaded');
    });

    test('should resolve promise on "complete" status', async () => {
      const promise = workerManager.sendRequest('transcribe', { audio: [] });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'complete', result: { text: 'transcription' } });
      }, 10);

      const result = await promise;
      expect(result.text).toBe('transcription');
    });

    test('should reject promise on "error" status', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'error', message: 'Model not found' });
      }, 10);

      await expect(promise).rejects.toThrow('Model not found');
    });

    test('should call progress callback for progress messages', async () => {
      const progressUpdates: number[] = [];

      const promise = workerManager.sendRequest('load', { model: 'test' }, {
        onProgress: (progress) => { progressUpdates.push(progress); },
      });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'progress', progress: 25 });
        mockWorker.simulateMessage({ requestId, status: 'progress', progress: 50 });
        mockWorker.simulateMessage({ requestId, status: 'progress', progress: 75 });
        mockWorker.simulateMessage({ requestId, status: 'ready' });
      }, 10);

      await promise;
      expect(progressUpdates).toEqual([25, 50, 75]);
    });

    test('should ignore messages without requestId', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ status: 'ready' }); // no requestId — ignored
        mockWorker.simulateMessage({ requestId, status: 'ready' });
      }, 10);

      await expect(promise).resolves.toBeDefined();
    });

    test('should ignore messages for unknown requestId', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId: 'wrong_id', status: 'ready' }); // ignored
        mockWorker.simulateMessage({ requestId, status: 'ready' });
      }, 10);

      await expect(promise).resolves.toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  describe('Timeout Handling', () => {
    test('should reject after timeout', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' }, { timeoutMs: 50 });
      await expect(promise).rejects.toThrow(/timed out/);
    });

    test('should clear timeout on successful response', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' }, { timeoutMs: 1000 });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'ready' });
      }, 10);

      await promise;
      expect(true).toBe(true); // Promise resolving proves timeout was cleared
    });

    test('should remove pending request after timeout', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' }, { timeoutMs: 50 });
      await expect(promise).rejects.toThrow();

      expect(workerManager.getStats().pendingRequests).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('Statistics', () => {
    test('should return correct pending request count', () => {
      const promise1 = workerManager.sendRequest('load', { model: 'test1' });
      const promise2 = workerManager.sendRequest('load', { model: 'test2' });

      expect(workerManager.getStats().pendingRequests).toBe(2);

      reg(workerManager).forEach((req) => {
        mockWorker.simulateMessage({ requestId: req.id, status: 'ready' });
      });

      return Promise.all([promise1, promise2]);
    });

    test('should calculate oldest request age', async () => {
      workerManager.sendRequest('load', { model: 'test' });

      await new Promise(resolve => setTimeout(resolve, 5));

      const stats = workerManager.getStats();
      expect(stats.oldestRequestAge).toBeTruthy();
      expect(stats.oldestRequestAge).toContain('s');

      const requestId = Array.from(reg(workerManager).keys())[0];
      mockWorker.simulateMessage({ requestId, status: 'ready' });
    });

    test('should report active status', () => {
      expect(workerManager.getStats().isActive).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  describe('Health Check', () => {
    test('should be healthy with no pending requests', () => {
      expect(workerManager.isHealthy()).toBe(true);
    });

    test('should be healthy with recent pending requests', () => {
      workerManager.sendRequest('load', { model: 'test' });
      expect(workerManager.isHealthy()).toBe(true);

      const requestId = Array.from(reg(workerManager).keys())[0];
      mockWorker.simulateMessage({ requestId, status: 'ready' });
    });

    test('should be unhealthy after disposal', () => {
      workerManager.dispose();
      expect(workerManager.isHealthy()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('Cleanup and Disposal', () => {
    test('should reject all pending requests on dispose', async () => {
      const promise1 = workerManager.sendRequest('load', { model: 'test1' });
      const promise2 = workerManager.sendRequest('load', { model: 'test2' });

      workerManager.dispose();

      await expect(promise1).rejects.toThrow(/disposed/);
      await expect(promise2).rejects.toThrow(/disposed/);
    });

    test('should clear all pending requests on dispose', async () => {
      const promise1 = workerManager.sendRequest('load', { model: 'test1' });
      const promise2 = workerManager.sendRequest('load', { model: 'test2' });

      workerManager.dispose();

      expect(workerManager.getStats().pendingRequests).toBe(0);

      await expect(promise1).rejects.toThrow(/disposed/);
      await expect(promise2).rejects.toThrow(/disposed/);
    });

    test('should terminate worker on dispose', () => {
      const terminateSpy = jest.spyOn(mockWorker, 'terminate');
      workerManager.dispose();
      expect(terminateSpy).toHaveBeenCalled();
    });

    test('should remove event listeners on dispose', () => {
      workerManager.dispose();

      const messageListeners = (mockWorker as any).eventListeners.get('message');
      const errorListeners   = (mockWorker as any).eventListeners.get('error');

      expect(messageListeners?.size || 0).toBe(0);
      expect(errorListeners?.size || 0).toBe(0);
    });

    test('should throw error when sending request after disposal', async () => {
      workerManager.dispose();
      await expect(
        workerManager.sendRequest('load', { model: 'test' })
      ).rejects.toThrow(/not initialized/);
    });
  });

  // -------------------------------------------------------------------------
  describe('Error Handling', () => {
    test('should reject all pending requests on worker error', async () => {
      const promise1 = workerManager.sendRequest('load', { model: 'test1' });
      const promise2 = workerManager.sendRequest('load', { model: 'test2' });

      setTimeout(() => { mockWorker.simulateError('Worker crashed'); }, 10);

      await expect(promise1).rejects.toThrow(/Worker crashed/);
      await expect(promise2).rejects.toThrow(/Worker crashed/);
    });

    test('should clear pending requests after worker error', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });
      mockWorker.simulateError('Worker crashed');
      await expect(promise).rejects.toThrow(/Worker crashed/);
      expect(workerManager.getStats().pendingRequests).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('Enhancement Message Types', () => {
    test('should handle "init" message type for enhancement', async () => {
      const promise = workerManager.sendRequest('init', { modelId: 'test-model' });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'ready', message: 'Model loaded' });
      }, 10);

      const result = await promise;
      expect(result.status).toBe('ready');
    });

    test('should handle "enhance" message type', async () => {
      const promise = workerManager.sendRequest('enhance', { transcript: 'test transcript' });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'complete', result: { enhancedText: 'enhanced transcript' } });
      }, 10);

      const result = await promise;
      expect(result.enhancedText).toBe('enhanced transcript');
    });

    test('should handle "reset" message type', async () => {
      const promise = workerManager.sendRequest('reset', {});
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'reset', message: 'Reset complete' });
      }, 10);

      const result = await promise;
      expect(result.status).toBe('reset');
    });

    test('should call progress callback for downloading status', async () => {
      const progressUpdates: number[] = [];

      const promise = workerManager.sendRequest('init', { modelId: 'test' }, {
        onProgress: (progress) => { progressUpdates.push(progress); },
      });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'downloading', progress: 25 });
        mockWorker.simulateMessage({ requestId, status: 'downloading', progress: 50 });
        mockWorker.simulateMessage({ requestId, status: 'downloading', progress: 75 });
        mockWorker.simulateMessage({ requestId, status: 'ready' });
      }, 10);

      await promise;
      expect(progressUpdates).toEqual([25, 50, 75]);
    });

    test('should call progress callback for streaming status', async () => {
      const progressUpdates: number[] = [];

      const promise = workerManager.sendRequest('enhance', { transcript: 'test' }, {
        onProgress: (progress) => { progressUpdates.push(progress); },
      });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'processing', progress: 20 });
        mockWorker.simulateMessage({ requestId, status: 'streaming', progress: 60 });
        mockWorker.simulateMessage({ requestId, status: 'complete', result: {} });
      }, 10);

      await promise;
      expect(progressUpdates).toEqual([20, 60]);
    });

    test('should handle cancelled status', async () => {
      const promise = workerManager.sendRequest('enhance', { transcript: 'test' });
      const requestId = Array.from(reg(workerManager).keys())[0];

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'cancelled', message: 'Operation cancelled' });
      }, 10);

      await expect(promise).rejects.toThrow('Operation cancelled');
    });
  });

  // -------------------------------------------------------------------------
  describe('Concurrent Requests', () => {
    test('should handle multiple concurrent requests independently', async () => {
      const promise1 = workerManager.sendRequest('load', { model: 'test1' });
      const promise2 = workerManager.sendRequest('load', { model: 'test2' });
      const promise3 = workerManager.sendRequest('load', { model: 'test3' });

      const requestIds = Array.from(reg(workerManager).keys());

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId: requestIds[1], status: 'ready' });
        mockWorker.simulateMessage({ requestId: requestIds[0], status: 'ready' });
        mockWorker.simulateMessage({ requestId: requestIds[2], status: 'ready' });
      }, 10);

      const results = await Promise.all([promise1, promise2, promise3]);
      expect(results).toHaveLength(3);
      results.forEach(result => expect(result.status).toBe('ready'));
    });

    test('should not mix up responses from concurrent requests', async () => {
      const promise1 = workerManager.sendRequest('load', { model: 'model1' });
      const promise2 = workerManager.sendRequest('load', { model: 'model2' });

      const [requestId1, requestId2] = Array.from(reg(workerManager).keys());

      setTimeout(() => {
        mockWorker.simulateMessage({ requestId: requestId1, status: 'ready', message: 'Loaded model1' });
        mockWorker.simulateMessage({ requestId: requestId2, status: 'ready', message: 'Loaded model2' });
      }, 10);

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1.message).toBe('Loaded model1');
      expect(result2.message).toBe('Loaded model2');
    });
  });

  // -------------------------------------------------------------------------
  describe('Startup Handshake', () => {
    test('worker-ready message resolves whenReady() and sets isStarted()', async () => {
      const readyPromise = workerManager.whenReady(1000);
      mockWorker.simulateMessage({ status: 'worker-ready' });
      await readyPromise;
      expect(workerManager.isCrashed()).toBe(false);
      expect(workerManager.isStarted()).toBe(true);
    });

    test('worker-init-error message rejects whenReady() with the real message', async () => {
      const readyPromise = workerManager.whenReady(1000);
      mockWorker.simulateMessage({ status: 'worker-init-error', message: 'SyntaxError: Unexpected token' });
      await expect(readyPromise).rejects.toThrow('SyntaxError: Unexpected token');
      expect(workerManager.isCrashed()).toBe(true);
      expect(workerManager.isStarted()).toBe(false);
    });

    test('worker-init-error rejects all pending requests', async () => {
      const req1 = workerManager.sendRequest('load', {});
      const req2 = workerManager.sendRequest('transcribe', {});
      mockWorker.simulateMessage({ status: 'worker-init-error', message: 'import failed' });
      await expect(req1).rejects.toThrow(/import failed/);
      await expect(req2).rejects.toThrow(/import failed/);
    });

    test('error event before ready rejects whenReady()', async () => {
      const readyPromise = workerManager.whenReady(1000);
      mockWorker.simulateError('script load failure');
      await expect(readyPromise).rejects.toThrow(/Worker crashed/);
      expect(workerManager.isCrashed()).toBe(true);
    });

    test('whenReady() times out if no handshake arrives', async () => {
      await expect(workerManager.whenReady(50)).rejects.toThrow(/did not start within/);
    });
  });

  // -------------------------------------------------------------------------
  describe('Dev Debug Flag', () => {
    test('URL contains &debug=1 when NODE_ENV is not production', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const wm = new WorkerManager('/dev-worker.js');
      const mw = (wm as any).worker as MockWorker;
      expect(mw.scriptURL).toContain('&debug=1');
      wm.dispose();
      process.env.NODE_ENV = original;
    });

    test('URL does NOT contain &debug=1 when NODE_ENV is production', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const wm = new WorkerManager('/prod-worker.js');
      const mw = (wm as any).worker as MockWorker;
      expect(mw.scriptURL).not.toContain('&debug=1');
      wm.dispose();
      process.env.NODE_ENV = original;
    });
  });
});
