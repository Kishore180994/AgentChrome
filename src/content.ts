import { ActionExecutor } from "./classes/ActionExecutor";
import { DOMManager } from "./classes/DOMManager";
import { SidebarManager } from "./classes/SideBarManager";

const domManager = new DOMManager();
const actionExecutor = new ActionExecutor(domManager);
const sidebarManager = new SidebarManager();

declare global {
  interface Window {
    __AGENT_CHROME_INITIALIZED__?: boolean;
    postMessage(message: any, targetOrigin: string): void;
  }
}

const AGENT_KEY = "__AGENT_CHROME_INITIALIZED__";
if (!window[AGENT_KEY]) {
  window[AGENT_KEY] = true;

  console.log("[content.ts] Content script initialized");

  const port = chrome.runtime.connect({ name: "content-script" });
  console.log(
    "[content.ts] Established persistent connection to background script"
  );

  port.onMessage.addListener((message) => {
    console.log("[content.ts] Received port message:", message);
    switch (message.type) {
      case "PERFORM_ACTION":
        console.log("[content.ts] Executing action via port:", message.action);
        actionExecutor.execute(message.action);
        break;
      case "TOGGLE_SIDEBAR":
        console.log("[content.ts] Toggling sidebar via port");
        sidebarManager.toggleSidebar();
        break;
      case "GET_PAGE_ELEMENTS":
        console.log("[content.ts] Fetching page elements via port");
        const elements = domManager.extractPageElements();
        console.log("[content.ts] Sending page elements via port:", elements);
        port.postMessage({
          type: "PAGE_ELEMENTS",
          elements,
        });
        break;
      default:
        console.warn("[content.ts] Unknown port message type:", message.type);
        break;
    }
  });

  setInterval(() => {
    console.log("[content.ts] Sending KEEP_ALIVE message");
    port.postMessage({ type: "KEEP_ALIVE", tabId: -1 });
  }, 5000);

  console.log("[content.ts] Registering content script with background");
  chrome.runtime.sendMessage({ type: "REGISTER_CONTENT_SCRIPT" });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("[content.ts] Received runtime message:", message);
    switch (message.type) {
      case "PERFORM_ACTION":
        console.log("[content.ts] Performing action:", message.action);
        actionExecutor
          .execute(message.action)
          .then(() => {
            console.log("[content.ts] Action succeeded:", message.action);
            sendResponse({ success: true });
          })
          .catch((error: any) => {
            console.error(
              "[content.ts] Action failed:",
              message.action,
              "Error:",
              error.message
            );
            sendResponse({ success: false, error: error.message });
          });
        return true; // Async response
      case "TOGGLE_SIDEBAR":
        console.log("[content.ts] Toggling sidebar");
        sidebarManager.toggleSidebar();
        console.log("[content.ts] Sidebar toggled, sending success response");
        sendResponse({ success: true });
        return true;
      case "GET_PAGE_ELEMENTS":
        console.log("[content.ts] Fetching page elements");
        const elements = domManager.extractPageElements();
        console.log("[content.ts] Page elements fetched:", elements);
        sendResponse({ success: true, elements });
        return true;
      case "PING":
        console.log("[content.ts] Received PING, responding");
        sendResponse({ success: true });
        return true;
      default:
        console.warn("[content.ts] Unknown message type:", message.type);
        sendResponse({ success: false, error: "Unknown message type" });
        return true;
    }
  });

  window.addEventListener("message", (event: MessageEvent) => {
    console.log("[content.ts] Received window message:", event.data);
    if (event.origin !== window.location.origin || event.source !== window) {
      console.log(
        "[content.ts] Ignoring message from different origin or source"
      );
      return;
    }

    const data = event.data;
    if (data?.type === "USER_COMMAND" && data.command) {
      console.log(
        "[content.ts] Forwarding USER_COMMAND to background:",
        data.command
      );
      chrome.runtime.sendMessage({
        type: "PROCESS_COMMAND",
        command: data.command,
        commandType: "INITIAL_COMMAND",
      });
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      console.log("[content.js] Page restored from cache, re-connecting...");
      chrome.runtime.connect({ name: "content-script" });
    }
  });
}
