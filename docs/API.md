# Enterprise API Reference

This document provides comprehensive API documentation for Open CLI's enterprise-grade components, including production-ready systems for security, logging, configuration, and model integration.

## 🏗️ Enterprise Core Package (`packages/core`)

The core package implements production-grade architecture with comprehensive security, observability, and type safety.

### Core Exports

```typescript
export {
  // Tool System
  BaseTool, BaseToolInvocation, ToolRegistry, ToolInvocation,
  ToolResult, ToolLocation, ToolSchema, ToolCall,
  
  // Built-in Tools
  ReadFileTool, WriteFileTool, ListDirectoryTool,
  
  // Model System  
  ModelClient, ModelMessage, ModelResponse, ModelConfig, ModelProvider,
  ConversationHistory, GeminiClient, ClaudeClient, ModelRegistry,
  createModelsFromEnv,
  
  // Security & Safety
  SecureSafetyManager, RateLimiter, InputValidator,
  SecurityConfig, SecurityValidationResult, RateLimitConfig,
  
  // Configuration Management
  ConfigManager, ConfigLoader, ConfigSchema, AppConfig,
  
  // Structured Logging
  Logger, ILogger, LogLevel, LogEntry,
  
  // Professional Error Hierarchy
  BaseError, ApiError, SecurityError, ConfigurationError,
  NetworkError, ValidationError, RateLimitError, ErrorCategory,
  ErrorSeverity, ErrorUtils
} from '@open-cli/core';
```

## 🛠️ Enterprise Tool System

### Professional Tool Architecture

Open CLI implements a sophisticated tool system with comprehensive validation, security checks, and enterprise-grade execution patterns.

#### `BaseTool<TParams, TResult>`

**Enterprise foundation for all tools with comprehensive validation and security integration.**

```typescript
abstract class BaseTool<TParams extends object, TResult extends ToolResult> {
  constructor(
    protected readonly name: string,           // Internal tool identifier
    protected readonly displayName: string,    // Human-readable name
    protected readonly description: string,    // AI model description
    protected readonly parameterSchema: z.ZodSchema<TParams>,  // Runtime validation
    protected readonly logger?: ILogger        // Professional logging
  );

  // Tool metadata for AI models
  getSchema(): ToolSchema;
  getName(): string;
  getDisplayName(): string;
  getDescription(): string;
  
  // Validated invocation creation with comprehensive error handling
  createInvocation(params: unknown): ToolInvocation<TParams, TResult>;
  
  // Override for custom tool logic
  protected abstract createValidatedInvocation(
    params: TParams,
    securityContext?: SecurityContext
  ): ToolInvocation<TParams, TResult>;
  
  // Security integration
  protected validateSecurity(params: TParams): SecurityValidationResult;
  
  // Error handling with correlation
  protected handleError(error: Error, params: TParams, correlationId: string): never;
}
```

**Enterprise Tool Implementation Example:**
```typescript
const MyToolParams = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long')
    .describe('Message to process with security validation'),
  options: z.object({
    format: z.enum(['plain', 'markdown']).default('plain'),
    validate: z.boolean().default(true)
  }).optional()
});

class MyTool extends BaseTool<z.infer<typeof MyToolParams>, ToolResult> {
  constructor(
    private readonly securityManager: SecureSafetyManager,
    logger: ILogger
  ) {
    super(
      'my_tool', 
      'My Enterprise Tool', 
      'Processes messages with enterprise security and validation',
      MyToolParams,
      logger
    );
  }
  
  protected createValidatedInvocation(
    params: z.infer<typeof MyToolParams>,
    securityContext?: SecurityContext
  ) {
    // Enterprise security validation
    const securityResult = this.validateSecurity(params);
    if (!securityResult.allowed) {
      throw new SecurityError(securityResult.reason || 'Security validation failed');
    }
    
    return new MyToolInvocation(params, this.securityManager, this.logger);
  }
  
  protected validateSecurity(params: z.infer<typeof MyToolParams>): SecurityValidationResult {
    // Input sanitization and validation
    const sanitizationResult = this.securityManager.validateContent(params.message);
    if (!sanitizationResult.allowed) {
      return { allowed: false, reason: 'Message contains unsafe content' };
    }
    
    return { allowed: true };
  }
}
```

#### `BaseToolInvocation<TParams, TResult>`

**Enterprise tool execution with comprehensive error handling, security validation, and structured logging.**

