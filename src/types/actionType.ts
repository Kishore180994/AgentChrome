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
    childId?: number; // Optional child element within container
    text?: string; // For input_text or key_press
    key?: string; // For key_press
    url?: string; // For navigation actions
    offset?: number; // For scroll
    direction?: "up" | "down"; // For scroll
    question?: string; // For ask
    selector?: string; // Optional, derived dynamically if not provided
    output?: string; // For extract
    childElement?: any;
    duration?: any;
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
    index?: number;
    childId?: number;
    text: string;
    selector?: string;
  };
}

export interface ClickElementAction {
  click_element: {
    index?: number;
    childId?: number;
    selector?: string;
  };
}

export interface OpenTabAction {
  open_tab: {
    url?: string;
  };
}

export interface GoToUrlAction {
  go_to_url: {
    url: string;
  };
}

export interface ExtractContentAction {
  extract_content: {
    index?: number;
    childId?: number;
    selector?: string;
  };
}

export interface ScrollAction {
  scroll: {
    direction?: "up" | "down";
    offset?: number;
  };
}

export interface SubmitFormAction {
  submit_form: {
    index?: number;
    childId?: number;
    selector?: string;
  };
}

export interface KeyPressAction {
  key_press: {
    key: string;
    index?: number;
    childId?: number;
    selector?: string;
  };
}

export interface VerifyAction {
  verify: {
    url: string;
  };
}

export interface DoneAction {
  done: {
    message?: string;
    output?: string;
  };
}

export interface AgentFunctionCall {
  functionCall: any;
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
  | AskAction
  | "functionCall"
  | AgentFunctionCall;
