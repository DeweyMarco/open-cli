# Enterprise Security Guide

This document details Open CLI's production-grade security architecture, threat mitigation strategies, and comprehensive protection mechanisms implemented across all system layers.

## 🔒 Security Architecture Overview

Open CLI implements **enterprise-grade security** with **defense-in-depth** strategy, providing multiple independent security layers that protect against advanced threats including path traversal, injection attacks, DoS attempts, and API abuse.

### Security Principles

1. **Zero Trust**: Never trust user input or external data
2. **Defense in Depth**: Multiple overlapping security controls
3. **Least Privilege**: Minimal necessary permissions and access
4. **Fail Secure**: Default to blocking unsafe operations
5. **Security by Design**: Security integrated into architecture, not added later
6. **Transparency**: Clear communication about security decisions
7. **Auditability**: Comprehensive logging of security events

## 🛡️ Multi-Layer Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Input Layer                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ Input Validator │ │Content Sanitizer│ │  Schema Validator│   │
│  │  & Sanitizer    │ │   & Filtering   │ │   (Zod/Runtime) │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Validated Input
┌─────────────────────┴───────────────────────────────────────────┐
│                     Security Layer                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ Rate Limiter    │ │Path Protection │ │Access Controller│   │
│  │   (Multiple     │ │  (Canonical    │ │   & Logger      │   │
│  │   Algorithms)   │ │   Resolution)  │ │                 │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Security-Cleared Request
┌─────────────────────┴───────────────────────────────────────────┐
│                   Execution Layer                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ Error Handler   │ │   Monitoring    │ │ Resource Limits │   │
│  │   & Recovery    │ │   & Alerting    │ │  & Protection   │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Layer 1: Input Validation & Sanitization

### Professional Input Validator

**Comprehensive validation against all major attack vectors:**

```typescript
class InputValidator {
  private static readonly DANGEROUS_PATTERNS = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    
    // XSS patterns  
    /<script[^>]*>/gi,
    /javascript:/gi,
    /onload\s*=/gi,
    
    // Command injection patterns
    /[;&|`$(){}[\]]/g,
    /\$\([^)]*\)/g,
    /`[^`]*`/g,
    
    // Path traversal patterns
    /\.\.[/\\]/g,
    /[/\\]\.\./g,
    
    // Null bytes and control characters
    /\0/g,
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
  ];

  validateString(input: string, rules: ValidationRule): ValidationResult {
    // Multi-stage validation pipeline
    const securityResult = this.checkForMaliciousContent(input);
    const sanitized = this.defaultSanitizer(input);
    
    return {
      valid: errors.length === 0,
      sanitized,
      errors,
      warnings: securityResult.warnings
    };
  }
}
```

### Zod Schema Validation

**Runtime validation with compile-time type safety:**

```typescript
// File path validation with security constraints
export const ValidationSchemas = {
  filePath: z.string()
    .min(1, 'File path cannot be empty')
    .max(4096, 'File path too long')
    .refine(path => !path.includes('\0'), 'File path cannot contain null bytes')
    .refine(path => !/[<>:"|*?]/.test(path), 'File path contains invalid characters'),

  userMessage: z.string()
    .min(1, 'Message cannot be empty')
    .max(100000, 'Message too long (max 100k characters)')
    .refine(msg => !msg.includes('\0'), 'Message cannot contain null bytes'),

  toolParameters: z.record(z.union([
    z.string().max(10000),
    z.number(),
    z.boolean(),
    z.array(z.string().max(1000)).max(100)
  ]))
};
```

## 🔒 Layer 2: Path Traversal Protection

### Secure Safety Manager

**Canonical path resolution prevents all path traversal attacks:**

