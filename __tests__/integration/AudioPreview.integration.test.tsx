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

// Advanced Mock for HTML5 Audio with event simulation
class AdvancedMockAudio {
  currentTime = 0;
  paused = true;
  src = '';
  duration = 120;
  private eventListeners: { [key: string]: EventListener[] } = {};
  
  play = jest.fn(() => {
    this.paused = false;
    // Simulate play event
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  
  pause = jest.fn(() => {
    this.paused = true;
    // Simulate pause event
    this.dispatchEvent(new Event('pause'));
  });
  
  addEventListener = jest.fn((event: string, handler: EventListener) => {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler);
  });
  
  removeEventListener = jest.fn((event: string, handler: EventListener) => {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler);
    }
  });
  
  dispatchEvent = (event: Event): boolean => {
    const handlers = this.eventListeners[event.type];
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
    return true;
  };
  
  load = jest.fn();
  
  // Simulate time progress
  simulateTimeProgress(targetTime: number, interval: number = 100) {
    const timer = setInterval(() => {
      if (this.paused || this.currentTime >= targetTime) {
        clearInterval(timer);
        return;
      }
      
      this.currentTime += interval / 1000;
      this.dispatchEvent(new Event('timeupdate'));
    }, interval);
  }
}

describe('AudioPreview Integration Tests', () => {
  const mockAudioUrl = 'blob:http://localhost/test-audio';
  const mockSelection: WaveformSelection = {
    startTime: 30,
    endTime: 90,
    startPercent: 0.25,
    endPercent: 0.75,
  };
  let mockOnPlaybackComplete: jest.Mock;
  let mockAudio: AdvancedMockAudio;

  beforeEach(() => {
    mockOnPlaybackComplete = jest.fn();
    jest.clearAllMocks();
    
    // Mock requestAnimationFrame with real timing
    let frameId = 0;
    global.requestAnimationFrame = jest.fn((cb) => {
      frameId++;
      setTimeout(() => cb(performance.now()), 16); // ~60fps
      return frameId;
    }) as any;
    
    global.cancelAnimationFrame = jest.fn();

    // Create mock audio
    mockAudio = new AdvancedMockAudio();
    
    // Mock document.createElement for audio elements
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'audio') {
        return mockAudio as any;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Full Playback Cycle', () => {
    it('should complete full play → progress → auto-stop cycle', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
          onPlaybackComplete={mockOnPlaybackComplete}
        />
      );

      const audio = container.querySelector('audio') as any;
      
      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      await waitFor(() => {
        const playButton = screen.getByTestId('play-icon').parentElement;
        expect(playButton).not.toBeDisabled();
      });

      // Start playback
      const playButton = screen.getByTestId('play-icon').parentElement!;
      act(() => {
        fireEvent.click(playButton);
      });

      await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalled();
      });

      // Simulate progress through the selection
      await act(async () => {
        mockAudio.currentTime = mockSelection.startTime;
        mockAudio.dispatchEvent(new Event('timeupdate'));
        
        // Mid-point
        mockAudio.currentTime = 60;
        mockAudio.dispatchEvent(new Event('timeupdate'));
        
        // Near end
        mockAudio.currentTime = 85;
        mockAudio.dispatchEvent(new Event('timeupdate'));
        
        // Reach end
        mockAudio.currentTime = mockSelection.endTime;
        mockAudio.dispatchEvent(new Event('timeupdate'));
      });

      // Should auto-stop and mark as listened
      await waitFor(() => {
        expect(mockAudio.pause).toHaveBeenCalled();
        expect(screen.getByText(/Preview complete!/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should update progress bar during playback', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      await waitFor(() => {
        const playButton = screen.getByTestId('play-icon').parentElement;
        expect(playButton).not.toBeDisabled();
      });

      // Start playback
      const playButton = screen.getByTestId('play-icon').parentElement!;
      act(() => {
        fireEvent.click(playButton);
      });

      // Get progress fill element
      const progressFill = container.querySelector('.bg-blue-500') as HTMLElement;
      expect(progressFill).toBeInTheDocument();

      // Simulate time progress
      await act(async () => {
        // At start (0%)
        mockAudio.currentTime = mockSelection.startTime;
        mockAudio.dispatchEvent(new Event('timeupdate'));
      });

      // Check initial progress
      expect(progressFill.style.width).toBe('0%');

      // Simulate mid-point (50%)
      await act(async () => {
        mockAudio.currentTime = 60; // Midpoint of 30-90
        mockAudio.dispatchEvent(new Event('timeupdate'));
      });

      // Progress should be around 50%
      await waitFor(() => {
        const widthValue = parseFloat(progressFill.style.width);
        expect(widthValue).toBeGreaterThan(40);
        expect(widthValue).toBeLessThan(60);
      });
    });
  });

  describe('User Interaction Flow', () => {
    it('should handle play → pause → resume flow', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      await waitFor(() => {
        const playButton = screen.getByTestId('play-icon').parentElement;
        expect(playButton).not.toBeDisabled();
      });

      // Play
      const playButton = screen.getByTestId('play-icon').parentElement!;
      act(() => {
        fireEvent.click(playButton);
      });

      await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalledTimes(1);
      });

      // Simulate some progress
      act(() => {
        mockAudio.currentTime = 45;
        mockAudio.dispatchEvent(new Event('timeupdate'));
      });

      // Pause
      const pauseButton = screen.getByTestId('pause-icon').parentElement!;
      act(() => {
        fireEvent.click(pauseButton);
      });

      expect(mockAudio.pause).toHaveBeenCalled();

      // Resume
      mockAudio.play.mockClear();
      act(() => {
        fireEvent.click(playButton);
      });

      await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle seek during playback', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      await waitFor(() => {
        const playButton = screen.getByTestId('play-icon').parentElement;
        expect(playButton).not.toBeDisabled();
      });

      // Start playback
      const playButton = screen.getByTestId('play-icon').parentElement!;
      act(() => {
        fireEvent.click(playButton);
      });

      // Simulate some progress
      act(() => {
        mockAudio.currentTime = 40;
      });

      // Seek using progress bar
      const progressBar = container.querySelector('.bg-blue-950\\/50') as HTMLElement;
      
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

      // Click at 75% (should be 75% of 60s duration = 45s into selection = 75s total)
      act(() => {
        fireEvent.click(progressBar, { clientX: 75 });
      });

      await waitFor(() => {
        expect(mockAudio.currentTime).toBe(75);
      });
    });
  });

  describe('Listener Completion Flow', () => {
    it('should transition from "not listened" to "listened" state', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
          onPlaybackComplete={mockOnPlaybackComplete}
        />
      );

      // Initially should show "not listened"
      expect(screen.getByText(/Listen to preview your selection/i)).toBeInTheDocument();
      expect(screen.queryByText(/Preview complete!/i)).not.toBeInTheDocument();

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      // Start playback
      const playButton = screen.getByTestId('play-icon').parentElement!;
      act(() => {
        fireEvent.click(playButton);
      });

      // Complete playback
      await act(async () => {
        mockAudio.currentTime = mockSelection.endTime;
        mockAudio.dispatchEvent(new Event('timeupdate'));
      });

      // Should show "listened" state
      await waitFor(() => {
        expect(screen.queryByText(/Listen to preview your selection/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Preview complete!/i)).toBeInTheDocument();
        expect(mockOnPlaybackComplete).toHaveBeenCalled();
      });
    });

    it('should call callback after complete playback', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
          onPlaybackComplete={mockOnPlaybackComplete}
        />
      );

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      // Start playback
      const playButton = screen.getByTestId('play-icon').parentElement!;
      act(() => {
        fireEvent.click(playButton);
      });

      expect(mockOnPlaybackComplete).not.toHaveBeenCalled();

      // Complete playback
      await act(async () => {
        mockAudio.currentTime = mockSelection.endTime;
        mockAudio.dispatchEvent(new Event('timeupdate'));
      });

      await waitFor(() => {
        expect(mockOnPlaybackComplete).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Multiple Replay Cycles', () => {
    it('should handle multiple replay cycles correctly', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
          onPlaybackComplete={mockOnPlaybackComplete}
        />
      );

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      await waitFor(() => {
        const playButton = screen.getByTestId('play-icon').parentElement;
        expect(playButton).not.toBeDisabled();
      });

      const replayButton = screen.getByTestId('replay-icon').parentElement!;

      // First cycle
      act(() => {
        fireEvent.click(replayButton);
      });

      await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalledTimes(1);
        expect(mockAudio.currentTime).toBe(mockSelection.startTime);
      });

      // Complete first cycle
      await act(async () => {
        mockAudio.currentTime = mockSelection.endTime;
        mockAudio.dispatchEvent(new Event('timeupdate'));
      });

      await waitFor(() => {
        expect(mockAudio.pause).toHaveBeenCalled();
      });

      // Second cycle
      mockAudio.play.mockClear();
      mockAudio.pause.mockClear();

      act(() => {
        fireEvent.click(replayButton);
      });

      await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalledTimes(1);
        expect(mockAudio.currentTime).toBe(mockSelection.startTime);
      });

      // Complete second cycle
      await act(async () => {
        mockAudio.currentTime = mockSelection.endTime;
        mockAudio.dispatchEvent(new Event('timeupdate'));
      });

      await waitFor(() => {
        expect(mockAudio.pause).toHaveBeenCalled();
      });

      // Callback should have been called twice
      expect(mockOnPlaybackComplete).toHaveBeenCalledTimes(2);
    });

    it('should maintain correct state across replays', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      const replayButton = screen.getByTestId('replay-icon').parentElement!;

      // Play through first time
      act(() => {
        fireEvent.click(replayButton);
      });

      await act(async () => {
        mockAudio.currentTime = mockSelection.endTime;
        mockAudio.dispatchEvent(new Event('timeupdate'));
      });

      // Should show completed state
      await waitFor(() => {
        expect(screen.getByText(/Preview complete!/i)).toBeInTheDocument();
      });

      // Replay again
      act(() => {
        fireEvent.click(replayButton);
      });

      // Should still show completed state (hasListened stays true)
      expect(screen.getByText(/Preview complete!/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard Integration', () => {
    it('should handle complete keyboard-only workflow', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
          onPlaybackComplete={mockOnPlaybackComplete}
        />
      );

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      await waitFor(() => {
        const playButton = screen.getByTestId('play-icon').parentElement;
        expect(playButton).not.toBeDisabled();
      });

      // Start with Space
      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalled();
      });

      // Seek forward with arrow key
      act(() => {
        mockAudio.currentTime = 40;
      });

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(mockAudio.currentTime).toBe(45);
      });

      // Pause with Space
      mockAudio.play.mockClear();
      fireEvent.keyDown(window, { key: ' ' });

      expect(mockAudio.pause).toHaveBeenCalled();

      // Replay with R
      fireEvent.keyDown(window, { key: 'r' });

      await waitFor(() => {
        expect(mockAudio.currentTime).toBe(mockSelection.startTime);
        expect(mockAudio.play).toHaveBeenCalled();
      });

      // Stop with Escape
      mockAudio.pause.mockClear();
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.currentTime).toBe(mockSelection.startTime);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short selections', async () => {
      const shortSelection: WaveformSelection = {
        startTime: 10,
        endTime: 11, // Only 1 second
        startPercent: 0.1,
        endPercent: 0.11,
      };

      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={shortSelection}
          onPlaybackComplete={mockOnPlaybackComplete}
        />
      );

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      // Play
      const playButton = screen.getByTestId('play-icon').parentElement!;
      act(() => {
        fireEvent.click(playButton);
      });

      // Immediately reach end
      await act(async () => {
        mockAudio.currentTime = shortSelection.endTime;
        mockAudio.dispatchEvent(new Event('timeupdate'));
      });

      await waitFor(() => {
        expect(mockAudio.pause).toHaveBeenCalled();
        expect(mockOnPlaybackComplete).toHaveBeenCalled();
      });
    });

    it('should handle selection at file boundaries', async () => {
      const boundarySelection: WaveformSelection = {
        startTime: 0,
        endTime: 120, // Full file
        startPercent: 0,
        endPercent: 1,
      };

      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={boundarySelection}
        />
      );

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      // Should work normally
      const playButton = screen.getByTestId('play-icon').parentElement!;
      act(() => {
        fireEvent.click(playButton);
      });

      await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalled();
        expect(mockAudio.currentTime).toBe(0);
      });
    });

    it('should handle rapid play/pause toggling', async () => {
      const { container } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      // Rapidly toggle multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.keyDown(window, { key: ' ' });
        await waitFor(() => {
          // Just ensure it doesn't crash
          expect(true).toBe(true);
        });
      }

      // Should still be functional
      expect(mockAudio.play).toHaveBeenCalled();
      expect(mockAudio.pause).toHaveBeenCalled();
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should clean up event listeners on unmount', () => {
      const { unmount } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      // Mark as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      unmount();

      // Should remove keyboard event listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should cancel animation frames on unmount', () => {
      const { unmount } = render(
        <AudioPreview
          audioUrl={mockAudioUrl}
          selection={mockSelection}
        />
      );

      // Mark audio as ready
      act(() => {
        mockAudio.dispatchEvent(new Event('canplay'));
      });

      // Start playing
      const playButton = screen.getByTestId('play-icon').parentElement!;
      act(() => {
        fireEvent.click(playButton);
      });

      const cancelAnimationFrameSpy = global.cancelAnimationFrame;

      unmount();

      // Should have canceled animation frame
      expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    });
  });
});

