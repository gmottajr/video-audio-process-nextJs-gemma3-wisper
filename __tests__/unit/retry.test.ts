/**
 * Unit Tests for Retry Utility
 * 
 * Tests retry logic, error classification, and backoff strategies
 */

import {
  withRetry,
  isCacheError,
  isNetworkError,
  isWorkerError,
  isModelError,
  isTransientError,
  getUserFriendlyMessage,
  getSuggestedAction,
  MODEL_LOAD_RETRY,
  TRANSCRIPTION_RETRY,
  NETWORK_RETRY
} from '@/lib/retry';

describe('Retry Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withRetry - Basic Functionality', () => {
    test('should succeed on first attempt', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(successFn);
      
      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const failThenSucceed = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });
      
      const result = await withRetry(failThenSucceed, {
        maxAttempts: 3,
        initialDelay: 1 // Short delay for fast tests
      });
      
      expect(result).toBe('success');
      expect(failThenSucceed).toHaveBeenCalledTimes(3);
    }, 10000); // 10 second timeout

    test('should throw error after max attempts', async () => {
      const alwaysFails = jest.fn().mockRejectedValue(new Error('Permanent failure'));
      
      await expect(
        withRetry(alwaysFails, {
          maxAttempts: 3,
          initialDelay: 1
        })
      ).rejects.toThrow('Permanent failure');
      
      expect(alwaysFails).toHaveBeenCalledTimes(3);
    }, 10000);

    test('should not retry if shouldRetry returns false', async () => {
      const failsOnce = jest.fn().mockRejectedValue(new Error('Non-retryable'));
      
      await expect(
        withRetry(failsOnce, {
          maxAttempts: 3,
          initialDelay: 10,
          shouldRetry: () => false
        })
      ).rejects.toThrow('Non-retryable');
      
      expect(failsOnce).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('withRetry - Exponential Backoff', () => {
    test('should implement exponential backoff', async () => {
      const delays: number[] = [];
      let attempts = 0;
      
      const failThreeTimes = async () => {
        attempts++;
        if (attempts < 4) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };
      
      await withRetry(failThreeTimes, {
        maxAttempts: 4,
        initialDelay: 1,
        backoffFactor: 2,
        onRetry: (attempt, error, nextDelay) => {
          delays.push(nextDelay);
        }
      });
      
      // Delays should be: 1, 2, 4
      expect(delays).toEqual([1, 2, 4]);
    }, 10000);

    test('should cap delay at maxDelay', async () => {
      const delays: number[] = [];
      let attempts = 0;
      
      const failThreeTimes = async () => {
        attempts++;
        if (attempts < 4) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };
      
      await withRetry(failThreeTimes, {
        maxAttempts: 4,
        initialDelay: 10,
        maxDelay: 15,
        backoffFactor: 2,
        onRetry: (attempt, error, nextDelay) => {
          delays.push(nextDelay);
        }
      });
      
      // Delays should be: 10, 15 (capped), 15 (capped)
      expect(delays).toEqual([10, 15, 15]);
    }, 10000);
  });

  describe('withRetry - Callbacks', () => {
    test('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      let attempts = 0;
      
      const failTwice = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };
      
      await withRetry(failTwice, {
        maxAttempts: 3,
        initialDelay: 1,
        onRetry
      });
      
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 1);
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error), 2);
    }, 10000);

    test('should pass error to shouldRetry', async () => {
      const shouldRetry = jest.fn(() => false);
      const failsOnce = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(
        withRetry(failsOnce, {
          maxAttempts: 3,
          initialDelay: 10,
          shouldRetry
        })
      ).rejects.toThrow();
      
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
      expect(shouldRetry.mock.calls[0][0].message).toBe('Test error');
    });
  });

  describe('Error Classification - Cache Errors', () => {
    test('should detect getReader errors', () => {
      const error = new Error("Cannot read properties of null (reading 'getReader')");
      expect(isCacheError(error)).toBe(true);
    });

    test('should detect cache errors', () => {
      const error = new Error('Cache storage failed');
      expect(isCacheError(error)).toBe(true);
    });

    test('should detect IndexedDB errors', () => {
      const error = new Error('IDBDatabase error occurred');
      expect(isCacheError(error)).toBe(true);
    });

    test('should detect storage errors', () => {
      const error = new Error('Storage quota exceeded');
      expect(isCacheError(error)).toBe(true);
    });

    test('should not misclassify non-cache errors', () => {
      const error = new Error('Network timeout');
      expect(isCacheError(error)).toBe(false);
    });
  });

  describe('Error Classification - Network Errors', () => {
    test('should detect network errors', () => {
      const error = new Error('Network request failed');
      expect(isNetworkError(error)).toBe(true);
    });

    test('should detect fetch errors', () => {
      const error = new Error('Fetch failed');
      expect(isNetworkError(error)).toBe(true);
    });

    test('should detect timeout errors', () => {
      const error = new Error('Request timeout');
      expect(isNetworkError(error)).toBe(true);
    });

    test('should detect connection errors', () => {
      const error = new Error('Connection refused');
      expect(isNetworkError(error)).toBe(true);
    });

    test('should detect offline errors', () => {
      const error = new Error('Device is offline');
      expect(isNetworkError(error)).toBe(true);
    });

    test('should detect CORS errors', () => {
      const error = new Error('CORS policy blocked');
      expect(isNetworkError(error)).toBe(true);
    });
  });

  describe('Error Classification - Worker Errors', () => {
    test('should detect worker errors', () => {
      const error = new Error('Worker initialization failed');
      expect(isWorkerError(error)).toBe(true);
    });

    test('should detect terminated worker errors', () => {
      const error = new Error('Worker terminated unexpectedly');
      expect(isWorkerError(error)).toBe(true);
    });

    test('should detect crashed worker errors', () => {
      const error = new Error('Worker crashed');
      expect(isWorkerError(error)).toBe(true);
    });
  });

  describe('Error Classification - Model Errors', () => {
    test('should detect model errors', () => {
      const error = new Error('Model loading failed');
      expect(isModelError(error)).toBe(true);
    });

    test('should detect ONNX errors', () => {
      const error = new Error('ONNX runtime error');
      expect(isModelError(error)).toBe(true);
    });

    test('should detect transformer errors', () => {
      const error = new Error('Transformer initialization failed');
      expect(isModelError(error)).toBe(true);
    });

    test('should detect pipeline errors', () => {
      const error = new Error('Pipeline creation failed');
      expect(isModelError(error)).toBe(true);
    });
  });

  describe('Error Classification - Transient Errors', () => {
    test('should identify cache errors as transient', () => {
      const error = new Error('Cache storage failed');
      expect(isTransientError(error)).toBe(true);
    });

    test('should identify network errors as transient', () => {
      const error = new Error('Network timeout');
      expect(isTransientError(error)).toBe(true);
    });

    test('should identify worker errors as transient', () => {
      const error = new Error('Worker crashed');
      expect(isTransientError(error)).toBe(true);
    });

    test('should not identify model errors as transient', () => {
      const error = new Error('Model file corrupted');
      expect(isTransientError(error)).toBe(false);
    });

    test('should not identify unknown errors as transient', () => {
      const error = new Error('Unknown error');
      expect(isTransientError(error)).toBe(false);
    });
  });

  describe('User-Friendly Messages', () => {
    test('should provide friendly message for cache errors', () => {
      const error = new Error('Cache storage failed');
      const message = getUserFriendlyMessage(error);
      
      expect(message).toContain('cache');
      expect(message.toLowerCase()).toContain('storage');
    });

    test('should provide friendly message for network errors', () => {
      const error = new Error('Network timeout');
      const message = getUserFriendlyMessage(error);
      
      expect(message.toLowerCase()).toContain('network');
    });

    test('should provide friendly message for worker errors', () => {
      const error = new Error('Worker crashed');
      const message = getUserFriendlyMessage(error);
      
      expect(message.toLowerCase()).toContain('processing');
    });

    test('should provide friendly message for model errors', () => {
      const error = new Error('Model loading failed');
      const message = getUserFriendlyMessage(error);
      
      expect(message.toLowerCase()).toContain('model');
    });

    test('should provide generic message for unknown errors', () => {
      const error = new Error('Unknown error');
      const message = getUserFriendlyMessage(error);
      
      // Should return the error message since it's not a recognized error type
      expect(message).toBe('Unknown error');
    });
  });

  describe('Suggested Actions', () => {
    test('should suggest cache clearing for cache errors', () => {
      const error = new Error('Cache storage failed');
      const actions = getSuggestedAction(error);
      
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.toLowerCase().includes('cache'))).toBe(true);
    });

    test('should suggest network checks for network errors', () => {
      const error = new Error('Network timeout');
      const actions = getSuggestedAction(error);
      
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.toLowerCase().includes('connection') || a.toLowerCase().includes('internet'))).toBe(true);
    });

    test('should suggest refresh for worker errors', () => {
      const error = new Error('Worker crashed');
      const actions = getSuggestedAction(error);
      
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.toLowerCase().includes('refresh'))).toBe(true);
    });

    test('should suggest model validation for model errors', () => {
      const error = new Error('Model loading failed');
      const actions = getSuggestedAction(error);
      
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.includes('setup-models') || a.includes('validate-models'))).toBe(true);
    });

    test('should provide generic actions for unknown errors', () => {
      const error = new Error('Unknown error');
      const actions = getSuggestedAction(error);
      
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('Predefined Retry Strategies', () => {
    test('MODEL_LOAD_RETRY should retry transient errors', async () => {
      const cacheError = new Error('Cache storage failed');
      let attempts = 0;
      
      const failWithCacheError = async () => {
        attempts++;
        if (attempts < 3) {
          throw cacheError;
        }
        return 'success';
      };
      
      const result = await withRetry(failWithCacheError, {
        ...MODEL_LOAD_RETRY,
        initialDelay: 1, // Speed up test
        maxDelay: 10
      });
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    }, 15000);

    test('MODEL_LOAD_RETRY should not retry non-transient errors', async () => {
      const permanentError = new Error('File not found');
      const failWithPermanentError = jest.fn().mockRejectedValue(permanentError);
      
      await expect(
        withRetry(failWithPermanentError, MODEL_LOAD_RETRY)
      ).rejects.toThrow('File not found');
      
      expect(failWithPermanentError).toHaveBeenCalledTimes(1);
    });

    test('TRANSCRIPTION_RETRY should retry worker errors', async () => {
      const workerError = new Error('Worker crashed');
      let attempts = 0;
      
      const failWithWorkerError = async () => {
        attempts++;
        if (attempts < 2) {
          throw workerError;
        }
        return 'success';
      };
      
      const result = await withRetry(failWithWorkerError, {
        ...TRANSCRIPTION_RETRY,
        initialDelay: 1, // Speed up test
        maxDelay: 10
      });
      
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    }, 10000);

    test('NETWORK_RETRY should retry network errors', async () => {
      const networkError = new Error('Network timeout');
      let attempts = 0;
      
      const failWithNetworkError = async () => {
        attempts++;
        if (attempts < 3) {
          throw networkError;
        }
        return 'success';
      };
      
      const result = await withRetry(failWithNetworkError, {
        ...NETWORK_RETRY,
        initialDelay: 1, // Speed up test
        maxDelay: 10
      });
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    }, 15000);

    test('NETWORK_RETRY should have higher max attempts', () => {
      expect(NETWORK_RETRY.maxAttempts).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Edge Cases', () => {
    test('should handle errors with no message', async () => {
      const error = new Error();
      error.message = '';
      
      expect(isCacheError(error)).toBe(false);
      expect(isNetworkError(error)).toBe(false);
      expect(isWorkerError(error)).toBe(false);
    });

    test('should handle case-insensitive error detection', () => {
      const error1 = new Error('CACHE STORAGE FAILED');
      const error2 = new Error('cache storage failed');
      const error3 = new Error('CaChe StOrAgE FaILeD');
      
      expect(isCacheError(error1)).toBe(true);
      expect(isCacheError(error2)).toBe(true);
      expect(isCacheError(error3)).toBe(true);
    });

    test('should handle maxAttempts of 1', async () => {
      const failsOnce = jest.fn().mockRejectedValue(new Error('Failure'));
      
      await expect(
        withRetry(failsOnce, {
          maxAttempts: 1,
          initialDelay: 10
        })
      ).rejects.toThrow();
      
      expect(failsOnce).toHaveBeenCalledTimes(1);
    });

    test('should handle zero delay', async () => {
      let attempts = 0;
      const failTwice = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };
      
      await withRetry(failTwice, {
        maxAttempts: 3,
        initialDelay: 0
      });
      
      // Should have retried
      expect(attempts).toBe(3);
    }, 10000);

    test('should handle very large backoff factors', async () => {
      const delays: number[] = [];
      let attempts = 0;
      
      const failThreeTimes = async () => {
        attempts++;
        if (attempts < 4) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };
      
      await withRetry(failThreeTimes, {
        maxAttempts: 4,
        initialDelay: 1,
        maxDelay: 100,
        backoffFactor: 10,
        onRetry: (attempt, error, nextDelay) => {
          delays.push(nextDelay);
        }
      });
      
      // Should grow exponentially: 1, 10, 100
      expect(delays[0]).toBe(1);
      expect(delays[1]).toBe(10);
      expect(delays[2]).toBe(100);
    }, 10000);
  });

  describe('Real-World Scenarios', () => {
    test('should handle intermittent cache errors', async () => {
      let attempts = 0;
      const errors = [
        new Error('Cache getReader failed'),
        new Error('Cache getReader failed'),
        null, // Success on third attempt
      ];
      
      const intermittentFailure = async () => {
        const error = errors[attempts];
        attempts++;
        if (error) throw error;
        return 'success';
      };
      
      const result = await withRetry(intermittentFailure, {
        ...MODEL_LOAD_RETRY,
        initialDelay: 1,
        maxDelay: 10
      });
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    }, 15000);

    test('should provide helpful feedback during retries', async () => {
      const messages: string[] = [];
      let attempts = 0;
      
      const failTwice = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Cache storage failed');
        }
        return 'success';
      };
      
      await withRetry(failTwice, {
        maxAttempts: 3,
        initialDelay: 1,
        onRetry: (attempt, error, nextDelay) => {
          const friendlyMessage = getUserFriendlyMessage(error);
          const actions = getSuggestedAction(error);
          messages.push(`Attempt ${attempt} failed: ${friendlyMessage}`);
        }
      });
      
      expect(messages.length).toBe(2);
      expect(messages[0]).toContain('cache');
    }, 10000);
  });
});

