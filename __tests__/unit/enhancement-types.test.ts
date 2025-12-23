/**
 * Unit Tests: Enhancement Types
 * 
 * Tests TypeScript type exports and constants from types/enhancement.ts
 */

import {
  ENHANCEMENT_MODELS,
  DEFAULT_MODEL,
  type HardwareCapabilities,
  type EnhancementStage,
  type EnhancementProgress,
  type EnhancementResult,
  type EnhanceOptions,
  type EnhancedTranscriptionResult,
  type ModelConfig,
} from '@/types/enhancement';

describe('Enhancement Types', () => {
  describe('ENHANCEMENT_MODELS', () => {
    test('should contain llama-3.2-3b model', () => {
      expect(ENHANCEMENT_MODELS['llama-3.2-3b']).toBeDefined();
      expect(ENHANCEMENT_MODELS['llama-3.2-3b'].id).toBe('Llama-3.2-3B-Instruct-q4f16_1-MLC');
      expect(ENHANCEMENT_MODELS['llama-3.2-3b'].name).toBe('Llama 3.2 3B');
    });

    test('should contain gemma-2-2b model', () => {
      expect(ENHANCEMENT_MODELS['gemma-2-2b']).toBeDefined();
      expect(ENHANCEMENT_MODELS['gemma-2-2b'].id).toBe('gemma-2-2b-it-q4f16_1-MLC');
    });

    test('should contain qwen-0.5b model', () => {
      expect(ENHANCEMENT_MODELS['qwen-0.5b']).toBeDefined();
      expect(ENHANCEMENT_MODELS['qwen-0.5b'].id).toBe('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
    });

    test('all models should have required properties', () => {
      Object.values(ENHANCEMENT_MODELS).forEach((model) => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('size');
        expect(model).toHaveProperty('description');
        expect(model).toHaveProperty('minVRAM');
        expect(model).toHaveProperty('recommendedTier');
        
        expect(typeof model.id).toBe('string');
        expect(typeof model.name).toBe('string');
        expect(typeof model.size).toBe('string');
        expect(typeof model.minVRAM).toBe('number');
      });
    });
  });

  describe('DEFAULT_MODEL', () => {
    test('should be Llama 3.2 3B', () => {
      expect(DEFAULT_MODEL).toBe(ENHANCEMENT_MODELS['llama-3.2-3b']);
    });

    test('should have correct ID', () => {
      expect(DEFAULT_MODEL.id).toBe('Llama-3.2-3B-Instruct-q4f16_1-MLC');
    });
  });

  describe('Type Structure Validation', () => {
    test('HardwareCapabilities should have expected shape', () => {
      const mockCapabilities: HardwareCapabilities = {
        webGpuSupported: true,
        gpuTier: 'medium',
        gpuInfo: {
          vendor: 'NVIDIA',
          architecture: 'Ampere',
          device: 'RTX 3080',
          description: 'NVIDIA GeForce RTX 3080',
        },
        estimatedVRAM: 10,
        deviceMemory: 16,
        cpuCores: 8,
        isCapable: true,
        recommendation: {
          canRun: true,
          suggestedModel: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
          estimatedLoadTime: '1-2 minutes',
          estimatedProcessTime: '30-60 seconds',
          warnings: [],
        },
      };

      expect(mockCapabilities.webGpuSupported).toBe(true);
      expect(mockCapabilities.gpuTier).toBe('medium');
      expect(mockCapabilities.isCapable).toBe(true);
    });

    test('EnhancementProgress should have expected shape', () => {
      const mockProgress: EnhancementProgress = {
        stage: 'processing',
        progress: 50,
        message: 'Enhancing transcript...',
        tokensGenerated: 100,
      };

      expect(mockProgress.stage).toBe('processing');
      expect(mockProgress.progress).toBe(50);
    });

    test('EnhancementResult should have expected shape', () => {
      const mockResult: EnhancementResult = {
        originalText: 'um like you know',
        enhancedText: 'You know',
        improvements: {
          fillerWordsRemoved: ['um', 'like'],
          fillerCount: 2,
          grammarFixes: 0,
          originalWordCount: 4,
          enhancedWordCount: 2,
          originalCharCount: 16,
          enhancedCharCount: 8,
          compressionRatio: 0.5,
          reductionPercentage: 50,
        },
        processingTime: 5.5,
        tokensGenerated: 50,
        modelUsed: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        timestamp: new Date(),
      };

      expect(mockResult.improvements.fillerCount).toBe(2);
      expect(mockResult.improvements.reductionPercentage).toBe(50);
    });

    test('EnhancementStage should include all expected values', () => {
      const stages: EnhancementStage[] = [
        'idle',
        'checking-hardware',
        'downloading',
        'loading',
        'processing',
        'streaming',
        'complete',
        'error',
        'cancelled',
      ];

      // Just verify these are valid - TypeScript will catch invalid values at compile time
      stages.forEach((stage) => {
        expect(typeof stage).toBe('string');
      });
    });
  });
});








