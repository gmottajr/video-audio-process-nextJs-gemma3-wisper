/**
 * @jest-environment jsdom
 * 
 * Integration Tests for WorkerManager
 * 
 * Tests the request/response pattern and proper worker communication
 */

import { WorkerManager } from '@/lib/WorkerManager';

describe('WorkerManager', () => {
  let workerManager: WorkerManager;

  beforeEach(() => {
    // Create fresh worker manager for each test
    workerManager = new WorkerManager('/transcription.worker.js');
  });

  afterEach(() => {
    // Cleanup after each test
    if (workerManager) {
      workerManager.dispose();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(workerManager).toBeDefined();
      expect(workerManager.isHealthy()).toBe(true);
    });

    test('should have correct initial stats', () => {
      const stats = workerManager.getStats();
      expect(stats.pendingRequests).toBe(0);
      expect(stats.isActive).toBe(true);
      expect(stats.oldestRequestAge).toBeNull();
    });
  });

  describe('Model Loading', () => {
    test('should load whisper-tiny model successfully', async () => {
      const result = await workerManager.sendRequest('load', { 
        model: 'Xenova/whisper-tiny' 
      }, {
        timeoutMs: 120000 // 2 minutes for model loading
      });

      expect(result.status).toBe('ready');
      expect(result.message).toContain('Model');
    }, 150000); // 2.5 minute timeout for test

    test('should load whisper-base model successfully', async () => {
      const result = await workerManager.sendRequest('load', { 
        model: 'Xenova/whisper-base' 
      }, {
        timeoutMs: 300000 // 5 minutes for larger model
      });

      expect(result.status).toBe('ready');
    }, 350000); // 5.5 minute timeout for test

    test('should handle progress callbacks during model load', async () => {
      const progressUpdates: number[] = [];

      await workerManager.sendRequest('load', { 
        model: 'Xenova/whisper-tiny' 
      }, {
        timeoutMs: 120000,
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });

      // Should have received at least some progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
    }, 150000);
  });

  describe('Concurrent Requests', () => {
    test('should handle sequential model loads without race conditions', async () => {
      // Load first model
      const result1 = await workerManager.sendRequest('load', { 
        model: 'Xenova/whisper-tiny' 
      }, {
        timeoutMs: 120000
      });
      expect(result1.status).toBe('ready');

      // Load second model (should replace first)
      const result2 = await workerManager.sendRequest('load', { 
        model: 'Xenova/whisper-base' 
      }, {
        timeoutMs: 300000
      });
      expect(result2.status).toBe('ready');
    }, 450000); // 7.5 minutes total

    test('should track multiple pending requests correctly', async () => {
      // Start request but don't await yet
      const promise1 = workerManager.sendRequest('load', { 
        model: 'Xenova/whisper-tiny' 
      }, {
        timeoutMs: 120000
      });

      // Check immediately (before mock responds in 40ms)
      await new Promise(resolve => setTimeout(resolve, 5));

      const stats = workerManager.getStats();
      expect(stats.pendingRequests).toBeGreaterThanOrEqual(1);

      // Wait for completion
      await promise1;

      const finalStats = workerManager.getStats();
      expect(finalStats.pendingRequests).toBe(0);
    }, 150000);
  });

  describe('Error Handling', () => {
    test('should reject requests to disposed worker', async () => {
      workerManager.dispose();

      await expect(
        workerManager.sendRequest('load', { model: 'Xenova/whisper-tiny' })
      ).rejects.toThrow(/not initialized/);
    });

    test('should timeout after specified duration', async () => {
      // Use a timeout shorter than the mock's response time (40ms)
      await expect(
        workerManager.sendRequest('load', { 
          model: 'Xenova/whisper-base' 
        }, {
          timeoutMs: 20 // Shorter than mock's 40ms response
        })
      ).rejects.toThrow(/timed out/);
    }, 5000);
  });

  describe('Cleanup', () => {
    test('should dispose cleanly with pending requests', async () => {
      // Start a request
      const promise = workerManager.sendRequest('load', { 
        model: 'Xenova/whisper-base' 
      }, {
        timeoutMs: 300000
      });

      // Dispose immediately (before mock responds in 40ms)
      await new Promise(resolve => setTimeout(resolve, 5));
      workerManager.dispose();

      // Request should be rejected
      await expect(promise).rejects.toThrow(/disposed/);

      const stats = workerManager.getStats();
      expect(stats.pendingRequests).toBe(0);
      expect(stats.isActive).toBe(false);
    });

    test('should clean up all listeners on dispose', () => {
      const stats = workerManager.getStats();
      expect(stats.isActive).toBe(true);

      workerManager.dispose();

      const finalStats = workerManager.getStats();
      expect(finalStats.isActive).toBe(false);
    });
  });

  describe('Health Monitoring', () => {
    test('should report healthy status when active', () => {
      expect(workerManager.isHealthy()).toBe(true);
    });

    test('should report unhealthy after disposal', () => {
      workerManager.dispose();
      expect(workerManager.isHealthy()).toBe(false);
    });
  });
});

/**
 * Note: Transcription tests are not included here because they require:
 * 1. Model to be fully loaded (takes minutes)
 * 2. Audio data to be prepared
 * 3. Long processing time
 * 
 * Those should be tested in separate e2e tests with proper fixtures.
 */



