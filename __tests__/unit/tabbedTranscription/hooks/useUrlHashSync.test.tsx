/**
 * @jest-environment jsdom
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useUrlHashSync } from '@/components/TabbedTranscriptionView/hooks/useUrlHashSync';

const mockReplaceState = jest.fn();
Object.defineProperty(window.history, 'replaceState', {
  writable: true,
  value: mockReplaceState,
});

describe('useUrlHashSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.hash = '';
    const store: Record<string, string> = {};
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => store[k] ?? null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => { store[k] = v; });
  });

  test('reads valid hash on mount and sets active tab', () => {
    window.location.hash = '#diff';
    const setActiveTab = jest.fn();
    renderHook(() => useUrlHashSync('enhanced', setActiveTab));
    expect(setActiveTab).toHaveBeenCalledWith('diff');
  });

  test('ignores invalid hash on mount', () => {
    window.location.hash = '#invalid';
    const setActiveTab = jest.fn();
    renderHook(() => useUrlHashSync('enhanced', setActiveTab));
    // Should not call setActiveTab for invalid hash (falls through to sessionStorage)
    expect(setActiveTab).not.toHaveBeenCalledWith('invalid');
  });

  test('writes hash to replaceState when activeTab changes', () => {
    const setActiveTab = jest.fn();
    renderHook(() => useUrlHashSync('original', setActiveTab));
    expect(mockReplaceState).toHaveBeenCalled();
    const url = mockReplaceState.mock.calls[0][2] as string;
    expect(url).toContain('#original');
  });

  test('listens for hashchange events', () => {
    window.location.hash = '';
    const setActiveTab = jest.fn();
    renderHook(() => useUrlHashSync('enhanced', setActiveTab));
    act(() => {
      window.location.hash = '#sidebyside';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(setActiveTab).toHaveBeenCalledWith('sidebyside');
  });
});
