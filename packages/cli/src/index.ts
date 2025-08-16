#!/usr/bin/env node

/**
 * Open CLI - Multi-model AI development assistant
 */

// Load environment variables from .env file if it exists
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file if it exists
// When running via npm workspaces, look for .env in project root (two levels up)
dotenv.config({ path: resolve(process.cwd(), '../../.env') });

import * as readline from 'readline';
import { stdin as input, stdout as output } from 'process';
import { CoreManager } from './core/CoreManager.js';
import { ModelDetector } from './utils/ModelDetector.js';

class OpenCLI {
  private rl: readline.Interface;
  private coreManager: CoreManager;
  private ctrlCCount = 0;
  
  constructor() {
    // Initialize core manager
    this.coreManager = new CoreManager({
      rootDirectory: process.cwd(),
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    // Create readline interface
    this.rl = readline.createInterface({ input, output });
    
    // Setup signal handlers
    this.setupSignalHandlers();
  }
  
  private setupSignalHandlers(): void {
    this.rl.on('SIGINT', () => {
      this.ctrlCCount++;
      if (this.ctrlCCount >= 2) {
        console.log('\\nGoodbye! 👋');
        this.rl.close();
        process.exit(0);
      } else {
        console.log('\\nPress Ctrl-C again to quit');
        setTimeout(() => { this.ctrlCCount = 0; }, 2000);
      }
    });
    
    this.rl.on('line', () => {
      this.ctrlCCount = 0;
    });
  }
  
  async start(): Promise<void> {
    this.showWelcome();
    await this.mainLoop();
  }
  
  private showWelcome(): void {
    console.log('🚀 **Open CLI** - Multi-Model AI Development Assistant');
    console.log('   Press Ctrl-C twice to quit\\n');
    
    const availableModels = this.coreManager.getAvailableModels();
    console.log('📡 **Available models:**');
    
    if (availableModels.length === 0) {
      console.log('   ❌ No models configured. Please set API keys:');
      console.log('   - GEMINI_API_KEY for Google Gemini');
      console.log('   - CLAUDE_API_KEY for Anthropic Claude');
      console.log('');
      return;
    }
    
    for (const model of availableModels) {
      console.log(`   ✅ @${model}`);
    }
    
    console.log('\\n🛠️  **Available tools:**');
    const availableTools = this.coreManager.getAvailableTools();
    for (const tool of availableTools) {
      console.log(`   🔧 ${tool}`);
    }
    
    console.log('\\n💡 **Usage:** @modelname your message here');
    console.log('   Example: @gemini read the package.json file');
    console.log('   Example: @claude write a function to calculate fibonacci\\n');
  }
  
  private async mainLoop(): Promise<void> {
    while (true) {
      try {
        const input = await this.askQuestion('You: ');
        
        if (input.trim() === '') {
          continue;
        }
        
        await this.processInput(input);
        
      } catch (error: any) {
        console.error(`❌ Error: ${error.message}\\n`);
      }
    }
  }
  
  private async askQuestion(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }
  
  private async processInput(input: string): Promise<void> {
    const modelMention = ModelDetector.detectModel(input);
    
    if (!modelMention) {
      console.log('❌ Please specify a model using @modelname (e.g., @gemini, @claude)\\n');
      return;
    }
    
    const availableModels = this.coreManager.getAvailableModels();
    if (!availableModels.includes(modelMention.model)) {
      console.log(`❌ Model '@${modelMention.model}' not available.`);
      console.log(`   Available models: ${availableModels.map(m => '@' + m).join(', ')}\\n`);
      return;
    }
    
    console.log(`\\n🤖 **${modelMention.model.toUpperCase()}:**`);
    
    try {
      const response = await this.coreManager.sendMessage(
        modelMention.model,
        modelMention.cleanMessage
      );
      
      console.log(response);
      console.log(''); // Add spacing
      
    } catch (error: any) {
      console.error(`❌ ${modelMention.model} error: ${error.message}\\n`);
    }
  }
}

// Start the CLI
const cli = new OpenCLI();
cli.start().catch(console.error);