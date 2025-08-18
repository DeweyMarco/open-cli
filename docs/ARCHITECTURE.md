# Enterprise Architecture Guide

This document details Open CLI's production-grade architecture, enterprise patterns, and professional implementation decisions.

## 🏗️ Enterprise System Overview

Open CLI implements a **hexagonal architecture** with enterprise patterns including structured logging, comprehensive error handling, security hardening, and professional configuration management.

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLI Layer                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │     CLI     │  │Model Detector│  │   Signal Handling       │ │
│  │  Interface  │  │   & Parser   │  │   & Error Recovery      │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                      Core Manager                               │
│  Professional orchestration with error handling & monitoring   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                   Enterprise Core Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │
│  │Configuration│ │   Logging   │ │    Error    │ │ Security  │  │
│  │ Management  │ │  Framework  │ │  Hierarchy  │ │ Hardening │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │
│  │    Model    │ │    Tool     │ │    Rate     │ │   Input   │  │
│  │ Abstraction │ │  Execution  │ │  Limiting   │ │Validation │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Professional Package Structure

### Enterprise Monorepo Organization

```
open-cli/
├── packages/
│   ├── core/                    # Enterprise core business logic
│   │   ├── src/
│   │   │   ├── config/          # Configuration management system
│   │   │   │   ├── ConfigSchema.ts      # Zod validation schemas
│   │   │   │   ├── ConfigLoader.ts      # Multi-source config loading
│   │   │   │   └── ConfigManager.ts     # Centralized config access
│   │   │   ├── errors/          # Professional error hierarchy
│   │   │   │   ├── BaseError.ts         # Foundation error class
│   │   │   │   ├── DomainErrors.ts      # Specific error types
│   │   │   │   └── ErrorUtils.ts        # Error utilities & retry
│   │   │   ├── logging/         # Structured logging framework
│   │   │   │   └── Logger.ts            # Professional logger
│   │   │   ├── security/        # Security hardening layer
│   │   │   │   ├── SecureSafetyManager.ts   # Path traversal protection
│   │   │   │   ├── RateLimiter.ts           # Rate limiting algorithms
│   │   │   │   └── InputValidator.ts       # Input sanitization
│   │   │   ├── models/          # Type-safe AI model integrations
│   │   │   │   ├── api-types/           # Comprehensive API types
│   │   │   │   │   ├── GeminiTypes.ts   # Complete Gemini types
│   │   │   │   │   └── ClaudeTypes.ts   # Complete Claude types
│   │   │   │   ├── ClaudeClient.ts      # Enterprise Claude client
│   │   │   │   ├── GeminiClient.ts      # Enterprise Gemini client
│   │   │   │   └── ModelRegistry.ts     # Model management
│   │   │   ├── tools/           # Tool execution framework
│   │   │   │   ├── built-in/            # Core development tools
│   │   │   │   ├── BaseTool.ts          # Tool foundation
│   │   │   │   └── ToolRegistry.ts      # Tool management
│   │   │   └── safety/          # Legacy safety (deprecated)
│   │   └── tsconfig.json        # Strict TypeScript config
│   └── cli/                     # Professional CLI interface
│       ├── src/
│       │   ├── core/            # CLI orchestration
│       │   │   └── CoreManager.ts       # Professional orchestration
│       │   ├── utils/           # CLI utilities
│       │   │   └── ModelDetector.ts     # Robust input parsing
│       │   └── index.ts         # CLI entry point with signal handling
│       └── tsconfig.json
├── .eslintrc.json              # Professional ESLint configuration
├── .prettierrc.json            # Code formatting standards
├── jest.config.js              # Testing infrastructure
├── jest.setup.js               # Test utilities and globals
└── package.json                # Workspace configuration
```

## 🏛️ Enterprise Design Patterns

### 1. Hexagonal Architecture (Ports & Adapters)

**Core Business Logic** is isolated from external concerns:

```typescript
// Port (Interface)
interface ModelClient {
  sendMessage(messages: ModelMessage[]): Promise<ModelResponse>;
}

// Adapter (Implementation) 
class GeminiClient implements ModelClient {
  // Gemini-specific implementation details
}

class ClaudeClient implements ModelClient {  
  // Claude-specific implementation details
}
```

