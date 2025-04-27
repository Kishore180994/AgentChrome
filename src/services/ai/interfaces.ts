import { Part } from "@google/generative-ai";

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
 * Represents the arguments for a `goToUrl` function call.
 */
export interface GoToUrlArgs {
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
 * Represents a step in the task memory.
 */
export interface MemoryStep {
  step_number: string;
  description: string;
  status: "PENDING" | "IN_PROGRESS" | "PASS" | "FAIL";
}

/**
 * Represents the memory object in current_state.
 */
export interface Memory {
  steps: MemoryStep[];
}

/**
 * Represents the current_state object in reportCurrentState.
 */
export interface CurrentState {
  page_summary: string;
  evaluation_previous_goal: string;
  memory: Memory;
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
    | GoToUrlArgs
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
