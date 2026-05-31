/**
 * @jest-environment jsdom
 */

import {
  DOWNLOAD_STATE_KEY,
  readResumeState,
  saveDownloadProgress,
  markDownloadComplete,
  clearDownloadState,
} from '@/services/enhancer/downloadStatePersistence';

describe('downloadStatePersistence', () => {
  beforeEach(() => localStorage.clear());

  describe('readResumeState', () => {
    it('returns null when localStorage is empty', () => {
      expect(readResumeState()).toBeNull();
    });

    it('returns state for an in-progress recent download', () => {
      const state = {
        modelId: 'test-model',
        startedAt: Date.now() - 1000,
        progress: 50,
        totalMB: 1700,
        completed: false,
      };
      localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(state));
      expect(readResumeState()).toMatchObject({ modelId: 'test-model', progress: 50 });
    });

    it('returns null for a completed download and removes entry', () => {
      const state = {
        modelId: 'test-model',
        startedAt: Date.now(),
        progress: 100,
        totalMB: 1700,
        completed: true,
      };
      localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(state));
      expect(readResumeState()).toBeNull();
      expect(localStorage.getItem(DOWNLOAD_STATE_KEY)).toBeNull();
    });

    it('returns null for a download older than 24 hours', () => {
      const state = {
        modelId: 'test-model',
        startedAt: Date.now() - 25 * 60 * 60 * 1000,
        progress: 50,
        totalMB: 1700,
        completed: false,
      };
      localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(state));
      expect(readResumeState()).toBeNull();
    });

    it('returns null for a download at 0% progress', () => {
      const state = {
        modelId: 'test-model',
        startedAt: Date.now(),
        progress: 0,
        totalMB: 1700,
        completed: false,
      };
      localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(state));
      expect(readResumeState()).toBeNull();
    });

    it('returns null for corrupted JSON and does not throw', () => {
      localStorage.setItem(DOWNLOAD_STATE_KEY, 'not-json');
      expect(readResumeState()).toBeNull();
    });
  });

  describe('saveDownloadProgress', () => {
    it('writes a valid DownloadState entry', () => {
      saveDownloadProgress('model-x', 42, 900);
      const raw = localStorage.getItem(DOWNLOAD_STATE_KEY);
      expect(raw).not.toBeNull();
      const state = JSON.parse(raw!);
      expect(state.modelId).toBe('model-x');
      expect(state.progress).toBe(42);
      expect(state.totalMB).toBe(900);
      expect(state.completed).toBe(false);
    });
  });

  describe('markDownloadComplete', () => {
    it('writes a completed state', () => {
      markDownloadComplete('model-y', 1700);
      const state = JSON.parse(localStorage.getItem(DOWNLOAD_STATE_KEY)!);
      expect(state.completed).toBe(true);
      expect(state.progress).toBe(100);
    });
  });

  describe('clearDownloadState', () => {
    it('removes the key', () => {
      saveDownloadProgress('model-z', 10, 200);
      clearDownloadState();
      expect(localStorage.getItem(DOWNLOAD_STATE_KEY)).toBeNull();
    });
  });
});
