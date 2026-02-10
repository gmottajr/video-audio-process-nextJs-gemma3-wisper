/**
 * Tests for utils/ParallelRuntime.ts
 */
import { ParallelRuntime, createParallelRuntime } from '@/utils/ParallelRuntime';

jest.mock('@/utils/systemCapabilities', () => ({
  detectSystemCapabilities: jest.fn(),
  calculateOptimalWorkers: jest.fn(),
}));

import {
  detectSystemCapabilities,
  calculateOptimalWorkers,
} from '@/utils/systemCapabilities';

const mockDetect = detectSystemCapabilities as jest.Mock;
const mockCalculate = calculateOptimalWorkers as jest.Mock;

describe('ParallelRuntime', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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

      expect(runtime.getOptimalWorkerCount()).toBe(4);
    });

    it('should apply aggressive strategy', async () => {
      const runtime = new ParallelRuntime({ strategy: 'aggressive' });
      await runtime.initialize();

      expect(runtime.getOptimalWorkerCount()).toBe(12);
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
