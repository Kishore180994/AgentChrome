export interface ReactMessage {
  type: "FROM_REACT_APP";
  action: string;
  payload?: any; // For optional additional data
}

export interface ContentScriptMessage {
  type: "FROM_CONTENT_SCRIPT";
  action: string;
  result: any;
  error?: string; // For error handling
}

// Optional: Union type for all possible messages
export type ExtensionMessage = ReactMessage | ContentScriptMessage;
