/**
 * Unit Tests: Error Handling Service
 * 
 * Tests centralized error handling and message generation
 */

import {
  ErrorHandlingService,
  BlobURLError,
  ValidationError,
  ModelError,
  ProcessingError,
} from '@/services/ErrorHandlingService';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;

  beforeEach(() => {
    service = new ErrorHandlingService();
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Custom Error Types', () => {
    test('BlobURLError should have correct name', () => {
      const error = new BlobURLError('test message');
      expect(error.name).toBe('BlobURLError');
      expect(error.message).toBe('test message');
    });

    test('ValidationError should store field name', () => {
      const error = new ValidationError('invalid value', 'email');
      expect(error.name).toBe('ValidationError');
      expect(error.field).toBe('email');
    });

    test('ModelError should have correct name', () => {
      const error = new ModelError('model not loaded');
      expect(error.name).toBe('ModelError');
    });

    test('ProcessingError should store original error', () => {
      const originalError = new Error('original');
      const error = new ProcessingError('processing failed', originalError);
      expect(error.name).toBe('ProcessingError');
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('getUserFriendlyMessage', () => {
    test('should handle BlobURLError', () => {
      const error = new BlobURLError('blob error');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toContain('no longer available');
      expect(message).toContain('re-process');
    });

    test('should handle ValidationError with field', () => {
      const error = new ValidationError('required', 'username');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toContain('Invalid username');
      expect(message).toContain('required');
    });

    test('should handle ValidationError without field', () => {
      const error = new ValidationError('invalid input');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toContain('Invalid input');
    });

    test('should handle ModelError', () => {
      const error = new ModelError('model failed');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toContain('AI model error');
      expect(message).toContain('model failed');
    });

    test('should handle ProcessingError', () => {
      const error = new ProcessingError('process failed');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toContain('Processing failed');
      expect(message).toContain('process failed');
    });

    test('should detect network errors', () => {
      const error = new Error('fetch failed: network error');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toContain('Network error');
      expect(message).toContain('connection');
    });

    test('should detect timeout errors', () => {
      const error = new Error('operation timeout');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toContain('timed out');
      expect(message).toContain('smaller file');
    });

    test('should detect memory errors', () => {
      const error = new Error('out of memory');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toContain('Out of memory');
      expect(message).toContain('Close other applications');
    });

    test('should detect not found errors', () => {
      const error = new Error('resource not found');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toContain('not found');
    });

    test('should return original message if user-friendly', () => {
      const error = new Error('Something went wrong');
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toContain('Something went wrong');
    });

    test('should handle unknown error types', () => {
      const error = { weird: 'object' };
      const message = service.getUserFriendlyMessage(error);
      
      expect(message).toContain('unexpected error');
    });
  });

  describe('logError', () => {
    test('should log error with context', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      const error = new Error('test error');
      
      service.logError(error, 'Test Context');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ErrorHandlingService] Test Context:',
        error
      );
    });

    test('should log stack trace if available', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      const error = new Error('test error');
      
      service.logError(error, 'Test Context');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Stack trace:', expect.any(String));
    });
  });

  describe('handleError', () => {
    test('should log and return user message', () => {
      const error = new BlobURLError('blob error');
      const message = service.handleError(error, 'Test Context');
      
      expect(message).toContain('no longer available');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('validateNotNull', () => {
    test('should return value if not null', () => {
      const value = 'test value';
      const result = service.validateNotNull(value, 'field');
      
      expect(result).toBe('test value');
    });

    test('should throw ValidationError if null', () => {
      expect(() => {
        service.validateNotNull(null, 'field');
      }).toThrow(ValidationError);
    });

    test('should throw ValidationError if undefined', () => {
      expect(() => {
        service.validateNotNull(undefined, 'field');
      }).toThrow(ValidationError);
    });

    test('should include field name in error', () => {
      try {
        service.validateNotNull(null, 'username');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('username');
      }
    });
  });

  describe('validate', () => {
    test('should not throw if condition is true', () => {
      expect(() => {
        service.validate(true, 'error message');
      }).not.toThrow();
    });

    test('should throw ValidationError if condition is false', () => {
      expect(() => {
        service.validate(false, 'error message');
      }).toThrow(ValidationError);
    });

    test('should include field if provided', () => {
      try {
        service.validate(false, 'invalid', 'email');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('email');
      }
    });
  });
});


