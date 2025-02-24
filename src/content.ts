import { ActionExecutor } from "./classes/ActionExecutor";
import { DOMManager } from "./classes/DOMManager";
import { SidebarManager } from "./classes/SideBarManager";

const domManager = new DOMManager();
const actionExecutor = new ActionExecutor(domManager);
const sidebarManager = new SidebarManager();
let showHorizontalBarDebounce: NodeJS.Timeout | null = null;

declare global {
  interface Window {
    __AGENT_CHROME_INITIALIZED__?: boolean;
    postMessage(message: any, targetOrigin: string): void;
  }
}

const AGENT_KEY = "__AGENT_CHROME_INITIALIZED__";
if (!window[AGENT_KEY]) {
  window[AGENT_KEY] = true;

  let tabId: number | null = null;
  chrome.runtime.sendMessage({ type: "GET_TAB_ID" }, (response) => {
    if (response?.tabId) tabId = response.tabId;
  });

  // const port = chrome.runtime.connect({ name: "content-script" });
  const port = chrome.runtime.connect({
    name: `content-script-${tabId}`,
  });

  port.onMessage.addListener(async (message) => {
    switch (message.type) {
      case "PERFORM_ACTION":
        await actionExecutor.execute(message.action);
        return true;
      case "TOGGLE_SIDEBAR":
        sidebarManager.toggleSidebar();
        return true;
      case "GET_PAGE_ELEMENTS":
        const elements = domManager.extractPageElements();
        port.postMessage({
          type: "PAGE_ELEMENTS",
          elements,
        });
        return true;

      case "EXECUTION_UPDATE":
        const { taskHistory } = message;
        console.log("[content.ts] Received EXECUTION_UPDATE:", taskHistory);
        sidebarManager.updateHorizontalBar(taskHistory);
        window.postMessage(
          {
            type: "COMMAND_RESPONSE",
            response: taskHistory,
            responseType: "EXECUTION_UPDATE",
          },
          "*"
        );
        return true;

      case "HIDE_HORIZONTAL_BAR":
        console.log("[content.ts] Hiding horizontal bar");
        sidebarManager.hideHorizontalBar();
        return true;
      case "SHOW_HORIZONTAL_BAR":
        console.log("[content.ts] Showing horizontal bar for tab", tabId);
        if (showHorizontalBarDebounce) {
          clearTimeout(showHorizontalBarDebounce);
        }
        showHorizontalBarDebounce = setTimeout(() => {
          sidebarManager.showHorizontalBar();
          showHorizontalBarDebounce = null;
        }, 1000); // Debounce delay of 1 second
        return true;
      default:
        break;
    }
  });

  setInterval(() => {
    // port.postMessage({ type: "KEEP_ALIVE", tabId: -1 });
    port.postMessage({
      type: "KEEP_ALIVE",
      tabId: tabId || -1,
    });
  }, 5000);

  // chrome.runtime.sendMessage({ type: "REGISTER_CONTENT_SCRIPT" });
  chrome.runtime.sendMessage({
    type: "REGISTER_CONTENT_SCRIPT",
    tabId: tabId || -1,
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_TAB_ID" && sender.tab?.id) {
      tabId = sender.tab.id;
      sendResponse({ tabId });
      return true;
    }
    // ... (existing cases, updated with tabId)
    const currentTabId = sender.tab?.id || tabId;
    switch (message.type) {
      case "PERFORM_ACTION":
        actionExecutor
          .execute(message.action)
          .then((result) => {
            sendResponse({ success: true, result, tabId: currentTabId });
          })
          .catch((error: any) => {
            sendResponse({
              success: false,
              error: error.message,
              tabId: currentTabId,
            });
          });
        return true; // Async response
      case "TOGGLE_SIDEBAR":
        sidebarManager.toggleSidebar();
        sendResponse({ success: true, tabId: currentTabId });
        return true;
      case "GET_PAGE_ELEMENTS":
        const elements = domManager.extractPageElements();
        sendResponse({ success: true, elements, tabId: currentTabId });
        return true;
      case "PING":
        sendResponse({ success: true, tabId: currentTabId });
        return true;
      case "EXECUTION_UPDATE":
        const { taskHistory } = message;
        console.log("[content.ts] Received EXECUTION_UPDATE:", taskHistory);
        sidebarManager.updateHorizontalBar(taskHistory);
        window.postMessage(
          { type: "COMMAND_RESPONSE", response: message },
          "*"
        );
        sendResponse({ success: true, tabId: currentTabId });
        return true;
      case "HIDE_HORIZONTAL_BAR":
        console.log("[content.ts] Hiding horizontal bar");
        sidebarManager.hideHorizontalBar();
        sendResponse({ success: true, tabId: currentTabId });
        return true;
      case "SHOW_HORIZONTAL_BAR":
        console.log("[content.ts] Showing horizontal bar for tab", tabId);
        if (showHorizontalBarDebounce) {
          clearTimeout(showHorizontalBarDebounce);
        }
        showHorizontalBarDebounce = setTimeout(() => {
          sidebarManager.showHorizontalBar();
          sendResponse({ success: true, tabId });
          showHorizontalBarDebounce = null;
        }, 1000); // Debounce delay of 1 second
        return true;
      case "DISPLAY_MESSAGE":
        console.log("DISPLAY_MESSAGE", message);
        if (message) {
          console.log("[content.ts] Received final response:", message);
          window.postMessage(
            { type: "COMMAND_RESPONSE", response: message },
            "*"
          );
        } else {
          console.warn(
            "[content.ts] Received DISPLAY_MESSAGE with undefined response"
          );
          window.postMessage(
            { type: "COMMAND_RESPONSE", response: "No response received" },
            "*"
          );
        }
        sendResponse({ success: true });
        return true;
      default:
        sendResponse({
          success: false,
          error: "Unknown message type",
          tabId: currentTabId,
        });
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
      chrome.runtime
        .sendMessage({
          type: "PROCESS_COMMAND",
          command: data.command,
          tabId: tabId || -1,
        })
        .then((response) => {
          console.log("[content.ts] response: ", response);
        })
        .catch((err) => {
          console.log(
            "[content.ts] Received error after PROCESS_COMMAND:",
            err
          );
        });
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      chrome.runtime.connect({
        name: `content-script-${tabId || -1}`,
      });
    }
  });
}
