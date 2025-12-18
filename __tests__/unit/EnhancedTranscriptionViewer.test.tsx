/**
 * @jest-environment jsdom
 */

/**
 * Unit Tests: EnhancedTranscriptionViewer Component
 * 
 * Tests the combined transcription viewer with raw/enhanced toggle
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancedTranscriptionViewer } from '@/components/EnhancedTranscriptionViewer';
import type { TranscriptionResult } from '@/contexts/TranscriberContext';
import type { EnhancementResult } from '@/types/enhancement';

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const React = require('react');
  return {
    Download: (props: any) => React.createElement('span', { 'data-testid': 'download-icon', ...props }),
    Copy: (props: any) => React.createElement('span', { 'data-testid': 'copy-icon', ...props }),
    Check: (props: any) => React.createElement('span', { 'data-testid': 'check-icon', ...props }),
    FileText: (props: any) => React.createElement('span', { 'data-testid': 'file-icon', ...props }),
    Clock: (props: any) => React.createElement('span', { 'data-testid': 'clock-icon', ...props }),
    Sparkles: (props: any) => React.createElement('span', { 'data-testid': 'sparkles-icon', ...props }),
    ArrowRight: (props: any) => React.createElement('span', { 'data-testid': 'arrow-icon', ...props }),
    TrendingDown: (props: any) => React.createElement('span', { 'data-testid': 'trending-icon', ...props }),
    Zap: (props: any) => React.createElement('span', { 'data-testid': 'zap-icon', ...props }),
  };
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn().mockReturnValue('blob:mock-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe('EnhancedTranscriptionViewer', () => {
  const mockRawResult: TranscriptionResult = {
    text: 'This is um like a test transcript you know.',
    chunks: [
      { text: 'This is um', timestamp: [0, 2] },
      { text: 'like a test', timestamp: [2, 4] },
      { text: 'transcript you know.', timestamp: [4, 6] },
    ],
  };

  const mockEnhancedResult: EnhancementResult = {
    originalText: 'This is um like a test transcript you know.',
    enhancedText: 'This is a test transcript.',
    improvements: {
      fillerWordsRemoved: ['um', 'like', 'you know'],
      fillerCount: 3,
      grammarFixes: 1,
      originalWordCount: 9,
      enhancedWordCount: 5,
      originalCharCount: 44,
      enhancedCharCount: 27,
      compressionRatio: 0.61,
      reductionPercentage: 38.6,
    },
    processingTime: 5.5,
    tokensGenerated: 100,
    modelUsed: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    timestamp: new Date('2024-01-15T10:30:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('should render raw transcription', () => {
      render(<EnhancedTranscriptionViewer rawResult={mockRawResult} />);
      
      expect(screen.getByText('AI Transcription')).toBeInTheDocument();
      expect(screen.getByText(mockRawResult.text)).toBeInTheDocument();
    });

    test('should display character count', () => {
      render(<EnhancedTranscriptionViewer rawResult={mockRawResult} />);
      
      // Check that the component renders - character count is shown in header
      expect(screen.getByText(/characters/)).toBeInTheDocument();
    });

    test('should display model name when provided', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          modelName="Whisper Base"
        />
      );
      
      expect(screen.getByText(/Model: Whisper Base/)).toBeInTheDocument();
    });
  });

  describe('Without Enhancement', () => {
    test('should not show version toggle without enhancement', () => {
      render(<EnhancedTranscriptionViewer rawResult={mockRawResult} />);
      
      expect(screen.queryByText('Raw Transcript')).not.toBeInTheDocument();
      expect(screen.queryByText('Enhanced')).not.toBeInTheDocument();
    });

    test('should show timestamps when available', () => {
      render(<EnhancedTranscriptionViewer rawResult={mockRawResult} />);
      
      expect(screen.getByText('Timestamped Segments')).toBeInTheDocument();
      expect(screen.getByText('00:00 - 00:02')).toBeInTheDocument();
    });
  });

  describe('With Enhancement', () => {
    test('should show version toggle with enhancement', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      expect(screen.getByText('Raw Transcript')).toBeInTheDocument();
      expect(screen.getByText('Enhanced')).toBeInTheDocument();
      expect(screen.getByText('Compare')).toBeInTheDocument();
    });

    test('should default to enhanced view when available', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      expect(screen.getByText('AI Enhanced')).toBeInTheDocument();
      expect(screen.getByText('This is a test transcript.')).toBeInTheDocument();
    });

    test('should show improvement metrics', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      expect(screen.getByText('Filler Words Removed')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Size Reduction')).toBeInTheDocument();
      expect(screen.getByText('38.6%')).toBeInTheDocument();
    });

    test('should show removed filler words', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      expect(screen.getByText('um')).toBeInTheDocument();
      expect(screen.getByText('like')).toBeInTheDocument();
      expect(screen.getByText('you know')).toBeInTheDocument();
    });
  });

  describe('View Mode Toggle', () => {
    test('should switch to raw view when clicked', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      fireEvent.click(screen.getByText('Raw Transcript'));
      
      expect(screen.getByText('AI Transcription')).toBeInTheDocument();
      expect(screen.getByText(mockRawResult.text)).toBeInTheDocument();
    });

    test('should switch to comparison view when clicked', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      fireEvent.click(screen.getByText('Compare'));
      
      expect(screen.getByText('Original')).toBeInTheDocument();
    });

    test('should show both texts in comparison view', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      fireEvent.click(screen.getByText('Compare'));
      
      expect(screen.getByText(mockRawResult.text)).toBeInTheDocument();
      expect(screen.getByText(mockEnhancedResult.enhancedText)).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    test('should copy raw text when in raw view', async () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      // Switch to raw view
      fireEvent.click(screen.getByText('Raw Transcript'));
      
      fireEvent.click(screen.getByText('Copy'));
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockRawResult.text);
    });

    test('should copy enhanced text when in enhanced view', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      fireEvent.click(screen.getByText('Copy'));
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockEnhancedResult.enhancedText);
    });

    test('should show "Copied!" feedback after copying', async () => {
      jest.useFakeTimers();
      
      render(<EnhancedTranscriptionViewer rawResult={mockRawResult} />);
      
      fireEvent.click(screen.getByText('Copy'));
      
      // Wait for state update
      expect(await screen.findByText('Copied!')).toBeInTheDocument();
      
      jest.useRealTimers();
    });
  });

  describe('Download Functionality', () => {
    let mockClick: jest.Mock;
    let lastCreatedLink: { href: string; download: string };

    beforeEach(() => {
      mockClick = jest.fn();
      lastCreatedLink = { href: '', download: '' };
      
      const originalCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          const link = originalCreateElement('a');
          link.click = mockClick;
          // Track the link properties
          Object.defineProperty(link, 'href', {
            set: (value) => { lastCreatedLink.href = value; },
            get: () => lastCreatedLink.href,
          });
          Object.defineProperty(link, 'download', {
            set: (value) => { lastCreatedLink.download = value; },
            get: () => lastCreatedLink.download,
          });
          return link;
        }
        return originalCreateElement(tagName);
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should download TXT file', () => {
      render(<EnhancedTranscriptionViewer rawResult={mockRawResult} />);
      
      fireEvent.click(screen.getByText('TXT'));
      
      expect(mockClick).toHaveBeenCalled();
      expect(lastCreatedLink.download).toContain('.txt');
    });

    test('should download JSON file', () => {
      render(<EnhancedTranscriptionViewer rawResult={mockRawResult} />);
      
      fireEvent.click(screen.getByText('JSON'));
      
      expect(mockClick).toHaveBeenCalled();
      expect(lastCreatedLink.download).toContain('.json');
    });

    test('should include suffix for enhanced downloads', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      fireEvent.click(screen.getByText('TXT'));
      
      expect(lastCreatedLink.download).toContain('-enhanced');
    });

    test('should include suffix for raw downloads', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      // Switch to raw view
      fireEvent.click(screen.getByText('Raw Transcript'));
      
      fireEvent.click(screen.getByText('TXT'));
      
      expect(lastCreatedLink.download).toContain('-raw');
    });
  });

  describe('SRT Download', () => {
    test('should show SRT button when chunks available and in raw view', () => {
      render(<EnhancedTranscriptionViewer rawResult={mockRawResult} />);
      
      expect(screen.getByText('SRT')).toBeInTheDocument();
    });

    test('should not show SRT button when no chunks', () => {
      const resultWithoutChunks: TranscriptionResult = {
        text: 'Test transcript',
      };
      
      render(<EnhancedTranscriptionViewer rawResult={resultWithoutChunks} />);
      
      expect(screen.queryByText('SRT')).not.toBeInTheDocument();
    });

    test('should not show SRT button in enhanced view', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      // Default is enhanced view
      expect(screen.queryByText('SRT')).not.toBeInTheDocument();
    });
  });

  describe('Timestamped Segments', () => {
    test('should display timestamps in raw view', () => {
      render(<EnhancedTranscriptionViewer rawResult={mockRawResult} />);
      
      expect(screen.getByText('Timestamped Segments')).toBeInTheDocument();
    });

    test('should not display timestamps in enhanced view', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      expect(screen.queryByText('Timestamped Segments')).not.toBeInTheDocument();
    });
  });

  describe('Footer Stats', () => {
    test('should show segment count in raw view', () => {
      render(<EnhancedTranscriptionViewer rawResult={mockRawResult} />);
      
      expect(screen.getByText('3 segments')).toBeInTheDocument();
    });

    test('should show model name in enhanced view', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          enhancedResult={mockEnhancedResult}
        />
      );
      
      expect(screen.getByText(/Enhanced by Llama-3.2-3B-Instruct/)).toBeInTheDocument();
    });

    test('should show estimated read time', () => {
      render(<EnhancedTranscriptionViewer rawResult={mockRawResult} />);
      
      expect(screen.getByText(/min read/)).toBeInTheDocument();
    });
  });

  describe('Custom Filename', () => {
    let mockClick: jest.Mock;
    let lastCreatedLink: { href: string; download: string };

    beforeEach(() => {
      mockClick = jest.fn();
      lastCreatedLink = { href: '', download: '' };
      
      const originalCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          const link = originalCreateElement('a');
          link.click = mockClick;
          Object.defineProperty(link, 'href', {
            set: (value) => { lastCreatedLink.href = value; },
            get: () => lastCreatedLink.href,
          });
          Object.defineProperty(link, 'download', {
            set: (value) => { lastCreatedLink.download = value; },
            get: () => lastCreatedLink.download,
          });
          return link;
        }
        return originalCreateElement(tagName);
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should use custom filename for downloads', () => {
      render(
        <EnhancedTranscriptionViewer
          rawResult={mockRawResult}
          filename="my-custom-file"
        />
      );
      
      fireEvent.click(screen.getByText('TXT'));
      
      expect(lastCreatedLink.download).toContain('my-custom-file');
    });
  });
});
