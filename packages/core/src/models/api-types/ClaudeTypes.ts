/**
 * Professional type definitions for Claude API
 * Replaces amateur 'any' types with proper interfaces
 */

/**
 * Claude API text content block
 */
export interface ClaudeTextBlock {
  type: 'text';
  text: string;
}

/**
 * Claude API tool use block
 */
export interface ClaudeToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Claude API tool result block
 */
export interface ClaudeToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Union type for all Claude content blocks
 */
export type ClaudeContentBlock = 
  | ClaudeTextBlock
  | ClaudeToolUseBlock
  | ClaudeToolResultBlock;

/**
 * Claude message structure
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

/**
 * Claude tool definition
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Claude API request body
 */
export interface ClaudeRequestBody {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  tools?: ClaudeTool[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  system?: string;
  stream?: boolean;
}

/**
 * Claude usage information
 */
export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
}

/**
 * Claude stop reasons
 */
export enum ClaudeStopReason {
  END_TURN = 'end_turn',
  MAX_TOKENS = 'max_tokens',
  STOP_SEQUENCE = 'stop_sequence',
  TOOL_USE = 'tool_use',
}

/**
 * Claude API response
 */
export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ClaudeContentBlock[];
  model: string;
  stop_reason: ClaudeStopReason;
  stop_sequence?: string;
  usage: ClaudeUsage;
}

/**
 * Claude API error response
 */
export interface ClaudeErrorResponse {
  type: 'error';
  error: {
    type: ClaudeErrorType;
    message: string;
  };
}

/**
 * Claude error types
 */
export enum ClaudeErrorType {
  INVALID_REQUEST_ERROR = 'invalid_request_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  PERMISSION_ERROR = 'permission_error',
  NOT_FOUND_ERROR = 'not_found_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  API_ERROR = 'api_error',
  OVERLOADED_ERROR = 'overloaded_error',
}

/**
 * Claude streaming response chunk
 */
export interface ClaudeStreamChunk {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';
  [key: string]: unknown;
}

/**
 * Type guard for Claude error response
 */
export function isClaudeErrorResponse(
  response: unknown
): response is ClaudeErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'type' in response &&
    (response as any).type === 'error' &&
    'error' in response &&
    typeof (response as any).error === 'object'
  );
}

/**
 * Type guard for Claude text block
 */
export function isClaudeTextBlock(block: ClaudeContentBlock): block is ClaudeTextBlock {
  return block.type === 'text';
}

/**
 * Type guard for Claude tool use block
 */
export function isClaudeToolUseBlock(
  block: ClaudeContentBlock
): block is ClaudeToolUseBlock {
  return block.type === 'tool_use';
}

/**
 * Type guard for Claude tool result block
 */
export function isClaudeToolResultBlock(
  block: ClaudeContentBlock
): block is ClaudeToolResultBlock {
  return block.type === 'tool_result';
}

/**
 * Utility to extract text content from Claude blocks
 */
export function extractTextFromBlocks(blocks: ClaudeContentBlock[]): string {
  return blocks
    .filter(isClaudeTextBlock)
    .map(block => block.text)
    .join('');
}

/**
 * Utility to extract tool uses from Claude blocks
 */
export function extractToolUsesFromBlocks(blocks: ClaudeContentBlock[]): ClaudeToolUseBlock[] {
  return blocks.filter(isClaudeToolUseBlock);
}