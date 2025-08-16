/**
 * List directory tool implementation
 */

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { BaseTool, BaseToolInvocation, ToolInvocation } from '../BaseTool.js';
import { ToolResult, ToolLocation } from '../types.js';
import { SafetyManager } from '../../safety/SafetyManager.js';

const ListDirectoryParams = z.object({
  path: z.string().describe('Absolute path to the directory to list'),
  show_hidden: z.boolean().optional().describe('Include hidden files and directories'),
  recursive: z.boolean().optional().describe('List subdirectories recursively')
});

type ListDirectoryParams = z.infer<typeof ListDirectoryParams>;

interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
}

class ListDirectoryInvocation extends BaseToolInvocation<ListDirectoryParams, ToolResult> {
  constructor(
    params: ListDirectoryParams,
    private safetyManager: SafetyManager
  ) {
    super(params);
  }
  
  getDescription(): string {
    const { path, recursive } = this.params;
    return `List ${recursive ? 'recursively ' : ''}directory: ${path}`;
  }
  
  getToolLocations(): ToolLocation[] {
    return [{
      path: this.params.path,
      description: 'Directory to list'
    }];
  }
  
  async execute(abortSignal: AbortSignal): Promise<ToolResult> {
    // Validate path safety
    const validation = this.safetyManager.validateFilePath(this.params.path);
    if (!validation.valid) {
      throw new Error(`Directory access denied: ${validation.reason}`);
    }
    
    const safePath = validation.safePath!;
    
    try {
      // Check if directory exists and is a directory
      const stats = await fs.promises.stat(safePath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${this.params.path}`);
      }
      
      const entries = await this.listDirectory(safePath, this.params.recursive || false);
      
      // Filter hidden files if not requested
      const filteredEntries = this.params.show_hidden 
        ? entries 
        : entries.filter(entry => !entry.name.startsWith('.'));
      
      // Sort: directories first, then alphabetically
      filteredEntries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      // Format output
      const llmContent = this.formatForLLM(safePath, filteredEntries);
      const displayContent = this.formatForDisplay(safePath, filteredEntries);
      
      return {
        llmContent,
        returnDisplay: displayContent
      };
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Directory not found: ${this.params.path}`);
      }
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied: ${this.params.path}`);
      }
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }
  
  private async listDirectory(dirPath: string, recursive: boolean): Promise<DirectoryEntry[]> {
    const entries: DirectoryEntry[] = [];
    const items = await fs.promises.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await fs.promises.stat(itemPath);
      
      entries.push({
        name: item,
        isDirectory: stats.isDirectory(),
        size: stats.isFile() ? stats.size : undefined,
        modified: stats.mtime
      });
      
      // Recurse into subdirectories if requested
      if (recursive && stats.isDirectory()) {
        const subEntries = await this.listDirectory(itemPath, true);
        entries.push(...subEntries.map(entry => ({
          ...entry,
          name: path.join(item, entry.name)
        })));
      }
    }
    
    return entries;
  }
  
  private formatForLLM(dirPath: string, entries: DirectoryEntry[]): string {
    let output = `Directory listing for ${dirPath}:\\n`;
    
    for (const entry of entries) {
      const prefix = entry.isDirectory ? '[DIR] ' : '';
      output += `${prefix}${entry.name}\\n`;
    }
    
    return output;
  }
  
  private formatForDisplay(dirPath: string, entries: DirectoryEntry[]): string {
    const dirName = path.basename(dirPath);
    let output = `📁 **${dirName}** (${entries.length} items)\\n\\n`;
    
    if (entries.length === 0) {
      output += '*Empty directory*';
      return output;
    }
    
    for (const entry of entries) {
      const icon = entry.isDirectory ? '📁' : '📄';
      const size = entry.size !== undefined ? ` (${this.formatSize(entry.size)})` : '';
      output += `${icon} ${entry.name}${size}\\n`;
    }
    
    return output;
  }
  
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

export class ListDirectoryTool extends BaseTool<ListDirectoryParams, ToolResult> {
  constructor(private safetyManager: SafetyManager) {
    super(
      'list_directory',
      'List Directory',
      'List the contents of a directory',
      ListDirectoryParams
    );
  }
  
  protected createValidatedInvocation(params: ListDirectoryParams): ToolInvocation<ListDirectoryParams, ToolResult> {
    return new ListDirectoryInvocation(params, this.safetyManager);
  }
}