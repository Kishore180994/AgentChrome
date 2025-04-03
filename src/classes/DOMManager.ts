import {
  PageElement,
  UncompressedPageElement,
  BoundingBox,
  ChildElement,
} from "../services/ai/interfaces"; // Adjust path as needed

export class DOMManager {
  constructor() {}

  /** Clears all debug highlights from the document. */
  clearDebugHighlights(doc: Document = document): void {
    doc.querySelectorAll(".debug-highlight").forEach((el) => el.remove());
  }

  private isInViewport(el: Element): boolean {
    const rect = el.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const windowWidth =
      window.innerWidth || document.documentElement.clientWidth;
    return (
      rect.top < windowHeight &&
      rect.bottom > 0 &&
      rect.left < windowWidth &&
      rect.right > 0
    );
  }

  private getBoundingBox(
    el: Element,
    offset: { x: number; y: number }
  ): BoundingBox {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + offset.x,
      y: rect.top + offset.y,
      width: rect.width,
      height: rect.height,
    };
  }

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
      const containers = doc.querySelectorAll("div, form, section, article");
      containers.forEach((el) => {
        const interactiveChildren = el.querySelectorAll(
          "a, button, input, textarea, select, div[role='button']"
        );
        if (!this.isInViewport(el) || interactiveChildren.length === 0) return;

        el.setAttribute("data-d4m-index", idx.toString());

        let childIdCounter = 1;
        const childElements: ChildElement[] = Array.from(interactiveChildren)
          .filter(
            (child) =>
              this.isElementImportant(child) && this.isInViewport(child)
          )
          .map((child) => {
            child.setAttribute("data-d4m-child-id", childIdCounter.toString());
            const result: ChildElement = [
              child.tagName.toLowerCase(),
              this.getMeaningfulText(child).slice(0, 50),
              this.getRelevantAttributes(child),
              this.getBoundingBox(child, parentOffset),
              childIdCounter,
            ];
            childIdCounter++;
            return result;
          });

        const elementData: PageElement = [
          idx,
          el.tagName.toLowerCase(),
          this.getMeaningfulText(el).slice(0, 50),
          this.getRelevantAttributes(el),
          this.getBoundingBox(el, parentOffset),
          childElements,
        ];
        compressedElements.push(elementData);
        uncompressedElements.push({
          index: idx,
          tagName: el.tagName.toLowerCase(),
          text: this.getMeaningfulText(el).slice(0, 50),
          attributes: this.getRelevantAttributes(el),
          boundingBox: this.getBoundingBox(el, parentOffset),
          childElements,
          element: el as HTMLElement,
        });

        this.drawDebugHighlight(el, idx, parentOffset);
        this.drawAllInteractiveHighlights(el, parentOffset);
        idx++;
      });

      const iframes = doc.getElementsByTagName("iframe");
      Array.from(iframes).forEach((iframe) => {
        if (!this.isElementImportant(iframe) || !this.isInViewport(iframe))
          return;
        const iframeRect = iframe.getBoundingClientRect();
        const iframeOffset = {
          x: parentOffset.x + iframeRect.left,
          y: parentOffset.y + iframeRect.top,
        };

        iframe.setAttribute("data-d4m-index", idx.toString());
        const iframeData: PageElement = [
          idx,
          "iframe",
          "",
          this.getRelevantAttributes(iframe),
          this.getBoundingBox(iframe, parentOffset),
          [],
        ];
        compressedElements.push(iframeData);
        uncompressedElements.push({
          index: idx,
          tagName: "iframe",
          text: "",
          attributes: this.getRelevantAttributes(iframe),
          boundingBox: this.getBoundingBox(iframe, parentOffset),
          childElements: [],
          element: iframe as HTMLElement,
        });

        this.drawDebugHighlight(iframe, idx, parentOffset);
        idx++;

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

  private isElementImportant(el: Element): boolean {
    const tagName = el.tagName.toLowerCase();
    const textContent = el.textContent?.trim() || "";
    const isVisible =
      window.getComputedStyle(el).display !== "none" &&
      window.getComputedStyle(el).visibility !== "hidden";
    const role = el.getAttribute("role")?.toLowerCase();

    if (!isVisible) return false;

    if (
      ["button", "input", "a", "textarea", "select", "canvas"].includes(tagName)
    ) {
      return true;
    }

    if (["h1", "h2", "h3", "h4", "h5", "h6", "label"].includes(tagName)) {
      return textContent.length > 0;
    }

    if (tagName === "form" || tagName === "fieldset") {
      return el.children.length > 0 || textContent.length > 0;
    }

    if (tagName === "div" || tagName === "span") {
      const isEditable = (el as HTMLElement).isContentEditable;
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
      return true;
    }

    return false;
  }

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
      backgroundColor: `${randomColor}20`,
      zIndex: "9999",
      pointerEvents: "none",
    });
    const label = document.createElement("span");
    label.textContent = `${index}`;
    Object.assign(label.style, {
      position: "absolute",
      top: "-20px",
      right: "0",
      background: "rgba(0, 0, 0, 0.7)",
      color: "white",
      padding: "2px 2px",
      fontSize: "10px",
    });
    highlight.appendChild(label);
    document.body.appendChild(highlight);
    setTimeout(() => highlight.remove(), 3000);
  }

  private drawAllInteractiveHighlights(
    el: Element,
    parentOffset: { x: number; y: number }
  ): void {
    const allInteractive = el.querySelectorAll(
      "a, button, input, textarea, select, div[role='button']"
    );
    allInteractive.forEach((child) => {
      if (!child.hasAttribute("data-d4m-index")) {
        const rect = child.getBoundingClientRect();
        const highlight = document.createElement("div");
        highlight.className = "debug-highlight";
        const randomColor = this.getRandomColor();
        Object.assign(highlight.style, {
          position: "absolute",
          left: `${rect.left + parentOffset.x}px`,
          top: `${rect.top + parentOffset.y}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          border: `2px solid ${randomColor}`,
          backgroundColor: `${randomColor}20`,
          zIndex: "9999",
          pointerEvents: "none",
        });
        document.body.appendChild(highlight);
        setTimeout(() => highlight.remove(), 3000);
      }
    });
  }
}
