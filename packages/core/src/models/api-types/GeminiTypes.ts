/**
 * Professional type definitions for Gemini API
 * Replaces amateur 'any' types with proper interfaces
 */

/**
 * Gemini API text content part
 */
export interface GeminiTextPart {
  text: string;
}

/**
 * Gemini API function call part
 */
export interface GeminiFunctionCallPart {
  functionCall: {
    name: string;
    args: Record<string, unknown>;
  };
}

/**
 * Gemini API function response part
 */
export interface GeminiFunctionResponsePart {
  functionResponse: {
    name: string;
    response: Record<string, unknown>;
  };
}

/**
 * Union type for all Gemini content parts
 */
export type GeminiContentPart = 
  | GeminiTextPart
  | GeminiFunctionCallPart
  | GeminiFunctionResponsePart;

/**
 * Gemini message structure
 */
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}

/**
 * Gemini function declaration
 */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Gemini tools configuration
 */
export interface GeminiTools {
  functionDeclarations: GeminiFunctionDeclaration[];
}

/**
 * Gemini generation configuration
 */
export interface GeminiGenerationConfig {
  maxOutputTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
  candidateCount?: number;
  stopSequences?: string[];
}

/**
 * Gemini API request body
 */
export interface GeminiRequestBody {
  contents: GeminiMessage[];
  generationConfig?: GeminiGenerationConfig;
  tools?: GeminiTools[];
  safetySettings?: GeminiSafetySetting[];
}

/**
 * Gemini safety setting
 */
export interface GeminiSafetySetting {
  category: GeminiSafetyCategory;
  threshold: GeminiSafetyThreshold;
}

/**
 * Gemini safety categories
 */
export enum GeminiSafetyCategory {
  HARM_CATEGORY_HARASSMENT = 'HARM_CATEGORY_HARASSMENT',
  HARM_CATEGORY_HATE_SPEECH = 'HARM_CATEGORY_HATE_SPEECH',
  HARM_CATEGORY_SEXUALLY_EXPLICIT = 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  HARM_CATEGORY_DANGEROUS_CONTENT = 'HARM_CATEGORY_DANGEROUS_CONTENT',
}

/**
 * Gemini safety thresholds
 */
export enum GeminiSafetyThreshold {
  BLOCK_NONE = 'BLOCK_NONE',
  BLOCK_ONLY_HIGH = 'BLOCK_ONLY_HIGH',
  BLOCK_MEDIUM_AND_ABOVE = 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_LOW_AND_ABOVE = 'BLOCK_LOW_AND_ABOVE',
}

/**
 * Gemini candidate response
 */
export interface GeminiCandidate {
  content: {
    parts: GeminiContentPart[];
    role: 'model';
  };
  finishReason: GeminiFinishReason;
  index: number;
  safetyRatings?: GeminiSafetyRating[];
}

/**
 * Gemini finish reasons
 */
export enum GeminiFinishReason {
  FINISH_REASON_UNSPECIFIED = 'FINISH_REASON_UNSPECIFIED',
  STOP = 'STOP',
  MAX_TOKENS = 'MAX_TOKENS',
  SAFETY = 'SAFETY',
  RECITATION = 'RECITATION',
  OTHER = 'OTHER',
}

/**
 * Gemini safety rating
 */
export interface GeminiSafetyRating {
  category: GeminiSafetyCategory;
  probability: GeminiSafetyProbability;
}

/**
 * Gemini safety probability levels
 */
export enum GeminiSafetyProbability {
  NEGLIGIBLE = 'NEGLIGIBLE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/**
 * Gemini usage metadata
 */
export interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

/**
 * Gemini API response
 */
export interface GeminiResponse {
  candidates: GeminiCandidate[];
  promptFeedback?: {
    safetyRatings: GeminiSafetyRating[];
  };
  usageMetadata?: GeminiUsageMetadata;
}

/**
 * Gemini API error response
 */
export interface GeminiErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Array<{
      '@type': string;
      [key: string]: unknown;
    }>;
  };
}

/**
 * Type guard for Gemini error response
 */
export function isGeminiErrorResponse(
  response: unknown
): response is GeminiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as any).error === 'object' &&
    'code' in (response as any).error &&
    'message' in (response as any).error
  );
}

/**
 * Type guard for Gemini text part
 */
export function isGeminiTextPart(part: GeminiContentPart): part is GeminiTextPart {
  return 'text' in part;
}

/**
 * Type guard for Gemini function call part
 */
export function isGeminiFunctionCallPart(
  part: GeminiContentPart
): part is GeminiFunctionCallPart {
  return 'functionCall' in part;
}

/**
 * Type guard for Gemini function response part
 */
export function isGeminiFunctionResponsePart(
  part: GeminiContentPart
): part is GeminiFunctionResponsePart {
  return 'functionResponse' in part;
}