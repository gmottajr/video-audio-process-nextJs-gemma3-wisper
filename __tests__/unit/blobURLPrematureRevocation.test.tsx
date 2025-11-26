/**
 * @jest-environment jsdom
 * 
 * Unit tests for blob URL premature revocation bug fix
 * 
 * Bug: useEffect with processor dependency would run cleanup when processor state changed,
 * revoking blob URLs before components could use them.
 * 
 * Fix: Changed useEffect dependency to empty array so cleanup only runs on unmount.
 */

import { renderHook, act } from '@testing-library/react';
import { useEffect, useCallback, useState } from 'react';

// Mock BlobURLManager
class MockBlobURLManager {
  private urls: Map<string, string> = new Map();
  private revokeCount = 0;

  create(blob: Blob, id: string): string {
    const url = `blob:mock-${id}`;
    this.urls.set(id, url);
    return url;
  }

  revokeAll(): void {
    this.revokeCount++;
    this.urls.clear();
  }

  getActiveCount(): number {
    return this.urls.size;
  }

  getRevokeCount(): number {
    return this.revokeCount;
  }

  has(id: string): boolean {
    return this.urls.has(id);
  }
}

// Simulate the processor hook with cleanup
function useProcessorWithCleanup(blobManager: MockBlobURLManager) {
  const [result, setResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback(async () => {
    setIsProcessing(true);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Create blob URL
    const blob = new Blob(['test'], { type: 'audio/wav' });
    const blobUrl = blobManager.create(blob, `audio_${Date.now()}`);
    
    setResult({
      type: 'audio',
      blobUrl,
      metadata: { format: 'wav', size: 1000 }
    });
    
    setIsProcessing(false);
  }, [blobManager]);

  const cleanup = useCallback(() => {
    blobManager.revokeAll();
  }, [blobManager]);

  return { result, isProcessing, processFile, cleanup };
}

// Hook that simulates the BUGGY behavior (with processor dependency)
function useBuggyCleanupEffect(processor: ReturnType<typeof useProcessorWithCleanup>) {
  useEffect(() => {
    return () => {
      processor.cleanup();
    };
  }, [processor]); // ❌ BUG: This causes cleanup on every processor change
}

// Hook that simulates the FIXED behavior (empty dependency)
function useFixedCleanupEffect(processor: ReturnType<typeof useProcessorWithCleanup>) {
  useEffect(() => {
    return () => {
      processor.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ FIX: Only cleanup on unmount
}

describe('Blob URL Premature Revocation Bug', () => {
  describe('Buggy behavior (with processor dependency)', () => {
    it('should demonstrate the bug: blob URL revoked when processor state changes', async () => {
      const blobManager = new MockBlobURLManager();
      
      const { result: processorResult } = renderHook(() => 
        useProcessorWithCleanup(blobManager)
      );
      
      const { result: effectResult, unmount } = renderHook(() => 
        useBuggyCleanupEffect(processorResult.current)
      );
      
      // Initial state: no blobs
      expect(blobManager.getActiveCount()).toBe(0);
      expect(blobManager.getRevokeCount()).toBe(0);
      
      // Process file - creates blob URL
      await act(async () => {
        await processorResult.current.processFile();
      });
      
      // Blob URL should be created
      expect(blobManager.getActiveCount()).toBe(1);
      expect(processorResult.current.result).toBeDefined();
      expect(processorResult.current.result.blobUrl).toContain('blob:mock-');
      
      // 🐛 BUG: Cleanup was called because processor state changed!
      // The effect saw processor change and ran cleanup
      expect(blobManager.getRevokeCount()).toBeGreaterThan(0);
      expect(blobManager.getActiveCount()).toBe(0); // URLs were revoked!
      
      // Cleanup
      unmount();
    });

    it('should show multiple revocations with processor dependency', async () => {
      const blobManager = new MockBlobURLManager();
      
      const { result: processorResult } = renderHook(() => 
        useProcessorWithCleanup(blobManager)
      );
      
      const { unmount } = renderHook(() => 
        useBuggyCleanupEffect(processorResult.current)
      );
      
      // Process multiple times
      await act(async () => {
        await processorResult.current.processFile();
      });
      
      const revokeCountAfterFirst = blobManager.getRevokeCount();
      expect(revokeCountAfterFirst).toBeGreaterThan(0);
      
      await act(async () => {
        await processorResult.current.processFile();
      });
      
      // Should have revoked multiple times
      expect(blobManager.getRevokeCount()).toBeGreaterThan(revokeCountAfterFirst);
      
      unmount();
    });
  });

  describe('Fixed behavior (empty dependency)', () => {
    it('should NOT revoke blob URL when processor state changes', async () => {
      const blobManager = new MockBlobURLManager();
      
      const { result: processorResult } = renderHook(() => 
        useProcessorWithCleanup(blobManager)
      );
      
      const { unmount } = renderHook(() => 
        useFixedCleanupEffect(processorResult.current)
      );
      
      // Process file
      await act(async () => {
        await processorResult.current.processFile();
      });
      
      // ✅ Blob URL should still exist
      expect(blobManager.getActiveCount()).toBe(1);
      expect(blobManager.getRevokeCount()).toBe(0); // No premature revocation!
      
      // Blob URL should be accessible
      expect(processorResult.current.result.blobUrl).toContain('blob:mock-');
      
      // Only cleanup on unmount
      unmount();
      expect(blobManager.getRevokeCount()).toBe(1); // Now it's revoked
      expect(blobManager.getActiveCount()).toBe(0);
    });

    it('should preserve blob URLs across multiple processing cycles', async () => {
      const blobManager = new MockBlobURLManager();
      
      const { result: processorResult } = renderHook(() => 
        useProcessorWithCleanup(blobManager)
      );
      
      const { unmount } = renderHook(() => 
        useFixedCleanupEffect(processorResult.current)
      );
      
      // First processing
      await act(async () => {
        await processorResult.current.processFile();
      });
      
      const firstBlobUrl = processorResult.current.result.blobUrl;
      expect(blobManager.getRevokeCount()).toBe(0);
      
      // Second processing (in real app, this would be a new file)
      await act(async () => {
        await processorResult.current.processFile();
      });
      
      // ✅ No premature revocations
      expect(blobManager.getRevokeCount()).toBe(0);
      
      // Only one cleanup on final unmount
      unmount();
      expect(blobManager.getRevokeCount()).toBe(1);
    });

    it('should only cleanup once on unmount', () => {
      const blobManager = new MockBlobURLManager();
      
      const { result: processorResult } = renderHook(() => 
        useProcessorWithCleanup(blobManager)
      );
      
      const { unmount } = renderHook(() => 
        useFixedCleanupEffect(processorResult.current)
      );
      
      // No cleanups during component lifecycle
      expect(blobManager.getRevokeCount()).toBe(0);
      
      // Unmount triggers cleanup
      unmount();
      expect(blobManager.getRevokeCount()).toBe(1);
      
      // No additional cleanups after unmount
      expect(blobManager.getRevokeCount()).toBe(1);
    });
  });

  describe('Real-world scenario simulation', () => {
    it('should simulate the complete audio extraction flow without premature revocation', async () => {
      const blobManager = new MockBlobURLManager();
      
      // Simulate app component lifecycle
      const { result: processorResult } = renderHook(() => 
        useProcessorWithCleanup(blobManager)
      );
      
      const { unmount } = renderHook(() => 
        useFixedCleanupEffect(processorResult.current)
      );
      
      // Step 1: User extracts audio
      await act(async () => {
        await processorResult.current.processFile();
      });
      
      expect(processorResult.current.result).toBeDefined();
      const audioUrl = processorResult.current.result.blobUrl;
      
      // Step 2: WaveformViewer would try to load this URL
      // URL should still be valid
      expect(blobManager.getActiveCount()).toBe(1);
      expect(blobManager.getRevokeCount()).toBe(0);
      
      // Step 3: User might download the file
      // URL should still be valid
      expect(blobManager.getActiveCount()).toBe(1);
      
      // Step 4: Component unmounts (user navigates away)
      unmount();
      
      // Now cleanup happens
      expect(blobManager.getRevokeCount()).toBe(1);
      expect(blobManager.getActiveCount()).toBe(0);
    });

    it('should handle rapid processor state changes without premature cleanup', async () => {
      const blobManager = new MockBlobURLManager();
      
      const { result: processorResult } = renderHook(() => 
        useProcessorWithCleanup(blobManager)
      );
      
      const { unmount } = renderHook(() => 
        useFixedCleanupEffect(processorResult.current)
      );
      
      // Simulate rapid state changes (multiple processing operations)
      await act(async () => {
        await processorResult.current.processFile();
      });
      
      const urlCount1 = blobManager.getActiveCount();
      expect(blobManager.getRevokeCount()).toBe(0);
      
      await act(async () => {
        await processorResult.current.processFile();
      });
      
      // Should accumulate URLs, not revoke
      expect(blobManager.getActiveCount()).toBeGreaterThanOrEqual(urlCount1);
      expect(blobManager.getRevokeCount()).toBe(0);
      
      await act(async () => {
        await processorResult.current.processFile();
      });
      
      // Still no premature revocations
      expect(blobManager.getRevokeCount()).toBe(0);
      
      // Single cleanup on unmount
      unmount();
      expect(blobManager.getRevokeCount()).toBe(1);
    });
  });

  describe('Regression prevention', () => {
    it('should ensure cleanup function stability', () => {
      const blobManager = new MockBlobURLManager();
      
      const { result: processorResult, rerender } = renderHook(() => 
        useProcessorWithCleanup(blobManager)
      );
      
      const { unmount } = renderHook(() => 
        useFixedCleanupEffect(processorResult.current)
      );
      
      // Initial cleanup function reference
      const cleanupRef1 = processorResult.current.cleanup;
      
      // Rerender (simulates state change)
      rerender();
      
      // Cleanup function should be stable (useCallback)
      const cleanupRef2 = processorResult.current.cleanup;
      expect(cleanupRef1).toBe(cleanupRef2);
      
      // No premature cleanup calls
      expect(blobManager.getRevokeCount()).toBe(0);
      
      unmount();
    });

    it('should verify empty dependency array prevents cleanup on state changes', () => {
      const cleanupCallCount = { count: 0 };
      
      const { result, rerender } = renderHook(
        ({ value }) => {
          useEffect(() => {
            return () => {
              cleanupCallCount.count++;
            };
          }, []); // Empty deps
          
          return value;
        },
        { initialProps: { value: 'initial' } }
      );
      
      // Initial render
      expect(cleanupCallCount.count).toBe(0);
      
      // Rerender with different props
      rerender({ value: 'changed' });
      expect(cleanupCallCount.count).toBe(0); // No cleanup!
      
      rerender({ value: 'changed-again' });
      expect(cleanupCallCount.count).toBe(0); // Still no cleanup!
    });
  });
});