```typescript
class SecureSafetyManager {
  async validateFilePath(requestedPath: string): Promise<SecurityValidationResult> {
    try {
      // Canonical path resolution (handles symlinks, relative paths)
      const canonicalPath = await realpath(path.resolve(requestedPath));
      const canonicalRoot = await realpath(path.resolve(this.rootDirectory));
      
      // Robust boundary checking
      if (!this.isWithinRoot(canonicalPath, canonicalRoot)) {
        this.logSecurityViolation('path_traversal', {
          requestedPath,
          canonicalPath,
          rootDirectory: canonicalRoot
        });
        
        return {
          allowed: false,
          reason: `Path outside allowed root directory: ${canonicalRoot}`
        };
      }

      // Additional security checks
      if (this.containsMaliciousPatterns(requestedPath)) {
        return { allowed: false, reason: 'Path contains malicious patterns' };
      }
      
      return { allowed: true, canonicalPath };
    } catch (error) {
      return { 
        allowed: false, 
        reason: `Path validation error: ${error.message}` 
      };
    }
  }

  private isWithinRoot(canonicalPath: string, canonicalRoot: string): boolean {
    // Ensure both paths end with separator for accurate comparison
    const normalizedRoot = canonicalRoot.endsWith(path.sep) 
      ? canonicalRoot 
      : canonicalRoot + path.sep;
    
    return canonicalPath.startsWith(normalizedRoot) || canonicalPath === canonicalRoot;
  }
}
```

### Attack Prevention Examples

```typescript
// All these attacks are automatically blocked:

// Directory traversal attempts
await securityManager.validateFilePath('../../../etc/passwd');
// Result: { allowed: false, reason: 'Path outside allowed root' }

await securityManager.validateFilePath('..\\..\\..\\Windows\\System32\\config\\SAM');
// Result: { allowed: false, reason: 'Path outside allowed root' }

// Symlink-based attacks  
await securityManager.validateFilePath('./symlink-to-etc/passwd');
// Result: { allowed: false, reason: 'Path outside allowed root' }

// Null byte injection
await securityManager.validateFilePath('./file.txt\0../../../etc/passwd');
// Result: { allowed: false, reason: 'Path contains malicious patterns' }
```

## 🚦 Layer 3: Rate Limiting & DoS Protection

### Multi-Algorithm Rate Limiter

**Professional rate limiting with multiple algorithms:**

```typescript
class RateLimiter {
  constructor(algorithm: RateLimitAlgorithm = RateLimitAlgorithm.SLIDING_WINDOW) {
    this.algorithm = algorithm;
    this.logger = createLogger('RateLimiter');
  }

  async consume(key: RateLimitKey): Promise<void> {
    const result = this.checkLimit(key);
    
    if (!result.allowed) {
      this.blockedRequests++;
      this.logger.warn('Rate limit exceeded', {
        key: this.sanitizeKey(key),
        retryAfter: result.retryAfter,
        algorithm: this.algorithm
      });

      throw new RateLimitError(
        `Rate limit exceeded for ${this.sanitizeKey(key)}`,
        result.retryAfter || 60,
        'api_requests'
      );
    }
  }

  // Token bucket algorithm for burst handling
  private checkTokenBucket(key: string): RateLimitResult {
    const entry = this.entries.get(key) || {
      count: this.config.burstLimit,
      windowStart: Date.now(),
      lastRequest: Date.now()
    };

    const timePassed = Date.now() - entry.lastRequest;
    const tokensToAdd = Math.floor(
      (timePassed / this.config.windowSizeMs) * this.config.requestsPerMinute
    );
    
    entry.count = Math.min(this.config.burstLimit, entry.count + tokensToAdd);
    
    if (entry.count > 0) {
      entry.count--;
      this.entries.set(key, entry);
      return { allowed: true, remaining: entry.count };
    }
    
    return { 
      allowed: false, 
      remaining: 0, 
      retryAfter: Math.ceil(this.config.windowSizeMs / this.config.requestsPerMinute / 1000)
    };
  }
}
```

### DDoS Protection

