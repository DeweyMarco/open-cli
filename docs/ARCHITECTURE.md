# Architecture Guide

This document provides an in-depth look at Open CLI's architecture, design decisions, and implementation patterns.

## 🏗️ System Overview

Open CLI is built as a **modular monorepo** with a clear separation between the CLI frontend and the core backend. This architecture enables:

- **Extensibility**: Easy to add new tools and models
- **Maintainability**: Clear separation of concerns
- **Testability**: Individual components can be tested in isolation
- **Reusability**: Core functionality can be used in other applications

```
┌─────────────────────────────────────────┐
│                 CLI Layer               │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ CLI Interface│  │  Model Detector │   │
│  └─────────────┘  └─────────────────┘   │
│           │               │             │
│  ┌─────────────────────────────────────┐ │
│  │         Core Manager                │ │
│  └─────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│                Core Layer               │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │Tool Registry│  │  Model Registry │   │
│  └─────────────┘  └─────────────────┘   │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │Safety Manager│  │Built-in Tools   │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

## 📦 Package Structure

### Monorepo Organization

```
open-cli/
├── packages/
│   ├── core/              # Core backend functionality
│   └── cli/               # CLI frontend interface
├── docs/                  # Documentation
├── package.json           # Workspace configuration
├── README.md              # Main documentation
├── CONTRIBUTING.md        # Contribution guidelines
└── CLAUDE.md             # Claude Code guidance
```

### Core Package (`packages/core/`)

The core package contains all the business logic and provides a clean API for the CLI layer.

```
packages/core/src/
├── tools/                 # Tool system
│   ├── BaseTool.ts       # Abstract base class
│   ├── ToolRegistry.ts   # Tool management
│   ├── types.ts          # Tool type definitions
│   └── built-in/         # Built-in tool implementations
│       ├── ReadFileTool.ts
│       ├── WriteFileTool.ts
│       └── ListDirectoryTool.ts
├── models/               # Model system
│   ├── types.ts          # Model interfaces
│   ├── ModelRegistry.ts  # Model management
│   ├── GeminiClient.ts   # Google Gemini client
│   └── ClaudeClient.ts   # Anthropic Claude client
├── safety/               # Safety framework
│   ├── SafetyManager.ts  # File access validation
│   └── ConfirmationManager.ts # User confirmation
└── index.ts              # Public API exports
```

### CLI Package (`packages/cli/`)

The CLI package provides the user interface and orchestrates the core functionality.

```
packages/cli/src/
├── core/                 # CLI orchestration
│   └── CoreManager.ts    # Main orchestration class
├── utils/                # CLI utilities
│   └── ModelDetector.ts  # @model syntax parsing
└── index.ts              # CLI entry point
```

## 🛠️ Core Design Patterns

### Tool System Architecture

The tool system follows the **Command Pattern** with additional safety and validation layers.

#### Tool Lifecycle

```
1. Registration    → Tool registered in ToolRegistry
2. Schema Export   → Tool schema provided to AI models  
3. Invocation      → AI model requests tool execution
4. Validation      → Parameters validated with Zod
5. Safety Check    → File paths and operations validated
6. Confirmation    → User confirmation for destructive operations
7. Execution       → Tool executed with abort signal
8. Result          → Results returned to AI model and user
```

#### Tool Class Hierarchy

```typescript
interface Tool<TParams, TResult>
    ↑
BaseTool<TParams, TResult> (abstract)
    ↑
ReadFileTool, WriteFileTool, ListDirectoryTool, etc.
```

**Key Design Decisions:**

- **Generic Types**: Tools are typed with parameter and result types for type safety
- **Zod Validation**: Runtime parameter validation with compile-time type inference
- **Invocation Pattern**: Separate invocation objects for stateful execution
- **Safety First**: All file operations go through safety validation

### Model System Architecture

The model system uses the **Strategy Pattern** to abstract different AI providers.

#### Model Client Interface

```typescript
interface ModelClient {
  readonly name: string;
  sendMessage(messages, tools?, signal?): Promise<ModelResponse>;
  supportsTools(): boolean;
}
```

**Benefits:**
- **Provider Agnostic**: Same interface for all AI providers
- **Tool Integration**: Unified tool calling across models
- **Extensible**: Easy to add new model providers
- **Testable**: Can mock model clients for testing

#### Message Flow

```
User Input → ModelDetector → CoreManager → ModelClient → AI API
                                   ↑           ↓
                              ToolRegistry ← ToolCalls
                                   ↓           ↑
                              ToolExecution → Results
```

### Safety Framework

The safety framework implements **Defense in Depth** security principles.

#### Safety Layers

1. **Path Validation**: Prevents directory traversal attacks
2. **Root Directory Restriction**: Limits file access to project directory
3. **File Size Limits**: Prevents resource exhaustion
4. **Extension Filtering**: Optional file type restrictions
5. **User Confirmation**: Required approval for destructive operations

#### Safety Manager Validation Process

```typescript
async validateFile(path: string, operation: 'read' | 'write') {
  // 1. Path validation (directory traversal prevention)
  const pathResult = this.validateFilePath(path);
  
  // 2. Extension validation (if configured)
  const extResult = this.validateFileExtension(path);
  
  // 3. Size validation (for existing files)
  const sizeResult = await this.validateFileSize(path);
  
  return { valid: allValid, safePath: resolvedPath };
}
```

## 🔄 Data Flow Architecture

### Request Processing Flow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ User Input  │───▶│ ModelDetector│───▶│ CoreManager │
└─────────────┘    └──────────────┘    └─────────────┘
                                              │
┌─────────────┐    ┌──────────────┐    ┌─────┴─────┐
│Tool Results │◀───│ ToolRegistry │◀───│ModelClient│
└─────────────┘    └──────────────┘    └───────────┘
       │                   │
       ▼                   ▼
┌─────────────┐    ┌──────────────┐
│User Display │    │SafetyManager │
└─────────────┘    └──────────────┘
```