**Benefits:**
- **Testability**: Easy to mock external dependencies
- **Flexibility**: Swap implementations without changing business logic
- **Isolation**: Core logic unaffected by external API changes

### 2. Domain-Driven Design (DDD)

**Error Hierarchy** reflects business domains:

```typescript
// Domain-specific errors
class ApiError extends BaseError {
  constructor(message: string, statusCode: number, apiName: string) {
    super(message, 'API_ERROR', ErrorCategory.EXTERNAL_SERVICE);
  }
}

class SecurityError extends BaseError {
  constructor(message: string, securityViolation: string) {
    super(message, 'SECURITY_ERROR', ErrorCategory.AUTHORIZATION);
  }
}
```

### 3. Dependency Injection & Inversion of Control

**Professional dependency management:**

```typescript
export class CoreManager {
  constructor(
    private readonly config: CoreConfig,
    private readonly logger: ILogger,
    private readonly securityManager: SecureSafetyManager,
    private readonly rateLimiter: RateLimiter
  ) {
    // Dependencies injected, not created internally
  }
}
```

### 4. Observer Pattern for Configuration

**Event-driven configuration updates:**

```typescript
configManager.on('configChanged', (event: ConfigChangeEvent) => {
  logger.info('Configuration updated', {
    changedKeys: Object.keys(event.changes),
    source: event.source
  });
});
```

### 5. Strategy Pattern for Rate Limiting

**Multiple algorithm implementations:**

```typescript
enum RateLimitAlgorithm {
  TOKEN_BUCKET = 'token_bucket',
  SLIDING_WINDOW = 'sliding_window', 
  FIXED_WINDOW = 'fixed_window'
}

class RateLimiter {
  constructor(algorithm: RateLimitAlgorithm) {
    this.strategy = this.createStrategy(algorithm);
  }
}
```

## 🔒 Security Architecture

### Defense in Depth Strategy

**Multiple security layers protect against various attack vectors:**

#### Layer 1: Input Validation & Sanitization
```typescript
class InputValidator {
  validateString(input: string, rules: ValidationRule): ValidationResult {
    // Comprehensive validation against injection attacks
    const securityResult = this.checkForMaliciousContent(input);
    const sanitized = this.defaultSanitizer(input);
    return { valid: errors.length === 0, sanitized, errors, warnings };
  }
}
```

#### Layer 2: Path Traversal Protection  
```typescript
class SecureSafetyManager {
  async validateFilePath(requestedPath: string): Promise<SecurityValidationResult> {
    // Canonical path resolution prevents symlink attacks
    const canonicalPath = await realpath(path.resolve(requestedPath));
    const canonicalRoot = await realpath(path.resolve(this.rootDirectory));
    
    if (!this.isWithinRoot(canonicalPath, canonicalRoot)) {
      return { allowed: false, reason: 'Path outside allowed root' };
    }
  }
}
```

#### Layer 3: Rate Limiting
```typescript
class RateLimiter {
  async consume(key: string): Promise<void> {
    const result = this.checkLimit(key);
    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded`,
        result.retryAfter,
        'api_requests'
      );
    }
  }
}
```

#### Layer 4: Content Size Protection
```typescript
validateContentSize(content: string): SecurityValidationResult {
  const size = Buffer.byteLength(content, 'utf-8');
  if (size > this.config.maxRequestSize) {
    return { 
      allowed: false, 
      reason: `Content size exceeds limit (${size} > ${this.config.maxRequestSize})` 
    };
  }
}
```

## 📊 Observability Architecture

### Structured Logging Framework

**Professional logging with correlation and context:**

```typescript
class Logger implements ILogger {
  private log(level: LogLevel, message: string, error?: Error, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.config.context,
      metadata,
      error,
      correlationId: this.generateCorrelationId()
    };
    
    this.output(entry);
  }
}
```

**Usage throughout the system:**
```typescript
// Contextual logging with structured metadata
this.logger.info('API request started', {
  model: 'gemini',
  messageCount: messages.length,
  toolsAvailable: tools?.length ?? 0,
  requestId: correlationId
});

this.logger.error('API request failed', error, {
  model: 'gemini',
  statusCode: response.status,
  retryAttempt: attempt
});
```

### Error Correlation & Tracking

**Professional error handling with correlation:**

```typescript
class BaseError extends Error {
  public readonly correlationId: string;
  public readonly timestamp: Date;
  
