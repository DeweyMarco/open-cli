/**
 * Safety and confirmation framework
 */

import { ToolCallConfirmationDetails, ToolLocation } from '../tools/types.js';

export enum ConfirmationOutcome {
  APPROVED = 'approved',
  DENIED = 'denied',
  CANCELLED = 'cancelled'
}

export interface ConfirmationRequest {
  toolName: string;
  description: string;
  details: ToolCallConfirmationDetails;
  locations: ToolLocation[];
}

export interface ConfirmationResponse {
  outcome: ConfirmationOutcome;
  message?: string;
}

export interface ConfirmationHandler {
  /** Request confirmation from user */
  requestConfirmation(request: ConfirmationRequest): Promise<ConfirmationResponse>;
}

export class ConfirmationManager {
  constructor(private handler: ConfirmationHandler) {}
  
  /** Request confirmation for a tool execution */
  async requestConfirmation(
    toolName: string,
    description: string,
    details: ToolCallConfirmationDetails,
    locations: ToolLocation[] = []
  ): Promise<ConfirmationResponse> {
    const request: ConfirmationRequest = {
      toolName,
      description,
      details,
      locations
    };
    
    return this.handler.requestConfirmation(request);
  }
}

/** Default confirmation handler that auto-approves read-only operations */
export class DefaultConfirmationHandler implements ConfirmationHandler {
  private readOnlyTools = new Set(['read_file', 'list_directory', 'grep', 'glob']);
  
  async requestConfirmation(request: ConfirmationRequest): Promise<ConfirmationResponse> {
    // Auto-approve read-only operations
    if (this.readOnlyTools.has(request.toolName) && !request.details.destructive) {
      return { outcome: ConfirmationOutcome.APPROVED };
    }
    
    // For now, auto-approve everything (in production, this would prompt user)
    console.warn(`[SAFETY] Would request confirmation for: ${request.description}`);
    return { outcome: ConfirmationOutcome.APPROVED };
  }
}