/**
 * Professional security manager with robust protection against common vulnerabilities
 * Fixes critical path traversal and other security issues
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { realpath } from 'fs/promises';

import { createLogger, ILogger } from '../logging/index.js';
import { SecurityError, FileSystemError } from '../errors/index.js';
import { SecurityConfig } from '../config/index.js';

/**
 * File operation types
 */
export type FileOperation = 'read' | 'write' | 'delete' | 'stat' | 'access' | 'list';

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  allowed: boolean;
  reason?: string;
  canonicalPath?: string;
  metadata?: Record<string, unknown>;
}

/**
 * File access attempt details
 */
export interface FileAccessAttempt {
  operation: FileOperation;
  requestedPath: string;
  canonicalPath?: string;
  timestamp: Date;
  allowed: boolean;
  reason?: string;
}

/**
 * Professional security manager with comprehensive protection
 */
export class SecureSafetyManager {
  private readonly logger: ILogger;
  private readonly accessLog: FileAccessAttempt[] = [];
  private readonly maxAccessLogEntries = 1000;

  constructor(private readonly config: SecurityConfig) {
    this.logger = createLogger('SecureSafetyManager');
    this.validateConfig();
  }

  /**
   * Validate security configuration on construction
   */
  private validateConfig(): void {
    if (!this.config.enablePathTraversalProtection) {
      this.logger.warn('Path traversal protection is disabled - this is a security risk');
    }

    if (this.config.maxFileSize && this.config.maxFileSize > 100 * 1024 * 1024) {
      this.logger.warn('Maximum file size is very large (>100MB) - consider reducing it');
    }
  }

  /**
   * Comprehensive file path validation with security checks
   */
  public async validateFilePath(
    requestedPath: string,
    operation: FileOperation,
    rootDirectory?: string
  ): Promise<SecurityValidationResult> {
    const startTime = performance.now();
    const attempt: FileAccessAttempt = {
      operation,
      requestedPath,
      timestamp: new Date(),
      allowed: false,
    };

    try {
      // Normalize path to prevent directory traversal
      const normalizedPath = path.normalize(requestedPath);
      
      // Check for obviously malicious patterns
      if (this.containsMaliciousPatterns(normalizedPath)) {
        attempt.reason = 'Path contains malicious patterns';
        return this.logAndReturn(attempt, false, attempt.reason);
      }

      // Resolve to canonical path (resolves symlinks, relative paths)
      let canonicalPath: string;
      try {
        canonicalPath = await realpath(path.resolve(normalizedPath));
      } catch (error) {
        // File doesn't exist - resolve the directory part and append filename
        const dir = path.dirname(normalizedPath);
        const filename = path.basename(normalizedPath);
        
        try {
          const canonicalDir = await realpath(path.resolve(dir));
          canonicalPath = path.join(canonicalDir, filename);
        } catch {
          // Directory doesn't exist either - use absolute path
          canonicalPath = path.resolve(normalizedPath);
        }
      }

      attempt.canonicalPath = canonicalPath;

      // Validate against root directory if provided
      const root = rootDirectory || process.cwd();
      const canonicalRoot = await realpath(path.resolve(root));
      
      if (this.config.enablePathTraversalProtection && !this.isWithinRoot(canonicalPath, canonicalRoot)) {
        attempt.reason = `Path outside allowed root directory: ${canonicalRoot}`;
        return this.logAndReturn(attempt, false, attempt.reason);
      }

      // Check blocked paths
      const relativePath = path.relative(canonicalRoot, canonicalPath);
      if (this.isPathBlocked(relativePath)) {
        attempt.reason = `Path is explicitly blocked: ${relativePath}`;
        return this.logAndReturn(attempt, false, attempt.reason);
      }

      // Validate file extension
      const extensionResult = this.validateFileExtension(canonicalPath);
      if (!extensionResult.allowed) {
        attempt.reason = extensionResult.reason;
        return this.logAndReturn(attempt, false, extensionResult.reason);
      }

      // Check file size for existing files
      if (operation === 'read' || operation === 'stat') {
        const sizeResult = await this.validateFileSize(canonicalPath);
        if (!sizeResult.allowed) {
          attempt.reason = sizeResult.reason;
          return this.logAndReturn(attempt, false, sizeResult.reason);
        }
      }

      // All checks passed
      const duration = performance.now() - startTime;
      this.logger.debug('File path validation successful', {
        requestedPath,
        canonicalPath,
        operation,
        duration: `${duration.toFixed(2)}ms`,
      });

      return this.logAndReturn(attempt, true, undefined, {
        canonicalPath,
        validationDuration: duration,
      });

    } catch (error) {
      attempt.reason = `Validation error: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error('File path validation failed', error instanceof Error ? error : new Error(String(error)), {
        requestedPath,
        operation,
      });
      return this.logAndReturn(attempt, false, attempt.reason);
    }
  }

  /**
   * Validate content size before operations
   */
  public validateContentSize(content: string | Buffer, operation: FileOperation): SecurityValidationResult {
    const size = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf-8');
    
    if (this.config.maxRequestSize && size > this.config.maxRequestSize) {
      const reason = `Content size (${size} bytes) exceeds maximum allowed (${this.config.maxRequestSize} bytes)`;
      
      this.logger.warn('Content size validation failed', {
        size,
        maxAllowed: this.config.maxRequestSize,
        operation,
      });

      return { allowed: false, reason };
    }

    return { allowed: true, metadata: { contentSize: size } };
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  public sanitizeInput(input: string, maxLength = 10000): string {
    // Remove null bytes and other dangerous characters
    let sanitized = input.replace(/\0/g, '');
    
    // Limit length to prevent DoS
    if (sanitized.length > maxLength) {
      sanitized = sanitized.slice(0, maxLength);
      this.logger.warn('Input truncated due to length limit', {
        originalLength: input.length,
        truncatedLength: sanitized.length,
        maxLength,
      });
    }

    // Remove or escape potentially dangerous sequences for shell injection
    // This is a basic sanitization - specific use cases may need more
    sanitized = sanitized.replace(/[;&|`$(){}[\]]/g, '');

