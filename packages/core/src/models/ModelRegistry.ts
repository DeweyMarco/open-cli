/**
 * Model registry for managing different AI model clients
 */

import { ModelClient, ModelConfig, ModelProvider } from './types.js';
import { GeminiClient } from './GeminiClient.js';
import { ClaudeClient } from './ClaudeClient.js';

export class ModelRegistry {
  private clients = new Map<string, ModelClient>();
  
  /** Register a model client */
  registerModel(name: string, client: ModelClient): void {
    this.clients.set(name.toLowerCase(), client);
  }
  
  /** Create and register a model client from config */
  createModel(provider: ModelProvider, name: string, config: ModelConfig): ModelClient {
    let client: ModelClient;
    
    switch (provider) {
      case ModelProvider.GEMINI:
        client = new GeminiClient(config);
        break;
      case ModelProvider.CLAUDE:
        client = new ClaudeClient(config);
        break;
      default:
        throw new Error(`Unsupported model provider: ${provider}`);
    }
    
    this.registerModel(name, client);
    return client;
  }
  
  /** Get a model client by name */
  getModel(name: string): ModelClient | undefined {
    return this.clients.get(name.toLowerCase());
  }
  
  /** Get all available model names */
  getAvailableModels(): string[] {
    return Array.from(this.clients.keys());
  }
  
  /** Check if a model is registered */
  hasModel(name: string): boolean {
    return this.clients.has(name.toLowerCase());
  }
  
  /** Remove a model */
  removeModel(name: string): boolean {
    return this.clients.delete(name.toLowerCase());
  }
  
  /** Clear all models */
  clear(): void {
    this.clients.clear();
  }
}

/** Create models from environment variables */
export function createModelsFromEnv(): ModelRegistry {
  const registry = new ModelRegistry();
  
  // Gemini
  if (process.env.GEMINI_API_KEY) {
    registry.createModel(ModelProvider.GEMINI, 'gemini', {
      model: 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY
    });
  }
  
  // Claude
  if (process.env.CLAUDE_API_KEY) {
    registry.createModel(ModelProvider.CLAUDE, 'claude', {
      model: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.CLAUDE_API_KEY
    });
  }
  
  return registry;
}