### Conversation Management

Each model maintains separate conversation history:

```typescript
conversations: Map<string, ModelMessage[]> = {
  'gemini' => [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'List files' },
    { role: 'assistant', content: 'I'll list...', toolCalls: [...] },
    { role: 'tool', content: 'file1.txt...', toolCallId: '...' }
  ],
  'claude' => [
    { role: 'user', content: 'Read package.json' },
    // ... separate history
  ]
}
```

## 🏛️ Design Principles

### 1. Safety First

Every operation that could affect the file system goes through safety validation:

- **Principle**: Never trust user input
- **Implementation**: SafetyManager validates all file operations
- **Example**: Reading `/etc/passwd` is blocked, `../../../secret.txt` is prevented

### 2. Type Safety

Strong typing throughout the system prevents runtime errors:

- **Principle**: Fail fast with clear error messages
- **Implementation**: TypeScript strict mode + Zod runtime validation
- **Example**: Tool parameters are validated at both compile time and runtime

### 3. Extensibility

New tools and models can be added without modifying core logic:

- **Principle**: Open for extension, closed for modification
- **Implementation**: Plugin-style architecture with registries
- **Example**: Adding a new tool requires implementing BaseTool interface

### 4. Separation of Concerns

Clear boundaries between different system components:

- **Principle**: Each component has a single responsibility
- **Implementation**: CLI ↔ Core ↔ Models/Tools separation
- **Example**: CLI handles UI, Core handles orchestration, Tools handle operations

### 5. Testability

Components can be tested in isolation:

- **Principle**: Dependencies are injected, not hard-coded
- **Implementation**: Constructor injection and interface-based design
- **Example**: CoreManager accepts injected registries for testing

## 🔧 Implementation Details

### Tool Parameter Validation

Tools use Zod schemas for runtime validation with TypeScript integration:

```typescript
const ReadFileParams = z.object({
  path: z.string().describe('Absolute path to the file'),
  offset: z.number().optional().describe('Starting line number'),
  limit: z.number().optional().describe('Maximum lines to read')
});

type ReadFileParams = z.infer<typeof ReadFileParams>;
```

**Benefits:**
- **Runtime Safety**: Invalid parameters are caught before execution
- **Type Inference**: TypeScript types derived from schemas
- **Documentation**: Descriptions provide context for AI models
- **Validation Messages**: Clear error messages for debugging

### Model API Abstraction

Each model client handles the specifics of its API while presenting a unified interface:

#### Gemini Implementation Details

```typescript
// Convert internal format to Gemini API format
private convertMessages(messages: ModelMessage[]): GeminiMessage[] {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
}
```

#### Claude Implementation Details

```typescript
// Convert internal format to Claude API format  
private convertMessages(messages: ModelMessage[]): ClaudeMessage[] {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));
}
```

### Error Handling Strategy

Comprehensive error handling with user-friendly messages:

```typescript
// Tool errors are typed and descriptive
class ToolError extends Error {
  constructor(
    message: string,
    public readonly type: ToolErrorType,
    public readonly details?: any
  ) {
    super(message);
  }
}

// Safety errors explain what was blocked and why
if (!validation.valid) {
  throw new ToolError(
    `File access denied: ${validation.reason}`,
    ToolErrorType.PERMISSION_ERROR,
    { requestedPath: filePath, rootDirectory: this.config.rootDirectory }
  );
}
```

## 🚀 Performance Considerations

### Lazy Loading

- **Tool Registration**: Tools are instantiated once and reused
- **Model Clients**: Created on-demand when first accessed
- **File Operations**: Streamed for large files (future enhancement)

### Memory Management

- **Conversation History**: Stored in memory, could be persisted for large conversations
- **Tool Results**: Processed immediately, not stored long-term
- **Schema Caching**: Tool schemas cached after first generation

### Concurrency

- **AbortSignal**: All async operations support cancellation
- **Single-threaded**: Node.js event loop handles concurrency
- **Tool Execution**: One tool at a time per conversation

## 🔮 Future Architecture Enhancements

### Phase 2: Advanced Tools

```
packages/core/src/tools/
├── built-in/
│   ├── file/           # File operations
│   ├── git/            # Git integration  
│   ├── shell/          # Shell commands
│   └── code/           # Code analysis
├── external/           # External tool integrations
└── custom/             # User-defined tools
```

### Phase 3: Workflow Orchestration

```
packages/core/src/
├── workflows/          # Multi-step workflows
│   ├── WorkflowEngine.ts
│   ├── WorkflowRegistry.ts
│   └── built-in/
└── bridges/            # Cross-model communication
    ├── ConversationBridge.ts
    └── ContextManager.ts
```

### Phase 4: Enterprise Features

```
packages/
├── core/               # Core functionality
├── cli/                # CLI interface
├── server/             # API server
├── web/                # Web interface
└── plugins/            # Plugin system
```

## 📚 Architectural References

This architecture is inspired by:

- **Gemini CLI**: Tool system and safety patterns
- **VS Code**: Extension and contribution point patterns  
- **ESLint**: Plugin architecture and rule registration
- **Webpack**: Loader and plugin systems
- **Express.js**: Middleware patterns for tool execution

The design emphasizes **developer experience**, **safety**, and **extensibility** while maintaining **simplicity** in the core abstractions.