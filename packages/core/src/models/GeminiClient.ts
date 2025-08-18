/**
 * Professional Gemini API client implementation with proper type safety
 * Eliminates amateur 'any' types and implements robust error handling
 */

import { randomUUID } from 'crypto';

import { ModelClient, ModelMessage, ModelResponse, ModelConfig, ToolCall } from './types.js';
import { ToolSchema } from '../tools/types.js';
import { createLogger, ILogger } from '../logging/index.js';
import { ApiError, NetworkError, ErrorUtils, type Result } from '../errors/index.js';
import {
  GeminiMessage,
  GeminiRequestBody,
  GeminiResponse,
  GeminiErrorResponse,
  GeminiContentPart,
  GeminiFinishReason,
  isGeminiErrorResponse,
  isGeminiTextPart,
  isGeminiFunctionCallPart,
  GeminiFunctionDeclaration,
} from './api-types/index.js';

/**
 * Professional Gemini client with type safety and error handling
 */
export class GeminiClient implements ModelClient {
  public readonly name = 'gemini';
  private readonly logger: ILogger;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(private readonly config: ModelConfig) {
    this.logger = createLogger('GeminiClient');
    this.validateConfig();
  }

  /**
   * Validate configuration on construction
   */
  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new ApiError(
        'Gemini API key is required',
        400,
        'Gemini',
        { configField: 'apiKey' }
      );
    }
    if (!this.config.model) {
      throw new ApiError(
        'Gemini model is required',
        400,
        'Gemini',
        { configField: 'model' }
      );
    }
  }

  /**
   * Send message to Gemini API with proper error handling
   */
  public async sendMessage(
    messages: ModelMessage[],
    availableTools?: ToolSchema[],
    abortSignal?: AbortSignal
  ): Promise<ModelResponse> {
    this.logger.debug('Sending message to Gemini', {
      messageCount: messages.length,
      toolCount: availableTools?.length ?? 0,
    });

    const result = await this.sendMessageWithRetry(messages, availableTools, abortSignal);
    
    if (!result.success) {
      this.logger.error('Failed to send message to Gemini', result.error);
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
            this.logger.warn(`Retrying Gemini request (attempt ${attempt})`, { error: error.message });
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
    const geminiMessages = this.convertMessages(messages);
    const requestBody = this.buildRequestBody(geminiMessages, availableTools);

    const url = `${this.baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        'Failed to connect to Gemini API',
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
        'Invalid JSON response from Gemini API',
        response.status,
        'Gemini',
        {
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
        },
        error instanceof Error ? error : new Error(String(error))
      );
    }

    if (!response.ok) {
      if (isGeminiErrorResponse(responseData)) {
        throw new ApiError(
          responseData.error.message,
          responseData.error.code,
          'Gemini',
          {
            errorStatus: responseData.error.status,
            details: responseData.error.details,
          }
        );
      } else {
        throw new ApiError(
          `Gemini API error: ${response.statusText}`,
          response.status,
          'Gemini',
          { responseData }
        );
      }
    }

    return this.parseResponse(responseData as GeminiResponse);
  }

  /**
   * Build request body with proper typing
   */
  private buildRequestBody(
    geminiMessages: GeminiMessage[],
    availableTools?: ToolSchema[]
  ): GeminiRequestBody {
    const requestBody: GeminiRequestBody = {
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens ?? 1024,
        temperature: this.config.temperature ?? 0.7,
      },
    };

    // Add tools if available
    if (availableTools && availableTools.length > 0) {
      const functionDeclarations: GeminiFunctionDeclaration[] = availableTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          properties: tool.parameters.properties ?? {},
          required: tool.parameters.required,
        },
      }));

      requestBody.tools = [{ functionDeclarations }];
    }

    return requestBody;
  }

  /**
   * Convert internal messages to Gemini format with type safety
   */
  private convertMessages(messages: ModelMessage[]): GeminiMessage[] {
    const geminiMessages: GeminiMessage[] = [];

    for (const message of messages) {
      if (message.role === 'tool') {
        // Add as function response to the last message
        const lastMessage = geminiMessages[geminiMessages.length - 1];
        if (lastMessage) {
          lastMessage.parts.push({
            functionResponse: {
              name: message.toolCallId || 'unknown_tool',
              response: { content: message.content },
            },
          });
        }
      } else {
        const role = message.role === 'assistant' ? ('model' as const) : ('user' as const);
        const parts: GeminiContentPart[] = [];

        // Add text content
        if (message.content.trim()) {
          parts.push({ text: message.content });
        }

        // Add tool calls if present
        if (message.toolCalls) {
          for (const toolCall of message.toolCalls) {
            parts.push({
              functionCall: {
                name: toolCall.name,
                args: toolCall.parameters as Record<string, unknown>,
              },
            });
          }
        }

        if (parts.length > 0) {
          geminiMessages.push({ role, parts });
        }
      }
    }

    return geminiMessages;
  }

  /**
   * Parse response with proper type checking
   */
  private parseResponse(data: GeminiResponse): ModelResponse {
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new ApiError(
        'No response candidate from Gemini',
        500,
        'Gemini',
        { candidateCount: data.candidates?.length ?? 0 }
      );
    }

    const content = candidate.content;
    let text = '';
    const toolCalls: ToolCall[] = [];

    // Process parts with type safety
    if (content.parts) {
      for (const part of content.parts) {
        if (isGeminiTextPart(part)) {
          text += part.text;
        } else if (isGeminiFunctionCallPart(part)) {
          toolCalls.push({
            id: randomUUID(), // Use proper UUID instead of Math.random
            name: part.functionCall.name,
            parameters: part.functionCall.args,
          });
        }
      }
    }

    const message: ModelMessage = {
      role: 'assistant',
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };

    const finishReason = this.mapFinishReason(candidate.finishReason);

    return {
      message,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason,
    };
  }

  /**
   * Map Gemini finish reason to internal format
   */
  private mapFinishReason(
    geminiReason: GeminiFinishReason
  ): ModelResponse['finishReason'] {
    switch (geminiReason) {
      case GeminiFinishReason.STOP:
        return 'stop';
      case GeminiFinishReason.MAX_TOKENS:
        return 'length';
      case GeminiFinishReason.SAFETY:
        return 'content_filter';
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