```typescript
abstract class BaseToolInvocation<TParams extends object, TResult extends ToolResult> {
  constructor(
    protected readonly params: TParams,
    protected readonly securityManager?: SecureSafetyManager,
    protected readonly logger?: ILogger
  );
  
  // Tool metadata
  abstract getDescription(): string;
  getToolLocations(): ToolLocation[];
  
  // Security & confirmation
  shouldConfirmExecute(abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false>;
  
  // Enterprise execution with comprehensive error handling
  async execute(
    abortSignal: AbortSignal, 
    updateOutput?: (output: string) => void
  ): Promise<TResult> {
    const correlationId = this.generateCorrelationId();
    const startTime = Date.now();
    
    this.logger?.info('Tool execution started', {
      tool: this.constructor.name,
      params: this.sanitizeParams(),
      correlationId
    });
    
    try {
      // Pre-execution validation
      await this.validateExecution(abortSignal);
      
      // Execute with timeout protection
      const result = await this.executeWithTimeout(abortSignal, updateOutput);
      
      // Post-execution validation
      await this.validateResult(result);
      
      this.logger?.info('Tool execution completed', {
        tool: this.constructor.name,
        duration: Date.now() - startTime,
        correlationId
      });
      
      return result;
      
    } catch (error) {
      this.logger?.error('Tool execution failed', error as Error, {
        tool: this.constructor.name,
        duration: Date.now() - startTime,
        correlationId
      });
      
      throw this.wrapError(error as Error, correlationId);
    }
  }
  
  // Override for custom execution logic
  protected abstract executeInternal(
    abortSignal: AbortSignal,
    updateOutput?: (output: string) => void
  ): Promise<TResult>;
  
  // Security and validation hooks
  protected async validateExecution(abortSignal: AbortSignal): Promise<void>;
  protected async validateResult(result: TResult): Promise<void>;
  
  // Error handling with correlation
  protected wrapError(error: Error, correlationId: string): Error;
  protected sanitizeParams(): Record<string, unknown>;
  protected generateCorrelationId(): string;
}
```

#### `ToolRegistry`

**Enterprise tool management with validation, monitoring, and comprehensive error handling.**

```typescript
class ToolRegistry {
  constructor(
    private readonly securityManager: SecureSafetyManager,
    private readonly logger: ILogger,
    private readonly config: ToolRegistryConfig
  );
  
  // Tool registration with validation
  register<TParams extends object, TResult extends ToolResult>(
    tool: BaseTool<TParams, TResult>
  ): void {
    this.validateTool(tool);
    this.tools.set(tool.getName(), tool);
    
    this.logger.info('Tool registered successfully', {
      tool: tool.getName(),
      displayName: tool.getDisplayName(),
      description: tool.getDescription()
    });
  }
  
  // Enterprise tool discovery
  getAllSchemas(): ToolSchema[] {
    return Array.from(this.tools.values())
      .filter(tool => this.isToolEnabled(tool))
      .map(tool => this.enhanceSchema(tool.getSchema()));
  }
  
  // Secure tool retrieval
  getTool(name: string): BaseTool<any, any> | undefined {
    const tool = this.tools.get(name);
    if (tool && this.isToolEnabled(tool)) {
      return tool;
    }
    return undefined;
  }
  
  // Enterprise invocation creation with comprehensive validation
  createInvocation(toolCall: ToolCall): ToolInvocation<any, any> {
    const correlationId = this.generateCorrelationId();
    
    this.logger.info('Creating tool invocation', {
      tool: toolCall.name,
      correlationId
    });
    
    try {
      // Tool validation
      const tool = this.getTool(toolCall.name);
      if (!tool) {
        throw new ValidationError(`Unknown tool: ${toolCall.name}`);
      }
      
      // Rate limiting check
      await this.checkRateLimit(toolCall.name);
      
      // Security validation
      const securityResult = this.validateToolCall(toolCall);
      if (!securityResult.allowed) {
        throw new SecurityError(securityResult.reason || 'Tool call blocked by security policy');
      }
      
      // Create validated invocation
      const invocation = tool.createInvocation(toolCall.parameters);
      
      this.logger.info('Tool invocation created successfully', {
        tool: toolCall.name,
        correlationId
      });
      
      return invocation;
      
    } catch (error) {
      this.logger.error('Tool invocation creation failed', error as Error, {
        tool: toolCall.name,
        correlationId
      });
      throw error;
    }
  }
  
  // Management and monitoring
  getToolNames(): string[];
  hasTool(name: string): boolean;
  unregister(name: string): boolean;
  clear(): void;
  getStats(): ToolRegistryStats;
  
  // Enterprise features
  private validateTool(tool: BaseTool<any, any>): void;
  private validateToolCall(toolCall: ToolCall): SecurityValidationResult;
  private isToolEnabled(tool: BaseTool<any, any>): boolean;
  private enhanceSchema(schema: ToolSchema): ToolSchema;
  private async checkRateLimit(toolName: string): Promise<void>;
}
```

