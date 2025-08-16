# Security Guide

This document outlines the security considerations, safeguards, and best practices implemented in Open CLI.

## 🔒 Security Overview

Open CLI handles potentially sensitive operations like file system access and external API calls. Our security model implements **defense in depth** with multiple layers of protection.

### Security Principles

1. **Least Privilege**: Minimal necessary permissions
2. **Fail Secure**: Default to blocking unsafe operations
3. **Defense in Depth**: Multiple security layers
4. **Transparency**: Clear communication about security decisions
5. **User Control**: Explicit confirmation for sensitive operations

## 🛡️ Core Security Features

### File System Protection

#### Root Directory Restriction

All file operations are restricted to the directory where Open CLI was started:

```typescript
// ✅ Allowed (within project)
./src/index.ts
./docs/README.md
./package.json

// ❌ Blocked (outside project)
/etc/passwd
../../../secrets.txt
~/sensitive-data.txt
```

**Implementation:**
```typescript
class SafetyManager {
  validateFilePath(filePath: string) {
    const absolutePath = path.resolve(filePath);
    const rootPath = path.resolve(this.config.rootDirectory);
    
    if (!absolutePath.startsWith(rootPath)) {
      return {
        valid: false,
        reason: `Path must be within root directory: ${rootPath}`
      };
    }
    // ... additional validation
  }
}
```

#### Path Traversal Prevention

Directory traversal attacks are prevented through path validation:

```typescript
// These attempts are automatically blocked:
../../../etc/passwd
..\\..\\..\\Windows\\System32\\
./packages/../../../sensitive-file.txt
```

#### File Size Limits

Default maximum file size prevents resource exhaustion:

```typescript
// Default: 10MB limit
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

// Configurable per instance
const safetyManager = new SafetyManager({
  rootDirectory: process.cwd(),
  maxFileSize: 50 * 1024 * 1024  // 50MB for large projects
});
```

### User Confirmation System

Destructive operations require explicit user confirmation:

#### Confirmation Triggers

- **File Overwriting**: Writing to existing files
- **Directory Creation**: Creating new directories
- **Large Operations**: Operations affecting many files
- **Shell Commands**: External command execution (future)

#### Confirmation Flow

```typescript
class WriteFileInvocation {
  async shouldConfirmExecute(): Promise<ToolCallConfirmationDetails | false> {
    try {
      await fs.promises.access(this.params.path);
      return {
        message: `File ${this.params.path} already exists and will be overwritten.`,
        description: this.getDescription(),
        destructive: true
      };
    } catch {
      return false; // File doesn't exist, no confirmation needed
    }
  }
}
```

### API Key Security

#### Environment Variable Storage

API keys are stored in environment variables, not in code:

```bash
# ✅ Secure
export GEMINI_API_KEY="your-api-key"
export CLAUDE_API_KEY="your-api-key"

# ❌ Never do this
const API_KEY = "hardcoded-key"; // Never commit API keys!
```

#### Key Validation

API keys are validated without logging their values:

```typescript
class GeminiClient {
  constructor(config: ModelConfig) {
    if (!config.apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    // Key is stored securely, never logged
  }
}
```

## 🔍 Security Validations

### Input Sanitization

#### Tool Parameter Validation

All tool parameters are validated using Zod schemas:

```typescript
const ReadFileParams = z.object({
  path: z.string()
    .min(1, "Path cannot be empty")
    .max(1000, "Path too long")
    .refine(path => !path.includes('\0'), "Invalid characters in path"),
  offset: z.number()
    .int("Offset must be an integer")
    .min(0, "Offset cannot be negative")
    .optional(),
  limit: z.number()
    .int("Limit must be an integer") 
    .min(1, "Limit must be positive")
    .max(10000, "Limit too large")
    .optional()
});
```

#### Model Input Validation

User input is validated before sending to AI models:

