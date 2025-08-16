# Open CLI

> **Multi-Model AI Development Assistant with Unified Tool System**

Open CLI is a professional command-line interface that provides a unified tool system across different AI models. Built with TypeScript and following modular architecture patterns, it allows developers to use `@model` syntax to choose which AI model handles their requests while maintaining access to the same powerful set of development tools.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/)

## 🎯 Key Features

- **🤖 Multi-Model Support**: Seamlessly switch between Gemini, Claude, and other AI models
- **🛠️ Unified Tool System**: Same powerful tools work with any model
- **🔒 Safety-First Design**: Comprehensive file access validation and user confirmation
- **📁 File Operations**: Read, write, and list files with rich formatting
- **💬 Conversation Management**: Separate history maintained per model
- **🏗️ Extensible Architecture**: Easy to add new tools and models
- **⚡ Interactive REPL**: Responsive command-line interface with error handling

## 🚀 Quick Start

### Prerequisites

- **Node.js 20 or higher** ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- **API Keys** for at least one AI model (see [Getting API Keys](#getting-api-keys) below)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd open-cli

# Install dependencies
npm install

# Build the project
npm run build
```

### Getting API Keys

#### Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key (starts with `AIza...`)

#### Anthropic Claude API Key  
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account and navigate to "API Keys"
3. Create a new API key (starts with `sk-ant...`)

### Setting Up Environment Variables

**Option 1: Export commands (temporary)**
```bash
export GEMINI_API_KEY="your-gemini-api-key-here"
export CLAUDE_API_KEY="your-claude-api-key-here"
```

**Option 2: Create .env file (recommended)**
```bash
# Create .env file in project root
echo "GEMINI_API_KEY=your-gemini-api-key-here" > .env
echo "CLAUDE_API_KEY=your-claude-api-key-here" >> .env

# Make sure .env is in .gitignore (already included)
```

### Starting the CLI

**Method 1: Using npm (recommended)**
```bash
# Start the CLI
npm start
```

**Method 2: Direct execution**
```bash
# If you need to pass environment variables directly
GEMINI_API_KEY="your-key" CLAUDE_API_KEY="your-key" npm start

# Or run the built JavaScript directly
GEMINI_API_KEY="your-key" node packages/cli/dist/index.js
```

### What You'll See on Startup

When you start Open CLI successfully, you'll see:

```
🚀 **Open CLI** - Multi-Model AI Development Assistant
   Press Ctrl-C twice to quit

📡 **Available models:**
   ✅ @gemini
   ✅ @claude

🛠️  **Available tools:**
   🔧 read_file
   🔧 write_file
   🔧 list_directory

💡 **Usage:** @modelname your message here
   Example: @gemini read the package.json file
   Example: @claude write a function to calculate fibonacci

You: 
```

### First Commands

Try these commands to get started:

```bash
# List directory contents
@gemini list the current directory

# Read a file
@claude read the package.json file

# Write a new file
@gemini write a hello world script to hello.js

# Ask for help
@claude what can you help me with?

# Exit the CLI
# Press Ctrl-C twice to quit safely
```

### Troubleshooting

#### "No models configured" Error

If you see this message:
```
📡 **Available models:**
   ❌ No models configured. Please set API keys:
   - GEMINI_API_KEY for Google Gemini
   - CLAUDE_API_KEY for Anthropic Claude
```

**Solutions:**
1. **Check your API keys are set:**
   ```bash
   echo $GEMINI_API_KEY  # Should show your key
   echo $CLAUDE_API_KEY  # Should show your key
   ```

2. **For .env file users:** Make sure the .env file is in the project root and restart the CLI

3. **Try direct environment variable passing:**
   ```bash
   GEMINI_API_KEY="your-key" npm start
   ```

#### Build Errors

```bash
# Clean and rebuild if you get build errors
rm -rf packages/*/dist
npm run build
```

#### Permission Errors

Make sure you're running the CLI in a directory where you have read/write permissions. Open CLI restricts file operations to the current directory for security.

#### API Key Errors

- **Gemini keys** start with `AIza...`
- **Claude keys** start with `sk-ant...`
- Make sure there are no extra spaces or quotes in your keys
- Verify your API keys are active in the respective consoles

## 📚 Documentation

### Usage Examples

#### Basic File Operations

```bash
# List files in current directory
@gemini list the files here

# Read a specific file
@claude read the src/index.ts file

# Write content to a file
@gemini write "console.log('Hello World!')" to hello.js

# List files with hidden files shown
@claude list the directory including hidden files
```

#### Model Switching

```bash
# Use different models for different tasks
@gemini analyze this codebase structure
@claude suggest improvements for the code
@gemini implement the suggested changes
```

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `read_file` | Read file contents with syntax highlighting | `path`, `offset?`, `limit?` |
| `write_file` | Write content to a file | `path`, `content`, `create_dirs?` |
| `list_directory` | List directory contents with file info | `path`, `show_hidden?`, `recursive?` |

### Supported Models

| Model | Provider | Model Version | Capabilities |
|-------|----------|---------------|--------------|
| `@gemini` | Google | gemini-2.5-flash | Function calling, file ops |
| `@claude` | Anthropic | claude-3-5-sonnet-20241022 | Function calling, file ops |

## 🏗️ Architecture

Open CLI follows a modular monorepo structure inspired by professional CLI tools:

```
open-cli/
├── packages/
│   ├── core/           # Backend logic, tools, models, safety
│   │   ├── src/
│   │   │   ├── tools/      # Tool system (BaseTool, ToolRegistry, built-in tools)
│   │   │   ├── models/     # Model clients (Gemini, Claude, ModelRegistry)
│   │   │   ├── safety/     # Safety framework (SafetyManager, ConfirmationManager)
│   │   │   └── index.ts    # Core exports
│   │   └── dist/       # Compiled JavaScript
│   └── cli/            # Frontend CLI interface
│       ├── src/
│       │   ├── core/       # CoreManager orchestration
│       │   ├── utils/      # ModelDetector and utilities
│       │   └── index.ts    # CLI entry point
│       └── dist/       # Compiled JavaScript
├── docs/               # Documentation files
│   ├── API.md          # API documentation  
│   ├── ARCHITECTURE.md # Architecture details
│   ├── EXAMPLES.md     # Usage examples
│   └── SECURITY.md     # Security guidelines
├── CLAUDE.md           # Claude Code guidance
├── CHANGELOG.md        # Version history
├── CONTRIBUTING.md     # Contribution guidelines
├── package.json        # Workspace configuration
└── README.md          # This file
```

### Core Components

#### 🛠️ Tool System (`packages/core/src/tools/`)

The tool system is the heart of Open CLI, providing a unified interface for AI models to interact with the local environment.

**Key Classes:**
- **`BaseTool`**: Abstract base class for all tools
- **`ToolRegistry`**: Manages and executes tools
- **`ToolInvocation`**: Represents a specific tool execution

**Built-in Tools:**
- **`ReadFileTool`**: Safe file reading with path validation
- **`WriteFileTool`**: File writing with confirmation
- **`ListDirectoryTool`**: Directory listing with rich output

#### 🤖 Model System (`packages/core/src/models/`)

Provides a unified interface for different AI model providers.

**Key Classes:**
- **`ModelClient`**: Interface for all model implementations  
- **`ModelRegistry`**: Manages available models and creates instances
- **`GeminiClient`**: Google Gemini API integration (gemini-2.5-flash)
- **`ClaudeClient`**: Anthropic Claude API integration (claude-3-5-sonnet-20241022)

#### 🔒 Safety Framework (`packages/core/src/safety/`)

Ensures secure operation by validating file access and requiring user confirmation.

**Key Classes:**
- **`SafetyManager`**: Validates file paths and operations
- **`ConfirmationManager`**: Handles user confirmation workflows

#### 💻 CLI Interface (`packages/cli/src/`)

Provides the interactive command-line experience.

**Key Classes:**
- **`CoreManager`**: Orchestrates models and tools
- **`ModelDetector`**: Parses `@model` syntax from user input
- **`OpenCLI`**: Main CLI application class

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Optional* | `AIza...` |
| `CLAUDE_API_KEY` | Anthropic Claude API key | Optional* | `sk-ant-...` |

*At least one API key is required for the CLI to function.

### Safety Configuration

The CLI operates within a safe sandbox by default:

- **Root Directory**: Restricted to the directory where CLI was started
- **Path Validation**: Prevents access to system files (`/etc/`, `../../../`)
- **File Size Limits**: 10MB maximum file size
- **Confirmation**: Required for destructive operations

## 🔧 Development

### Project Structure

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start development mode (watch for changes)
npm run dev

# Run tests
npm run test

# Start the CLI
npm start
```

### Building From Source

```bash
# Clone and setup
git clone <repository-url>
cd open-cli
npm install

# Build packages individually
npm run build --workspace=packages/core
npm run build --workspace=packages/cli

# Or build all at once
npm run build
```

### Adding New Tools

1. Create a new tool in `packages/core/src/tools/built-in/`:

```typescript
import { z } from 'zod';
import { BaseTool, BaseToolInvocation } from '../BaseTool.js';
import { ToolResult } from '../types.js';

const MyToolParams = z.object({
  parameter: z.string().describe('Tool parameter description')
});

class MyToolInvocation extends BaseToolInvocation<typeof MyToolParams._type, ToolResult> {
  getDescription(): string {
    return `My tool with parameter: ${this.params.parameter}`;
  }
  
  async execute(abortSignal: AbortSignal): Promise<ToolResult> {
    // Tool implementation
    return {
      llmContent: 'Tool executed successfully',
      returnDisplay: '✅ Tool completed'
    };
  }
}

export class MyTool extends BaseTool<typeof MyToolParams._type, ToolResult> {
  constructor() {
    super('my_tool', 'My Tool', 'Description of what my tool does', MyToolParams);
  }
  
  protected createValidatedInvocation(params: typeof MyToolParams._type) {
    return new MyToolInvocation(params);
  }
}
```

2. Register the tool in `packages/core/src/index.ts` and `packages/cli/src/core/CoreManager.ts`.

### Adding New Models

1. Create a model client in `packages/core/src/models/`:

```typescript
import { ModelClient, ModelMessage, ModelResponse } from './types.js';

export class MyModelClient implements ModelClient {
  readonly name = 'mymodel';
  
  async sendMessage(messages: ModelMessage[]): Promise<ModelResponse> {
    // API integration implementation
  }
  
  supportsTools(): boolean {
    return true;
  }
}
```

2. Add to `ModelRegistry.createModel()` and update environment setup.

## 🧪 Testing

### Current Testing Status

The project has been validated through manual testing and integration tests. Automated test suites are planned for future releases.

```bash
# Test command (currently shows placeholder)
npm run test
```

### Manual Testing Completed

- ✅ CLI startup and error handling
- ✅ Model detection and validation  
- ✅ Tool system and registry
- ✅ File operations with safety
- ✅ End-to-end workflows
- ✅ Safety framework validation

### Testing Your Installation

You can verify your installation works by running these test commands:

```bash
# Start the CLI and test basic functionality
npm start

# In the CLI, try:
@gemini list the current directory
@claude read the package.json file
```

If these commands work without errors, your installation is successful!

## 🚧 Roadmap

### Phase 1: Core Tool System ✅
- [x] Multi-model architecture
- [x] Basic file operations (read, write, list)
- [x] Safety framework
- [x] Interactive CLI

### Phase 2: Advanced Development Tools 🔄
- [ ] Git integration tools
- [ ] Shell command execution with safety
- [ ] Code analysis tools
- [ ] Project scaffolding

### Phase 3: Workflow Orchestration 📋
- [ ] Multi-model workflows
- [ ] Conversation bridging
- [ ] Pipeline creation
- [ ] Task automation

### Phase 4: Enterprise Features 📈
- [ ] Team collaboration
- [ ] Plugin system
- [ ] Custom tool development
- [ ] Integration APIs

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- **TypeScript**: Use strict typing throughout
- **Testing**: Add tests for new features
- **Documentation**: Update docs for API changes
- **Safety**: Consider security implications
- **Architecture**: Follow existing patterns

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the [Gemini CLI](https://github.com/google-gemini/gemini-cli) architecture
- Built with [TypeScript](https://www.typescriptlang.org/) and [Node.js](https://nodejs.org/)
- Uses [Zod](https://github.com/colinhacks/zod) for runtime validation

## 📞 Support

- **Issues**: Create GitHub Issues when repository is published
- **Discussions**: GitHub Discussions will be available when repository is published  
- **Documentation**: [CLAUDE.md](CLAUDE.md) for development guidance

---

**Open CLI** - Bringing the power of multiple AI models to your command line with a unified, safe, and extensible tool system.