**Enterprise Tool Registry Setup:**
```typescript
// Create enterprise registry with full configuration
const securityManager = new SecureSafetyManager({
  rootDirectory: process.cwd(),
  enablePathTraversalProtection: true,
  maxFileSize: 10 * 1024 * 1024
});

const logger = new Logger({
  level: LogLevel.INFO,
  context: 'ToolRegistry'
});

const registry = new ToolRegistry(
  securityManager,
  logger,
  {
    enableRateLimit: true,
    maxToolsPerRegistry: 50,
    securityLevel: 'enterprise'
  }
);

// Register enterprise tools with security validation
registry.register(new ReadFileTool(securityManager, logger));
registry.register(new WriteFileTool(securityManager, logger));
registry.register(new ListDirectoryTool(securityManager, logger));

// Get validated schemas for AI models
const schemas = registry.getAllSchemas(); // Returns security-validated schemas

// Create secure tool invocations
try {
  const invocation = registry.createInvocation({
    name: 'read_file',
    parameters: { path: './safe-file.txt' }
  });
  
  const result = await invocation.execute(abortSignal);
  console.log(result.returnDisplay);
} catch (error) {
  if (error instanceof SecurityError) {
    console.error('Security validation failed:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Parameter validation failed:', error.message);
  }
}
```

## 🤖 Enterprise Model System

### Professional AI Model Architecture

Open CLI implements enterprise-grade AI model integration with comprehensive type safety, error handling, and security measures.

#### `ModelClient`

**Enterprise interface for AI model implementations with comprehensive error handling and security integration.**

```typescript
interface ModelClient {
  readonly name: string;
  readonly provider: ModelProvider;
  readonly config: ModelConfig;
  
  // Enterprise message handling with comprehensive validation
  sendMessage(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse>;
  
  // Capability detection
  supportsTools(): boolean;
  supportsStreaming(): boolean;
  getMaxTokens(): number;
  
  // Health and monitoring
  isHealthy(): Promise<boolean>;
  getStats(): ModelClientStats;
  
  // Configuration management
  updateConfig(config: Partial<ModelConfig>): void;
  validateConfig(): ValidationResult;
}
```

#### `ModelRegistry`

**Enterprise model management with validation, health checking, and comprehensive monitoring.**

```typescript
class ModelRegistry {
  constructor(
    private readonly logger: ILogger,
    private readonly config: ModelRegistryConfig
  );
  
  // Enterprise model registration with validation
  registerModel(name: string, client: ModelClient): void {
    this.validateModel(client);
    this.performHealthCheck(client);
    
    this.models.set(name, client);
    
    this.logger.info('Model registered successfully', {
      name,
      provider: client.provider,
      capabilities: {
        tools: client.supportsTools(),
        streaming: client.supportsStreaming(),
        maxTokens: client.getMaxTokens()
      }
    });
  }
  
  // Factory method with comprehensive error handling
  createModel(
    provider: ModelProvider, 
    name: string, 
    config: ModelConfig
  ): ModelClient {
    try {
      // Config validation
      const validationResult = this.validateConfig(provider, config);
      if (!validationResult.valid) {
        throw new ConfigurationError(
          `Invalid config for ${provider}: ${validationResult.errors.join(', ')}`
        );
      }
      
      // Create provider-specific client
      let client: ModelClient;
      switch (provider) {
        case ModelProvider.GEMINI:
          client = new GeminiClient(config, this.logger);
          break;
        case ModelProvider.CLAUDE:
          client = new ClaudeClient(config, this.logger);
          break;
        default:
          throw new ConfigurationError(`Unsupported provider: ${provider}`);
      }
      
      // Validate API key format
      if (!this.validateApiKeyFormat(config.apiKey, provider)) {
        throw new ConfigurationError(`Invalid API key format for ${provider}`);
      }
      
      this.logger.info('Model created successfully', {
        provider,
        name,
        model: config.model
      });
      
      return client;
      
    } catch (error) {
      this.logger.error('Model creation failed', error as Error, {
        provider,
        name
      });
      throw error;
    }
  }
  
  // Enterprise model discovery with health checking
  getAvailableModels(): ModelInfo[] {
    return Array.from(this.models.entries())
      .filter(([_, client]) => this.isModelHealthy(client))
      .map(([name, client]) => ({
        name,
        provider: client.provider,
        healthy: true,
        capabilities: {
          tools: client.supportsTools(),
          streaming: client.supportsStreaming(),
          maxTokens: client.getMaxTokens()
        },
        stats: client.getStats()
      }));
  }
  
  // Secure model retrieval
  getModel(name: string): ModelClient | undefined {
    const client = this.models.get(name);
    if (client && this.isModelHealthy(client)) {
      return client;
    }
    return undefined;
  }
  
  // Health and monitoring
  async performHealthChecks(): Promise<ModelHealthReport> {
    const results: ModelHealthResult[] = [];
    
    for (const [name, client] of this.models) {
      try {
        const healthy = await client.isHealthy();
        results.push({ name, healthy, error: null });
      } catch (error) {
        results.push({ 
          name, 
          healthy: false, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      results,
      totalModels: this.models.size,
      healthyModels: results.filter(r => r.healthy).length
    };
  }
  
  // Utility and management
  hasModel(name: string): boolean;
  removeModel(name: string): boolean;
  clear(): void;
  getStats(): ModelRegistryStats;
  
  // Enterprise features
  static createModelsFromEnv(): ModelRegistry;
  private validateModel(client: ModelClient): void;
  private validateConfig(provider: ModelProvider, config: ModelConfig): ValidationResult;
  private validateApiKeyFormat(apiKey: string, provider: ModelProvider): boolean;
  private isModelHealthy(client: ModelClient): boolean;
}
```

