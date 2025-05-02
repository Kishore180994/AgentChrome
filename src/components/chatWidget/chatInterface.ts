import { HubSpotExecutionResult } from "../../services/ai/interfaces";
import { StepState } from "../../types/responseFormat";

export type Message =
  | {
      id: string;
      role: "user" | "model" | "execution";
      content: string | StepState[];
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

export interface ProcessedMessage {
  type: "single" | "modelGroup" | "executionGroup";
  message?: Message;
  messages?: Message[];
  taskHistories?: StepState[];
  timestamp?: string;
}
