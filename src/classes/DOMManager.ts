import { PageElement } from "../services/ai/interfaces"; // Adjust path as needed
import { LocalAction } from "../types/actionType"; // Adjust path as needed

export class DOMManager {
  private elementCache: Map<number, PageElement[]> = new Map();

  constructor() {}

  /** Clears all debug highlights from the document. */
  clearDebugHighlights(doc: Document = document): void {
    doc.querySelectorAll(".debug-highlight").forEach((el) => el.remove());
  }

  /**
   * Generates a concise, unique CSS selector for an element.
   * Prioritizes `id`, then `class`, then falls back to `nth-child`.
   */
  getCssSelector(el: Element): string {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const className = el.className.trim()
      ? `.${CSS.escape(el.className.split(" ")[0])}`
      : "";
    const tag = el.tagName.toLowerCase();
    if (className) return `${tag}${className}`;
    return this.getNthChildSelector(el);
  }

  /** Generates a minimal nth-child selector path. */
  private getNthChildSelector(el: Element): string {
    const path: string[] = [];
    let current: Element | null = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const index =
        Array.from(current.parentElement?.children || []).indexOf(current) + 1;
      path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
      current = current.parentElement;
    }
    return path.join(" > ");
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
   * Maps elements_type to corresponding DOM tags with full HTML5 coverage.
   */
  private mapElementsTypeToTags(elementsType: string[]): string[] {
    const tagMap: { [key: string]: string[] } = {
      BUTTON: ["button"],
      INPUT_FIELDS: ["input", "textarea"],
      IMAGE: ["img"],
      TEXT: [
        "p",
        "span",
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "strong",
        "em",
        "b",
        "i",
        "u",
        "small",
        "sub",
        "sup",
        "mark",
        "q",
        "cite",
        "blockquote",
      ],
      LINK: ["a"],
      DROPDOWN: ["select"],
      RADIO_BUTTON: ["input[type='radio']"],
      CHECKBOX: ["input[type='checkbox']"],
      TABLE: ["table", "thead", "tbody", "tfoot", "tr", "td", "th"],
      FORM: ["form"],
      NAVIGATION: ["nav", "ul", "ol", "li", "menu"],
      ARTICLE: ["article"],
      SECTION: ["section"],
      ASIDE: ["aside"],
      HEADER: ["header"],
      FOOTER: ["footer"],
      MAIN: ["main"],
      DETAILS: ["details", "summary"],
      CODE: ["code"],
      PRE: ["pre"],
      VIDEO: ["video"],
      AUDIO: ["audio"],
      CANVAS: ["canvas"],
      IFRAME: ["iframe"],
      OBJECT: ["object"],
      EMBED: ["embed"],
      LABEL: ["label"],
      FIELDSET: ["fieldset", "legend"],
      OUTPUT: ["output"],
      PROGRESS: ["progress"],
      METER: ["meter"],
      HR: ["hr"],
      BR: ["br"],
      ABBR: ["abbr"],
      ADDRESS: ["address"],
      TIME: ["time"],
      FIGURE: ["figure", "figcaption"],
      DATALIST: ["datalist"],
      OTHER: [],
    };

    if (
      !elementsType ||
      elementsType.length === 0 ||
      elementsType.includes("OTHER")
    ) {
      return [
        ...tagMap.BUTTON,
        ...tagMap.INPUT_FIELDS,
        ...tagMap.LABEL,
        ...tagMap.DROPDOWN,
        ...tagMap.RADIO_BUTTON,
        ...tagMap.CHECKBOX,
        ...tagMap.OUTPUT,
        ...tagMap.PROGRESS,
        ...tagMap.METER,
      ];
    }

    return elementsType
      .flatMap((type) => tagMap[type.toUpperCase()] || [])
      .filter(Boolean);
  }

