import {
  UncompressedPageElement,
  ChildElement,
} from "../services/ai/interfaces";
import { LocalAction } from "../types/actionType";

export class ActionExecutor {
  private uncompressedElements: UncompressedPageElement[] = [];

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
          await this.handleClick(data.index, data.childId);
          break;
        case "input_text":
          await this.handleInputText(data.index, data.text || "", data.childId);
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
          await this.handleKeyPress(data.index, data.key, data.childId);
          break;
        default:
          throw new Error(`Unknown action type: ${type}`);
      }
    } catch (error) {
      console.error(`[ActionExecutor] Failed to execute \"${type}\":`, error);
      throw error;
    }
  }

  private getElementContext(
    index?: number,
    childId?: number
  ): {
    element: HTMLElement;
    contextWindow: Window;
  } {
    if (typeof index !== "number")
      throw new Error(`[ActionExecutor] Invalid index: ${index}`);

    const container = this.uncompressedElements.find((e) => e.index === index);
    if (!container)
      throw new Error(`[ActionExecutor] Element not found for index: ${index}`);

    let element: HTMLElement = container.element;

    if (typeof childId === "number") {
      const child = container.childElements.find((c) => c[4] === childId);
      if (!child)
        throw new Error(
          `[ActionExecutor] Child element not found for index: ${index}, childId: ${childId}`
        );
      const allChildren = element.querySelectorAll(
        "a, button, input, textarea, select, div[role='button']"
      );
      const target = Array.from(allChildren).find(
        (el) => el.getAttribute("data-d4m-child-id") === String(childId)
      );
      if (!target || !(target instanceof HTMLElement)) {
        throw new Error(
          `[ActionExecutor] Failed to match DOM element for childId ${childId}`
        );
      }
      element = target;
    }

    const contextWindow = element.ownerDocument?.defaultView;
    if (!contextWindow)
      throw new Error(
        `[ActionExecutor] No context window found for index: ${index}`
      );

    return { element, contextWindow };
  }

  private async handleClick(index?: number, childId?: number): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index, childId);
    await new Promise<void>((resolve) => {
      contextWindow.requestAnimationFrame(() => {
        element.click();
        resolve();
      });
    });
  }

  private async handleInputText(
    index: number | undefined,
    text: string,
    childId?: number
  ): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index, childId);

    function reactSetInputValue(
      input: HTMLInputElement | HTMLTextAreaElement,
      value: string
    ) {
      const prototype = Object.getPrototypeOf(input);
      const valueSetter = Object.getOwnPropertyDescriptor(
        prototype,
        "value"
      )?.set;
      valueSetter?.call(input, value);
      const inputEvent = new Event("input", {
        bubbles: true,
        cancelable: false,
      });
      input.dispatchEvent(inputEvent);
    }

    await new Promise<void>((resolve) => {
      contextWindow.requestAnimationFrame(() => {
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        ) {
          element.focus();
          reactSetInputValue(element, text);
        } else if (element.isContentEditable) {
          element.focus();
          element.textContent = text;
          element.dispatchEvent(
            new Event("input", { bubbles: true, cancelable: false })
          );
        } else {
          element.textContent = text;
        }
        resolve();
      });
    });
  }

  private async handleScroll(offset = 200, direction = "down"): Promise<void> {
    const scrollOptions: ScrollToOptions = { behavior: "smooth" };
    switch (direction.toLowerCase()) {
      case "up":
        scrollOptions.top = -offset;
        break;
      case "down":
        scrollOptions.top = offset;
        break;
      case "left":
        scrollOptions.left = -offset;
        break;
      case "right":
        scrollOptions.left = offset;
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
    key?: string,
    childId?: number
  ): Promise<void> {
    const { element, contextWindow } = this.getElementContext(index, childId);
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
