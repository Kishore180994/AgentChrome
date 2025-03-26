// ActionExecutor.ts
import { LocalAction } from "../types/actionType";
import { DOMManager } from "./DOMManager";

function querySelectorWithIframes(
  selector: string,
  doc: Document = document
): { element: Element | null; ownerDocument: Document } {
  const element = doc.querySelector(selector);
  if (element) return { element, ownerDocument: doc };

  const iframes = Array.from(doc.getElementsByTagName("iframe"));
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) continue;
      const result = querySelectorWithIframes(selector, iframeDoc);
      if (result.element) return result;
    } catch (error) {
      console.warn(
        "[querySelectorWithIframes] Could not access iframe:",
        error
      );
    }
  }

  return { element: null, ownerDocument: doc };
}

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
        case "click_element":
          await this.handleClick(data.selector || "", data.index);
          break;
        case "input_text":
          await this.handleInputText(
            data.selector || "",
            data.text || "",
            data.index
          );
          break;
        case "scroll":
          await this.handleScroll(data.offset, data.direction);
          break;
        case "submit_form":
          await this.handleSubmitForm(data.selector || "", data.index);
          break;
        case "extract":
          return await this.handleExtract(data.selector || "", data.index);
        case "key_press":
          await this.handleKeyPress(data.selector || "", data.key, data.index);
          break;
        default:
          throw new Error(`Unknown action type: ${type}`);
      }
    } catch (error) {
      console.error(`[ActionExecutor] Failed to execute "${type}":`, error);
      throw error;
    }
  }

  private async handleClick(selector: string, index?: number): Promise<void> {
    const element = await this.getElement(selector, index);
    element.click();
  }

  private async handleInputText(
    selector: string,
    text: string,
    index?: number
  ): Promise<void> {
    const element = await this.getElement(selector, index);
    const doc = element.ownerDocument;

    if (
      element instanceof doc.defaultView!.HTMLInputElement ||
      element instanceof doc.defaultView!.HTMLTextAreaElement
    ) {
      element.value = text;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (element.isContentEditable) {
      element.focus();
      doc.execCommand("insertText", false, text);
    } else {
      element.textContent = text;
    }
  }

  private async handleScroll(
    offset?: number,
    direction?: string
  ): Promise<void> {
    const scrollOptions: ScrollToOptions = { behavior: "smooth" };
    const scrollAmount = offset || 200;
    switch (direction?.toLowerCase()) {
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
      default:
        throw new Error(`Unknown scroll direction: ${direction}`);
    }
    window.scrollBy(scrollOptions);
  }

  private async handleSubmitForm(
    selector: string,
    index?: number
  ): Promise<void> {
    const element = await this.getElement(selector, index);
    const doc = element.ownerDocument;

    if (element instanceof doc.defaultView!.HTMLFormElement) {
      element.submit();
    } else {
      const form = element.closest("form");
      if (form) {
        form.submit();
      } else {
        throw new Error("No form found for submit_form");
      }
    }
  }

  private async handleExtract(
    selector: string,
    index?: number
  ): Promise<string> {
    const element = await this.getElement(selector, index);
    const content = element.textContent || "";
    console.log(`[ActionExecutor] Extracted content: ${content}`);
    return content;
  }

  private async handleKeyPress(
    selector: string,
    key?: string,
    index?: number
  ): Promise<void> {
    const element = await this.getElement(selector, index);
    const doc = element.ownerDocument;

    element.focus();
    if (
      element instanceof doc.defaultView!.HTMLInputElement ||
      element instanceof doc.defaultView!.HTMLTextAreaElement
    ) {
      element.value += " ";
      element.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }

    const keyToPress = key || "Enter";
    const keyEvent = new KeyboardEvent("keydown", {
      key: keyToPress,
      code: keyToPress === "Enter" ? "Enter" : keyToPress,
      keyCode: keyToPress === "Enter" ? 13 : 0,
      which: keyToPress === "Enter" ? 13 : 0,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(keyEvent);
  }

  private async getElement(
    selector: string,
    index?: number
  ): Promise<HTMLElement> {
    if (!selector && typeof index !== "number") {
      throw new Error("No selector or index provided");
    }

    let finalSelector = selector;
    if (!selector && typeof index === "number") {
      // Only use index if no selector is provided
      const elements = this.domManager.extractPageElements(0);
      const pageElement = elements.find((pe) => pe.index === index);
      if (!pageElement) {
        throw new Error(`Element not found for index: ${index}`);
      }
      finalSelector = `${pageElement.tagName}[data-index="${pageElement.index}"]`;
    }

    console.log(`[ActionExecutor] Using selector: ${finalSelector}`); // Debug log
    const { element, ownerDocument } = querySelectorWithIframes(finalSelector);
    if (!element) {
      throw new Error(`Element not found for selector: ${finalSelector}`);
    }

    if (!(element instanceof ownerDocument.defaultView!.HTMLElement)) {
      throw new Error(`Element is not an HTMLElement: ${finalSelector}`);
    }

    return element;
  }
}