  /**
   * Checks if an element matches the specific type requirements.
   */
  private matchesElementType(el: Element, elementsType: string[]): boolean {
    const tag = el.tagName.toLowerCase();
    const typeAttr = el.getAttribute("type")?.toLowerCase();

    if (!elementsType.length || elementsType.includes("OTHER")) return true;

    for (const et of elementsType.map((t) => t.toUpperCase())) {
      switch (et) {
        case "INPUT_FIELDS":
          return tag === "input" || tag === "textarea";
        case "RADIO_BUTTON":
          return tag === "input" && typeAttr === "radio";
        case "CHECKBOX":
          return tag === "input" && typeAttr === "checkbox";
        case "INPUT_TEXT":
          return tag === "input" && typeAttr === "text";
        case "INPUT_EMAIL":
          return tag === "input" && typeAttr === "email";
        case "INPUT_NUMBER":
          return tag === "input" && typeAttr === "number";
        case "INPUT_PASSWORD":
          return tag === "input" && typeAttr === "password";
        case "INPUT_DATE":
          return tag === "input" && typeAttr === "date";
        case "INPUT_TIME":
          return tag === "input" && typeAttr === "time";
        case "INPUT_FILE":
          return tag === "input" && typeAttr === "file";
        case "INPUT_SEARCH":
          return tag === "input" && typeAttr === "search";
        default:
          const tags = this.mapElementsTypeToTags([et]);
          return tags.includes(tag) || tags.some((t) => el.matches(t));
      }
    }
    return false;
  }

  /**
   * Extracts elements from the page based on elements_type.
   */
  extractPageElements(
    tabId: number,
    elementsType: string[] = [],
    maxDepth: number = 3,
    debug: boolean = true
  ): PageElement[] {
    if (debug) {
      this.clearDebugHighlights();
    }
    elementsType = [];

    const importantTags = [
      "button",
      "input",
      "a",
      "textarea",
      "select",
      "option",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "label",
      "form",
      "fieldset",
      "div",
      "span",
    ];

    const filter =
      elementsType.length === 0 || elementsType[0]?.toUpperCase() === "ALL"
        ? importantTags
        : this.mapElementsTypeToTags(elementsType);

    const elements: PageElement[] = [];
    let idx = 1;

    const processDocument = (
      doc: Document,
      iframeOffset: { x: number; y: number } = { x: 0, y: 0 },
      depth: number = 0
    ) => {
      if (depth > maxDepth) return;

      const query = filter.join(", ");
      doc.querySelectorAll(query).forEach((el) => {
        if (!this.matchesElementType(el, elementsType)) return;

        if (
          (elementsType.length === 0 ||
            elementsType[0]?.toUpperCase() === "ALL") &&
          !this.isElementImportant(el)
        ) {
          return;
        }

        const attributes = this.getElementAttributes(el);
        const classNames = attributes.class
          ? attributes.class.split(/\s+/)
          : [];

        // Construct CSS Selector from Classnames
        const classSelector = classNames.length
          ? "." + classNames.map((cls) => CSS.escape(cls)).join(".")
          : "";
        const tagSelector = el.tagName.toLowerCase();

        const cssSelector = classSelector
          ? `${tagSelector}${classSelector}`
          : tagSelector;

        const xPath = this.getElementXPath(el);
        const textSnippet = this.getMeaningfulText(el).slice(0, 100);
        const rect = el.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) return;

        const boundingBox = {
          x: rect.left + window.scrollX + iframeOffset.x,
          y: rect.top + window.scrollY + iframeOffset.y,
          width: rect.width,
          height: rect.height,
        };

        elements.push({
          index: idx++,
          tagName: tagSelector,
          selector: cssSelector,
          xPath,
          text: textSnippet,
          attributes,
          boundingBox,
          fullText: el.textContent?.trim() || "",
        });

        if (debug) this.drawDebugHighlight(el, idx, cssSelector, iframeOffset);
      });

      if (depth < maxDepth) {
        doc.querySelectorAll("iframe").forEach((iframe) => {
          try {
            const iframeDoc = iframe.contentDocument;
            if (!iframeDoc) return;
            const iframeRect = iframe.getBoundingClientRect();
            const iframeOffsetAdjusted = {
              x: iframeRect.left + window.scrollX + iframeOffset.x,
              y: iframeRect.top + window.scrollY + iframeOffset.y,
            };
            processDocument(iframeDoc, iframeOffsetAdjusted, depth + 1);
          } catch (e) {
            console.warn("Failed to process iframe:", e);
          }
        });
      }
    };

