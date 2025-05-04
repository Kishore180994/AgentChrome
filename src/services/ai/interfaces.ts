import { Part } from "@google/generative-ai";
import { MemoryState } from "../../types/memoryTypes";

/**
 * Represents the role of an entity in the system.
 */
export type Role = "model" | "user" | "assistant" | "function";

export interface ClaudeChatContent {
  type: "text" | "image";
  text: string; // Required if type is "text"
  cache_control: any;
  source?: {
    type: "base64";
    media_type: string; // e.g., "image/jpeg", "image/png"
    data: string; // Base64-encoded image data
  }; // Required if type is "image"
}

export interface GeminiChatMessage {
  role: Role;
  parts: Array<Part>;
}

export interface ConversationHistory {
  role: Role;
  content: string;
}

export interface ClaudeChatMessage {
  role: Role;
  content: ClaudeChatContent[];
}

export interface FileData {
  mimeType: string;
  fileUri: string;
}

/**
 * Represents a bounding box for an element on a web page.
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ChildElement = [
  string, // tagName
  string, // text
  Record<string, string>, // attributes
  BoundingBox, // boundingBox
  number // childId (1-based per container)
];

export type PageElement = [
  number, // index
  string, // tagName
  string, // text
  Record<string, string>, // attributes
  [number, number, number, number], // boundingBox
  PageElement[] // childElements
];

export interface UncompressedPageElement {
  index: number;
  tagName: string;
  text: string;
  attributes: Record<string, string>;
  boundingBox: [number, number, number, number];
  childElements: UncompressedPageElement[];
  element: HTMLElement;
}

// --- New Interfaces for Gemini Response Format ---

/**
 * Represents the arguments for an `inputText` function call.
 */
export interface InputTextArgs {
  index: number;
  text: string;
  childId?: number;
  selector?: string;
}

/**
 * Represents the arguments for a `clickElement` function call.
 */
export interface ClickElementArgs {
  index: number;
  childId?: number;
  selector?: string;
}

/**
 * Represents the arguments for a `submitForm` function call.
 */
/**
 * Arguments for selecting a radio button.
 */
export interface SelectRadioButtonArgs {
  index: number;
  value?: string;
  selector?: string;
}

/**
 * Arguments for selecting a value in a single-select dropdown.
 */
export interface SelectDropdownArgs {
  index: number;
  value: string;
  selector?: string;
}

/**
 * Arguments for selecting multiple values in a multi-select dropdown.
 */
export interface SelectMultiDropdownArgs {
  index: number;
  values: string[];
  selector?: string;
}
export interface SubmitFormArgs {
  index: number;
  childId?: number;
  selector?: string;
}

/**
 * Represents the arguments for a `keyPress` function call.
 */
export interface KeyPressArgs {
  index: number;
  key: string;
  childId?: number;
  selector?: string;
}

/**
 * Represents the arguments for a `scroll` function call.
 */
export interface ScrollArgs {
  direction: "up" | "down";
  offset: number;
}

/**
 * Represents the arguments for a `GotoExistingTab` function call.
 */
export interface GotoExistingTabArgs {
  url: string;
}

/**
 * Represents the arguments for an `openTab` function call.
 */
export interface OpenTabArgs {
  url: string;
}

/**
 * Represents the arguments for an `extractContent` function call.
 */
export interface ExtractContentArgs {
  index: number;
  childId?: number;
  selector?: string;
}

/**
 * Represents the arguments for a `verify` function call.
 */
export interface VerifyArgs {
  url: string;
}

/**
 * Represents the arguments for a `done` function call.
 */
export interface DoneArgs {
  message: string;
  output?: string;
}

/**
 * Represents the arguments for an `ask` function call.
 */
export interface AskArgs {
  question: string;
}

/**
 * Represents the current_state object in reportCurrentState.
 */
export interface CurrentState {
  page_summary: string;
  evaluation_previous_goal: string;
  memory: MemoryState;
  current_goal: string;
  user_command?: string;
}

/**
 * Represents the arguments for a `reportCurrentState` function call.
 */
export interface ReportCurrentStateArgs {
  current_state: CurrentState;
}

/**
 * Represents a function call returned by the Gemini API.
 */
export interface GeminiFunctionCall {
  name: string;
  args:
    | InputTextArgs
    | ClickElementArgs
    | SubmitFormArgs
    | KeyPressArgs
    | ScrollArgs
    | GotoExistingTabArgs
    | OpenTabArgs
    | ExtractContentArgs
    | VerifyArgs
    | DoneArgs
    | AskArgs
    | ReportCurrentStateArgs;
}

/**
 * Represents a single function call wrapper in the Gemini response.
 */
export interface GeminiFunctionCallWrapper {
  functionCall: GeminiFunctionCall;
}

// The Gemini response is an array of GeminiFunctionCallWrapper
// This matches the format [{functionCall: {...}}, {functionCall: {...}}, ...]
export type GeminiResponse = GeminiFunctionCallWrapper[];

export interface DiarizationSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
  segmentIndex: number;
}
export interface DiarizationData {
  type: string;
  segments: DiarizationSegment[];
}
export interface DiarizationRequest {
  type: string;
  target?: string;
  data: DiarizationData;
}

/**
 * Represents the successful result of a HubSpot function execution.
 */
export interface HubSpotExecutorSuccessResult {
  success: true;
  /** A user-friendly message confirming the action's success. */
  message: string;
  /** Optional data returned by the successful operation (e.g., created object details, search results list). */
  data?: any; // Consider refining 'any' with specific types if possible
  /** Optional additional details, often used for summaries or non-standard results (e.g., workflow enrollment counts). */
  details?: any;
  /** The name of the function that was executed (useful for context). */
  functionName: string;
}

/**
 * Represents an error during HubSpot function execution.
 */
export interface HubSpotExecutorErrorResult {
  success: false;
  /** A user-friendly message describing the error. */
  error: string;
  /** A category classifying the type of error for potential specific handling. */
  errorType:
    | "mode"
    | "authentication"
    | "unknown_function"
    | "hubspot_api"
    | "permissions"
    | "rate_limit"
    | "not_found"
    | "validation"
    | "network"
    | "not_implemented"
    | "general"
    | string; // Allows other categories
  /** Optional detailed error information (e.g., original error message, API error details). */
  details?: any;
  /** Optional HTTP status code associated with the error (often from API errors). */
  status?: number;
  /** The name of the function that failed (useful for context). */
  functionName: string;
}

/**
 * The unified result type returned by the executeHubspotFunction promise.
 */
export type HubSpotExecutionResult =
  | HubSpotExecutorSuccessResult
  | HubSpotExecutorErrorResult;
