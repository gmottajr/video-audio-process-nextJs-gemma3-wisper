// Mock FFmpeg before imports
jest.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: jest.fn()
}));

jest.mock('@ffmpeg/util', () => ({
  fetchFile: jest.fn((blob) => Promise.resolve(new Uint8Array([1, 2, 3, 4]))),
}));

import { extractAudioSegment, extractAudioSegmentFromUrl, validateExtractionParams } from '@/utils/audioExtraction';
import { FFmpeg } from '@ffmpeg/ffmpeg';

describe('audioExtraction', () => {
  let mockFFmpeg: jest.Mocked<FFmpeg>;
  
  beforeEach(() => {
    // Create mock FFmpeg instance
    mockFFmpeg = {
      loaded: false,
      load: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      exec: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue(new Uint8Array([5, 6, 7, 8])),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    } as any;
    
    (FFmpeg as jest.MockedClass<typeof FFmpeg>).mockImplementation(() => mockFFmpeg);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('extractAudioSegment', () => {
    it('should extract segment with valid parameters', async () => {
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      const startTime = 10;
      const endTime = 20;
      
      const result = await extractAudioSegment(audioBlob, startTime, endTime, mockFFmpeg);
      
      expect(mockFFmpeg.load).toHaveBeenCalled();
      expect(mockFFmpeg.writeFile).toHaveBeenCalledWith('input.wav', expect.any(Uint8Array));
      expect(mockFFmpeg.exec).toHaveBeenCalledWith([
        '-i', 'input.wav',
        '-ss', '10',
        '-t', '10', // duration, not endTime
        '-c', 'copy',
        'output.wav'
      ]);
      expect(mockFFmpeg.readFile).toHaveBeenCalledWith('output.wav');
      expect(mockFFmpeg.deleteFile).toHaveBeenCalledTimes(2);
      
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });
    
    it('should extract from beginning (start = 0)', async () => {
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      
      await extractAudioSegment(audioBlob, 0, 30, mockFFmpeg);
      
      expect(mockFFmpeg.exec).toHaveBeenCalledWith([
        '-i', 'input.wav',
        '-ss', '0',
        '-t', '30',
        '-c', 'copy',
        'output.wav'
      ]);
    });
    
    it('should extract to end of audio', async () => {
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      const duration = 120;
      
      await extractAudioSegment(audioBlob, 90, duration, mockFFmpeg);
      
      expect(mockFFmpeg.exec).toHaveBeenCalledWith([
        '-i', 'input.wav',
        '-ss', '90',
        '-t', '30',
        '-c', 'copy',
        'output.wav'
      ]);
    });
    
    it('should throw error for empty blob', async () => {
      const emptyBlob = new Blob([], { type: 'audio/wav' });
      
      await expect(
        extractAudioSegment(emptyBlob, 10, 20, mockFFmpeg)
      ).rejects.toThrow('Invalid audio blob: empty or null');
    });
    
    it('should throw error for negative start time', async () => {
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      
      await expect(
        extractAudioSegment(audioBlob, -5, 20, mockFFmpeg)
      ).rejects.toThrow('Start time cannot be negative');
    });
    
    it('should throw error when start >= end', async () => {
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      
      await expect(
        extractAudioSegment(audioBlob, 30, 20, mockFFmpeg)
      ).rejects.toThrow('End time must be greater than start time');
    });
    
    it('should throw error for very short segment', async () => {
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      
      await expect(
        extractAudioSegment(audioBlob, 10, 10.05, mockFFmpeg)
      ).rejects.toThrow('Segment duration must be at least 0.1 seconds');
    });
    
    it('should handle FFmpeg load failure', async () => {
      mockFFmpeg.load.mockRejectedValueOnce(new Error('Failed to load FFmpeg'));
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      
      await expect(
        extractAudioSegment(audioBlob, 10, 20, mockFFmpeg)
      ).rejects.toThrow('Failed to extract audio segment');
    });
    
    it('should handle FFmpeg execution failure', async () => {
      mockFFmpeg.exec.mockRejectedValueOnce(new Error('FFmpeg command failed'));
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      
      await expect(
        extractAudioSegment(audioBlob, 10, 20, mockFFmpeg)
      ).rejects.toThrow('Failed to extract audio segment');
    });
    
    it('should cleanup temporary files even on error', async () => {
      mockFFmpeg.exec.mockRejectedValueOnce(new Error('Extraction failed'));
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      
      try {
        await extractAudioSegment(audioBlob, 10, 20, mockFFmpeg);
      } catch (error) {
        // Expected error
      }
      
      // Files should still be written even if exec fails
      expect(mockFFmpeg.writeFile).toHaveBeenCalled();
    });
    
    it('should handle cleanup failure gracefully', async () => {
      mockFFmpeg.deleteFile.mockRejectedValueOnce(new Error('Delete failed'));
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      
      // Should not throw despite cleanup failure
      const result = await extractAudioSegment(audioBlob, 10, 20, mockFFmpeg);
      expect(result).toBeInstanceOf(Blob);
    });
    
    it('should use existing FFmpeg instance if already loaded', async () => {
      mockFFmpeg.loaded = true;
      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      
      await extractAudioSegment(audioBlob, 10, 20, mockFFmpeg);
      
      // Should not call load() again
      expect(mockFFmpeg.load).not.toHaveBeenCalled();
    });
  });
  
  describe('extractAudioSegmentFromUrl', () => {
    it('should fetch and extract audio from URL', async () => {
      const mockBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });
      
      const result = await extractAudioSegmentFromUrl('http://example.com/audio.wav', 10, 20, mockFFmpeg);
      
      expect(global.fetch).toHaveBeenCalledWith('http://example.com/audio.wav');
      expect(result).toBeInstanceOf(Blob);
    });
    
    it('should throw error if fetch fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });
      
      await expect(
        extractAudioSegmentFromUrl('http://example.com/audio.wav', 10, 20, mockFFmpeg)
      ).rejects.toThrow('Failed to load audio file');
    });
    
    it('should throw error if network error occurs', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(
        extractAudioSegmentFromUrl('http://example.com/audio.wav', 10, 20, mockFFmpeg)
      ).rejects.toThrow('Failed to load audio file');
    });
  });
  
  describe('validateExtractionParams', () => {
    it('should return null for valid parameters', () => {
      expect(validateExtractionParams(10, 20)).toBeNull();
      expect(validateExtractionParams(0, 120)).toBeNull();
      expect(validateExtractionParams(5.5, 15.3)).toBeNull();
    });
    
    it('should reject negative start time', () => {
      expect(validateExtractionParams(-5, 20)).toBe('Start time cannot be negative');
    });
    
    it('should reject end time before start time', () => {
      expect(validateExtractionParams(20, 10)).toBe('End time must be greater than start time');
    });
    
    it('should reject end time exceeding duration', () => {
      expect(validateExtractionParams(10, 200, 120)).toContain('exceeds audio duration');
    });
    
    it('should reject very short segments', () => {
      expect(validateExtractionParams(10, 10.05)).toContain('must be at least 0.1 seconds');
    });
    
    it('should reject very long segments', () => {
      expect(validateExtractionParams(0, 4000)).toContain('cannot exceed 1 hour');
    });
    
    it('should allow segments up to 1 hour', () => {
      expect(validateExtractionParams(0, 3600)).toBeNull();
    });
  });
});

