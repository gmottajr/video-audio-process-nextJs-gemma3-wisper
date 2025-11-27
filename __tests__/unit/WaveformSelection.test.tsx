import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WaveformViewer, WaveformSelection } from '@/components/WaveformViewer';

// Mock WaveSurfer
jest.mock('wavesurfer.js', () => {
  const mockWaveSurfer = {
    create: jest.fn(() => ({
      on: jest.fn(),
      load: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      destroy: jest.fn(),
      getDuration: jest.fn(() => 120), // 2 minutes
      zoom: jest.fn(),
    })),
  };
  return mockWaveSurfer;
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Loader2: () => <div data-testid="loader-icon">Loader</div>,
}));

describe('WaveformViewer Selection', () => {
  const mockAudioUrl = 'blob:http://localhost/test-audio';
  let mockOnSelectionChange: jest.Mock;

  beforeEach(() => {
    mockOnSelectionChange = jest.fn();
    jest.clearAllMocks();
  });

  describe('Selection Mode', () => {
    it('should not show crosshair cursor when selectable is false', () => {
      const { container } = render(
        <WaveformViewer audioUrl={mockAudioUrl} selectable={false} />
      );

      // Wait for waveform container to be ready
      const waveformContainer = container.querySelector('[style*="cursor"]');
      expect(waveformContainer).toBeInTheDocument();
    });

    it('should enable crosshair cursor when selectable is true', async () => {
      const { container } = render(
        <WaveformViewer 
          audioUrl={mockAudioUrl} 
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Trigger ready event
      await waitFor(() => {
        const waveformContainer = container.querySelector('[style*="crosshair"]');
        expect(waveformContainer).toBeInTheDocument();
      });
    });
  });

  describe('Mouse Interaction', () => {
    it('should create selection on mouse drag', async () => {
      const { container } = render(
        <WaveformViewer 
          audioUrl={mockAudioUrl} 
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        const waveformDiv = container.querySelector('[style*="cursor"]');
        expect(waveformDiv).toBeInTheDocument();
      });

      const waveformDiv = container.querySelector('[style*="cursor"]') as HTMLElement;
      
      // Mock getBoundingClientRect
      jest.spyOn(waveformDiv, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 1000,
        height: 128,
        right: 1000,
        bottom: 128,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      // Mock offsetWidth
      Object.defineProperty(waveformDiv, 'offsetWidth', {
        configurable: true,
        value: 1000,
      });

      // Simulate drag from 25% to 75%
      fireEvent.mouseDown(waveformDiv, { clientX: 250 });
      fireEvent.mouseMove(waveformDiv, { clientX: 750 });
      fireEvent.mouseUp(waveformDiv);

      // Check if callback was called
      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalled();
      });
    });

    it('should swap start and end when dragging right to left', async () => {
      const { container } = render(
        <WaveformViewer 
          audioUrl={mockAudioUrl} 
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        const waveformDiv = container.querySelector('[style*="cursor"]');
        expect(waveformDiv).toBeInTheDocument();
      });

      const waveformDiv = container.querySelector('[style*="cursor"]') as HTMLElement;
      
      jest.spyOn(waveformDiv, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 1000,
        height: 128,
        right: 1000,
        bottom: 128,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      Object.defineProperty(waveformDiv, 'offsetWidth', {
        configurable: true,
        value: 1000,
      });

      // Drag from right to left (75% to 25%)
      fireEvent.mouseDown(waveformDiv, { clientX: 750 });
      fireEvent.mouseMove(waveformDiv, { clientX: 250 });
      fireEvent.mouseUp(waveformDiv);

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalled();
        const selection: WaveformSelection = mockOnSelectionChange.mock.calls[0][0];
        expect(selection.startPercent).toBeLessThan(selection.endPercent);
      });
    });

    it('should clear selection when clicking outside', async () => {
      const { container } = render(
        <WaveformViewer 
          audioUrl={mockAudioUrl} 
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        const waveformDiv = container.querySelector('[style*="cursor"]');
        expect(waveformDiv).toBeInTheDocument();
      });

      const waveformDiv = container.querySelector('[style*="cursor"]') as HTMLElement;
      
      jest.spyOn(waveformDiv, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 1000,
        height: 128,
        right: 1000,
        bottom: 128,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      Object.defineProperty(waveformDiv, 'offsetWidth', {
        configurable: true,
        value: 1000,
      });

      // First, create a selection
      fireEvent.mouseDown(waveformDiv, { clientX: 250 });
      fireEvent.mouseMove(waveformDiv, { clientX: 750 });
      fireEvent.mouseUp(waveformDiv);

      // Clear mock to check next call
      mockOnSelectionChange.mockClear();

      // Click to clear selection
      fireEvent.click(waveformDiv);

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('Time Calculation', () => {
    it('should calculate correct time values from percentages', async () => {
      const { container } = render(
        <WaveformViewer 
          audioUrl={mockAudioUrl} 
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        const waveformDiv = container.querySelector('[style*="cursor"]');
        expect(waveformDiv).toBeInTheDocument();
      });

      const waveformDiv = container.querySelector('[style*="cursor"]') as HTMLElement;
      
      jest.spyOn(waveformDiv, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 1000,
        height: 128,
        right: 1000,
        bottom: 128,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      Object.defineProperty(waveformDiv, 'offsetWidth', {
        configurable: true,
        value: 1000,
      });

      // Drag from 25% to 75% (assuming 120s duration)
      // 25% of 120s = 30s, 75% of 120s = 90s
      fireEvent.mouseDown(waveformDiv, { clientX: 250 });
      fireEvent.mouseMove(waveformDiv, { clientX: 750 });
      fireEvent.mouseUp(waveformDiv);

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalled();
        const selection: WaveformSelection = mockOnSelectionChange.mock.calls[0][0];
        
        // Check percentages
        expect(selection.startPercent).toBeCloseTo(0.25, 2);
        expect(selection.endPercent).toBeCloseTo(0.75, 2);
        
        // Check times (120s * 0.25 = 30s, 120s * 0.75 = 90s)
        expect(selection.startTime).toBeCloseTo(30, 0);
        expect(selection.endTime).toBeCloseTo(90, 0);
      });
    });
  });

  describe('Boundary Cases', () => {
    it('should handle selection at 0% boundary', async () => {
      const { container } = render(
        <WaveformViewer 
          audioUrl={mockAudioUrl} 
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        const waveformDiv = container.querySelector('[style*="cursor"]');
        expect(waveformDiv).toBeInTheDocument();
      });

      const waveformDiv = container.querySelector('[style*="cursor"]') as HTMLElement;
      
      jest.spyOn(waveformDiv, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 1000,
        height: 128,
        right: 1000,
        bottom: 128,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      Object.defineProperty(waveformDiv, 'offsetWidth', {
        configurable: true,
        value: 1000,
      });

      // Select from 0% to 50%
      fireEvent.mouseDown(waveformDiv, { clientX: 0 });
      fireEvent.mouseMove(waveformDiv, { clientX: 500 });
      fireEvent.mouseUp(waveformDiv);

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalled();
        const selection: WaveformSelection = mockOnSelectionChange.mock.calls[0][0];
        expect(selection.startPercent).toBe(0);
        expect(selection.startTime).toBe(0);
      });
    });

    it('should handle selection at 100% boundary', async () => {
      const { container } = render(
        <WaveformViewer 
          audioUrl={mockAudioUrl} 
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        const waveformDiv = container.querySelector('[style*="cursor"]');
        expect(waveformDiv).toBeInTheDocument();
      });

      const waveformDiv = container.querySelector('[style*="cursor"]') as HTMLElement;
      
      jest.spyOn(waveformDiv, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 1000,
        height: 128,
        right: 1000,
        bottom: 128,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      Object.defineProperty(waveformDiv, 'offsetWidth', {
        configurable: true,
        value: 1000,
      });

      // Select from 50% to 100%
      fireEvent.mouseDown(waveformDiv, { clientX: 500 });
      fireEvent.mouseMove(waveformDiv, { clientX: 1000 });
      fireEvent.mouseUp(waveformDiv);

      await waitFor(() => {
        expect(mockOnSelectionChange).toHaveBeenCalled();
        const selection: WaveformSelection = mockOnSelectionChange.mock.calls[0][0];
        expect(selection.endPercent).toBe(1);
        expect(selection.endTime).toBe(120);
      });
    });
  });

  describe('Selection Overlay Rendering', () => {
    it('should render canvas for selection overlay', () => {
      const { container } = render(
        <WaveformViewer 
          audioUrl={mockAudioUrl} 
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveClass('pointer-events-none');
    });

    it('should display selection info text when selection exists', async () => {
      const { container } = render(
        <WaveformViewer 
          audioUrl={mockAudioUrl} 
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        const waveformDiv = container.querySelector('[style*="cursor"]');
        expect(waveformDiv).toBeInTheDocument();
      });

      const waveformDiv = container.querySelector('[style*="cursor"]') as HTMLElement;
      
      jest.spyOn(waveformDiv, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 1000,
        height: 128,
        right: 1000,
        bottom: 128,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      Object.defineProperty(waveformDiv, 'offsetWidth', {
        configurable: true,
        value: 1000,
      });

      // Create selection
      fireEvent.mouseDown(waveformDiv, { clientX: 250 });
      fireEvent.mouseMove(waveformDiv, { clientX: 750 });
      fireEvent.mouseUp(waveformDiv);

      // Check for selection info text
      await waitFor(() => {
        const selectionInfo = container.querySelector('.text-blue-400');
        expect(selectionInfo).toBeInTheDocument();
        expect(selectionInfo?.textContent).toContain('Selected:');
        expect(selectionInfo?.textContent).toContain('Duration:');
      });
    });
  });

  describe('Audio URL Changes', () => {
    it('should clear selection when audio URL changes', async () => {
      const { rerender, container } = render(
        <WaveformViewer 
          audioUrl={mockAudioUrl} 
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      await waitFor(() => {
        const waveformDiv = container.querySelector('[style*="cursor"]');
        expect(waveformDiv).toBeInTheDocument();
      });

      const waveformDiv = container.querySelector('[style*="cursor"]') as HTMLElement;
      
      jest.spyOn(waveformDiv, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 1000,
        height: 128,
        right: 1000,
        bottom: 128,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      Object.defineProperty(waveformDiv, 'offsetWidth', {
        configurable: true,
        value: 1000,
      });

      // Create selection
      fireEvent.mouseDown(waveformDiv, { clientX: 250 });
      fireEvent.mouseMove(waveformDiv, { clientX: 750 });
      fireEvent.mouseUp(waveformDiv);

      // Verify selection exists
      await waitFor(() => {
        const selectionInfo = container.querySelector('.text-blue-400');
        expect(selectionInfo).toBeInTheDocument();
      });

      // Change audio URL
      rerender(
        <WaveformViewer 
          audioUrl="blob:http://localhost/new-audio" 
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      // Selection info should disappear
      await waitFor(() => {
        const selectionInfo = container.querySelector('.text-blue-400');
        expect(selectionInfo).not.toBeInTheDocument();
      });
    });
  });
});

