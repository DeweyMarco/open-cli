# Open CLI Project

## Overview
A multi-model AI development assistant built in TypeScript with a modular architecture. Provides an interactive REPL interface that allows users to interact with multiple AI models (Gemini and Claude) through a unified interface with built-in development tools.

## Project Structure
```
open-cli/
├── packages/
│   ├── cli/                    # CLI application
│   │   ├── src/
│   │   │   ├── index.ts        # Main entry point
│   │   │   ├── core/
│   │   │   │   └── CoreManager.ts  # Orchestrates models and tools
│   │   │   └── utils/
│   │   │       └── ModelDetector.ts # Parses @model syntax
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── core/                   # Core functionality
│       ├── src/
│       │   ├── models/         # AI model clients
│       │   │   ├── GeminiClient.ts
│       │   │   ├── ClaudeClient.ts
│       │   │   ├── ModelRegistry.ts
│       │   │   └── types.ts
│       │   ├── tools/          # Built-in development tools
│       │   │   ├── built-in/
│       │   │   │   ├── ReadFileTool.ts
│       │   │   │   ├── WriteFileTool.ts
│       │   │   │   └── ListDirectoryTool.ts
│       │   │   ├── ToolRegistry.ts
│       │   │   └── types.ts
│       │   └── safety/         # Security and confirmation
│       │       ├── SafetyManager.ts
│       │       └── ConfirmationManager.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json                # Workspace root
└── CLAUDE.md                   # This documentation
```

## Key Features
- **Interactive REPL interface** with `You: ` prompt
- **Multi-model support** with `@modelname` syntax
- **Built-in development tools** for file operations
- **Separate conversation histories** for each model
- **Safety and confirmation system** for destructive operations
- **TypeScript** with ES modules
- **Monorepo workspace** architecture
- **Ctrl-C twice to quit** functionality

## Models and APIs
### Gemini (Google)
- Model: `gemini-2.5-flash`
- Endpoint: Gemini API v1beta
- Auth: `GEMINI_API_KEY` environment variable
- Features: Tool calling, conversation history

### Claude (Anthropic)
- Model: `claude-3-5-sonnet-20241022`
- Endpoint: Claude Messages API v1
- Auth: `CLAUDE_API_KEY` environment variable
- Features: Tool calling, conversation history

## Built-in Tools
The system includes development tools that AI models can use:

### ReadFileTool
- Read file contents with safety checks
- Respects file size limits (10MB default)
- Security validation for file paths

### WriteFileTool
- Write content to files with user confirmation
- Safety checks for overwrite protection
- Path validation and directory creation

### ListDirectoryTool
- List directory contents
- Filter by file patterns
- Security boundaries enforcement

## Safety System
### SafetyManager
- **File size limits** (configurable, 10MB default)
- **Root directory boundaries** (prevents access outside project)
- **Path validation** (prevents directory traversal attacks)
- **Extension filtering** (optional allow/deny lists)

### ConfirmationManager
- **User confirmation** for destructive operations
- **Interactive prompts** for file overwrites
- **Operation details** display before execution

## Environment Setup
```bash
export GEMINI_API_KEY="your_gemini_api_key_here"
export CLAUDE_API_KEY="your_claude_api_key_here"
```

Or create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here
```

## Usage Examples
### Basic interactions
- `@gemini hello` - Basic greeting to Gemini
- `@claude write a function` - Request code from Claude

### With development tools
- `@gemini read package.json` - Read and analyze project files
- `@claude write a new component to src/Button.tsx` - Create new files
- `@gemini list all TypeScript files` - Explore project structure

### Multi-turn conversations
Each model maintains separate conversation history, allowing for context-aware multi-turn interactions.

## Development Commands
```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build project
npm run build

# Run tests
npm test

# Start production
npm start
```

## Architecture Notes
- **Monorepo** with npm workspaces
- **TypeScript** with strict type checking
- **ES modules** (`type: "module"`)
- **Modular design** with clear separation of concerns
- **Plugin architecture** for extensible tool system
- **Security-first** approach with comprehensive safety checks