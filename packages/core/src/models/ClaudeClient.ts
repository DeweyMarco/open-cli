/**
 * Claude API client implementation
 */

import { ModelClient, ModelMessage, ModelResponse, ModelConfig, ToolCall } from './types.js';
import { ToolSchema } from '../tools/types.js';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'tool_use' | 'tool_result'; [key: string]: any }>;
}

export class ClaudeClient implements ModelClient {
  readonly name = 'claude';
  
  constructor(private config: ModelConfig) {}
  
  async sendMessage(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse> {
    const claudeMessages = this.convertMessages(messages);
    
    const requestBody: any = {
      model: this.config.model,
      max_tokens: this.config.maxTokens || 1024,
      messages: claudeMessages
    };
    
    // Add tools if available
    if (availableTools && availableTools.length > 0) {
      requestBody.tools = availableTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters
      }));
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody),
      signal: abortSignal
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return this.parseResponse(data);
  }
  
  supportsTools(): boolean {
    return true;
  }
  
  private convertMessages(messages: ModelMessage[]): ClaudeMessage[] {
    const claudeMessages: ClaudeMessage[] = [];
    
    for (const message of messages) {
      if (message.role === 'tool') {
        // Add as tool result
        const lastMessage = claudeMessages[claudeMessages.length - 1];
        if (lastMessage && Array.isArray(lastMessage.content)) {
          lastMessage.content.push({
            type: 'tool_result',
            tool_use_id: message.toolCallId || 'unknown',
            content: message.content
          });
        }
      } else {
        const role = message.role === 'assistant' ? 'assistant' : 'user';
        let content: string | any[] = message.content;
        
        // Add tool calls if present
        if (message.toolCalls) {
          content = [{ type: 'text', text: message.content }];
          for (const toolCall of message.toolCalls) {
            content.push({
              type: 'tool_use',
              id: toolCall.id,
              name: toolCall.name,
              input: toolCall.parameters
            });
          }
        }
        
        claudeMessages.push({ role, content });
      }
    }
    
    return claudeMessages;
  }
  
  private parseResponse(data: any): ModelResponse {
    let text = '';
    const toolCalls: ToolCall[] = [];
    
    // Process content
    if (data.content) {
      for (const item of data.content) {
        if (item.type === 'text') {
          text += item.text;
        }
        if (item.type === 'tool_use') {
          toolCalls.push({
            id: item.id,
            name: item.name,
            parameters: item.input || {}
          });
        }
      }
    }
    
    const message: ModelMessage = {
      role: 'assistant',
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };
    
    return {
      message,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: data.stop_reason === 'end_turn' ? 'stop' : 
                   toolCalls.length > 0 ? 'tool_calls' : 'stop'
    };
  }
}