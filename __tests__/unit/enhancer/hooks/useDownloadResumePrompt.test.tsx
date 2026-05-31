/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useDownloadResumePrompt } from '@/hooks/enhancer/useDownloadResumePrompt';
import { DOWNLOAD_STATE_KEY } from '@/services/enhancer/downloadStatePersistence';

const DEFAULT_PARAMS = {
  isModelLoading: false,
  modelLoadProgress: 0,
  currentModelId: null,
  totalDownloadMB: 0,
  isModelLoaded: false,
};

beforeEach(() => localStorage.clear());

describe('useDownloadResumePrompt', () => {
  it('returns showResumePrompt=false when no saved state exists', () => {
    const { result } = renderHook(() => useDownloadResumePrompt(DEFAULT_PARAMS));
    expect(result.current.showResumePrompt).toBe(false);
    expect(result.current.savedDownloadState).toBeNull();
  });

  it('sets showResumePrompt=true when an interrupted download is found on mount', () => {
    localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify({
      modelId: 'test-model',
      startedAt: Date.now() - 1000,
      progress: 50,
      totalMB: 1700,
      completed: false,
    }));

    const { result } = renderHook(() => useDownloadResumePrompt(DEFAULT_PARAMS));
    expect(result.current.showResumePrompt).toBe(true);
    expect(result.current.savedDownloadState?.modelId).toBe('test-model');
  });

  it('dismiss clears the state and localStorage', () => {
    localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify({
      modelId: 'model',
      startedAt: Date.now(),
      progress: 60,
      totalMB: 1000,
      completed: false,
    }));

    const { result } = renderHook(() => useDownloadResumePrompt(DEFAULT_PARAMS));
    expect(result.current.showResumePrompt).toBe(true);

    act(() => result.current.dismiss());

    expect(result.current.showResumePrompt).toBe(false);
    expect(result.current.savedDownloadState).toBeNull();
    expect(localStorage.getItem(DOWNLOAD_STATE_KEY)).toBeNull();
  });

  it('saves progress to localStorage when loading', () => {
    const params = {
      isModelLoading: true,
      modelLoadProgress: 30,
      currentModelId: 'active-model',
      totalDownloadMB: 500,
      isModelLoaded: false,
    };

    renderHook(() => useDownloadResumePrompt(params));

    const saved = JSON.parse(localStorage.getItem(DOWNLOAD_STATE_KEY)!);
    expect(saved.modelId).toBe('active-model');
    expect(saved.progress).toBe(30);
    expect(saved.completed).toBe(false);
  });

  it('marks download complete and hides prompt when model loaded', () => {
    localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify({
      modelId: 'model',
      startedAt: Date.now(),
      progress: 50,
      totalMB: 1000,
      completed: false,
    }));

    const params = {
      isModelLoading: false,
      modelLoadProgress: 100,
      currentModelId: 'model',
      totalDownloadMB: 1000,
      isModelLoaded: true,
    };

    const { result } = renderHook(() => useDownloadResumePrompt(params));

    expect(result.current.showResumePrompt).toBe(false);
    const saved = JSON.parse(localStorage.getItem(DOWNLOAD_STATE_KEY)!);
    expect(saved.completed).toBe(true);
  });
});
