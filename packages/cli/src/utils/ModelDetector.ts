/**
 * Utility to detect model mentions in user input
 */

export interface ModelMention {
  model: string;
  cleanMessage: string;
}

export class ModelDetector {
  private static readonly MODEL_PATTERN = /@(\w+)/gi;
  
  /** Detect model mention in user input */
  static detectModel(input: string): ModelMention | null {
    const matches = Array.from(input.matchAll(this.MODEL_PATTERN));
    
    if (matches.length === 0) {
      return null;
    }
    
    // Use the first model mentioned
    const match = matches[0];
    const model = match[1].toLowerCase();
    
    // Remove all model mentions from the message
    const cleanMessage = input.replace(this.MODEL_PATTERN, '').trim();
    
    return {
      model,
      cleanMessage
    };
  }
  
  /** Check if input contains a model mention */
  static hasModelMention(input: string): boolean {
    return this.MODEL_PATTERN.test(input);
  }
  
  /** Get all model mentions in input */
  static getAllModels(input: string): string[] {
    const matches = Array.from(input.matchAll(this.MODEL_PATTERN));
    return matches.map(match => match[1].toLowerCase());
  }
}