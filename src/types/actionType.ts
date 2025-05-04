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
  type: LocalActionType; // Define LocalActionType below
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

// Define the action types as an object
export const DOMAction = {
  clickElement: {
    name: "dom_clickElement",
    description: "Clicks an interactive element on the page",
  },
  inputText: {
    name: "dom_inputText",
    description: "Enters text into an input element on the page",
  },
  selectRadioButton: {
    name: "dom_selectRadioButton",
    description: "Selects a radio button option by index or value",
  },
  selectDropdown: {
    name: "dom_selectDropdown",
    description: "Selects a value in a single-select dropdown",
  },
  selectMultiDropdown: {
    name: "dom_selectMultiDropdown",
    description: "Selects multiple values in a multi-select dropdown",
  },
  submitForm: {
    name: "dom_submitForm",
    description: "Submits a form by clicking the submit button/element",
  },
  keyPress: {
    name: "dom_keyPress",
    description: "Simulates a key press on an element",
  },
  scroll: { name: "dom_scroll", description: "Scrolls the page up or down" },
  goToExistingTab: {
    name: "dom_goToExistingTab",
    description: "Navigates to an existing tab with the specified URL",
  },
  openTab: {
    name: "dom_openTab",
    description: "Opens a new tab with the specified URL",
  },
  extractContent: {
    name: "dom_extractContent",
    description: "Extracts content from an element",
  },
  done: { name: "dom_done", description: "Indicates task completion" },
  ask: {
    name: "dom_ask",
    description: "Asks the user a question for clarification or confirmation",
  },
  reportCurrentState: {
    name: "dom_reportCurrentState",
    description:
      "Reports the current state of the task, **MANDATORY INCLUSION FOR EVERY RESPONSE** YOU MUST INCLUDE THIS ACTION IN EVERY RESPONSE YOU SEND IT TO ME",
  },
  wait: {
    name: "dom_wait",
    description: "Waits for a specified duration before proceeding",
  },
  refetch: {
    name: "dom_refetch",
    description: "Refetches the current page content",
  },
} as const;

export type LocalActionType =
  (typeof DOMAction)[keyof typeof DOMAction]["name"];

// Derive the type from the object

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
