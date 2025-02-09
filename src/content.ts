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
  // Optional properties if you want to include them at the action level:
  message?: string;
  description?: string;
}

interface ActionData {
  selector: string;
  value?: string; // For input/select/navigate actions etc.
  duration?: number; // In milliseconds for wait actions.
  key?: string; // For keyboard events.
  keyCode?: number; // For keyboard events.
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
   * 4) Sidebar Injection & Toggling
   ******************************************************/
  function injectSidebar() {
    if (document.getElementById("agent-chrome-root")) return;

    sidebarContainer = document.createElement("div");
    sidebarContainer.id = "agent-chrome-root";
    document.body.appendChild(sidebarContainer);

    // Apply sidebar styles
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

    // Inject React app
    const script = document.createElement("script");
    script.type = "module";
    script.src = chrome.runtime.getURL("sidebar.js");
    script.id = "agent-chrome-script";
    document.body.appendChild(script);

    sidebarVisible = true;
  }

  function toggleSidebar() {
    if (!sidebarContainer) injectSidebar();
    sidebarVisible = !sidebarVisible;
    sidebarContainer?.classList.toggle("hidden", !sidebarVisible);
    document.body.classList.toggle("sidebar-hidden", !sidebarVisible);
  }

  function extractClickableElements() {
    const elements: Array<{
      id: number;
      tagName: string;
      selector: string;
      text: string;
      fullText: string; // Full text from surrounding div
      attributes: Record<string, string | null>; // Additional attributes
    }> = [];
    let idx = 1;

    document
      .querySelectorAll("button, a, input, textarea, select")
      .forEach((el) => {
        if (!(el instanceof HTMLElement)) return;

        // Generate a unique selector
        const selector = el.id
          ? `#${el.id}`
          : el.className
          ? `.${el.className.replace(/\s+/g, ".")}`
          : "";

        // Extract inner text (short version for quick reference)
        const textSnippet = (
          el.textContent ||
          el.getAttribute("placeholder") ||
          ""
        )
          .trim()
          .slice(0, 50);

        // Extract the closest parent div's text (for better context)
        let parentText = "";
        const parentDiv = el.closest("div");
        if (parentDiv) {
          parentText = parentDiv.innerText.trim().slice(0, 200); // Limiting to 200 characters
        }

        // Extract additional attributes (helpful for AI to identify elements)
        const attributes: Record<string, string | null> = {
          id: el.id || null,
          class: el.className || null,
          name: el.getAttribute("name"),
          type: el.getAttribute("type"),
          role: el.getAttribute("role"),
          "aria-label": el.getAttribute("aria-label"),
          value: el.getAttribute("value"),
        };

        // Include any data-* attributes
        Array.from(el.attributes).forEach((attr) => {
          if (attr.name.startsWith("data-")) {
            attributes[attr.name] = attr.value;
          }
        });

        elements.push({
          id: idx++,
          tagName: el.tagName,
          selector,
          text: textSnippet,
          fullText: parentText,
          attributes,
        });

        // **Highlight the element for debugging**
        drawDebugHighlight(el, selector, el.id || `#${idx}`);
      });

    return elements;
  }

  /**
   * Draws a debug highlight on the element with a label
   */
  function drawDebugHighlight(
    element: HTMLElement,
    selector: string,
    label: string
  ) {
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
    overlay.style.backgroundColor = "rgba(0, 0, 255, 0.1)"; // Light blue overlay

    // Label with selector and ID
    const labelDiv = document.createElement("div");
    labelDiv.textContent = `Selector: ${selector} | ID: ${label}`;
    labelDiv.style.position = "absolute";
    labelDiv.style.top = "-20px";
    labelDiv.style.left = "0";
    labelDiv.style.backgroundColor = "blue";
    labelDiv.style.color = "white";
    labelDiv.style.padding = "2px 4px";
    labelDiv.style.fontSize = "12px";
    labelDiv.style.borderRadius = "4px";
    overlay.appendChild(labelDiv);

    document.body.appendChild(overlay);

    // **Optional: Remove highlight after 5 seconds**
    // setTimeout(() => overlay.remove(), 10000);
  }

  function showConfirmationModal(
    message: string,
    callback: (confirmed: boolean, editedText?: string) => void
  ) {
    // Remove existing modal if any
    const existingModal = document.getElementById("ai-confirmation-modal");
    if (existingModal) existingModal.remove();

    // Create modal container
    const modal = document.createElement("div");
    modal.id = "ai-confirmation-modal";
    modal.style.position = "fixed";
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";
    modal.style.zIndex = "10000";
    modal.style.backgroundColor = "white";
    modal.style.padding = "20px";
    modal.style.borderRadius = "8px";
    modal.style.boxShadow = "0px 4px 10px rgba(0,0,0,0.2)";
    modal.style.minWidth = "300px";
    modal.style.textAlign = "center";

    // Message text
    const messageText = document.createElement("p");
    messageText.innerText = message;
    modal.appendChild(messageText);

    // Editable input field
    const inputField = document.createElement("input");
    inputField.type = "text";
    inputField.value = message; // Pre-fill with AI message
    inputField.style.width = "100%";
    inputField.style.marginTop = "10px";
    inputField.style.padding = "5px";
    inputField.style.border = "1px solid #ccc";
    modal.appendChild(inputField);

    // Button container
    const buttonContainer = document.createElement("div");
    buttonContainer.style.marginTop = "15px";
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "space-between";

    // Confirm button
    const confirmBtn = document.createElement("button");
    confirmBtn.innerText = "Confirm";
    confirmBtn.style.backgroundColor = "#28a745";
    confirmBtn.style.color = "white";
    confirmBtn.style.border = "none";
    confirmBtn.style.padding = "8px 16px";
    confirmBtn.style.cursor = "pointer";
    confirmBtn.style.borderRadius = "4px";
    confirmBtn.onclick = () => {
      callback(true, inputField.value);
      modal.remove();
    };

    // Cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Cancel";
    cancelBtn.style.backgroundColor = "#dc3545";
    cancelBtn.style.color = "white";
    cancelBtn.style.border = "none";
    cancelBtn.style.padding = "8px 16px";
    cancelBtn.style.cursor = "pointer";
    cancelBtn.style.borderRadius = "4px";
    cancelBtn.onclick = () => {
      callback(false);
      modal.remove();
    };

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);
    modal.appendChild(buttonContainer);

    document.body.appendChild(modal);
  }

  /**
   * Attempts to execute the provided AI step.
   * If code injection fails, falls back to executing structured actions.
   */
  async function executeStep(step: AIResponse) {
    console.log("[content.ts] Executing AI Step:", step);
    // Fallback: if no code or code execution fails, execute the actions.
    if (
      step.actions &&
      Array.isArray(step.actions) &&
      step.actions.length > 0
    ) {
      console.log("[content.ts] Executing automation actions.");
      for (const action of step.actions) {
        await executeFallbackAction(action);
      }
      return;
    }

    console.warn(
      "[content.ts] No executable code or fallback actions provided."
    );
    requestNextStep("No executable code or actions provided.");
  }

  /**
   * Executes a single fallback action based on its type.
   */
  async function executeFallbackAction(action: Action) {
    console.log("[content.ts] Executing fallback action:", action);

    const element = document.querySelector(action.data.selector);
    if (!element) {
      console.error(
        "[content.ts] Target element not found:",
        action.data.selector
      );
      requestNextStep("Element not found");
      return;
    }

    // Provide visual feedback by highlighting the element.
    drawHighlightBox(element as HTMLElement);

    // Delay a bit to allow the visual highlight before taking action.
    setTimeout(() => {
      switch (action.type) {
        case "confirm":
          showConfirmationModal(
            action.message || action.description || "Please confirm.",
            (confirmed, editedText) => {
              if (confirmed) {
                // If text was edited, inject it into the element.
                if (editedText) {
                  const inputEl = document.querySelector<HTMLInputElement>(
                    action.data.selector
                  );
                  if (inputEl) {
                    inputEl.value = editedText;
                    inputEl.dispatchEvent(
                      new Event("input", { bubbles: true })
                    );
                  }
                }
                requestNextStep();
              } else {
                console.log("[content.ts] Action canceled by user.");
              }
            }
          );
          return; // We'll call requestNextStep inside the callback.

        case "click":
          (element as HTMLElement).click();
          break;

        case "input":
        case "input_text":
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ) {
            element.value = action.data.value || "";
            element.dispatchEvent(new Event("input", { bubbles: true }));
          }
          break;

        case "select":
          if (element instanceof HTMLSelectElement) {
            element.value = action.data.value || "";
            element.dispatchEvent(new Event("change", { bubbles: true }));
          }
          break;

        case "scroll":
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          break;

        case "hover":
          // Dispatch events to simulate hovering.
          element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
          element.dispatchEvent(
            new MouseEvent("mouseenter", { bubbles: true })
          );
          break;

        case "double_click":
        case "doubleClick":
          // Dispatch a double-click event.
          element.dispatchEvent(
            new MouseEvent("dblclick", { bubbles: true, detail: 2 })
          );
          break;

        case "right_click":
        case "rightClick":
          // Dispatch a right-click (context menu) event.
          element.dispatchEvent(
            new MouseEvent("contextmenu", { bubbles: true })
          );
          break;

        case "keydown":
          // Dispatch a keydown event on the element.
          element.dispatchEvent(
            new KeyboardEvent("keydown", {
              bubbles: true,
              key: action.data.key || "",
              keyCode: action.data.keyCode || 0,
            })
          );
          break;

        case "keyup":
          element.dispatchEvent(
            new KeyboardEvent("keyup", {
              bubbles: true,
              key: action.data.key || "",
              keyCode: action.data.keyCode || 0,
            })
          );
          break;

        case "keypress":
          element.dispatchEvent(
            new KeyboardEvent("keypress", {
              bubbles: true,
              key: action.data.key || "",
              keyCode: action.data.keyCode || 0,
            })
          );
          break;

        case "clear":
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ) {
            element.value = "";
            element.dispatchEvent(new Event("input", { bubbles: true }));
          }
          break;

        case "submit":
          // If the element is a form, submit it; otherwise, try finding the closest form.
          if (element instanceof HTMLFormElement) {
            element.submit();
          } else {
            const form = element.closest("form");
            if (form) {
              form.submit();
            }
          }
          break;

        case "wait":
          // Wait for a given duration (in milliseconds) before proceeding.
          const duration = action.data.duration || 1000;
          setTimeout(() => {
            requestNextStep();
          }, duration);
          return; // Early return since requestNextStep is already scheduled.

        case "navigate":
          // Navigate to a new URL provided in action.data.value.
          if (action.data.url) {
            window.location.href = action.data.url;
          }
          break;

        default:
          console.warn("[content.ts] Unknown action type:", action.type);
      }

      // Wait before proceeding to the next step.
      setTimeout(() => {
        requestNextStep();
      }, 2000);
    }, 1000); // Initial delay to allow the highlight to be visible.
  }

  /******************************************************
   * 3️⃣ Draw a Highlight Box on AI-Selected Element
   ******************************************************/
  function drawHighlightBox(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.border = "3px solid red";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "999999";
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 1500); // Remove highlight after 1.5 seconds
  }

  /******************************************************
   * 4️⃣ Request the Next AI Step
   ******************************************************/
  function requestNextStep(errorMessage?: string) {
    chrome.runtime.sendMessage(
      { type: "REQUEST_NEXT_STEP", error: errorMessage || null },
      (response) => {
        console.log("[content.ts] AI Next Step:", response);
        if (response?.actions?.length) {
          executeStep(response.actions[0]);
        }
      }
    );
  }

  /******************************************************
   * 6) Perform Actions on DOM Elements
   ******************************************************/
  async function performAction(
    action: Action
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let element: HTMLElement | null = null;

      // For actions that require a DOM element, attempt to query it first.
      if (
        [
          "click",
          "input",
          "select",
          "scroll",
          "hover",
          "double_click",
          "right_click",
          "keydown",
          "keyup",
          "keypress",
          "clear",
          "submit",
        ].includes(action.type)
      ) {
        element = document.querySelector<HTMLElement>(action.data.selector);
        if (!element) {
          throw new Error(`Element not found: ${action.data.selector}`);
        }
      }

      switch (action.type) {
        case "click":
          element!.click();
          break;

        case "input":
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ) {
            element.value = action.data.value || "";
            element.dispatchEvent(new Event("input", { bubbles: true }));
          } else {
            throw new Error("Element is not an input or textarea.");
          }
          break;

        case "select":
          if (element instanceof HTMLSelectElement) {
            element.value = action.data.value || "";
            element.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            throw new Error("Element is not a select element.");
          }
          break;

        case "scroll":
          element!.scrollIntoView({ behavior: "smooth", block: "center" });
          break;

        case "hover":
          element!.dispatchEvent(
            new MouseEvent("mouseover", { bubbles: true })
          );
          element!.dispatchEvent(
            new MouseEvent("mouseenter", { bubbles: true })
          );
          break;

        case "double_click":
          element!.dispatchEvent(
            new MouseEvent("dblclick", { bubbles: true, detail: 2 })
          );
          break;

        case "right_click":
          element!.dispatchEvent(
            new MouseEvent("contextmenu", { bubbles: true })
          );
          break;

        case "keydown":
          element!.dispatchEvent(
            new KeyboardEvent("keydown", {
              bubbles: true,
              key: action.data.key || "",
              keyCode: action.data.keyCode || 0,
            })
          );
          break;

        case "keyup":
          element!.dispatchEvent(
            new KeyboardEvent("keyup", {
              bubbles: true,
              key: action.data.key || "",
              keyCode: action.data.keyCode || 0,
            })
          );
          break;

        case "keypress":
          element!.dispatchEvent(
            new KeyboardEvent("keypress", {
              bubbles: true,
              key: action.data.key || "",
              keyCode: action.data.keyCode || 0,
            })
          );
          break;

        case "clear":
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ) {
            element.value = "";
            element.dispatchEvent(new Event("input", { bubbles: true }));
          } else {
            throw new Error("Element is not an input or textarea.");
          }
          break;

        case "submit":
          if (element instanceof HTMLFormElement) {
            element.submit();
          } else {
            const form = element!.closest("form");
            if (form) {
              form.submit();
            } else {
              throw new Error("No form found for submission.");
            }
          }
          break;

        case "wait":
          await new Promise((resolve) =>
            setTimeout(resolve, action.data.duration || 1000)
          );
          break;

        case "navigate":
          if (action.data.url) {
            window.location.href = action.data.url;
          } else {
            throw new Error("No navigation URL provided.");
          }
          break;

        case "confirm":
          // Use a built-in confirmation dialog.
          const confirmed = window.confirm(
            action.message || action.description || "Please confirm the action."
          );
          if (!confirmed) {
            return { success: false, error: "User canceled the confirmation." };
          }
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
   * 7) Listen for Messages from Background Script & ChatWidget
   ******************************************************/
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[content.ts] Received Message:", message);

    switch (message.type) {
      case "TOGGLE_SIDEBAR":
        toggleSidebar();
        sendResponse({ success: true });
        break;

      case "PERFORM_ACTION":
        console.log("[content.ts] Performing action:", message.data);
        performAction(message.data).then(sendResponse);
        return true;

      case "SHOW_PAGE_ELEMENTS":
        console.log("[content.ts] Extracting clickable elements...");
        const elements = extractClickableElements();
        chrome.runtime.sendMessage({ type: "CLICKABLE_ELEMENTS", elements });
        sendResponse({ success: true });
        break;

      default:
        console.warn("[content.ts] Unknown message type:", message.type);
        sendResponse({ success: false, error: "Unknown message type" });
        break;
    }
  });

  /******************************************************
   * 8) Listen for Messages from ChatWidget.tsx
   ******************************************************/
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== window)
      return;

    const data = event.data as {
      type: string;
      command?: string;
      elements?: any[];
    };

    switch (data.type) {
      case "USER_COMMAND":
        console.log("[content.ts] Received command:", data.command);

        // **Extract clickable elements**
        const clickableElements = extractClickableElements();
        console.log(
          "[content.ts] Clickable elements extracted:",
          clickableElements
        );

        // **Send command + elements to background.ts for AI processing**
        chrome.runtime.sendMessage(
          {
            type: "PROCESS_COMMAND",
            command: data.command,
            elements: clickableElements,
          },
          (response) => {
            console.log("[content.ts] AI Response Received:", response);

            try {
              // ✅ Fix: Parse the stringified JSON response
              const parsedResponse: AIResponse = JSON.parse(response.text);

              console.log("[content.ts] AI Response Parsed:", parsedResponse);

              // ✅ Ensure `actions` are extracted correctly
              if (parsedResponse) {
                executeStep(parsedResponse);
              } else {
                console.error(
                  "[content.ts] No valid actions found in AI response."
                );
              }
            } catch (error) {
              console.error("[content.ts] Error parsing AI response:", error);
            }
          }
        );

        break;

      case "REQUEST_CLICKABLE_ELEMENTS":
        console.log("[content.ts] Sending clickable elements...");
        window.postMessage(
          { type: "CLICKABLE_ELEMENTS", elements: extractClickableElements() },
          "*"
        );
        break;

      case "FROM_REACT_APP":
        console.log("[content.ts] Received FROM_REACT_APP message");
        chrome.runtime.sendMessage(
          { type: "SHOW_PAGE_ELEMENTS" },
          (response) => {
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

      default:
        console.warn("[content.ts] Unknown event type:", data.type);
        break;
    }
  });
} else {
  console.warn("[content.ts] Agent Chrome already initialized");
}