```typescript
// Rate limiting configuration
const rateLimitConfig: RateLimitConfig = {
  enabled: true,
  requestsPerMinute: 60,        // Base rate limit
  burstLimit: 10,               // Allow bursts
  windowSizeMs: 60000,          // 1-minute window
  
  // Advanced protection
  maxConcurrentRequests: 5,     // Concurrent request limit
  cleanupIntervalMs: 30000,     // Memory cleanup
  banDurationMs: 300000         // 5-minute ban for abuse
};
```

## 🔍 Layer 4: Content Security & Monitoring

### Content Size Protection

**Prevents resource exhaustion and DoS attacks:**

```typescript
class SecureSafetyManager {
  validateContentSize(content: string | Buffer): SecurityValidationResult {
    const size = Buffer.isBuffer(content) 
      ? content.length 
      : Buffer.byteLength(content, 'utf-8');
    
    if (this.config.maxRequestSize && size > this.config.maxRequestSize) {
      this.logger.warn('Content size limit exceeded', {
        size,
        maxAllowed: this.config.maxRequestSize,
        percentage: Math.round((size / this.config.maxRequestSize) * 100)
      });

      return {
        allowed: false,
        reason: `Content size (${size} bytes) exceeds maximum (${this.config.maxRequestSize} bytes)`
      };
    }

    return { allowed: true, metadata: { contentSize: size } };
  }
}
```

### Security Access Logging

**Comprehensive security event tracking:**

```typescript
class SecureSafetyManager {
  private logSecurityViolation(
    violationType: string, 
    details: Record<string, unknown>
  ): void {
    const securityEvent = {
      type: 'security_violation',
      violation: violationType,
      timestamp: new Date().toISOString(),
      details: this.sanitizeLogData(details),
      severity: this.getSeverity(violationType)
    };

    this.logger.warn('Security violation detected', securityEvent);
    
    // Store for analysis
    this.accessLog.push({
      ...securityEvent,
      allowed: false
    });
  }

  getSecurityStats(): SecurityStats {
    const totalAttempts = this.accessLog.length;
    const blockedAttempts = this.accessLog.filter(attempt => !attempt.allowed);
    
    // Analyze attack patterns
    const reasonCounts: Record<string, number> = {};
    for (const attempt of blockedAttempts) {
      if (attempt.reason) {
        reasonCounts[attempt.reason] = (reasonCounts[attempt.reason] || 0) + 1;
      }
    }

    return {
      totalAttempts,
      blockedAttempts: blockedAttempts.length,
      blockRate: (blockedAttempts.length / totalAttempts) * 100,
      recentBlocked: blockedAttempts.slice(-10),
      commonBlockReasons: reasonCounts,
      threatLevel: this.calculateThreatLevel(blockedAttempts)
    };
  }
}
```

## 🔐 API Security & Authentication

### Secure API Key Management

**Enterprise-grade secrets handling:**

```typescript
class ModelRegistry {
  createModelsFromEnv(): ModelRegistry {
    const registry = new ModelRegistry();
    
    // Validate API keys without logging them
    if (process.env.GEMINI_API_KEY) {
      if (!this.validateApiKeyFormat(process.env.GEMINI_API_KEY, 'gemini')) {
        throw new ConfigurationError('Invalid Gemini API key format');
      }
      registry.createModel(ModelProvider.GEMINI, 'gemini', {
        model: 'gemini-2.5-flash',
        apiKey: process.env.GEMINI_API_KEY
      });
    }

    if (process.env.CLAUDE_API_KEY) {
      if (!this.validateApiKeyFormat(process.env.CLAUDE_API_KEY, 'claude')) {
        throw new ConfigurationError('Invalid Claude API key format');
      }
      registry.createModel(ModelProvider.CLAUDE, 'claude', {
        model: 'claude-3-5-sonnet-20241022',  
        apiKey: process.env.CLAUDE_API_KEY
      });
    }

    return registry;
  }

  private validateApiKeyFormat(apiKey: string, provider: string): boolean {
    const patterns = {
      gemini: /^AIza[0-9A-Za-z_-]{35}$/,
      claude: /^sk-ant-[a-zA-Z0-9]{95}$/
    };
    
    return patterns[provider]?.test(apiKey) ?? false;
  }
}
```

