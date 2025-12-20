/**
 * Unit Tests for TranscriptFormattingControls Component
 * 
 * Tests the UI component that allows users to control transcript formatting options.
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TranscriptFormattingControls } from '@/components/TranscriptFormattingControls';
import type { FormattingOptions } from '@/utils/speakerFormatter';

describe('TranscriptFormattingControls', () => {
  const defaultOptions: FormattingOptions = {
    includeTimestamps: false,
    includeSpeakerLabels: true,
    speakerDetectionSensitivity: 'medium',
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('rendering', () => {
    it('should render the component', () => {
      render(
        <TranscriptFormattingControls
          options={defaultOptions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Formatting Options')).toBeInTheDocument();
    });

    it('should render timestamp checkbox', () => {
      render(
        <TranscriptFormattingControls
          options={defaultOptions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Show Timestamps')).toBeInTheDocument();
      expect(screen.getByText(/Display time markers/i)).toBeInTheDocument();
    });

    it('should render speaker labels checkbox', () => {
      render(
        <TranscriptFormattingControls
          options={defaultOptions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Separate by Speaker')).toBeInTheDocument();
      expect(screen.getByText(/Each person's speech/i)).toBeInTheDocument();
    });

    it('should render sensitivity selector when speaker labels enabled', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, includeSpeakerLabels: true }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Speaker Detection Sensitivity')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should NOT render sensitivity selector when speaker labels disabled', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, includeSpeakerLabels: false }}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByText('Speaker Detection Sensitivity')).not.toBeInTheDocument();
    });
  });

  describe('timestamp checkbox', () => {
    it('should reflect includeTimestamps state', () => {
      const { rerender } = render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, includeTimestamps: false }}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Show Timestamps/i });
      expect(checkbox).not.toBeChecked();

      rerender(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, includeTimestamps: true }}
          onChange={mockOnChange}
        />
      );

      expect(checkbox).toBeChecked();
    });

    it('should call onChange when timestamp checkbox is toggled', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, includeTimestamps: false }}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Show Timestamps/i });
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultOptions,
        includeTimestamps: true,
      });
    });

    it('should toggle timestamp checkbox from on to off', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, includeTimestamps: true }}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Show Timestamps/i });
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultOptions,
        includeTimestamps: false,
      });
    });
  });

  describe('speaker labels checkbox', () => {
    it('should reflect includeSpeakerLabels state', () => {
      const { rerender } = render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, includeSpeakerLabels: false }}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Separate by Speaker/i });
      expect(checkbox).not.toBeChecked();

      rerender(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, includeSpeakerLabels: true }}
          onChange={mockOnChange}
        />
      );

      expect(checkbox).toBeChecked();
    });

    it('should call onChange when speaker labels checkbox is toggled', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, includeSpeakerLabels: false }}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /Separate by Speaker/i });
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultOptions,
        includeSpeakerLabels: true,
      });
    });
  });

  describe('sensitivity selector', () => {
    it('should highlight the current sensitivity level', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, speakerDetectionSensitivity: 'medium' }}
          onChange={mockOnChange}
        />
      );

      const mediumButton = screen.getByRole('button', { name: 'Medium' });
      expect(mediumButton).toHaveClass('bg-purple-500/20');
    });

    it('should call onChange when sensitivity level is changed', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, speakerDetectionSensitivity: 'medium' }}
          onChange={mockOnChange}
        />
      );

      const highButton = screen.getByRole('button', { name: 'High' });
      fireEvent.click(highButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultOptions,
        speakerDetectionSensitivity: 'high',
      });
    });

    it('should display description for low sensitivity', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, speakerDetectionSensitivity: 'low' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Long pauses only \(3\+ seconds\)/i)).toBeInTheDocument();
    });

    it('should display description for medium sensitivity', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, speakerDetectionSensitivity: 'medium' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Normal conversation pauses \(1.5\+ seconds\)/i)).toBeInTheDocument();
    });

    it('should display description for high sensitivity', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, speakerDetectionSensitivity: 'high' }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Detects even brief pauses \(0.8\+ seconds\)/i)).toBeInTheDocument();
    });

    it('should allow switching between all sensitivity levels', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, speakerDetectionSensitivity: 'low' }}
          onChange={mockOnChange}
        />
      );

      // Click Medium
      fireEvent.click(screen.getByRole('button', { name: 'Medium' }));
      expect(mockOnChange).toHaveBeenLastCalledWith({
        ...defaultOptions,
        speakerDetectionSensitivity: 'medium',
      });

      // Click High
      fireEvent.click(screen.getByRole('button', { name: 'High' }));
      expect(mockOnChange).toHaveBeenLastCalledWith({
        ...defaultOptions,
        speakerDetectionSensitivity: 'high',
      });

      // Click Low
      fireEvent.click(screen.getByRole('button', { name: 'Low' }));
      expect(mockOnChange).toHaveBeenLastCalledWith({
        ...defaultOptions,
        speakerDetectionSensitivity: 'low',
      });
    });
  });

  describe('interaction flows', () => {
    it('should show sensitivity selector after enabling speaker labels', () => {
      const { rerender } = render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, includeSpeakerLabels: false }}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByText('Speaker Detection Sensitivity')).not.toBeInTheDocument();

      rerender(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, includeSpeakerLabels: true }}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Speaker Detection Sensitivity')).toBeInTheDocument();
    });

    it('should allow toggling both checkboxes independently', () => {
      render(
        <TranscriptFormattingControls
          options={{
            includeTimestamps: false,
            includeSpeakerLabels: false,
            speakerDetectionSensitivity: 'medium',
          }}
          onChange={mockOnChange}
        />
      );

      const timestampCheckbox = screen.getByRole('checkbox', { name: /Show Timestamps/i });
      const speakerCheckbox = screen.getByRole('checkbox', { name: /Separate by Speaker/i });

      // Enable timestamps
      fireEvent.click(timestampCheckbox);
      expect(mockOnChange).toHaveBeenLastCalledWith({
        includeTimestamps: true,
        includeSpeakerLabels: false,
        speakerDetectionSensitivity: 'medium',
      });

      // Enable speaker labels
      fireEvent.click(speakerCheckbox);
      expect(mockOnChange).toHaveBeenLastCalledWith({
        includeTimestamps: false, // Back to original
        includeSpeakerLabels: true,
        speakerDetectionSensitivity: 'medium',
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper checkbox roles', () => {
      render(
        <TranscriptFormattingControls
          options={defaultOptions}
          onChange={mockOnChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
    });

    it('should have clickable labels', () => {
      render(
        <TranscriptFormattingControls
          options={defaultOptions}
          onChange={mockOnChange}
        />
      );

      const timestampLabel = screen.getByText('Show Timestamps').closest('label');
      expect(timestampLabel).toBeTruthy();
      expect(timestampLabel).toHaveClass('cursor-pointer');
    });

    it('should have descriptive button roles for sensitivity', () => {
      render(
        <TranscriptFormattingControls
          options={defaultOptions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('button', { name: 'Low' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'High' })).toBeInTheDocument();
    });
  });

  describe('visual feedback', () => {
    it('should apply correct styles to active sensitivity button', () => {
      render(
        <TranscriptFormattingControls
          options={{ ...defaultOptions, speakerDetectionSensitivity: 'high' }}
          onChange={mockOnChange}
        />
      );

      const highButton = screen.getByRole('button', { name: 'High' });
      const lowButton = screen.getByRole('button', { name: 'Low' });

      expect(highButton).toHaveClass('bg-purple-500/20');
      expect(lowButton).not.toHaveClass('bg-purple-500/20');
      expect(lowButton).toHaveClass('bg-zinc-800');
    });
  });

  describe('tip section', () => {
    it('should display helpful tip', () => {
      render(
        <TranscriptFormattingControls
          options={defaultOptions}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/Speaker detection works best with meetings/i)).toBeInTheDocument();
    });
  });
});

