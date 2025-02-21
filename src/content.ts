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

  const port = chrome.runtime.connect({ name: "content-script" });

  port.onMessage.addListener((message) => {
    switch (message.type) {
      case "PERFORM_ACTION":
        actionExecutor.execute(message.action);
        break;
      case "TOGGLE_SIDEBAR":
        sidebarManager.toggleSidebar();
        break;
      case "GET_PAGE_ELEMENTS":
        const elements = domManager.extractPageElements();
        port.postMessage({
          type: "PAGE_ELEMENTS",
          elements,
        });
        break;
      case "EXECUTION_UPDATE":
        const { taskHistory } = message;
        console.log("[content.ts] Received EXECUTION_UPDATE:", taskHistory);
        sidebarManager.updateHorizontalBar(taskHistory);
        break;
      case "HIDE_HORIZONTAL_BAR":
        console.log("[content.ts] Hiding horizontal bar");
        sidebarManager.hideHorizontalBar();
        break;
      default:
        break;
    }
  });

  setInterval(() => {
    port.postMessage({ type: "KEEP_ALIVE", tabId: -1 });
  }, 5000);

  chrome.runtime.sendMessage({ type: "REGISTER_CONTENT_SCRIPT" });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case "PERFORM_ACTION":
        actionExecutor
          .execute(message.action)
          .then(() => {
            sendResponse({ success: true });
          })
          .catch((error: any) => {
            sendResponse({ success: false, error: error.message });
          });
        return true; // Async response
      case "TOGGLE_SIDEBAR":
        sidebarManager.toggleSidebar();
        sendResponse({ success: true });
        return true;
      case "GET_PAGE_ELEMENTS":
        const elements = domManager.extractPageElements();
        sendResponse({ success: true, elements });
        return true;
      case "PING":
        sendResponse({ success: true });
        return true;
      case "EXECUTION_UPDATE":
        const { taskHistory } = message;
        console.log("[content.ts] Received EXECUTION_UPDATE:", taskHistory);
        sidebarManager.updateHorizontalBar(taskHistory);
        sendResponse({ success: true });
        return true;
      case "HIDE_HORIZONTAL_BAR":
        console.log("[content.ts] Hiding horizontal bar");
        sidebarManager.hideHorizontalBar();
        sendResponse({ success: true });
        return true;
      default:
        sendResponse({ success: false, error: "Unknown message type" });
        return true;
    }
  });

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== window) {
      return;
    }

    const data = event.data;
    if (data?.type === "USER_COMMAND" && data.command) {
      // Close sidebar and show horizontal bar when a command is sent
      sidebarManager.closeSidebar();
      sidebarManager.showHorizontalBar();
      chrome.runtime.sendMessage({
        type: "PROCESS_COMMAND",
        command: data.command,
        commandType: "INITIAL_COMMAND",
      });
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      chrome.runtime.connect({ name: "content-script" });
    }
  });
}
