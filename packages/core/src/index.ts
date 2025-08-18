/**
 * Core package exports
 */

export * from './tools/index.js';
export * from './safety/index.js';
export * from './tools/built-in/index.js';
export * from './errors/index.js';
export * from './security/index.js';

// Export logging with explicit names
export {
  Logger,
  defaultLogger,
  createLogger,
  type ILogger,
  type LogEntry,
  type LoggerConfig,
} from './logging/index.js';

// Export config with LogLevel renamed to avoid conflicts
export {
  AppConfigSchema,
  ConfigLoader,
  ConfigManager,
  type RateLimitConfig,
  type SecurityConfig,
  type ToolConfig,
  type LoggingConfig,
  type ApiConfig,
  type AppConfig,
} from './config/index.js';

// Export LogLevel from logging with preference
export { LogLevel } from './logging/index.js';

// Export models with specific names to avoid conflicts
export { 
  ModelClient, 
  ModelMessage, 
  ModelResponse, 
  ModelConfig, 
  ModelProvider,
  ConversationHistory,
  GeminiClient,
  ClaudeClient,
  ModelRegistry,
  createModelsFromEnv
} from './models/index.js';