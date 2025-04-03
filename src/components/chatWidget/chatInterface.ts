import { StepState } from "../../types/responseFormat";

export interface Message {
  id: string;
  role: "user" | "model" | "execution";
  content: string | StepState[];
}

export interface ProcessedMessage {
  type: "single" | "modelGroup" | "executionGroup";
  message?: Message;
  messages?: Message[];
  taskHistories?: StepState[];
  timestamp?: string;
}
