/**
 * Unit Tests: Model Selection in Done State
 * 
 * Tests that users can select AI model from the audio extraction done screen
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DoneStateView } from '@/components/states/DoneStateView';
import type { ProcessingResult } from '@/hooks/useMediaProcessor';

// Mock dependencies
jest.mock('@/components/WaveformViewer', () => ({
  WaveformViewer: () => <div data-testid="mock-waveform">Mock WaveformViewer</div>,
}));

jest.mock('@/components/TranscriptionViewer', () => ({
  TranscriptionViewer: () => <div data-testid="mock-transcription">Mock TranscriptionViewer</div>,
}));

jest.mock('@/components/ResourceMonitor', () => ({
  ResourceMonitor: () => <div data-testid="mock-resource">Mock ResourceMonitor</div>,
}));

jest.mock('@/components/ModelSelector', () => ({
  __esModule: true,
  default: ({ selectedModel, onModelSelect }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'model-selector' },
      React.createElement('select', {
        value: selectedModel,
        onChange: (e: any) => onModelSelect(e.target.value),
        'data-testid': 'model-select'
      },
        React.createElement('option', { value: 'tiny' }, 'Tiny'),
        React.createElement('option', { value: 'base' }, 'Base'),
        React.createElement('option', { value: 'small' }, 'Small')
      )
    );
  },
  WHISPER_MODELS: {
    tiny: { id: 'Xenova/whisper-tiny', name: 'Tiny' },
    base: { id: 'Xenova/whisper-base', name: 'Base' },
    small: { id: 'Xenova/whisper-small', name: 'Small' },
  },
}));

const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' });

describe('Model Selection in Done State', () => {
  test('should show model selector in transcribe section', () => {
    const result: ProcessingResult = {
      type: 'audio',
      blobUrl: 'blob:test',
      metadata: {},
    };

    render(
      <DoneStateView
        result={result}
        file={mockFile}
        formatId="wav"
        selectedModelKey="base"
        currentModel={null}
        metrics={{}}
        memoryUsageMB={100}
        onDownload={jest.fn()}
        onReset={jest.fn()}
        isModelLoaded={true}
        onTranscribe={jest.fn()}
      />
    );

    expect(screen.getByText(/Select AI Model/i)).toBeInTheDocument();
    expect(screen.getByTestId('model-selector')).toBeInTheDocument();
  });

  test('should allow user to change model selection', () => {
    const onModelSelect = jest.fn();
    const result: ProcessingResult = {
      type: 'audio',
      blobUrl: 'blob:test',
      metadata: {},
    };

    render(
      <DoneStateView
        result={result}
        file={mockFile}
        formatId="wav"
        selectedModelKey="base"
        currentModel={null}
        metrics={{}}
        memoryUsageMB={100}
        onDownload={jest.fn()}
        onReset={jest.fn()}
        isModelLoaded={true}
        onModelSelect={onModelSelect}
        onTranscribe={jest.fn()}
      />
    );

    const modelSelect = screen.getByTestId('model-select');
    
    // Change model from "base" to "small"
    fireEvent.change(modelSelect, { target: { value: 'small' } });

    expect(onModelSelect).toHaveBeenCalledWith('small');
  });

  test('should pass selected model to onTranscribe callback', () => {
    const onTranscribe = jest.fn();
    const result: ProcessingResult = {
      type: 'audio',
      blobUrl: 'blob:test',
      metadata: {},
    };

    const { rerender } = render(
      <DoneStateView
        result={result}
        file={mockFile}
        formatId="wav"
        selectedModelKey="base"
        currentModel={null}
        metrics={{}}
        memoryUsageMB={100}
        onDownload={jest.fn()}
        onReset={jest.fn()}
        isModelLoaded={true}
        onTranscribe={onTranscribe}
      />
    );

    // Initially shows "base" model
    const modelSelect = screen.getByTestId('model-select');
    expect(modelSelect).toHaveValue('base');

    // User changes to "small"
    fireEvent.change(modelSelect, { target: { value: 'small' } });

    // Rerender with updated prop (simulates parent state update)
    rerender(
      <DoneStateView
        result={result}
        file={mockFile}
        formatId="wav"
        selectedModelKey="small"
        currentModel={null}
        metrics={{}}
        memoryUsageMB={100}
        onDownload={jest.fn()}
        onReset={jest.fn()}
        isModelLoaded={true}
        onTranscribe={onTranscribe}
      />
    );

    // Click transcribe button
    const transcribeButton = screen.getByRole('button', { name: /Transcribe/i });
    fireEvent.click(transcribeButton);

    // Should call with the selected model key (third parameter)
    expect(onTranscribe).toHaveBeenCalledWith('none', false, 'small');
  });

  test('should start with default selected model', () => {
    const result: ProcessingResult = {
      type: 'audio',
      blobUrl: 'blob:test',
      metadata: {},
    };

    render(
      <DoneStateView
        result={result}
        file={mockFile}
        formatId="wav"
        selectedModelKey="small"
        currentModel={null}
        metrics={{}}
        memoryUsageMB={100}
        onDownload={jest.fn()}
        onReset={jest.fn()}
        isModelLoaded={true}
        onTranscribe={jest.fn()}
      />
    );

    const modelSelect = screen.getByTestId('model-select');
    expect(modelSelect).toHaveValue('small');
  });

  test('should update local model when prop changes', () => {
    const result: ProcessingResult = {
      type: 'audio',
      blobUrl: 'blob:test',
      metadata: {},
    };

    const { rerender } = render(
      <DoneStateView
        result={result}
        file={mockFile}
        formatId="wav"
        selectedModelKey="tiny"
        currentModel={null}
        metrics={{}}
        memoryUsageMB={100}
        onDownload={jest.fn()}
        onReset={jest.fn()}
        isModelLoaded={true}
        onTranscribe={jest.fn()}
      />
    );

    const modelSelect = screen.getByTestId('model-select');
    expect(modelSelect).toHaveValue('tiny');

    // Parent changes the model
    rerender(
      <DoneStateView
        result={result}
        file={mockFile}
        formatId="wav"
        selectedModelKey="small"
        currentModel={null}
        metrics={{}}
        memoryUsageMB={100}
        onDownload={jest.fn()}
        onReset={jest.fn()}
        isModelLoaded={true}
        onTranscribe={jest.fn()}
      />
    );

    expect(modelSelect).toHaveValue('small');
  });

  test('should combine model selection with compression and normalization', () => {
    const onTranscribe = jest.fn();
    const result: ProcessingResult = {
      type: 'audio',
      blobUrl: 'blob:test',
      metadata: { compressionType: 'none', normalized: false },
    };

    const { rerender } = render(
      <DoneStateView
        result={result}
        file={mockFile}
        formatId="wav"
        selectedModelKey="base"
        currentModel={null}
        metrics={{}}
        memoryUsageMB={100}
        onDownload={jest.fn()}
        onReset={jest.fn()}
        isModelLoaded={true}
        onTranscribe={onTranscribe}
      />
    );

    // Change model to "small"
    const modelSelect = screen.getByTestId('model-select');
    fireEvent.change(modelSelect, { target: { value: 'small' } });

    // Rerender to update prop
    rerender(
      <DoneStateView
        result={result}
        file={mockFile}
        formatId="wav"
        selectedModelKey="small"
        currentModel={null}
        metrics={{}}
        memoryUsageMB={100}
        onDownload={jest.fn()}
        onReset={jest.fn()}
        isModelLoaded={true}
        onTranscribe={onTranscribe}
      />
    );

    // Select speech compression
    const compressionDropdown = screen.getAllByRole('combobox')[1]; // Second combobox is compression
    fireEvent.change(compressionDropdown, { target: { value: 'speech' } });

    // Enable normalization
    const normalizeCheckbox = screen.getByRole('checkbox');
    fireEvent.click(normalizeCheckbox);

    // Click transcribe
    const transcribeButton = screen.getByRole('button', { name: /Transcribe/i });
    fireEvent.click(transcribeButton);

    // Should pass all three parameters: compression, normalize, AND model
    expect(onTranscribe).toHaveBeenCalledWith('speech', true, 'small');
  });
});

