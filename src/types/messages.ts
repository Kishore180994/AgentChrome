export interface BaseMessage {
  type: string;
  [key: string]: any;
}

export interface ReactMessage extends BaseMessage {
  type: "FROM_REACT_APP";
  action: string;
  payload?: any;
}

export interface ContentScriptMessage extends BaseMessage {
  type: "FROM_CONTENT_SCRIPT";
  action: string;
  result: any;
  error?: string;
}

export type ExtensionMessage = ReactMessage | ContentScriptMessage | any;

export function isReactMessage(message: any): message is ReactMessage {
  return message?.type === "FROM_REACT_APP";
}

export function isContentScriptMessage(
  message: any
): message is ContentScriptMessage {
  return message?.type === "FROM_CONTENT_SCRIPT";
}
