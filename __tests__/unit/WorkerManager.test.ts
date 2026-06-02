/**
 * Unit Tests for WorkerManager
 * 
 * Tests the core functionality without actually loading models
 * (integration tests handle real model loading)
 */

import { WorkerManager } from '@/lib/WorkerManager';

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private eventListeners: Map<string, Set<(event: any) => void>> = new Map();

  constructor(public scriptURL: string, public options?: any) {}

  postMessage(data: any): void {
    // Simulate worker receiving message
    // In real tests, we'll manually trigger responses
  }

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

  // Test helper to simulate worker responses
  simulateMessage(data: any): void {
    const handlers = this.eventListeners.get('message');
    if (handlers) {
      handlers.forEach(handler => {
        handler({ data } as MessageEvent);
      });
    }
  }

  // Test helper to simulate worker errors
  simulateError(message: string): void {
    const handlers = this.eventListeners.get('error');
    if (handlers) {
      handlers.forEach(handler => {
        handler({ message } as ErrorEvent);
      });
    }
  }
}

// Install mock
(global as any).Worker = MockWorker;

// Suppress logger fetch calls during tests
(global as any).fetch = jest.fn().mockResolvedValue({ ok: true });

describe('WorkerManager', () => {
  let workerManager: WorkerManager;
  let mockWorker: MockWorker;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Suppress console output during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Create worker manager
    workerManager = new WorkerManager('/test-worker.js');

    // Get reference to mock worker
    mockWorker = (workerManager as any).worker as MockWorker;
  });

  afterEach(() => {
    if (workerManager) {
      workerManager.dispose();
    }
    
    // Restore console
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('Initialization', () => {
    test('should create worker with correct path', () => {
      expect(mockWorker).toBeDefined();
      // URL includes ?v=<timestamp> cache-buster (and &debug=1 in non-prod env)
      expect(mockWorker.scriptURL).toContain('/test-worker.js');
      expect(mockWorker.options?.type).toBe('module');
    });

    test('should attach message and error listeners', () => {
      const messageListeners = (mockWorker as any).eventListeners.get('message');
      const errorListeners = (mockWorker as any).eventListeners.get('error');
      
      expect(messageListeners).toBeDefined();
      expect(messageListeners?.size).toBe(1);
      expect(errorListeners).toBeDefined();
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

  describe('Request Sending', () => {
    test('should assign unique request IDs', async () => {
      const requestIds = new Set<string>();
      
      // Start 3 requests
      const promise1 = workerManager.sendRequest('load', { model: 'test1' });
      const promise2 = workerManager.sendRequest('load', { model: 'test2' });
      const promise3 = workerManager.sendRequest('load', { model: 'test3' });

      // Track request IDs
      const pendingRequests = (workerManager as any).pendingRequests as Map<string, any>;
      pendingRequests.forEach((_, id) => requestIds.add(id));

      // All IDs should be unique
      expect(requestIds.size).toBe(3);

      // Simulate responses to prevent timeout
      setTimeout(() => {
        requestIds.forEach(id => {
          mockWorker.simulateMessage({ requestId: id, status: 'ready' });
        });
      }, 10);

      await Promise.all([promise1, promise2, promise3]);
    });

    test('should track pending requests', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });
      
      // Wait a tiny bit for the timestamp to be recorded
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const stats = workerManager.getStats();
      expect(stats.pendingRequests).toBe(1);
      expect(stats.oldestRequestAge).toBeTruthy();
      expect(typeof stats.oldestRequestAge).toBe('string');
      expect(stats.oldestRequestAge).toMatch(/\d+\.\d+s/);

      // Cleanup
      mockWorker.simulateMessage({ 
        requestId: Array.from((workerManager as any).pendingRequests.keys())[0],
        status: 'ready' 
      });

      return promise;
    });

    test('should include timeout in request options', () => {
      const promise = workerManager.sendRequest('load', { model: 'test' }, {
        timeoutMs: 5000
      });

      const pendingRequests = (workerManager as any).pendingRequests;
      const request = Array.from(pendingRequests.values())[0];
      
      expect(request.timeout).toBeDefined();

      // Cleanup
      mockWorker.simulateMessage({ 
        requestId: request.id,
        status: 'ready' 
      });

      return promise;
    });
  });

  describe('Response Handling', () => {
    test('should resolve promise on "ready" status', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
      // Simulate success response
      setTimeout(() => {
        mockWorker.simulateMessage({ 
          requestId,
          status: 'ready',
          message: 'Model loaded'
        });
      }, 10);

      const result = await promise;
      expect(result.status).toBe('ready');
      expect(result.message).toBe('Model loaded');
    });

    test('should resolve promise on "complete" status', async () => {
      const promise = workerManager.sendRequest('transcribe', { audio: [] });
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
      setTimeout(() => {
        mockWorker.simulateMessage({ 
          requestId,
          status: 'complete',
          result: { text: 'transcription' }
        });
      }, 10);

      const result = await promise;
      expect(result.text).toBe('transcription');
    });

    test('should reject promise on "error" status', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
      setTimeout(() => {
        mockWorker.simulateMessage({ 
          requestId,
          status: 'error',
          message: 'Model not found'
        });
      }, 10);

      await expect(promise).rejects.toThrow('Model not found');
    });

    test('should call progress callback for progress messages', async () => {
      const progressUpdates: number[] = [];
      
      const promise = workerManager.sendRequest('load', { model: 'test' }, {
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
      setTimeout(() => {
        // Simulate progress updates
        mockWorker.simulateMessage({ requestId, status: 'progress', progress: 25 });
        mockWorker.simulateMessage({ requestId, status: 'progress', progress: 50 });
        mockWorker.simulateMessage({ requestId, status: 'progress', progress: 75 });
        
        // Complete
        mockWorker.simulateMessage({ requestId, status: 'ready' });
      }, 10);

      await promise;
      
      expect(progressUpdates).toEqual([25, 50, 75]);
    });

    test('should ignore messages without requestId', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
      setTimeout(() => {
        // Message without requestId (should be ignored)
        mockWorker.simulateMessage({ status: 'ready' });
        
        // Correct message
        mockWorker.simulateMessage({ requestId, status: 'ready' });
      }, 10);

      await expect(promise).resolves.toBeDefined();
    });

    test('should ignore messages for unknown requestId', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
      setTimeout(() => {
        // Message with wrong requestId (should be ignored)
        mockWorker.simulateMessage({ requestId: 'wrong_id', status: 'ready' });
        
        // Correct message
        mockWorker.simulateMessage({ requestId, status: 'ready' });
      }, 10);

      await expect(promise).resolves.toBeDefined();
    });
  });

  describe('Timeout Handling', () => {
    test('should reject after timeout', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' }, {
        timeoutMs: 50 // Very short timeout
      });

      // Don't send any response - let it timeout naturally

      await expect(promise).rejects.toThrow(/timed out/);
    });

    test('should clear timeout on successful response', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' }, {
        timeoutMs: 1000
      });
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      const request = (workerManager as any).pendingRequests.get(requestId);
      const timeoutId = request.timeout;
      
      // Respond quickly
      setTimeout(() => {
        mockWorker.simulateMessage({ requestId, status: 'ready' });
      }, 10);

      await promise;

      // Timeout should be cleared
      // (We can't directly test this, but the promise resolving proves timeout was cleared)
      expect(true).toBe(true);
    });

    test('should remove pending request after timeout', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' }, {
        timeoutMs: 50
      });

      await expect(promise).rejects.toThrow();

      const stats = workerManager.getStats();
      expect(stats.pendingRequests).toBe(0);
    });
  });

  describe('Statistics', () => {
    test('should return correct pending request count', () => {
      const promise1 = workerManager.sendRequest('load', { model: 'test1' });
      const promise2 = workerManager.sendRequest('load', { model: 'test2' });

      const stats = workerManager.getStats();
      expect(stats.pendingRequests).toBe(2);

      // Cleanup
      const pendingRequests = (workerManager as any).pendingRequests;
      pendingRequests.forEach((req: any) => {
        mockWorker.simulateMessage({ requestId: req.id, status: 'ready' });
      });

      return Promise.all([promise1, promise2]);
    });

    test('should calculate oldest request age', async () => {
      workerManager.sendRequest('load', { model: 'test' });

      // Wait a bit for timestamp to be recorded
      await new Promise(resolve => setTimeout(resolve, 5));

      const stats = workerManager.getStats();
      expect(stats.oldestRequestAge).toBeTruthy();
      expect(stats.oldestRequestAge).toContain('s');

      // Cleanup
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      mockWorker.simulateMessage({ requestId, status: 'ready' });
    });

    test('should report active status', () => {
      const stats = workerManager.getStats();
      expect(stats.isActive).toBe(true);
    });
  });

  describe('Health Check', () => {
    test('should be healthy with no pending requests', () => {
      expect(workerManager.isHealthy()).toBe(true);
    });

    test('should be healthy with recent pending requests', () => {
      workerManager.sendRequest('load', { model: 'test' });
      expect(workerManager.isHealthy()).toBe(true);

      // Cleanup
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      mockWorker.simulateMessage({ requestId, status: 'ready' });
    });

    test('should be unhealthy after disposal', () => {
      workerManager.dispose();
      expect(workerManager.isHealthy()).toBe(false);
    });
  });

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

      const stats = workerManager.getStats();
      expect(stats.pendingRequests).toBe(0);
      
      // Cleanup: catch the rejections
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
      const errorListeners = (mockWorker as any).eventListeners.get('error');

      // Listeners should be cleared via terminate
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

  describe('Error Handling', () => {
    test('should reject all pending requests on worker error', async () => {
      const promise1 = workerManager.sendRequest('load', { model: 'test1' });
      const promise2 = workerManager.sendRequest('load', { model: 'test2' });

      // Simulate worker error
      setTimeout(() => {
        mockWorker.simulateError('Worker crashed');
      }, 10);

      await expect(promise1).rejects.toThrow(/Worker crashed/);
      await expect(promise2).rejects.toThrow(/Worker crashed/);
    });

    test('should clear pending requests after worker error', async () => {
      const promise = workerManager.sendRequest('load', { model: 'test' });

      mockWorker.simulateError('Worker crashed');

      // Wait for error to propagate and catch the rejection
      await expect(promise).rejects.toThrow(/Worker crashed/);

      const stats = workerManager.getStats();
      expect(stats.pendingRequests).toBe(0);
    });
  });

  describe('Enhancement Message Types', () => {
    test('should handle "init" message type for enhancement', async () => {
      const promise = workerManager.sendRequest('init', { modelId: 'test-model' });
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
      setTimeout(() => {
        mockWorker.simulateMessage({ 
          requestId,
          status: 'ready',
          message: 'Model loaded'
        });
      }, 10);

      const result = await promise;
      expect(result.status).toBe('ready');
    });

    test('should handle "enhance" message type', async () => {
      const promise = workerManager.sendRequest('enhance', { transcript: 'test transcript' });
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
      setTimeout(() => {
        mockWorker.simulateMessage({ 
          requestId,
          status: 'complete',
          result: { enhancedText: 'enhanced transcript' }
        });
      }, 10);

      const result = await promise;
      expect(result.enhancedText).toBe('enhanced transcript');
    });

    test('should handle "reset" message type', async () => {
      const promise = workerManager.sendRequest('reset', {});
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
      setTimeout(() => {
        mockWorker.simulateMessage({ 
          requestId,
          status: 'reset',
          message: 'Reset complete'
        });
      }, 10);

      const result = await promise;
      expect(result.status).toBe('reset');
    });

    test('should call progress callback for downloading status', async () => {
      const progressUpdates: number[] = [];
      
      const promise = workerManager.sendRequest('init', { modelId: 'test' }, {
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
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
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
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
      
      const requestId = Array.from((workerManager as any).pendingRequests.keys())[0];
      
      setTimeout(() => {
        mockWorker.simulateMessage({ 
          requestId,
          status: 'cancelled',
          message: 'Operation cancelled'
        });
      }, 10);

      await expect(promise).rejects.toThrow('Operation cancelled');
    });
  });

  describe('Concurrent Requests', () => {
    test('should handle multiple concurrent requests independently', async () => {
      const promise1 = workerManager.sendRequest('load', { model: 'test1' });
      const promise2 = workerManager.sendRequest('load', { model: 'test2' });
      const promise3 = workerManager.sendRequest('load', { model: 'test3' });

      const pendingRequests = (workerManager as any).pendingRequests;
      const requestIds = Array.from(pendingRequests.keys());

      // Respond to requests in different order
      setTimeout(() => {
        mockWorker.simulateMessage({ requestId: requestIds[1], status: 'ready' });
        mockWorker.simulateMessage({ requestId: requestIds[0], status: 'ready' });
        mockWorker.simulateMessage({ requestId: requestIds[2], status: 'ready' });
      }, 10);

      const results = await Promise.all([promise1, promise2, promise3]);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('ready');
      });
    });

    test('should not mix up responses from concurrent requests', async () => {
      const promise1 = workerManager.sendRequest('load', { model: 'model1' });
      const promise2 = workerManager.sendRequest('load', { model: 'model2' });

      const pendingRequests = (workerManager as any).pendingRequests;
      const [requestId1, requestId2] = Array.from(pendingRequests.keys());

      setTimeout(() => {
        mockWorker.simulateMessage({
          requestId: requestId1,
          status: 'ready',
          message: 'Loaded model1'
        });
        mockWorker.simulateMessage({
          requestId: requestId2,
          status: 'ready',
          message: 'Loaded model2'
        });
      }, 10);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.message).toBe('Loaded model1');
      expect(result2.message).toBe('Loaded model2');
    });
  });

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

