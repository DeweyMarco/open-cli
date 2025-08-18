/**
 * Professional configuration manager with centralized access and updates
 * Provides type-safe configuration access throughout the application
 */

import { EventEmitter } from 'events';

import { ConfigLoader, type ConfigLoadResult, type ConfigSource } from './ConfigLoader.js';
import { type AppConfig, type ModelConfig, type ModelProvider } from './ConfigSchema.js';
import { ConfigurationError, createLogger, type ILogger } from '../index.js';

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  previous: AppConfig;
  current: AppConfig;
  source: string;
}

/**
 * Configuration manager interface
 */
export interface IConfigManager {
  initialize(sources?: ConfigSource[]): Promise<void>;
  getConfig(): AppConfig;
  getModelConfig(provider: ModelProvider): ModelConfig | undefined;
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean;
  reload(): Promise<void>;
  on(event: 'configChanged', listener: (event: ConfigChangeEvent) => void): void;
}

/**
 * Professional configuration manager with event-driven updates
 */
export class ConfigManager extends EventEmitter implements IConfigManager {
  private static instance: ConfigManager;
  private loader: ConfigLoader;
  private logger: ILogger;
  private initialized = false;
  private currentConfig?: AppConfig;

  private constructor() {
    super();
    this.loader = ConfigLoader.getInstance();
    this.logger = createLogger('ConfigManager');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Initialize configuration manager
   */
  public async initialize(sources?: ConfigSource[]): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Configuration manager already initialized');
      return;
    }

    try {
      const result = await this.loader.loadConfig(sources);
      this.handleConfigLoadResult(result);
      this.initialized = true;
      
      this.logger.info('Configuration manager initialized successfully', {
        sources: result.sources,
        warningCount: result.warnings.length,
      });

      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          this.logger.warn('Configuration warning', { warning });
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize configuration manager', error instanceof Error ? error : new Error(String(error)));
      throw new ConfigurationError(
        'Failed to initialize configuration',
        'CONFIG_INIT_ERROR',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get complete configuration
   */
  public getConfig(): AppConfig {
    this.ensureInitialized();
    return this.currentConfig!;
  }

  /**
   * Get model configuration for a specific provider
   */
  public getModelConfig(provider: ModelProvider): ModelConfig | undefined {
    this.ensureInitialized();
    return this.currentConfig!.models[provider];
  }

  /**
   * Check if a feature is enabled
   */
  public isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    this.ensureInitialized();
    return this.currentConfig!.features[feature];
  }

  /**
   * Get available model providers
   */
  public getAvailableProviders(): ModelProvider[] {
    this.ensureInitialized();
    const providers: ModelProvider[] = [];
    
    if (this.currentConfig!.models.gemini) providers.push('gemini');
    if (this.currentConfig!.models.claude) providers.push('claude');
    if (this.currentConfig!.models.openai) providers.push('openai');
    
    return providers;
  }

  /**
   * Get security configuration
   */
  public getSecurityConfig(): AppConfig['security'] {
    this.ensureInitialized();
    return this.currentConfig!.security;
  }

  /**
   * Get rate limiting configuration
   */
  public getRateLimitConfig(): AppConfig['rateLimit'] {
    this.ensureInitialized();
    return this.currentConfig!.rateLimit;
  }

  /**
   * Get tool configuration
   */
  public getToolConfig(): AppConfig['tools'] {
    this.ensureInitialized();
    return this.currentConfig!.tools;
  }

  /**
   * Get logging configuration
   */
  public getLoggingConfig(): AppConfig['logging'] {
    this.ensureInitialized();
    return this.currentConfig!.logging;
  }

  /**
   * Get API configuration
   */
  public getApiConfig(): AppConfig['api'] {
    this.ensureInitialized();
    return this.currentConfig!.api;
  }

  /**
   * Reload configuration from sources
   */
  public async reload(): Promise<void> {
    if (!this.initialized) {
      throw new ConfigurationError(
        'Configuration manager not initialized',
        'CONFIG_NOT_INITIALIZED'
      );
    }

    try {
      const previousConfig = this.currentConfig!;
      const result = await this.loader.reloadConfig();
      
      this.handleConfigLoadResult(result);

      this.logger.info('Configuration reloaded successfully', {
        sources: result.sources,
        warningCount: result.warnings.length,
      });

      // Emit change event
      this.emit('configChanged', {
        previous: previousConfig,
        current: this.currentConfig!,
        source: 'reload',
      });

      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          this.logger.warn('Configuration reload warning', { warning });
        }
      }
    } catch (error) {
      this.logger.error('Failed to reload configuration', error instanceof Error ? error : new Error(String(error)));
      throw new ConfigurationError(
        'Failed to reload configuration',
        'CONFIG_RELOAD_ERROR',
        {},
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Update configuration programmatically
   */
  public updateConfig(updates: Partial<AppConfig>): void {
    this.ensureInitialized();
    
    const previousConfig = this.currentConfig!;
    
    // Merge updates with current config
    const updatedConfig = this.mergeConfig(previousConfig, updates);
    
    // Validate merged configuration
    const validatedConfig = ConfigLoader.validateConfig(updatedConfig);
    
    this.currentConfig = validatedConfig;

    this.logger.info('Configuration updated programmatically', {
      updatedKeys: Object.keys(updates),
    });

    // Emit change event
    this.emit('configChanged', {
      previous: previousConfig,
      current: this.currentConfig,
      source: 'programmatic',
    });
  }

  /**
   * Get configuration as JSON string
   */
  public toJSON(): string {
    this.ensureInitialized();
    
    // Remove sensitive information before serialization
    const configCopy = JSON.parse(JSON.stringify(this.currentConfig));
    
    // Mask API keys
    if (configCopy.models) {
      for (const provider of Object.keys(configCopy.models)) {
        if (configCopy.models[provider]?.apiKey) {
          configCopy.models[provider].apiKey = '***MASKED***';
        }
      }
    }
    
    return JSON.stringify(configCopy, null, 2);
  }

  /**
   * Validate configuration manager state
   */
  public validateState(): boolean {
    try {
      this.ensureInitialized();
      ConfigLoader.validateConfig(this.currentConfig);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handle configuration load result
   */
  private handleConfigLoadResult(result: ConfigLoadResult): void {
    this.currentConfig = result.config;
  }

  /**
   * Ensure configuration manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.currentConfig) {
      throw new ConfigurationError(
        'Configuration manager not initialized. Call initialize() first.',
        'CONFIG_NOT_INITIALIZED'
      );
    }
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(base: AppConfig, updates: Partial<AppConfig>): AppConfig {
    const result = { ...base };

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key as keyof AppConfig] = {
          ...(result[key as keyof AppConfig] as object),
          ...value,
        } as any;
      } else {
        result[key as keyof AppConfig] = value as any;
      }
    }

    return result;
  }
}

/**
 * Global configuration manager instance
 */
export const configManager = ConfigManager.getInstance();

/**
 * Utility functions for easy config access
 */
export const getConfig = (): AppConfig => configManager.getConfig();
export const getModelConfig = (provider: ModelProvider): ModelConfig | undefined => 
  configManager.getModelConfig(provider);
export const isFeatureEnabled = (feature: keyof AppConfig['features']): boolean => 
  configManager.isFeatureEnabled(feature);