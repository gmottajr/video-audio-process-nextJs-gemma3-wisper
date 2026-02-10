/**
 * Integration Tests: Fast Mode Parallel Transcription
 * 
 * Tests the complete parallel transcription pipeline end-to-end
 * 
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTranscriberFast } from '@/hooks/useTranscriberFast';

// Mock Worker for fast mode
class MockFastWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  protected eventListeners: Map<string, Set<(event: any) => void>> = new Map();
  private requestHandlers: Map<string, (data: any) => void> = new Map();

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
    }, 50);
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

describe('Fast Mode Parallel Transcription Integration', () => {
  const OriginalWorker = (global as any).Worker;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).Worker = OriginalWorker;
  });

  test('should transcribe audio with parallel processing', async () => {
    const { result } = renderHook(() => useTranscriberFast());

    // Create mock audio data (10 seconds at 16kHz = 160,000 samples)
    const sampleRate = 16000;
    const duration = 10;
    const audioData = new Float32Array(sampleRate * duration);
    
    // Fill with mock audio data
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5;
    }

    // Start transcription
    await act(async () => {
      await result.current.transcribe(audioData, duration);
    });

    // Wait for completion
    await waitFor(() => {
      expect(result.current.mode).toBe('complete');
    }, { timeout: 5000 });

    // Verify result
    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.text).toBeTruthy();
    expect(result.current.result?.segments.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });

  test('should handle cancellation mid-processing', async () => {
    const { result } = renderHook(() => useTranscriberFast());

    const audioData = new Float32Array(16000 * 60); // 1 minute
    const duration = 60;

    // Start transcription
    act(() => {
      result.current.transcribe(audioData, duration);
    });

    // Wait a bit then cancel
    await new Promise(resolve => setTimeout(resolve, 100));
    
    act(() => {
      result.current.cancel();
    });

    // Verify cancellation
    await waitFor(() => {
      expect(result.current.mode).toBe('error');
    }, { timeout: 2000 });
  });

  test('should report progress during processing', async () => {
    const { result } = renderHook(() => useTranscriberFast());

    const audioData = new Float32Array(16000 * 30); // 30 seconds
    const duration = 30;

    // Start transcription
    act(() => {
      result.current.transcribe(audioData, duration);
    });

    // Wait for completion
    await waitFor(() => {
      expect(result.current.mode).toBe('complete');
    }, { timeout: 5000 });

    // Verify progress was reported (at completion, percent should be 100)
    expect(result.current.progress.percent).toBe(100);
    expect(result.current.progress.chunksCompleted).toBeGreaterThan(0);
    expect(result.current.progress.chunksTotal).toBeGreaterThan(0);
  });

  test('should handle worker errors gracefully', async () => {
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
        }, 50);
      }
    }

    (global as any).Worker = ErrorWorker;

    const { result } = renderHook(() => useTranscriberFast());

    const audioData = new Float32Array(16000 * 10);
    const duration = 10;

    act(() => {
      result.current.transcribe(audioData, duration);
    });

    await waitFor(() => {
      expect(result.current.mode).toBe('error');
      expect(result.current.error).toBeTruthy();
    }, { timeout: 10000 });
  });

  test('should reset state properly', async () => {
    const { result } = renderHook(() => useTranscriberFast());

    const audioData = new Float32Array(16000 * 5);
    const duration = 5;

    // Transcribe
    await act(async () => {
      await result.current.transcribe(audioData, duration);
    });

    await waitFor(() => {
      expect(result.current.mode).toBe('complete');
    }, { timeout: 5000 });

    // Reset
    act(() => {
      result.current.reset();
    });

    // Verify reset
    expect(result.current.mode).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.progress.percent).toBe(0);
  });

  test('should set error state when worker fails mid-processing', async () => {
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
        }, 50);
      }
    }

    (global as any).Worker = ErrorWorker;

    const { result } = renderHook(() => useTranscriberFast({ maxWorkers: 2 }));

    const audioData = new Float32Array(16000 * 15); // 15 seconds
    const duration = 15;

    act(() => {
      result.current.transcribe(audioData, duration);
    });

    await waitFor(() => {
      expect(result.current.mode).toBe('error');
    }, { timeout: 10000 });

    expect(result.current.error).toBeTruthy();
    expect(result.current.result).toBeNull();
  });

  test('should provide descriptive error message when workers fail', async () => {
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
                data: { error: 'Worker crashed during transcription' },
              },
            } as MessageEvent);
          }
        }, 50);
      }
    }

    (global as any).Worker = ErrorWorker;

    const { result } = renderHook(() => useTranscriberFast({ maxWorkers: 2 }));

    const audioData = new Float32Array(16000 * 10);
    const duration = 10;

    act(() => {
      result.current.transcribe(audioData, duration);
    });

    await waitFor(() => {
      expect(result.current.mode).toBe('error');
    }, { timeout: 10000 });

    expect(result.current.error).toBeTruthy();
    const errorLower = result.current.error?.toLowerCase() ?? '';
    expect(
      errorLower.includes('worker') || errorLower.includes('fail') || errorLower.includes('error')
    ).toBe(true);
  });

  test('should handle multiple workers', async () => {
    const { result } = renderHook(() => useTranscriberFast({ maxWorkers: 4 }));

    // Create longer audio to trigger multiple chunks (2 min = 3 chunks at 60s)
    const audioData = new Float32Array(16000 * 120); // 2 minutes
    const duration = 120;

    // Start transcription
    await act(async () => {
      await result.current.transcribe(audioData, duration);
    });

    await waitFor(() => {
      expect(result.current.mode).toBe('complete');
    }, { timeout: 10000 });

    // Verify multiple chunks were processed (parallel processing worked)
    expect(result.current.result).not.toBeNull();
    expect(result.current.progress.chunksTotal).toBeGreaterThan(1);
    expect(result.current.progress.chunksCompleted).toBe(result.current.progress.chunksTotal);
  });
});
