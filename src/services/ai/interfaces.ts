/**
 * Represents the role of an entity in the system.
 *
 * @typedef {("model" | "user")} Role
 *
 * @property {"model"} model - Represents the AI model role.
 * @property {"user"} user - Represents the user role.
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

/**
 * Represents a chat message in the system.
 */
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

/**
 * Represents the data of a file.
 */
export interface FileData {
  mimeType: string;
  fileUri: string;
}

/**
 * Represents the parts of a data structure that can include file data and text.
 */
export interface Parts {
  fileData?: FileData;
  text?: string;
}

/**
 * Represents an element on a web page.
 */
export interface PageElement {
  index: number;
  tagName: string;
  text: string;
  attributes: Record<string, string>;
  frame: number[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
