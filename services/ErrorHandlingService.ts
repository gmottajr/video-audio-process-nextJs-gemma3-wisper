/**
 * Error Handling Service
 * 
 * Centralized error handling and user-friendly message generation.
 * Separates error handling logic from UI components.
 */

/**
 * Custom Error Types
 */
export class BlobURLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlobURLError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelError";
  }
}

export class ProcessingError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = "ProcessingError";
  }
}

/**
 * Error Handling Service
 * 
 * Converts technical errors into user-friendly messages
 * and provides consistent error handling across the application.
 */
export class ErrorHandlingService {
  /**
   * Convert any error into a user-friendly message
   */
  getUserFriendlyMessage(error: unknown): string {
    if (error instanceof BlobURLError) {
      return "The audio file is no longer available in memory. Please re-process the file.";
    }

    if (error instanceof ValidationError) {
      if (error.field) {
        return `Invalid ${error.field}: ${error.message}`;
      }
      return `Invalid input: ${error.message}`;
    }

    if (error instanceof ModelError) {
      return `AI model error: ${error.message}. Please try again or select a different model.`;
    }

    if (error instanceof ProcessingError) {
      return `Processing failed: ${error.message}. Please try again.`;
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      // Check for specific error message patterns
      if (error.message.includes("fetch") || error.message.includes("network")) {
        return "Network error. Please check your connection and try again.";
      }

      if (error.message.includes("timeout")) {
        return "Processing timed out. The file may be too large. Try a smaller file or lighter model.";
      }

      if (error.message.includes("memory") || error.message.includes("out of")) {
        return "Out of memory. Close other applications and try again, or use a smaller file.";
      }

      if (error.message.includes("not found") || error.message.includes("404")) {
        return "File not found. The resource may have been removed.";
      }

      // Return the original message if it looks user-friendly
      if (error.message.length < 100 && !error.message.includes("undefined")) {
        return error.message;
      }

      // Generic error
      return `An error occurred: ${error.message}`;
    }

    // Unknown error type
    return "An unexpected error occurred. Please try again.";
  }

  /**
   * Log error with context for debugging
   */
  logError(error: unknown, context: string): void {
    console.error(`[ErrorHandlingService] ${context}:`, error);
    
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
  }

  /**
   * Handle error and return user message
   * Combines logging and message generation
   */
  handleError(error: unknown, context: string): string {
    this.logError(error, context);
    return this.getUserFriendlyMessage(error);
  }

  /**
   * Validate and throw appropriate error
   */
  validateNotNull<T>(value: T | null | undefined, fieldName: string): T {
    if (value === null || value === undefined) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }
    return value;
  }

  /**
   * Validate and throw if condition fails
   */
  validate(condition: boolean, message: string, field?: string): void {
    if (!condition) {
      throw new ValidationError(message, field);
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlingService();


