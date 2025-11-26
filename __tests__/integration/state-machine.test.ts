/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useAppStateMachine } from '@/hooks/useAppStateMachine';

describe('AppStateMachine Integration', () => {
  test('follows happy path: IDLE → INSPECT → PROCESSING → DONE', () => {
    const { result } = renderHook(() => useAppStateMachine());

    // Initial state
    expect(result.current.state).toBe('IDLE');
    expect(result.current.selectedFile).toBeNull();
    expect(result.current.currentAction).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();

    // Select file (IDLE → INSPECT)
    act(() => {
      const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      result.current.selectFile(file);
    });

    expect(result.current.state).toBe('INSPECT');
    expect(result.current.selectedFile).toBeDefined();
    expect(result.current.selectedFile?.name).toBe('test.mp4');
    expect(result.current.error).toBeNull();

    // Start processing (INSPECT → PROCESSING)
    act(() => {
      result.current.startProcessing('transcribe', 'Xenova/whisper-tiny');
    });

    expect(result.current.state).toBe('PROCESSING');
    expect(result.current.currentAction).toBe('transcribe');
    expect(result.current.selectedFormatId).toBe('Xenova/whisper-tiny');

    // Complete processing (PROCESSING → DONE)
    act(() => {
      result.current.completeProcessing({
        type: 'transcription',
        data: { text: 'Test transcription' }
      });
    });

    expect(result.current.state).toBe('DONE');
    expect(result.current.result).toBeDefined();
    expect(result.current.result?.type).toBe('transcription');
    expect(result.current.error).toBeNull();
  });

  test('handles error path: PROCESSING → ERROR → INSPECT', () => {
    const { result } = renderHook(() => useAppStateMachine());

    // Setup to PROCESSING state
    act(() => {
      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      result.current.selectFile(file);
    });

    expect(result.current.state).toBe('INSPECT');

    act(() => {
      result.current.startProcessing('transcribe', 'Xenova/whisper-tiny');
    });

    expect(result.current.state).toBe('PROCESSING');

    // Fail processing (PROCESSING → ERROR)
    act(() => {
      result.current.failProcessing('Transcription failed: Model not loaded');
    });

    expect(result.current.state).toBe('ERROR');
    expect(result.current.error).toBe('Transcription failed: Model not loaded');

    // Retry (ERROR → INSPECT)
    act(() => {
      result.current.retry();
    });

    expect(result.current.state).toBe('INSPECT');
    expect(result.current.error).toBeNull();
    expect(result.current.selectedFile).toBeDefined(); // File should still be there
  });

  test('prevents invalid state transitions', () => {
    const { result } = renderHook(() => useAppStateMachine());

    // Try to start processing without selecting file (IDLE → PROCESSING)
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    act(() => {
      result.current.startProcessing('transcribe', 'Xenova/whisper-tiny');
    });

    // Should still be in IDLE
    expect(result.current.state).toBe('IDLE');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[StateMachine] Cannot start processing from state:',
      'IDLE'
    );

    consoleWarnSpy.mockRestore();
  });

  test('handles cancel during processing: PROCESSING → INSPECT', () => {
    const { result } = renderHook(() => useAppStateMachine());

    // Get to PROCESSING state
    act(() => {
      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      result.current.selectFile(file);
    });

    act(() => {
      result.current.startProcessing('transcribe', 'Xenova/whisper-tiny');
    });

    expect(result.current.state).toBe('PROCESSING');

    // Cancel (PROCESSING → INSPECT)
    act(() => {
      result.current.cancelProcessing();
    });

    expect(result.current.state).toBe('INSPECT');
    expect(result.current.selectedFile).toBeDefined(); // File preserved
    expect(result.current.result).toBeNull(); // Result cleared
  });

  test('maintains file context across state transitions', () => {
    const { result } = renderHook(() => useAppStateMachine());

    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });

    // Select file (IDLE → INSPECT)
    act(() => {
      result.current.selectFile(file);
    });

    const fileAfterSelect = result.current.selectedFile;
    expect(fileAfterSelect?.name).toBe('test.mp4');

    // Start processing (INSPECT → PROCESSING)
    act(() => {
      result.current.startProcessing('transcribe', 'Xenova/whisper-tiny');
    });

    // File should still be available
    expect(result.current.selectedFile).toBe(fileAfterSelect);
    expect(result.current.selectedFile?.name).toBe('test.mp4');

    // Complete (PROCESSING → DONE)
    act(() => {
      result.current.completeProcessing({ 
        type: 'transcription', 
        data: { text: 'Result' } 
      });
    });

    // File should still be available
    expect(result.current.selectedFile).toBe(fileAfterSelect);
    expect(result.current.selectedFile?.name).toBe('test.mp4');
  });

  test('resets to IDLE from any state', () => {
    const { result } = renderHook(() => useAppStateMachine());

    // Get to DONE state - need separate act() calls for each state transition
    act(() => {
      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      result.current.selectFile(file);
    });

    expect(result.current.state).toBe('INSPECT');

    act(() => {
      result.current.startProcessing('transcribe', 'Xenova/whisper-tiny');
    });

    expect(result.current.state).toBe('PROCESSING');

    act(() => {
      result.current.completeProcessing({
        type: 'transcription',
        data: { text: 'Test' }
      });
    });

    expect(result.current.state).toBe('DONE');
    expect(result.current.selectedFile).not.toBeNull();
    expect(result.current.result).not.toBeNull();

    // Reset to IDLE
    act(() => {
      result.current.reset();
    });

    // Should be completely clean
    expect(result.current.state).toBe('IDLE');
    expect(result.current.selectedFile).toBeNull();
    expect(result.current.selectedFormatId).toBeNull();
    expect(result.current.currentAction).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('rejects unsupported file types', () => {
    const { result } = renderHook(() => useAppStateMachine());

    // Try to select invalid file type
    act(() => {
      const file = new File(['text content'], 'document.txt', { type: 'text/plain' });
      result.current.selectFile(file);
    });

    // Should go to ERROR state
    expect(result.current.state).toBe('ERROR');
    expect(result.current.error).toContain('Unsupported file type');
    expect(result.current.selectedFile).toBeNull();
  });

  test('getContext returns complete state snapshot', () => {
    const { result } = renderHook(() => useAppStateMachine());

    // Get to PROCESSING state - separate act() calls
    act(() => {
      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      result.current.selectFile(file);
    });

    expect(result.current.state).toBe('INSPECT');

    act(() => {
      result.current.startProcessing('convert-audio', 'mp3');
    });

    expect(result.current.state).toBe('PROCESSING');

    // Get context snapshot
    let context;
    act(() => {
      context = result.current.getContext();
    });

    expect(context).toMatchObject({
      state: 'PROCESSING',
      selectedFile: expect.any(File),
      selectedFormatId: 'mp3',
      currentAction: 'convert-audio',
      result: null,
      error: null
    });
  });
});