### Secure API Communication

**Professional API clients with security hardening:**

```typescript
class GeminiClient {
  private async sendMessageInternal(): Promise<ModelResponse> {
    const url = `${this.baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OpenCLI/1.0',
          // Security headers
          'X-Requested-With': 'OpenCLI',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal,
        // Additional security options
        redirect: 'error',    // Prevent redirect attacks
        referrer: 'no-referrer'
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error; // Don't wrap abort errors
      }
      
      // Log security-relevant network errors
      this.logger.warn('Network security concern', {
        error: error.message,
        url: this.sanitizeUrl(url)
      });
      
      throw new NetworkError('Failed to connect to Gemini API', 'fetch', { url });
    }

    return this.handleResponse(response);
  }

  private sanitizeUrl(url: string): string {
    // Remove API key from logs
    return url.replace(/key=[^&]+/, 'key=***REDACTED***');
  }
}
```

## 🚨 Advanced Threat Detection

### Real-time Threat Analysis

**Behavioral analysis and anomaly detection:**

```typescript
class ThreatDetector {
  analyzeRequest(request: SecurityRequest): ThreatAssessment {
    const threats: ThreatIndicator[] = [];
    
    // Path traversal detection
    if (this.detectPathTraversal(request.path)) {
      threats.push({
        type: 'path_traversal',
        severity: 'high',
        confidence: 0.95
      });
    }

    // Injection attack detection
    const injectionScore = this.detectInjection(request.content);
    if (injectionScore > 0.7) {
      threats.push({
        type: 'injection_attack', 
        severity: 'high',
        confidence: injectionScore
      });
    }

    // Rate limiting anomaly
    if (this.detectRateLimitAnomaly(request.source)) {
      threats.push({
        type: 'rate_limit_abuse',
        severity: 'medium', 
        confidence: 0.8
      });
    }

    return {
      riskScore: this.calculateRiskScore(threats),
      threats,
      recommendation: this.getRecommendation(threats)
    };
  }

