/**
 * Read file tool implementation
 */

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { BaseTool, BaseToolInvocation, ToolInvocation } from '../BaseTool.js';
import { ToolResult, ToolLocation, ToolCallConfirmationDetails } from '../types.js';
import { SafetyManager } from '../../safety/SafetyManager.js';

const ReadFileParams = z.object({
  path: z.string().describe('Absolute path to the file to read'),
  offset: z.number().optional().describe('Line number to start reading from (0-based)'),
  limit: z.number().optional().describe('Maximum number of lines to read')
});

type ReadFileParams = z.infer<typeof ReadFileParams>;

class ReadFileInvocation extends BaseToolInvocation<ReadFileParams, ToolResult> {
  constructor(
    params: ReadFileParams,
    private safetyManager: SafetyManager
  ) {
    super(params);
  }
  
  getDescription(): string {
    const { path, offset, limit } = this.params;
    let desc = `Read file: ${path}`;
    if (offset !== undefined || limit !== undefined) {
      const startLine = offset || 0;
      const endLine = limit !== undefined ? startLine + limit : 'end';
      desc += ` (lines ${startLine}-${endLine})`;
    }
    return desc;
  }
  
  getToolLocations(): ToolLocation[] {
    return [{
      path: this.params.path,
      description: 'File to read'
    }];
  }
  
  async execute(abortSignal: AbortSignal): Promise<ToolResult> {
    // Validate path safety
    const validation = await this.safetyManager.validateFile(this.params.path, 'read');
    if (!validation.valid) {
      throw new Error(`File access denied: ${validation.reason}`);
    }
    
    const safePath = validation.safePath!;
    
    try {
      // Check if file exists
      await fs.promises.access(safePath);
      
      // Read file content
      const content = await fs.promises.readFile(safePath, 'utf-8');
      const lines = content.split('\n');
      
      let resultLines = lines;
      let truncated = false;
      
      // Apply offset and limit if specified
      if (this.params.offset !== undefined || this.params.limit !== undefined) {
        const offset = this.params.offset || 0;
        const limit = this.params.limit;
        
        if (limit !== undefined) {
          resultLines = lines.slice(offset, offset + limit);
          truncated = lines.length > offset + limit;
        } else {
          resultLines = lines.slice(offset);
        }
      }
      
      const resultContent = resultLines.join('\n');
      
      // Prepare output
      let llmContent = resultContent;
      let displayContent = resultContent;
      
      if (truncated) {
        const totalLines = lines.length;
        const showing = resultLines.length;
        const startLine = (this.params.offset || 0) + 1;
        const endLine = startLine + showing - 1;
        
        const truncationMsg = `[File content truncated: showing lines ${startLine}-${endLine} of ${totalLines} total lines]\\n`;
        llmContent = truncationMsg + resultContent;
        displayContent = `📄 **${path.basename(safePath)}** (${totalLines} lines, showing ${startLine}-${endLine})\\n\\n\`\`\`\\n${resultContent}\\n\`\`\``;
      } else {
        displayContent = `📄 **${path.basename(safePath)}** (${lines.length} lines)\\n\\n\`\`\`\\n${resultContent}\\n\`\`\``;
      }
      
      return {
        llmContent,
        returnDisplay: displayContent
      };
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${this.params.path}`);
      }
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied: ${this.params.path}`);
      }
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }
}

export class ReadFileTool extends BaseTool<ReadFileParams, ToolResult> {
  constructor(private safetyManager: SafetyManager) {
    super(
      'read_file',
      'Read File',
      'Read the contents of a file from the file system',
      ReadFileParams
    );
  }
  
  protected createValidatedInvocation(params: ReadFileParams): ToolInvocation<ReadFileParams, ToolResult> {
    return new ReadFileInvocation(params, this.safetyManager);
  }
}