/**
 * Error handling module exports
 * Professional error system with proper hierarchy and utilities
 */

export {
  BaseError,
  ErrorBuilder,
  ErrorSeverity,
  ErrorCategory,
  type ErrorContext,
  type SerializableError,
} from './BaseError.js';

export {
  ValidationError,
  ApiError,
  FileSystemError,
  SecurityError,
  ConfigurationError,
  ToolExecutionError,
  RateLimitError,
  NetworkError,
} from './DomainErrors.js';

export {
  ErrorUtils,
  type Result,
  type RetryConfig,
} from './ErrorUtils.js';