/******************************************************
 * 1) Global Declaration to avoid "window[...] error"
 ******************************************************/
declare global {
  interface Window {
    __AGENT_CHROME_INITIALIZED__?: boolean;
    postMessage(message: ExtensionMessage, targetOrigin: string): void;
  }
}

import { ExtensionMessage, ReactMessage } from "./types/messages";

/******************************************************
 * 2) Interface Definitions (Consistent Formatting)
 ******************************************************/
interface AIResponse {
  text: string;
  code: string;
  actions: Action[];
}

type ActionType =
  | "confirm"
  | "click"
  | "input"
  | "select"
  | "scroll"
  | "hover"
  | "double_click"
  | "right_click"
  | "keydown"
  | "keyup"
  | "keypress"
  | "clear"
  | "submit"
  | "wait"
  | "input_text"
  | "doubleClick"
  | "rightClick"
  | "navigate";

interface Action {
  type: ActionType;
  data: ActionData;
  message?: string;
  description?: string;
}

interface ActionData {
  selector: string;
  value?: string;
  duration?: number;
  key?: string;
  keyCode?: number;
  url?: string;
}

/******************************************************
 * 3) Ensure content script runs only once
 ******************************************************/
const AGENT_KEY = "__AGENT_CHROME_INITIALIZED__";
if (!window[AGENT_KEY]) {
  window[AGENT_KEY] = true;
  console.log("[content.ts] Loaded");

  let sidebarContainer: HTMLDivElement | null = null;
  let sidebarVisible = false;

  /******************************************************
   * 🔥 Persistent Connection to Background Script
   ******************************************************/
  const port = chrome.runtime.connect({ name: "content-script" });

  port.onMessage.addListener((message) => {
    console.log("[content.ts] Received message from background:", message);

    switch (message.type) {
      case "PERFORM_ACTION":
        console.log("[content.ts] Executing action:", message.action);
        highlightElement(message.action.data.selector);
        executeDOMAction(message.action);
        break;

      case "TOGGLE_SIDEBAR":
        toggleSidebar();
        break;

      case "GET_PAGE_ELEMENTS":
        console.log("[content.ts] Extracting page elements...");
        port.postMessage({
          type: "PAGE_ELEMENTS",
          elements: extractPageElements(),
        });
        break;

      default:
        console.warn("[content.ts] Unknown message type:", message.type);
    }
  });

  // ✅ Keep connection alive by sending periodic "heartbeat" messages
  setInterval(() => {
    port.postMessage({ type: "KEEP_ALIVE" });
  }, 5000);

  // ✅ Notify background that content script is active
  chrome.runtime.sendMessage({ type: "REGISTER_CONTENT_SCRIPT" });

  /******************************************************
   * 4) Listen for Messages from Background & ChatWidget
   ******************************************************/
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case "PERFORM_ACTION":
        console.log("[content.ts] Executing action:", message.action);
        highlightElement(message.action.data.selector);
        executeDOMAction(message.action);
        sendResponse({ success: true });
        return true;

      case "TOGGLE_SIDEBAR":
        toggleSidebar();
        sendResponse({ success: true });
        return true;

      case "GET_PAGE_ELEMENTS":
        console.log("[content.ts] Extracting page elements...");
        const elements = extractPageElements();
        sendResponse({ success: true, elements });
        return true;

      default:
        console.warn("[content.ts] Unknown message type:", message.type);
        sendResponse({ success: false, error: "Unknown message type" });
    }
  });

  /******************************************************
   * 5) Highlight Element Before Execution
   ******************************************************/
  function highlightElement(selector: string) {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(
        "[content.ts] Element not found for highlighting:",
        selector
      );
      return;
    }

    // Create a highlight box
    const rect = element.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.className = "ai-highlight-box";
    overlay.style.position = "absolute";
    overlay.style.border = "2px solid red";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "999999";
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.backgroundColor = "rgba(255, 0, 0, 0.2)";

    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2000);
  }

  /******************************************************
   * 6) Execute AI Actions
   ******************************************************/
  function executeDOMAction(action: Action) {
    try {
      let element = document.querySelector(action.data.selector) as HTMLElement;
      if (!element) {
        console.warn("[content.ts] Element not found, scrolling down...");
        window.scrollTo(0, document.body.scrollHeight);

        setTimeout(() => {
          element = document.querySelector(action.data.selector) as HTMLElement;
          if (!element) {
            console.error(
              "[content.ts] Element still not found after scrolling."
            );
            chrome.runtime.sendMessage({
              type: "ACTION_FAILED",
              error: "Element not found.",
            });
            return;
          }
          performAction(element, action);
        }, 1000);
      } else {
        performAction(element, action);
      }
    } catch (error: any) {
      console.error("[content.ts] Error executing action:", error);
      chrome.runtime.sendMessage({
        type: "ACTION_FAILED",
        error: error.message,
      });
    }
  }

  function performAction(element: HTMLElement, action: Action) {
    switch (action.type) {
      case "click":
        element.click();
        break;
      case "input":
        (element as HTMLInputElement).value = action.data.value || "";
        element.dispatchEvent(new Event("input", { bubbles: true }));
        break;
      case "select":
        (element as HTMLSelectElement).value = action.data.value || "";
        element.dispatchEvent(new Event("change", { bubbles: true }));
        break;
      case "scroll":
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      default:
        console.error("[content.ts] Unknown action type:", action.type);
        chrome.runtime.sendMessage({
          type: "ACTION_FAILED",
          error: "Unknown action type",
        });
        return;
    }
    chrome.runtime.sendMessage({ type: "ACTION_SUCCESS" });
  }

  /******************************************************
   * 7) Sidebar Handling (RESTORED)
   ******************************************************/
  function toggleSidebar() {
    if (!sidebarContainer) injectSidebar();
    sidebarVisible = !sidebarVisible;
    sidebarContainer?.classList.toggle("hidden", !sidebarVisible);
    document.body.classList.toggle("sidebar-hidden", !sidebarVisible);
  }

  /******************************************************
   * 7) Sidebar Handling (RESTORED `injectSidebar`)
   ******************************************************/
  function injectSidebar() {
    if (document.getElementById("agent-chrome-root")) return;

    sidebarContainer = document.createElement("div");
    sidebarContainer.id = "agent-chrome-root";
    document.body.appendChild(sidebarContainer);

    if (!document.getElementById("agent-chrome-style")) {
      const style = document.createElement("style");
      style.id = "agent-chrome-style";
      style.textContent = `
      body { width: calc(100% - 400px) !important; margin-right: 400px !important; transition: all 0.3s ease-in-out !important; }
      body.sidebar-hidden { width: 100% !important; margin-right: 0 !important; }
      #agent-chrome-root { position: fixed; top: 0; right: 0; width: 400px; height: 100vh; background: white; box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1); z-index: 2147483647; transition: transform 0.3s ease-in-out; }
      #agent-chrome-root.hidden { transform: translateX(100%); }
    `;
      document.head.appendChild(style);
    }

    // ✅ Inject sidebar.js for React App (RESTORED from your original code)
    const script = document.createElement("script");
    script.type = "module";
    script.src = chrome.runtime.getURL("sidebar.js");
    script.id = "agent-chrome-script";
    document.body.appendChild(script);

    sidebarVisible = true;
  }

  /******************************************************
   * 8) Listen for Messages from Content Script (RESTORED)
   ******************************************************/
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== window)
      return;

    const data = event.data as { type: string; command?: string };

    if (data.type === "USER_COMMAND" && data.command) {
      console.log(
        "[content.ts] Received command from ChatWidget:",
        data.command
      );

      // Forward the command to background.ts for AI processing
      chrome.runtime.sendMessage({
        type: "PROCESS_COMMAND",
        command: data.command,
        commandType: "INITIAL_COMMAND",
      });
    }
  });

  /******************************************************
   * 5) Extract **ALL** Available Data for Each Element
   ******************************************************/
  function extractPageElements() {
    const elements: Array<{
      id: number;
      tagName: string;
      selector: string;
      text: string;
      fullText: string;
      attributes: Record<string, string | null>;
      role?: string;
      accessibleLabel?: string;
      boundingBox: { x: number; y: number; width: number; height: number };
    }> = [];

    let idx = 1;

    document
      .querySelectorAll("button, a, input, textarea, select, label, div[role]")
      .forEach((el) => {
        if (!(el instanceof HTMLElement)) return;

        const selector = el.id
          ? `#${el.id}`
          : el.className
          ? `.${el.className.replace(/\s+/g, ".")}`
          : `tag:${el.tagName.toLowerCase()}`;

        const textSnippet = (
          el.textContent ||
          el.getAttribute("placeholder") ||
          ""
        )
          .trim()
          .slice(0, 50);
        const parentDiv = el.closest("div");
        const fullText = parentDiv
          ? parentDiv.innerText.trim().slice(0, 200)
          : textSnippet;

        const attributes: Record<string, string | null> = {};
        Array.from(el.attributes).forEach((attr) => {
          attributes[attr.name] = attr.value;
        });

        const role = el.getAttribute("role") || null;
        const accessibleLabel =
          el.getAttribute("aria-label") ||
          el.getAttribute("alt") ||
          el.innerText.trim() ||
          null;

        const rect = el.getBoundingClientRect();
        const boundingBox = {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        };

        elements.push({
          id: idx++,
          tagName: el.tagName.toLowerCase(),
          selector,
          text: textSnippet,
          fullText,
          attributes,
          role: role ? role : undefined,
          accessibleLabel: accessibleLabel ? accessibleLabel : undefined,
          boundingBox,
        });

        drawDebugHighlight(el, selector);
      });

    return elements;
  }

  /******************************************************
   * 6) Draw a Debug Highlight on Extracted Elements
   ******************************************************/
  function drawDebugHighlight(element: HTMLElement, selector: string) {
    const rect = element.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.className = "debug-highlight";
    overlay.style.position = "absolute";
    overlay.style.border = "2px solid blue";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "999999";
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.backgroundColor = "rgba(0, 0, 255, 0.1)";

    document.body.appendChild(overlay);

    setTimeout(() => overlay.remove(), 5000);
  }
}
