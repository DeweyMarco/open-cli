# Contributing to Open CLI

Thank you for your interest in contributing to Open CLI! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20 or higher
- **npm** (comes with Node.js)
- **Git** for version control
- Basic knowledge of **TypeScript** and **Node.js**

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/open-cli.git
   cd open-cli
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Set Up Environment Variables**
   ```bash
   # Option 1: Create .env file (recommended for development)
   cp .env.example .env
   # Edit .env and add your actual API keys
   
   # Option 2: Export variables (temporary)
   export GEMINI_API_KEY="your-test-key"
   export CLAUDE_API_KEY="your-test-key"
   ```

5. **Run the CLI**
   ```bash
   npm start
   ```

## 📋 Development Workflow

### Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Build and Test**
   ```bash
   npm run build
   npm run test  # When tests are available
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

We follow conventional commits:

- `feat:` New features
- `fix:` Bug fixes  
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add shell command execution tool
fix: resolve path validation on Windows
docs: update API documentation
refactor: simplify model registry interface
```

## 🏗️ Code Guidelines

### TypeScript Standards

- **Use strict typing** - avoid `any` types when possible
- **Export interfaces** for public APIs
- **Use Zod schemas** for runtime validation
- **Document complex types** with JSDoc comments

Example:
```typescript
/**
 * Configuration for a new tool
 */
export interface ToolConfig {
  /** Unique tool identifier */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Description for AI models */
  description: string;
}
```

### Project Structure

When adding new features, follow the existing structure:

```
packages/
├── core/                 # Core functionality
│   ├── src/
│   │   ├── tools/        # Tool implementations
│   │   ├── models/       # Model clients
│   │   ├── safety/       # Safety framework
│   │   └── utils/        # Shared utilities
│   └── dist/             # Compiled output
├── cli/                  # CLI interface
│   ├── src/
│   │   ├── core/         # CLI orchestration
│   │   ├── utils/        # CLI utilities
│   │   └── ui/           # User interface (future)
│   └── dist/             # Compiled output
```

### Adding New Tools

1. **Create Tool Implementation**
   ```typescript
   // packages/core/src/tools/built-in/MyTool.ts
   import { z } from 'zod';
   import { BaseTool, BaseToolInvocation, ToolResult } from '../BaseTool.js';

   const MyToolParams = z.object({
     input: z.string().describe('Input parameter')
   });

   class MyToolInvocation extends BaseToolInvocation<z.infer<typeof MyToolParams>, ToolResult> {
     getDescription(): string {
       return `My tool: ${this.params.input}`;
     }

     async execute(abortSignal: AbortSignal): Promise<ToolResult> {
       // Implementation here
       return {
         llmContent: 'Success',
         returnDisplay: '✅ Complete'
       };
     }
   }

   export class MyTool extends BaseTool<z.infer<typeof MyToolParams>, ToolResult> {
     constructor() {
       super('my_tool', 'My Tool', 'Tool description', MyToolParams);
     }

     protected createValidatedInvocation(params: z.infer<typeof MyToolParams>) {
       return new MyToolInvocation(params);
     }
   }
   ```

2. **Register the Tool**
   ```typescript
   // packages/cli/src/core/CoreManager.ts
   import { MyTool } from '@open-cli/core';

   private registerBuiltInTools(): void {
     // ... existing tools
     this.toolRegistry.register(new MyTool());
   }
   ```

3. **Export from Core**
   ```typescript
   // packages/core/src/tools/built-in/index.ts
   export * from './MyTool.js';
   ```

### Adding New Models

1. **Implement Model Client**
   ```typescript
   // packages/core/src/models/MyModelClient.ts
   export class MyModelClient implements ModelClient {
     readonly name = 'mymodel';

     async sendMessage(
       messages: ModelMessage[],
       availableTools?: ToolSchema[]
     ): Promise<ModelResponse> {
       // API integration
     }

     supportsTools(): boolean {
       return true;
     }
   }
   ```

