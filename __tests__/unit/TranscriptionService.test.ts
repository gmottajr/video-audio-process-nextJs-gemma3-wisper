/**
 * Unit Tests: Transcription Service
 * 
 * Tests transcription business logic and workflows
 */

import { TranscriptionService } from '@/services/TranscriptionService';
import { BlobURLError, ValidationError } from '@/services/ErrorHandlingService';
import type { ProcessingResult } from '@/hooks/useMediaProcessor';
import type { MediaProcessorInterface } from '@/services/TranscriptionService';
import * as blobValidation from '@/utils/blobValidation';

// Mock blobValidation utilities
jest.mock('@/utils/blobValidation');

describe('TranscriptionService', () => {
  let service: TranscriptionService;
  let mockProcessor: jest.Mocked<MediaProcessorInterface>;

  beforeEach(() => {
    // Create mock processor
    mockProcessor = {
      processFile: jest.fn().mockResolvedValue({
        type: 'transcription',
        transcription: { text: 'test transcription', chunks: [] },
        metadata: {},
      }),
    };

    service = new TranscriptionService(mockProcessor);

    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('transcribeFromResult', () => {
    const validResult: ProcessingResult = {
      type: 'audio',
      blobUrl: 'blob:valid-url',
      metadata: {},
    };

    const validOptions = {
      modelKey: 'small' as const,
      compressionType: 'speech' as const,
      normalizeAudio: true,
      testMode: false,
    };

    test('should successfully transcribe valid audio result', async () => {
      // Mock blob fetch
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      (blobValidation.fetchBlobSafely as jest.Mock).mockResolvedValue(mockBlob);

      const result = await service.transcribeFromResult(
        validResult,
        'test.wav',
        validOptions
      );

      expect(result.type).toBe('transcription');
      expect(mockProcessor.processFile).toHaveBeenCalledWith(
        expect.any(File),
        'transcribe',
        '',
        expect.objectContaining({
          modelKey: 'small',
          compressionType: 'speech',
          normalizeAudio: true,
        })
      );
    });

    test('should throw ValidationError if result is null', async () => {
      await expect(
        service.transcribeFromResult(null, 'test.wav', validOptions)
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError if result type is not audio', async () => {
      const videoResult: ProcessingResult = {
        type: 'video',
        blobUrl: 'blob:video',
        metadata: {},
      };

      await expect(
        service.transcribeFromResult(videoResult, 'test.mp4', validOptions)
      ).rejects.toThrow(ValidationError);
    });

    test('should throw BlobURLError if blobUrl is missing', async () => {
      const resultWithoutUrl: ProcessingResult = {
        type: 'audio',
        metadata: {},
      };

      await expect(
        service.transcribeFromResult(resultWithoutUrl, 'test.wav', validOptions)
      ).rejects.toThrow(BlobURLError);
    });

    test('should throw BlobURLError if blobUrl format is invalid', async () => {
      const resultWithInvalidUrl: ProcessingResult = {
        type: 'audio',
        blobUrl: 'http://invalid-url',
        metadata: {},
      };

      await expect(
        service.transcribeFromResult(resultWithInvalidUrl, 'test.wav', validOptions)
      ).rejects.toThrow(BlobURLError);
    });

    test('should handle blob fetch failure', async () => {
      (blobValidation.fetchBlobSafely as jest.Mock).mockRejectedValue(
        new Error('Fetch failed')
      );

      await expect(
        service.transcribeFromResult(validResult, 'test.wav', validOptions)
      ).rejects.toThrow(BlobURLError);
    });

    test('should create File with correct name', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      (blobValidation.fetchBlobSafely as jest.Mock).mockResolvedValue(mockBlob);

      await service.transcribeFromResult(validResult, 'meeting.wav', validOptions);

      const fileArg = mockProcessor.processFile.mock.calls[0][0];
      expect(fileArg.name).toBe('meeting.wav');
    });

    test('should use default filename if none provided', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      (blobValidation.fetchBlobSafely as jest.Mock).mockResolvedValue(mockBlob);

      await service.transcribeFromResult(validResult, undefined, validOptions);

      const fileArg = mockProcessor.processFile.mock.calls[0][0];
      expect(fileArg.name).toBe('audio.wav');
    });

    test('should pass all options to processor', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      (blobValidation.fetchBlobSafely as jest.Mock).mockResolvedValue(mockBlob);

      const customOptions = {
        modelKey: 'large' as const,
        compressionType: 'studio' as const,
        normalizeAudio: false,
        testMode: true,
      };

      await service.transcribeFromResult(validResult, 'test.wav', customOptions);

      expect(mockProcessor.processFile).toHaveBeenCalledWith(
        expect.any(File),
        'transcribe',
        '',
        {
          modelKey: 'large',
          compressionType: 'studio',
          normalizeAudio: false,
          testMode: true,
        }
      );
    });

    test('should log progress at each step', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      (blobValidation.fetchBlobSafely as jest.Mock).mockResolvedValue(mockBlob);

      await service.transcribeFromResult(validResult, 'test.wav', validOptions);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[TranscriptionService]'),
        expect.anything()
      );
    });

    test('should handle processing errors', async () => {
      const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
      (blobValidation.fetchBlobSafely as jest.Mock).mockResolvedValue(mockBlob);
      
      mockProcessor.processFile.mockRejectedValue(new Error('Processing failed'));

      await expect(
        service.transcribeFromResult(validResult, 'test.wav', validOptions)
      ).rejects.toThrow('Processing failed');
    });
  });

  describe('Blob handling', () => {
    test('should handle empty blob gracefully', async () => {
      const emptyBlob = new Blob([], { type: 'audio/wav' });
      (blobValidation.fetchBlobSafely as jest.Mock).mockResolvedValue(emptyBlob);

      const validResult: ProcessingResult = {
        type: 'audio',
        blobUrl: 'blob:valid',
        metadata: {},
      };

      // Should not throw for empty blob (validation happens in blobValidation.ts)
      await service.transcribeFromResult(validResult, 'test.wav', {
        modelKey: 'small',
        compressionType: 'none',
        normalizeAudio: false,
      });

      expect(mockProcessor.processFile).toHaveBeenCalled();
    });

    test('should preserve blob MIME type', async () => {
      const mockBlob = new Blob(['audio'], { type: 'audio/mp3' });
      (blobValidation.fetchBlobSafely as jest.Mock).mockResolvedValue(mockBlob);

      const validResult: ProcessingResult = {
        type: 'audio',
        blobUrl: 'blob:valid',
        metadata: {},
      };

      await service.transcribeFromResult(validResult, 'test.mp3', {
        modelKey: 'small',
        compressionType: 'none',
        normalizeAudio: false,
      });

      const fileArg = mockProcessor.processFile.mock.calls[0][0];
      expect(fileArg.type).toBe('audio/mp3');
    });
  });
});


