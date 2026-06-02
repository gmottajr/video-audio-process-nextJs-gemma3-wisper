"use client";

import { useRef, useCallback, useEffect } from "react";
import { WorkerManager } from "@/lib/WorkerManager";

const WORKER_PATH = '/transcription.worker.js';

/**
 * Manages the transcription WorkerManager lifecycle: creation on mount,
 * disposal on unmount, and in-place recreation for the retry flow.
 *
 * Extracted from TranscriberProvider (SRP): the provider owns React state;
 * this hook owns the worker reference.
 */
export function useTranscriberWorker() {
  const managerRef = useRef<WorkerManager | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Defer by one macrotask so React Strict Mode's first-mount teardown
    // fully completes before the second Worker starts, preventing a corrupted
    // browser module-cache entry for transformers.min.js under COEP.
    const timerId = setTimeout(() => {
      if (cancelled) return;
      console.log('[TranscriberContext] 🚀 Initializing WorkerManager...');
      try {
        managerRef.current = new WorkerManager(WORKER_PATH);
        console.log('[TranscriberContext] ✅ WorkerManager initialized');
        console.log('[TranscriberContext] ℹ️ Model will be loaded on-demand (no auto-load)');
      } catch (err) {
        console.error('[TranscriberContext] ❌ Failed to initialize WorkerManager:', err);
        // Caller checks managerRef.current === null to detect this case.
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      console.log('[TranscriberContext] 🧹 Cleaning up WorkerManager');
      managerRef.current?.dispose();
      managerRef.current = null;
    };
  }, []);

  /**
   * Dispose the current instance (if any) and spin up a fresh WorkerManager.
   * The caller is responsible for resetting any error/loading React state.
   */
  const recreate = useCallback((): string | null => {
    managerRef.current?.dispose();
    managerRef.current = null;
    try {
      managerRef.current = new WorkerManager(WORKER_PATH);
      console.log('[TranscriberContext] ✅ WorkerManager recreated');
      return null;
    } catch (err) {
      console.error('[TranscriberContext] ❌ Retry failed:', err);
      return 'Failed to initialize transcription worker';
    }
  }, []);

  return { managerRef, recreate };
}