```typescript
class CoreManager {
  async sendMessage(modelName: string, message: string) {
    // Validate model name
    if (!this.modelRegistry.hasModel(modelName)) {
      throw new Error(`Invalid model: ${modelName}`);
    }
    
    // Validate message
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }
    
    // Additional sanitization...
  }
}
```

### File Extension Controls

Optional file extension restrictions for enhanced security:

```typescript
const safetyManager = new SafetyManager({
  rootDirectory: process.cwd(),
  allowedExtensions: ['.js', '.ts', '.json', '.md', '.txt']
});

// This would block access to:
// .exe, .bat, .sh, .ps1, etc.
```

## 🚨 Threat Model

### Identified Threats

#### 1. Malicious File Access

**Threat**: AI model attempts to read sensitive system files
**Mitigation**: 
- Root directory restriction
- Path validation
- Extension filtering (optional)

```typescript
// Example blocked attempts:
@gemini read /etc/passwd
@claude read ~/.ssh/id_rsa  
@gemini read ../../../Windows/System32/config/SAM
```

#### 2. Directory Traversal

**Threat**: Path manipulation to escape project directory
**Mitigation**: 
- Absolute path resolution
- Prefix validation
- Symlink resolution

```typescript
// These are automatically blocked:
../../../escape
..\\..\\..\\escape
./symlink-to-sensitive-dir/file.txt
```

#### 3. Resource Exhaustion

**Threat**: Large file operations consuming system resources
**Mitigation**:
- File size limits
- Operation timeouts
- Memory usage monitoring

```typescript
// Large file protection:
if (fileSize > MAX_FILE_SIZE) {
  throw new ToolError('File too large', ToolErrorType.VALIDATION_ERROR);
}
```

#### 4. API Key Exposure

**Threat**: API keys logged or transmitted insecurely
**Mitigation**:
- Environment variable storage
- No logging of sensitive data
- Secure transmission (HTTPS)

#### 5. Code Injection

**Threat**: Malicious code execution through AI responses
**Mitigation**:
- No automatic code execution
- User confirmation for file writes
- Input validation and sanitization

### Attack Scenarios

#### Scenario 1: Malicious Model Response

```typescript
// If AI model returns malicious tool call:
{
  name: "write_file",
  parameters: {
    path: "/etc/passwd",
    content: "malicious content"
  }
}

// Security response:
// 1. Path validation fails (outside root directory)
// 2. Tool execution is blocked
// 3. Error is logged (safely)
// 4. User is notified of security violation
```

#### Scenario 2: Social Engineering

```typescript
// User types: @gemini read my passwords from ~/.ssh/id_rsa
// Security response:
// 1. Path validation fails (outside root directory)  
// 2. Operation is blocked with clear explanation
// 3. User education about safe practices
```

## 📋 Security Best Practices

### For Users

#### Safe API Key Management

```bash
# ✅ Use environment variables
export GEMINI_API_KEY="your-key"

# ✅ Use .env files (add to .gitignore)
echo "GEMINI_API_KEY=your-key" >> .env
echo ".env" >> .gitignore

# ❌ Never commit keys to git
git add .env  # DON'T DO THIS
```

#### Safe Project Setup

```bash
# ✅ Run Open CLI in project directory
cd /path/to/your/project
open-cli

# ❌ Don't run in sensitive directories
cd /
open-cli  # Could access system files

cd ~
open-cli  # Could access personal files
```

#### Input Validation

```bash
# ✅ Use relative paths within project
@gemini read ./src/index.ts
@claude list ./docs/

# ❌ Avoid absolute paths outside project
@gemini read /etc/passwd        # Will be blocked
@claude read /home/user/secret  # Will be blocked
```

### For Developers

#### Secure Tool Development

```typescript
class SecureTool extends BaseTool<ToolParams, ToolResult> {
  protected createValidatedInvocation(params: ToolParams) {
    // Always validate parameters
    this.validateSecurity(params);
    return new SecureToolInvocation(params, this.safetyManager);
  }
  
  private validateSecurity(params: ToolParams) {
    // Custom security validation
    if (params.path.includes('..')) {
      throw new ToolError('Path traversal detected', ToolErrorType.VALIDATION_ERROR);
    }
  }
}
```

