import { LocalAction } from "../types/actionType";
import { UncompressedPageElement } from "./DOMManager";

export class ActionExecutor {
  private uncompressedElements: UncompressedPageElement[];

  constructor() {
    this.uncompressedElements = [];
  }

  setElements(elements: UncompressedPageElement[]): void {
    this.uncompressedElements = elements;
    console.log(
      "[ActionExecutor] Set elements:",
      this.uncompressedElements.length
    );
  }

  async execute(action: LocalAction): Promise<any> {
    console.log(
      `[ActionExecutor] Executing action: ${action.type}`,
      action.data
    );
    const { type, data } = action;
    try {
      switch (type) {
        case "click":
          await this.handleClick(data.index);
          break;
        case "input_text":
          await this.handleInputText(data.index, data.text || "");
          break;
        case "scroll":
          await this.handleScroll(data.offset, data.direction);
          break;
        case "submit_form":
          await this.handleSubmitForm(data.index);
          break;
        case "extract":
          return await this.handleExtract(data.index);
        case "key_press":
          await this.handleKeyPress(data.index, data.key);
          break;
        default:
          throw new Error(`Unknown action type: ${type}`);
      }
    } catch (error) {
      console.error(`[ActionExecutor] Failed to execute "${type}":`, error);
      throw error;
    }
  }

  private getElementContext(index: number | undefined): {
    element: HTMLElement;
    contextWindow: Window;
  } {
    if (typeof index !== "number") {
      throw new Error(`[ActionExecutor] Invalid index: ${index}`);
    }

    const targetElementData = this.uncompressedElements.find(
      (e) => e.index === index
    );
    if (!targetElementData) {
      throw new Error(`[ActionExecutor] Element not found for index: ${index}`);
    }

    const element = targetElementData.element;
    if (!element) {
      throw new Error(
        `[ActionExecutor] Element reference missing for index: ${index}`
      );
    }

    // Determine the context window (top-level or iframe)
    let contextWindow: Window | null = null;
    let currentElement: HTMLElement | null = element;
    while (currentElement && !contextWindow) {
      const ownerDocument = currentElement.ownerDocument;
      contextWindow = ownerDocument.defaultView;
      currentElement = ownerDocument.defaultView
        ?.frameElement as HTMLElement | null;
    }

    if (!contextWindow) {
      throw new Error(
        `[ActionExecutor] No context window for element at index ${index}`
      );
    }

    console.log(`[ActionExecutor] Found element ${index} in context`);
    return { element, contextWindow };
  }

  private async handleClick(index: number | undefined): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index);
    await new Promise<void>((resolve) => {
      contextWindow.requestAnimationFrame(() => {
        element.click();
        resolve();
      });
    });
  }

  private async handleInputText(
    index: number | undefined,
    text: string
  ): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index);
    const doc = contextWindow.document;

    await new Promise<void>((resolve) => {
      contextWindow.requestAnimationFrame(() => {
        console.log("Element type:", element.constructor.name, "Text:", text); // Debug element type
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        ) {
          element.focus();
          element.value = text; // Set property
          element.setAttribute("value", text); // Set attribute
          console.log("Value property after set:", element.value); // Debug property
          console.log(
            "Value attribute after set:",
            element.getAttribute("value")
          ); // Debug attribute

          const inputEvent = new InputEvent("input", {
            bubbles: true,
            cancelable: true,
            data: text,
          });
          element.dispatchEvent(inputEvent);

          const changeEvent = new Event("change", {
            bubbles: true,
            cancelable: true,
          });
          element.dispatchEvent(changeEvent);
        } else if (element.isContentEditable) {
          element.focus();
          doc.execCommand("insertText", false, text);
        } else {
          element.textContent = text;
        }
        resolve();
      });
    });
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
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.scrollBy(scrollOptions);
        resolve();
      });
    });
  }

  private async handleSubmitForm(index: number | undefined): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index);
    await new Promise<void>((resolve) => {
      contextWindow.requestAnimationFrame(() => {
        if (element instanceof HTMLFormElement) {
          element.submit();
        } else {
          const form = element.closest("form");
          if (form) form.submit();
          else
            throw new Error("[ActionExecutor] No form found for submit_form");
        }
        resolve();
      });
    });
  }

  private async handleExtract(index: number | undefined): Promise<string> {
    const { element } = this.getElementContext(index);
    const content = element.textContent || "";
    console.log(`[ActionExecutor] Extracted content: ${content}`);
    return content;
  }

  private async handleKeyPress(
    index: number | undefined,
    key?: string
  ): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index);
    await new Promise<void>((resolve) => {
      contextWindow.requestAnimationFrame(() => {
        element.focus();
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
        resolve();
      });
    });
  }
}
