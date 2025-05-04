import { HubSpotExecutionResult } from "../services/ai/interfaces";
import { MemoryState } from "./memoryTypes";

export interface BaseMessage {
  type: string;
  [key: string]: any;
}

// Messages from the React App (Side Panel) to the Background Script
export interface ReactMessage extends BaseMessage {
  type: "FROM_REACT_APP";
  action: string; // e.g., "PROCESS_COMMAND", "STOP_AUTOMATION", "NEW_CHAT"
  payload?: any; // Data associated with the action
}

// Messages from the Content Script to the Background Script
export interface ContentScriptMessage extends BaseMessage {
  type: "FROM_CONTENT_SCRIPT";
  action: string; // e.g., "PAGE_ELEMENTS_READY", "ACTION_RESULT"
  result: any; // Result of the action
  error?: string; // Error message if action failed
}

// Messages from the Background Script to the React App (Side Panel)

// General command response (used for D4M mode actions and general messages)
export interface CommandResponse extends BaseMessage {
  type: "COMMAND_RESPONSE";
  response: string | object; // The response data (can be string or structured object)
}

// Response specifically for AI 'ask' and 'done' actions
export interface AIResponse extends BaseMessage {
  type: "AI_RESPONSE";
  action: "question" | "completion"; // Indicates if it's an ask or done action
  message: string; // The message content (question or completion message)
  output?: string; // Optional output for completion
}

// Response specifically for HubSpot actions
export interface HubspotResponse extends BaseMessage {
  type: "HUBSPOT_RESPONSE";
  response: HubSpotExecutionResult; // The structured result from HubSpot execution
}

// Message for updating task progress/memory state
export interface MemoryUpdateMessage extends BaseMessage {
  type: "MEMORY_UPDATE";
  response: MemoryState; // The updated memory state
}

// Message for finishing command processing
export interface FinishProcessCommandMessage extends BaseMessage {
  type: "FINISH_PROCESS_COMMAND";
  response: string | object; // Final response or error message
}

// Message for displaying a temporary toast notification
export interface DisplayMessage extends BaseMessage {
  type: "DISPLAY_MESSAGE";
  response: {
    message: string;
    type?: "success" | "info" | "error"; // Optional type for toast
  };
}

// Message for updating recording state (from offscreen to background to UI)
export interface RecordingStateUpdate extends BaseMessage {
  type: "RECORDING_STATE_UPDATE";
  isRecording: boolean;
  isConnected: boolean;
  message?: string; // Optional status message
}

// Message for updating transcription (from offscreen to background to UI)
export interface UpdateTranscription extends BaseMessage {
  type: "UPDATE_TRANSCRIPTION";
  segments?: any[]; // Diarization segments
  interimTranscript?: string; // Interim speech recognition transcript
  // Add other transcription related fields as needed
}

// Union type for all possible messages
export type ExtensionMessage =
  | ReactMessage
  | ContentScriptMessage
  | CommandResponse
  | AIResponse
  | HubspotResponse
  | MemoryUpdateMessage
  | FinishProcessCommandMessage
  | DisplayMessage
  | RecordingStateUpdate
  | UpdateTranscription;

// Type guards for incoming messages
export function isReactMessage(message: any): message is ReactMessage {
  return message?.type === "FROM_REACT_APP";
}

export function isContentScriptMessage(
  message: any
): message is ContentScriptMessage {
  return message?.type === "FROM_CONTENT_SCRIPT";
}

export function isCommandResponse(message: any): message is CommandResponse {
  return message?.type === "COMMAND_RESPONSE";
}

export function isAIResponse(message: any): message is AIResponse {
  return message?.type === "AI_RESPONSE";
}

export function isHubspotResponse(message: any): message is HubspotResponse {
  return message?.type === "HUBSPOT_RESPONSE";
}

export function isMemoryUpdateMessage(
  message: any
): message is MemoryUpdateMessage {
  return message?.type === "MEMORY_UPDATE";
}

export function isFinishProcessCommandMessage(
  message: any
): message is FinishProcessCommandMessage {
  return message?.type === "FINISH_PROCESS_COMMAND";
}

export function isDisplayMessage(message: any): message is DisplayMessage {
  return message?.type === "DISPLAY_MESSAGE";
}

export function isRecordingStateUpdate(
  message: any
): message is RecordingStateUpdate {
  return message?.type === "RECORDING_STATE_UPDATE";
}

export function isUpdateTranscription(
  message: any
): message is UpdateTranscription {
  return message?.type === "UPDATE_TRANSCRIPTION";
}
