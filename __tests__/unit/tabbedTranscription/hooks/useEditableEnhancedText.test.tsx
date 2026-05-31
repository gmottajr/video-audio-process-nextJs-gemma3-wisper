/**
 * @jest-environment jsdom
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useEditableEnhancedText } from '@/components/TabbedTranscriptionView/hooks/useEditableEnhancedText';

describe('useEditableEnhancedText', () => {
  test('currentEnhancedText equals enhancedText when no edits', () => {
    const { result } = renderHook(() => useEditableEnhancedText('original text'));
    expect(result.current.currentEnhancedText).toBe('original text');
    expect(result.current.hasEdits).toBe(false);
  });

  test('hasEdits becomes true after handleTextEdit with different text', () => {
    const { result } = renderHook(() => useEditableEnhancedText('original text'));
    act(() => {
      result.current.handleTextEdit('edited text');
    });
    expect(result.current.hasEdits).toBe(true);
    expect(result.current.currentEnhancedText).toBe('edited text');
  });

  test('hasEdits remains false when edited text equals source text', () => {
    const { result } = renderHook(() => useEditableEnhancedText('same text'));
    act(() => {
      result.current.handleTextEdit('same text');
    });
    expect(result.current.hasEdits).toBe(false);
  });

  test('handleResetEdits clears edits and exits editing mode', () => {
    const { result } = renderHook(() => useEditableEnhancedText('original text'));
    act(() => {
      result.current.handleTextEdit('edited text');
      result.current.setIsEditing(true);
    });
    act(() => {
      result.current.handleResetEdits();
    });
    expect(result.current.hasEdits).toBe(false);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.currentEnhancedText).toBe('original text');
  });

  test('resets edits when enhancedText prop changes', () => {
    let enhancedText = 'version 1';
    const { result, rerender } = renderHook(() => useEditableEnhancedText(enhancedText));
    act(() => {
      result.current.handleTextEdit('edited version 1');
    });
    expect(result.current.hasEdits).toBe(true);

    enhancedText = 'version 2';
    rerender();

    expect(result.current.hasEdits).toBe(false);
    expect(result.current.currentEnhancedText).toBe('version 2');
    expect(result.current.isEditing).toBe(false);
  });

  test('calls onEnhancedTextChange callback when text is edited', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useEditableEnhancedText('original text', onChange));
    act(() => {
      result.current.handleTextEdit('new text');
    });
    expect(onChange).toHaveBeenCalledWith('new text');
  });

  test('isEditing starts as false', () => {
    const { result } = renderHook(() => useEditableEnhancedText('text'));
    expect(result.current.isEditing).toBe(false);
  });

  test('setIsEditing toggles isEditing', () => {
    const { result } = renderHook(() => useEditableEnhancedText('text'));
    act(() => {
      result.current.setIsEditing(true);
    });
    expect(result.current.isEditing).toBe(true);
  });
});
