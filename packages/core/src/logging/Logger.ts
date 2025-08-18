/**
 * Professional logging system with structured data support
 * Replaces amateur console.log calls with proper logging
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  error?: Error;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  context?: string;
  enableColors?: boolean;
  enableTimestamps?: boolean;
  enableMetadata?: boolean;
}

/**
 * Logger interface for dependency injection
 */
export interface ILogger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void;
  child(context: string): ILogger;
}

/**
 * Color codes for console output
 */
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  context: '\x1b[35m', // magenta
  timestamp: '\x1b[90m', // gray
} as const;

/**
 * Log level hierarchy for filtering
 */
const LOG_LEVELS = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
} as const;

/**
 * Production-ready logger implementation
 */
export class Logger implements ILogger {
  private readonly config: Required<LoggerConfig>;

  constructor(config: LoggerConfig = { level: LogLevel.INFO }) {
    this.config = {
      level: config.level,
      context: config.context || '',
      enableColors: config.enableColors ?? process.stdout.isTTY,
      enableTimestamps: config.enableTimestamps ?? true,
      enableMetadata: config.enableMetadata ?? true,
    };
  }

  /**
   * Create a child logger with additional context
   */
  public child(context: string): ILogger {
    const childContext = this.config.context 
      ? `${this.config.context}:${context}`
      : context;

    return new Logger({
      ...this.config,
      context: childContext,
    });
  }

  /**
   * Log debug message
   */
  public debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, undefined, metadata);
  }

  /**
   * Log info message
   */
  public info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, undefined, metadata);
  }

  /**
   * Log warning message
   */
  public warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, undefined, metadata);
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, error, metadata);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void {
    // Filter by log level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.config.context,
      metadata: this.config.enableMetadata ? metadata : undefined,
      error,
    };

    this.output(entry);
  }

  /**
   * Output the log entry
   */
  private output(entry: LogEntry): void {
    if (process.env.NODE_ENV === 'test') {
      // In test environment, store logs for assertion
      this.storeTestLog(entry);
      return;
    }

    const formatted = this.format(entry);
    
    // Write to appropriate stream
    if (entry.level === LogLevel.ERROR) {
      process.stderr.write(formatted + '\n');
    } else {
      process.stdout.write(formatted + '\n');
    }
  }

  /**
   * Format log entry for output
   */
  private format(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    if (this.config.enableTimestamps) {
      const timestamp = entry.timestamp.slice(11, 23); // HH:mm:ss.SSS
      parts.push(
        this.colorize(COLORS.timestamp, `[${timestamp}]`)
      );
    }

    // Level
    const levelColor = COLORS[entry.level];
    const levelText = entry.level.toUpperCase().padEnd(5);
    parts.push(this.colorize(levelColor, levelText));

    // Context
    if (entry.context) {
      parts.push(this.colorize(COLORS.context, `[${entry.context}]`));
    }

    // Message
    parts.push(entry.message);

    // Metadata
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const metadataStr = JSON.stringify(entry.metadata, null, 2);
      parts.push('\n' + metadataStr);
    }

    // Error details
    if (entry.error) {
      parts.push('\n' + this.formatError(entry.error));
    }

    return parts.join(' ');
  }

  /**
   * Format error with stack trace
   */
  private formatError(error: Error): string {
    const parts = [
      `Error: ${error.message}`,
    ];

    if (error.stack) {
      parts.push(error.stack);
    }

    // Include additional error properties
    const additionalProps = Object.getOwnPropertyNames(error)
      .filter(prop => !['name', 'message', 'stack'].includes(prop));

    if (additionalProps.length > 0) {
      const props: Record<string, unknown> = {};
      additionalProps.forEach(prop => {
        props[prop] = (error as any)[prop];
      });
      parts.push('Additional properties:', JSON.stringify(props, null, 2));
    }

    return parts.join('\n');
  }

  /**
   * Apply color if enabled
   */
  private colorize(color: string, text: string): string {
    return this.config.enableColors ? `${color}${text}${COLORS.reset}` : text;
  }

  /**
   * Store logs for testing
   */
  private storeTestLog(entry: LogEntry): void {
    if (!(global as any).testLogs) {
      (global as any).testLogs = [];
    }
    (global as any).testLogs.push(entry);
  }
}

/**
 * Default logger instance
 */
export const defaultLogger = new Logger({
  level: (process.env.LOG_LEVEL as LogLevel) ?? LogLevel.INFO,
  context: 'app',
});

/**
 * Factory function for creating loggers
 */
export function createLogger(context: string, level?: LogLevel): ILogger {
  return new Logger({
    level: level ?? (process.env.LOG_LEVEL as LogLevel) ?? LogLevel.INFO,
    context,
  });
}