#### `GeminiClient`

**Enterprise Google Gemini API client with comprehensive error handling, retry logic, and security measures.**

```typescript
class GeminiClient implements ModelClient {
  readonly name = 'gemini';
  readonly provider = ModelProvider.GEMINI;
  readonly config: ModelConfig;
  
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly logger: ILogger;
  private readonly retryConfig: RetryConfig;
  
  constructor(
    config: ModelConfig,
    logger: ILogger,
    retryConfig?: RetryConfig
  ) {
    this.validateConfig(config);
    this.config = { ...this.getDefaultConfig(), ...config };
    this.logger = logger.createChild({ context: 'GeminiClient' });
    this.retryConfig = retryConfig ?? this.getDefaultRetryConfig();
  }
  
  // Enterprise message handling with comprehensive error handling
  async sendMessage(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse> {
    const correlationId = this.generateCorrelationId();
    
    this.logger.info('API request started', {
      model: this.config.model,
      messageCount: messages.length,
      toolsAvailable: availableTools?.length ?? 0,
      correlationId
    });
    
    try {
      // Input validation and sanitization
      this.validateMessages(messages);
      this.validateTools(availableTools);
      
      // Create request with security headers
      const requestBody = this.createRequestBody(messages, availableTools);
      
      // Execute with retry logic and timeout protection
      const result = await ErrorUtils.retry(
        () => this.sendMessageInternal(requestBody, abortSignal),
        this.retryConfig
      );
      
      this.logger.info('API request completed successfully', {
        model: this.config.model,
        tokensUsed: result.usage?.totalTokens ?? 0,
        correlationId
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('API request failed', error as Error, {
        model: this.config.model,
        correlationId
      });
      
      // Transform to domain-specific error
      throw this.transformError(error as Error);
    }
  }
  
  // Capability detection
  supportsTools(): boolean { return true; }
  supportsStreaming(): boolean { return false; }
  getMaxTokens(): number { return this.config.maxTokens ?? 2048; }
  
  // Health monitoring
  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.sendMessage(
        [{ role: 'user', content: 'ping' }],
        [],
        AbortSignal.timeout(5000)
      );
      return !!response.message;
    } catch {
      return false;
    }
  }
  
  getStats(): ModelClientStats {
    return {
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      averageResponseTime: this.stats.averageResponseTime,
      totalTokensUsed: this.stats.totalTokensUsed,
      lastRequestTime: this.stats.lastRequestTime
    };
  }
  
  // Configuration management
  updateConfig(config: Partial<ModelConfig>): void {
    const newConfig = { ...this.config, ...config };
    this.validateConfig(newConfig);
    this.config = newConfig;
  }
  
  validateConfig(): ValidationResult {
    return this.validateConfigInternal(this.config);
  }
  
  // Private implementation with enterprise features
  private async sendMessageInternal(
    requestBody: GeminiRequest,
    abortSignal?: AbortSignal
  ): Promise<ModelResponse>;
  
  private createRequestBody(
    messages: ModelMessage[],
    tools?: ToolSchema[]
  ): GeminiRequest;
  
  private transformError(error: Error): Error;
  private validateMessages(messages: ModelMessage[]): void;
  private validateTools(tools?: ToolSchema[]): void;
  private validateConfig(config: ModelConfig): void;
  private generateCorrelationId(): string;
  private updateStats(success: boolean, responseTime: number, tokens?: number): void;
}
```

