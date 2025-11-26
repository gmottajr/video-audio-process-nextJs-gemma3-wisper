/**
 * @jest-environment jsdom
 * 
 * Integration Tests for Audio Normalization
 * 
 * Tests the complete flow of normalization through state machine and processor
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppStateMachine } from '@/hooks/useAppStateMachine';
import { useMediaProcessor } from '@/hooks/useMediaProcessor';
import { ReactNode } from 'react';

// Mock dependencies
jest.mock('@/hooks/useFFmpeg', () => ({
  useFFmpeg: jest.fn(() => ({
    load: jest.fn().mockResolvedValue(undefined),
    transcode: jest.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/wav' })),
    extractAudio: jest.fn().mockResolvedValue(new Blob(['extracted'], { type: 'audio/wav' })),
    prepareAudioForAI: jest.fn().mockResolvedValue(new Blob(['prepared'], { type: 'audio/wav' })),
    isLoaded: true,
    isLoading: false,
    progress: 0,
    metrics: { speed: '1.0x', duration: '10s' },
    reset: jest.fn(),
    terminate: jest.fn(),
  }))
}));

jest.mock('@/contexts/TranscriberContext', () => ({
  TranscriberProvider: ({ children }: { children: ReactNode }) => children,
  useTranscriberContext: jest.fn(() => ({
    isModelLoaded: true,
    isModelLoading: false,
    isTranscribing: false,
    progress: 0,
    loadingMessage: '',
    result: null,
    error: null,
    currentModel: 'Xenova/whisper-base',
    loadModel: jest.fn(),
    transcribe: jest.fn().mockResolvedValue({ text: 'Test transcription', chunks: [] }),
    clearResult: jest.fn(),
  }))
}));

describe('Audio Normalization Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should pass normalization flag through entire pipeline', async () => {
    const { result: stateMachine } = renderHook(() => useAppStateMachine());
    const { result: processor } = renderHook(() => useMediaProcessor());

    // Step 1: Select file
    await act(async () => {
      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      stateMachine.current.selectFile(file);
    });

    expect(stateMachine.current.state).toBe('INSPECT');

    // Step 2: Start processing with normalization
    await act(async () => {
      stateMachine.current.startProcessing('extract', 'wav', { normalizeAudio: true });
    });

    expect(stateMachine.current.state).toBe('PROCESSING');
    expect(stateMachine.current.normalizeAudio).toBe(true);

    // Step 3: Process with normalization
    await act(async () => {
      const result = await processor.current.processFile(
        stateMachine.current.selectedFile!,
        'extract',
        'wav',
        { normalizeAudio: true }
      );

      // Complete processing
      stateMachine.current.completeProcessing(result);
    });

    // Step 4: Verify result has normalized flag
    await waitFor(() => {
      expect(stateMachine.current.state).toBe('DONE');
    });

    expect(stateMachine.current.result).toBeDefined();
    expect(stateMachine.current.result?.metadata?.normalized).toBe(true);
  });

  test('should NOT set normalized flag when normalization is disabled', async () => {
    const { result: stateMachine } = renderHook(() => useAppStateMachine());
    const { result: processor } = renderHook(() => useMediaProcessor());

    // Select file
    await act(async () => {
      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      stateMachine.current.selectFile(file);
    });

    // Start processing WITHOUT normalization
    await act(async () => {
      stateMachine.current.startProcessing('extract', 'wav', { normalizeAudio: false });
    });

    expect(stateMachine.current.normalizeAudio).toBe(false);

    // Process without normalization
    await act(async () => {
      const result = await processor.current.processFile(
        stateMachine.current.selectedFile!,
        'extract',
        'wav',
        { normalizeAudio: false }
      );

      stateMachine.current.completeProcessing(result);
    });

    // Verify result has normalized = false
    await waitFor(() => {
      expect(stateMachine.current.result?.metadata?.normalized).toBe(false);
    });
  });

  test('should reset normalization flag on file change', () => {
    const { result } = renderHook(() => useAppStateMachine());

    // Select file and set normalization
    act(() => {
      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      result.current.selectFile(file);
    });

    act(() => {
      result.current.startProcessing('extract', 'wav', { normalizeAudio: true });
    });

    expect(result.current.normalizeAudio).toBe(true);

    // Reset by selecting null file
    act(() => {
      result.current.selectFile(null);
    });

    expect(result.current.state).toBe('IDLE');
    expect(result.current.normalizeAudio).toBe(false);
  });

  test('should reset normalization flag on full reset', () => {
    const { result } = renderHook(() => useAppStateMachine());

    // Setup with normalization
    act(() => {
      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      result.current.selectFile(file);
    });

    act(() => {
      result.current.startProcessing('extract', 'wav', { normalizeAudio: true });
    });

    expect(result.current.normalizeAudio).toBe(true);

    // Full reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('IDLE');
    expect(result.current.normalizeAudio).toBe(false);
    expect(result.current.selectedFile).toBeNull();
  });

  test('should include file metadata in result', async () => {
    const { result: processor } = renderHook(() => useMediaProcessor());

    const mockFile = new File(['audio'], 'test.wav', { type: 'audio/wav' });

    let result;
    await act(async () => {
      result = await processor.current.processFile(
        mockFile,
        'convert_audio',
        'mp3',
        { normalizeAudio: true }
      );
    });

    expect(result).toBeDefined();
    expect(result?.metadata).toBeDefined();
    expect(result?.metadata?.normalized).toBe(true);
    expect(result?.metadata?.format).toBe('mp3');
    expect(result?.metadata?.size).toBeGreaterThan(0);
  });
});

