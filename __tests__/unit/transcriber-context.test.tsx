/**
 * @jest-environment jsdom
 */

/**
 * Integration tests for TranscriberProvider.
 *
 * The real WorkerManager and Web Worker cannot run in jsdom — we mock
 * WorkerManager and exercise the context state machine directly.
 *
 * Scenarios tested (per Phase-2 plan):
 *  1. Startup crash → context error contains the honest message (no "Firefox").
 *  2. retryWorker() disposes old manager, creates a new one, clears error/loading flags.
 *  3. After retryWorker(), loadModel() can proceed (isCrashed() false on new instance).
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';

// Module-level state shared between mock implementation and tests.
// These are safe to reference inside the mockImplementation callback
// because that callback is called at test time, not at factory-call time.
const mockDispose = jest.fn();
const mockSendRequest = jest.fn();
let mockCrashedState = false;

// jest.mock is hoisted above imports by Babel. The factory function runs when
// the module is first required. The mockImplementation callback runs later
// (when `new WorkerManager()` is called in the test), so it is safe to
// reference the module-level variables above.
jest.mock('@/lib/WorkerManager', () => ({
  WorkerManager: jest.fn().mockImplementation(() => ({
    isCrashed: () => mockCrashedState,
    isStarted: () => false,
    isHealthy: () => !mockCrashedState,
    dispose: mockDispose,
    sendRequest: mockSendRequest,
    getStats: () => ({ pendingRequests: 0, isActive: true, oldestRequestAge: null }),
    whenReady: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Import AFTER mock registration so the import resolves to the mock.
import { WorkerManager } from '@/lib/WorkerManager';
import { TranscriberProvider, useTranscriberContext } from '@/contexts/TranscriberContext';

const MockWorkerManagerClass = WorkerManager as jest.MockedClass<typeof WorkerManager>;

// ---------- helpers ----------

function wrapper({ children }: { children: React.ReactNode }) {
  return <TranscriberProvider>{children}</TranscriberProvider>;
}

/** Flush the setTimeout(fn, 0) that TranscriberProvider uses to defer init. */
async function flushInit() {
  await act(async () => {
    jest.runAllTimers();
  });
}

// ---------- setup ----------

describe('TranscriberProvider', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    mockCrashedState = false;
    MockWorkerManagerClass.mockClear();
    mockDispose.mockClear();
    mockSendRequest.mockClear();

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Suppress logger /api/log fetch calls in tests
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    delete (global as any).fetch;
  });

  // -----------------------------------------------------------------------
  // 1. Honest error message — no "Firefox" in the banner text
  // -----------------------------------------------------------------------
  describe('startup crash', () => {
    it('sets error message without the false Firefox claim when worker isCrashed()', async () => {
      mockCrashedState = true;

      const { result } = renderHook(() => useTranscriberContext(), { wrapper });
      await flushInit();

      // Trigger loadModel — it checks isCrashed() and sets the UI error.
      await act(async () => {
        await result.current.loadModel('Xenova/whisper-base').catch(() => {});
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error).not.toContain('Firefox');
      expect(result.current.error).toContain('COEP/CORP');
    });

    it('does not leave isModelLoading=true when worker is crashed', async () => {
      mockCrashedState = true;

      const { result } = renderHook(() => useTranscriberContext(), { wrapper });
      await flushInit();

      await act(async () => {
        await result.current.loadModel().catch(() => {});
      });

      expect(result.current.isModelLoading).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 2. retryWorker() — disposes old manager, creates new one, clears state
  // -----------------------------------------------------------------------
  describe('retryWorker()', () => {
    it('calls dispose() on the previous WorkerManager instance', async () => {
      mockCrashedState = true;

      const { result } = renderHook(() => useTranscriberContext(), { wrapper });
      await flushInit();

      // At least one instance was created during init.
      expect(MockWorkerManagerClass.mock.instances.length).toBeGreaterThan(0);

      await act(async () => {
        result.current.retryWorker();
      });

      expect(mockDispose).toHaveBeenCalled();
    });

    it('creates a fresh WorkerManager instance', async () => {
      mockCrashedState = true;

      const { result } = renderHook(() => useTranscriberContext(), { wrapper });
      await flushInit();

      const countBefore = MockWorkerManagerClass.mock.instances.length;

      await act(async () => {
        result.current.retryWorker();
      });

      expect(MockWorkerManagerClass.mock.instances.length).toBeGreaterThan(countBefore);
    });

    it('clears the error state', async () => {
      mockCrashedState = true;

      const { result } = renderHook(() => useTranscriberContext(), { wrapper });
      await flushInit();

      // Produce an error first.
      await act(async () => {
        await result.current.loadModel().catch(() => {});
      });
      expect(result.current.error).not.toBeNull();

      await act(async () => {
        result.current.retryWorker();
      });

      expect(result.current.error).toBeNull();
    });

    it('resets isModelLoaded and isModelLoading', async () => {
      mockCrashedState = true;

      const { result } = renderHook(() => useTranscriberContext(), { wrapper });
      await flushInit();

      await act(async () => {
        result.current.retryWorker();
      });

      expect(result.current.isModelLoaded).toBe(false);
      expect(result.current.isModelLoading).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // 3. loadModel() proceeds after retryWorker() when new instance is healthy
  // -----------------------------------------------------------------------
  describe('loadModel() after retryWorker()', () => {
    it('clears error and does not immediately re-error when new worker is healthy', async () => {
      // Start with a crashed worker.
      mockCrashedState = true;

      const { result } = renderHook(() => useTranscriberContext(), { wrapper });
      await flushInit();

      await act(async () => {
        await result.current.loadModel().catch(() => {});
      });
      expect(result.current.error).not.toBeNull();

      // Retry with a healthy worker.
      mockCrashedState = false;
      mockSendRequest.mockResolvedValue({ status: 'ready' });

      await act(async () => {
        result.current.retryWorker();
      });

      // Error should be cleared immediately after retry.
      expect(result.current.error).toBeNull();

      // loadModel() on a healthy worker should not produce a crash error.
      await act(async () => {
        await result.current.loadModel('Xenova/whisper-base').catch(() => {});
      });

      expect(result.current.error).toBeNull();
    });
  });
});
