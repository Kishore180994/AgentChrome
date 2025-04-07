// ActionExecutor.ts (UPDATED to use tagName checks)

import { LocalAction } from "../types/actionType"; // Assuming this defines action structure
import { DOMManager } from "./DOMManager";

export class ActionExecutor {
  private domManager: DOMManager;

  constructor(domManager: DOMManager) {
    if (!domManager) {
      throw new Error("[ActionExecutor] DOMManager instance is required.");
    }
    this.domManager = domManager;
    console.log("[ActionExecutor] Initialized.");
  }

  /**
   * Executes a given local action on the DOM.
   * @param action The action to execute.
   * @returns The result of the action if applicable (e.g., extracted text), otherwise void.
   */
  async execute(action: LocalAction): Promise<any> {
    console.log(
      `[ActionExecutor] Attempting action: ${action.type}`,
      action.data
    );
    const { type, data } = action;

    // --- Input Validation ---
    const requiresIndex = [
      "click",
      "input_text",
      "submit_form",
      "extract",
      "key_press",
    ].includes(type);

    if (requiresIndex && typeof data?.index !== "number") {
      const errorMsg = `[ActionExecutor] Action type "${type}" requires a valid numeric 'index' in data, received: ${data?.index}`;
      console.error(errorMsg);
      throw new Error(errorMsg); // Fail fast if index is missing/invalid
    }
    if (type === "input_text" && typeof data?.text !== "string") {
      console.warn(
        `[ActionExecutor] input_text received non-string text:`,
        data?.text,
        `- Using empty string.`
      );
    }

    // --- Action Execution ---
    try {
      let result: any = undefined; // To store potential return value

      switch (type) {
        case "click":
          await this.handleClick(data.index as number);
          break;
        case "input_text":
          await this.handleInputText(
            data.text ?? "", // Use empty string if text is null/undefined
            data.index as number
          );
          break;
        case "scroll":
          await this.handleScroll(data?.offset, data?.direction);
          break;
        case "submit_form":
          await this.handleSubmitForm(data.index as number);
          break;
        case "extract":
          result = await this.handleExtract(data.index as number);
          break;
        case "key_press":
          await this.handleKeyPress(data.index as number, data.key);
          break;
        case "wait":
          const waitDuration =
            typeof data?.duration === "number" ? data.duration : 1000; // Default wait
          console.log(`[ActionExecutor] Waiting ${waitDuration}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitDuration));
          break;
        default:
          console.warn(
            `[ActionExecutor] Received unknown or unhandled action type: ${
              type as string
            }`
          );
      }
      console.log(`[ActionExecutor] Successfully executed action: ${type}`);
      return result; // Return result if any (e.g., from extract)
    } catch (error: any) {
      console.error(
        `[ActionExecutor] Failed action "${type}" on index "${data?.index}":`,
        error.message,
        error.stack
      );
      // Re-throw the error so the caller (message listener in content.js) can send failure back
      throw error;
    }
  }

  /**
   * Retrieves the HTMLElement and its execution context window based on the index.
   * Uses the DOMManager to resolve the index to an element. Validates element state.
   * @param index The unique index assigned by DOMManager during extraction.
   * @returns An object containing the element and its context window.
   * @throws Error if the element is not found, not in the DOM, or context cannot be determined.
   */
  private getElementContext(index: number): {
    element: HTMLElement;
    contextWindow: Window;
  } {
    // Index validity (being a number) is checked in `execute` before calling this

    const element = this.domManager.getElementByIndex(index);

    // Log the retrieved element for debugging
    console.log(
      `[ActionExecutor getElementContext] For Index ${index}, Retrieved Element:`,
      element
    );

    // --- Element Validation ---
    if (!element) {
      throw new Error(
        `[ActionExecutor] Element not found for index: ${index}. Page state might have changed, or index is invalid.`
      );
    }

    if (!element.isConnected) {
      console.warn(
        `[ActionExecutor] Element at index ${index} (${element.tagName}) is no longer connected to the DOM.`
      );
      throw new Error(
        `[ActionExecutor] Element at index ${index} is disconnected from the DOM.`
      );
    }

    // --- Context Window Determination ---
    const ownerDoc = element.ownerDocument;
    const contextWindow = ownerDoc?.defaultView;

    if (!contextWindow) {
      throw new Error(
        `[ActionExecutor] Could not determine context window (ownerDocument.defaultView) for element at index: ${index}`
      );
    }

    return { element, contextWindow };
  }

  // ========================================================================
  // Action Handler Implementations
  // ========================================================================

  /** Clicks the element specified by index. */
  private async handleClick(index: number): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index);

    // --- Pre-click Checks ---
    if (element.hasAttribute("disabled")) {
      console.warn(
        `[ActionExecutor] Attempting to click a disabled element at index: ${index}`
      );
      throw new Error(`Element at index ${index} is disabled.`); // Fail fast for disabled
    }
    const style = contextWindow.getComputedStyle(element);
    const opacity = parseFloat(style.opacity || "1");
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      opacity === 0
    ) {
      console.warn(
        `[ActionExecutor] Attempting to click an invisible element at index: ${index}`
      );
      throw new Error(`Element at index ${index} is not visible.`);
    }
    if (style.pointerEvents === "none") {
      console.warn(
        `[ActionExecutor] Element at index ${index} has pointer-events: none.`
      );
      // Might still attempt click, depending on desired strictness
    }

    // --- Perform Click ---
    await new Promise<void>((resolve, reject) => {
      contextWindow.requestAnimationFrame(() => {
        // Use rAF for better timing
        try {
          element.focus(); // Focusing first can improve reliability
          element.click(); // Trigger the click
          console.log(`[ActionExecutor] Clicked index: ${index}`);
          resolve();
        } catch (err: any) {
          console.error(
            `[ActionExecutor] Click error index ${index}:`,
            err.message
          );
          reject(err); // Reject promise on error
        }
      });
    });
  }

  /** Inputs text into the element specified by index. Handles input, textarea, and contentEditable. */
  private async handleInputText(text: string, index: number): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index);

    // --- Use tagName checks instead of instanceof ---
    const tagNameLower = element.tagName.toLowerCase();
    const isInputElementTag = tagNameLower === "input";
    const isTextAreaElementTag = tagNameLower === "textarea";
    // --- End Change ---
    const isContentEditable = element.isContentEditable;
    const tagOk =
      isInputElementTag || isTextAreaElementTag || isContentEditable; // Check using tags now
    const isDisabled = element.hasAttribute("disabled");
    // --- Use tag checks for readOnly too ---
    const isReadOnly =
      (isInputElementTag && (element as HTMLInputElement).readOnly) ||
      (isTextAreaElementTag && (element as HTMLTextAreaElement).readOnly);
    // --- End Change ---
    const style = contextWindow.getComputedStyle(element);
    const isNotVisible =
      style.display === "none" || style.visibility === "hidden";
    const effectiveOpacity = parseFloat(style.opacity || "1");

    // Log results of checks
    console.log(
      `[ActionExecutor handleInputText Debug] Index: ${index}, TagOk: ${tagOk}, Disabled: ${isDisabled}, ReadOnly: ${isReadOnly}, NotVisible: ${isNotVisible}, Opacity: ${effectiveOpacity}`
    );

    // --- Update error message slightly for clarity ---
    if (!tagOk)
      throw new Error(
        `[ActionExecutor] Element index ${index} (${element.tagName}) cannot accept text input (tag mismatch or not contentEditable).`
      );
    // --- End Change ---
    if (isDisabled || isReadOnly)
      throw new Error(
        `[ActionExecutor] Element index ${index} disabled/read-only.`
      );
    if (isNotVisible || effectiveOpacity === 0)
      throw new Error(`[ActionExecutor] Element index ${index} not visible.`);

    // Input simulation functions (remain the same, using global Event constructor)
    const simulateInput = (el: HTMLElement, value: string) => {
      const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
      const proto = Object.getPrototypeOf(inputEl);
      const valueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      el.focus();
      if (valueSetter) {
        valueSetter.call(inputEl, value);
      } else {
        inputEl.value = value;
      }
      ["keydown", "keypress", "input", "keyup", "change"].forEach((type) =>
        el.dispatchEvent(
          new Event(type, { bubbles: true, cancelable: type !== "change" })
        )
      );
      console.log(`[ActionExecutor] Input "${value}" into index: ${index}`);
    };
    const simulateContentEditableInput = (el: HTMLElement, value: string) => {
      el.focus();
      el.textContent = value;
      el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      console.log(
        `[ActionExecutor] Input "${value}" into contentEditable index: ${index}`
      );
    };

    // --- Perform Input ---
    await new Promise<void>((resolve, reject) => {
      contextWindow.requestAnimationFrame(() => {
        // Use rAF
        try {
          // --- Use tag checks again for routing simulation ---
          if (isInputElementTag || isTextAreaElementTag) {
            simulateInput(element, text);
          } else if (isContentEditable) {
            simulateContentEditableInput(element, text);
          }
          // --- End Change ---
          resolve();
        } catch (err: any) {
          console.error(
            `[ActionExecutor] Input error index ${index}:`,
            err.message
          );
          reject(err);
        }
      });
    });
  }

  /** Scrolls the main window (not a specific element). */
  private async handleScroll(
    offset?: number,
    direction?: string
  ): Promise<void> {
    const scrollAmount =
      typeof offset === "number" && offset > 0 ? offset : 200;
    const scrollDirection = direction?.toLowerCase() || "down";
    const scrollOptions: ScrollToOptions = { behavior: "smooth" };
    const targetWindow: Window = window; // Scrolls the main window where content script runs

    switch (scrollDirection) {
      case "up":
        scrollOptions.top = -scrollAmount;
        break;
      case "down":
        scrollOptions.top = scrollAmount;
        break;
      case "left":
        scrollOptions.left = -scrollAmount;
        break;
      case "right":
        scrollOptions.left = scrollAmount;
        break;
      case "top":
        scrollOptions.top = 0;
        scrollOptions.left = 0;
        break; // Scroll to top-left
      case "bottom":
        scrollOptions.top = targetWindow.document.body.scrollHeight;
        break; // Scroll to bottom
      default:
        console.warn(
          `[ActionExecutor] Unknown scroll direction: ${scrollDirection}. Defaulting to 'down'.`
        );
        scrollOptions.top = scrollAmount;
    }

    await new Promise<void>((resolve) => {
      targetWindow.requestAnimationFrame(() => {
        // Use rAF
        if (
          scrollOptions.top !== undefined ||
          scrollOptions.left !== undefined
        ) {
          const isRelativeScroll = ["up", "down", "left", "right"].includes(
            scrollDirection
          );
          if (isRelativeScroll) {
            targetWindow.scrollBy(scrollOptions);
          } else {
            targetWindow.scrollTo(scrollOptions);
          } // Use scrollTo for absolute positions
          console.log(`[ActionExecutor] Scrolled window ${scrollDirection}.`);
        }
        resolve(); // Resolve even if no scroll options were applicable
      });
    });
  }

  /** Submits the form associated with the element specified by index. Prefers clicking a submit button. */
  private async handleSubmitForm(index: number): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index);

    await new Promise<void>((resolve, reject) => {
      contextWindow.requestAnimationFrame(() => {
        // Use rAF
        try {
          let form: HTMLFormElement | null =
            element instanceof HTMLFormElement
              ? element
              : element.closest("form");

          if (!form) {
            console.error(
              "[ActionExecutor] No associated form found to submit for element at index:",
              index
            );
            return reject(new Error("No form found for submit_form action"));
          }

          // Prefer clicking a submit button if possible
          const submitButton = form.querySelector<HTMLElement>(
            'button[type="submit"]:not([disabled]), input[type="submit"]:not([disabled])'
          );

          if (
            submitButton &&
            contextWindow.getComputedStyle(submitButton).display !== "none"
          ) {
            console.log(
              `[ActionExecutor] Clicking submit button within form for index ${index}`
            );
            submitButton.focus();
            submitButton.click(); // Click the button
          } else {
            console.log(
              `[ActionExecutor] No submit button found/usable, submitting form directly index ${index}`
            );
            if (typeof form.requestSubmit === "function") {
              form.requestSubmit(); // Use requestSubmit if available
            } else {
              form.submit(); // Fallback to submit
            }
          }
          resolve(); // Resolve after initiating submit/click
        } catch (err: any) {
          console.error(
            `[ActionExecutor] Submit error index ${index}:`,
            err.message
          );
          reject(err); // Reject promise on error
        }
      });
    });
  }

  /** Extracts text content from the element specified by index. Prioritizes element value. */
  private async handleExtract(index: number): Promise<string> {
    const { element } = this.getElementContext(index); // No contextWindow needed

    let content = "";
    // Use direct tag check for consistency, though instanceof less likely problematic here
    if (
      element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.tagName === "SELECT"
    ) {
      content = (
        element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      ).value;
    } else {
      content = element.innerText || element.textContent || "";
    }

    const trimmedContent = content.trim().replace(/\s+/g, " ");
    console.log(
      `[ActionExecutor] Extracted index ${index}: "${trimmedContent}"`
    );
    return trimmedContent;
  }

  /** Simulates a key press event on the element specified by index. */
  private async handleKeyPress(index: number, key?: string): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index);
    const keyToPress = key || "Enter"; // Default to Enter

    // --- Pre-KeyPress Checks (using tagName) ---
    if (
      element.hasAttribute("disabled") ||
      (element.tagName === "INPUT" && (element as HTMLInputElement).readOnly) ||
      (element.tagName === "TEXTAREA" &&
        (element as HTMLTextAreaElement).readOnly)
    ) {
      throw new Error(
        `[ActionExecutor] Element index ${index} disabled/read-only for key press.`
      );
    }
    const style = contextWindow.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      throw new Error(
        `[ActionExecutor] Element index ${index} not visible for key press.`
      );
    }

    // --- Perform Key Press ---
    await new Promise<void>((resolve, reject) => {
      contextWindow.requestAnimationFrame(() => {
        // Use rAF
        try {
          element.focus(); // Ensure element has focus

          const eventOptions: KeyboardEventInit = {
            key: keyToPress,
            code:
              keyToPress === "Enter"
                ? "Enter"
                : `Key${keyToPress.toUpperCase()}`,
            keyCode: keyToPress === "Enter" ? 13 : keyToPress.charCodeAt(0),
            which: keyToPress === "Enter" ? 13 : keyToPress.charCodeAt(0),
            bubbles: true,
            cancelable: true,
          };

          // Use global KeyboardEvent constructor
          const keyDownEvent = new KeyboardEvent("keydown", eventOptions);
          const keyPressEvent = new KeyboardEvent("keypress", eventOptions); // Note: deprecated
          const keyUpEvent = new KeyboardEvent("keyup", eventOptions);

          let proceed = element.dispatchEvent(keyDownEvent); // Dispatch keydown
          if (proceed) proceed = element.dispatchEvent(keyPressEvent); // Dispatch keypress if not cancelled
          element.dispatchEvent(keyUpEvent); // Always dispatch keyup

          console.log(
            `[ActionExecutor] Dispatched key "${keyToPress}" index: ${index}`
          );

          // Handle implicit form submission on Enter if not prevented
          if (keyToPress === "Enter" && proceed) {
            const form = element.closest("form");
            if (form) {
              // Check if the element itself would typically block Enter submission
              const isTextArea = element.tagName === "TEXTAREA";
              const isButtonInput =
                element.tagName === "INPUT" &&
                ["button", "submit", "reset", "image"].includes(
                  (element as HTMLInputElement).type
                );
              const isExplicitButton = element.tagName === "BUTTON";

              if (!isTextArea && !isButtonInput && !isExplicitButton) {
                // Element is likely an input field where Enter should submit
                console.log(
                  `[ActionExecutor] Attempting implicit Enter submission index ${index}.`
                );
                // Prefer requestSubmit to trigger validation/events
                if (typeof form.requestSubmit === "function") {
                  form.requestSubmit();
                } else {
                  form.submit();
                }
              }
            }
          }

          resolve(); // Resolve after events are dispatched
        } catch (err: any) {
          console.error(
            `[ActionExecutor] KeyPress error index ${index}:`,
            err.message
          );
          reject(err); // Reject promise on error
        }
      });
    });
  }
} // End of class ActionExecutor