    processDocument(document);
    this.elementCache.set(tabId, elements);
    return elements;
  }

  private isElementImportant(el: Element): boolean {
    const tagName = el.tagName.toLowerCase();
    const textContent = el.textContent?.trim() || "";
    const isVisible =
      window.getComputedStyle(el).display !== "none" &&
      window.getComputedStyle(el).visibility !== "hidden";
    const isContentEditable =
      el.getAttribute("contenteditable") === "true" ||
      (el.parentElement && el.parentElement.isContentEditable);
    const classList = el.className.toLowerCase();
    const hasEditableClass = classList.includes("editable");

    if (["button", "input", "a", "textarea", "select"].includes(tagName)) {
      return isVisible;
    }
    if (["h1", "h2", "h3", "h4", "h5", "h6", "p", "label"].includes(tagName)) {
      return isVisible && textContent.length > 0;
    }
    if (tagName === "form" || tagName === "fieldset") {
      return isVisible && (el.children.length > 0 || textContent.length > 0);
    }
    if (tagName === "div" || tagName === "span") {
      return isVisible && (isContentEditable || hasEditableClass);
    }

    return false;
  }

  async executeAction(action: LocalAction): Promise<void> {
    const { selector, xPath } = action.data;
    let element = this.queryBySelectorOrXPath(selector || "", xPath || "");
    if (!element) {
      element = await this.waitForElement(selector || "", xPath || "", 5000);
    }
    if (!element) {
      throw new Error(
        `Element not found for selector: "${selector}" or xPath: "${xPath}"`
      );
    }
    this.performLocalDOMAction(element, action);
  }

  private queryBySelectorOrXPath(
    selector: string,
    xPath: string
  ): HTMLElement | null {
    if (selector) return document.querySelector(selector) as HTMLElement | null;
    if (xPath) return this.queryByXPath(xPath);
    return null;
  }

  private async waitForElement(
    selector: string,
    xPath: string,
    timeout: number
  ): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
      let element = this.queryBySelectorOrXPath(selector, xPath);
      if (element) return resolve(element);

      const observer = new MutationObserver(() => {
        element = this.queryBySelectorOrXPath(selector, xPath);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  private performLocalDOMAction(
    target: HTMLElement,
    action: LocalAction
  ): void {
    switch (action.type) {
      case "click":
      case "click_element":
        target.click();
        break;
      case "input_text":
        const text = action.data.text || "";
        if (target.tagName.toUpperCase() === "CANVAS") {
          try {
            this.simulatePaste(target, text);
          } catch (e) {
            console.warn(
              "Paste failed on canvas; it may not support text input:",
              e
            );
          }
        } else {
          (target as HTMLInputElement).value = text;
          target.dispatchEvent(new Event("input", { bubbles: true }));
          target.dispatchEvent(new Event("change", { bubbles: true }));
        }
        break;
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  private async simulatePaste(
    target: HTMLElement,
    text: string
  ): Promise<void> {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);
    const pasteEvent = new ClipboardEvent("paste", {
      clipboardData,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(pasteEvent);
  }

  private getMeaningfulText(el: Element): string {
    if ("value" in el && (el as HTMLInputElement).value) {
      return (el as HTMLInputElement).value;
    }
    return el.textContent?.trim().replace(/\s+/g, " ") || "";
  }

  private getElementAttributes(el: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    Array.from(el.attributes).forEach((attr) => {
      attrs[attr.name] = attr.value;
    });
    return attrs;
  }

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
