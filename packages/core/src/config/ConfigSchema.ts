/**
 * Professional configuration schema with validation
 * Replaces amateur scattered config with centralized management
 */

import { z } from 'zod';

/**
 * Log level schema
 */
const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

/**
 * Model provider schema
 */
const ModelProviderSchema = z.enum(['gemini', 'claude', 'openai']);

/**
 * Model configuration schema
 */
const ModelConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().min(1, 'Model name is required'),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  timeout: z.number().int().positive().optional(),
});

/**
 * Rate limiting configuration schema
 */
const RateLimitConfigSchema = z.object({
  enabled: z.boolean().default(true),
  requestsPerMinute: z.number().int().positive().default(60),
  burstLimit: z.number().int().positive().default(10),
  windowSizeMs: z.number().int().positive().default(60000),
});

/**
 * Security configuration schema
 */
const SecurityConfigSchema = z.object({
  maxFileSize: z.number().int().positive().default(10 * 1024 * 1024), // 10MB
  allowedExtensions: z.array(z.string()).optional(),
  blockedPaths: z.array(z.string()).default([]),
  enablePathTraversalProtection: z.boolean().default(true),
  maxRequestSize: z.number().int().positive().default(1024 * 1024), // 1MB
});

/**
 * Tool configuration schema
 */
const ToolConfigSchema = z.object({
  confirmationTimeout: z.number().int().positive().default(30000), // 30 seconds
  executionTimeout: z.number().int().positive().default(60000), // 60 seconds
  maxConcurrentExecutions: z.number().int().positive().default(5),
});

/**
 * Logging configuration schema
 */
const LoggingConfigSchema = z.object({
  level: LogLevelSchema.default('info'),
  enableColors: z.boolean().optional(),
  enableTimestamps: z.boolean().default(true),
  enableMetadata: z.boolean().default(true),
  maxLogSize: z.number().int().positive().default(1024 * 1024), // 1MB
});

/**
 * API configuration schema
 */
const ApiConfigSchema = z.object({
  timeout: z.number().int().positive().default(30000), // 30 seconds
  maxRetries: z.number().int().nonnegative().default(3),
  retryDelayMs: z.number().int().positive().default(1000),
  maxRetryDelayMs: z.number().int().positive().default(30000),
  userAgent: z.string().default('OpenCLI/1.0'),
});

/**
 * Main application configuration schema
 */
export const AppConfigSchema = z.object({
  // Environment
  environment: z.enum(['development', 'production', 'test']).default('development'),
  
  // Application settings
  app: z.object({
    name: z.string().default('OpenCLI'),
    version: z.string().default('1.0.0'),
    rootDirectory: z.string().default(process.cwd()),
  }),
  
  // Model configurations
  models: z.object({
    gemini: ModelConfigSchema.optional(),
    claude: ModelConfigSchema.optional(),
    openai: ModelConfigSchema.optional(),
  }),
  
  // Feature flags
  features: z.object({
    enableTools: z.boolean().default(true),
    enableRateLimiting: z.boolean().default(true),
    enableConfirmations: z.boolean().default(true),
    enableLogging: z.boolean().default(true),
  }),
  
  // Component configurations
  rateLimit: RateLimitConfigSchema.default({}),
  security: SecurityConfigSchema.default({}),
  tools: ToolConfigSchema.default({}),
  logging: LoggingConfigSchema.default({}),
  api: ApiConfigSchema.default({}),
});

/**
 * Inferred TypeScript types from schemas
 */
export type LogLevel = z.infer<typeof LogLevelSchema>;
export type ModelProvider = z.infer<typeof ModelProviderSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type ApiConfig = z.infer<typeof ApiConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Environment variable mapping schema
 */
export const EnvVarsSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  LOG_LEVEL: LogLevelSchema.optional(),
  
  // API Keys
  GEMINI_API_KEY: z.string().optional(),
  CLAUDE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // Security settings
  MAX_FILE_SIZE: z.coerce.number().int().positive().optional(),
  ALLOWED_EXTENSIONS: z.string().transform(val => val.split(',')).optional(),
  BLOCKED_PATHS: z.string().transform(val => val.split(',')).optional(),
  
  // Rate limiting
  RATE_LIMIT_ENABLED: z.coerce.boolean().optional(),
  REQUESTS_PER_MINUTE: z.coerce.number().int().positive().optional(),
  
  // API settings
  API_TIMEOUT: z.coerce.number().int().positive().optional(),
  MAX_RETRIES: z.coerce.number().int().nonnegative().optional(),
  
  // Tool settings
  TOOL_TIMEOUT: z.coerce.number().int().positive().optional(),
  MAX_CONCURRENT_TOOLS: z.coerce.number().int().positive().optional(),
});

export type EnvVars = z.infer<typeof EnvVarsSchema>;