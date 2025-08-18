/**
 * Professional configuration loader with multiple sources and validation
 * Replaces amateur environment variable handling with robust config management
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import { AppConfigSchema, EnvVarsSchema, type AppConfig, type EnvVars } from './ConfigSchema.js';
import { ConfigurationError } from '../errors/index.js';

/**
 * Configuration source types
 */
export type ConfigSource = 
  | { type: 'environment' }
  | { type: 'file'; path: string }
  | { type: 'object'; config: Partial<AppConfig> };

/**
 * Configuration loader result
 */
export interface ConfigLoadResult {
  config: AppConfig;
  sources: string[];
  warnings: string[];
}

/**
 * Professional configuration loader with validation and multiple sources
 */
export class ConfigLoader {
  private static instance: ConfigLoader;
  private loadedConfig?: AppConfig;
  private configSources: string[] = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Load configuration from multiple sources with validation
   */
  public async loadConfig(sources: ConfigSource[] = []): Promise<ConfigLoadResult> {
    const warnings: string[] = [];
    
    // Default sources if none provided
    if (sources.length === 0) {
      sources = await this.getDefaultSources();
    }

    // Load base configuration from environment
    let config: Partial<AppConfig> = await this.loadFromEnvironment();
    this.configSources.push('environment');

    // Load from additional sources
    for (const source of sources) {
      try {
        const sourceConfig = await this.loadFromSource(source);
        config = this.mergeConfigs(config, sourceConfig);
        this.configSources.push(this.getSourceName(source));
      } catch (error) {
        const warning = `Failed to load config from ${this.getSourceName(source)}: ${error instanceof Error ? error.message : String(error)}`;
        warnings.push(warning);
      }
    }

    // Validate final configuration
    const parseResult = AppConfigSchema.safeParse(config);
    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map(
        err => `${err.path.join('.')}: ${err.message}`
      );
      throw new ConfigurationError(
        'Configuration validation failed',
        'CONFIG_VALIDATION_ERROR',
        {
          errors: errorMessages,
          receivedConfig: config,
        }
      );
    }

    this.loadedConfig = parseResult.data;