#### `ClaudeClient`

**Enterprise Anthropic Claude API client with professional error handling, security validation, and comprehensive monitoring.**

```typescript
class ClaudeClient implements ModelClient {
  readonly name = 'claude';
  readonly provider = ModelProvider.CLAUDE;
  readonly config: ModelConfig;
  
  private readonly baseUrl = 'https://api.anthropic.com/v1/messages';
  private readonly logger: ILogger;
  private readonly retryConfig: RetryConfig;
  
  constructor(
    config: ModelConfig,
    logger: ILogger,
    retryConfig?: RetryConfig
  ) {
    this.validateConfig(config);
    this.config = { ...this.getDefaultConfig(), ...config };
    this.logger = logger.createChild({ context: 'ClaudeClient' });
    this.retryConfig = retryConfig ?? this.getDefaultRetryConfig();
  }
  
  // Enterprise message processing with comprehensive error handling
  async sendMessage(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse> {
    const correlationId = this.generateCorrelationId();
    
    this.logger.info('Claude API request initiated', {
      model: this.config.model,
      messageCount: messages.length,
      toolsAvailable: availableTools?.length ?? 0,
      maxTokens: this.config.maxTokens,
      correlationId
    });
    
    try {
      // Comprehensive input validation
      this.validateMessages(messages);
      this.validateTools(availableTools);
      
      // Create secure request body
      const requestBody = this.createRequestBody(messages, availableTools);
      
      // Execute with enterprise error handling and retry logic
      const result = await ErrorUtils.retry(
        () => this.sendMessageInternal(requestBody, abortSignal),
        this.retryConfig
      );
      
      this.logger.info('Claude API request completed successfully', {
        model: this.config.model,
        tokensUsed: result.usage?.totalTokens ?? 0,
        stopReason: result.finishReason,
        correlationId
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Claude API request failed', error as Error, {
        model: this.config.model,
        correlationId
      });
      
      // Enterprise error transformation with context
      throw this.transformError(error as Error, correlationId);
    }
  }
  
  // Capability detection with model-specific features
  supportsTools(): boolean { return true; }
  supportsStreaming(): boolean { return true; }
  getMaxTokens(): number { return this.config.maxTokens ?? 4096; }
  
  // Enterprise health monitoring
  async isHealthy(): Promise<boolean> {
    try {
      const healthCheck = await this.sendMessage(
        [{ role: 'user', content: 'Health check ping' }],
        [],
        AbortSignal.timeout(10000)
      );
      return !!healthCheck.message && healthCheck.finishReason === 'stop';
    } catch (error) {
      this.logger.warn('Health check failed', error as Error);
      return false;
    }
  }
  
  getStats(): ModelClientStats {
    return {
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      averageResponseTime: this.stats.averageResponseTime,
      totalTokensUsed: this.stats.totalTokensUsed,
      rateLimitHits: this.stats.rateLimitHits,
      lastRequestTime: this.stats.lastRequestTime,
      lastError: this.stats.lastError
    };
  }
  
  // Configuration management with hot-reload support
  updateConfig(config: Partial<ModelConfig>): void {
    const newConfig = { ...this.config, ...config };
    this.validateConfig(newConfig);
    
    this.logger.info('Configuration updated', {
      changes: Object.keys(config),
      previousModel: this.config.model,
      newModel: newConfig.model
    });
    
    this.config = newConfig;
  }
  
  validateConfig(): ValidationResult {
    return this.validateConfigInternal(this.config);
  }
  
  // Private enterprise implementation
  private async sendMessageInternal(
    requestBody: ClaudeRequest,
    abortSignal?: AbortSignal
  ): Promise<ModelResponse>;
  
  private createRequestBody(
    messages: ModelMessage[],
    tools?: ToolSchema[]
  ): ClaudeRequest;
  
  private transformError(error: Error, correlationId: string): Error;
  private validateMessages(messages: ModelMessage[]): void;
  private validateTools(tools?: ToolSchema[]): void;
  private validateConfig(config: ModelConfig): void;
  private generateCorrelationId(): string;
  private updateStats(success: boolean, responseTime: number, tokens?: number): void;
  private handleRateLimit(error: ApiError): void;
}
```

## 🔒 Enterprise Security System

### Comprehensive Security Architecture

Open CLI implements multiple layers of security protection including path traversal prevention, input validation, rate limiting, and threat detection.

#### `SecureSafetyManager`

**Enterprise security manager with canonical path resolution, comprehensive validation, and threat detection.**

