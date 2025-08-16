# API Reference

This document provides a comprehensive API reference for Open CLI's core components.

## 📦 Core Package (`@open-cli/core`)

### Tool System

#### `BaseTool<TParams, TResult>`

Abstract base class for creating new tools.

```typescript
abstract class BaseTool<TParams extends object, TResult extends ToolResult> {
  constructor(
    name: string,           // Internal tool name
    displayName: string,    // User-friendly name  
    description: string,    // Description for AI models
    parameterSchema: z.ZodSchema<TParams>  // Zod validation schema
  );

  // Get tool schema for LLM consumption
  getSchema(): ToolSchema;
  
  // Create validated tool invocation
  createInvocation(params: unknown): ToolInvocation<TParams, TResult>;
  
  // Override in subclasses
  protected abstract createValidatedInvocation(params: TParams): ToolInvocation<TParams, TResult>;
}
```

**Example Usage:**
```typescript
const MyToolParams = z.object({
  message: z.string().describe('Message to process')
});

class MyTool extends BaseTool<z.infer<typeof MyToolParams>, ToolResult> {
  constructor() {
    super('my_tool', 'My Tool', 'Processes messages', MyToolParams);
  }
  
  protected createValidatedInvocation(params: z.infer<typeof MyToolParams>) {
    return new MyToolInvocation(params);
  }
}
```

#### `ToolInvocation<TParams, TResult>`

Represents a specific tool execution instance.

```typescript
interface ToolInvocation<TParams extends object, TResult extends ToolResult> {
  params: TParams;
  
  // Get human-readable description
  getDescription(): string;
  
  // Get affected file paths
  getToolLocations(): ToolLocation[];
  
  // Check if confirmation needed
  shouldConfirmExecute(abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false>;
  
  // Execute the tool
  execute(abortSignal: AbortSignal, updateOutput?: (output: string) => void): Promise<TResult>;
}
```

#### `ToolRegistry`

Manages and executes tools.

```typescript
class ToolRegistry {
  // Register a tool
  register<TParams extends object, TResult extends ToolResult>(
    tool: Tool<TParams, TResult>
  ): void;
  
  // Get all tool schemas for AI models
  getAllSchemas(): ToolSchema[];
  
  // Get specific tool
  getTool(name: string): Tool<any, any> | undefined;
  
  // Create tool invocation from call
  createInvocation(toolCall: ToolCall): ToolInvocation<any, any>;
  
  // Utility methods
  getToolNames(): string[];
  hasTool(name: string): boolean;
  unregister(name: string): boolean;
  clear(): void;
}
```

**Example Usage:**
```typescript
const registry = new ToolRegistry();
registry.register(new ReadFileTool(safetyManager));
registry.register(new WriteFileTool(safetyManager));

const schemas = registry.getAllSchemas(); // For AI models
const invocation = registry.createInvocation({
  name: 'read_file',
  parameters: { path: './file.txt' }
});
```

### Model System

#### `ModelClient`

Interface for AI model implementations.

```typescript
interface ModelClient {
  readonly name: string;
  
  // Send message and get response
  sendMessage(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse>;
  
  // Check tool support
  supportsTools(): boolean;
}
```

#### `ModelRegistry`

Manages AI model clients.

```typescript
class ModelRegistry {
  // Register model client
  registerModel(name: string, client: ModelClient): void;
  
  // Create model from config
  createModel(provider: ModelProvider, name: string, config: ModelConfig): ModelClient;
  
  // Get model client
  getModel(name: string): ModelClient | undefined;
  
  // Utility methods
  getAvailableModels(): string[];
  hasModel(name: string): boolean;
  removeModel(name: string): boolean;
  clear(): void;
}
```

#### `GeminiClient`

Google Gemini API client implementation.

```typescript
class GeminiClient implements ModelClient {
  readonly name = 'gemini';
  
  constructor(config: ModelConfig);
  
  async sendMessage(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse>;
  
  supportsTools(): boolean; // Returns true
}
```

#### `ClaudeClient`

Anthropic Claude API client implementation.

```typescript
class ClaudeClient implements ModelClient {
  readonly name = 'claude';
  
  constructor(config: ModelConfig);
  
  async sendMessage(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse>;
  
  supportsTools(): boolean; // Returns true
}
```

### Safety System

#### `SafetyManager`

Validates file operations for security.

```typescript
class SafetyManager {
  constructor(config: SafetyConfig);
  
  // Validate file path
  validateFilePath(filePath: string): { 
    valid: boolean; 
    reason?: string; 
    safePath?: string; 
  };
  
  // Validate file extension
  validateFileExtension(filePath: string): { 
    valid: boolean; 
    reason?: string; 
  };
  
  // Validate file size
  async validateFileSize(filePath: string): Promise<{ 
    valid: boolean; 
    reason?: string; 
  }>;
  
  // Comprehensive validation
  async validateFile(filePath: string, operation: 'read' | 'write'): Promise<{ 
    valid: boolean; 
    reason?: string; 
    safePath?: string; 
  }>;
}
```

**Configuration:**
```typescript
interface SafetyConfig {
  rootDirectory: string;           // Base directory for operations
  allowedExtensions?: string[];    // Allowed file extensions
  blockedPaths?: string[];         // Blocked relative paths
  maxFileSize?: number;            // Maximum file size in bytes
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