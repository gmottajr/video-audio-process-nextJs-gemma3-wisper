/**
 * @jest-environment jsdom
 */

/**
 * Unit Tests: EnhancerContext
 * 
 * Tests the AI Enhancement context provider and state management
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { EnhancerProvider, useEnhancerContext, useEnhancerContextOptional } from '@/contexts/EnhancerContext';

// Mock the hardware capabilities hook
jest.mock('@/hooks/useHardwareCapabilities', () => ({
  useHardwareCapabilities: () => ({
    isChecking: false,
    capabilities: {
      webGpuSupported: true,
      gpuTier: 'medium',
      gpuInfo: {
        vendor: 'NVIDIA',
        architecture: 'Test',
        device: 'Test GPU',
        description: 'Test GPU Description',
      },
      estimatedVRAM: 8,
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
    },
    error: null,
    canRunEnhancement: true,
  }),
}));

// Mock WorkerManager
const mockSendRequest = jest.fn();
const mockDispose = jest.fn();

jest.mock('@/lib/WorkerManager', () => ({
  WorkerManager: jest.fn().mockImplementation(() => ({
    sendRequest: mockSendRequest,
    dispose: mockDispose,
  })),
}));

describe('EnhancerContext', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <EnhancerProvider>{children}</EnhancerProvider>
  );

  describe('Context Provider', () => {
    test('should provide context to children', () => {
      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.capabilities).toBeDefined();
      expect(result.current.loadModel).toBeInstanceOf(Function);
      expect(result.current.enhance).toBeInstanceOf(Function);
    });

    test('should throw error when used outside provider', () => {
      // Suppress console error for this test
      const spy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useEnhancerContext());
      }).toThrow('useEnhancerContext must be used within EnhancerProvider');

      spy.mockRestore();
    });

    test('useEnhancerContextOptional should return null outside provider', () => {
      const { result } = renderHook(() => useEnhancerContextOptional());
      expect(result.current).toBeNull();
    });
  });

  describe('Initial State', () => {
    test('should have correct initial state', () => {
      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      expect(result.current.isModelLoaded).toBe(false);
      expect(result.current.isModelLoading).toBe(false);
      expect(result.current.isEnhancing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastResult).toBeNull();
      expect(result.current.progress).toBeNull();
    });

    test('should have hardware capabilities from hook', () => {
      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      expect(result.current.capabilities).toBeDefined();
      expect(result.current.capabilities?.isCapable).toBe(true);
      expect(result.current.capabilities?.gpuTier).toBe('medium');
    });
  });

  describe('loadModel', () => {
    test('should set loading state when loading model', async () => {
      mockSendRequest.mockResolvedValueOnce({ status: 'ready' });

      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      act(() => {
        result.current.loadModel();
      });

      expect(result.current.isModelLoading).toBe(true);
    });

    test('should set loaded state after successful load', async () => {
      mockSendRequest.mockResolvedValueOnce({ status: 'ready' });

      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      await act(async () => {
        await result.current.loadModel();
      });

      expect(result.current.isModelLoaded).toBe(true);
      expect(result.current.isModelLoading).toBe(false);
    });

    test('should set error state on load failure', async () => {
      mockSendRequest.mockRejectedValueOnce(new Error('Model load failed'));

      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      await act(async () => {
        try {
          await result.current.loadModel();
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Model load failed');
      expect(result.current.isModelLoading).toBe(false);
      expect(result.current.isModelLoaded).toBe(false);
    });

    test('should use suggested model from capabilities', async () => {
      mockSendRequest.mockResolvedValueOnce({ status: 'ready' });

      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      await act(async () => {
        await result.current.loadModel();
      });

      expect(mockSendRequest).toHaveBeenCalledWith(
        'init',
        { modelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC' },
        expect.any(Object)
      );
    });

    test('should skip loading if model already loaded with same ID', async () => {
      mockSendRequest.mockResolvedValue({ status: 'ready' });

      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      await act(async () => {
        await result.current.loadModel();
      });

      mockSendRequest.mockClear();

      await act(async () => {
        await result.current.loadModel();
      });

      // Should not call sendRequest again
      expect(mockSendRequest).not.toHaveBeenCalled();
    });
  });

  describe('enhance', () => {
    test('should throw error if model not loaded', async () => {
      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      await expect(result.current.enhance('test transcript')).rejects.toThrow('Model not loaded');
    });

    test('should throw error if transcript is empty', async () => {
      mockSendRequest.mockResolvedValueOnce({ status: 'ready' });

      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      await act(async () => {
        await result.current.loadModel();
      });

      await expect(result.current.enhance('')).rejects.toThrow('No transcript provided');
    });

    test('should set enhancing state during enhancement', async () => {
      let resolveEnhance: (value: any) => void;
      const enhancePromise = new Promise((resolve) => {
        resolveEnhance = resolve;
      });

      mockSendRequest
        .mockResolvedValueOnce({ status: 'ready' })
        .mockImplementationOnce(() => enhancePromise);

      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      await act(async () => {
        await result.current.loadModel();
      });

      act(() => {
        result.current.enhance('test transcript');
      });

      expect(result.current.isEnhancing).toBe(true);

      await act(async () => {
        resolveEnhance!({
          enhancedText: 'enhanced',
          originalText: 'test transcript',
          improvements: {
            fillerWordsRemoved: [],
            fillerCount: 0,
            grammarFixes: 0,
            originalWordCount: 2,
            enhancedWordCount: 1,
            originalCharCount: 15,
            enhancedCharCount: 8,
            compressionRatio: 0.5,
            reductionPercentage: 50,
          },
          processingTime: 5,
          tokensGenerated: 50,
          modelUsed: 'test',
          timestamp: new Date().toISOString(),
        });
      });
    });

    test('should store result after successful enhancement', async () => {
      const mockResult = {
        enhancedText: 'Enhanced transcript',
        originalText: 'Original transcript',
        improvements: {
          fillerWordsRemoved: ['um'],
          fillerCount: 1,
          grammarFixes: 0,
          originalWordCount: 10,
          enhancedWordCount: 9,
          originalCharCount: 50,
          enhancedCharCount: 45,
          compressionRatio: 0.9,
          reductionPercentage: 10,
        },
        processingTime: 5.5,
        tokensGenerated: 100,
        modelUsed: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        timestamp: new Date().toISOString(),
      };

      mockSendRequest
        .mockResolvedValueOnce({ status: 'ready' })
        .mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      await act(async () => {
        await result.current.loadModel();
      });

      await act(async () => {
        await result.current.enhance('Original transcript');
      });

      expect(result.current.lastResult).toBeDefined();
      expect(result.current.lastResult?.enhancedText).toBe('Enhanced transcript');
    });
  });

  describe('clearError', () => {
    test('should clear error state', async () => {
      mockSendRequest.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      await act(async () => {
        try {
          await result.current.loadModel();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('clearResult', () => {
    test('should clear last result', async () => {
      const mockResult = {
        enhancedText: 'test',
        originalText: 'test original',
        improvements: {
          fillerWordsRemoved: [],
          fillerCount: 0,
          grammarFixes: 0,
          originalWordCount: 2,
          enhancedWordCount: 1,
          originalCharCount: 12,
          enhancedCharCount: 4,
          compressionRatio: 0.3,
          reductionPercentage: 70,
        },
        processingTime: 1,
        tokensGenerated: 10,
        modelUsed: 'test',
        timestamp: new Date().toISOString(),
      };

      mockSendRequest
        .mockResolvedValueOnce({ status: 'ready' })
        .mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      // Load model first
      await act(async () => {
        await result.current.loadModel();
      });

      // Enhance transcript
      await act(async () => {
        await result.current.enhance('test original');
      });

      expect(result.current.lastResult).toBeDefined();

      act(() => {
        result.current.clearResult();
      });

      expect(result.current.lastResult).toBeNull();
    });
  });

  describe('reset', () => {
    test('should reset all state', async () => {
      const mockResult = {
        enhancedText: 'test',
        originalText: 'test original',
        improvements: {
          fillerWordsRemoved: [],
          fillerCount: 0,
          grammarFixes: 0,
          originalWordCount: 2,
          enhancedWordCount: 1,
          originalCharCount: 12,
          enhancedCharCount: 4,
          compressionRatio: 0.3,
          reductionPercentage: 70,
        },
        processingTime: 1,
        tokensGenerated: 10,
        modelUsed: 'test',
        timestamp: new Date().toISOString(),
      };

      mockSendRequest
        .mockResolvedValueOnce({ status: 'ready' })
        .mockResolvedValueOnce(mockResult)
        .mockResolvedValueOnce({ status: 'reset' });

      const { result } = renderHook(() => useEnhancerContext(), { wrapper });

      // Load model first
      await act(async () => {
        await result.current.loadModel();
      });

      // Enhance transcript
      await act(async () => {
        await result.current.enhance('test original');
      });

      expect(result.current.isModelLoaded).toBe(true);
      expect(result.current.lastResult).toBeDefined();

      act(() => {
        result.current.reset();
      });

      expect(result.current.isModelLoaded).toBe(false);
      expect(result.current.lastResult).toBeNull();
      expect(result.current.progress).toBeNull();
    });
  });
});
