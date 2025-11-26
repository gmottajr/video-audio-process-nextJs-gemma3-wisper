/**
 * @jest-environment jsdom
 * 
 * Unit tests for state machine async state update bug fix
 * 
 * Bug: When startProcessing() and completeProcessing() were called in sequence,
 * completeProcessing() would read stale state value due to React's async state updates.
 * 
 * Fix: Removed strict state validation since we control the call sequence explicitly.
 */

import { renderHook, act } from '@testing-library/react';
import { useAppStateMachine } from '@/hooks/useAppStateMachine';

describe('State Machine Async State Update Bug', () => {
  describe('Bug Fix: Synchronous state transitions', () => {
    it('should allow completeProcessing immediately after startProcessing', () => {
      const { result } = renderHook(() => useAppStateMachine());
      
      // Setup: Select a file to move to INSPECT state
      act(() => {
        const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
        result.current.selectFile(mockFile);
      });
      
      expect(result.current.state).toBe('INSPECT');
      
      // The bug scenario: Call startProcessing and completeProcessing in sequence
      act(() => {
        result.current.startProcessing('extract', 'wav');
        
        // At this point, state should be PROCESSING but React hasn't flushed the update yet
        // Old code would fail here because completeProcessing checked state === 'PROCESSING'
        const mockResult = {
          type: 'audio' as const,
          blobUrl: 'blob:test',
          metadata: { format: 'wav', size: 1000 }
        };
        
        result.current.completeProcessing(mockResult);
      });
      
      // After the fix, state should be DONE despite async state updates
      expect(result.current.state).toBe('DONE');
      expect(result.current.result).toBeDefined();
      expect(result.current.result?.type).toBe('audio');
    });

    it('should handle rapid state transitions without blocking', () => {
      const { result } = renderHook(() => useAppStateMachine());
      
      // Setup: Select file
      act(() => {
        const mockFile = new File(['test'], 'test.mp3', { type: 'audio/mp3' });
        result.current.selectFile(mockFile);
      });
      
      // Simulate rapid transitions that might occur in real usage
      act(() => {
        // INSPECT → PROCESSING
        result.current.startProcessing('convert_audio', 'mp3');
        
        // PROCESSING → DONE (immediately)
        result.current.completeProcessing({
          type: 'audio',
          blobUrl: 'blob:test2',
          metadata: { format: 'mp3', size: 2000 }
        });
      });
      
      // Should reach DONE state without issues
      expect(result.current.state).toBe('DONE');
    });

    it('should allow error transitions without state validation', () => {
      const { result } = renderHook(() => useAppStateMachine());
      
      // Setup
      act(() => {
        const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
        result.current.selectFile(mockFile);
      });
      
      // Start processing and immediately fail
      act(() => {
        result.current.startProcessing('extract', 'wav');
        result.current.failProcessing('Test error');
      });
      
      // Should transition to ERROR despite async state updates
      expect(result.current.state).toBe('ERROR');
      expect(result.current.error).toBe('Test error');
    });

    it('should handle retry without state validation', () => {
      const { result } = renderHook(() => useAppStateMachine());
      
      // Setup: Create an error state
      act(() => {
        const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
        result.current.selectFile(mockFile);
        result.current.startProcessing('extract', 'wav');
        result.current.failProcessing('Initial error');
      });
      
      expect(result.current.state).toBe('ERROR');
      
      // Retry should work without checking previous state
      act(() => {
        result.current.retry();
      });
      
      expect(result.current.state).toBe('INSPECT');
      expect(result.current.error).toBeNull();
    });
  });

  describe('State machine data integrity', () => {
    it('should preserve result data through state transitions', () => {
      const { result } = renderHook(() => useAppStateMachine());
      
      act(() => {
        const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
        result.current.selectFile(mockFile);
        result.current.startProcessing('extract', 'wav', { normalizeAudio: true });
      });
      
      const mockResult = {
        type: 'audio' as const,
        blobUrl: 'blob:test123',
        metadata: {
          format: 'wav',
          size: 5000,
          normalized: true
        }
      };
      
      act(() => {
        result.current.completeProcessing(mockResult);
      });
      
      // Result should be preserved exactly
      expect(result.current.result).toEqual(mockResult);
      expect(result.current.result?.metadata?.normalized).toBe(true);
    });

    it('should preserve normalization flag through processing', () => {
      const { result } = renderHook(() => useAppStateMachine());
      
      act(() => {
        const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
        result.current.selectFile(mockFile);
        result.current.startProcessing('extract', 'wav', { normalizeAudio: true });
      });
      
      // Normalization flag should be preserved
      expect(result.current.normalizeAudio).toBe(true);
      
      act(() => {
        result.current.completeProcessing({
          type: 'audio',
          blobUrl: 'blob:test',
          metadata: { format: 'wav', size: 1000, normalized: true }
        });
      });
      
      // Should still be true after completion
      expect(result.current.normalizeAudio).toBe(true);
    });
  });

  describe('Regression prevention', () => {
    it('should NOT block transitions based on current state value', () => {
      const { result } = renderHook(() => useAppStateMachine());
      
      // Setup
      act(() => {
        const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
        result.current.selectFile(mockFile);
      });
      
      // This test ensures the bug doesn't return
      // Old code would check: if (state !== 'PROCESSING') return;
      // Which would fail due to async state updates
      
      let finalState: string = '';
      
      act(() => {
        result.current.startProcessing('extract', 'wav');
        // State update is queued but not flushed yet
        
        result.current.completeProcessing({
          type: 'audio',
          blobUrl: 'blob:test',
        });
        // This should work even though state might still appear as INSPECT in closure
      });
      
      finalState = result.current.state;
      
      // The fix ensures we reach DONE despite async updates
      expect(finalState).toBe('DONE');
    });

    it('should handle multiple processing cycles without state conflicts', () => {
      const { result } = renderHook(() => useAppStateMachine());
      
      // First cycle
      act(() => {
        const mockFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
        result.current.selectFile(mockFile);
        result.current.startProcessing('extract', 'wav');
        result.current.completeProcessing({ type: 'audio', blobUrl: 'blob:1' });
      });
      
      expect(result.current.state).toBe('DONE');
      
      // Reset and second cycle
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.state).toBe('IDLE');
      
      // Second cycle should work identically
      act(() => {
        const mockFile2 = new File(['test2'], 'test2.mp4', { type: 'video/mp4' });
        result.current.selectFile(mockFile2);
        result.current.startProcessing('extract', 'mp3');
        result.current.completeProcessing({ type: 'audio', blobUrl: 'blob:2' });
      });
      
      expect(result.current.state).toBe('DONE');
    });
  });
});

