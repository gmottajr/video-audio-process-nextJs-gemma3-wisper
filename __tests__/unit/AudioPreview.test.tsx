import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AudioPreview } from '@/components/AudioPreview';
import { WaveformSelection } from '@/components/WaveformViewer';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  RotateCcw: () => <div data-testid="replay-icon">Replay</div>,
}));

// Mock HTML5 Audio
class MockAudio {
  currentTime = 0;
  paused = true;
  src = '';
  
  play = jest.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  
  pause = jest.fn(() => {
    this.paused = true;
  });
  
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  load = jest.fn();
}

describe('AudioPreview Component', () => {
  const mockAudioUrl = 'blob:http://localhost/test-audio';
  const mockSelection: WaveformSelection = {
    startTime: 30,
    endTime: 90,
    startPercent: 0.25,
    endPercent: 0.75,
  };
  let mockOnPlaybackComplete: jest.Mock;

  beforeEach(() => {
    mockOnPlaybackComplete = jest.fn();
    jest.clearAllMocks();
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((cb) => {
      cb(0);
      return 0;
    }) as any;
    
    global.cancelAnimationFrame = jest.fn();
  });

  describe('Rendering', () => {
    it('should render with correct props', () => {
      render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
          onPlaybackComplete={mockOnPlaybackComplete}
        />
      );

      expect(screen.getByText(/Audio Preview/i)).toBeInTheDocument();
      expect(screen.getByText(/Selected:/i)).toBeInTheDocument();
      expect(screen.getByText(/00:30 - 01:30/i)).toBeInTheDocument();
      expect(screen.getByText(/\(60s\)/i)).toBeInTheDocument();
    });

    it('should display keyboard shortcuts help', () => {
      render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      expect(screen.getByText(/Keyboard shortcuts:/i)).toBeInTheDocument();
      expect(screen.getByText(/Space \(play\/pause\)/i)).toBeInTheDocument();
    });

    it('should show "not listened" tip initially', () => {
      render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      expect(screen.getByText(/Listen to preview your selection/i)).toBeInTheDocument();
      expect(screen.queryByText(/Preview complete!/i)).not.toBeInTheDocument();
    });
  });

  describe('Playback Controls', () => {
    it('should have play, pause, and replay buttons', () => {
      render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
      expect(screen.getByTestId('replay-icon')).toBeInTheDocument();
    });

    it('should start playback when play button is clicked', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      const playButton = screen.getByTestId('play-icon').parentElement;

      // Trigger canplay event to mark as ready
      act(() => {
        fireEvent.canPlay(audio!);
      });

      await waitFor(() => {
        expect(playButton).not.toBeDisabled();
      });

      // Mock play method
      const playMock = jest.fn(() => Promise.resolve());
      audio!.play = playMock;

      fireEvent.click(playButton!);

      await waitFor(() => {
        expect(playMock).toHaveBeenCalled();
      });
    });

    it('should pause playback when pause button is clicked', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      const pauseButton = screen.getByTestId('pause-icon').parentElement;

      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Mock pause method
      const pauseMock = jest.fn();
      audio!.pause = pauseMock;

      fireEvent.click(pauseButton!);

      expect(pauseMock).toHaveBeenCalled();
    });

    it('should replay from start when replay button is clicked', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      const replayButton = screen.getByTestId('replay-icon').parentElement;

      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      await waitFor(() => {
        expect(replayButton).not.toBeDisabled();
      });

      // Mock play method
      const playMock = jest.fn(() => Promise.resolve());
      audio!.play = playMock;

      fireEvent.click(replayButton!);

      await waitFor(() => {
        expect(audio!.currentTime).toBe(mockSelection.startTime);
        expect(playMock).toHaveBeenCalled();
      });
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar', () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const progressBar = container.querySelector('.bg-blue-950\\/50');
      expect(progressBar).toBeInTheDocument();
    });

    it('should update progress during playback', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;

      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Simulate time update
      act(() => {
        audio!.currentTime = 45; // Midpoint
      });

      // Check if progress bar updates (this would be visible in the DOM)
      const progressFill = container.querySelector('.bg-blue-500');
      expect(progressFill).toBeInTheDocument();
    });

    it('should seek when clicking on progress bar', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      const progressBar = container.querySelector('.bg-blue-950\\/50') as HTMLElement;

      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Mock getBoundingClientRect
      jest.spyOn(progressBar, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 100,
        height: 12,
        right: 100,
        bottom: 12,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      // Click at 50% of progress bar
      fireEvent.click(progressBar, { clientX: 50 });

      // Should seek to middle of selection (60s)
      await waitFor(() => {
        expect(audio!.currentTime).toBe(60);
      });
    });
  });

  describe('Playback Completion', () => {
    it('should stop playback at selection endTime', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
          onPlaybackComplete={mockOnPlaybackComplete}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Mock play and pause
      const pauseMock = jest.fn();
      audio!.pause = pauseMock;
      audio!.play = jest.fn(() => Promise.resolve());

      // Start playing
      const playButton = screen.getByTestId('play-icon').parentElement;
      fireEvent.click(playButton!);

      // Simulate reaching endTime
      act(() => {
        audio!.currentTime = mockSelection.endTime;
      });

      await waitFor(() => {
        expect(pauseMock).toHaveBeenCalled();
      });
    });

    it('should set hasListened flag after playback completes', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
          onPlaybackComplete={mockOnPlaybackComplete}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Start playing and reach end
      audio!.currentTime = mockSelection.endTime;

      await waitFor(() => {
        expect(screen.getByText(/Preview complete!/i)).toBeInTheDocument();
      });
    });

    it('should call onPlaybackComplete callback', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
          onPlaybackComplete={mockOnPlaybackComplete}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Mock methods
      audio!.pause = jest.fn();
      audio!.play = jest.fn(() => Promise.resolve());

      // Start playing
      const playButton = screen.getByTestId('play-icon').parentElement;
      fireEvent.click(playButton!);

      // Simulate reaching endTime
      act(() => {
        audio!.currentTime = mockSelection.endTime + 0.1; // Just past end
      });

      await waitFor(() => {
        expect(mockOnPlaybackComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should toggle play/pause on Space key', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Mock play method
      const playMock = jest.fn(() => Promise.resolve());
      audio!.play = playMock;

      // Press Space
      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(playMock).toHaveBeenCalled();
      });
    });

    it('should replay on R key', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Mock play method
      const playMock = jest.fn(() => Promise.resolve());
      audio!.play = playMock;

      // Press R
      fireEvent.keyDown(window, { key: 'r' });

      await waitFor(() => {
        expect(audio!.currentTime).toBe(mockSelection.startTime);
        expect(playMock).toHaveBeenCalled();
      });
    });

    it('should seek backward on Left Arrow key', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Set initial time
      audio!.currentTime = 50;

      // Press Left Arrow
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(audio!.currentTime).toBe(45); // 50 - 5 = 45
      });
    });

    it('should seek forward on Right Arrow key', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Set initial time
      audio!.currentTime = 50;

      // Press Right Arrow
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(audio!.currentTime).toBe(55); // 50 + 5 = 55
      });
    });

    it('should stop playback on Escape key', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Mock pause method
      const pauseMock = jest.fn();
      audio!.pause = pauseMock;

      // Set current time
      audio!.currentTime = 50;

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(pauseMock).toHaveBeenCalled();
        expect(audio!.currentTime).toBe(mockSelection.startTime);
      });
    });

    it('should not respond to keyboard when not ready', () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Don't trigger canplay event, so isReady stays false
      
      // Mock play method
      const playMock = jest.fn(() => Promise.resolve());
      audio!.play = playMock;

      // Press Space
      fireEvent.keyDown(window, { key: ' ' });

      // Should not play
      expect(playMock).not.toHaveBeenCalled();
    });
  });

  describe('Selection Changes', () => {
    it('should reset when selection changes', () => {
      const { rerender, container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Set some state
      audio!.currentTime = 50;

      // Change selection
      const newSelection: WaveformSelection = {
        startTime: 60,
        endTime: 120,
        startPercent: 0.5,
        endPercent: 1.0,
      };

      rerender(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={newSelection}
        />
      );

      // Should reset to new start time
      expect(audio!.currentTime).toBe(newSelection.startTime);
    });

    it('should reset hasListened when selection changes', async () => {
      const { rerender, container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
          onPlaybackComplete={mockOnPlaybackComplete}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Simulate playback completion
      audio!.currentTime = mockSelection.endTime;

      await waitFor(() => {
        expect(screen.getByText(/Preview complete!/i)).toBeInTheDocument();
      });

      // Change selection
      const newSelection: WaveformSelection = {
        startTime: 60,
        endTime: 120,
        startPercent: 0.5,
        endPercent: 1.0,
      };

      rerender(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={newSelection}
        />
      );

      // Should show "not listened" tip again
      await waitFor(() => {
        expect(screen.getByText(/Listen to preview your selection/i)).toBeInTheDocument();
        expect(screen.queryByText(/Preview complete!/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Time Formatting', () => {
    it('should format time correctly', () => {
      render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      // Check formatted times in UI
      expect(screen.getByText(/00:30 - 01:30/i)).toBeInTheDocument();
    });

    it('should handle edge cases in time formatting', () => {
      const edgeSelection: WaveformSelection = {
        startTime: 0,
        endTime: 3599, // 59:59
        startPercent: 0,
        endPercent: 1,
      };

      render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={edgeSelection}
        />
      );

      expect(screen.getByText(/00:00 - 59:59/i)).toBeInTheDocument();
    });
  });

  describe('Audio Element', () => {
    it('should render audio element with correct src', () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio');
      expect(audio).toBeInTheDocument();
      expect(audio).toHaveAttribute('src', mockAudioUrl);
      expect(audio).toHaveAttribute('preload', 'auto');
    });
  });

  describe('Boundary Conditions', () => {
    it('should not seek before selection start time', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Set time near start
      audio!.currentTime = mockSelection.startTime + 3;

      // Try to seek back 5 seconds (would go before start)
      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        // Should clamp to start time
        expect(audio!.currentTime).toBeGreaterThanOrEqual(mockSelection.startTime);
      });
    });

    it('should not seek past selection end time', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      
      // Trigger canplay event
      act(() => {
        fireEvent.canPlay(audio!);
      });

      // Set time near end
      audio!.currentTime = mockSelection.endTime - 3;

      // Try to seek forward 5 seconds (would go past end)
      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        // Should clamp to end time
        expect(audio!.currentTime).toBeLessThanOrEqual(mockSelection.endTime);
      });
    });
  });
});

