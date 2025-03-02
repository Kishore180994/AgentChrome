import { LocalAction } from "../types/actionType";
import { querySelectorWithIframes } from "../utils/executionManager";
import { DOMManager } from "./DOMManager";

export class ActionExecutor {
  private domManager: DOMManager;

  constructor(domManager: DOMManager) {
    this.domManager = domManager;
  }

  async execute(action: LocalAction): Promise<any> {
    const { type, data } = action;
    try {
      switch (type) {
        case "click":
          await this.handleClick(data.selector);
          break;
        case "input_text":
          if (typeof data.selector === "string") {
            await this.handleInputText(data.selector, data.text || "");
          } else {
            throw new Error(`Selector is not a string: ${data.selector}`);
          }
          break;
        case "scroll":
          await this.handleScroll(data.offset, data.direction);
          break;
        case "hover":
          await this.handleHover(data.selector);
          break;
        case "submit_form":
          await this.handleSubmitForm(data.selector);
          break;
        case "extract":
          const extractedData = await this.handleExtract(data.selector);
          console.log(
            `[ActionExecutor.ts] Extracted content: ${extractedData}`
          );
          return extractedData;
        case "key_press":
          await this.handleKeyPress(data.selector, data.key);
          break;
        default:
          throw new Error(`Unknown action type: ${type}`);
      }
    } catch (error: any) {
      console.error(
        `[ActionExecutor] Failed to execute action "${type}":`,
        error.message
      );
      throw error; // Re-throw the error for upstream handling
    }
  }

  /**
   * Handles click actions on elements, including those inside iframes.
   */
  private async handleClick(selector?: string): Promise<void> {
    const result = selector
      ? querySelectorWithIframes(selector)
      : { element: null, ownerDocument: null };
    const { element, ownerDocument } = result || {
      element: null,
      ownerDocument: null,
    };
    if (!element) {
      throw new Error(`Element not found for selector: ${selector}`);
    }
    // Ensure the element is treated as an HTMLElement in its own context
    if (!(element instanceof ownerDocument!.defaultView!.HTMLElement)) {
      throw new Error(`Element is not an HTMLElement: ${selector}`);
    }
    element.click();
  }

  /**
   * Handles input text actions on elements, including those inside iframes.
   */
  private async handleInputText(selector: string, text: string): Promise<void> {
    const { element, ownerDocument } = querySelectorWithIframes(selector);
    if (!element) {
      throw new Error(`Element not found for selector: ${selector}`);
    }

    // Handle standard input or textarea
    if (
      element instanceof ownerDocument!.defaultView!.HTMLInputElement ||
      element instanceof ownerDocument!.defaultView!.HTMLTextAreaElement
    ) {
      element.value = text;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    // Handle Gmail and other `contentEditable` elements
    if (
      (element as HTMLElement).isContentEditable ||
      element instanceof HTMLCanvasElement
    ) {
      ((element as HTMLElement) || (element as HTMLCanvasElement)).focus();
      document.execCommand("insertText", false, text);
      return;
    }

    // Fallback: Set innerText for unexpected cases
    ((element as HTMLElement) || (element as HTMLCanvasElement)).innerText =
      text;
  }

  /**
   * Handles scroll actions.
   */
  private async handleScroll(
    offset?: number,
    direction?: string
  ): Promise<void> {
    const scrollOptions: ScrollToOptions = {
      behavior: "smooth",
    };

    switch (direction) {
      case "up":
        scrollOptions.top = -(offset || 200);
        break;
      case "down":
        scrollOptions.top = offset || 200;
        break;
      case "left":
        scrollOptions.left = -(offset || 200);
        break;
      case "right":
        scrollOptions.left = offset || 200;
        break;
      default:
        throw new Error(`Unknown scroll direction: ${direction}`);
    }

    window.scrollBy(scrollOptions);
  }

  /**
   * Handles hover actions on elements, including those inside iframes.
   */
  private async handleHover(selector?: string): Promise<void> {
    const { element, ownerDocument } = selector
      ? querySelectorWithIframes(selector)
      : { element: null, ownerDocument: null };
    if (!element) {
      throw new Error(`Element not found for selector: ${selector}`);
    }
    // Ensure the element is treated as an HTMLElement in its own context
    if (!(element instanceof ownerDocument!.defaultView!.HTMLElement)) {
      throw new Error(`Element is not an HTMLElement: ${selector}`);
    }
    element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  }

  /**
   * Handles form submission actions on elements, including those inside iframes.
   */
  private async handleSubmitForm(selector?: string): Promise<void> {
    const { element, ownerDocument } = selector
      ? querySelectorWithIframes(selector)
      : { element: null, ownerDocument: null };
    if (!element) {
      throw new Error(`Element not found for selector: ${selector}`);
    }
    // Ensure the element is treated as an HTMLElement in its own context
    if (!(element instanceof ownerDocument!.defaultView!.HTMLElement)) {
      throw new Error(`Element is not an HTMLElement: ${selector}`);
    }
    if (element instanceof ownerDocument!.defaultView!.HTMLFormElement) {
      element.submit();
    } else {
      const formEl = element.closest("form");
      if (formEl) {
        formEl.submit();
      } else {
        throw new Error("submit_form: no form found");
      }
    }
  }

  /**
   * Handles extract actions on elements, including those inside iframes.
   */
  private async handleExtract(selector?: string): Promise<string> {
    const { element, ownerDocument } = selector
      ? querySelectorWithIframes(selector)
      : { element: null, ownerDocument: null };
    if (!element) {
      throw new Error(`Element not found for selector: ${selector}`);
    }
    // Ensure the element is treated as an HTMLElement in its own context
    if (!(element instanceof ownerDocument!.defaultView!.HTMLElement)) {
      throw new Error(`Element is not an HTMLElement: ${selector}`);
    }
    // Extract content from the element
    const content = element.textContent || "";
    console.log(`[ActionExecutor] Extracted content: ${content}`);
    return content;
  }

  /**
   * Handles key press actions on elements, including those inside iframes.
   */
  private async handleKeyPress(selector?: string, key?: string): Promise<void> {
    const { element, ownerDocument } = selector
      ? querySelectorWithIframes(selector)
      : { element: null, ownerDocument: null };
    if (!element) {
      throw new Error(`Element not found for selector: ${selector}`);
    }
    // Ensure the element is treated as an HTMLElement in its own context
    if (!(element instanceof ownerDocument!.defaultView!.HTMLElement)) {
      throw new Error(`Element is not an HTMLElement: ${selector}`);
    }
    const keyEvent = new KeyboardEvent("keydown", {
      key: key || "Enter",
      bubbles: true,
    });
    element.dispatchEvent(keyEvent);
  }
}
