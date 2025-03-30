// content.ts
import { DOMManager, UncompressedPageElement } from "./classes/DOMManager"; // Adjust path
import { ActionExecutor } from "./classes/ActionExecutor";
import html2canvas from "html2canvas";

const domManager = new DOMManager();
const actionExecutor = new ActionExecutor();
let uncompressedElements: UncompressedPageElement[] = []; // Store locally
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
  let port: chrome.runtime.Port | null = null;

  const initializePort = () => {
    try {
      if (!chrome.runtime?.id) {
        console.warn(
          "[content.ts] Extension context invalidated, cannot initialize port."
        );
        window[AGENT_KEY] = false;
        return;
      }
      port = chrome.runtime.connect({
        name: `content-script-${tabId || -1}`,
      });

      port.onDisconnect.addListener(() => {
        console.log(
          "[content.ts] Port disconnected, attempting to reconnect..."
        );
        port = null;
        window[AGENT_KEY] = false;
      });

      // port.onMessage.addListener(async (message) => {
      //   try {
      //     switch (message.type) {
      //       case "PERFORM_ACTION":
      //         await actionExecutor.execute(message.action);
      //         return true;
      //       case "GET_PAGE_ELEMENTS":
      //         const { compressed, uncompressed } =
      //           domManager.extractPageElements();
      //         port?.postMessage({
      //           type: "PAGE_ELEMENTS",
      //           compressed,
      //           uncompressed,
      //         });
      //         return true;
      //       case "EXECUTION_UPDATE":
      //         const { taskHistory } = message;
      //         console.log(
      //           "[content.ts] Received EXECUTION_UPDATE:",
      //           taskHistory
      //         );
      //         port?.postMessage({
      //           type: "EXECUTION_UPDATE",
      //           taskHistory,
      //         });
      //         return true;
      //       default:
      //         break;
      //     }
      //   } catch (err) {
      //     console.error("[content.ts] Error handling port message:", err);
      //   }
      // });

      setInterval(() => {
        try {
          if (!chrome.runtime?.id) {
            console.warn(
              "[content.ts] Extension context invalidated, stopping KEEP_ALIVE."
            );
            window[AGENT_KEY] = false;
            return;
          }
          if (port) {
            port.postMessage({
              type: "KEEP_ALIVE",
              tabId: tabId || -1,
            });
          }
        } catch (err) {
          console.warn("[content.ts] KEEP_ALIVE failed:", err);
          window[AGENT_KEY] = false;
        }
      }, 5000);
    } catch (err) {
      console.warn("[content.ts] Failed to initialize port:", err);
      window[AGENT_KEY] = false;
    }
  };

  try {
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type: "GET_TAB_ID" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "[content.ts] GET_TAB_ID failed:",
            chrome.runtime.lastError
          );
          window[AGENT_KEY] = false;
          return;
        }
        if (response?.tabId) {
          tabId = response.tabId;
          initializePort();
        }
      });
    } else {
      console.warn("[content.ts] Extension context invalidated on startup.");
      window[AGENT_KEY] = false;
    }
  } catch (err) {
    console.warn("[content.ts] Failed to send GET_TAB_ID:", err);
    window[AGENT_KEY] = false;
  }

  try {
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({
        type: "REGISTER_CONTENT_SCRIPT",
        tabId: tabId || -1,
      });
    }
  } catch (err) {
    console.warn("[content.ts] Failed to register content script:", err);
    window[AGENT_KEY] = false;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (!chrome.runtime?.id) {
        console.warn(
          "[content.ts] Extension context invalidated, cannot process message:",
          message
        );
        sendResponse({
          success: false,
          error: "Extension context invalidated",
        });
        return true;
      }

      if (message.type === "GET_TAB_ID" && sender.tab?.id) {
        tabId = sender.tab.id;
        sendResponse({ tabId });
        return true;
      }

      const currentTabId = sender.tab?.id || tabId;
      switch (message.type) {
        case "PERFORM_ACTION":
          actionExecutor.setElements(uncompressedElements || []); // Set fresh elements
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
          return true;
        case "RESIZE_SCREENSHOT":
          const img = new Image();
          const maxSize = 720;

          img.onload = () => {
            const scale = maxSize / Math.max(img.width, img.height);
            const width = img.width * scale;
            const height = img.height * scale;

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              sendResponse({ error: "Canvas context error" });
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const webp = canvas.toDataURL("image/webp", 0.7);
            sendResponse({ resizedDataUrl: webp });
          };

          img.onerror = () => {
            sendResponse({ error: "Image load error" });
          };

          img.src = message.dataUrl;
          return true;

        case "GET_PAGE_ELEMENTS":
          const { compressed, uncompressed } = domManager.extractPageElements();
          uncompressedElements = uncompressed;
          console.log("[content.ts] Extracted elements:", uncompressed);
          sendResponse({ success: true, compressed, uncompressed: [] });
          return true;
        case "PING":
          sendResponse({ success: true, tabId: currentTabId });
          return true;
        case "EXECUTION_UPDATE":
          const { taskHistory } = message;
          chrome.runtime.sendMessage({
            type: "UPDATE_SIDEPANEL",
            taskHistory,
          });
          sendResponse({ success: true, tabId: currentTabId });
          return true;
        case "DISPLAY_MESSAGE":
          console.log("DISPLAY_MESSAGE", message);
          if (message) {
            console.log("[content.ts] Received final response:", message);
            chrome.runtime.sendMessage({
              type: "COMMAND_RESPONSE",
              response: message.response,
            });
          } else {
            console.warn(
              "[content.ts] Received DISPLAY_MESSAGE with undefined response"
            );
            chrome.runtime.sendMessage({
              type: "COMMAND_RESPONSE",
              response: "No response received",
            });
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
    } catch (err) {
      console.error("[content.ts] Runtime message error:", err);
      sendResponse({ success: false, error: (err as Error).message });
      window[AGENT_KEY] = false;
      return true;
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      console.log("[content.ts] Page restored from cache, reinitializing...");
      window[AGENT_KEY] = false;
    }
  });
}
