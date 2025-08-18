/**
 * Domain-specific error classes
 * Professional error handling for different application domains
 */

import { BaseError, ErrorCategory, ErrorSeverity, ErrorContext } from './BaseError.js';

/**
 * Validation error - for input validation failures
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    context?: ErrorContext & {
      field?: string;
      value?: unknown;
      constraint?: string;
    },
    cause?: Error
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      context,
      cause
    );
  }

  public getUserMessage(): string {
    if (this.context?.field) {
      return `Invalid ${this.context.field}: ${this.message}`;
    }
    return `Validation failed: ${this.message}`;
  }
}

/**
 * API error - for external API failures
 */
export class ApiError extends BaseError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly apiName: string,
    context?: ErrorContext & {
      endpoint?: string;
      requestId?: string;
      responseBody?: unknown;
    },
    cause?: Error
  ) {
    const severity = statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
    const category = statusCode >= 500 
      ? ErrorCategory.EXTERNAL_SERVICE 
      : ErrorCategory.VALIDATION;

    super(
      message,
      'API_ERROR',
      category,
      severity,
      { ...context, statusCode, apiName },
      cause
    );
  }

  public getUserMessage(): string {
    if (this.statusCode === 401) {
      return `Authentication failed for ${this.apiName}. Please check your API key.`;
    }
    if (this.statusCode === 403) {
      return `Access denied to ${this.apiName}. Check your permissions.`;
    }
    if (this.statusCode === 429) {
      return `Rate limit exceeded for ${this.apiName}. Please try again later.`;
    }
    if (this.statusCode >= 500) {
      return `${this.apiName} service is currently unavailable. Please try again later.`;
    }
    return `Request to ${this.apiName} failed: ${this.message}`;
  }

  public isRetryable(): boolean {
    return this.statusCode >= 500 || this.statusCode === 429;
  }
}

/**
 * File system error - for file operation failures
 */
export class FileSystemError extends BaseError {
  constructor(
    message: string,
    public readonly operation: 'read' | 'write' | 'delete' | 'stat' | 'access',
    public readonly filePath: string,
    context?: ErrorContext & {
      permission?: string;
      fileSize?: number;
    },
    cause?: Error
  ) {
    super(
      message,
      'FILE_SYSTEM_ERROR',
      ErrorCategory.FILE_SYSTEM,
      ErrorSeverity.MEDIUM,
      { ...context, operation, filePath },
      cause
    );
  }

  public getUserMessage(): string {
    switch (this.operation) {
      case 'read':
        return `Cannot read file: ${this.filePath}`;
      case 'write':
        return `Cannot write file: ${this.filePath}`;
      case 'delete':
        return `Cannot delete file: ${this.filePath}`;
      case 'access':
        return `Cannot access file: ${this.filePath}`;
      case 'stat':
        return `Cannot get file information: ${this.filePath}`;
      default:
        return `File operation failed: ${this.message}`;
    }
  }
}

/**
 * Security error - for security-related failures
 */
export class SecurityError extends BaseError {
  constructor(
    message: string,
    public readonly securityViolation: string,
    context?: ErrorContext & {
      attemptedPath?: string;
      allowedPaths?: string[];
      userAgent?: string;
    },
    cause?: Error
  ) {
    super(
      message,
      'SECURITY_ERROR',
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.HIGH,
      { ...context, securityViolation },
      cause
    );
  }

  public getUserMessage(): string {
    return 'Access denied due to security policy violation.';
  }

  public shouldLog(): boolean {
    return true; // Always log security violations
  }
}

/**
 * Configuration error - for configuration-related failures
 */
export class ConfigurationError extends BaseError {
  constructor(
    message: string,
    public readonly configKey: string,
    context?: ErrorContext & {
      expectedType?: string;
      receivedValue?: unknown;
      configFile?: string;
    },
    cause?: Error
  ) {
    super(
      message,
      'CONFIGURATION_ERROR',
      ErrorCategory.CONFIGURATION,
      ErrorSeverity.HIGH,
      { ...context, configKey },
      cause
    );
  }

  public getUserMessage(): string {
    return `Configuration error: ${this.message}`;
  }
}

/**
 * Tool execution error - for tool-specific failures
 */
export class ToolExecutionError extends BaseError {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly toolOperation: string,
    context?: ErrorContext & {
      parameters?: Record<string, unknown>;
      executionTime?: number;
    },
    cause?: Error
  ) {
    super(
      message,
      'TOOL_EXECUTION_ERROR',
      ErrorCategory.INTERNAL,
      ErrorSeverity.MEDIUM,
      { ...context, toolName, toolOperation },
      cause
    );
  }

  public getUserMessage(): string {
    return `Tool '${this.toolName}' failed: ${this.message}`;
  }
}

/**
 * Rate limiting error - for rate limit violations
 */
export class RateLimitError extends BaseError {
  constructor(
    message: string,
    public readonly retryAfter: number, // seconds
    public readonly resource: string,
    context?: ErrorContext & {
      currentUsage?: number;
      limit?: number;
      windowSize?: number;
    },
    cause?: Error
  ) {
    super(
      message,
      'RATE_LIMIT_ERROR',
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.MEDIUM,
      { ...context, retryAfter, resource },
      cause
    );
  }

  public getUserMessage(): string {
    const minutes = Math.ceil(this.retryAfter / 60);
    return `Rate limit exceeded for ${this.resource}. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
  }

  public isRetryable(): boolean {
    return true;
  }
}

/**
 * Network error - for network-related failures
 */
export class NetworkError extends BaseError {
  constructor(
    message: string,
    public readonly networkOperation: string,
    context?: ErrorContext & {
      url?: string;
      timeout?: number;
      statusCode?: number;
    },
    cause?: Error
  ) {
    super(
      message,
      'NETWORK_ERROR',
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      { ...context, networkOperation },
      cause
    );
  }

  public getUserMessage(): string {
    return `Network error during ${this.networkOperation}: ${this.message}`;
  }

  public isRetryable(): boolean {
    return true;
  }
}