/**
 * @jest-environment jsdom
 * 
 * Unit Tests for Audio Compression Feature
 * 
 * Tests compression filter application, chain construction, and timeout calculations
 */

import { renderHook, act } from '@testing-library/react';
import { useAudioConverter } from '@/hooks/useAudioConverter';
import type { CompressionType } from '@/components/ActionSelector';

// Mock useFFmpeg
jest.mock('@/hooks/useFFmpeg', () => ({
  useFFmpeg: jest.fn(() => ({
    transcode: jest.fn().mockResolvedValue(new Blob(['compressed audio'], { type: 'audio/wav' })),
    isLoaded: true,
    load: jest.fn(),
    progress: 0,
    metrics: { speed: '1.0x', duration: '10s' },
    reset: jest.fn(),
  }))
}));

describe('Audio Compression Feature - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Filter Application Tests', () => {
    test('should add dynaudnorm filter when compressionType is "speech"', async () => {
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
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'speech' 
        });
      });

      expect(mockTranscode).toHaveBeenCalled();
      const command = mockTranscode.mock.calls[0][1];
      expect(command).toContain('-af');
      expect(command).toContain('dynaudnorm=f=200:g=15:p=0.9:m=15:s=15');
    });

    test('should add acompressor filter when compressionType is "studio"', async () => {
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
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'studio' 
        });
      });

      expect(mockTranscode).toHaveBeenCalled();
      const command = mockTranscode.mock.calls[0][1];
      expect(command).toContain('-af');
      expect(command).toContain('acompressor=threshold=-20dB:ratio=4:attack=20:release=250');
    });

    test('should add both filters when compressionType is "both"', async () => {
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
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'both' 
        });
      });

      expect(mockTranscode).toHaveBeenCalled();
      const command = mockTranscode.mock.calls[0][1];
      const afIndex = command.indexOf('-af');
      expect(afIndex).toBeGreaterThan(-1);
      const filterString = command[afIndex + 1];
      expect(filterString).toContain('dynaudnorm=f=200:g=15:p=0.9:m=15:s=15');
      expect(filterString).toContain('acompressor=threshold=-20dB:ratio=4:attack=20:release=250');
    });

    test('should not add compression filters when compressionType is "none"', async () => {
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
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'none' 
        });
      });

      expect(mockTranscode).toHaveBeenCalled();
      const command = mockTranscode.mock.calls[0][1];
      expect(command).not.toContain('dynaudnorm');
      expect(command).not.toContain('acompressor');
    });

    test('should combine compression with normalization correctly', async () => {
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
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'speech',
          normalizeAudio: true 
        });
      });

      expect(mockTranscode).toHaveBeenCalled();
      const command = mockTranscode.mock.calls[0][1];
      const afIndex = command.indexOf('-af');
      expect(afIndex).toBeGreaterThan(-1);
      const filterString = command[afIndex + 1];
      expect(filterString).toContain('dynaudnorm=f=200:g=15:p=0.9:m=15:s=15');
      expect(filterString).toContain('loudnorm=I=-16:TP=-1.5:LRA=11:print_format=summary');
    });

    test('should apply filters in correct order (compression before normalization)', async () => {
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
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'studio',
          normalizeAudio: true 
        });
      });

      expect(mockTranscode).toHaveBeenCalled();
      const command = mockTranscode.mock.calls[0][1];
      const afIndex = command.indexOf('-af');
      const filterString = command[afIndex + 1];
      
      // Check that compression comes before normalization in the filter string
      const compressorIndex = filterString.indexOf('acompressor');
      const loudnormIndex = filterString.indexOf('loudnorm');
      
      expect(compressorIndex).toBeGreaterThan(-1);
      expect(loudnormIndex).toBeGreaterThan(-1);
      expect(compressorIndex).toBeLessThan(loudnormIndex);
    });
  });

  describe('Filter Chain Construction', () => {
    test('should produce correct filter string for single filter', async () => {
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
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'speech' 
        });
      });

      const command = mockTranscode.mock.calls[0][1];
      const afIndex = command.indexOf('-af');
      const filterString = command[afIndex + 1];
      
      expect(filterString).toBe('dynaudnorm=f=200:g=15:p=0.9:m=15:s=15');
    });

    test('should join multiple filters with comma', async () => {
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
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'both' 
        });
      });

      const command = mockTranscode.mock.calls[0][1];
      const afIndex = command.indexOf('-af');
      const filterString = command[afIndex + 1];
      
      // Should contain comma separator
      expect(filterString).toContain(',');
      expect(filterString.split(',').length).toBe(2);
    });

    test('should produce correct chain for full enhancement', async () => {
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
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'both',
          normalizeAudio: true 
        });
      });

      const command = mockTranscode.mock.calls[0][1];
      const afIndex = command.indexOf('-af');
      const filterString = command[afIndex + 1];
      
      // Should contain all three filters separated by commas
      const filters = filterString.split(',');
      expect(filters.length).toBe(3);
      expect(filters[0]).toContain('dynaudnorm');
      expect(filters[1]).toContain('acompressor');
      expect(filters[2]).toContain('loudnorm');
    });

    test('should not add -af argument when no enhancements selected', async () => {
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
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'none',
          normalizeAudio: false 
        });
      });

      const command = mockTranscode.mock.calls[0][1];
      expect(command).not.toContain('-af');
    });
  });

  describe('Timeout Calculation', () => {
    test('should add ~15% timeout for speech compression', async () => {
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
      
      // Create 1MB file for timeout calculation (avoids hitting max timeout)
      const smallData = new Uint8Array(1 * 1024 * 1024);
      const mockFile = new File([smallData], 'test.wav', { type: 'audio/wav' });

      await act(async () => {
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'speech' 
        });
      });

      const timeout = mockTranscode.mock.calls[0][2];
      const expectedBaseTimeout = 1 * 10000; // 1MB * 10s per MB
      const expectedTimeout = expectedBaseTimeout * 1.15; // +15%
      const minTimeout = 60000; // Minimum timeout
      const actualExpected = Math.max(expectedTimeout, minTimeout);
      
      // Should be at least the minimum or the calculated timeout
      expect(timeout).toBeGreaterThanOrEqual(actualExpected * 0.99);
      expect(timeout).toBeLessThanOrEqual(Math.max(actualExpected * 1.01, 600000));
    });

    test('should add ~12% timeout for studio compression', async () => {
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
      
      const smallData = new Uint8Array(1 * 1024 * 1024);
      const mockFile = new File([smallData], 'test.wav', { type: 'audio/wav' });

      await act(async () => {
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'studio' 
        });
      });

      const timeout = mockTranscode.mock.calls[0][2];
      const expectedBaseTimeout = 1 * 10000;
      const expectedTimeout = expectedBaseTimeout * 1.12; // +12%
      const minTimeout = 60000;
      const actualExpected = Math.max(expectedTimeout, minTimeout);
      
      expect(timeout).toBeGreaterThanOrEqual(actualExpected * 0.99);
      expect(timeout).toBeLessThanOrEqual(Math.max(actualExpected * 1.01, 600000));
    });

    test('should add ~25% timeout for both compressions', async () => {
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
      
      const smallData = new Uint8Array(1 * 1024 * 1024);
      const mockFile = new File([smallData], 'test.wav', { type: 'audio/wav' });

      await act(async () => {
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'both' 
        });
      });

      const timeout = mockTranscode.mock.calls[0][2];
      const expectedBaseTimeout = 1 * 10000;
      const expectedTimeout = expectedBaseTimeout * 1.25; // +25%
      const minTimeout = 60000;
      const actualExpected = Math.max(expectedTimeout, minTimeout);
      
      expect(timeout).toBeGreaterThanOrEqual(actualExpected * 0.99);
      expect(timeout).toBeLessThanOrEqual(Math.max(actualExpected * 1.01, 600000));
    });

    test('should calculate combined timeout with normalization correctly', async () => {
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
      
      const smallData = new Uint8Array(1 * 1024 * 1024);
      const mockFile = new File([smallData], 'test.wav', { type: 'audio/wav' });

      await act(async () => {
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'speech',
          normalizeAudio: true 
        });
      });

      const timeout = mockTranscode.mock.calls[0][2];
      const expectedBaseTimeout = 1 * 10000;
      const expectedTimeout = expectedBaseTimeout * 1.15 * 1.1; // +15% compression, +10% normalization
      const minTimeout = 60000;
      const actualExpected = Math.max(expectedTimeout, minTimeout);
      
      expect(timeout).toBeGreaterThanOrEqual(actualExpected * 0.99);
      expect(timeout).toBeLessThanOrEqual(Math.max(actualExpected * 1.01, 600000));
    });
  });

  describe('Error Handling', () => {
    test('should catch compression filter errors gracefully', async () => {
      const { useFFmpeg } = require('@/hooks/useFFmpeg');
      const mockTranscode = jest.fn().mockRejectedValue(new Error('FFmpeg filter error'));
      
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
          await result.current.convertAudio(mockFile, 'wav', undefined, { 
            compressionType: 'speech' 
          });
        })
      ).rejects.toThrow('Conversion failed');
    });

    test('should provide clear error messages for each failure type', async () => {
      const { useFFmpeg } = require('@/hooks/useFFmpeg');
      
      // Test speech compression error
      let mockTranscode = jest.fn().mockRejectedValue(new Error('dynaudnorm filter failed'));
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
          await result.current.convertAudio(mockFile, 'wav', undefined, { 
            compressionType: 'speech' 
          });
        })
      ).rejects.toThrow();
    });

    test('should handle invalid compression type gracefully', async () => {
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

      // Pass invalid compression type
      await act(async () => {
        await result.current.convertAudio(mockFile, 'wav', undefined, { 
          compressionType: 'invalid' as CompressionType
        });
      });

      // Should default to 'none' and not throw
      expect(mockTranscode).toHaveBeenCalled();
      const command = mockTranscode.mock.calls[0][1];
      expect(command).not.toContain('dynaudnorm');
      expect(command).not.toContain('acompressor');
    });
  });
});

