/**
 * Professional Claude API client implementation with proper type safety
 * Eliminates amateur 'any' types and implements robust error handling
 */

import { ModelClient, ModelMessage, ModelResponse, ModelConfig, ToolCall } from './types.js';
import { ToolSchema } from '../tools/types.js';
import { createLogger, ILogger } from '../logging/index.js';
import { ApiError, NetworkError, ErrorUtils, type Result } from '../errors/index.js';
import {
  ClaudeMessage,
  ClaudeRequestBody,
  ClaudeResponse,
  ClaudeErrorResponse,
  ClaudeContentBlock,
  ClaudeStopReason,
  ClaudeTool,
  isClaudeErrorResponse,
  isClaudeTextBlock,
  isClaudeToolUseBlock,
  extractTextFromBlocks,
  extractToolUsesFromBlocks,
} from './api-types/index.js';

/**
 * Professional Claude client with type safety and error handling
 */
export class ClaudeClient implements ModelClient {
  public readonly name = 'claude';
  private readonly logger: ILogger;
  private readonly baseUrl = 'https://api.anthropic.com/v1';
  private readonly apiVersion = '2023-06-01';

  constructor(private readonly config: ModelConfig) {
    this.logger = createLogger('ClaudeClient');
    this.validateConfig();
  }

  /**
   * Validate configuration on construction
   */
  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new ApiError(
        'Claude API key is required',
        400,
        'Claude',
        { configField: 'apiKey' }
      );
    }
    if (!this.config.model) {
      throw new ApiError(
        'Claude model is required',
        400,
        'Claude',
        { configField: 'model' }
      );
    }
  }

  /**
   * Send message to Claude API with proper error handling
   */
  public async sendMessage(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse> {
    this.logger.debug('Sending message to Claude', {
      messageCount: messages.length,
      toolCount: availableTools?.length ?? 0,
    });

    const result = await this.sendMessageWithRetry(messages, availableTools, abortSignal);
    
    if (!result.success) {
      this.logger.error('Failed to send message to Claude', result.error);
      throw result.error;
    }

    return result.data;
  }

  /**
   * Send message with retry logic
   */
  private async sendMessageWithRetry(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<Result<ModelResponse>> {
    return ErrorUtils.safeAsync(async () => {
      return await ErrorUtils.retry(
        () => this.sendMessageInternal(messages, availableTools, abortSignal),
        {
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          onRetry: (attempt, error) => {
            this.logger.warn(`Retrying Claude request (attempt ${attempt})`, { error: error.message });
          },
        }
      );
    });
  }

  /**
   * Internal message sending implementation
   */
  private async sendMessageInternal(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse> {
    const claudeMessages = this.convertMessages(messages);
    const requestBody = this.buildRequestBody(claudeMessages, availableTools);

    const url = `${this.baseUrl}/messages`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': this.apiVersion,
          'User-Agent': 'OpenCLI/1.0',
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error; // Don't wrap abort errors
      }
      throw new NetworkError(
        'Failed to connect to Claude API',
        'fetch',
        { url },
        error instanceof Error ? error : new Error(String(error))
      );
    }

    return this.handleResponse(response);
  }

  /**
   * Handle API response with proper error handling
   */
  private async handleResponse(response: Response): Promise<ModelResponse> {
    let responseData: unknown;

    try {
      responseData = await response.json();
    } catch (error) {
      throw new ApiError(
        'Invalid JSON response from Claude API',
        response.status,
        'Claude',
        {
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
        },
        error instanceof Error ? error : new Error(String(error))
      );
    }

    if (!response.ok) {
      if (isClaudeErrorResponse(responseData)) {
        throw new ApiError(
          responseData.error.message,
          response.status,
          'Claude',
          {
            errorType: responseData.error.type,
          }
        );
      } else {
        throw new ApiError(
          `Claude API error: ${response.statusText}`,
          response.status,
          'Claude',
          { responseData }
        );
      }
    }

    return this.parseResponse(responseData as ClaudeResponse);
  }

  /**
   * Build request body with proper typing
   */
  private buildRequestBody(
    claudeMessages: ClaudeMessage[],
    availableTools?: ToolSchema[]
  ): ClaudeRequestBody {
    const requestBody: ClaudeRequestBody = {
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 1024,
      messages: claudeMessages,
      temperature: this.config.temperature,
    };

    // Add tools if available
    if (availableTools && availableTools.length > 0) {
      const tools: ClaudeTool[] = availableTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: 'object' as const,
          properties: tool.parameters.properties ?? {},
          required: tool.parameters.required,
        },
      }));

      requestBody.tools = tools;
    }

    return requestBody;
  }

  /**
   * Convert internal messages to Claude format with type safety
   */
  private convertMessages(messages: ModelMessage[]): ClaudeMessage[] {
    const claudeMessages: ClaudeMessage[] = [];

    for (const message of messages) {
      if (message.role === 'tool') {
        // Add as tool result to the last message
        const lastMessage = claudeMessages[claudeMessages.length - 1];
        if (lastMessage && Array.isArray(lastMessage.content)) {
          lastMessage.content.push({
            type: 'tool_result',
            tool_use_id: message.toolCallId || 'unknown',
            content: message.content,
          });
        }
      } else {
        const role = message.role === 'assistant' ? ('assistant' as const) : ('user' as const);
        let content: string | ClaudeContentBlock[] = message.content;

        // Add tool calls if present
        if (message.toolCalls && message.toolCalls.length > 0) {
          const blocks: ClaudeContentBlock[] = [];

          // Add text content if present
          if (message.content.trim()) {
            blocks.push({ type: 'text', text: message.content });
          }

          // Add tool uses
          for (const toolCall of message.toolCalls) {
            blocks.push({
              type: 'tool_use',
              id: toolCall.id,
              name: toolCall.name,
              input: toolCall.parameters as Record<string, unknown>,
            });
          }

          content = blocks;
        }

        claudeMessages.push({ role, content });
      }
    }

    return claudeMessages;
  }

  /**
   * Parse response with proper type checking
   */
  private parseResponse(data: ClaudeResponse): ModelResponse {
    const text = extractTextFromBlocks(data.content);
    const toolUses = extractToolUsesFromBlocks(data.content);

    const toolCalls: ToolCall[] = toolUses.map(toolUse => ({
      id: toolUse.id,
      name: toolUse.name,
      parameters: toolUse.input,
    }));

    const message: ModelMessage = {
      role: 'assistant',
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };

    const finishReason = this.mapStopReason(data.stop_reason);

    return {
      message,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason,
    };
  }

  /**
   * Map Claude stop reason to internal format
   */
  private mapStopReason(
    claudeReason: ClaudeStopReason
  ): ModelResponse['finishReason'] {
    switch (claudeReason) {
      case ClaudeStopReason.END_TURN:
        return 'stop';
      case ClaudeStopReason.MAX_TOKENS:
        return 'length';
      case ClaudeStopReason.STOP_SEQUENCE:
        return 'stop';
      case ClaudeStopReason.TOOL_USE:
        return 'tool_calls';
      default:
        return 'stop';
    }
  }

  /**
   * Check if model supports tools
   */
  public supportsTools(): boolean {
    return true;
  }
}