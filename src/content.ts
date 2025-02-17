import { PageElement } from "./services/ai/interfaces";

/******************************************************
 * 1) Global Declaration to avoid "window[...] error"
 ******************************************************/
declare global {
  interface Window {
    __AGENT_CHROME_INITIALIZED__?: boolean;
    postMessage(message: any, targetOrigin: string): void;
  }
}

/******************************************************
 * 2) Minimal definitions for local "Action"
 *    (matching the new approach from background.ts)
 ******************************************************/
type LocalActionType =
  | "click"
  | "input_text"
  | "scroll"
  | "verify"
  | "extract_content"
  | "submit_form"
  | "key_press"
  | "done"
  | "navigate"
  | "hover"
  | "select"
  | "wait"
  | "double_click"
  | "right_click"
  | "click_element";

interface LocalAction {
  type: LocalActionType;
  data: {
    selector?: string;
    value?: string;
    text?: string; // For input_text or key_press
    index?: number; // Possibly used for referencing an element
    key?: string; // For key_press
    duration?: number;
    url?: string;
    offset?: number;
    direction?: "up" | "down";
    // ... add more as needed
  };
  description?: string;
}

/******************************************************
 * 3) Ensure content script runs only once
 ******************************************************/
const AGENT_KEY = "__AGENT_CHROME_INITIALIZED__";
if (!window[AGENT_KEY]) {
  window[AGENT_KEY] = true;
  console.log("[content.ts] Loaded content script successfully.");

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
        if (message.action?.data?.selector) {
          highlightElement(message.action.data.selector);
        }
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

  // ✅ Keep connection alive
  setInterval(() => {
    port.postMessage({ type: "KEEP_ALIVE", tabId: -1 });
  }, 5000);

  // ✅ Notify background that content script is active (optional)
  chrome.runtime.sendMessage({ type: "REGISTER_CONTENT_SCRIPT" });

  /******************************************************
   * 4) Listen for Messages from Background & ChatWidget
   ******************************************************/
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case "PERFORM_ACTION":
        console.log("[content.ts] Executing action:", message.action);
        if (message.action?.data?.selector) {
          highlightElement(message.action.data.selector);
        }
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
   * 5) highlightElement - visual overlay
   ******************************************************/
  function highlightElement(selector: string) {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn("[content.ts] highlightElement: not found:", selector);
      return;
    }

    // Create highlight box
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
   * 6) Execute DOM Actions
   ******************************************************/
  function executeDOMAction(action: LocalAction) {
    try {
      // If no selector needed (e.g. "done", "verify" handled by background),
      // we might skip direct DOM interaction. But let's handle the rest:
      const sel = action.data.selector || "";
      let element = sel ? (document.querySelector(sel) as HTMLElement) : null;

      if (!element && sel) {
        console.warn("[content.ts] Element not found. Attempting scroll...");
        // Attempt to scroll down to see if element appears
        window.scrollTo(0, document.body.scrollHeight);

        setTimeout(() => {
          element = document.querySelector(sel) as HTMLElement;
          if (!element) {
            console.error("[content.ts] Element still not found after scroll.");
            chrome.runtime.sendMessage({
              type: "ACTION_FAILED",
              error: `Element not found for selector: ${sel}`,
            });
            return;
          }
          performLocalDOMAction(element, action);
        }, 1000);
      } else if (element) {
        performLocalDOMAction(element, action);
      } else {
        // No selector or not needed
        performLocalDOMAction(null, action);
      }
    } catch (error: any) {
      console.error("[content.ts] Error executing DOM action:", error);
      chrome.runtime.sendMessage({
        type: "ACTION_FAILED",
        error: error.message,
      });
    }
  }

  function performLocalDOMAction(
    target: HTMLElement | null,
    action: LocalAction
  ) {
    switch (action.type) {
      case "click":
      case "click_element":
        target?.click();
        actionSuccess();
        break;

      case "input_text":
        if (!target) {
          actionFail("No element for input_text");
          break;
        }
        (target as HTMLInputElement).value = action.data.text || "";
        target.dispatchEvent(new Event("input", { bubbles: true }));
        actionSuccess();
        break;

      case "scroll":
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          actionSuccess();
        } else {
          // If no target, might do window scroll
          window.scrollBy({
            top: action.data.offset || 200,
            behavior: "smooth",
          });
          actionSuccess();
        }
        break;

      case "select":
        if (!target) {
          actionFail("No element for select");
          break;
        }
        (target as HTMLSelectElement).value = action.data.value || "";
        target.dispatchEvent(new Event("change", { bubbles: true }));
        actionSuccess();
        break;

      case "hover":
        if (!target) {
          actionFail("No element for hover");
          break;
        }
        target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        actionSuccess();
        break;

      case "double_click":
      case "right_click":
        if (!target) {
          actionFail("No element for right/double click");
          break;
        }
        // We can unify these with custom events:
        const eType =
          action.type === "double_click" ? "dblclick" : "contextmenu";
        target.dispatchEvent(new MouseEvent(eType, { bubbles: true }));
        actionSuccess();
        break;

      case "submit_form":
        if (!target) {
          actionFail("No element for submit_form");
          break;
        }
        // If it's a form
        if (target instanceof HTMLFormElement) {
          target.submit();
        } else {
          // Try to find a parent form
          const formEl = target.closest("form");
          if (formEl) formEl.submit();
          else actionFail("submit_form: no form found");
        }
        actionSuccess();
        break;

      case "key_press":
        // e.g. sending a key event to window or element
        const key = action.data.key || "Enter";
        const keyEvent = new KeyboardEvent("keydown", { key, bubbles: true });
        (target || window.document).dispatchEvent(keyEvent);
        actionSuccess();
        break;

      case "extract_content":
        // Possibly do something more advanced, e.g. extracting text from target
        // For now, just success
        actionSuccess();
        break;

      case "done":
        // The AI says we're fully done
        actionSuccess("Done action invoked.");
        break;

      default:
        console.warn("[content.ts] Unknown or no-OP action type:", action.type);
        chrome.runtime.sendMessage({
          type: "ACTION_FAILED",
          error: `Unknown action: ${action.type}`,
        });
    }
  }

  function actionSuccess(msg?: string) {
    chrome.runtime.sendMessage({ type: "ACTION_SUCCESS", message: msg });
  }

  function actionFail(errorMsg: string) {
    console.error("[content.ts]", errorMsg);
    chrome.runtime.sendMessage({
      type: "ACTION_FAILED",
      error: errorMsg,
    });
  }

  /******************************************************
   * 7) Sidebar Handling
   ******************************************************/
  function toggleSidebar() {
    if (!sidebarContainer) injectSidebar();
    sidebarVisible = !sidebarVisible;
    sidebarContainer?.classList.toggle("hidden", !sidebarVisible);
    document.body.classList.toggle("sidebar-hidden", !sidebarVisible);
  }

  function injectSidebar() {
    if (document.getElementById("agent-chrome-root")) return;

    sidebarContainer = document.createElement("div");
    sidebarContainer.id = "agent-chrome-root";
    document.body.appendChild(sidebarContainer);

    // If no styling injected, add some
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

    // Add your React sidebar script
    const script = document.createElement("script");
    script.type = "module";
    script.src = chrome.runtime.getURL("sidebar.js");
    script.id = "agent-chrome-script";
    document.body.appendChild(script);

    sidebarVisible = true;
  }

  /******************************************************
   * 8) Listen for "USER_COMMAND" from ChatWidget
   ******************************************************/
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== window) {
      return;
    }

    const data = event.data;
    if (data?.type === "USER_COMMAND" && data.command) {
      console.log(
        "[content.ts] ChatWidget command -> background:",
        data.command
      );

      // Forward to background
      chrome.runtime.sendMessage({
        type: "PROCESS_COMMAND",
        command: data.command,
        commandType: "INITIAL_COMMAND",
      });
    }
  });

  /**
   * Extracts interactive, visible elements within the viewport,
   * skipping those that have no meaningful text.
   *
   * @returns {PageElement[]} filtered array of elements
   *
   * @typedef {Object} PageElement
   * @property {number} index
   * @property {string} tagName
   * @property {string} selector
   * @property {string} text
   * @property {string} fullText
   * @property {Record<string, string | null>} attributes
   * @property {string} [role]
   * @property {string} [accessibleLabel]
   * @property {Object} boundingBox
   * @property {number} boundingBox.x
   * @property {number} boundingBox.y
   * @property {number} boundingBox.width
   * @property {number} boundingBox.height
   */
  function extractPageElements(): PageElement[] {
    const elements: PageElement[] = [];
    let idx = 1;

    // 1) Check if the element is visible (not display:none, not visibility:hidden, and nonzero bounding box)
    function isVisible(el: HTMLElement): boolean {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden")
        return false;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;

      return true;
    }

    // 2) Check if the element is in the current viewport (i.e., partially or fully)
    function isInViewport(el: HTMLElement): boolean {
      const rect = el.getBoundingClientRect();
      return (
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <=
          (window.innerHeight || document.documentElement.clientHeight) &&
        rect.left <= (window.innerWidth || document.documentElement.clientWidth)
      );
    }

    // 3) Extract meaningful text from element
    function getMeaningfulText(el: HTMLElement): string {
      // Prefer aria-label, alt, placeholder, then fallback to textContent
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("alt") ||
        el.getAttribute("placeholder") ||
        el.textContent;
      return (label || "").trim();
    }

    // 4) Check if the element is likely interactive by tag or role
    function isElementInteractive(el: HTMLElement): boolean {
      const interactiveTags = [
        "BUTTON",
        "A",
        "INPUT",
        "TEXTAREA",
        "SELECT",
        "LABEL",
      ];
      if (interactiveTags.includes(el.tagName)) {
        // Special case for <a>, require a meaningful href
        if (el.tagName === "A") {
          const href = el.getAttribute("href");
          if (!href || href === "#") return false;
        }
        return true;
      }

      // If it has a role, check if it's not purely presentational
      const roleAttr = el.getAttribute("role");
      if (
        roleAttr &&
        roleAttr.trim() &&
        !["presentation", "none"].includes(roleAttr.trim())
      ) {
        return true;
      }

      return false;
    }

    document.querySelectorAll("*:not(#agent-chrome-root *)").forEach((el) => {
      if (!(el instanceof HTMLElement)) return;

      // A) Must be interactive
      if (!isElementInteractive(el)) return;

      // B) Must be visible
      if (!isVisible(el)) return;

      // C) Must be in the viewport (uncomment to filter out offscreen elements)
      if (!isInViewport(el)) return;

      // D) Extract meaningful text and skip if there's none
      const textSnippet = getMeaningfulText(el);
      if (!textSnippet) return;

      // E) Build a best-guess selector
      let selector: string;
      if (el.id) {
        selector = `#${CSS.escape(el.id)}`;
      } else if (el.className) {
        selector = `.${el.className.trim().replace(/\s+/g, ".")}`;
      } else {
        selector = `tag:${el.tagName.toLowerCase()}`;
      }

      // F) Whitelist of attributes to keep
      const attributes: Record<string, string | null> = {};
      const attributeWhitelist = [
        "href",
        "id",
        "type",
        "name",
        "value",
        "title",
        "aria-label",
        "alt",
        "placeholder",
      ];
      Array.from(el.attributes).forEach((attr) => {
        if (attributeWhitelist.includes(attr.name)) {
          attributes[attr.name] = attr.value;
        }
      });

      // G) Compute bounding box
      const rect = el.getBoundingClientRect();
      const boundingBox = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };

      // H) Finally, add to our result array
      elements.push({
        index: idx++,
        tagName: el.tagName.toLowerCase(),
        selector,
        text: textSnippet.slice(0, 100), // truncated snippet
        fullText: "", // or you can collect a snippet from the parent container
        attributes,
        role: el.getAttribute("role") || undefined,
        accessibleLabel:
          el.getAttribute("aria-label") || el.getAttribute("alt") || undefined,
        boundingBox,
      });
      drawDebugHighlight(el, idx, selector);
    });

    return elements;
  }

  /**
   * Optional debug highlight function
   * You can disable for non-interactive elements, or highlight all
   */
  /**
   * Draws a debug highlight overlay around an element,
   * labeling it with [index] and the selector.
   */
  function drawDebugHighlight(
    element: HTMLElement,
    index: number,
    selector: string
  ) {
    const rect = element.getBoundingClientRect();

    // Create the main overlay
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

    // Create a label that shows the [index] and selector
    const label = document.createElement("div");
    label.innerText = `[${index}] ${selector}`;
    label.style.position = "absolute";
    label.style.top = "0";
    label.style.left = "0";
    label.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
    label.style.color = "#000";
    label.style.fontSize = "10px";
    label.style.fontFamily = "monospace";
    label.style.padding = "2px 4px";
    label.style.pointerEvents = "none";

    overlay.appendChild(label);
    document.body.appendChild(overlay);

    // Remove the overlay after a few seconds
    setTimeout(() => overlay.remove(), 3000);
  }
}
