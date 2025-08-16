/**
 * Gemini API client implementation
 */

import { ModelClient, ModelMessage, ModelResponse, ModelConfig, ToolCall } from './types.js';
import { ToolSchema } from '../tools/types.js';

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string } | { functionCall: any } | { functionResponse: any }>;
}

export class GeminiClient implements ModelClient {
  readonly name = 'gemini';
  
  constructor(private config: ModelConfig) {}
  
  async sendMessage(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse> {
    const geminiMessages = this.convertMessages(messages);
    
    const requestBody: any = {
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens || 1024,
        temperature: this.config.temperature || 0.7
      }
    };
    
    // Add tools if available
    if (availableTools && availableTools.length > 0) {
      requestBody.tools = [{
        functionDeclarations: availableTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }))
      }];
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return this.parseResponse(data);
  }
  
  supportsTools(): boolean {
    return true;
  }
  
  private convertMessages(messages: ModelMessage[]): GeminiMessage[] {
    const geminiMessages: GeminiMessage[] = [];
    
    for (const message of messages) {
      if (message.role === 'tool') {
        // Add as function response
        const lastMessage = geminiMessages[geminiMessages.length - 1];
        if (lastMessage) {
          lastMessage.parts.push({
            functionResponse: {
              name: 'tool_response',
              response: { content: message.content }
            }
          });
        }
      } else {
        const role = message.role === 'assistant' ? 'model' : 'user';
        const parts: any[] = [{ text: message.content }];
        
        // Add tool calls if present
        if (message.toolCalls) {
          for (const toolCall of message.toolCalls) {
            parts.push({
              functionCall: {
                name: toolCall.name,
                args: toolCall.parameters
              }
            });
          }
        }
        
        geminiMessages.push({ role, parts });
      }
    }
    
    return geminiMessages;
  }
  
  private parseResponse(data: any): ModelResponse {
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response candidate from Gemini');
    }
    
    const content = candidate.content;
    let text = '';
    const toolCalls: ToolCall[] = [];
    
    // Process parts
    if (content.parts) {
      for (const part of content.parts) {
        if (part.text) {
          text += part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            id: Math.random().toString(36),
            name: part.functionCall.name,
            parameters: part.functionCall.args || {}
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
      finishReason: candidate.finishReason === 'STOP' ? 'stop' : 
                   toolCalls.length > 0 ? 'tool_calls' : 'stop'
    };
  }
}