    return {
      config: this.loadedConfig,
      sources: [...this.configSources],
      warnings,
    };
  }

  /**
   * Get the currently loaded configuration
   */
  public getConfig(): AppConfig {
    if (!this.loadedConfig) {
      throw new ConfigurationError(
        'Configuration not loaded. Call loadConfig() first.',
        'CONFIG_NOT_LOADED'
      );
    }
    return this.loadedConfig;
  }

  /**
   * Reload configuration
   */
  public async reloadConfig(): Promise<ConfigLoadResult> {
    this.loadedConfig = undefined;
    this.configSources = [];
    return this.loadConfig();
  }

  /**
   * Get default configuration sources
   */
  private async getDefaultSources(): Promise<ConfigSource[]> {
    const sources: ConfigSource[] = [];
    
    // Check for config files in order of precedence
    const configPaths = [
      'open-cli.config.json',
      'open-cli.config.js',
      '.open-cli.json',
      path.join(process.cwd(), 'config', 'open-cli.json'),
    ];

    for (const configPath of configPaths) {
      try {
        await fs.access(configPath);
        sources.push({ type: 'file', path: configPath });
        break; // Only load the first found config file
      } catch {
        // File doesn't exist, continue
      }
    }

    return sources;
  }

  /**
   * Load configuration from environment variables
   */
  private async loadFromEnvironment(): Promise<Partial<AppConfig>> {
    const envVars = EnvVarsSchema.parse(process.env);
    
    const config: Partial<AppConfig> = {
      environment: (envVars.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      logging: {
        level: (envVars.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
        enableTimestamps: true,
        enableMetadata: true,
        maxLogSize: 1024 * 1024, // 1MB
      },
    };

    // Model configurations
    if (envVars.GEMINI_API_KEY) {
      config.models = config.models || {};
      config.models.gemini = {
        apiKey: envVars.GEMINI_API_KEY as string,
        model: 'gemini-2.5-flash',
      };
    }

    if (envVars.CLAUDE_API_KEY) {
      config.models = config.models || {};
      config.models.claude = {
        apiKey: envVars.CLAUDE_API_KEY as string,
        model: 'claude-3-5-sonnet-20241022',
      };
    }

    if (envVars.OPENAI_API_KEY) {
      config.models = config.models || {};
      config.models.openai = {
        apiKey: envVars.OPENAI_API_KEY as string,
        model: 'gpt-4',
      };
    }

    // Security settings
    if (envVars.MAX_FILE_SIZE || envVars.ALLOWED_EXTENSIONS || envVars.BLOCKED_PATHS) {
      config.security = {} as any;
      if (envVars.MAX_FILE_SIZE) (config.security as any).maxFileSize = envVars.MAX_FILE_SIZE;
      if (envVars.ALLOWED_EXTENSIONS) (config.security as any).allowedExtensions = envVars.ALLOWED_EXTENSIONS;
      if (envVars.BLOCKED_PATHS) (config.security as any).blockedPaths = envVars.BLOCKED_PATHS;
    }

    // Rate limiting settings
    if (envVars.RATE_LIMIT_ENABLED !== undefined || envVars.REQUESTS_PER_MINUTE) {
      config.rateLimit = {} as any;
      if (envVars.RATE_LIMIT_ENABLED !== undefined) (config.rateLimit as any).enabled = envVars.RATE_LIMIT_ENABLED;
      if (envVars.REQUESTS_PER_MINUTE) (config.rateLimit as any).requestsPerMinute = envVars.REQUESTS_PER_MINUTE;
    }

    // API settings
    if (envVars.API_TIMEOUT || envVars.MAX_RETRIES) {
      config.api = {} as any;
      if (envVars.API_TIMEOUT) (config.api as any).timeout = envVars.API_TIMEOUT;
      if (envVars.MAX_RETRIES !== undefined) (config.api as any).maxRetries = envVars.MAX_RETRIES;
    }

    // Tool settings
    if (envVars.TOOL_TIMEOUT || envVars.MAX_CONCURRENT_TOOLS) {
      config.tools = {} as any;
      if (envVars.TOOL_TIMEOUT) (config.tools as any).executionTimeout = envVars.TOOL_TIMEOUT;
      if (envVars.MAX_CONCURRENT_TOOLS) (config.tools as any).maxConcurrentExecutions = envVars.MAX_CONCURRENT_TOOLS;
    }

    return config;
  }

  /**
   * Load configuration from a specific source
   */
  private async loadFromSource(source: ConfigSource): Promise<Partial<AppConfig>> {
    switch (source.type) {
      case 'environment':
        return this.loadFromEnvironment();
      
      case 'file':
        return this.loadFromFile(source.path);
      
      case 'object':
        return source.config;
      
      default:
        throw new ConfigurationError(
          `Unknown config source type: ${(source as any).type}`,
          'INVALID_CONFIG_SOURCE'
        );
    }
  }

  /**
   * Load configuration from file
   */
  private async loadFromFile(filePath: string): Promise<Partial<AppConfig>> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      if (filePath.endsWith('.json')) {
        return JSON.parse(content);
      }
      
      if (filePath.endsWith('.js')) {
        // Dynamic import for JS config files
        const absolutePath = path.resolve(filePath);
        const configModule = await import(absolutePath);
        return configModule.default || configModule;
      }
      
      throw new ConfigurationError(
        `Unsupported config file format: ${filePath}`,
        'UNSUPPORTED_CONFIG_FORMAT',
        { filePath }
      );
    } catch (error) {
      throw new ConfigurationError(
        `Failed to load config file: ${filePath}`,
        'CONFIG_FILE_LOAD_ERROR',
        { filePath },
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Deep merge two configuration objects
   */
  private mergeConfigs(base: Partial<AppConfig>, override: Partial<AppConfig>): Partial<AppConfig> {
    const result: Partial<AppConfig> = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value === undefined) continue;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key as keyof AppConfig] = this.mergeConfigs(
          (result[key as keyof AppConfig] as Partial<AppConfig>) || {},
          value as Partial<AppConfig>
        ) as any;
      } else {
        result[key as keyof AppConfig] = value as any;
      }
    }

    return result;
  }

  /**
   * Get source name for logging
   */
  private getSourceName(source: ConfigSource): string {
    switch (source.type) {
      case 'environment':
        return 'environment';
      case 'file':
        return `file:${source.path}`;
      case 'object':
        return 'object';
      default:
        return 'unknown';
    }
  }

  /**
   * Validate configuration against schema
   */
  public static validateConfig(config: unknown): AppConfig {
    const parseResult = AppConfigSchema.safeParse(config);
    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map(
        err => `${err.path.join('.')}: ${err.message}`
      );
      throw new ConfigurationError(
        'Configuration validation failed',
        'CONFIG_VALIDATION_ERROR',
        {
          errors: errorMessages,
          receivedConfig: config,
        }
      );
    }
    return parseResult.data;
  }
}