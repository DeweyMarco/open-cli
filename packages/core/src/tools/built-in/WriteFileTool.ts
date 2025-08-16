/**
 * Write file tool implementation
 */

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { BaseTool, BaseToolInvocation, ToolInvocation } from '../BaseTool.js';
import { ToolResult, ToolLocation, ToolCallConfirmationDetails } from '../types.js';
import { SafetyManager } from '../../safety/SafetyManager.js';

const WriteFileParams = z.object({
  path: z.string().describe('Absolute path to the file to write'),
  content: z.string().describe('Content to write to the file'),
  create_dirs: z.boolean().optional().describe('Create parent directories if they don\'t exist')
});

type WriteFileParams = z.infer<typeof WriteFileParams>;

class WriteFileInvocation extends BaseToolInvocation<WriteFileParams, ToolResult> {
  constructor(
    params: WriteFileParams,
    private safetyManager: SafetyManager
  ) {
    super(params);
  }
  
  getDescription(): string {
    const { path, content } = this.params;
    const lines = content.split('\n').length;
    const chars = content.length;
    return `Write ${lines} lines (${chars} characters) to: ${path}`;
  }
  
  getToolLocations(): ToolLocation[] {
    return [{
      path: this.params.path,
      description: 'File to write'
    }];
  }
  
  async shouldConfirmExecute(_abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false> {
    // Check if file exists
    try {
      await fs.promises.access(this.params.path);
      return {
        message: `File ${this.params.path} already exists and will be overwritten.`,
        description: this.getDescription(),
        destructive: true
      };
    } catch {
      // File doesn't exist - no confirmation needed
      return false;
    }
  }
  
  async execute(abortSignal: AbortSignal): Promise<ToolResult> {
    // Validate path safety
    const validation = await this.safetyManager.validateFile(this.params.path, 'write');
    if (!validation.valid) {
      throw new Error(`File access denied: ${validation.reason}`);
    }
    
    const safePath = validation.safePath!;
    
    try {
      // Create parent directories if requested
      if (this.params.create_dirs) {
        const dir = path.dirname(safePath);
        await fs.promises.mkdir(dir, { recursive: true });
      }
      
      // Write file
      await fs.promises.writeFile(safePath, this.params.content, 'utf-8');
      
      const lines = this.params.content.split('\n').length;
      const chars = this.params.content.length;
      
      const llmContent = `Successfully wrote ${lines} lines (${chars} characters) to ${this.params.path}`;
      const displayContent = `✅ **File written successfully**\n\n📄 **${path.basename(safePath)}**\n📊 ${lines} lines, ${chars} characters`;
      
      return {
        llmContent,
        returnDisplay: displayContent
      };
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Directory does not exist: ${path.dirname(this.params.path)}. Use create_dirs: true to create it.`);
      }
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied: ${this.params.path}`);
      }
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }
}

export class WriteFileTool extends BaseTool<WriteFileParams, ToolResult> {
  constructor(private safetyManager: SafetyManager) {
    super(
      'write_file',
      'Write File',
      'Write content to a file on the file system',
      WriteFileParams
    );
  }
  
  protected createValidatedInvocation(params: WriteFileParams): ToolInvocation<WriteFileParams, ToolResult> {
    return new WriteFileInvocation(params, this.safetyManager);
  }
}