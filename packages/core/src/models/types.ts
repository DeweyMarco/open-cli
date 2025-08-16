/**
 * Model interface definitions
 */

import { ToolSchema, ToolResult } from '../tools/types.js';

export interface ModelMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: unknown;
}

export interface ModelResponse {
  message: ModelMessage;
  toolCalls?: ToolCall[];
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}

export interface ModelConfig {
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ModelClient {
  /** Model identifier */
  readonly name: string;
  
  /** Send a message and get response */
  sendMessage(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse>;
  
  /** Check if the model supports tools */
  supportsTools(): boolean;
}

export enum ModelProvider {
  GEMINI = 'gemini',
  CLAUDE = 'claude',
  OPENAI = 'openai'
}

export interface ConversationHistory {
  modelName: string;
  messages: ModelMessage[];
  lastUpdated: Date;
}