/**
 * Safety manager for validating and securing tool operations
 */

import * as path from 'path';
import * as fs from 'fs';

export interface SafetyConfig {
  /** Root directory for file operations */
  rootDirectory: string;
  /** Allowed file extensions for reading/writing */
  allowedExtensions?: string[];
  /** Blocked paths (relative to root) */
  blockedPaths?: string[];
  /** Maximum file size for operations (bytes) */
  maxFileSize?: number;
}

export class SafetyManager {
  constructor(private config: SafetyConfig) {}
  
  /** Validate a file path for safety */
  validateFilePath(filePath: string): { valid: boolean; reason?: string; safePath?: string } {
    try {
      // Resolve to absolute path
      const absolutePath = path.resolve(filePath);
      const rootPath = path.resolve(this.config.rootDirectory);
      
      // Check if path is within root directory
      if (!absolutePath.startsWith(rootPath)) {
        return {
          valid: false,
          reason: `Path must be within root directory: ${rootPath}`
        };
      }
      
      // Get relative path from root
      const relativePath = path.relative(rootPath, absolutePath);
      
      // Check blocked paths
      if (this.config.blockedPaths) {
        for (const blockedPath of this.config.blockedPaths) {
          if (relativePath.startsWith(blockedPath)) {
            return {
              valid: false,
              reason: `Path is blocked: ${blockedPath}`
            };
          }
        }
      }
      
      return {
        valid: true,
        safePath: absolutePath
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Invalid path: ${error}`
      };
    }
  }
  
  /** Validate file extension */
  validateFileExtension(filePath: string): { valid: boolean; reason?: string } {
    if (!this.config.allowedExtensions || this.config.allowedExtensions.length === 0) {
      return { valid: true };
    }
    
    const extension = path.extname(filePath).toLowerCase();
    const allowed = this.config.allowedExtensions.some(ext => 
      ext.toLowerCase() === extension || ext.toLowerCase() === extension.slice(1)
    );
    
    if (!allowed) {
      return {
        valid: false,
        reason: `File extension '${extension}' not allowed. Allowed: ${this.config.allowedExtensions.join(', ')}`
      };
    }
    
    return { valid: true };
  }
  
  /** Validate file size */
  async validateFileSize(filePath: string): Promise<{ valid: boolean; reason?: string }> {
    if (!this.config.maxFileSize) {
      return { valid: true };
    }
    
    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.size > this.config.maxFileSize) {
        return {
          valid: false,
          reason: `File size (${stats.size} bytes) exceeds maximum (${this.config.maxFileSize} bytes)`
        };
      }
      return { valid: true };
    } catch (error) {
      // File doesn't exist - that's OK for write operations
      return { valid: true };
    }
  }
  
  /** Comprehensive file validation */
  async validateFile(filePath: string, operation: 'read' | 'write'): Promise<{ valid: boolean; reason?: string; safePath?: string }> {
    // Path validation
    const pathResult = this.validateFilePath(filePath);
    if (!pathResult.valid) {
      return pathResult;
    }
    
    // Extension validation
    const extensionResult = this.validateFileExtension(pathResult.safePath!);
    if (!extensionResult.valid) {
      return extensionResult;
    }
    
    // Size validation (for existing files)
    if (operation === 'read') {
      const sizeResult = await this.validateFileSize(pathResult.safePath!);
      if (!sizeResult.valid) {
        return sizeResult;
      }
    }
    
    return {
      valid: true,
      safePath: pathResult.safePath
    };
  }
}