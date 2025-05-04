// TODO: DON'T IMPORT ACTION TYPES IN THIS FILE. KEEP THE HARD-CODED STRINGS. FIX THIS IMPORT ISSUE LATER.
import {
  ClickElementArgs,
  ExtractContentArgs,
  GeminiFunctionCall,
  GotoExistingTabArgs,
  InputTextArgs,
  KeyPressArgs,
  ScrollArgs,
  SelectDropdownArgs,
  SelectMultiDropdownArgs,
  SelectRadioButtonArgs,
  SubmitFormArgs,
} from "../services/ai/interfaces";
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
   * Executes a given function call on the DOM.
   * @param functionCall The function call to execute.
   * @returns The result of the action if applicable (e.g., extracted text), otherwise void.
   */
  async execute(functionCall: GeminiFunctionCall): Promise<any> {
    console.log(
      `[ActionExecutor] Attempting action: ${functionCall.name}`,
      functionCall.args
    );
    let { name, args } = functionCall;
    console.log(`[ActionExecutor] Action name: ${name}`);
    console.log(`[ActionExecutor] Action args:`, args);
    // Validate input for actions that require an index
    const requiresIndex = [
      "dom_clickElement",
      "dom_inputText",
      "dom_submitForm",
      "dom_extractContent",
      "dom_keyPress",
      "dom_selectRadioButton",
      "dom_selectDropdown",
      "dom_selectMultiDropdown",
    ].includes(name);

    if (requiresIndex && typeof (args as any).index !== "number") {
      const errorMsg = `[ActionExecutor] Action type "${name}" requires a valid numeric 'index' in args, received: ${
        (args as any).index
      }`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    if (
      name === "dom_inputText" &&
      typeof (args as InputTextArgs).text !== "string"
    ) {
      console.warn(
        `[ActionExecutor] dom_inputText received non-string text:`,
        (args as InputTextArgs).text,
        `- Using empty string.`
      );
    }

    try {
      let result: any = undefined;

      // List of Google Workspace actions
      const googleWorkspaceActions = [
        "google_workspace_createNewGoogleDoc",
        "google_workspace_insertStructuredDocContent",
        "google_workspace_updateDocText",
        "google_workspace_appendDocText",
        "google_workspace_deleteDocText",
        "google_workspace_getDocContent",
        "google_workspace_getDocFileName",
        "google_workspace_createNewGoogleSheet",
        "google_workspace_appendSheetRow",
        "google_workspace_updateSheetCell",
        "google_workspace_getSheetData",
        "google_workspace_deleteSheetRow",
      ];

      // List of actions handled directly in background.ts
      const backgroundHandledActions = [
        "dom_verify",
        "dom_done",
        "dom_ask",
        "dom_reportCurrentState",
        ...googleWorkspaceActions,
      ];

      if (backgroundHandledActions.includes(name)) {
        // Log that this action is handled by background, do nothing here
        console.log(
          `[ActionExecutor] Action '${name}' is handled by background.ts. Skipping in content script.`
        );
        return; // Return early
      } else {
        // Handle actions meant for the content script (DOM interactions)
        switch (name) {
          case "dom_openTab":
            console.log("[ActionExecutor] Handling openTab action.");
            // Assuming a messaging system to the background script exists
            chrome.runtime.sendMessage({
              action: "dom_openTab",
              url: (args as GotoExistingTabArgs).url,
            });
            break;
          case "dom_goToExistingTab":
            args = args as { url: string };
            console.log(
              `[ActionExecutor] Handling goToUrl action for URL: ${args.url}`
            );
            // Assuming a messaging system to the background script exists
            chrome.runtime.sendMessage({
              action: "dom_goToExistingTab",
              url: args.url,
            });
            break;
          case "dom_clickElement":
            args = args as ClickElementArgs;
            await this.handleClick(args.index as number);
            break;
          case "dom_inputText":
            args = args as InputTextArgs;
            await this.handleInputText(
              (args as InputTextArgs).text ?? "",
              args.index as number
            );
            break;
          case "dom_scroll":
            args = args as ScrollArgs;
            await this.handleScroll(args.offset, args.direction);
            break;
          case "dom_submitForm":
            args = args as SubmitFormArgs;
            await this.handleSubmitForm(args.index as number);
            break;
          case "dom_extractContent":
            args = args as ExtractContentArgs;
            result = await this.handleExtract(args.index as number);
            break;
          case "dom_keyPress":
            args = args as KeyPressArgs;
            await this.handleKeyPress(
              args.index as number,
              (args as KeyPressArgs).key
            );
            break;
          case "dom_wait":
            const waitDuration =
              typeof (args as any).duration === "number"
                ? (args as any).duration
                : 1000;
            console.log(`[ActionExecutor] Waiting ${waitDuration}ms`);
            await new Promise((resolve) => setTimeout(resolve, waitDuration));
            break;
          case "dom_selectRadioButton":
            {
              const { index, value, selector } = args as SelectRadioButtonArgs;
              await this.domManager.selectRadioButton(index, value, selector);
            }
            break;
          case "dom_selectDropdown":
            {
              // args: SelectDropdownArgs
              const { index, value, selector } = args as SelectDropdownArgs;
              await this.domManager.selectDropdown(index, value, selector);
            }
            break;
          case "dom_selectMultiDropdown":
            {
              const { index, values, selector } =
                args as SelectMultiDropdownArgs;
              await this.domManager.selectMultiDropdown(
                index,
                values,
                selector
              );
            }
            break;
          default:
            console.warn(
              `[ActionExecutor] Received unknown or unhandled action type: ${name}`
            );
        }
      }
      console.log(`[ActionExecutor] Successfully executed action: ${name}`);
      return result;
    } catch (error: any) {
      // Ensure the error is properly logged and re-thrown to reject the promise
      const errorMessage = `[ActionExecutor] Failed action "${name}" on index "${
        (args as any).index ?? "N/A" // Handle cases where index might not be present in args
      }": ${error.message}`;
      console.error(errorMessage, error.stack);
      // Re-throw the original error object to preserve stack trace if possible
      throw error instanceof Error ? error : new Error(errorMessage);
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

    const ownerDoc = element.ownerDocument;
    if (!ownerDoc) {
      // This case is less likely if isConnected passed, but good to check
      throw new Error(
        `[ActionExecutor] Element at index ${index} has no ownerDocument.`
      );
    }

    const contextWindow = ownerDoc.defaultView;
    if (!contextWindow) {
      throw new Error(
        `[ActionExecutor] Could not determine context window (ownerDocument.defaultView) for element at index: ${index}. This might happen in detached iframes.`
      );
    }

    // Add a log to confirm context was found
    console.log(
      `[ActionExecutor getElementContext] Context window found for index ${index}:`,
      contextWindow.location.href
    );

    return { element, contextWindow };
  }

  // ========================================================================
  // Action Handler Implementations
  // ========================================================================

  /** Clicks the element specified by index. */
  private async handleClick(index: number): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index);

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
    }

    await new Promise<void>((resolve, reject) => {
      contextWindow.requestAnimationFrame(() => {
        // Use rAF for better timing
        try {
          console.log(
            `[ActionExecutor handleClick] Attempting focus on index: ${index}`
          );
          element.focus(); // Focusing first can improve reliability
          console.log(
            `[ActionExecutor handleClick] Focused index: ${index}. Attempting click.`
          );
          element.click(); // Trigger the click
          console.log(
            `[ActionExecutor handleClick] Click dispatched for index: ${index}`
          );
          resolve();
        } catch (err: any) {
          console.error(
            `[ActionExecutor] Click error index ${index}:`,
            err.message
          );
          reject(err);
        }
      });
    });
  }

  /** Inputs text into the element specified by index. Handles input, textarea, and contentEditable. */
  private async handleInputText(text: string, index: number): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index);
    console.log(
      `[ActionExecutor handleInputText] Element:`,
      element,
      contextWindow
    );
    // --- Use tagName checks instead of instanceof ---
    const tagNameLower = element.tagName.toLowerCase();
    const isInputElementTag = tagNameLower === "input";
    const isTextAreaElementTag = tagNameLower === "textarea";
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
          console.log(
            `[ActionExecutor handleInputText] Simulating input for index: ${index}`
          );
          // --- Use tag checks again for routing simulation ---
          if (isInputElementTag || isTextAreaElementTag) {
            simulateInput(element, text);
          } else if (isContentEditable) {
            simulateContentEditableInput(element, text);
          }
          console.log(
            `[ActionExecutor handleInputText] Input simulation complete for index: ${index}`
          );
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
    const targetWindow: Window = window;

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
        break;
      case "bottom":
        scrollOptions.top = targetWindow.document.body.scrollHeight;
        break;
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
          }
          console.log(`[ActionExecutor] Scrolled window ${scrollDirection}.`);
        }
        resolve();
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
            submitButton.click();
          } else {
            console.log(
              `[ActionExecutor] No submit button found/usable, submitting form directly index ${index}`
            );
            if (typeof form.requestSubmit === "function") {
              form.requestSubmit();
            } else {
              form.submit();
            }
          }
          resolve();
        } catch (err: any) {
          console.error(
            `[ActionExecutor] Submit error index ${index}:`,
            err.message
          );
          reject(err);
        }
      });
    });
  }

  /** Extracts text content from the element specified by index. Prioritizes element value. */
  private async handleExtract(index: number): Promise<string> {
    const { element } = this.getElementContext(index);

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
    const keyToPress = key || "Enter";

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
          const keyPressEvent = new KeyboardEvent("keypress", eventOptions);
          const keyUpEvent = new KeyboardEvent("keyup", eventOptions);

          let proceed = element.dispatchEvent(keyDownEvent);
          if (proceed) proceed = element.dispatchEvent(keyPressEvent);
          element.dispatchEvent(keyUpEvent);

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

          resolve();
        } catch (err: any) {
          console.error(
            `[ActionExecutor] KeyPress error index ${index}:`,
            err.message
          );
          reject(err);
        }
      });
    });
  }
}
