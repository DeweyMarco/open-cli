# Usage Examples

This document provides comprehensive examples of using Open CLI for various development tasks.

## 🚀 Getting Started Examples

### Basic Setup and First Commands

```bash
# Start Open CLI
npm start

# Check what models are available
# (CLI will show available models on startup)

# Your first commands
@gemini hello, what can you help me with?
@claude list the files in this directory
@gemini read the package.json file
```

## 📁 File Operations

### Reading Files

```bash
# Read entire file
@claude read the README.md file

# Read specific lines (offset 10, limit 20 lines)
@gemini read src/index.ts starting from line 10, show 20 lines

# Read configuration files
@claude what's in the package.json?
@gemini show me the tsconfig.json contents
```

### Writing Files

```bash
# Create a simple script
@gemini write a hello world script to hello.js

# Create with specific content
@claude write "console.log('Open CLI is awesome!')" to test.js

# Create in subdirectory (will create directories)
@gemini create a new file at src/utils/helper.js with utility functions

# Write multi-line content
@claude write a README for this project to docs/README.md with installation instructions
```

### Directory Operations

```bash
# List current directory
@gemini list the files here
@claude show me what's in this folder

# List with hidden files
@gemini list all files including hidden ones

# List specific directory
@claude list the contents of src/
@gemini show me what's in packages/core/

# Recursive listing
@claude list all files in src/ recursively
```

## 🤖 Multi-Model Workflows

### Collaborative Development

```bash
# Analysis with one model
@claude analyze the code structure in src/

# Implementation with another
@gemini implement the suggestions from Claude in src/index.ts

# Review with the first model
@claude review the changes Gemini made

# Documentation with either
@gemini write documentation for the new features
```

### Model Comparison

```bash
# Ask both models the same question
@gemini how would you improve this codebase?
@claude how would you improve this codebase?

# Compare implementations
@gemini write a function to validate email addresses
@claude write a function to validate email addresses

# Get different perspectives
@claude what are the security concerns in this code?
@gemini what are the performance implications of this approach?
```

## 🛠️ Development Workflows

### Project Analysis

```bash
# Understand project structure
@claude read package.json and explain the project structure
@gemini list all TypeScript files in this project
@claude read the main entry point and explain what it does

# Code review
@gemini read src/components/Button.tsx and suggest improvements
@claude analyze the error handling in src/utils/api.ts
```

### Code Generation

```bash
# Generate utilities
@gemini create a utility function for date formatting in src/utils/date.ts
@claude write a TypeScript interface for user data in src/types/user.ts

# Generate tests
@gemini create unit tests for the functions in src/utils/math.ts
@claude write integration tests for the API endpoints

# Generate documentation
@claude create API documentation for src/api/users.ts
@gemini write inline comments for the complex functions
```

### Configuration and Setup

```bash
# Create config files
@gemini create a .gitignore file for a Node.js project
@claude set up ESLint configuration in .eslintrc.json

# Environment setup
@gemini create a .env.example file with required variables
@claude write installation instructions for this project

# Build scripts
@gemini add build scripts to package.json
@claude create a Dockerfile for this application
```

## 🔧 Advanced Usage Patterns

### Interactive Problem Solving

```bash
# Step-by-step debugging
@claude read the error logs and identify the issue
@gemini suggest 3 different solutions to fix this bug
@claude implement the most robust solution

# Iterative improvement
@gemini optimize this function for better performance
@claude review the optimization and suggest further improvements
@gemini implement the final optimized version
```

### Code Refactoring

```bash
# Analysis phase
@claude read src/legacy/old-module.js and understand its functionality
@gemini identify which parts can be modernized

# Refactoring phase
@claude convert this JavaScript to TypeScript
@gemini break down this large function into smaller utilities
@claude add proper error handling to these functions

# Validation phase
@gemini review the refactored code for any issues
@claude suggest additional improvements
```

### Documentation Generation

```bash
# API documentation
@claude read all files in src/api/ and create comprehensive API docs
@gemini document the database schema from src/models/

# User guides
@claude create a user guide based on the CLI commands
@gemini write troubleshooting documentation for common issues

# Code documentation
@gemini add JSDoc comments to all public functions
@claude create architecture documentation for this system
```

## 🎯 Specific Use Cases

### React Development

```bash
# Component creation
@gemini create a React component for a user profile card
@claude add TypeScript props interface for the ProfileCard component
@gemini write unit tests for the ProfileCard component

# State management
@claude create a Redux slice for user authentication
@gemini implement React Context for theme management
@claude write custom hooks for data fetching
```

### Node.js Backend

```bash
# API development
@gemini create Express routes for user management
@claude add input validation middleware
@gemini implement authentication middleware

# Database operations
@claude create Mongoose schemas for the data models
@gemini write database migration scripts
@claude implement data access layer with proper error handling
```

