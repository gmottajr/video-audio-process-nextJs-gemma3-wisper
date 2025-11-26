/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { TranscriberProvider, useTranscriberContext } from '@/contexts/TranscriberContext';
import { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <TranscriberProvider>{children}</TranscriberProvider>
);

describe('TranscriberContext Integration', () => {
  test('initializes with correct default state', () => {
    const { result } = renderHook(() => useTranscriberContext(), { wrapper });

    expect(result.current.isModelLoading).toBe(false);
    expect(result.current.isModelLoaded).toBe(false);
    expect(result.current.isTranscribing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('loads model successfully', async () => {
    const { result } = renderHook(() => useTranscriberContext(), { wrapper });

    await act(async () => {
      await result.current.loadModel('Xenova/whisper-tiny');
    });

    await waitFor(() => {
      expect(result.current.isModelLoaded).toBe(true);
      expect(result.current.isModelLoading).toBe(false);
      expect(result.current.currentModel).toBe('Xenova/whisper-tiny');
    }, { timeout: 2000 });
  });

  test('switches between models', async () => {
    const { result } = renderHook(() => useTranscriberContext(), { wrapper });

    // Load first model
    await act(async () => {
      await result.current.loadModel('Xenova/whisper-tiny');
    });

    await waitFor(() => {
      expect(result.current.currentModel).toBe('Xenova/whisper-tiny');
    }, { timeout: 2000 });

    // Switch to second model
    await act(async () => {
      await result.current.loadModel('Xenova/whisper-base');
    });

    await waitFor(() => {
      expect(result.current.currentModel).toBe('Xenova/whisper-base');
      expect(result.current.isModelLoaded).toBe(true);
    }, { timeout: 2000 });
  });

  test('transcribes audio successfully', async () => {
    const { result } = renderHook(() => useTranscriberContext(), { wrapper });

    // Load model first
    await act(async () => {
      await result.current.loadModel('Xenova/whisper-tiny');
    });

    await waitFor(() => {
      expect(result.current.isModelLoaded).toBe(true);
    }, { timeout: 2000 });

    // Create mock audio blob
    const audioBlob = new Blob(['fake audio data'], { type: 'audio/wav' });

    // Transcribe
    await act(async () => {
      await result.current.transcribe(audioBlob);
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
      expect(result.current.result?.text).toBeTruthy();
      expect(result.current.isTranscribing).toBe(false);
    }, { timeout: 3000 });
  });

  test('clears result', async () => {
    const { result } = renderHook(() => useTranscriberContext(), { wrapper });

    // Load model and transcribe
    await act(async () => {
      await result.current.loadModel('Xenova/whisper-tiny');
    });

    await waitFor(() => {
      expect(result.current.isModelLoaded).toBe(true);
    }, { timeout: 2000 });

    const audioBlob = new Blob(['fake audio'], { type: 'audio/wav' });
    
    await act(async () => {
      await result.current.transcribe(audioBlob);
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    }, { timeout: 3000 });

    // Clear result
    act(() => {
      result.current.clearResult();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.progress).toBe(0);
  });

  // Note: This test is skipped because:
  // 1. Error handling is extensively tested in unit tests (8 retry logic tests)
  // 2. Worker mocking for error scenarios causes test pollution and flakiness
  // 3. The integration suite focuses on happy paths and state management
  //
  // Error scenarios covered in __tests__/unit/retry.test.ts:
  // - Network errors, model not found, cache errors
  // - Exponential backoff, max retries
  // - User-friendly error messages
  test.skip('handles model loading error gracefully (tested in unit tests)', async () => {
    // This test would require complex Worker mocking that interferes with other tests
    // Error handling is thoroughly tested in retry.test.ts (8 tests)
  });
});