#### Safe Error Handling

```typescript
// ✅ Safe error messages
catch (error) {
  console.error('Operation failed:', error.message);
  // Don't log sensitive details
}

// ❌ Unsafe error logging
catch (error) {
  console.error('Failed with API key:', apiKey, error);  // DON'T DO THIS
}
```

## 🔧 Security Configuration

### Default Security Settings

```typescript
const DEFAULT_SECURITY_CONFIG = {
  rootDirectory: process.cwd(),
  maxFileSize: 10 * 1024 * 1024,    // 10MB
  allowedExtensions: undefined,      // All extensions allowed
  blockedPaths: [                    // Additional blocked paths
    '.git',
    'node_modules/.cache',
    '.env'
  ],
  requireConfirmation: true,         // Confirm destructive operations
  enableLogging: false              // No sensitive data logging
};
```

### Customizing Security

```typescript
// Strict security for sensitive projects
const strictSafety = new SafetyManager({
  rootDirectory: process.cwd(),
  maxFileSize: 1 * 1024 * 1024,     // 1MB limit
  allowedExtensions: ['.js', '.ts', '.json', '.md'],
  blockedPaths: ['.git', '.env', 'secrets/', 'private/'],
  requireConfirmation: true
});

// Relaxed security for trusted environments
const relaxedSafety = new SafetyManager({
  rootDirectory: process.cwd(),
  maxFileSize: 100 * 1024 * 1024,   // 100MB limit
  allowedExtensions: undefined,      // All extensions
  blockedPaths: ['.git'],           // Minimal blocking
  requireConfirmation: false        // Auto-approve operations
});
```

## 🚨 Incident Response

### Security Violation Detection

Open CLI logs security violations for analysis:

```typescript
class SafetyManager {
  validateFilePath(filePath: string) {
    if (this.isPathTraversal(filePath)) {
      // Log security event (safely)
      console.warn('Security: Path traversal attempt blocked', {
        requestedPath: filePath.substring(0, 100),  // Truncated for safety
        rootDirectory: this.config.rootDirectory,
        timestamp: new Date().toISOString()
      });
      
      return { valid: false, reason: 'Path traversal detected' };
    }
  }
}
```

### Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. **Email**: security@open-cli.org (or repository maintainers)
3. **Include**: Detailed description and reproduction steps
4. **Wait**: For acknowledgment before public disclosure

### Security Updates

- Monitor for security updates in dependencies
- Regular security audits of file operations
- Prompt patching of identified vulnerabilities

## 📚 Security Resources

### External Security Tools

```bash
# Dependency vulnerability scanning
npm audit
npm audit fix

# Security linting
npm install --save-dev eslint-plugin-security
```

### Security Checklist

- [ ] API keys stored in environment variables
- [ ] File operations restricted to project directory  
- [ ] User confirmation enabled for destructive operations
- [ ] Input validation implemented for all tools
- [ ] Error messages don't expose sensitive information
- [ ] Dependencies regularly updated and audited
- [ ] Security tests included in CI/CD pipeline

## 🎯 Security Roadmap

### Phase 2 Enhancements

- [ ] **Shell Command Sandboxing**: Safe execution of shell commands
- [ ] **Content Filtering**: Scan file contents for sensitive data
- [ ] **Audit Logging**: Comprehensive security event logging
- [ ] **Rate Limiting**: Prevent API abuse

### Phase 3 Enhancements

- [ ] **User Permissions**: Role-based access control
- [ ] **Remote Execution**: Secure multi-user environments
- [ ] **Encrypted Storage**: Secure local data storage
- [ ] **Security Compliance**: SOC2, ISO27001 alignment

Security is fundamental to Open CLI's design. These measures ensure that AI-powered development assistance remains safe and trustworthy.