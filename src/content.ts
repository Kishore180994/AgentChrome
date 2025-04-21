console.log(
  `[content.ts] Script executing on: ${
    window.location.href
  } at ${new Date().toISOString()}`
);

// content.ts
import { DOMManager } from "./classes/DOMManager";
import { ActionExecutor } from "./classes/ActionExecutor";
import { GeminiFunctionCall } from "./services/ai/interfaces";

const domManager = new DOMManager();
const actionExecutor = new ActionExecutor(domManager);

declare global {
  interface Window {
    __AGENT_CHROME_INITIALIZED__?: boolean;
  }
}

const AGENT_KEY = "__AGENT_CHROME_INITIALIZED__";
if (!window[AGENT_KEY]) {
  window[AGENT_KEY] = true;

  let tabId: number | null = null;
  let port: chrome.runtime.Port | null = null;
  let keepAliveInterval: NodeJS.Timeout | null = null;

  const initializePort = () => {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    port = null;

    try {
      if (!chrome.runtime?.id) {
        console.warn(
          "[content.ts] Extension context invalidated, cannot initialize port."
        );
        window[AGENT_KEY] = false;
        return;
      }
      if (tabId === null) {
        console.warn("[content.ts] Cannot initialize port, tabId not set.");
        window[AGENT_KEY] = false;
        return;
      }

      port = chrome.runtime.connect({ name: `content-script-${tabId}` });
      console.log(`[content.ts] Port connected for tab ${tabId}.`);

      port.onDisconnect.addListener(() => {
        console.warn(
          `[content.ts] Port disconnected for tab ${tabId}. Clearing keep-alive.`
        );
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        port = null;
      });

      keepAliveInterval = setInterval(() => {
        try {
          if (!chrome.runtime?.id || !port) {
            console.warn(
              "[content.ts] Context/Port invalid, stopping KEEP_ALIVE."
            );
            if (keepAliveInterval) clearInterval(keepAliveInterval);
            keepAliveInterval = null;
            port = null;
            return;
          }
          port.postMessage({ type: "KEEP_ALIVE", tabId: tabId });
        } catch (err) {
          console.warn("[content.ts] KEEP_ALIVE postMessage failed:", err);
          if (keepAliveInterval) clearInterval(keepAliveInterval);
          keepAliveInterval = null;
          port = null;
        }
      }, 20000);
    } catch (err) {
      console.error("[content.ts] Failed to initialize port:", err);
      window[AGENT_KEY] = false;
    }
  };

  const getTabAndInitialize = () => {
    try {
      if (!chrome.runtime?.id) {
        window[AGENT_KEY] = false;
        return;
      }
      chrome.runtime.sendMessage({ type: "GET_TAB_ID" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "[content.ts] GET_TAB_ID failed:",
            chrome.runtime.lastError.message
          );
          window[AGENT_KEY] = false;
          return;
        }
        if (response?.tabId) {
          tabId = response.tabId;
          console.log("[content.ts] Received tabId:", tabId);
          initializePort();
        } else {
          console.warn(
            "[content.ts] Did not receive valid tabId from background."
          );
          window[AGENT_KEY] = false;
        }
      });
    } catch (err) {
      console.error("[content.ts] Failed to send GET_TAB_ID:", err);
      window[AGENT_KEY] = false;
    }
  };

  // Initialization
  getTabAndInitialize();

  // Message Listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const messageType = message?.type;
    console.log(`[content.ts] Received message: ${messageType}`, message);

    try {
      if (!chrome.runtime?.id) {
        console.warn(
          "[content.ts] Context invalidated, ignoring message:",
          messageType
        );
        sendResponse({
          success: false,
          error: "Extension context invalidated",
        });
        return true;
      }

      const currentTabId = tabId;

      switch (messageType) {
        case "PERFORM_ACTION":
          // Action Execution
          console.log(
            "[content.ts] Executing function call:",
            message.functionCall
          );
          const functionCall: GeminiFunctionCall = message.functionCall;
          actionExecutor
            .execute(functionCall)
            .then((result) => {
              console.log("[content.ts] Action success, result:", result);
              sendResponse({
                success: true,
                result: result ?? null,
                tabId: currentTabId,
              });
            })
            .catch((error: any) => {
              console.error(
                "[content.ts] Action failed:",
                error.message,
                error.stack
              );
              sendResponse({
                success: false,
                error: error.message || "Action failed",
                tabId: currentTabId,
              });
            });
          return true;

        case "GET_PAGE_ELEMENTS":
          console.log(
            `[content.ts] GET_PAGE_ELEMENTS request. State: ${
              document.readyState
            }, Body: ${!!document.body}`
          );
          if (
            document.readyState !== "complete" &&
            document.readyState !== "interactive"
          ) {
            console.warn(
              `[content.ts] Doc state '${document.readyState}' during GET_PAGE_ELEMENTS. Results may be incomplete.`
            );
          }
          try {
            const elements = domManager.extractPageElements();
            console.log(
              `[content.ts] DOMManager extracted ${elements.compressed.length} elements.`
            );
            sendResponse({
              success: true,
              compressed: elements.compressed,
              uncompressed: elements.uncompressed,
            });
          } catch (extractError: any) {
            console.error(
              "[content.ts] Error calling domManager.extractPageElements():",
              extractError.message,
              extractError.stack
            );
            sendResponse({
              success: false,
              error: "Extraction error: " + extractError.message,
            });
          }
          return true;

        case "RESIZE_SCREENSHOT":
          const img = new Image();
          const maxSize = 720;
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              let scale = 1;
              if (img.width > maxSize || img.height > maxSize) {
                scale = maxSize / Math.max(img.width, img.height);
              }
              canvas.width = img.width * scale;
              canvas.height = img.height * scale;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                sendResponse({ error: "Canvas context error" });
                return;
              }
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const webp = canvas.toDataURL("image/webp", 0.7);
              console.log("[content.ts] Resized screenshot (WebP)");
              sendResponse({ resizedDataUrl: webp });
            } catch (e) {
              console.error("[content.ts] Error during resize/encode:", e);
              sendResponse({ error: "Resize/encode error" });
            }
          };
          img.onerror = (err) => {
            console.error("[content.ts] Image load error for resizing:", err);
            sendResponse({ error: "Image load error" });
          };
          img.src = message.dataUrl;
          return true;

        case "PING":
          sendResponse({ success: true, tabId: currentTabId });
          return true;

        case "DISPLAY_MESSAGE":
          console.log(
            "[content.ts] Received DISPLAY_MESSAGE:",
            message.response?.message || message.response
          );
          sendResponse({ success: true });
          return true;

        default:
          console.warn(
            "[content.ts] Received unknown message type:",
            messageType
          );
          sendResponse({
            success: false,
            error: "Unknown message type: " + messageType,
            tabId: currentTabId,
          });
          return true;
      }
    } catch (err: any) {
      console.error(
        "[content.ts] Error processing runtime message:",
        messageType,
        err.message,
        err.stack
      );
      try {
        sendResponse({
          success: false,
          error: "Content script error: " + err.message,
        });
      } catch (respErr) {
        console.error("[content.ts] Failed sending error response:", respErr);
      }
      return true;
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      console.log(
        "[content.ts] Page restored from BFCache. Re-checking connection."
      );
      getTabAndInitialize();
    }
  });

  console.log("[content.ts] Agent content script initialized successfully.");
} else {
  console.log(
    "[content.ts] Agent content script already initialized (AGENT_KEY found)."
  );
}
