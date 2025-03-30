import { PageElement } from "../services/ai/interfaces"; // Adjust path as needed

export interface UncompressedPageElement extends PageElement {
  element: HTMLElement; // Direct reference to the DOM element
}

export class DOMManager {
  constructor() {}

  /** Clears all debug highlights from the document. */
  clearDebugHighlights(doc: Document = document): void {
    doc.querySelectorAll(".debug-highlight").forEach((el) => el.remove());
  }

  /**
   * Checks if an element is within the viewport (at least partially visible).
   */
  private isInViewport(el: Element): boolean {
    const rect = el.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const windowWidth =
      window.innerWidth || document.documentElement.clientWidth;

    // Element is in viewport if it intersects with the viewport
    return (
      rect.top < windowHeight &&
      rect.bottom > 0 &&
      rect.left < windowWidth &&
      rect.right > 0
    );
  }

  /**
   * Extracts elements from the page that are currently in the viewport for AI web automation.
   * Returns both compressed (for AI) and uncompressed (for interaction) element sets.
   * Adds a 2-second debug highlight to each extracted element.
   */
  extractPageElements(): {
    compressed: PageElement[];
    uncompressed: UncompressedPageElement[];
  } {
    const compressedElements: PageElement[] = [];
    const uncompressedElements: UncompressedPageElement[] = [];
    let idx = 0;

    const processDocument = (
      doc: Document,
      parentOffset: { x: number; y: number } = { x: 0, y: 0 }
    ): void => {
      // Process regular elements
      const elements = doc.querySelectorAll(
        "a, button, input, textarea, select, div[role='button'], h1, h2, h3, h4, h5, h6, fieldset, label"
      );
      elements.forEach((el) => {
        if (!this.isElementImportant(el) || !this.isInViewport(el)) return;

        el.setAttribute("data-d4m-index", idx.toString());
        const elementData: PageElement = {
          index: idx,
          tagName: el.tagName.toLowerCase(),
          text: this.getMeaningfulText(el).slice(0, 50),
          attributes: this.getRelevantAttributes(el),
        };
        compressedElements.push(elementData);
        uncompressedElements.push({
          ...elementData,
          element: el as HTMLElement,
        });
        console.log(`[DOMManager] Element at index ${idx}:`, el);

        // Draw debug highlight with the parent offset
        this.drawDebugHighlight(el, idx, parentOffset);

        idx++;
      });

      // Process iframes
      const iframes = doc.getElementsByTagName("iframe");
      Array.from(iframes).forEach((iframe) => {
        if (!this.isElementImportant(iframe) || !this.isInViewport(iframe))
          return;

        // Calculate the iframe's offset relative to the top-level document
        const iframeRect = iframe.getBoundingClientRect();
        const iframeOffset = {
          x: parentOffset.x + iframeRect.left,
          y: parentOffset.y + iframeRect.top,
        };

        iframe.setAttribute("data-d4m-index", idx.toString());
        const iframeData: PageElement = {
          index: idx,
          tagName: "iframe",
          text: "",
          attributes: this.getRelevantAttributes(iframe),
        };
        compressedElements.push(iframeData);
        uncompressedElements.push({
          ...iframeData,
          element: iframe as HTMLElement,
        });
        console.log(`[DOMManager] Iframe at index ${idx}:`, iframe);

        // Draw debug highlight for the iframe itself
        this.drawDebugHighlight(iframe, idx, parentOffset);

        idx++;

        // Process iframe contents with the updated offset
        if (iframe.contentDocument) {
          processDocument(iframe.contentDocument, iframeOffset);
        } else {
          console.warn(
            `[DOMManager] Iframe at index ${idx - 1} has no contentDocument`
          );
        }
      });
    };

    this.clearDebugHighlights();
    processDocument(document);
    console.log(
      `[DOMManager] Extracted ${uncompressedElements.length} elements`
    );
    return {
      compressed: compressedElements,
      uncompressed: uncompressedElements,
    };
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

    if (["button", "input", "a", "textarea", "select"].includes(tagName)) {
      return true;
    }

    if (["h1", "h2", "h3", "h4", "h5", "h6", "label"].includes(tagName)) {
      return textContent.length > 0;
    }

    if (tagName === "form" || tagName === "fieldset") {
      return el.children.length > 0 || textContent.length > 0;
    }

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

    if (tagName === "iframe") {
      return true; // Consider iframes important if they are visible
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

  /** Draws a debug highlight around an element with its index, removes after 2 seconds. */
  drawDebugHighlight(
    el: Element,
    index: number,
    iframeOffset: { x: number; y: number }
  ): void {
    const rect = el.getBoundingClientRect();
    const highlight = document.createElement("div");
    highlight.className = "debug-highlight";
    const randomColor = this.getRandomColor();
    Object.assign(highlight.style, {
      position: "absolute",
      left: `${rect.left + iframeOffset.x}px`,
      top: `${rect.top + iframeOffset.y}px`,
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
    }, 3000);
  }
}
