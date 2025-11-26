/**
 * Retry Utility - Exponential Backoff with Error Classification
 * 
 * Improves reliability by:
 * - Automatic retry with exponential backoff
 * - Smart error classification
 * - Configurable retry strategies
 * - Progress callbacks
 */

export interface RetryOptions {
  /** Maximum number of attempts (including initial attempt) */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier (e.g., 2 = double delay each time) */
  backoffFactor?: number;
  /** Callback on each retry attempt */
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
  /** Function to determine if error should be retried */
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry = () => {},
    shouldRetry = () => true
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Retry] Attempt ${attempt}/${maxAttempts}`);
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry this error
      if (!shouldRetry(lastError, attempt)) {
        console.log(
          `[Retry] ❌ Error not retryable: ${lastError.message} ` +
          `(Attempt ${attempt}/${maxAttempts})`
        );
        throw lastError;
      }

      // Last attempt - throw error
      if (attempt === maxAttempts) {
        console.error(
          `[Retry] ❌ All ${maxAttempts} attempts failed. ` +
          `Last error: ${lastError.message}`
        );
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      console.warn(
        `[Retry] ⚠️ Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. ` +
        `Retrying in ${delay}ms...`
      );

      // Call retry callback
      onRetry(attempt, lastError, delay);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Error Classification Helpers
 */

/**
 * Check if error is related to cache/IndexedDB
 */
export function isCacheError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('getreader') || 
    message.includes('cache') ||
    message.includes('indexeddb') ||
    message.includes('idbdatabase') ||
    message.includes('storage') ||
    message.includes('quota')
  );
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('offline') ||
    message.includes('cors')
  );
}

/**
 * Check if error is worker-related
 */
export function isWorkerError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('worker') ||
    message.includes('terminated') ||
    message.includes('crashed')
  );
}

/**
 * Check if error is related to model loading
 */
export function isModelError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('model') ||
    message.includes('onnx') ||
    message.includes('transformer') ||
    message.includes('pipeline')
  );
}

/**
 * Check if error is transient (worth retrying)
 */
export function isTransientError(error: Error): boolean {
  return (
    isCacheError(error) ||
    isNetworkError(error) ||
    isWorkerError(error)
  );
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error): string {
  if (isCacheError(error)) {
    return 'Storage error. Try clearing your browser cache.';
  }
  
  if (isNetworkError(error)) {
    return 'Network error. Check your internet connection.';
  }
  
  if (isWorkerError(error)) {
    return 'Processing error. Please refresh the page and try again.';
  }
  
  if (isModelError(error)) {
    return 'AI model error. The model may not be downloaded correctly.';
  }
  
  return error.message || 'An unexpected error occurred.';
}

/**
 * Get suggested action for error
 */
export function getSuggestedAction(error: Error): string[] {
  const actions: string[] = [];
  
  if (isCacheError(error)) {
    actions.push('Clear browser cache and site data');
    actions.push('Hard refresh (Ctrl+Shift+R)');
    actions.push('Try in incognito/private mode');
  }
  
  if (isNetworkError(error)) {
    actions.push('Check internet connection');
    actions.push('Disable VPN or proxy');
    actions.push('Try again later');
  }
  
  if (isWorkerError(error)) {
    actions.push('Refresh the page');
    actions.push('Close other tabs to free memory');
    actions.push('Restart browser');
  }
  
  if (isModelError(error)) {
    actions.push('Run: npm run setup-models');
    actions.push('Run: npm run validate-models');
    actions.push('Check console for details');
  }
  
  if (actions.length === 0) {
    actions.push('Refresh the page');
    actions.push('Check browser console for details');
  }
  
  return actions;
}

/**
 * Predefined retry strategies
 */

/**
 * Retry strategy for model loading
 */
export const MODEL_LOAD_RETRY: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 2000,
  maxDelay: 10000,
  backoffFactor: 2,
  shouldRetry: (error, attempt) => {
    // Retry transient errors
    return isTransientError(error);
  },
  onRetry: (attempt, error, nextDelay) => {
    console.warn(
      `[Retry:ModelLoad] Attempt ${attempt} failed: ${error.message}. ` +
      `Next retry in ${nextDelay}ms`
    );
    
    if (isCacheError(error)) {
      console.warn('[Retry:ModelLoad] 💡 Cache error detected. User should clear browser cache.');
    }
  }
};

/**
 * Retry strategy for transcription
 */
export const TRANSCRIPTION_RETRY: RetryOptions = {
  maxAttempts: 2,
  initialDelay: 3000,
  maxDelay: 5000,
  backoffFactor: 1.5,
  shouldRetry: (error, attempt) => {
    // Only retry worker errors
    return isWorkerError(error);
  },
  onRetry: (attempt, error, nextDelay) => {
    console.warn(
      `[Retry:Transcription] Attempt ${attempt} failed: ${error.message}. ` +
      `Next retry in ${nextDelay}ms`
    );
  }
};

/**
 * Retry strategy for network requests
 */
export const NETWORK_RETRY: RetryOptions = {
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  shouldRetry: (error, attempt) => {
    return isNetworkError(error);
  },
  onRetry: (attempt, error, nextDelay) => {
    console.warn(
      `[Retry:Network] Attempt ${attempt} failed: ${error.message}. ` +
      `Next retry in ${nextDelay}ms`
    );
  }
};