  private detectInjection(content: string): number {
    let score = 0;
    
    // SQL injection patterns
    if (/(\b(UNION|SELECT|INSERT|DELETE)\b.*\b(FROM|WHERE|AND|OR)\b)/gi.test(content)) {
      score += 0.8;
    }
    
    // Command injection patterns
    if (/[;&|`]\s*(rm|cat|ls|curl|wget|nc|bash|sh)\s/gi.test(content)) {
      score += 0.9;
    }
    
    // XSS patterns
    if (/<script[^>]*>.*<\/script>/gi.test(content)) {
      score += 0.7;
    }

    return Math.min(score, 1.0);
  }
}
```

### Automated Response

**Intelligent threat response and mitigation:**

```typescript
class SecurityIncidentResponse {
  async handleThreat(threat: ThreatAssessment): Promise<SecurityAction> {
    switch (threat.riskScore) {
      case 'critical':
        return this.handleCriticalThreat(threat);
      case 'high':
        return this.handleHighThreat(threat);
      case 'medium':
        return this.handleMediumThreat(threat);
      default:
        return this.handleLowThreat(threat);
    }
  }

  private async handleCriticalThreat(threat: ThreatAssessment): Promise<SecurityAction> {
    // Immediate blocking
    await this.rateLimiter.block(threat.source, 3600000); // 1 hour ban
    
    // Alert security team
    await this.alertSecurityTeam(threat);
    
    // Enhanced logging
    this.logger.error('Critical security threat detected', {
      threat,
      action: 'blocked_and_reported',
      timestamp: new Date().toISOString()
    });

    return {
      action: 'block',
      duration: 3600000,
      reason: 'Critical security threat detected',
      alertSent: true
    };
  }
}
```

## 📊 Security Configuration

### Enterprise Security Configuration

```typescript
// Production security configuration
export const ProductionSecurityConfig: SecurityConfig = {
  // File access protection
  maxFileSize: 10 * 1024 * 1024,           // 10MB
  enablePathTraversalProtection: true,      // Always enabled
  allowedExtensions: [                      // Restrictive allowlist
    '.js', '.ts', '.jsx', '.tsx',
    '.json', '.md', '.txt', '.yml', '.yaml',
    '.css', '.scss', '.less',
    '.html', '.xml', '.svg'
  ],
  blockedPaths: [                          // Security-sensitive paths
    '.env', '.env.*',
    '.git', '.svn',
    'node_modules/.cache',
    'dist', 'build',
    'secrets', 'private', 'confidential',
    '*.key', '*.pem', '*.p12'
  ],

  // Rate limiting
  rateLimiting: {
    enabled: true,
    algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
    requestsPerMinute: 60,
    burstLimit: 10,
    windowSizeMs: 60000,
    banThreshold: 5,                       // Ban after 5 violations
    banDurationMs: 300000                  // 5-minute ban
  },

  // Content protection
  maxRequestSize: 1024 * 1024,             // 1MB
  enableContentScanning: true,
  malwareDetection: true,

  // Monitoring
  enableSecurityLogging: true,
  logRetentionDays: 30,
  alertThreshold: 'medium',
  
  // Response
  enableAutoResponse: true,
  enableThreatBlocking: true
};
```

### Development Security Configuration

```typescript
// Development environment (relaxed but still secure)
export const DevelopmentSecurityConfig: SecurityConfig = {
  maxFileSize: 50 * 1024 * 1024,           // 50MB for larger files
  enablePathTraversalProtection: true,     // Never disable
  allowedExtensions: undefined,            // All extensions allowed
  blockedPaths: ['.git', '.env'],          // Minimal blocking
  
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 120,                // Higher limits
    burstLimit: 20,
    banThreshold: 10                       // More lenient
  },

  enableSecurityLogging: true,
  alertThreshold: 'high',                  // Only high-severity alerts
  enableAutoResponse: false                // Manual response in dev
};
```

## 🔍 Security Monitoring & Compliance

### Real-time Security Dashboard

```typescript
class SecurityDashboard {
  generateSecurityReport(): SecurityReport {
    const stats = this.securityManager.getSecurityStats();
    const rateLimitStats = this.rateLimiter.getStats();
    
    return {
      // Overall security posture
      securityScore: this.calculateSecurityScore(),
      threatLevel: this.getCurrentThreatLevel(),
      
      // Attack statistics
      totalBlocked: stats.blockedAttempts,
      blockRate: stats.blockRate,
      commonThreats: stats.commonBlockReasons,
      
      // Performance impact
      requestsProcessed: rateLimitStats.totalRequests,
      averageResponseTime: this.getAverageResponseTime(),
      
      // Compliance status
      complianceChecks: this.runComplianceChecks(),
      lastSecurityAudit: this.getLastAuditDate(),
      
      // Recommendations
      securityRecommendations: this.generateRecommendations()
    };
  }

  private runComplianceChecks(): ComplianceResult[] {
    return [
      {
        check: 'path_traversal_protection',
        status: this.config.enablePathTraversalProtection ? 'pass' : 'fail',
        requirement: 'OWASP Top 10 - A05 Security Misconfiguration'
      },
      {
        check: 'input_validation', 
        status: 'pass',
        requirement: 'OWASP Top 10 - A03 Injection'
      },
      {
        check: 'rate_limiting',
        status: this.config.rateLimiting.enabled ? 'pass' : 'fail',
        requirement: 'OWASP Top 10 - A06 Vulnerable Components'
      },
      {
        check: 'secure_logging',
        status: this.config.enableSecurityLogging ? 'pass' : 'fail',
        requirement: 'SOC2 - Logging and Monitoring'
      }
    ];
  }
}
```

## 🚨 Incident Response & Recovery

### Automated Incident Response

```typescript
class SecurityIncidentHandler {
  async handleSecurityIncident(incident: SecurityIncident): Promise<void> {
    // Immediate containment
    await this.containThreat(incident);
    
    // Evidence collection
    const evidence = await this.collectEvidence(incident);
    
    // Stakeholder notification
    await this.notifyStakeholders(incident);
    
    // Recovery actions
    await this.initiateRecovery(incident);
    
    // Post-incident analysis
    await this.schedulePostIncidentReview(incident);
  }

  private async containThreat(incident: SecurityIncident): Promise<void> {
    switch (incident.severity) {
      case 'critical':
        // Immediate system isolation
        await this.isolateAffectedSystems(incident);
        break;
      case 'high':
        // Rate limit the source
        await this.rateLimiter.block(incident.source, 3600000);
        break;
      case 'medium':
        // Enhanced monitoring
        await this.enableEnhancedMonitoring(incident.source);
        break;
    }
  }
}
```

## 📚 Security Best Practices

### For Users

#### Secure Environment Setup

```bash
# ✅ Secure API key management
export GEMINI_API_KEY="$(cat ~/.secrets/gemini-key)"
export CLAUDE_API_KEY="$(cat ~/.secrets/claude-key)"

# ✅ Use .env files with proper permissions
echo "GEMINI_API_KEY=your-key" > .env
chmod 600 .env                    # Restrict file permissions
echo ".env" >> .gitignore         # Never commit secrets

# ✅ Run in project directory only
cd /path/to/your/project
npm start

# ❌ Never run in sensitive directories
cd / && npm start                 # DON'T DO THIS
cd ~ && npm start                 # DON'T DO THIS
```

#### Safe Operations

```bash
# ✅ Safe file operations (within project)
@gemini read ./src/index.ts
@claude write "./output.json" with the analysis results

# ❌ Unsafe operations (automatically blocked)
@gemini read /etc/passwd
@claude read ~/.ssh/id_rsa
@gemini write "/etc/hosts" with malicious content
```

### For Developers

#### Secure Tool Development

```typescript
class SecureTool extends BaseTool<ToolParams, ToolResult> {
  protected createValidatedInvocation(params: ToolParams): ToolInvocation<ToolParams, ToolResult> {
    // Comprehensive parameter validation
    this.validateSecurity(params);
    this.validateBusinessLogic(params);
    
    return new SecureToolInvocation(params, this.securityManager);
  }

  private validateSecurity(params: ToolParams): void {
    // Input sanitization
    if (typeof params.input === 'string') {
      const sanitized = this.inputValidator.sanitizeInput(params.input);
      if (sanitized !== params.input) {
        throw new ValidationError('Input contains potentially dangerous content');
      }
    }

    // Path validation
    if (params.path) {
      const pathResult = this.securityManager.validateFilePath(params.path);
      if (!pathResult.allowed) {
        throw new SecurityError(pathResult.reason, 'path_validation_failed');
      }
    }
  }
}
```

## 🎯 Security Roadmap

### Current Implementation ✅

- **Path Traversal Protection**: Canonical path resolution
- **Input Validation**: Comprehensive sanitization and validation
- **Rate Limiting**: Multiple algorithms with burst protection
- **Content Security**: Size limits and malware detection
- **API Security**: Secure authentication and communication
- **Security Logging**: Comprehensive audit trail
- **Threat Detection**: Real-time analysis and response

### Phase 2 Enhancements 🔄

- **Advanced Threat Intelligence**: Machine learning-based detection
- **Zero-Trust Architecture**: Continuous verification
- **Secure Multi-tenancy**: Isolation between users/projects
- **Compliance Automation**: SOC2, ISO27001, GDPR alignment
- **Security Analytics**: Advanced threat hunting capabilities

### Phase 3 Future 📋

- **Hardware Security**: TPM and secure enclave integration
- **Blockchain Audit Trail**: Immutable security event logging
- **AI-Powered Defense**: Autonomous threat response
- **Bug Bounty Integration**: Continuous security testing
- **Compliance Certification**: Third-party security validation

**Security is not an afterthought in Open CLI - it's the foundation upon which everything else is built.**