    return sanitized;
  }

  /**
   * Get access log for security monitoring
   */
  public getAccessLog(limit = 100): FileAccessAttempt[] {
    return this.accessLog.slice(-limit);
  }

  /**
   * Get security statistics
   */
  public getSecurityStats(): {
    totalAttempts: number;
    blockedAttempts: number;
    recentBlocked: FileAccessAttempt[];
    commonBlockReasons: Record<string, number>;
  } {
    const totalAttempts = this.accessLog.length;
    const blockedAttempts = this.accessLog.filter(attempt => !attempt.allowed);
    const recentBlocked = blockedAttempts.slice(-10);
    
    const reasonCounts: Record<string, number> = {};
    for (const attempt of blockedAttempts) {
      if (attempt.reason) {
        reasonCounts[attempt.reason] = (reasonCounts[attempt.reason] || 0) + 1;
      }
    }

    return {
      totalAttempts,
      blockedAttempts: blockedAttempts.length,
      recentBlocked,
      commonBlockReasons: reasonCounts,
    };
  }

  /**
   * Clear access log (for maintenance)
   */
  public clearAccessLog(): void {
    this.accessLog.length = 0;
    this.logger.info('Security access log cleared');
  }

  /**
   * Check if path is within allowed root directory
   */
  private isWithinRoot(canonicalPath: string, canonicalRoot: string): boolean {
    // Ensure both paths end with path separator for accurate comparison
    const normalizedRoot = canonicalRoot.endsWith(path.sep) 
      ? canonicalRoot 
      : canonicalRoot + path.sep;
    
    const normalizedPath = canonicalPath.endsWith(path.sep) 
      ? canonicalPath 
      : canonicalPath + path.sep;

    return normalizedPath.startsWith(normalizedRoot) || canonicalPath === canonicalRoot;
  }

  /**
   * Check for malicious patterns in path
   */
  private containsMaliciousPatterns(filePath: string): boolean {
    const maliciousPatterns = [
      /\.\.[/\\]/,  // Directory traversal
      /[/\\]\.\./,  // Directory traversal
      /\0/,         // Null bytes
      /[<>:"|?*]/, // Windows invalid characters
      /^\s*$/,      // Empty or whitespace only
    ];

    return maliciousPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if path is in blocked list
   */
  private isPathBlocked(relativePath: string): boolean {
    const normalizedPath = path.normalize(relativePath).replace(/\\/g, '/');
    
    for (const blockedPath of this.config.blockedPaths) {
      const normalizedBlocked = path.normalize(blockedPath).replace(/\\/g, '/');
      
      if (normalizedPath.startsWith(normalizedBlocked)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate file extension
   */
  private validateFileExtension(filePath: string): SecurityValidationResult {
    if (!this.config.allowedExtensions || this.config.allowedExtensions.length === 0) {
      return { allowed: true };
    }

    const extension = path.extname(filePath).toLowerCase();
    const allowed = this.config.allowedExtensions.some(ext => {
      const normalizedExt = ext.toLowerCase().startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
      return normalizedExt === extension;
    });

    if (!allowed) {
      return {
        allowed: false,
        reason: `File extension '${extension}' not allowed. Allowed: ${this.config.allowedExtensions.join(', ')}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate file size for existing files
   */
  private async validateFileSize(filePath: string): Promise<SecurityValidationResult> {
    if (!this.config.maxFileSize) {
      return { allowed: true };
    }

    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.config.maxFileSize) {
        return {
          allowed: false,
          reason: `File size (${stats.size} bytes) exceeds maximum (${this.config.maxFileSize} bytes)`,
          metadata: { fileSize: stats.size, maxAllowed: this.config.maxFileSize },
        };
      }
      return { allowed: true, metadata: { fileSize: stats.size } };
    } catch (error) {
      // File doesn't exist - that's okay for write operations
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { allowed: true };
      }
      throw new FileSystemError(
        'Failed to check file size',
        'stat',
        filePath,
        {},
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Log access attempt and return result
   */
  private logAndReturn(
    attempt: FileAccessAttempt,
    allowed: boolean,
    reason?: string,
    metadata?: Record<string, unknown>
  ): SecurityValidationResult {
    attempt.allowed = allowed;
    attempt.reason = reason;

    // Add to access log
    this.accessLog.push(attempt);
    
    // Keep log size under control
    if (this.accessLog.length > this.maxAccessLogEntries) {
      this.accessLog.shift();
    }

    // Log security violations
    if (!allowed) {
      this.logger.warn('File access blocked', {
        operation: attempt.operation,
        requestedPath: attempt.requestedPath,
        canonicalPath: attempt.canonicalPath,
        reason,
      });
    }

    return {
      allowed,
      reason,
      canonicalPath: attempt.canonicalPath,
      metadata,
    };
  }
}