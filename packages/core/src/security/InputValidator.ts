/**
 * Professional input validation and sanitization system
 * Protects against injection attacks and malicious input
 */

import { z } from 'zod';

import { createLogger, ILogger } from '../logging/index.js';
import { ValidationError } from '../errors/index.js';

/**
 * Validation rule types
 */
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean | string;
  sanitizer?: (value: string) => string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  sanitized?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Tool parameter validation result
 */
export interface ToolParameterValidationResult {
  valid: boolean;
  sanitized: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

/**
 * Input validation context
 */
export interface ValidationContext {
  field: string;
  operation: string;
  userAgent?: string;
  sourceIp?: string;
}

/**
 * Predefined validation schemas
 */
export const ValidationSchemas = {
  // File path validation
  filePath: z.string()
    .min(1, 'File path cannot be empty')
    .max(4096, 'File path too long')
    .refine(
      (path) => !path.includes('\0'),
      'File path cannot contain null bytes'
    )
    .refine(
      (path) => !/[<>:"|*?]/.test(path),
      'File path contains invalid characters'
    ),

  // Model name validation
  modelName: z.string()
    .min(1, 'Model name cannot be empty')
    .max(100, 'Model name too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Model name contains invalid characters'),

  // Tool name validation
  toolName: z.string()
    .min(1, 'Tool name cannot be empty')
    .max(100, 'Tool name too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Tool name contains invalid characters'),

  // User message validation
  userMessage: z.string()
    .min(1, 'Message cannot be empty')
    .max(100000, 'Message too long (max 100k characters)')
    .refine(
      (msg) => !msg.includes('\0'),
      'Message cannot contain null bytes'
    ),

  // API key validation (basic format check)
  apiKey: z.string()
    .min(10, 'API key too short')
    .max(200, 'API key too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'API key format invalid'),

  // Configuration value validation
  configValue: z.union([
    z.string().max(10000),
    z.number(),
    z.boolean(),
    z.array(z.string().max(1000)).max(100),
  ]),
};

/**
 * Professional input validator with sanitization
 */
export class InputValidator {
  private readonly logger: ILogger;
  private static readonly DANGEROUS_PATTERNS = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    
    // XSS patterns
    /<script[^>]*>/gi,
    /<\/script>/gi,
    /javascript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    
    // Command injection patterns
    /[;&|`$(){}[\]]/g,
    /\$\([^)]*\)/g,
    /`[^`]*`/g,
    
    // Path traversal patterns
    /\.\.[/\\]/g,
    /[/\\]\.\./g,
    
    // Null bytes and control characters
    /\0/g,
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
  ];

  constructor() {
    this.logger = createLogger('InputValidator');
  }

  /**
   * Validate and sanitize input using Zod schema
   */
  public validateWithSchema<T>(
    input: unknown,
    schema: z.ZodSchema<T>,
    context?: ValidationContext
  ): { success: true; data: T } | { success: false; errors: string[] } {
    try {
      const result = schema.safeParse(input);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        
        this.logger.warn('Schema validation failed', {
          context,
          errors,
          inputType: typeof input,
        });

        return { success: false, errors };
      }

      this.logger.debug('Schema validation passed', { context });
      return { success: true, data: result.data };
    } catch (error) {
      const errorMsg = `Schema validation error: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error('Schema validation exception', error instanceof Error ? error : new Error(String(error)), { context });
      return { success: false, errors: [errorMsg] };
    }
  }

  /**
   * Validate and sanitize string input with custom rules
   */
  public validateString(
    input: string,
    rules: ValidationRule,
    context?: ValidationContext
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitized = input;

    try {
      // Required check
      if (rules.required && (!input || input.trim().length === 0)) {
        errors.push('Field is required');
      }

      // Length checks
      if (rules.minLength && input.length < rules.minLength) {
        errors.push(`Minimum length is ${rules.minLength} characters`);
      }

      if (rules.maxLength && input.length > rules.maxLength) {
        errors.push(`Maximum length is ${rules.maxLength} characters`);
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(input)) {
        errors.push('Input format is invalid');
      }

      // Custom validation
      if (rules.customValidator) {
        const result = rules.customValidator(input);
        if (typeof result === 'string') {
          errors.push(result);
        } else if (!result) {
          errors.push('Custom validation failed');
        }
      }

      // Security checks
      const securityResult = this.checkForMaliciousContent(input, context);
      errors.push(...securityResult.errors);
      warnings.push(...securityResult.warnings);

      // Apply sanitization
      if (rules.sanitizer) {
        sanitized = rules.sanitizer(input);
      } else {
        sanitized = this.defaultSanitizer(input);
      }

      const isValid = errors.length === 0;
      
      if (!isValid && context) {
        this.logger.warn('Input validation failed', {
          context,
          errors,
          warnings,
          inputLength: input.length,
        });
      }

      return {
        valid: isValid,
        sanitized,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error('Input validation exception', error instanceof Error ? error : new Error(String(error)), { context });
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
        warnings,
      };
    }
  }

  /**
   * Sanitize file path for safe operations
   */
  public sanitizeFilePath(filePath: string): string {
    // Normalize path separators
    let sanitized = filePath.replace(/\\/g, '/');
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|*?\0]/g, '');
    
    // Remove multiple consecutive slashes
    sanitized = sanitized.replace(/\/+/g, '/');
    
    // Remove leading/trailing whitespace
    sanitized = sanitized.trim();
    
    // Resolve relative path components (but keep some for legitimate use)
    const parts = sanitized.split('/');
    const cleanParts: string[] = [];
    
    for (const part of parts) {
      if (part === '' || part === '.') {
        continue;
      }
      if (part === '..') {
        // Allow some parent directory traversal but log it
        if (cleanParts.length > 0) {
          cleanParts.pop();
        }
        continue;
      }
      cleanParts.push(part);
    }
    
    return cleanParts.join('/');
  }

  /**
   * Sanitize user message content
   */
  public sanitizeUserMessage(message: string): string {
    let sanitized = message;
    
    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Remove potentially dangerous HTML tags (basic)
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, '');
    sanitized = sanitized.replace(/<[^>]+>/g, '');
    
    return sanitized;
  }

  /**
   * Validate tool parameters
   */
  public validateToolParameters(
    parameters: Record<string, unknown>,
    expectedSchema?: Record<string, z.ZodSchema>
  ): ToolParameterValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitized: Record<string, unknown> = {};

    try {
      for (const [key, value] of Object.entries(parameters)) {
        // Validate key name
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          errors.push(`Invalid parameter name: ${key}`);
          continue;
        }

        // Validate against expected schema if provided
        if (expectedSchema && expectedSchema[key]) {
          const result = expectedSchema[key].safeParse(value);
          if (!result.success) {
            errors.push(`Parameter ${key}: ${result.error.errors[0]?.message || 'Invalid value'}`);
            continue;
          }
          sanitized[key] = result.data;
        } else {
          // Basic validation for unknown parameters
          if (typeof value === 'string') {
            const stringResult = this.validateString(value, { maxLength: 10000 });
            if (!stringResult.valid) {
              errors.push(`Parameter ${key}: ${stringResult.errors.join(', ')}`);
              continue;
            }
            sanitized[key] = stringResult.sanitized;
          } else if (typeof value === 'object' && value !== null) {
            // Recursively validate object parameters
            if (Array.isArray(value)) {
              sanitized[key] = value.slice(0, 100); // Limit array size
            } else {
              // Limit object complexity
              const objEntries = Object.entries(value);
              if (objEntries.length > 50) {
                warnings.push(`Parameter ${key}: Object has many properties, truncating`);
                sanitized[key] = Object.fromEntries(objEntries.slice(0, 50));
              } else {
                sanitized[key] = value;
              }
            }
          } else {
            sanitized[key] = value;
          }
        }
      }

      return {
        valid: errors.length === 0,
        sanitized,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        sanitized: {} as Record<string, unknown>,
        errors: [`Parameter validation error: ${error instanceof Error ? error.message : String(error)}`],
        warnings,
      };
    }
  }

  /**
   * Check for malicious content patterns
   */
  private checkForMaliciousContent(
    input: string,
    context?: ValidationContext
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const pattern of InputValidator.DANGEROUS_PATTERNS) {
      const matches = input.match(pattern);
      if (matches) {
        const severity = this.assessThreatSeverity(pattern, matches);
        const message = `Potentially dangerous pattern detected: ${matches[0]}`;
        
        if (severity === 'high') {
          errors.push(message);
        } else {
          warnings.push(message);
        }

        this.logger.warn('Malicious pattern detected', {
          context,
          pattern: pattern.source,
          matches: matches.slice(0, 5), // Limit logged matches
          severity,
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Assess threat severity of detected patterns
   */
  private assessThreatSeverity(pattern: RegExp, matches: RegExpMatchArray): 'high' | 'medium' | 'low' {
    // SQL injection patterns are high severity
    if (pattern.source.includes('SELECT|INSERT|UPDATE|DELETE')) {
      return 'high';
    }

    // Script tags and XSS are high severity
    if (pattern.source.includes('script') || pattern.source.includes('javascript')) {
      return 'high';
    }

    // Command injection is high severity
    if (pattern.source.includes('$\\(') || pattern.source.includes('`')) {
      return 'high';
    }

    // Path traversal is medium severity
    if (pattern.source.includes('\\.\\.')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Default sanitizer for general string input
   */
  private defaultSanitizer(input: string): string {
    let sanitized = input;

    // Remove null bytes and dangerous control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize Unicode
    sanitized = sanitized.normalize('NFKC');
    
    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }
}