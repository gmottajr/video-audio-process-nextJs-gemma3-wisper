/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for NPU detection and device selection
 */

import {
  detectSystemCapabilities,
  calculateOptimalWorkers,
  type SystemCapabilities
} from '@/utils/systemCapabilities';

describe('NPU Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset navigator.ml mock
    // @ts-ignore
    delete (navigator as any).ml;
  });

  describe('detectSystemCapabilities', () => {
    it('should detect NPU when WebNN is available and NPU context succeeds', async () => {
      // Setup: WebNN available with NPU support
      // @ts-ignore
      navigator.ml = {
        createContext: jest.fn().mockResolvedValue({ deviceType: 'npu' }),
      };

      const capabilities = await detectSystemCapabilities();

      expect(capabilities.npu).toBeDefined();
      expect(capabilities.npu.webnnSupported).toBe(true);
      expect(capabilities.npu.available).toBe(true);
    });

    it('should report NPU unavailable when WebNN exists but NPU context fails', async () => {
      // Setup: WebNN available but NPU not supported
      // @ts-ignore
      navigator.ml = {
        createContext: jest.fn().mockRejectedValue(new Error('NPU not available')),
      };

      const capabilities = await detectSystemCapabilities();

      expect(capabilities.npu.webnnSupported).toBe(true);
      expect(capabilities.npu.available).toBe(false);
    });

    it('should report WebNN not supported when navigator.ml does not exist', async () => {
      // Setup: No WebNN API
      // navigator.ml is already undefined from beforeEach

      const capabilities = await detectSystemCapabilities();

      expect(capabilities.npu.webnnSupported).toBe(false);
      expect(capabilities.npu.available).toBe(false);
    });
  });

  describe('calculateOptimalWorkers', () => {
    const baseCapabilities: SystemCapabilities = {
      cpu: { cores: 8, threads: 16 },
      gpu: { available: true, webgpuSupported: true },
      npu: { available: false, webnnSupported: false },
      memory: { totalGB: 16, availableGB: 10 },
      browser: { name: 'Chrome', version: '120' },
    };

    it('should recommend GPU when NPU is not available', () => {
      const recommendation = calculateOptimalWorkers(baseCapabilities);

      expect(recommendation.useNPU).toBe(false);
      expect(recommendation.useGPU).toBe(true);
      expect(recommendation.preferredDevice).toBe('gpu');
    });

    it('should recommend NPU when available', () => {
      const capabilitiesWithNPU: SystemCapabilities = {
        ...baseCapabilities,
        npu: { available: true, webnnSupported: true, deviceName: 'Intel NPU' },
      };

      const recommendation = calculateOptimalWorkers(capabilitiesWithNPU);

      expect(recommendation.useNPU).toBe(true);
      expect(recommendation.preferredDevice).toBe('npu');
    });

    it('should include NPU in reasoning when detected', () => {
      const capabilitiesWithNPU: SystemCapabilities = {
        ...baseCapabilities,
        npu: { available: true, webnnSupported: true },
      };

      const recommendation = calculateOptimalWorkers(capabilitiesWithNPU);

      expect(recommendation.reasoning.some(r => r.includes('NPU'))).toBe(true);
    });

    it('should fall back to CPU when no GPU or NPU', () => {
      const cpuOnlyCapabilities: SystemCapabilities = {
        ...baseCapabilities,
        gpu: { available: false, webgpuSupported: false },
        npu: { available: false, webnnSupported: false },
      };

      const recommendation = calculateOptimalWorkers(cpuOnlyCapabilities);

      expect(recommendation.useNPU).toBe(false);
      expect(recommendation.useGPU).toBe(false);
      expect(recommendation.preferredDevice).toBe('cpu');
    });
  });
});

describe('DevicePreference Type', () => {
  it('should accept valid device preferences', () => {
    // Type check - these should compile without errors
    const preferences: Array<'auto' | 'npu' | 'gpu' | 'cpu'> = [
      'auto',
      'npu',
      'gpu',
      'cpu',
    ];

    expect(preferences).toHaveLength(4);
  });
});

describe('WorkerRecommendation', () => {
  it('should have required NPU-related fields', () => {
    const baseCapabilities: SystemCapabilities = {
      cpu: { cores: 4, threads: 8 },
      gpu: { available: true, webgpuSupported: true },
      npu: { available: true, webnnSupported: true },
      memory: { totalGB: 8, availableGB: 5 },
      browser: { name: 'Chrome', version: '120' },
    };

    const recommendation = calculateOptimalWorkers(baseCapabilities);

    // Verify new fields exist
    expect(recommendation).toHaveProperty('useNPU');
    expect(recommendation).toHaveProperty('preferredDevice');
    expect(['npu', 'gpu', 'cpu']).toContain(recommendation.preferredDevice);
  });
});
