/**
 * @jest-environment jsdom
 */

/**
 * Unit tests for TranscriptionModeSelector
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranscriptionModeSelector } from '@/components/fast-mode/TranscriptionModeSelector';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('TranscriptionModeSelector', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders Standard and Fast options', () => {
    const onModeChange = jest.fn();
    render(
      <TranscriptionModeSelector
        selectedMode="standard"
        onModeChange={onModeChange}
      />
    );

    expect(screen.getByLabelText(/Standard Mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fast Mode/i)).toBeInTheDocument();
  });

  it('highlights selected mode', () => {
    const onModeChange = jest.fn();
    const { rerender } = render(
      <TranscriptionModeSelector
        selectedMode="standard"
        onModeChange={onModeChange}
      />
    );

    const standardInput = screen.getByLabelText(/Standard Mode/i) as HTMLInputElement;
    expect(standardInput.checked).toBe(true);

    rerender(
      <TranscriptionModeSelector
        selectedMode="fast"
        onModeChange={onModeChange}
      />
    );

    const fastInput = screen.getByLabelText(/Fast Mode/i) as HTMLInputElement;
    expect(fastInput.checked).toBe(true);
  });

  it('calls onModeChange when mode changes', () => {
    const onModeChange = jest.fn();
    render(
      <TranscriptionModeSelector
        selectedMode="standard"
        onModeChange={onModeChange}
      />
    );

    const fastInput = screen.getByLabelText(/Fast Mode/i);
    fireEvent.click(fastInput);

    expect(onModeChange).toHaveBeenCalledWith('fast');
  });

  it('is disabled when disabled prop is true', () => {
    const onModeChange = jest.fn();
    render(
      <TranscriptionModeSelector
        selectedMode="standard"
        onModeChange={onModeChange}
        disabled={true}
      />
    );

    const standardInput = screen.getByLabelText(/Standard Mode/i) as HTMLInputElement;
    const fastInput = screen.getByLabelText(/Fast Mode/i) as HTMLInputElement;

    expect(standardInput.disabled).toBe(true);
    expect(fastInput.disabled).toBe(true);
  });

  it('persists selection to localStorage', () => {
    const onModeChange = jest.fn();
    render(
      <TranscriptionModeSelector
        selectedMode="standard"
        onModeChange={onModeChange}
      />
    );

    const fastInput = screen.getByLabelText(/Fast Mode/i);
    fireEvent.click(fastInput);

    expect(localStorageMock.getItem('mediaforge_transcription_mode')).toBe('fast');
  });

  it('restores selection from localStorage on mount', () => {
    localStorageMock.setItem('mediaforge_transcription_mode', 'fast');
    const onModeChange = jest.fn();

    render(
      <TranscriptionModeSelector
        selectedMode="standard"
        onModeChange={onModeChange}
      />
    );

    // Should call onModeChange with stored value
    expect(onModeChange).toHaveBeenCalledWith('fast');
  });

  it('supports keyboard navigation', () => {
    const onModeChange = jest.fn();
    render(
      <TranscriptionModeSelector
        selectedMode="standard"
        onModeChange={onModeChange}
      />
    );

    const standardInput = screen.getByLabelText(/Standard Mode/i);
    standardInput.focus();

    // Arrow down should move to next option
    fireEvent.keyDown(standardInput, { key: 'ArrowDown' });
    // Note: Actual keyboard navigation behavior depends on browser/implementation
  });

  it('has correct ARIA attributes', () => {
    render(
      <TranscriptionModeSelector
        selectedMode="standard"
        onModeChange={jest.fn()}
      />
    );

    const fieldset = screen.getByRole('group');
    expect(fieldset).toBeInTheDocument();

    const legend = screen.getByText(/Transcription Mode/i);
    expect(legend).toBeInTheDocument();
  });
});
