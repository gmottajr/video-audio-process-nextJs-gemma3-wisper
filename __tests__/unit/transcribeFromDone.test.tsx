/**
 * Unit Tests: Transcribe from Done State
 * 
 * Tests the "Transcribe This Audio" feature in DoneStateView
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DoneStateView } from '@/components/states/DoneStateView';
import type { ProcessingResult } from '@/hooks/useMediaProcessor';

// Mock ESM-only @ffmpeg dependency pulled in by audioExtraction
jest.mock('@/utils/audioExtraction', () => ({
  extractAudioSegmentFromUrl: jest.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/wav' })),
}));

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

const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' });

describe('Transcribe from Done State', () => {
  describe('UI Rendering Tests', () => {
    test('should show transcribe section for audio results', () => {
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

      expect(screen.getByText('Transcribe This Audio')).toBeInTheDocument();
    });

    test('should NOT show transcribe section for video results', () => {
      const result: ProcessingResult = {
        type: 'video',
        blobUrl: 'blob:test',
        metadata: {},
      };

      render(
        <DoneStateView
          result={result}
          file={mockFile}
          formatId="mp4"
          selectedModelKey="base"
          currentModel={null}
          metrics={{}}
          memoryUsageMB={100}
          onDownload={jest.fn()}
          onReset={jest.fn()}
        />
      );

      expect(screen.queryByText('Transcribe This Audio')).not.toBeInTheDocument();
    });

    test('should NOT show transcribe section for transcription results', () => {
      const result: ProcessingResult = {
        type: 'transcription',
        transcription: { text: 'test', chunks: [] },
        metadata: {},
      };

      render(
        <DoneStateView
          result={result}
          file={mockFile}
          formatId={null}
          selectedModelKey="base"
          currentModel="whisper-base"
          metrics={{}}
          memoryUsageMB={100}
          onDownload={jest.fn()}
          onReset={jest.fn()}
        />
      );

      expect(screen.queryByText('Transcribe This Audio')).not.toBeInTheDocument();
    });

    test('should show all enhancement options when none applied', () => {
      const result: ProcessingResult = {
        type: 'audio',
        blobUrl: 'blob:test',
        metadata: { compressionType: 'none', normalized: false },
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

      expect(screen.getByText(/Add Compression/i)).toBeInTheDocument();
      expect(screen.getByText(/Normalize Audio/i)).toBeInTheDocument();
    });

    test('should show "Already Applied" when enhancements exist', () => {
      const result: ProcessingResult = {
        type: 'audio',
        blobUrl: 'blob:test',
        metadata: { compressionType: 'speech', normalized: true },
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

      expect(screen.getByText(/Already Applied/i)).toBeInTheDocument();
      expect(screen.getByText(/Speech Compressed/i)).toBeInTheDocument();
      expect(screen.getByText(/Normalized/i)).toBeInTheDocument();
    });
  });

  describe('Smart Enhancement Logic Tests', () => {
    test('should hide compression dropdown when already compressed', () => {
      const result: ProcessingResult = {
        type: 'audio',
        blobUrl: 'blob:test',
        metadata: { compressionType: 'speech', normalized: false },
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

      // Should NOT show compression dropdown
      expect(screen.queryByText(/Add Compression/i)).not.toBeInTheDocument();
      
      // Should show "Already Applied" instead
      expect(screen.getByText(/Already Applied/i)).toBeInTheDocument();
    });

    test('should hide normalize checkbox when already normalized', () => {
      const result: ProcessingResult = {
        type: 'audio',
        blobUrl: 'blob:test',
        metadata: { compressionType: 'none', normalized: true },
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

      // Should NOT show normalize checkbox (already applied)
      const checkboxes = screen.queryAllByRole('checkbox');
      const normalizeCheckbox = checkboxes.find(cb => 
        cb.parentElement?.textContent?.includes('Normalize Audio')
      );
      expect(normalizeCheckbox).toBeUndefined();
    });

    test('should show only missing enhancements (partial case)', () => {
      const result: ProcessingResult = {
        type: 'audio',
        blobUrl: 'blob:test',
        metadata: { compressionType: 'speech', normalized: false },
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

      // Should NOT show compression (already applied)
      expect(screen.queryByText(/Add Compression/i)).not.toBeInTheDocument();
      
      // SHOULD show normalization (not applied)
      expect(screen.getByText(/Normalize Audio/i)).toBeInTheDocument();
    });

    test('should call onTranscribe with correct parameters including modelKey', () => {
      const onTranscribe = jest.fn();
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
          onTranscribe={onTranscribe}
        />
      );

      // Select speech compression
      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'speech' } });

      // Check normalize
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Click transcribe button
      const button = screen.getByRole('button', { name: /Transcribe/i });
      fireEvent.click(button);

      // Should pass compressionType, normalizeAudio, AND modelKey
      expect(onTranscribe).toHaveBeenCalledWith('speech', true, 'small');
    });
  });

  describe('Model State Tests', () => {
    test('should disable button when model not loaded', () => {
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
          isModelLoaded={false}
          onTranscribe={jest.fn()}
        />
      );

      const button = screen.getByRole('button', { name: /Transcribe/i });
      expect(button).toBeDisabled();
    });

    test('should show "Waiting for AI Model..." when not loaded', () => {
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
          isModelLoaded={false}
          onTranscribe={jest.fn()}
        />
      );

      expect(screen.getByText(/Waiting for AI Model/i)).toBeInTheDocument();
    });

    test('should show loading progress when model loading', () => {
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
          isModelLoading={true}
          modelLoadingProgress={45}
          onTranscribe={jest.fn()}
        />
      );

      expect(screen.getByText(/Loading AI Model.*45%/i)).toBeInTheDocument();
    });

    test('should enable button when model loaded', () => {
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

      const button = screen.getByRole('button', { name: /Transcribe/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('Button Text Tests', () => {
    test('should show "Enhance & Transcribe" when enhancements selected', () => {
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
          onTranscribe={jest.fn()}
        />
      );

      // Select compression
      const dropdown = screen.getByRole('combobox');
      fireEvent.change(dropdown, { target: { value: 'speech' } });

      // Button should update
      expect(screen.getByText(/Enhance.*Transcribe/i)).toBeInTheDocument();
    });

    test('should show "Transcribe to Text" when no new enhancements', () => {
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

      expect(screen.getByText(/Transcribe to Text/i)).toBeInTheDocument();
    });
  });

  describe('Smart Recommendations', () => {
    test('should show speech recommendation for meeting files', () => {
      const meetingFile = new File(['test'], 'team-meeting.wav', { type: 'audio/wav' });
      const result: ProcessingResult = {
        type: 'audio',
        blobUrl: 'blob:test',
        metadata: {},
      };

      render(
        <DoneStateView
          result={result}
          file={meetingFile}
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

      expect(screen.getByText(/Speech compression recommended/i)).toBeInTheDocument();
    });

    test('should show studio recommendation for podcast files', () => {
      const podcastFile = new File(['test'], 'podcast-ep1.mp3', { type: 'audio/mp3' });
      const result: ProcessingResult = {
        type: 'audio',
        blobUrl: 'blob:test',
        metadata: {},
      };

      render(
        <DoneStateView
          result={result}
          file={podcastFile}
          formatId="mp3"
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

      expect(screen.getByText(/Studio compression recommended/i)).toBeInTheDocument();
    });
  });
});
