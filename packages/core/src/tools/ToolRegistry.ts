/**
 * Tool registry for managing and executing tools
 */

import { Tool, ToolInvocation } from './BaseTool.js';
import { ToolResult, ToolSchema, ToolError, ToolErrorType } from './types.js';

export interface ToolCall {
  name: string;
  parameters: unknown;
}

export class ToolRegistry {
  private tools = new Map<string, Tool<any, any>>();
  
  /** Register a tool */
  register<TParams extends object, TResult extends ToolResult>(
    tool: Tool<TParams, TResult>
  ): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }
  
  /** Get all tool schemas for LLM consumption */
  getAllSchemas(): ToolSchema[] {
    return Array.from(this.tools.values()).map(tool => tool.getSchema());
  }
  
  /** Get a specific tool by name */
  getTool(name: string): Tool<any, any> | undefined {
    return this.tools.get(name);
  }
  
  /** Create a tool invocation from a tool call */
  createInvocation(toolCall: ToolCall): ToolInvocation<any, any> {
    const tool = this.tools.get(toolCall.name);
    if (!tool) {
      throw new ToolError(
        `Unknown tool: ${toolCall.name}`,
        ToolErrorType.NOT_FOUND_ERROR,
        { availableTools: Array.from(this.tools.keys()) }
      );
    }
    
    return tool.createInvocation(toolCall.parameters);
  }
  
  /** Get list of all registered tool names */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
  
  /** Check if a tool is registered */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
  
  /** Unregister a tool */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }
  
  /** Clear all tools */
  clear(): void {
    this.tools.clear();
  }
}