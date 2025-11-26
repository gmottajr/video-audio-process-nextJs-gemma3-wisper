/**
 * @jest-environment jsdom
 * 
 * Unit Tests for Audio Normalization Feature
 * 
 * Tests the normalization flag and FFmpeg command construction
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioConverter } from '@/hooks/useAudioConverter';

// Mock useFFmpeg
jest.mock('@/hooks/useFFmpeg', () => ({
  useFFmpeg: jest.fn(() => ({
    transcode: jest.fn().mockResolvedValue(new Blob(['normalized audio'], { type: 'audio/wav' })),
    isLoaded: true,
    load: jest.fn(),
    progress: 0,
    metrics: { speed: '1.0x', duration: '10s' },
    reset: jest.fn(),
  }))
}));

describe('Audio Normalization Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAudioConverter with normalization', () => {
    test('should include loudnorm filter when normalize is true', async () => {
      const { useFFmpeg } = require('@/hooks/useFFmpeg');
      const mockTranscode = jest.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/wav' }));
      
      useFFmpeg.mockReturnValue({
        transcode: mockTranscode,
        isLoaded: true,
        load: jest.fn(),
        progress: 0,
        metrics: {},
        reset: jest.fn(),
      });

      const { result } = renderHook(() => useAudioConverter());

      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });

      await act(async () => {
        await result.current.convertAudio(mockFile, 'wav', undefined, { normalizeAudio: true });
      });

      // Verify transcode was called
      expect(mockTranscode).toHaveBeenCalled();
      
      // Check the command includes loudnorm filter
      const command = mockTranscode.mock.calls[0][1];
      expect(command).toContain('-af');
      expect(command).toContain('loudnorm=I=-16:TP=-1.5:LRA=11:print_format=summary');
    });

    test('should not add filter when normalize is false', async () => {
      const { useFFmpeg } = require('@/hooks/useFFmpeg');
      const mockTranscode = jest.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/wav' }));
      
      useFFmpeg.mockReturnValue({
        transcode: mockTranscode,
        isLoaded: true,
        load: jest.fn(),
        progress: 0,
        metrics: {},
        reset: jest.fn(),
      });

      const { result } = renderHook(() => useAudioConverter());

      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });

      await act(async () => {
        await result.current.convertAudio(mockFile, 'wav', undefined, { normalizeAudio: false });
      });

      // Verify transcode was called
      expect(mockTranscode).toHaveBeenCalled();
      
      // Check the command does NOT include loudnorm filter
      const command = mockTranscode.mock.calls[0][1];
      expect(command).not.toContain('-af');
      expect(command).not.toContain('loudnorm');
    });

    test('should not add filter when normalize is undefined', async () => {
      const { useFFmpeg } = require('@/hooks/useFFmpeg');
      const mockTranscode = jest.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/wav' }));
      
      useFFmpeg.mockReturnValue({
        transcode: mockTranscode,
        isLoaded: true,
        load: jest.fn(),
        progress: 0,
        metrics: {},
        reset: jest.fn(),
      });

      const { result } = renderHook(() => useAudioConverter());

      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });

      await act(async () => {
        await result.current.convertAudio(mockFile, 'wav');
      });

      // Verify transcode was called
      expect(mockTranscode).toHaveBeenCalled();
      
      // Check the command does NOT include loudnorm filter
      const command = mockTranscode.mock.calls[0][1];
      expect(command).not.toContain('-af');
    });

    test('should increase timeout by 10% when normalizing', async () => {
      const { useFFmpeg } = require('@/hooks/useFFmpeg');
      const mockTranscode = jest.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/wav' }));
      
      useFFmpeg.mockReturnValue({
        transcode: mockTranscode,
        isLoaded: true,
        load: jest.fn(),
        progress: 0,
        metrics: {},
        reset: jest.fn(),
      });

      const { result } = renderHook(() => useAudioConverter());

      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const baseTimeout = 60000; // 1 minute

      await act(async () => {
        await result.current.convertAudio(mockFile, 'wav', baseTimeout, { normalizeAudio: true });
      });

      // Check that timeout was increased
      const timeout = mockTranscode.mock.calls[0][2];
      expect(timeout).toBe(baseTimeout * 1.1); // 10% increase
    });

    test('should handle normalization errors gracefully', async () => {
      const { useFFmpeg } = require('@/hooks/useFFmpeg');
      const mockTranscode = jest.fn().mockRejectedValue(new Error('Normalization failed'));
      
      useFFmpeg.mockReturnValue({
        transcode: mockTranscode,
        isLoaded: true,
        load: jest.fn(),
        progress: 0,
        metrics: {},
        reset: jest.fn(),
      });

      const { result } = renderHook(() => useAudioConverter());

      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });

      await expect(
        act(async () => {
          await result.current.convertAudio(mockFile, 'wav', undefined, { normalizeAudio: true });
        })
      ).rejects.toThrow();
    });
  });
});

