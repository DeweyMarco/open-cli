/**
 * Error utilities and recovery helpers
 * Professional error handling utilities for robust error management
 */

import { BaseError, ErrorSeverity, ErrorCategory } from './BaseError.js';
import { ApiError, NetworkError, RateLimitError } from './DomainErrors.js';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: Array<new (...args: any[]) => Error>;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [NetworkError, ApiError, RateLimitError],
};

/**
 * Result type for error-safe operations
 */
export type Result<T, E extends Error = Error> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

/**
 * Error utilities class
 */
export class ErrorUtils {
  /**
   * Wrap an operation with proper error handling and convert to Result
   */
  public static async safeAsync<T>(
    operation: () => Promise<T>
  ): Promise<Result<T>> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Wrap a synchronous operation with proper error handling
   */
  public static safe<T>(operation: () => T): Result<T> {
    try {
      const data = operation();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Retry an async operation with exponential backoff
   */
  public static async retry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry if it's the last attempt
        if (attempt === finalConfig.maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError, finalConfig.retryableErrors)) {
          break;
        }

        // Special handling for rate limit errors
        let delayMs = finalConfig.baseDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
        delayMs = Math.min(delayMs, finalConfig.maxDelayMs);

        if (lastError instanceof RateLimitError) {
          delayMs = Math.max(delayMs, lastError.retryAfter * 1000);
        }

        // Call retry callback if provided
        if (finalConfig.onRetry) {
          finalConfig.onRetry(attempt, lastError);
        }

        // Wait before retrying
        await this.delay(delayMs);
      }
    }

    throw lastError!;
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(
    error: Error,
    retryableErrors?: Array<new (...args: any[]) => Error>
  ): boolean {
    // Check if error has isRetryable method (BaseError)
    if (error instanceof BaseError) {
      return error.isRetryable();
    }

    // Check against retryable error types
    if (retryableErrors) {
      return retryableErrors.some(ErrorClass => error instanceof ErrorClass);
    }

    return false;
  }

  /**
   * Delay utility for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Normalize an unknown error to a proper Error instance
   */
  public static normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (error && typeof error === 'object') {
      if ('message' in error) {
        return new Error(String(error.message));
      }
      return new Error(JSON.stringify(error));
    }

    return new Error('Unknown error occurred');
  }

  /**
   * Create error from API response
   */
  public static createApiError(
    response: { status: number; statusText: string; url?: string },
    apiName: string,
    responseBody?: unknown,
    requestId?: string
  ): ApiError {
    const message = `${response.status} ${response.statusText}`;
    return new ApiError(
      message,
      response.status,
      apiName,
      {
        endpoint: response.url,
        responseBody,
        requestId,
      }
    );
  }

  /**
   * Aggregate multiple errors into a single error
   */
  public static aggregateErrors(
    errors: Error[],
    message = 'Multiple errors occurred'
  ): BaseError {
    if (errors.length === 0) {
      throw new Error('Cannot aggregate empty error list');
    }

    if (errors.length === 1) {
      return errors[0] instanceof BaseError 
        ? errors[0] 
        : this.wrapError(errors[0]);
    }

    const context = {
      errorCount: errors.length,
      errors: errors.map(err => err.message),
    };

    return new (class AggregateError extends BaseError {
      constructor() {
        super(
          message,
          'AGGREGATE_ERROR',
          ErrorCategory.INTERNAL,
          ErrorSeverity.HIGH,
          context
        );
      }
    })();
  }

  /**
   * Wrap a generic Error in BaseError
   */
  public static wrapError(
    error: Error,
    message?: string,
    category = ErrorCategory.INTERNAL
  ): BaseError {
    return new (class WrappedError extends BaseError {
      constructor() {
        super(
          message || error.message,
          'WRAPPED_ERROR',
          category,
          ErrorSeverity.MEDIUM,
          { originalError: error.name },
          error
        );
      }
    })();
  }

  /**
   * Filter errors by severity
   */
  public static filterBySeverity(
    errors: BaseError[],
    minSeverity: ErrorSeverity
  ): BaseError[] {
    const severityOrder = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 1,
      [ErrorSeverity.HIGH]: 2,
      [ErrorSeverity.CRITICAL]: 3,
    };

    const minLevel = severityOrder[minSeverity];
    return errors.filter(error => severityOrder[error.severity] >= minLevel);
  }

  /**
   * Group errors by category
   */
  public static groupByCategory(
    errors: BaseError[]
  ): Record<ErrorCategory, BaseError[]> {
    const grouped = {} as Record<ErrorCategory, BaseError[]>;

    for (const category of Object.values(ErrorCategory)) {
      grouped[category] = [];
    }

    for (const error of errors) {
      grouped[error.category].push(error);
    }

    return grouped;
  }
}