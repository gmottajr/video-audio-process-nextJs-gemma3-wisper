/**
 * @jest-environment jsdom
 */

/**
 * Unit Tests: EnhancementProgress Component
 * 
 * Tests the full-screen progress overlay for AI enhancement
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EnhancementProgress } from '@/components/EnhancementProgress';
import type { EnhancementProgress as EnhancementProgressType } from '@/types/enhancement';

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const React = require('react');
  return {
    Download: (props: any) => React.createElement('span', { 'data-testid': 'download-icon', ...props }),
    Loader2: (props: any) => React.createElement('span', { 'data-testid': 'loader-icon', ...props }),
    Sparkles: (props: any) => React.createElement('span', { 'data-testid': 'sparkles-icon', ...props }),
    CheckCircle: (props: any) => React.createElement('span', { 'data-testid': 'check-icon', ...props }),
    XCircle: (props: any) => React.createElement('span', { 'data-testid': 'x-icon', ...props }),
    AlertTriangle: (props: any) => React.createElement('span', { 'data-testid': 'alert-icon', ...props }),
  };
});

describe('EnhancementProgress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createProgress = (overrides: Partial<EnhancementProgressType> = {}): EnhancementProgressType => ({
    stage: 'downloading',
    progress: 50,
    message: 'Test message',
    ...overrides,
  });

  describe('Downloading Stage', () => {
    test('should display downloading title', () => {
      const progress = createProgress({ stage: 'downloading', progress: 30 });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText('Downloading AI Model')).toBeInTheDocument();
    });

    test('should display download progress percentage', () => {
      const progress = createProgress({ stage: 'downloading', progress: 45 });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    test('should display download size info when available', () => {
      const progress = createProgress({
        stage: 'downloading',
        progress: 50,
        downloadedMB: 500,
        totalMB: 1700,
      });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText(/500 MB/)).toBeInTheDocument();
      expect(screen.getByText(/1700 MB/)).toBeInTheDocument();
    });

    test('should show one-time download tip', () => {
      const progress = createProgress({ stage: 'downloading' });
      render(<EnhancementProgress progress={progress} />);
      
      // Multiple elements may contain this text
      expect(screen.getAllByText(/one-time download/i).length).toBeGreaterThan(0);
    });
  });

  describe('Loading Stage', () => {
    test('should display loading title', () => {
      const progress = createProgress({ stage: 'loading', progress: 80 });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText('Loading AI Model')).toBeInTheDocument();
    });
  });

  describe('Processing Stage', () => {
    test('should display enhancing title for processing stage', () => {
      const progress = createProgress({ stage: 'processing' });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText('Enhancing Transcript')).toBeInTheDocument();
    });

    test('should display enhancing title for streaming stage', () => {
      const progress = createProgress({ stage: 'streaming' });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText('Enhancing Transcript')).toBeInTheDocument();
    });

    test('should show token count when available', () => {
      const progress = createProgress({
        stage: 'streaming',
        tokensGenerated: 150,
      });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText(/150 tokens/)).toBeInTheDocument();
    });

    test('should show AI processing tip', () => {
      const progress = createProgress({ stage: 'processing' });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText(/AI is analyzing/)).toBeInTheDocument();
    });
  });

  describe('Complete Stage', () => {
    test('should display complete title', () => {
      const progress = createProgress({ stage: 'complete', progress: 100 });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText('Enhancement Complete')).toBeInTheDocument();
    });
  });

  describe('Error Stage', () => {
    test('should display error title', () => {
      const progress = createProgress({
        stage: 'error',
        message: 'Model failed to load',
      });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText('Enhancement Failed')).toBeInTheDocument();
    });

    test('should show error message', () => {
      const progress = createProgress({
        stage: 'error',
        message: 'Out of memory',
      });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText('Out of memory')).toBeInTheDocument();
    });
  });

  describe('Cancelled Stage', () => {
    test('should display cancelled title', () => {
      const progress = createProgress({ stage: 'cancelled' });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText('Enhancement Cancelled')).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    test('should show cancel button during downloading', () => {
      const onCancel = jest.fn();
      const progress = createProgress({ stage: 'downloading' });
      render(<EnhancementProgress progress={progress} onCancel={onCancel} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('should show cancel button during processing', () => {
      const onCancel = jest.fn();
      const progress = createProgress({ stage: 'processing' });
      render(<EnhancementProgress progress={progress} onCancel={onCancel} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('should call onCancel when clicked', () => {
      const onCancel = jest.fn();
      const progress = createProgress({ stage: 'downloading' });
      render(<EnhancementProgress progress={progress} onCancel={onCancel} />);
      
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('should not show cancel button on complete', () => {
      const onCancel = jest.fn();
      const progress = createProgress({ stage: 'complete' });
      render(<EnhancementProgress progress={progress} onCancel={onCancel} />);
      
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    test('should not show cancel button on error', () => {
      const onCancel = jest.fn();
      const progress = createProgress({ stage: 'error' });
      render(<EnhancementProgress progress={progress} onCancel={onCancel} />);
      
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    test('should not show cancel button if onCancel not provided', () => {
      const progress = createProgress({ stage: 'downloading' });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('Elapsed Time', () => {
    test('should show elapsed time during processing', () => {
      const progress = createProgress({ stage: 'processing' });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText('Elapsed Time')).toBeInTheDocument();
      expect(screen.getByText('0s')).toBeInTheDocument();
    });

    test('should update elapsed time', () => {
      const progress = createProgress({ stage: 'processing' });
      render(<EnhancementProgress progress={progress} />);
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      expect(screen.getByText('5s')).toBeInTheDocument();
    });

    test('should format elapsed time with minutes', () => {
      const progress = createProgress({ stage: 'processing' });
      render(<EnhancementProgress progress={progress} />);
      
      act(() => {
        jest.advanceTimersByTime(65000); // 65 seconds
      });
      
      expect(screen.getByText('1m 5s')).toBeInTheDocument();
    });

    test('should not show elapsed time on terminal states', () => {
      const progress = createProgress({ stage: 'complete' });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.queryByText('Elapsed Time')).not.toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    test('should display progress bar with correct percentage', () => {
      const progress = createProgress({ stage: 'downloading', progress: 60 });
      const { container } = render(<EnhancementProgress progress={progress} />);
      
      const progressBar = container.querySelector('[style*="width: 60%"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Model Size Display', () => {
    test('should show default model size', () => {
      const progress = createProgress({ stage: 'downloading' });
      render(<EnhancementProgress progress={progress} />);
      
      expect(screen.getByText(/~1.7GB/)).toBeInTheDocument();
    });

    test('should show custom model size when provided', () => {
      const progress = createProgress({ stage: 'downloading' });
      render(<EnhancementProgress progress={progress} modelSize="~2.5GB" />);
      
      expect(screen.getByText(/~2.5GB/)).toBeInTheDocument();
    });
  });
});
