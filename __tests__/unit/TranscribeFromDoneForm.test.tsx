/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TranscribeFromDoneForm } from '@/components/TranscribeFromDoneForm';
import type { ProcessingResult } from '@/hooks/useMediaProcessor';
import type { ModelKey } from '@/components/ModelSelector';
import type { CompressionType } from '@/components/ActionSelector';

// Mock the ModelSelector component
jest.mock('@/components/ModelSelector', () => ({
  __esModule: true,
  default: ({ selectedModel, onModelSelect }: any) => (
    <select
      data-testid="model-selector"
      value={selectedModel}
      onChange={(e) => onModelSelect(e.target.value as ModelKey)}
    >
      <option value="tiny">Tiny</option>
      <option value="base">Base</option>
      <option value="small">Small</option>
    </select>
  ),
  WHISPER_MODELS: {
    tiny: { name: 'Whisper Tiny', size: '75 MB' },
    base: { name: 'Whisper Base', size: '142 MB' },
    small: { name: 'Whisper Small', size: '466 MB' },
  },
}));

// Mock ResourceWarningCard
jest.mock('@/components/ResourceWarningCard', () => ({
  ResourceWarningCard: ({ file, modelKey }: any) => (
    <div data-testid="resource-warning" data-model={modelKey}>
      Resource warning for {file.name}
    </div>
  ),
}));