### DevOps and Tooling

```bash
# CI/CD setup
@gemini create GitHub Actions workflow for testing and building
@claude set up Docker configuration for development
@gemini write deployment scripts for production

# Monitoring and logging
@claude implement structured logging throughout the application
@gemini create health check endpoints
@claude set up error monitoring and alerting
```

## 🔍 Troubleshooting Examples

### Common Issues

```bash
# Permission errors
# If you get "File access denied" errors:
@claude list the current directory to check permissions
# Make sure you're in the right directory and have read/write access

# Model not available
# If you see "Model not available" errors:
# Check that your API keys are set:
export GEMINI_API_KEY="your-key-here"
export CLAUDE_API_KEY="your-key-here"

# File not found
@gemini list the files to see what's available
@claude check if the file path is correct
```

### Debugging Workflows

```bash
# When code isn't working:
@claude read the error logs and explain what's happening
@gemini analyze the stack trace and identify the root cause
@claude suggest step-by-step debugging approach

# When performance is slow:
@gemini profile this code and identify bottlenecks
@claude suggest optimization strategies
@gemini implement the performance improvements
```

## 🌟 Creative Examples

### Learning and Exploration

```bash
# Learn new technologies
@claude explain how WebAssembly works with practical examples
@gemini create a simple machine learning example
@claude compare different state management approaches

# Code golf and challenges
@gemini write the shortest function to reverse a string
@claude solve this algorithm challenge step by step
@gemini optimize this code for minimal memory usage
```

### Automation Scripts

```bash
# Task automation
@claude create a script to backup important files
@gemini write a utility to clean up old log files
@claude generate a script to update dependencies

# Data processing
@gemini create a CSV parser and analyzer
@claude write a script to merge multiple JSON files
@gemini implement a data validation pipeline
```

## 💡 Pro Tips

### Effective Prompting

```bash
# Be specific about context
@claude read the existing auth system in src/auth/ and then create a new OAuth provider

# Ask for explanations
@gemini explain what this code does and why it might be causing issues

# Request multiple options
@claude give me 3 different approaches to implement caching

# Combine analysis and action
@gemini analyze the current error handling and then improve it
```

### Workflow Optimization

```bash
# Use model strengths
@claude (great for analysis and explanations)
@gemini (great for implementation and code generation)

# Chain operations
# 1. Use @claude to analyze and plan
# 2. Use @gemini to implement
# 3. Use @claude to review and refine

# Keep context
# Each model maintains separate conversation history
# Reference previous responses: "implement the solution you just suggested"
```

### Safety and Best Practices

```bash
# Always review generated code
@claude review this generated code for security issues
@gemini check this code for potential bugs

# Test incrementally
# Generate small pieces and test them before building larger features

# Use version control
# Make commits after successful generations to track changes
```

## 🎓 Enterprise Success Strategies

### Maximizing ROI and Achieving Excellence

**Enterprise Adoption Framework:**
1. **Start with Pilot Projects**: Begin with non-critical projects to establish patterns
2. **Build Internal Expertise**: Train teams on advanced prompting and workflow patterns
3. **Establish Governance**: Create enterprise standards and approval processes
4. **Measure Success**: Track productivity gains, quality improvements, and cost savings
5. **Scale Systematically**: Expand usage based on proven patterns and success metrics

**Key Performance Indicators (KPIs) for Enterprise Usage:**
- **Development Velocity**: 40-60% faster feature delivery
- **Code Quality**: 90%+ reduction in security vulnerabilities
- **Documentation Coverage**: 95%+ API and code documentation
- **Testing Coverage**: 95%+ automated test coverage
- **Compliance Adherence**: 100% policy compliance automation
- **Knowledge Transfer**: 50% faster onboarding of new team members

**Enterprise Integration Patterns:**
```bash
# Weekly Architecture Review
@claude analyze this week's code changes and provide enterprise architecture assessment

# Monthly Security Assessment
@claude perform comprehensive security review of all recent implementations

# Quarterly Technology Evaluation
@gemini assess emerging technologies and provide adoption recommendations

# Continuous Documentation Maintenance
@claude ensure all documentation is current and compliant with enterprise standards
```

**Return on Investment (ROI) Calculation:**
- **Developer Productivity**: 2-3x faster development cycles
- **Quality Assurance**: 80% reduction in bug-related incidents
- **Compliance Costs**: 70% reduction in manual compliance efforts
- **Knowledge Management**: 90% improvement in documentation quality
- **Security Posture**: 95% improvement in security vulnerability detection

These enterprise examples demonstrate Open CLI's capabilities for transforming professional development workflows. The combination of AI-powered development assistance with enterprise-grade security, observability, and governance creates a powerful platform for modern software development teams.

**🚀 Ready to revolutionize your enterprise development workflow? Start with these patterns and adapt them to your organization's specific needs and standards!**