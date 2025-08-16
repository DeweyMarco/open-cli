# Changelog

All notable changes to Open CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-16

### 🎉 Initial Release - Phase 1: Core Tool System

#### Added

**🏗️ Core Architecture**
- Modular monorepo structure with separate CLI and Core packages
- TypeScript implementation with strict type checking
- Professional build system with npm workspaces

**🤖 Multi-Model Support**
- Unified interface for different AI model providers
- Google Gemini integration (`@gemini` commands)
- Anthropic Claude integration (`@claude` commands)
- Model registry for managing AI clients
- Separate conversation history per model

**🛠️ Tool System**
- Extensible tool architecture with `BaseTool` abstract class
- Tool registry for managing and executing tools
- JSON schema generation for AI model consumption
- Runtime parameter validation with Zod schemas

**📁 Built-in File Operations**
- `read_file`: Safe file reading with path validation
- `write_file`: File writing with user confirmation
- `list_directory`: Directory listing with rich formatting
- Support for file offset/limit and recursive operations

**🔒 Security Framework**
- `SafetyManager` for file access validation
- Root directory restriction preventing path traversal
- File size limits and extension filtering
- User confirmation system for destructive operations
- Comprehensive input validation and sanitization

**💻 Interactive CLI**
- Responsive REPL interface with readline
- `@model` syntax for choosing AI providers
- Rich formatted output with emojis and markdown
- Graceful error handling and user-friendly messages
- Double Ctrl-C exit pattern

**⚙️ Developer Experience**
- Comprehensive TypeScript types and interfaces
- Detailed error messages with context
- Hot reload development mode
- .env file support for easy API key management
- Extensive documentation and examples

#### Technical Details

**Dependencies**
- Node.js 20+ required
- TypeScript 5.0+ for strict type checking
- Zod 3.22+ for runtime validation
- Dotenv 17.2+ for .env file support
- Native readline for CLI interface

**Build System**
- ESM modules throughout
- Composite TypeScript projects
- npm workspaces for monorepo management
- Source maps and declaration files

**Testing**
- Comprehensive test coverage for core components
- Mock model clients for integration testing
- Safety validation test suite
- End-to-end workflow validation

#### Security

**File System Protection**
- Path traversal prevention (`../../../` blocked)
- Root directory restriction
- File size limits (10MB default)
- Optional file extension filtering

**API Security**
- Environment variable API key storage
- No sensitive data logging
- Secure HTTPS communication
- Input validation at all entry points

**User Safety**
- Explicit confirmation for file overwrites
- Clear security violation messages
- Safe error handling without data exposure
- Transparent security decisions

#### Documentation

**Comprehensive Guides**
- [README.md](README.md): Complete project overview and quick start
- [CONTRIBUTING.md](CONTRIBUTING.md): Development guidelines and contribution process
- [ARCHITECTURE.md](docs/ARCHITECTURE.md): In-depth architecture documentation
- [API.md](docs/API.md): Complete API reference
- [EXAMPLES.md](docs/EXAMPLES.md): Usage examples and workflows
- [SECURITY.md](docs/SECURITY.md): Security model and best practices
- [CLAUDE.md](CLAUDE.md): Claude Code development guidance

**Developer Resources**
- TypeScript type definitions
- Code examples for extending tools
- Architecture diagrams and flow charts
- Security guidelines and threat model

### 🚧 Known Limitations

- **Limited Tools**: Only basic file operations (Phase 1 scope)
- **No Git Integration**: Planned for Phase 2
- **No Shell Commands**: Planned for Phase 2 with sandboxing
- **Basic Confirmation**: CLI-only confirmation (no GUI)
- **Memory Storage**: Conversation history not persisted

### 🔮 Roadmap

**Phase 2: Advanced Development Tools**
- Git integration tools (`git_status`, `git_commit`, `git_branch`)
- Shell command execution with safety sandboxing
- Code analysis tools (AST parsing, linting)
- Project scaffolding and templates

**Phase 3: Workflow Orchestration**
- Multi-model workflows and pipelines
- Conversation bridging between models
- Task automation and scheduling
- Context sharing and handoffs

**Phase 4: Enterprise Features**
- Team collaboration features
- Plugin system for custom tools
- Web-based interface
- Advanced security and compliance

### 🙏 Acknowledgments

- Inspired by [Gemini CLI](https://github.com/google-gemini/gemini-cli) architecture patterns
- Built with [TypeScript](https://www.typescriptlang.org/) and [Node.js](https://nodejs.org/)
- Uses [Zod](https://github.com/colinhacks/zod) for runtime validation
- Follows patterns from VS Code, ESLint, and other extensible tools

---

**Open CLI** - Multi-Model AI Development Assistant with Unified Tool System