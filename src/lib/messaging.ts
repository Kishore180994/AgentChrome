import { ReactMessage, ContentScriptMessage } from "../types/messages";

export const sendToContentScript = (message: ReactMessage) => {
  window.postMessage(message, "*");
};

export const handleContentScriptMessages = (
  handler: (message: ContentScriptMessage) => void
) => {
  const listener = (event: MessageEvent<ContentScriptMessage>) => {
    if (event.origin !== window.location.origin) return;
    if (event.source !== window) return;
    handler(event.data);
  };

  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
};
