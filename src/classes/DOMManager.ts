import { PageElement } from "../services/ai/interfaces";
import { LocalAction } from "../types/actionType";

export class DOMManager {
  /**
   * Clears previous debug highlight overlays in the provided Document.
   */
  clearDebugHighlights(doc: Document = document): void {
    doc.querySelectorAll(".debug-highlight").forEach((el) => el.remove());
  }

  /**
   * Generates a CSS selector by walking up to the root.
   */
  getCssSelector(el: Element): string {
    const path: string[] = [];
    let current: Element | null = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling = current.previousElementSibling;
      while (sibling) {
        index++;
        sibling = sibling.previousElementSibling;
      }
      path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index + 1})`);
      current = current.parentElement;
    }
    return path.join(" > ");
  }

  /**
   * Generates an XPath by walking up to the root.
   * Short-circuits if the element has an ID.
   */
  getElementXPath(el: Element): string {
    // If element has an ID, we can short-circuit
    if (el.id) {
      return `//*[@id="${el.id}"]`;
    }

    const segments: string[] = [];
    let current: Element | null = el;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;
      // Count how many siblings of the same nodeName appear before this node
      while (sibling) {
        if (
          sibling.nodeType === Node.ELEMENT_NODE &&
          sibling.nodeName === current.nodeName
        ) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      const nodeName = current.nodeName.toLowerCase();
      segments.unshift(`${nodeName}[${index}]`);
      current = current.parentElement;
    }

    // Combine the segments into a full path
    return "/" + segments.join("/");
  }

  /**
   * Draws a debug highlight overlay on the element.
   */
  drawDebugHighlight(
    element: Element,
    index: number,
    selector: string,
    iframeOffset: { x: number; y: number } = { x: 0, y: 0 }
  ): void {
    const overlay = document.createElement("div");
    overlay.classList.add("debug-highlight");

    const rect = element.getBoundingClientRect();
    overlay.style.position = "absolute";
    overlay.style.border = `2px solid ${this.getRandomColor()}`;
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "999999";
    overlay.style.top = `${rect.top + window.scrollY + iframeOffset.y}px`;
    overlay.style.left = `${rect.left + window.scrollX + iframeOffset.x}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.backgroundColor = "rgba(0, 0, 255, 0.1)";

    // Create a label that shows the [index] and selector
    const label = document.createElement("div");
    label.innerText = `[${index}]`;
    label.style.position = "absolute";
    label.style.top = "0";
    label.style.right = "0";
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

  /**
   * Extracts interactive elements, including those inside iframes.
   */
  extractPageElements(): PageElement[] {
    this.clearDebugHighlights();
    const elements: PageElement[] = [];
    let idx = 1;
    const interactiveRoles = [
      "button",
      "textarea",
      "textbox",
      "listbox",
      "option",
      // "link",
      // "checkbox",
      // "radio",
      // "textbox",
      // "combobox",
      // "option",
      // "searchbox",
      // "switch",
      // "tab",
      // "menuitem",
    ];
    // Recursive function to process a document and its iframes
    const processDocument = (
      doc: Document,
      iframeOffset: { x: number; y: number } = { x: 0, y: 0 }
    ) => {
      const roleSelector = interactiveRoles
        .map((role) => `[role="${role}"]`)
        .join(", ");
      // Select relevant elements: textarea, input, button, a, h1-h6, small
      const querySelector =
        "textarea, input, button, a, h1, h2, h3, h4, h5, h6, small, canvas, " +
        roleSelector;
      doc.querySelectorAll(querySelector).forEach((el) => {
        // Build CSS selector
        let cssSelector = "";
        if (el.id) {
          cssSelector = `#${CSS.escape(el.id)}`;
        } else {
          cssSelector = this.getCssSelector(el);
        }

        // Build XPath
        const xPath = this.getElementXPath(el);

        // Get meaningful text snippet
        const textSnippet = this.getMeaningfulText(el);

        // Compute bounding box
        const rect = el.getBoundingClientRect();
        const boundingBox = {
          x: rect.left + window.scrollX + iframeOffset.x,
          y: rect.top + window.scrollY + iframeOffset.y,
          width: rect.width,
          height: rect.height,
        };

        // Add the element to the results array
        elements.push({
          index: idx++,
          tagName: el.tagName.toLowerCase(),
          selector: cssSelector, // old 'selector'
          text: textSnippet.slice(0, 100),
          fullText: "",
          attributes: this.getElementAttributes(el),
          role: el.getAttribute("role") || undefined,
          accessibleLabel:
            el.getAttribute("aria-label") ||
            el.getAttribute("alt") ||
            undefined,
          boundingBox,
          // We can store xPath in a new field
          xPath: xPath,
        });

        // Draw debug highlight
        this.drawDebugHighlight(el, idx, cssSelector, iframeOffset);
      });

      // Process nested iframes
      doc.querySelectorAll("iframe").forEach((iframe) => {
        try {
          if (iframe.tagName !== "IFRAME") return;

          const iframeDoc = iframe.contentDocument;
          if (!iframeDoc) {
            return;
          }

          // Calculate iframe offset relative to the main document
          const iframeRect = iframe.getBoundingClientRect();
          const iframeOffsetAdjusted = {
            x: iframeRect.left + window.scrollX,
            y: iframeRect.top + window.scrollY,
          };

          // Recursively process the iframe's document
          processDocument(iframeDoc, iframeOffsetAdjusted);
        } catch (e) {
          // Handle iframe access error
        }
      });
    };

    // Start processing the main document
    processDocument(document);

    return elements;
  }

  /**
   * Executes a LocalAction on the DOM.
   * Now supports both CSS selectors and XPath.
   */
  executeAction(action: LocalAction): void {
    try {
      // We can store the user’s desired locator in either `action.data.selector` (CSS) or `action.data.xPath`
      const cssSelector = action.data.selector || "";
      const xPath = action.data.xPath || "";

      let element: HTMLElement | null = null;

      // 1) If xPath is specified, try that first
      if (xPath) {
        element = this.queryByXPath(xPath);
      }
      // 2) If no xPath or not found by xPath, fall back to CSS
      if (!element && cssSelector) {
        element = document.querySelector(cssSelector) as HTMLElement | null;
      }

      // If element not found, attempt a scroll + retry
      if (!element && (xPath || cssSelector)) {
        window.scrollTo(0, document.body.scrollHeight);
        setTimeout(() => {
          let delayedElement: HTMLElement | null = null;

          if (xPath) {
            delayedElement = this.queryByXPath(xPath);
          }
          if (!delayedElement && cssSelector) {
            delayedElement = document.querySelector(cssSelector) as HTMLElement;
          }

          if (!delayedElement) {
            throw new Error(
              `Element not found for xPath: "${xPath}" or selector: "${cssSelector}"`
            );
          }
          this.performLocalDOMAction(delayedElement, action);
        }, 1000);
      } else if (element) {
        this.performLocalDOMAction(element, action);
      } else {
        // No selector or xPath, or not needed for the action
        this.performLocalDOMAction(null, action);
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Performs a LocalAction on a specific DOM element.
   */
  private performLocalDOMAction(
    target: HTMLElement | null,
    action: LocalAction
  ): void {
    switch (action.type) {
      case "click":
      case "click_element":
        target?.click();
        break;

      case "input_text":
        if (!target) {
          throw new Error("No element for input_text");
        }
        const text = action.data.text || "";

        // Check if the target element is a canvas
        if (target.tagName.toUpperCase() === "CANVAS") {
          this.simulatePaste(target, text);
        } else {
          (target as HTMLInputElement).value = text;
          target.dispatchEvent(new Event("input", { bubbles: true }));
        }
        break;

      case "scroll":
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          // No target element, scroll by offset
          window.scrollBy({
            top: action.data.offset || 200,
            behavior: "smooth",
          });
        }
        break;

      case "select":
        if (!target) {
          throw new Error("No element for select");
        }
        (target as HTMLSelectElement).value = action.data.value || "";
        target.dispatchEvent(new Event("change", { bubbles: true }));
        break;

      case "hover":
        if (!target) {
          throw new Error("No element for hover");
        }
        target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        break;

      case "double_click":
      case "right_click":
        if (!target) {
          throw new Error("No element for right/double click");
        }
        const eventType =
          action.type === "double_click" ? "dblclick" : "contextmenu";
        target.dispatchEvent(new MouseEvent(eventType, { bubbles: true }));
        break;

      case "submit_form":
        if (!target) {
          throw new Error("No element for submit_form");
        }
        if (target instanceof HTMLFormElement) {
          target.submit();
        } else {
          const formEl = target.closest("form");
          if (formEl) formEl.submit();
          else throw new Error("submit_form: no form found");
        }
        break;

      case "key_press":
        {
          const key = action.data.key || "Enter";
          const keyEvent = new KeyboardEvent("keydown", { key, bubbles: true });
          (target || window.document).dispatchEvent(keyEvent);
        }
        break;

      case "extract_content":
        // Placeholder for advanced content extraction logic
        break;

      case "done":
        // No-op
        break;

      default:
        throw new Error(`Unknown action: ${action.type}`);
    }
  }

  /**
   * Query the DOM by an XPath string.
   */
  private queryByXPath(xPath: string): HTMLElement | null {
    const result = document.evaluate(
      xPath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue as HTMLElement | null;
  }

  /**
   * Simulates a paste event on the target element.
   */
  private async simulatePaste(
    target: HTMLElement,
    text: string
  ): Promise<void> {
    target.focus();
    await navigator.clipboard.writeText(text);

    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });

    pasteEvent.clipboardData?.setData("text/plain", text);
    target.dispatchEvent(pasteEvent);
  }

  /**
   * Gets meaningful text from an element.
   */
  private getMeaningfulText(el: Element): string {
    return el.textContent ? el.textContent.trim() : "";
  }

  /**
   * Gets whitelisted attributes from an element, including classnames.
   */
  private getElementAttributes(el: Element): Record<string, string> {
    const attributes: Record<string, string> = {};
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
      "class", // Include classnames
    ];

    Array.from(el.attributes).forEach((attr) => {
      if (attributeWhitelist.includes(attr.name)) {
        attributes[attr.name] = attr.value;
      }
    });

    return attributes;
  }

  /**
   * Generates a random color for debug highlights.
   */
  private getRandomColor(): string {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }
}