describe('TranscribeFromDoneForm', () => {
  const mockFile = new File(['audio content'], 'test-audio.wav', { type: 'audio/wav' });
  const mockResult: ProcessingResult = {
    type: 'audio',
    blobUrl: 'blob:test-url',
    metadata: {
      format: 'wav',
      size: 1024 * 1024,
      compressionType: 'none',
      normalized: false,
    },
  };

  const defaultProps = {
    result: mockResult,
    file: mockFile,
    selectedModelKey: 'small' as ModelKey,
    currentModel: 'Xenova/whisper-small',
    isModelLoaded: true,
    isModelLoading: false,
    modelLoadingProgress: 0,
    onModelSelect: jest.fn(),
    onTranscribe: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // UI RENDERING TESTS
  // ============================================================================

  describe('UI Rendering', () => {
    test('should render the transcription form with all elements', () => {
      render(<TranscribeFromDoneForm {...defaultProps} />);

      expect(screen.getByText('Transcribe This Audio')).toBeInTheDocument();
      expect(screen.getByText(/Convert this audio to text using AI transcription/i)).toBeInTheDocument();
      expect(screen.getByTestId('model-selector')).toBeInTheDocument();
      expect(screen.getByLabelText(/Add Compression/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Normalize Audio/i)).toBeInTheDocument();
    });

    test('should show transcribe button when model is loaded', () => {
      render(<TranscribeFromDoneForm {...defaultProps} isModelLoaded={true} />);

      const button = screen.getByRole('button', { name: /Transcribe to Text/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    test('should show loading button when model is loading', () => {
      render(<TranscribeFromDoneForm {...defaultProps} isModelLoading={true} modelLoadingProgress={45} />);

      expect(screen.getByRole('button', { name: /Loading AI Model.*45%/i })).toBeInTheDocument();
    });

    test('should disable button when model is not loaded', () => {
      render(<TranscribeFromDoneForm {...defaultProps} isModelLoaded={false} isModelLoading={false} />);

      const button = screen.getByRole('button', { name: /Waiting for AI Model/i });
      expect(button).toBeDisabled();
    });

    test('should render resource warning card', () => {
      render(<TranscribeFromDoneForm {...defaultProps} />);

      const warning = screen.getByTestId('resource-warning');
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveAttribute('data-model', 'small');
    });
  });

  // ============================================================================
  // SMART ENHANCEMENT LOGIC TESTS
  // ============================================================================

  describe('Smart Enhancement Logic', () => {
    test('should hide compression dropdown when already compressed', () => {
      const compressedResult: ProcessingResult = {
        ...mockResult,
        metadata: {
          ...mockResult.metadata!,
          compressionType: 'speech',
        },
      };

      render(<TranscribeFromDoneForm {...defaultProps} result={compressedResult} />);

      expect(screen.queryByLabelText(/Add Compression/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Already Applied/i)).toBeInTheDocument();
      expect(screen.getByText('🎙️ Speech Compressed')).toBeInTheDocument();
    });

    test('should hide normalization checkbox when already normalized', () => {
      const normalizedResult: ProcessingResult = {
        ...mockResult,
        metadata: {
          ...mockResult.metadata!,
          normalized: true,
        },
      };

      render(<TranscribeFromDoneForm {...defaultProps} result={normalizedResult} />);

      expect(screen.queryByLabelText(/Normalize Audio/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Already Applied/i)).toBeInTheDocument();
      expect(screen.getByText('🎵 Normalized')).toBeInTheDocument();
    });

    test('should show both enhancements when neither applied', () => {
      render(<TranscribeFromDoneForm {...defaultProps} />);

      expect(screen.getByLabelText(/Add Compression/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Normalize Audio/i)).toBeInTheDocument();
      expect(screen.queryByText(/Already Applied/i)).not.toBeInTheDocument();
    });

    test('should show only missing enhancements (partial case)', () => {
      const partialResult: ProcessingResult = {
        ...mockResult,
        metadata: {
          ...mockResult.metadata!,
          compressionType: 'speech',
          normalized: false,
        },
      };

      render(<TranscribeFromDoneForm {...defaultProps} result={partialResult} />);

      // Should NOT show compression (already applied)
      expect(screen.queryByLabelText(/Add Compression/i)).not.toBeInTheDocument();

      // SHOULD show normalization (not applied)
      expect(screen.getByLabelText(/Normalize Audio/i)).toBeInTheDocument();

      // Should show "Already Applied" section
      expect(screen.getByText(/Already Applied/i)).toBeInTheDocument();
      expect(screen.getByText('🎙️ Speech Compressed')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  describe('User Interactions', () => {
    test('should call onTranscribe with selected options', () => {
      const onTranscribe = jest.fn();
      render(<TranscribeFromDoneForm {...defaultProps} onTranscribe={onTranscribe} />);

      // Select speech compression
      const compressionSelect = screen.getByLabelText(/Add Compression/i);
      fireEvent.change(compressionSelect, { target: { value: 'speech' } });

      // Check normalize
      const normalizeCheckbox = screen.getByLabelText(/Normalize Audio/i);
      fireEvent.click(normalizeCheckbox);

      // Click transcribe
      const button = screen.getByRole('button', { name: /Enhance & Transcribe to Text/i });
      fireEvent.click(button);

      expect(onTranscribe).toHaveBeenCalledWith('speech', true, 'small');
    });

    test('should update button text when enhancements are selected', () => {
      render(<TranscribeFromDoneForm {...defaultProps} />);

      // Initially no enhancements
      expect(screen.getByRole('button', { name: /^Transcribe to Text$/i })).toBeInTheDocument();

      // Select compression
      const compressionSelect = screen.getByLabelText(/Add Compression/i);
      fireEvent.change(compressionSelect, { target: { value: 'studio' } });

      // Button text should update
      expect(screen.getByRole('button', { name: /Enhance & Transcribe to Text/i })).toBeInTheDocument();
    });

    test('should call onModelSelect when model changes', () => {
      const onModelSelect = jest.fn();
      render(<TranscribeFromDoneForm {...defaultProps} onModelSelect={onModelSelect} />);

      const modelSelector = screen.getByTestId('model-selector');
      fireEvent.change(modelSelector, { target: { value: 'base' } });

      expect(onModelSelect).toHaveBeenCalledWith('base');
    });

    test('should not call onTranscribe when button is disabled', () => {
      const onTranscribe = jest.fn();
      render(<TranscribeFromDoneForm {...defaultProps} onTranscribe={onTranscribe} isModelLoaded={false} />);

      const button = screen.getByRole('button', { name: /Waiting for AI Model/i });
      fireEvent.click(button);

      expect(onTranscribe).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // SMART RECOMMENDATIONS TESTS
  // ============================================================================

  describe('Smart Recommendations', () => {
    test('should show speech compression tip for meeting files', () => {
      const meetingFile = new File(['audio'], 'team-meeting-2024.wav', { type: 'audio/wav' });
      render(<TranscribeFromDoneForm {...defaultProps} file={meetingFile} />);

      expect(screen.getByText(/💡 Tip: Speech compression recommended for multi-speaker content/i)).toBeInTheDocument();
    });

    test('should show studio compression tip for podcast files', () => {
      const podcastFile = new File(['audio'], 'my-podcast-episode-1.wav', { type: 'audio/wav' });
      render(<TranscribeFromDoneForm {...defaultProps} file={podcastFile} />);

      expect(screen.getByText(/💡 Tip: Studio compression recommended for professional broadcasting/i)).toBeInTheDocument();
    });

    test('should show enhancement message when options are selected', () => {
      render(<TranscribeFromDoneForm {...defaultProps} />);

      // Select normalization
      const normalizeCheckbox = screen.getByLabelText(/Normalize Audio/i);
      fireEvent.click(normalizeCheckbox);

      expect(screen.getByText(/✨ Audio will be enhanced before transcription/i)).toBeInTheDocument();
    });

    test('should not show recommendations when enhancements already applied', () => {
      const meetingFile = new File(['audio'], 'team-meeting.wav', { type: 'audio/wav' });
      const compressedResult: ProcessingResult = {
        ...mockResult,
        metadata: {
          ...mockResult.metadata!,
          compressionType: 'speech',
        },
      };

      render(<TranscribeFromDoneForm {...defaultProps} file={meetingFile} result={compressedResult} />);

      // Should not show the tip because compression is already applied
      expect(screen.queryByText(/💡 Tip: Speech compression recommended/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // MODEL STATE SYNCHRONIZATION TESTS
  // ============================================================================

  describe('Model State Synchronization', () => {
    test('should sync local model key with prop changes', async () => {
      const { rerender } = render(<TranscribeFromDoneForm {...defaultProps} selectedModelKey="small" />);

      const modelSelector = screen.getByTestId('model-selector');
      expect(modelSelector).toHaveValue('small');

      // Update prop
      rerender(<TranscribeFromDoneForm {...defaultProps} selectedModelKey="base" />);

      await waitFor(() => {
        expect(modelSelector).toHaveValue('base');
      });
    });

    test('should use local model key for resource warnings', () => {
      const onModelSelect = jest.fn();
      render(<TranscribeFromDoneForm {...defaultProps} onModelSelect={onModelSelect} />);

      // Change model
      const modelSelector = screen.getByTestId('model-selector');
      fireEvent.change(modelSelector, { target: { value: 'base' } });

      // Resource warning should reflect the new model
      const warning = screen.getByTestId('resource-warning');
      expect(warning).toHaveAttribute('data-model', 'base');
    });

    test('should pass local model key to onTranscribe callback', () => {
      const onTranscribe = jest.fn();
      const onModelSelect = jest.fn();
      render(<TranscribeFromDoneForm {...defaultProps} onTranscribe={onTranscribe} onModelSelect={onModelSelect} />);

      // Change model to 'tiny'
      const modelSelector = screen.getByTestId('model-selector');
      fireEvent.change(modelSelector, { target: { value: 'tiny' } });

      // Click transcribe
      const button = screen.getByRole('button', { name: /Transcribe to Text/i });
      fireEvent.click(button);

      // Should use the newly selected model
      expect(onTranscribe).toHaveBeenCalledWith('none', false, 'tiny');
    });
  });

  // ============================================================================
  // COMPRESSION TYPE TESTS
  // ============================================================================

  describe('Compression Types', () => {
    test('should display all compression options', () => {
      render(<TranscribeFromDoneForm {...defaultProps} />);

      const compressionSelect = screen.getByLabelText(/Add Compression/i);
      expect(compressionSelect).toBeInTheDocument();

      // Check all options exist
      const options = compressionSelect.querySelectorAll('option');
      expect(options).toHaveLength(4);
      expect(options[0]).toHaveTextContent(/No Compression/i);
      expect(options[1]).toHaveTextContent(/Speech/i);
      expect(options[2]).toHaveTextContent(/Studio/i);
      expect(options[3]).toHaveTextContent(/Both/i);
    });

    test('should handle compression type changes', () => {
      const onTranscribe = jest.fn();
      render(<TranscribeFromDoneForm {...defaultProps} onTranscribe={onTranscribe} />);

      const compressionSelect = screen.getByLabelText(/Add Compression/i);

      // Change to studio
      fireEvent.change(compressionSelect, { target: { value: 'studio' } });

      // Click transcribe
      const button = screen.getByRole('button', { name: /Enhance & Transcribe to Text/i });
      fireEvent.click(button);

      expect(onTranscribe).toHaveBeenCalledWith('studio', false, 'small');
    });

    test('should handle "both" compression type', () => {
      const onTranscribe = jest.fn();
      render(<TranscribeFromDoneForm {...defaultProps} onTranscribe={onTranscribe} />);

      const compressionSelect = screen.getByLabelText(/Add Compression/i);
      fireEvent.change(compressionSelect, { target: { value: 'both' } });

      const normalizeCheckbox = screen.getByLabelText(/Normalize Audio/i);
      fireEvent.click(normalizeCheckbox);

      const button = screen.getByRole('button', { name: /Enhance & Transcribe to Text/i });
      fireEvent.click(button);

      expect(onTranscribe).toHaveBeenCalledWith('both', true, 'small');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    test('should handle missing onModelSelect callback', () => {
      const { container } = render(
        <TranscribeFromDoneForm {...defaultProps} onModelSelect={undefined} />
      );

      const modelSelector = screen.getByTestId('model-selector');
      expect(() => {
        fireEvent.change(modelSelector, { target: { value: 'base' } });
      }).not.toThrow();
    });

    test('should handle result without metadata', () => {
      const resultNoMetadata: ProcessingResult = {
        type: 'audio',
        blobUrl: 'blob:test',
      };

      render(<TranscribeFromDoneForm {...defaultProps} result={resultNoMetadata} />);

      // Should show all enhancement options
      expect(screen.getByLabelText(/Add Compression/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Normalize Audio/i)).toBeInTheDocument();
      expect(screen.queryByText(/Already Applied/i)).not.toBeInTheDocument();
    });

    test('should handle compression type "both" in already applied', () => {
      const bothResult: ProcessingResult = {
        ...mockResult,
        metadata: {
          ...mockResult.metadata!,
          compressionType: 'both',
          normalized: true,
        },
      };

      render(<TranscribeFromDoneForm {...defaultProps} result={bothResult} />);

      expect(screen.getByText(/Already Applied/i)).toBeInTheDocument();
      expect(screen.getByText('🎛️ Both Compressions')).toBeInTheDocument();
      expect(screen.getByText('🎵 Normalized')).toBeInTheDocument();
    });
  });
});

