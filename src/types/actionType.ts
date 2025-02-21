// actionTypes.ts

/**
 * Each item in the ACTION list is an object with exactly ONE key:
 *   - The key is the action name (e.g. "input_text", "click_element")
 *   - The value is an object specifying the parameters for that action
 *
 * Examples:
 *   { "input_text": { index: 1, text: "username" } }
 *   { "click_element": { index: 3 } }
 *   { "open_tab": {} }
 *   { "go_to_url": { url: "https://example.com" } }
 *   { "extract_content": { selectors: [".price", ".title"] } }
 */

export interface LocalAction {
  id: string;
  type: string;
  data: {
    selector?: string;
    value?: string;
    text?: string; // For input_text or key_press
    index?: number; // Possibly used for referencing an element
    key?: string; // For key_press
    duration?: number;
    url?: string;
    offset?: number;
    direction?: "up" | "down";
    // ... add more as needed
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
  | "wait"; // fallback

/** For "input_text": fill text into an element at "index" */
export interface InputTextAction {
  input_text: {
    index: number; // e.g. element index
    text: string; // text to type
    selector: string; // e.g. CSS selector
  };
}

/** For "click_element": click the element at "index" */
export interface ClickElementAction {
  click_element: {
    index: number; // element index
    selector: string; // e.g. CSS selector
  };
}

/** For "open_tab": open a new tab with optional parameters */
export interface OpenTabAction {
  open_tab: {
    url?: string; // optional URL for new tab
  };
}

/** For "go_to_url": navigate the current tab to a given URL */
export interface GoToUrlAction {
  go_to_url: {
    url: string; // destination URL
  };
}

/** For "extract_content": gather data from the page
 *  e.g. specifying a list of selectors, or use an empty object.
 */
export interface ExtractContentAction {
  extract_content: {
    selectors?: string[]; // optional array of CSS selectors
    all_text?: boolean; // if true, extracts entire page text
  };
}

/** For "scroll": scroll the page, optionally specifying direction/offset */
export interface ScrollAction {
  scroll: {
    direction?: "up" | "down";
    offset?: number; // e.g. number of pixels to scroll
  };
}

/** For "submit_form": optionally reference a form index or auto-locate */
export interface SubmitFormAction {
  submit_form: {
    index?: number; // element index if needed
    selector?: string; // e.g. CSS selector
  };
}

/** For "key_press": press a key. e.g. ENTER, ESC, etc. */
export interface KeyPressAction {
  key_press: {
    key: string; // e.g. "Enter", "Escape", "ArrowDown"
  };
}

/** For "verify": check or open a new tab if not found */
export interface VerifyAction {
  verify: {
    url: string; // partial or full URL to verify
  };
}

/** For "done": indicates the ultimate task is complete */
export interface DoneAction {
  done: {}; // no parameters
}

/**
 * Union type that covers all possible action objects.
 * Each item must match exactly ONE of these interfaces.
 *
 * Example usage in an array:
 * [
 *   { input_text: { index: 1, text: "username" } },
 *   { input_text: { index: 2, text: "password" } },
 *   { click_element: { index: 3 } },
 *   { go_to_url: { url: "https://example.com" } }
 * ]
 */
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
  | DoneAction;
