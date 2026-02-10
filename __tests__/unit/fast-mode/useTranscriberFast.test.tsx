/**
 * Unit Tests: useTranscriberFast Hook
 * 
 * Tests the Fast Mode transcription hook, specifically:
 * - Return value from transcribe() for immediate use (React state is async)
 * - State management
 * - Config updates
 * 
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTranscriberFast } from '@/hooks/useTranscriberFast';
import type { FastModeTranscriptionResult } from '@/types/fast-mode';

// Mock Worker for fast mode
class MockFastWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  protected eventListeners: Map<string, Set<(event: any) => void>> = new Map();

  constructor(public scriptURL: string) {}

  postMessage(data: any): void {
    setTimeout(() => {
      const dispatch = (event: MessageEvent) => {
        if (this.onmessage) this.onmessage(event);
        this.eventListeners.get('message')?.forEach(handler => handler(event));
      };

      if (data.type === 'init') {
        dispatch({
          data: {
            type: 'init-complete',
            requestId: data.requestId,
            data: { success: true },
          },
        } as MessageEvent);
        return;
      }

      if (data.type === 'transcribe') {
        dispatch({
          data: {
            type: 'result',
            requestId: data.requestId,
            data: {
              chunkIndex: data.chunkIndex,
              text: `Transcribed chunk ${data.chunkIndex}`,
              segments: [
                {
                  start: data.startOffset,
                  end: data.endOffset,
                  text: `Transcribed chunk ${data.chunkIndex}`,
                },
              ],
              processingTime: 100,
              startOffset: data.startOffset,
              endOffset: data.endOffset,
            },
          },
        } as MessageEvent);
      }
    }, 10); // Fast response for unit tests
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
}

// Install mock Worker
(global as any).Worker = MockFastWorker;

describe('useTranscriberFast Hook', () => {
  const OriginalWorker = (global as any).Worker;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).Worker = MockFastWorker;
  });

  afterEach(() => {
    (global as any).Worker = OriginalWorker;
  });

  describe('transcribe() return value', () => {
    /**
     * CRITICAL TEST: This tests the fix for the bug where Fast Mode transcription
     * completed but didn't transition to the "Done" state.
     * 
     * The root cause was that React state updates are asynchronous. When the hook's
     * transcribe() function called setResult(finalResult), the state wasn't immediately
     * available to the caller. The fix was to return the result directly from transcribe().
     */
    test('should return result directly from transcribe() for immediate use', async () => {
      const { result } = renderHook(() => useTranscriberFast());

      const sampleRate = 16000;
      const duration = 5;
      const audioData = new Float32Array(sampleRate * duration);

      let returnedResult: FastModeTranscriptionResult | null = null;

      await act(async () => {
        // The transcribe function should return the result directly
        returnedResult = await result.current.transcribe(audioData, duration);
      });

      // The returned result should be available immediately (not null)
      // This is the key assertion - without the fix, returnedResult would be null
      expect(returnedResult).not.toBeNull();
      expect(returnedResult?.text).toBeTruthy();
      expect(returnedResult?.segments).toBeDefined();
      expect(returnedResult?.segments.length).toBeGreaterThan(0);
    });

    test('returned result should match state result after render', async () => {
      const { result } = renderHook(() => useTranscriberFast());

      const audioData = new Float32Array(16000 * 5);
      const duration = 5;

      let returnedResult: FastModeTranscriptionResult | null = null;

      await act(async () => {
        returnedResult = await result.current.transcribe(audioData, duration);
      });

      // Wait for state to update
      await waitFor(() => {
        expect(result.current.mode).toBe('complete');
      }, { timeout: 5000 });

      // Both should have the same data
      expect(returnedResult).not.toBeNull();
      expect(result.current.result).not.toBeNull();
      expect(returnedResult?.text).toBe(result.current.result?.text);
      expect(returnedResult?.segments.length).toBe(result.current.result?.segments.length);
    });

    test('should return null when transcription is cancelled', async () => {
      const { result } = renderHook(() => useTranscriberFast());

      const audioData = new Float32Array(16000 * 60); // 1 minute - longer to allow cancellation
      const duration = 60;

      let returnedResult: FastModeTranscriptionResult | null | undefined;

      // Start transcription without awaiting
      const transcribePromise = act(async () => {
        returnedResult = await result.current.transcribe(audioData, duration);
      });

      // Cancel after a short delay
      await new Promise(resolve => setTimeout(resolve, 50));
      act(() => {
        result.current.cancel();
      });

      await transcribePromise;

      // Cancelled transcription should return null
      expect(returnedResult).toBeNull();
    });

    test('should return null when transcription fails', async () => {
      // Create error-throwing worker
      class ErrorWorker extends MockFastWorker {
        postMessage(msg: any): void {
          setTimeout(() => {
            const dispatch = (event: MessageEvent) => {
              if (this.onmessage) this.onmessage(event);
              this.eventListeners.get('message')?.forEach(handler => handler(event));
            };
            if (msg.type === 'init') {
              dispatch({
                data: {
                  type: 'init-complete',
                  requestId: msg.requestId,
                  data: { success: true },
                },
              } as MessageEvent);
            } else if (msg.type === 'transcribe') {
              dispatch({
                data: {
                  type: 'error',
                  requestId: msg.requestId,
                  data: { error: 'Worker processing failed' },
                },
              } as MessageEvent);
            }
          }, 10);
        }
      }

      (global as any).Worker = ErrorWorker;

      const { result } = renderHook(() => useTranscriberFast());

      const audioData = new Float32Array(16000 * 5);
      const duration = 5;

      let returnedResult: FastModeTranscriptionResult | null | undefined;

      await act(async () => {
        returnedResult = await result.current.transcribe(audioData, duration);
      });

      // Failed transcription should return null
      expect(returnedResult).toBeNull();
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('state management', () => {
    test('should initialize with idle state', () => {
      const { result } = renderHook(() => useTranscriberFast());

      expect(result.current.mode).toBe('idle');
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.progress.percent).toBe(0);
    });

    test('should transition through states during transcription', async () => {
      const { result } = renderHook(() => useTranscriberFast());

      const audioData = new Float32Array(16000 * 10);
      const duration = 10;

      const observedModes: string[] = [];

      // Capture mode changes
      const captureMode = () => {
        if (observedModes[observedModes.length - 1] !== result.current.mode) {
          observedModes.push(result.current.mode);
        }
      };

      // Start transcription
      await act(async () => {
        captureMode();
        await result.current.transcribe(audioData, duration);
        captureMode();
      });

      await waitFor(() => {
        expect(result.current.mode).toBe('complete');
      }, { timeout: 5000 });

      // Should have transitioned through multiple states
      expect(observedModes).toContain('idle');
      expect(result.current.mode).toBe('complete');
    });

    test('should reset state properly', async () => {
      const { result } = renderHook(() => useTranscriberFast());

      const audioData = new Float32Array(16000 * 5);
      const duration = 5;

      await act(async () => {
        await result.current.transcribe(audioData, duration);
      });

      await waitFor(() => {
        expect(result.current.mode).toBe('complete');
      }, { timeout: 5000 });

      expect(result.current.result).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.mode).toBe('idle');
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.progress.percent).toBe(0);
    });
  });

  describe('config updates', () => {
    test('should accept initial config', () => {
      const { result } = renderHook(() => useTranscriberFast({
        maxWorkers: 4,
        memoryBudgetMB: 4096,
        modelId: 'Xenova/whisper-tiny',
        devicePreference: 'gpu',
      }));

      // Hook should initialize without error
      expect(result.current.mode).toBe('idle');
    });

    test('should update config via updateConfig', async () => {
      const { result } = renderHook(() => useTranscriberFast());

      act(() => {
        result.current.updateConfig({
          modelId: 'Xenova/whisper-small',
          devicePreference: 'cpu',
        });
      });

      // Config update should not change mode
      expect(result.current.mode).toBe('idle');
    });

    test('should use updated config in subsequent transcriptions', async () => {
      const { result } = renderHook(() => useTranscriberFast());

      // Update config
      act(() => {
        result.current.updateConfig({
          modelId: 'Xenova/whisper-tiny',
        });
      });

      const audioData = new Float32Array(16000 * 5);
      const duration = 5;

      // Transcription should work with new config
      let returnedResult: FastModeTranscriptionResult | null = null;

      await act(async () => {
        returnedResult = await result.current.transcribe(audioData, duration);
      });

      await waitFor(() => {
        expect(result.current.mode).toBe('complete');
      }, { timeout: 5000 });

      expect(returnedResult).not.toBeNull();
    });
  });

  describe('progress reporting', () => {
    test('should report progress during transcription', async () => {
      const { result } = renderHook(() => useTranscriberFast());

      const audioData = new Float32Array(16000 * 30); // 30 seconds for multiple chunks
      const duration = 30;

      await act(async () => {
        await result.current.transcribe(audioData, duration);
      });

      await waitFor(() => {
        expect(result.current.mode).toBe('complete');
      }, { timeout: 5000 });

      // At completion, progress should be 100%
      expect(result.current.progress.percent).toBe(100);
      expect(result.current.progress.chunksCompleted).toBe(result.current.progress.chunksTotal);
    });

    test('should include chunk counts in progress', async () => {
      const { result } = renderHook(() => useTranscriberFast());

      const audioData = new Float32Array(16000 * 60); // 1 minute
      const duration = 60;

      await act(async () => {
        await result.current.transcribe(audioData, duration);
      });

      await waitFor(() => {
        expect(result.current.mode).toBe('complete');
      }, { timeout: 5000 });

      expect(result.current.progress.chunksTotal).toBeGreaterThan(0);
      expect(result.current.progress.chunksCompleted).toBe(result.current.progress.chunksTotal);
    });
  });
});