```typescript
class SecureSafetyManager {
  constructor(
    private readonly config: SecurityConfig,
    private readonly logger: ILogger,
    private readonly inputValidator: InputValidator
  );
  
  // Comprehensive path validation with canonical resolution
  async validateFilePath(requestedPath: string): Promise<SecurityValidationResult> {
    const correlationId = this.generateCorrelationId();
    
    this.logger.debug('Path validation started', {
      requestedPath: this.sanitizePathForLogging(requestedPath),
      correlationId
    });
    
    try {
      // Canonical path resolution (handles symlinks, relative paths)
      const canonicalPath = await realpath(path.resolve(requestedPath));
      const canonicalRoot = await realpath(path.resolve(this.config.rootDirectory));
      
      // Security boundary checking
      if (!this.isWithinRoot(canonicalPath, canonicalRoot)) {
        this.logSecurityViolation('path_traversal', {
          requestedPath,
          canonicalPath,
          rootDirectory: canonicalRoot,
          correlationId
        });
        
        return {
          allowed: false,
          reason: `Path outside allowed root directory: ${canonicalRoot}`,
          violationType: 'path_traversal',
          correlationId
        };
      }
      
      // Pattern-based security checks
      if (this.containsMaliciousPatterns(requestedPath)) {
        this.logSecurityViolation('malicious_pattern', {
          requestedPath,
          patterns: this.detectPatterns(requestedPath),
          correlationId
        });
        
        return {
          allowed: false,
          reason: 'Path contains potentially malicious patterns',
          violationType: 'malicious_pattern',
          correlationId
        };
      }
      
      // Extension validation
      if (!this.validateExtension(canonicalPath)) {
        return {
          allowed: false,
          reason: `File extension not allowed: ${path.extname(canonicalPath)}`,
          violationType: 'invalid_extension',
          correlationId
        };
      }
      
      this.logger.debug('Path validation successful', {
        canonicalPath: this.sanitizePathForLogging(canonicalPath),
        correlationId
      });
      
      return {
        allowed: true,
        canonicalPath,
        correlationId
      };
      
    } catch (error) {
      this.logger.error('Path validation error', error as Error, {
        requestedPath: this.sanitizePathForLogging(requestedPath),
        correlationId
      });
      
      return {
        allowed: false,
        reason: `Path validation error: ${(error as Error).message}`,
        violationType: 'validation_error',
        correlationId
      };
    }
  }
  
  // Content validation with size and pattern checking
  validateContent(content: string | Buffer): SecurityValidationResult {
    const size = Buffer.isBuffer(content) 
      ? content.length 
      : Buffer.byteLength(content, 'utf-8');
    
    // Size validation
    if (this.config.maxRequestSize && size > this.config.maxRequestSize) {
      this.logger.warn('Content size limit exceeded', {
        size,
        maxAllowed: this.config.maxRequestSize,
        percentage: Math.round((size / this.config.maxRequestSize) * 100)
      });
      
      return {
        allowed: false,
        reason: `Content size (${size} bytes) exceeds maximum (${this.config.maxRequestSize} bytes)`,
        violationType: 'size_limit_exceeded'
      };
    }
    
    // Input validation for string content
    if (typeof content === 'string') {
      const validationResult = this.inputValidator.validateString(content, {
        maxLength: this.config.maxRequestSize,
        checkMalicious: true
      });
      
      if (!validationResult.valid) {
        return {
          allowed: false,
          reason: `Content validation failed: ${validationResult.errors.join(', ')}`,
          violationType: 'malicious_content'
        };
      }
    }
    
    return {
      allowed: true,
      metadata: { contentSize: size }
    };
  }
  
  // Comprehensive file operation validation
  async validateFileOperation(
    filePath: string, 
    operation: 'read' | 'write' | 'delete',
    content?: string | Buffer
  ): Promise<SecurityValidationResult> {
    // Path validation
    const pathResult = await this.validateFilePath(filePath);
    if (!pathResult.allowed) {
      return pathResult;
    }
    
    // Content validation for write operations
    if (operation === 'write' && content) {
      const contentResult = this.validateContent(content);
      if (!contentResult.allowed) {
        return contentResult;
      }
    }
    
    // Size validation for existing files
    if (operation === 'read' && pathResult.canonicalPath) {
      const sizeResult = await this.validateFileSize(pathResult.canonicalPath);
      if (!sizeResult.allowed) {
        return sizeResult;
      }
    }
    
    return {
      allowed: true,
      canonicalPath: pathResult.canonicalPath,
      metadata: {
        operation,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  // Security monitoring and logging
  getSecurityStats(): SecurityStats {
    const totalAttempts = this.accessLog.length;
    const blockedAttempts = this.accessLog.filter(attempt => !attempt.allowed);
    
    // Analyze attack patterns
    const violationTypes: Record<string, number> = {};
    for (const attempt of blockedAttempts) {
      if (attempt.violationType) {
        violationTypes[attempt.violationType] = 
          (violationTypes[attempt.violationType] || 0) + 1;
      }
    }
    
    return {
      totalAttempts,
      blockedAttempts: blockedAttempts.length,
      blockRate: totalAttempts > 0 ? (blockedAttempts.length / totalAttempts) * 100 : 0,
      recentBlocked: blockedAttempts.slice(-10),
      violationTypes,
      threatLevel: this.calculateThreatLevel(blockedAttempts)
    };
  }
  
  // Private security implementation
  private isWithinRoot(canonicalPath: string, canonicalRoot: string): boolean;
  private containsMaliciousPatterns(path: string): boolean;
  private validateExtension(path: string): boolean;
  private async validateFileSize(path: string): Promise<SecurityValidationResult>;
  private logSecurityViolation(type: string, details: Record<string, unknown>): void;
  private sanitizePathForLogging(path: string): string;
  private generateCorrelationId(): string;
  private calculateThreatLevel(violations: SecurityViolation[]): ThreatLevel;
}
```

