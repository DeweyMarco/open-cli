/**
 * Base tool interface and implementation
 */

import { z } from 'zod';
import { ToolResult, ToolCallConfirmationDetails, ToolLocation, ToolSchema, ToolError, ToolErrorType } from './types.js';

export interface ToolInvocation<TParams extends object, TResult extends ToolResult> {
  /** Validated parameters for this invocation */
  params: TParams;
  
  /** Get pre-execution description */
  getDescription(): string;
  
  /** Get file paths this tool will affect */
  getToolLocations(): ToolLocation[];
  
  /** Check if confirmation is needed */
  shouldConfirmExecute(abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false>;
  
  /** Execute the tool */
  execute(abortSignal: AbortSignal, updateOutput?: (output: string) => void): Promise<TResult>;
}

export abstract class BaseToolInvocation<TParams extends object, TResult extends ToolResult> 
  implements ToolInvocation<TParams, TResult> {
  
  constructor(readonly params: TParams) {}
  
  abstract getDescription(): string;
  
  getToolLocations(): ToolLocation[] {
    return [];
  }
  
  shouldConfirmExecute(_abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false> {
    return Promise.resolve(false);
  }
  
  abstract execute(
    abortSignal: AbortSignal,
    updateOutput?: (output: string) => void
  ): Promise<TResult>;
}

export interface Tool<TParams extends object, TResult extends ToolResult> {
  /** Internal tool name */
  name: string;
  
  /** User-friendly display name */
  displayName: string;
  
  /** Tool description for the LLM */
  description: string;
  
  /** Zod schema for parameter validation */
  parameterSchema: z.ZodSchema<TParams>;
  
  /** Get the tool schema for LLM consumption */
  getSchema(): ToolSchema;
  
  /** Validate parameters and create invocation */
  createInvocation(params: unknown): ToolInvocation<TParams, TResult>;
}

export abstract class BaseTool<TParams extends object, TResult extends ToolResult> 
  implements Tool<TParams, TResult> {
  
  constructor(
    public readonly name: string,
    public readonly displayName: string,
    public readonly description: string,
    public readonly parameterSchema: z.ZodSchema<TParams>
  ) {}
  
  getSchema(): ToolSchema {
    // Convert Zod schema to JSON schema format
    return {
      name: this.name,
      description: this.description,
      parameters: this.zodToJsonSchema(this.parameterSchema)
    };
  }
  
  createInvocation(params: unknown): ToolInvocation<TParams, TResult> {
    try {
      const validatedParams = this.parameterSchema.parse(params);
      return this.createValidatedInvocation(validatedParams);
    } catch (error) {
      throw new ToolError(
        `Parameter validation failed: ${error}`,
        ToolErrorType.VALIDATION_ERROR,
        { originalError: error, params }
      );
    }
  }
  
  protected abstract createValidatedInvocation(params: TParams): ToolInvocation<TParams, TResult>;
  
  private zodToJsonSchema(schema: z.ZodSchema): any {
    // Basic Zod to JSON Schema conversion
    // This is simplified - in production you'd use a proper converter
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: Record<string, any> = {};
      const required: string[] = [];
      
      for (const [key, fieldSchema] of Object.entries(shape)) {
        properties[key] = this.zodFieldToJsonSchema(fieldSchema as z.ZodSchema);
        if (!this.isOptional(fieldSchema as z.ZodSchema)) {
          required.push(key);
        }
      }
      
      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    }
    
    return { type: 'object' };
  }
  
  private zodFieldToJsonSchema(schema: z.ZodSchema): any {
    if (schema instanceof z.ZodString) {
      return { type: 'string' };
    }
    if (schema instanceof z.ZodNumber) {
      return { type: 'number' };
    }
    if (schema instanceof z.ZodBoolean) {
      return { type: 'boolean' };
    }
    if (schema instanceof z.ZodArray) {
      return { 
        type: 'array',
        items: this.zodFieldToJsonSchema(schema.element)
      };
    }
    if (schema instanceof z.ZodOptional) {
      return this.zodFieldToJsonSchema(schema.unwrap());
    }
    
    return { type: 'string' };
  }
  
  private isOptional(schema: z.ZodSchema): boolean {
    return schema instanceof z.ZodOptional || schema.isOptional();
  }
}