// content.ts

/******************************************************
 * 1) Global Declaration to avoid "window[...] error"
 ******************************************************/

/**
 * Extend the Window interface to declare properties or methods
 * that TypeScript doesn't recognize by default.
 * This avoids errors like: 'Property ___ does not exist on type Window'.
 */
declare global {
  interface Window {
    __AGENT_CHROME_INITIALIZED__?: boolean;
    /**
     * postMessage override for stricter type checks related to our extension messages
     */
    postMessage(message: ExtensionMessage, targetOrigin: string): void;
  }
}

/******************************************************
 * 2) Define our message interfaces
 ******************************************************/

/**
 * A base message interface that all messages share.
 */
interface BaseMessage {
  type: string;
  [key: string]: any;
}

/**
 * The shape of the data used for performing an action on the DOM.
 */
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

/**
 * A message instructing the extension to perform an action,
 * containing data that describes the action and the target element.
 */
interface PerformActionMessage extends BaseMessage {
  type: "PERFORM_ACTION";
  data: ActionData;
}

/******************************************************
 * 2b) Import external message type definitions
 ******************************************************/
import { ExtensionMessage, ReactMessage } from "./types/messages";

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

  // Notify background script that the content script is ready
  chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_READY" });

  /******************************************************
   * 4) Utility: skip elements in the sidebar
   ******************************************************/

  /**
   * Determines whether a given element is within the injected sidebar.
   * @param element The element to check
   * @returns True if the element is inside the sidebar; false otherwise
   */
  function isInSidebar(element: HTMLElement): boolean {
    const sbar = document.getElementById("agent-chrome-root");
    return !!sbar && sbar.contains(element);
  }

  /******************************************************
   * 5) Utility: build a unique selector
   ******************************************************/

  /**
   * Generates a simple (possibly partial) unique selector string for an element.
   * Currently returns the element's ID if it exists.
   * @param element The element to generate a selector for
   * @returns A string CSS selector or null if none found
   */
  function getUniqueSelector(element: HTMLElement): string | null {
    if (element.id) {
      return `#${element.id}`;
    }
    // Extend or fallback logic if needed
    return null;
  }

  /******************************************************
   * 6) Highlighting logic
   ******************************************************/

  const activeHighlights: HTMLDivElement[] = [];

  /**
   * Scans the page for interactive elements (buttons, inputs, etc.)
   * while excluding those inside the sidebar.
   * @returns An array of objects with the element reference, index, selector, and snippet of text
   */
  function scanPageElements() {
    // Potentially interactable elements
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

  /**
   * Creates a visible overlay on top of the specified element,
   * drawing a border and showing a label.
   * @param element The DOM element to highlight
   * @param label A label string to display on the overlay
   * @returns The overlay element (div) that was created
   */
  function highlightElement(element: HTMLElement, label: string) {
    const rect = element.getBoundingClientRect();
    const overlay = document.createElement("div");
    const random = getRandomColor();
    overlay.style.position = "absolute";
    overlay.style.border = `2px solid ${random}`;
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

  /**
   * Removes any currently active highlights (overlays) from the page.
   */
  function clearHighlights() {
    for (const hl of activeHighlights) {
      hl.remove();
    }
    activeHighlights.length = 0;
  }

  /**
   * Highlights all interactable elements found on the page.
   */
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

  /**
   * Injects the sidebar container into the DOM if it isn't already present.
   * Also loads the sidebar script (e.g., the React app) to populate that container.
   */
  function injectSidebar() {
    const existing = document.getElementById("agent-chrome-root");
    if (sidebarContainer || existing) return;

    sidebarContainer = document.createElement("div");
    sidebarContainer.id = "agent-chrome-root";
    document.body.appendChild(sidebarContainer);

    // Inject a style block for controlling sidebar appearance/animations
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

  /**
   * Generates a random color in hex format.
   * @returns A random hex color string (e.g. "#f1a94a")
   */
  function getRandomColor(): string {
    return (
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padEnd(6, "0")
    );
  }

  /**
   * Toggles the sidebar's visibility and updates styling accordingly.
   */
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

  /**
   * Perform a user-like action (click, input, select, scroll) on the DOM element
   * specified by an ActionData object. Supports fallback logic if a selector is not provided.
   *
   * @param action The ActionData object specifying the type of action and target element details
   * @returns Promise resolving to success: boolean and optional error string
   */
  async function performAction(
    action: ActionData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let element: HTMLElement | null = null;

      // If a direct CSS selector is provided, try that first
      if (action.selector) {
        element = document.querySelector<HTMLElement>(action.selector);
      } else if (action.data) {
        // Otherwise, try to build a more detailed fallback query
        const { tagName, id, className, textContent } = action.data;
        const selParts: string[] = [];

        if (tagName) selParts.push(tagName.toLowerCase());
        if (id) selParts.push(`#${id}`);
        if (className) {
          selParts.push("." + className.split(" ").join("."));
        }

        const possible = document.querySelectorAll<HTMLElement>(
          selParts.join("")
        );

        if (possible.length > 1 && textContent) {
          // If multiple matches, narrow down by matching text content
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

  /**
   * Listen for clicks combined with Ctrl (Windows/Linux) or Cmd (Mac).
   * Captures and sends element metadata to the background script.
   */
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
   * 10) Listen for messages (from background script, etc.)
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
          // These might trigger internal state changes or watchers
          console.log("Toggling listening/watching:", message.type);
          sendResponse({ success: true });
          break;

        case "PERFORM_ACTION":
          // Perform the specified action on a DOM element
          performAction(message.data).then(sendResponse);
          return true; // keep channel open for async response

        case "PREPARE_SCREENSHOT":
          // Hide sidebar before screenshot
          if (sidebarContainer) {
            sidebarContainer.style.display = "none";
            document.body.classList.add("sidebar-hidden");
          }
          break;

        case "RESTORE_AFTER_SCREENSHOT":
          // Restore sidebar after screenshot
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

/******************************************************
 * Window Event Listener: receiving messages from React
 ******************************************************/

/**
 * Listen for messages from the injected React app (via window.postMessage),
 * and forward them to the background script as needed.
 */
window.addEventListener("message", (event: MessageEvent<ReactMessage>) => {
  // Only handle messages from the same origin and the window itself
  if (event.origin !== window.location.origin) return;
  if (event.source !== window) return;

  // Handle messages from the React app
  if (event.data.type === "FROM_REACT_APP") {
    switch (event.data.action) {
      case "SHOW_PAGE_ELEMENTS":
        // Ask the background script to show highlights
        chrome.runtime.sendMessage(
          { type: "SHOW_PAGE_ELEMENTS" },
          (response) => {
            // Relay the result back to React
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
      // Add more actions here if needed
      default:
        // No other actions from React handled yet
        break;
    }
  }
});
