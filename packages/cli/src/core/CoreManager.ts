/**
 * Core manager that orchestrates models and tools
 */

import {
  ToolRegistry,
  ModelRegistry,
  ModelMessage,
  SafetyManager,
  DefaultConfirmationHandler,
  ConfirmationManager,
  ReadFileTool,
  WriteFileTool,
  ListDirectoryTool,
  createModelsFromEnv
} from '@open-cli/core';

// Define ToolCall interface with id field
interface ToolCall {
  id: string;
  name: string;
  parameters: unknown;
}

export interface CoreConfig {
  rootDirectory: string;
  maxFileSize?: number;
  allowedExtensions?: string[];
}

export class CoreManager {
  private toolRegistry: ToolRegistry;
  private modelRegistry: ModelRegistry;
  private safetyManager: SafetyManager;
  private confirmationManager: ConfirmationManager;
  private conversations = new Map<string, ModelMessage[]>();
  
  constructor(config: CoreConfig) {
    // Initialize registries
    this.toolRegistry = new ToolRegistry();
    this.modelRegistry = createModelsFromEnv();
    
    // Initialize safety
    this.safetyManager = new SafetyManager({
      rootDirectory: config.rootDirectory,
      maxFileSize: config.maxFileSize,
      allowedExtensions: config.allowedExtensions
    });
    
    this.confirmationManager = new ConfirmationManager(
      new DefaultConfirmationHandler()
    );
    
    // Register built-in tools
    this.registerBuiltInTools();
  }
  
  private registerBuiltInTools(): void {
    this.toolRegistry.register(new ReadFileTool(this.safetyManager));
    this.toolRegistry.register(new WriteFileTool(this.safetyManager));
    this.toolRegistry.register(new ListDirectoryTool(this.safetyManager));
  }
  
  /** Get available models */
  getAvailableModels(): string[] {
    return this.modelRegistry.getAvailableModels();
  }
  
  /** Get available tools */
  getAvailableTools(): string[] {
    return this.toolRegistry.getToolNames();
  }
  
  /** Send message to a model */
  async sendMessage(
    modelName: string,
    message: string,
    abortSignal?: AbortSignal
  ): Promise<string> {
    const model = this.modelRegistry.getModel(modelName);
    if (!model) {
      throw new Error(`Model not found: ${modelName}. Available: ${this.getAvailableModels().join(', ')}`);
    }
    
    // Get or create conversation history
    const conversationKey = modelName.toLowerCase();
    if (!this.conversations.has(conversationKey)) {
      this.conversations.set(conversationKey, []);
    }
    const conversation = this.conversations.get(conversationKey)!;
    
    // Add user message
    conversation.push({
      role: 'user',
      content: message
    });
    
    // Get available tools
    const toolSchemas = model.supportsTools() ? this.toolRegistry.getAllSchemas() : undefined;
    
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Send to model
      const response = await model.sendMessage(conversation, toolSchemas, abortSignal);
      
      // Add assistant message
      conversation.push(response.message);
      
      // Handle tool calls if present
      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.executeToolCalls(response.toolCalls, conversation);
        // Continue the loop to get final response
        continue;
      }
      
      // Return final response
      return response.message.content;
    }
    
    throw new Error('Too many tool call iterations');
  }
  
  private async executeToolCalls(toolCalls: ToolCall[], conversation: ModelMessage[]): Promise<void> {
    for (const toolCall of toolCalls) {
      try {
        // Create tool invocation
        const invocation = this.toolRegistry.createInvocation({
          name: toolCall.name,
          parameters: toolCall.parameters
        });
        
        // Check for confirmation
        const confirmationDetails = await invocation.shouldConfirmExecute(new AbortController().signal);
        if (confirmationDetails) {
          const response = await this.confirmationManager.requestConfirmation(
            toolCall.name,
            invocation.getDescription(),
            confirmationDetails,
            invocation.getToolLocations()
          );
          
          if (response.outcome !== 'approved') {
            // Add cancelled tool response
            conversation.push({
              role: 'tool',
              content: `Tool execution cancelled by user: ${response.message || 'No reason provided'}`,
              toolCallId: toolCall.id
            });
            continue;
          }
        }
        
        // Execute tool
        const result = await invocation.execute(new AbortController().signal);
        
        // Add tool response to conversation
        conversation.push({
          role: 'tool',
          content: typeof result.llmContent === 'string' ? result.llmContent : JSON.stringify(result.llmContent),
          toolCallId: toolCall.id
        });
        
        // Display result to user (in a real CLI, this would go to the UI)
        console.log(`\\n🔧 **${toolCall.name}**\\n${result.returnDisplay}\\n`);
        
      } catch (error: any) {
        console.error(`❌ Tool execution failed: ${error.message}`);
        
        // Add error response to conversation
        conversation.push({
          role: 'tool',
          content: `Tool execution failed: ${error.message}`,
          toolCallId: toolCall.id
        });
      }
    }
  }
  
  /** Clear conversation history for a model */
  clearConversation(modelName: string): void {
    const conversationKey = modelName.toLowerCase();
    this.conversations.delete(conversationKey);
  }
  
  /** Get conversation history for a model */
  getConversation(modelName: string): ModelMessage[] {
    const conversationKey = modelName.toLowerCase();
    return this.conversations.get(conversationKey) || [];
  }
}