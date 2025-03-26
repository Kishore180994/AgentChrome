/**
 * Each item in the ACTION list is an object with exactly ONE key:
 *   - The key is the action name (e.g., "input_text", "click_element")
 *   - The value is an object specifying the parameters for that action
 *
 * Examples:
 *   { "input_text": { index: 1, text: "username" } }
 *   { "click_element": { index: 3 } }
 *   { "open_tab": { url: "https://example.com" } }
 */

export interface LocalAction {
  id: string;
  type: LocalActionType;
  data: {
    index?: number; // Primary way to reference elements from PageElement
    text?: string; // For input_text or key_press
    key?: string; // For key_press
    url?: string; // For navigation actions
    offset?: number; // For scroll
    direction?: "up" | "down"; // For scroll
    question?: string; // For ask
    selector?: string; // Optional, derived dynamically if not provided
    output?: string; // For extract
  };
  description?: string;
}

export type LocalActionType =
  | "click"
  | "click_element"
  | "input_text"
  | "navigate"
  | "verify"
  | "open_tab"
  | "go_to_url"
  | "extract"
  | "submit_form"
  | "key_press"
  | "scroll"
  | "done"
  | "ask"
  | "wait"
  | "refresh"
  | "refetch";

export interface InputTextAction {
  input_text: {
    index?: number; // Optional element index
    text: string; // Text to input
    selector?: string; // Optional, AI can provide if known
  };
}

export interface TaskHistory {
  step: string;
  status: string;
  message?: string;
}

export interface ClickElementAction {
  click_element: {
    index?: number; // Optional element index
    selector?: string; // Optional, AI can provide if known
  };
}

export interface OpenTabAction {
  open_tab: {
    url?: string; // Optional URL for new tab
  };
}

export interface GoToUrlAction {
  go_to_url: {
    url: string; // Destination URL
  };
}

export interface ExtractContentAction {
  extract_content: {
    index?: number; // Optional element index to extract from
    selector?: string; // Optional, AI can provide if known
  };
}

export interface ScrollAction {
  scroll: {
    direction?: "up" | "down";
    offset?: number; // Pixels to scroll
  };
}

export interface SubmitFormAction {
  submit_form: {
    index?: number; // Optional form index
    selector?: string; // Optional, AI can provide if known
  };
}

export interface KeyPressAction {
  key_press: {
    key: string; // e.g., "Enter", "Escape"
    index?: number; // Optional element index to focus
    selector?: string; // Optional
  };
}

export interface VerifyAction {
  verify: {
    url: string; // Partial or full URL to verify
  };
}

export interface DoneAction {
  done: {
    message?: string; // Optional completion message
  };
}

export interface AskAction {
  ask: {
    question: string;
  };
}

export type AgentActionItem =
  | InputTextAction
  | ClickElementAction
  | OpenTabAction
  | GoToUrlAction
  | ExtractContentAction
  | ScrollAction
  | SubmitFormAction
  | KeyPressAction
  | VerifyAction
  | DoneAction
  | AskAction;