**Enterprise Security Configuration:**
```typescript
interface SecurityConfig {
  // Path protection
  rootDirectory: string;                    // Base directory (canonical)
  enablePathTraversalProtection: boolean;   // Enable path traversal protection
  allowedExtensions?: string[];             // Allowed file extensions allowlist
  blockedPaths?: string[];                  // Blocked path patterns
  
  // Content protection
  maxFileSize: number;                      // Maximum file size in bytes
  maxRequestSize: number;                   // Maximum request content size
  enableContentScanning: boolean;           // Enable malware/content scanning
  
  // Rate limiting
  rateLimiting: RateLimitConfig;
  
  // Monitoring and logging
  enableSecurityLogging: boolean;           // Enable security event logging
  logRetentionDays: number;                 // Security log retention
  alertThreshold: 'low' | 'medium' | 'high'; // Alert sensitivity
  
  // Response configuration
  enableAutoResponse: boolean;              // Auto-respond to threats
  enableThreatBlocking: boolean;            // Block detected threats
}

interface RateLimitConfig {
  enabled: boolean;
  algorithm: RateLimitAlgorithm;
  requestsPerMinute: number;
  burstLimit: number;
  windowSizeMs: number;
  banThreshold: number;                     // Violations before ban
  banDurationMs: number;                    // Ban duration
}

enum RateLimitAlgorithm {
  TOKEN_BUCKET = 'token_bucket',
  SLIDING_WINDOW = 'sliding_window',
  FIXED_WINDOW = 'fixed_window'
}

interface SecurityValidationResult {
  allowed: boolean;
  reason?: string;
  canonicalPath?: string;
  violationType?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}
```

#### `ConfirmationManager`

Handles user confirmation workflows.

```typescript
class ConfirmationManager {
  constructor(handler: ConfirmationHandler);
  
  async requestConfirmation(
    toolName: string,
    description: string,
    details: ToolCallConfirmationDetails,
    locations?: ToolLocation[]
  ): Promise<ConfirmationResponse>;
}
```

### Built-in Tools

#### `ReadFileTool`

Safely reads file contents.

```typescript
class ReadFileTool extends BaseTool<ReadFileParams, ToolResult> {
  constructor(safetyManager: SafetyManager);
}

interface ReadFileParams {
  path: string;        // File path to read
  offset?: number;     // Starting line (0-based)
  limit?: number;      // Maximum lines to read
}
```

#### `WriteFileTool`

Writes content to files with safety checks.

```typescript
class WriteFileTool extends BaseTool<WriteFileParams, ToolResult> {
  constructor(safetyManager: SafetyManager);
}

interface WriteFileParams {
  path: string;           // File path to write
  content: string;        // Content to write
  create_dirs?: boolean;  // Create parent directories
}
```

#### `ListDirectoryTool`

Lists directory contents with rich formatting.

```typescript
class ListDirectoryTool extends BaseTool<ListDirectoryParams, ToolResult> {
  constructor(safetyManager: SafetyManager);
}

interface ListDirectoryParams {
  path: string;           // Directory path to list
  show_hidden?: boolean;  // Include hidden files
  recursive?: boolean;    // List recursively
}
```

## 🖥️ CLI Package (`@open-cli/cli`)

### Core Management

#### `CoreManager`

Orchestrates models and tools for the CLI.

