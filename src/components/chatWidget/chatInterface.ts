import { HubSpotExecutionResult } from "../../services/ai/interfaces";
import { MemoryState } from "../../types/memoryTypes";
import { StepState } from "../../types/responseFormat";
// Assuming HubSpotExecutionResult is defined elsewhere
// We no longer need StepState for the 'execution' role's content
// import { StepState } from "./path/to/StepState";

// --- Define Interfaces for each Message Role/Structure ---

// Base properties common to potentially all messages
interface BaseMessage {
  id: string;
}

// Represents a message sent by the user
export interface UserMessage extends BaseMessage {
  role: "user";
  content: string; // User content is always string
}

// Represents a standard text message from the AI model
export interface ModelTextMessage extends BaseMessage {
  role: "model";
  content: string;
  // Ensure 'type' is not present or undefined to distinguish from ModelStructuredMessage
  type?: undefined;
}

// Represents a structured message from the AI model (errors, specific results, etc.)
export interface ModelStructuredMessage extends BaseMessage {
  role: "model";
  type: "hubspot_error" | "hubspot_success" | "question" | "completion";
  errorType?: string;
  message?: string; // Often used for the primary text in structured messages
  // 'content' here might hold specific data like HubSpot results, or could be optional/string
  content?: HubSpotExecutionResult | string | null;
  details?: string;
  status?: number;
}

// Represents the execution state message holding the task progress memory
export interface ExecutionMessage extends BaseMessage {
  role: "execution";
  content: MemoryState; // *** Content is now strictly MemoryState ***
}

// --- Define the Final Union Type ---

// The Message type is a union of all possible specific message structures
export type Message =
  | UserMessage
  | ModelTextMessage
  | ModelStructuredMessage
  | ExecutionMessage;

// --- Old Definition (for reference, can be removed) ---
/*
export type Message =
  | {
      id: string;
      role: "user" | "model" | "execution";
      content: string | StepState[]; // <<< Old content type
    }
  | {
      id: string;
      role: "model";
      type: "hubspot_error" | "hubspot_success" | "question" | "completion";
      errorType?: string;
      message?: string;
      content?: HubSpotExecutionResult | string;
      details?: string;
      status?: number;
    };
*/

export interface ProcessedMessage {
  type: "single" | "modelGroup" | "executionGroup";
  message?: Message;
  messages?: Message[];
  taskHistories?: StepState[];
  timestamp?: string;
}