  constructor(message: string, code: string, category: ErrorCategory) {
    super(message);
    this.correlationId = this.generateCorrelationId();
    this.timestamp = new Date();
  }
  
  toJSON(): SerializableError {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString()
    };
  }
}
```

### Configuration Management

**Centralized configuration with validation:**

```typescript
class ConfigManager {
  async initialize(sources?: ConfigSource[]): Promise<void> {
    const result = await this.loader.loadConfig(sources);
    
    // Validate configuration
    const parseResult = AppConfigSchema.safeParse(result.config);
    if (!parseResult.success) {
      throw new ConfigurationError('Configuration validation failed');
    }
    
    this.logger.info('Configuration loaded successfully', {
      sources: result.sources,
      warningCount: result.warnings.length
    });
  }
}
```

## 🚀 Performance Architecture

### Lazy Loading & Resource Management

**Efficient resource utilization:**

```typescript
class ModelRegistry {
  private clients = new Map<string, ModelClient>();
  
  getModel(name: string): ModelClient | undefined {
    if (!this.clients.has(name)) {
      // Lazy initialization on first access
      this.clients.set(name, this.createModel(name));
    }
    return this.clients.get(name);
  }
}
```

### Connection Pooling & Retry Logic

**Professional API client implementation:**

```typescript
class GeminiClient {
  private async sendMessageWithRetry(): Promise<Result<ModelResponse>> {
    return ErrorUtils.retry(
      () => this.sendMessageInternal(),
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        retryableErrors: [NetworkError, ApiError]
      }
    );
  }
}
```

### Memory Management

**Controlled resource usage:**

```typescript
class RateLimiter {
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now - entry.lastRequest > this.config.windowSizeMs) {
        this.entries.delete(key);
      }
    }
  }
}
```

## 🔧 Type Safety Architecture

### Comprehensive Type Definitions

**100% type safety throughout the system:**

```typescript
// API-specific types eliminate 'any' usage
interface GeminiResponse {
  candidates: GeminiCandidate[];
  promptFeedback?: GeminiPromptFeedback;
  usageMetadata?: GeminiUsageMetadata;
}

interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ClaudeContentBlock[];
  model: string;
  stop_reason: ClaudeStopReason;
  usage: ClaudeUsage;
}
```

### Runtime Validation with Compile-time Safety

**Zod schemas provide both:**

```typescript
export const AppConfigSchema = z.object({
  environment: z.enum(['development', 'production', 'test']),
  models: z.object({
    gemini: ModelConfigSchema.optional(),
    claude: ModelConfigSchema.optional()
  }),
  security: SecurityConfigSchema,
  logging: LoggingConfigSchema
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
```

### Result Types for Error-Safe Operations

**Professional error handling:**

```typescript
export type Result<T, E extends Error = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

public static async safeAsync<T>(operation: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
```

## 🔮 Scalability Considerations

### Horizontal Scaling Preparation

**Stateless design enables scaling:**
- **Configuration**: Externalized and reloadable
- **Sessions**: Model conversations could be persisted to external store
- **Rate Limiting**: Could be moved to Redis for distributed systems
- **Logging**: Structured for aggregation in log management systems

### Plugin Architecture Foundation

**Extensibility without core modifications:**

```typescript
interface ToolPlugin {
  name: string;
  version: string;
  tools: ToolConstructor[];
  initialize(context: PluginContext): Promise<void>;
}

class PluginManager {
  async loadPlugin(plugin: ToolPlugin): Promise<void> {
    await plugin.initialize(this.createContext());
    plugin.tools.forEach(Tool => {
      this.toolRegistry.register(new Tool());
    });
  }
}
```

## 📚 Enterprise Architecture References

**Inspired by production systems:**

- **Kubernetes**: Configuration management and validation patterns
- **AWS SDK**: Error handling and retry logic with exponential backoff  
- **Istio**: Rate limiting algorithms and security policies
- **Elasticsearch**: Structured logging and correlation IDs
- **Spring Framework**: Dependency injection and aspect-oriented programming
- **Microservices Patterns**: Circuit breaker, bulkhead, and timeout patterns

This architecture prioritizes **production readiness**, **security**, **observability**, and **maintainability** while enabling **horizontal scaling** and **extensibility** for enterprise environments.