```typescript
class CoreManager {
  constructor(config: CoreConfig);
  
  // Get available models and tools
  getAvailableModels(): string[];
  getAvailableTools(): string[];
  
  // Send message to model
  async sendMessage(
    modelName: string,
    message: string,
    abortSignal?: AbortSignal
  ): Promise<string>;
  
  // Conversation management
  clearConversation(modelName: string): void;
  getConversation(modelName: string): ModelMessage[];
}
```

**Configuration:**
```typescript
interface CoreConfig {
  rootDirectory: string;
  maxFileSize?: number;
  allowedExtensions?: string[];
}
```

### Utilities

#### `ModelDetector`

Parses model mentions from user input.

```typescript
class ModelDetector {
  // Detect model mention
  static detectModel(input: string): ModelMention | null;
  
  // Check for mentions
  static hasModelMention(input: string): boolean;
  
  // Get all mentions
  static getAllModels(input: string): string[];
}

interface ModelMention {
  model: string;        // Detected model name
  cleanMessage: string; // Message with @model removed
}
```

## 🔧 Type Definitions

### Core Types

```typescript
// Tool execution result
interface ToolResult {
  llmContent: string | PartListUnion;  // Content for AI model
  returnDisplay: string;               // User-friendly display
}

// Tool location information
interface ToolLocation {
  path: string;
  description?: string;
}

// Tool confirmation details
interface ToolCallConfirmationDetails {
  message: string;
  description: string;
  destructive?: boolean;
}

// Tool schema for AI models
interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
```

### Model Types

```typescript
// Model message format
interface ModelMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

// Model response format
interface ModelResponse {
  message: ModelMessage;
  toolCalls?: ToolCall[];
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}

// Tool call format
interface ToolCall {
  id: string;
  name: string;
  parameters: unknown;
}

// Model configuration
interface ModelConfig {
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}
```

### Error Types

```typescript
enum ToolErrorType {
  VALIDATION_ERROR = 'validation_error',
  EXECUTION_ERROR = 'execution_error', 
  PERMISSION_ERROR = 'permission_error',
  NOT_FOUND_ERROR = 'not_found_error',
  CANCELLED = 'cancelled'
}

class ToolError extends Error {
  constructor(
    message: string,
    public readonly type: ToolErrorType,
    public readonly details?: any
  );
}
```

## 📋 Usage Examples

### Creating a Custom Tool

```typescript
import { z } from 'zod';
import { BaseTool, BaseToolInvocation, ToolResult } from '@open-cli/core';

// Define parameters schema
const CalculatorParams = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
  a: z.number().describe('First number'),
  b: z.number().describe('Second number')
});

// Implement tool invocation
class CalculatorInvocation extends BaseToolInvocation<z.infer<typeof CalculatorParams>, ToolResult> {
  getDescription(): string {
    const { operation, a, b } = this.params;
    return `Calculate: ${a} ${operation} ${b}`;
  }
  
  async execute(abortSignal: AbortSignal): Promise<ToolResult> {
    const { operation, a, b } = this.params;
    
    let result: number;
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': 
        if (b === 0) throw new Error('Division by zero');
        result = a / b; 
        break;
    }
    
    return {
      llmContent: `${a} ${operation} ${b} = ${result}`,
      returnDisplay: `🧮 **Calculator Result**\n\n${a} ${operation} ${b} = **${result}**`
    };
  }
}

// Create tool class
export class CalculatorTool extends BaseTool<z.infer<typeof CalculatorParams>, ToolResult> {
  constructor() {
    super(
      'calculator',
      'Calculator', 
      'Performs basic mathematical operations',
      CalculatorParams
    );
  }
  
  protected createValidatedInvocation(params: z.infer<typeof CalculatorParams>) {
    return new CalculatorInvocation(params);
  }
}
```

### Using the Core System

```typescript
// Load environment variables (if using .env file)
import 'dotenv/config';

import { 
  CoreManager,
  SafetyManager,
  CalculatorTool 
} from '@open-cli/core';

// Create core manager
const coreManager = new CoreManager({
  rootDirectory: process.cwd(),
  maxFileSize: 10 * 1024 * 1024
});

// Add custom tool
const safetyManager = new SafetyManager({ rootDirectory: process.cwd() });
coreManager.toolRegistry.register(new CalculatorTool());

// Send message to model (requires GEMINI_API_KEY or CLAUDE_API_KEY)
const response = await coreManager.sendMessage(
  'gemini',
  'calculate 15 plus 27'
);

console.log(response);
```

This API reference covers the main components and interfaces of Open CLI. For more detailed examples and usage patterns, see the main [README.md](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md) files.