/**
 * Represents the role of an entity in the system.
 */
export type Role = "model" | "user" | "assistant";

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
  parts: Array<Parts>;
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

export interface Parts {
  fileData?: FileData;
  text?: string;
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
