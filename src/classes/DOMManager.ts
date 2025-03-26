import { PageElement } from "../services/ai/interfaces"; // Adjust path as needed

export class DOMManager {
  private elementCache: Map<number, PageElement[]> = new Map();

  constructor() {}

  /** Clears all debug highlights from the document. */
  clearDebugHighlights(doc: Document = document): void {
    doc.querySelectorAll(".debug-highlight").forEach((el) => el.remove());
  }

  /**
   * Generates a concise XPath for an element.
   * Uses `id` if available, otherwise builds a minimal path.
   */
  getElementXPath(el: Element): string {
    if (el.id) return `//*[@id="${el.id}"]`;
    const segments: string[] = [];
    let current: Element | null = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const index =
        Array.from(current.parentElement?.children || [])
          .filter((child) => child.tagName === current?.tagName)
          .indexOf(current) + 1;
      segments.unshift(`${current.tagName.toLowerCase()}[${index}]`);
      current = current.parentElement;
    }
    return "/" + segments.join("/");
  }

  /**
   * Extracts elements from the page that are currently in the viewport for AI web automation.
   */
  extractPageElements(tabId: number): PageElement[] {
    const elements: PageElement[] = [];
    let idx = 0;

    const processDocument = (
      doc: Document,
      iframeOffset: { x: number; y: number } = { x: 0, y: 0 },
      framePath: number[] = [],
      depth: number = 0
    ) => {
      if (depth > 10) return; // Prevent infinite recursion

      // Process all elements
      doc.querySelectorAll("*").forEach((el) => {
        if (this.isElementImportant(el)) {
          const rect = el.getBoundingClientRect();
          const isInViewport =
            rect.left + iframeOffset.x >= 0 &&
            rect.top + iframeOffset.y >= 0 &&
            rect.left + iframeOffset.x + rect.width <= window.innerWidth &&
            rect.top + iframeOffset.y + rect.height <= window.innerHeight;

          if (!isInViewport || rect.width === 0 || rect.height === 0) return;

          const attributes = this.getRelevantAttributes(el);

          elements.push({
            index: idx++,
            tagName: el.tagName.toLowerCase(),
            text: this.getMeaningfulText(el).slice(0, 50), // Reduced to 50 chars for token efficiency
            attributes,
            frame: [...framePath],
          });
        }
      });

      // Process iframes
      doc.querySelectorAll("iframe").forEach((iframe) => {
        const iframeRect = iframe.getBoundingClientRect();
        const isIframeInViewport =
          iframeRect.left + iframeOffset.x >= 0 &&
          iframeRect.top + iframeOffset.y >= 0 &&
          iframeRect.left + iframeOffset.x + iframeRect.width <=
            window.innerWidth &&
          iframeRect.top + iframeOffset.y + iframeRect.height <=
            window.innerHeight;

        if (iframeRect.width === 0 || iframeRect.height === 0) return;

        const iframeIndex = idx++;
        const iframeAttributes = this.getRelevantAttributes(iframe);

        if (isIframeInViewport) {
          elements.push({
            index: iframeIndex,
            tagName: "iframe",
            text: "",
            attributes: iframeAttributes,
            frame: [...framePath],
          });
        }

        try {
          const iframeDoc = iframe.contentDocument;
          if (!iframeDoc) return;

          const newFramePath = [...framePath, iframeIndex];
          const newIframeOffset = {
            x: iframeRect.left + window.scrollX + iframeOffset.x,
            y: iframeRect.top + window.scrollY + iframeOffset.y,
          };
          processDocument(iframeDoc, newIframeOffset, newFramePath, depth + 1);
        } catch (e) {
          console.warn("Failed to process iframe:", e);
        }
      });
    };

    processDocument(document);
    this.elementCache.set(tabId, elements);
    return elements;
  }

  /**
   * Determines if an element is important for AI web automation.
   */
  private isElementImportant(el: Element): boolean {
    const tagName = el.tagName.toLowerCase();
    const textContent = el.textContent?.trim() || "";
    const isVisible =
      window.getComputedStyle(el).display !== "none" &&
      window.getComputedStyle(el).visibility !== "hidden";
    const role = el.getAttribute("role")?.toLowerCase();

    if (!isVisible) return false;

    // Interactive elements
    if (["button", "input", "a", "textarea", "select"].includes(tagName)) {
      return true;
    }

    // Contextual elements with text
    if (["h1", "h2", "h3", "h4", "h5", "h6", "label"].includes(tagName)) {
      return textContent.length > 0;
    }

    // Forms and fieldsets with content
    if (tagName === "form" || tagName === "fieldset") {
      return el.children.length > 0 || textContent.length > 0;
    }

    // Divs and spans with interactive roles or editability
    if (tagName === "div" || tagName === "span") {
      const isEditable =
        el.getAttribute("contenteditable") === "true" ||
        (el.parentElement && el.parentElement.isContentEditable);
      const hasInteractiveRole = [
        "button",
        "link",
        "checkbox",
        "radio",
        "switch",
      ].includes(role ?? "");
      return isEditable || hasInteractiveRole;
    }

    return false;
  }

  /**
   * Extracts only relevant attributes for AI automation.
   */
  private getRelevantAttributes(el: Element): Record<string, string> {
    const relevantAttrs = [
      "id",
      "class",
      "href",
      "type",
      "value",
      "role",
      "aria-label",
      "data-test-id",
    ];
    const attributes: Record<string, string> = {};
    const tagName = el.tagName.toLowerCase();

    relevantAttrs.forEach((attr) => {
      const value = el.getAttribute(attr);
      if (value !== null) {
        attributes[attr] = value;
      }
    });

    // Add current value for inputs, textareas, and selects
    if (tagName === "input" || tagName === "textarea") {
      attributes["value"] = (
        el as HTMLInputElement | HTMLTextAreaElement
      ).value;
    } else if (tagName === "select") {
      attributes["value"] = (el as HTMLSelectElement).value;
    }

    return attributes;
  }

  private getMeaningfulText(el: Element): string {
    if ("value" in el && (el as HTMLInputElement).value) {
      return (el as HTMLInputElement).value;
    }
    return el.textContent?.trim().replace(/\s+/g, " ") || "";
  }

  private getRandomColor(): string {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r}, ${g}, ${b})`;
  }

  /** Draws a debug highlight around an element with its index and selector, removes after 2 seconds. */
  private drawDebugHighlight(
    el: Element,
    index: number,
    selector: string,
    iframeOffset: { x: number; y: number }
  ): void {
    const rect = el.getBoundingClientRect();
    const highlight = document.createElement("div");
    highlight.className = "debug-highlight";
    const randomColor = this.getRandomColor();
    Object.assign(highlight.style, {
      position: "absolute",
      left: `${rect.left + window.scrollX + iframeOffset.x}px`,
      top: `${rect.top + window.scrollY + iframeOffset.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      border: `2px solid ${randomColor}`,
      backgroundColor: `${randomColor}20`, // 20% opacity for background
      zIndex: "9999",
      pointerEvents: "none",
    });
    const label = document.createElement("span");
    label.textContent = `${index}`;
    Object.assign(label.style, {
      position: "absolute",
      top: "-20px",
      left: "0",
      background: "rgba(0, 0, 0, 0.7)",
      color: "white",
      padding: "2px 5px",
      fontSize: "12px",
    });
    highlight.appendChild(label);
    document.body.appendChild(highlight);

    // Remove the highlight after 2 seconds
    setTimeout(() => {
      highlight.remove();
    }, 2000);
  }
}
