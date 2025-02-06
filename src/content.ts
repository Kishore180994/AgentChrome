// content.ts

import { ExtensionMessage, ReactMessage } from "./types/messages";

/******************************************************
 * 1) Global Declaration to avoid "window[...] error"
 ******************************************************/
// content.ts
declare global {
  interface Window {
    __AGENT_CHROME_INITIALIZED__?: boolean;
    // Add this for message type safety
    postMessage(message: ExtensionMessage, targetOrigin: string): void;
  }
}

/******************************************************
 * 2) Define our message interfaces
 ******************************************************/
interface BaseMessage {
  type: string;
  [key: string]: any;
}

interface ActionData {
  // e.g. "click", "input", "select", "scroll"
  type: string;
  selector?: string;
  data?: {
    tagName?: string;
    id?: string;
    className?: string;
    textContent?: string;
    value?: string;
  };
}

interface PerformActionMessage extends BaseMessage {
  type: "PERFORM_ACTION";
  data: ActionData;
}

/******************************************************
 * 3) Main Guard - ensure we only run once
 ******************************************************/
const AGENT_KEY = "__AGENT_CHROME_INITIALIZED__";
if (!window[AGENT_KEY]) {
  window[AGENT_KEY] = true;

  console.log("[content.ts] loaded (not previously initialized).");

  // Track sidebar state
  let sidebarContainer: HTMLDivElement | null = null;
  let sidebarVisible = false;

  // Notify background that content script is ready
  chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_READY" });

  /******************************************************
   * 4) Utility: skip elements in the sidebar
   ******************************************************/
  function isInSidebar(element: HTMLElement): boolean {
    const sbar = document.getElementById("agent-chrome-root");
    return !!sbar && sbar.contains(element);
  }

  /******************************************************
   * 5) Utility: build a unique selector
   ******************************************************/
  function getUniqueSelector(element: HTMLElement): string | null {
    if (element.id) {
      return `#${element.id}`;
    }
    // fallback or more advanced logic
    return null;
  }

  /******************************************************
   * 6) Highlighting logic
   ******************************************************/
  const activeHighlights: HTMLDivElement[] = [];

  function scanPageElements() {
    // Interactable elements
    const allCandidates = document.querySelectorAll(
      "button, a, input, textarea, select"
    );
    const elements: Array<{
      el: HTMLElement;
      index: number;
      selector: string;
      text: string;
    }> = [];
    let idx = 1;

    for (const candidate of allCandidates) {
      if (!(candidate instanceof HTMLElement)) continue;
      if (isInSidebar(candidate)) continue;

      const selector = getUniqueSelector(candidate) || "";
      const textSnippet = (
        candidate.textContent ||
        candidate.getAttribute("placeholder") ||
        ""
      )
        .trim()
        .slice(0, 50);

      elements.push({
        el: candidate,
        index: idx++,
        selector,
        text: textSnippet,
      });
    }
    return elements;
  }

  function highlightElement(element: HTMLElement, label: string) {
    const rect = element.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.border = "2px solid red";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "999999999";

    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    const labelDiv = document.createElement("div");
    labelDiv.textContent = label;
    Object.assign(labelDiv.style, {
      position: "absolute",
      top: "0",
      right: "0",
      backgroundColor: "red",
      color: "white",
      padding: "2px 4px",
      fontSize: "12px",
    });
    overlay.appendChild(labelDiv);

    document.body.appendChild(overlay);
    return overlay;
  }

  function clearHighlights() {
    for (const hl of activeHighlights) {
      hl.remove();
    }
    activeHighlights.length = 0;
  }

  function showPageElements() {
    clearHighlights();
    const elements = scanPageElements();
    for (const item of elements) {
      const overlay = highlightElement(item.el, `#${item.index}`);
      activeHighlights.push(overlay);
    }
  }

  /******************************************************
   * 7) Sidebar injection and toggling
   ******************************************************/
  function injectSidebar() {
    if (sidebarContainer || document.getElementById("agent-chrome-root"))
      return;

    sidebarContainer = document.createElement("div");
    sidebarContainer.id = "agent-chrome-root";
    document.body.appendChild(sidebarContainer);

    if (!document.getElementById("agent-chrome-style")) {
      const style = document.createElement("style");
      style.id = "agent-chrome-style";
      style.textContent = `
        body {
          width: calc(100% - 400px) !important;
          margin-right: 400px !important;
          position: relative !important;
          transition: all 0.3s ease-in-out !important;
        }
        body.sidebar-hidden {
          width: 100% !important;
          margin-right: 0 !important;
        }
        #agent-chrome-root {
          position: fixed;
          top: 0;
          right: 0;
          width: 400px;
          height: 100vh;
          background: white;
          box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
          z-index: 2147483647;
          transition: transform 0.3s ease-in-out;
        }
        #agent-chrome-root.hidden {
          transform: translateX(100%);
        }
      `;
      document.head.appendChild(style);
    }

    // Optionally load your React bundle
    const script = document.createElement("script");
    script.type = "module";
    script.src = chrome.runtime.getURL("sidebar.js");
    script.id = "agent-chrome-script";
    document.body.appendChild(script);

    sidebarVisible = true;
  }

  function toggleSidebar() {
    if (!sidebarContainer) {
      injectSidebar();
      return;
    }
    sidebarVisible = !sidebarVisible;
    sidebarContainer.classList.toggle("hidden", !sidebarVisible);
    document.body.classList.toggle("sidebar-hidden", !sidebarVisible);
  }

  /******************************************************
   * 8) performAction
   ******************************************************/
  async function performAction(
    action: ActionData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let element: HTMLElement | null = null;

      // Try finding by .selector
      if (action.selector) {
        element = document.querySelector<HTMLElement>(action.selector);
      } else if (action.data) {
        // Fallback to building a CSS query
        const { tagName, id, className, textContent } = action.data;
        const selParts: string[] = [];
        if (tagName) selParts.push(tagName.toLowerCase());
        if (id) selParts.push(`#${id}`);
        if (className) selParts.push("." + className.split(" ").join("."));

        const possible = document.querySelectorAll<HTMLElement>(
          selParts.join("")
        );
        if (possible.length > 1 && textContent) {
          element =
            Array.from(possible).find(
              (el) => el.textContent?.trim() === textContent.trim()
            ) || null;
        } else {
          element = possible[0] || null;
        }
      }

      if (!element) {
        throw new Error("Element not found");
      }

      switch (action.type) {
        case "click":
          element.click();
          break;
        case "input":
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ) {
            element.value = action.data?.value || "";
            element.dispatchEvent(new Event("input", { bubbles: true }));
          }
          break;
        case "select":
          if (element instanceof HTMLSelectElement) {
            element.value = action.data?.value || "";
            element.dispatchEvent(new Event("change", { bubbles: true }));
          }
          break;
        case "scroll":
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      return { success: true };
    } catch (err: any) {
      console.error("Error performing action:", err);
      return { success: false, error: err.message };
    }
  }

  /******************************************************
   * 9) Ctrl/Cmd + Click => capture element info
   ******************************************************/
  document.addEventListener("click", (event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      const element = event.target as HTMLElement;

      const elementInfo = {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        textContent: element.textContent?.trim(),
        href: element instanceof HTMLAnchorElement ? element.href : undefined,
        value: element instanceof HTMLInputElement ? element.value : undefined,
        type: element instanceof HTMLInputElement ? element.type : undefined,
      };

      chrome.runtime.sendMessage({
        type: "ELEMENT_CLICKED",
        data: elementInfo,
      });
    }
  });

  /******************************************************
   * 10) Listen for messages
   ******************************************************/
  chrome.runtime.onMessage.addListener(
    (message: BaseMessage, sender, sendResponse) => {
      console.log("[content.ts] Received message:", message.type);

      switch (message.type) {
        case "TOGGLE_SIDEBAR":
          toggleSidebar();
          sendResponse({ success: true });
          break;

        case "TOGGLE_LISTENING":
        case "TOGGLE_WATCHING":
          console.log("Toggling listening/watching:", message.type);
          sendResponse({ success: true });
          break;

        case "PERFORM_ACTION":
          performAction(message.data).then(sendResponse);
          return true; // keep channel open for async

        case "PREPARE_SCREENSHOT":
          if (sidebarContainer) {
            sidebarContainer.style.display = "none";
            document.body.classList.add("sidebar-hidden");
          }
          break;

        case "RESTORE_AFTER_SCREENSHOT":
          if (sidebarContainer) {
            sidebarContainer.style.display = "";
            if (sidebarVisible) {
              document.body.classList.remove("sidebar-hidden");
            }
          }
          break;

        case "SHOW_PAGE_ELEMENTS":
          showPageElements();
          sendResponse({ success: true });
          return true;

        case "HIDE_PAGE_ELEMENTS":
          clearHighlights();
          sendResponse({ success: true });
          return true;

        default:
          console.log("[content.ts] Unknown message type:", message.type);
          sendResponse({ success: false, error: "Unknown message type" });
          break;
      }
    }
  );
} else {
  console.warn("[content.ts] Agent Chrome already initialized");
}

// content.ts - Add to existing code
window.addEventListener("message", (event: MessageEvent<ReactMessage>) => {
  if (event.origin !== window.location.origin) return;
  if (event.source !== window) return;

  // Handle messages from React app
  if (event.data.type === "FROM_REACT_APP") {
    switch (event.data.action) {
      case "SHOW_PAGE_ELEMENTS":
        chrome.runtime.sendMessage(
          { type: "SHOW_PAGE_ELEMENTS" },
          (response) => {
            // Send response back to React
            window.postMessage(
              {
                type: "FROM_CONTENT_SCRIPT",
                action: "SHOW_PAGE_ELEMENTS_RESPONSE",
                result: response,
              },
              "*"
            );
          }
        );
        break;
    }
  }
});
