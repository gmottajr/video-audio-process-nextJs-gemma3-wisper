/**
 * @jest-environment jsdom
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useTabKeyboardShortcuts } from '@/components/TabbedTranscriptionView/hooks/useTabKeyboardShortcuts';
import { ORDERED_TABS } from '@/components/TabbedTranscriptionView/strategies/tabs/registry';

describe('useTabKeyboardShortcuts', () => {
  let setActiveTab: jest.Mock;
  let handleCopy: jest.Mock;
  let setShowKeyboardHelp: jest.Mock;
  let setShowExportMenu: jest.Mock;

  beforeEach(() => {
    setActiveTab = jest.fn();
    handleCopy = jest.fn();
    setShowKeyboardHelp = jest.fn();
    setShowExportMenu = jest.fn();
  });

  function setup() {
    return renderHook(() =>
      useTabKeyboardShortcuts({
        tabs: ORDERED_TABS,
        setActiveTab,
        handleCopy,
        setShowKeyboardHelp,
        setShowExportMenu,
      })
    );
  }

  test('Ctrl+1 calls setActiveTab with "original"', () => {
    setup();
    fireEvent.keyDown(window, { key: '1', ctrlKey: true });
    expect(setActiveTab).toHaveBeenCalledWith('original');
  });

  test('Ctrl+2 calls setActiveTab with "enhanced"', () => {
    setup();
    fireEvent.keyDown(window, { key: '2', ctrlKey: true });
    expect(setActiveTab).toHaveBeenCalledWith('enhanced');
  });

  test('Ctrl+3 calls setActiveTab with "sidebyside"', () => {
    setup();
    fireEvent.keyDown(window, { key: '3', ctrlKey: true });
    expect(setActiveTab).toHaveBeenCalledWith('sidebyside');
  });

  test('Ctrl+4 calls setActiveTab with "diff"', () => {
    setup();
    fireEvent.keyDown(window, { key: '4', ctrlKey: true });
    expect(setActiveTab).toHaveBeenCalledWith('diff');
  });

  test('Ctrl+E calls setActiveTab with a function updater', () => {
    setup();
    fireEvent.keyDown(window, { key: 'e', ctrlKey: true });
    expect(setActiveTab).toHaveBeenCalledWith(expect.any(Function));
    // Verify the updater toggles correctly
    const updater = setActiveTab.mock.calls[0][0] as (prev: string) => string;
    expect(updater('original')).toBe('enhanced');
    expect(updater('enhanced')).toBe('original');
    expect(updater('diff')).toBe('original');
  });

  test('? key calls setShowKeyboardHelp with a function updater', () => {
    setup();
    fireEvent.keyDown(window, { key: '?' });
    expect(setShowKeyboardHelp).toHaveBeenCalledWith(expect.any(Function));
  });

  test('Escape calls setShowKeyboardHelp(false) and setShowExportMenu(false)', () => {
    setup();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(setShowKeyboardHelp).toHaveBeenCalledWith(false);
    expect(setShowExportMenu).toHaveBeenCalledWith(false);
  });

  test('ignores keydown on input elements', () => {
    setup();
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: '1', ctrlKey: true });
    expect(setActiveTab).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  test('removes event listener on unmount', () => {
    const { unmount } = setup();
    unmount();
    fireEvent.keyDown(window, { key: '?' });
    expect(setShowKeyboardHelp).not.toHaveBeenCalled();
  });
});
