/**
 * Core types for the tool system
 */

export interface ToolResult {
  /** Content to be sent back to the LLM for context */
  llmContent: string | PartListUnion;
  /** User-friendly display content (often markdown) */
  returnDisplay: string;
}

export interface PartListUnion extends Array<string | Part> {}

export interface Part {
  inlineData?: {
    mimeType: string;
    data: string;
  };
  text?: string;
}

export interface ToolCallConfirmationDetails {
  message: string;
  description: string;
  destructive?: boolean;
}

export interface ToolLocation {
  path: string;
  description?: string;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export enum ToolErrorType {
  VALIDATION_ERROR = 'validation_error',
  EXECUTION_ERROR = 'execution_error',
  PERMISSION_ERROR = 'permission_error',
  NOT_FOUND_ERROR = 'not_found_error',
  CANCELLED = 'cancelled',
}

export class ToolError extends Error {
  constructor(
    message: string,
    public readonly type: ToolErrorType,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ToolError';
  }
}