2. **Add to Registry**
   ```typescript
   // packages/core/src/models/ModelRegistry.ts
   import { MyModelClient } from './MyModelClient.js';

   createModel(provider: ModelProvider, name: string, config: ModelConfig): ModelClient {
     switch (provider) {
       case ModelProvider.MY_MODEL:
         return new MyModelClient(config);
       // ... existing cases
     }
   }
   ```

## 🧪 Testing

### Running Tests

```bash
# Run all tests (when available)
npm run test

# Test specific packages
npm run test --workspace=packages/core
npm run test --workspace=packages/cli

# Manual testing
npm start
```

### Writing Tests

When tests are implemented, follow these patterns:

```typescript
// Example test structure
describe('MyTool', () => {
  it('should execute successfully', async () => {
    const tool = new MyTool();
    const invocation = tool.createInvocation({ input: 'test' });
    const result = await invocation.execute(new AbortController().signal);
    
    expect(result.llmContent).toBe('Success');
  });
});
```

## 🔒 Security Guidelines

### Safety Considerations

- **Validate all file paths** through SafetyManager
- **Require confirmation** for destructive operations
- **Sanitize user input** before processing
- **Limit file sizes** and operation scope
- **Never expose sensitive data** in logs or responses

### Path Validation Example

```typescript
// Good - validates path safety
const validation = await this.safetyManager.validateFile(filePath, 'read');
if (!validation.valid) {
  throw new Error(`File access denied: ${validation.reason}`);
}

// Bad - direct file access without validation
const content = await fs.readFile(userPath);
```

## 📚 Documentation

### Documentation Requirements

- **Update README.md** for user-facing changes
- **Update CLAUDE.md** for development changes  
- **Add JSDoc comments** for public APIs
- **Include usage examples** for new features
- **Update type definitions** as needed

### Documentation Style

- Use **clear, concise language**
- Include **code examples** where helpful
- Explain **why** decisions were made, not just what
- Use **consistent formatting** and structure

## 🐛 Bug Reports

### Before Reporting

1. **Check existing issues** for duplicates
2. **Test with latest version** 
3. **Provide minimal reproduction** case
4. **Include environment details**

### Bug Report Template

```
**Bug Description**
A clear description of the bug.

**Steps to Reproduce**
1. Start CLI with `npm start`
2. Run command `@gemini list directory`
3. See error

**Expected Behavior**
Directory should be listed.

**Actual Behavior**
Error: "Path validation failed"

**Environment**
- OS: macOS 14.0
- Node.js: v20.0.0
- Open CLI: v1.0.0

**Additional Context**
Any other relevant information.
```

## 🎯 Feature Requests

### Feature Request Process

1. **Open an issue** with the "enhancement" label
2. **Describe the use case** and motivation
3. **Propose an implementation** approach
4. **Discuss with maintainers** before implementing

### Feature Request Template

```
**Feature Summary**
Brief description of the feature.

**Use Case**
Why is this feature needed? What problem does it solve?

**Proposed Solution**
How should this feature work?

**Alternative Solutions**
Any alternative approaches considered?

**Additional Context**
Mockups, examples, or related issues.
```

## 🤝 Code Review Process

### For Contributors

- **Keep PRs focused** - one feature per PR
- **Write descriptive** commit messages
- **Add tests** for new functionality
- **Update documentation** as needed
- **Respond to feedback** promptly

### Review Criteria

- **Code quality** and TypeScript compliance
- **Security considerations** for file operations
- **Performance impact** assessment
- **Documentation completeness**
- **Test coverage** (when available)

## 📞 Getting Help

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and community discussion
- **Code Reviews** - Feedback on pull requests

### Questions?

If you have questions about contributing:

1. **Check existing documentation** first
2. **Search GitHub issues** for similar questions
3. **Open a discussion** for general questions
4. **Open an issue** for specific problems

## 🙏 Recognition

Contributors will be recognized in:

- **README.md** acknowledgments section
- **Release notes** for significant contributions
- **GitHub contributors** page

Thank you for helping make Open CLI better! 🚀