/**
 * Professional error handling system
 * Replaces amateur generic Error objects with structured error hierarchy
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL_SERVICE = 'external_service',
  FILE_SYSTEM = 'file_system',
  NETWORK = 'network',
  CONFIGURATION = 'configuration',
  INTERNAL = 'internal',
}

/**
 * Error context interface
 */
export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Serializable error data
 */
export interface SerializableError {
  name: string;
  message: string;
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: ErrorContext;
  stack?: string;
  cause?: SerializableError;
  timestamp: string;
  correlationId?: string;
}

/**
 * Base error class with professional error handling capabilities
 */
export abstract class BaseError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message);

    // Properly set the prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.correlationId = this.generateCorrelationId();

    // Preserve original error if provided
    if (cause) {
      this.cause = cause;
      // Preserve stack trace from original error
      if (cause.stack) {
        this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
      }
    }

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error to JSON-safe object
   */
  public toJSON(): SerializableError {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      context: this.context,
      stack: this.stack,
      cause: this.cause instanceof BaseError ? this.cause.toJSON() : undefined,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
    };
  }

  /**
   * Get user-friendly error message
   */
  public getUserMessage(): string {
    return this.message;
  }

  /**
   * Check if error is retryable
   */
  public isRetryable(): boolean {
    return [
      ErrorCategory.NETWORK,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorCategory.RATE_LIMIT,
    ].includes(this.category);
  }

  /**
   * Check if error should be logged
   */
  public shouldLog(): boolean {
    return this.severity !== ErrorSeverity.LOW;
  }

  /**
   * Get HTTP status code equivalent
   */
  public getHttpStatusCode(): number {
    switch (this.category) {
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.NOT_FOUND:
        return 404;
      case ErrorCategory.CONFLICT:
        return 409;
      case ErrorCategory.RATE_LIMIT:
        return 429;
      case ErrorCategory.EXTERNAL_SERVICE:
      case ErrorCategory.NETWORK:
        return 502;
      case ErrorCategory.INTERNAL:
      case ErrorCategory.CONFIGURATION:
      case ErrorCategory.FILE_SYSTEM:
      default:
        return 500;
    }
  }

  /**
   * Generate correlation ID for tracking
   */
  private generateCorrelationId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Error builder for fluent error creation
 */
export class ErrorBuilder {
  private message = '';
  private code = '';
  private category: ErrorCategory = ErrorCategory.INTERNAL;
  private severity: ErrorSeverity = ErrorSeverity.MEDIUM;
  private context?: ErrorContext;
  private cause?: Error;

  public static create(): ErrorBuilder {
    return new ErrorBuilder();
  }

  public withMessage(message: string): ErrorBuilder {
    this.message = message;
    return this;
  }

  public withCode(code: string): ErrorBuilder {
    this.code = code;
    return this;
  }

  public withCategory(category: ErrorCategory): ErrorBuilder {
    this.category = category;
    return this;
  }

  public withSeverity(severity: ErrorSeverity): ErrorBuilder {
    this.severity = severity;
    return this;
  }

  public withContext(context: ErrorContext): ErrorBuilder {
    this.context = context;
    return this;
  }

  public withCause(cause: Error): ErrorBuilder {
    this.cause = cause;
    return this;
  }

  public build<T extends BaseError>(
    ErrorClass: new (
      message: string,
      code: string,
      category: ErrorCategory,
      severity?: ErrorSeverity,
      context?: ErrorContext,
      cause?: Error
    ) => T
  ): T {
    return new ErrorClass(
      this.message,
      this.code,
      this.category,
      this.severity,
      this.context,
      this.cause
    );
  }
}