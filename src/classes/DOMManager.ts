// DOMManager.ts (FINAL - Fast Cleanup + Differentiated Highlighting)
import {
  PageElement,
  UncompressedPageElement,
  BoundingBox,
} from "../services/ai/interfaces"; // Adjust path as needed

// Helper type guards
function isInputElement(
  el: Element | null | undefined
): el is HTMLInputElement {
  return !!el && el.tagName === "INPUT";
}
function isTextAreaElement(
  el: Element | null | undefined
): el is HTMLTextAreaElement {
  return !!el && el.tagName === "TEXTAREA";
}
function isSelectElement(
  el: Element | null | undefined
): el is HTMLSelectElement {
  return !!el && el.tagName === "SELECT";
}

const HIGHLIGHT_CONTAINER_ID = "d4m-highlight-container"; // ID for the container

export class DOMManager {
  private elementMap: Map<number, HTMLElement>;

  constructor() {
    this.elementMap = new Map();
    console.log("[DOMManager] Initialized (Highlight Container Model).");
  }

  // --- THIS FUNCTION IS UPDATED ---
  /** Clears attributes, finds and removes highlight containers, resets map. */
  clearDebugHighlights(doc: Document = document): void {
    try {
      // Remove attributes (this is generally fast enough)
      doc.querySelectorAll("[data-d4m-index]").forEach((el) => {
        try {
          el.removeAttribute("data-d4m-index");
        } catch (e) {
          console.warn(
            "[DOMManager] Could not remove data-d4m-index attribute",
            e
          );
        }
      });

      // --- Remove Highlight Container(s) - FAST ---
      doc.getElementById(HIGHLIGHT_CONTAINER_ID)?.remove();

      // Remove from within IFRAMES
      const iframes = doc.getElementsByTagName("iframe");
      Array.from(iframes).forEach((iframe) => {
        try {
          const contentDoc = iframe.contentDocument;
          if (contentDoc) {
            // Remove attributes within iframe first
            contentDoc.querySelectorAll("[data-d4m-index]").forEach((el) => {
              try {
                el.removeAttribute("data-d4m-index");
              } catch (e) {
                /* ignore */
              }
            });
            // Remove the container within the iframe by ID
            contentDoc.getElementById(HIGHLIGHT_CONTAINER_ID)?.remove();
          }
        } catch (e) {
          /* ignore potential cross-origin */
        }
      });
      // --- End Removal ---

      this.elementMap.clear(); // Clear the internal map
      console.log(
        "[DOMManager] Cleared attributes, highlight containers, and map."
      );
    } catch (error) {
      console.error("[DOMManager] Error during clearDebugHighlights:", error);
    }
  }
  // --- END OF UPDATED FUNCTION ---

  // --- NEW HELPER FUNCTION ---
  /** Finds or creates the highlight container div within a given document context. */
  private ensureHighlightContainer(docContext: Document): HTMLElement {
    let container = docContext.getElementById(HIGHLIGHT_CONTAINER_ID);
    if (!container) {
      // console.log("[DOMManager] Creating highlight container in:", docContext.URL || 'document'); // Log if needed
      container = docContext.createElement("div");
      container.id = HIGHLIGHT_CONTAINER_ID;
      Object.assign(container.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "0",
        height: "0", // No dimensions itself
        pointerEvents: "none", // Crucial: container shouldn't block interactions
        zIndex: "2147483645", // Below individual highlights but high overall
      });
      // Prepend to body to be early in DOM order (can help stacking)
      if (docContext.body) {
        docContext.body.prepend(container);
      } else {
        docContext.documentElement.appendChild(container);
      } // Fallback
    }
    return container;
  }
  // --- END NEW HELPER FUNCTION ---

  /** Checks if element is in viewport. */
  private isInViewport(el: Element): boolean {
    /* ... same as before ... */
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        parseFloat(style.opacity || "1") === 0
      )
        return false;
      const wh = window.innerHeight || document.documentElement.clientHeight;
      const ww = window.innerWidth || document.documentElement.clientWidth;
      const vert = rect.top < wh && rect.bottom > 0;
      const horz = rect.left < ww && rect.right > 0;
      return vert && horz;
    } catch (error) {
      console.error("[DOMManager] Error isInViewport:", error, el);
      return false;
    }
  }

  /** Determines if element is relevant (interactive or content) */
  private isRelevantElement(el: Element): {
    isRelevant: boolean;
    isInteractive: boolean;
  } {
    /* ... same as before ... */
    let isRelevant = false,
      isInteractive = false;
    try {
      const id = el.id ? `#${el.id}` : "";
      const tagName = el.tagName.toLowerCase();
      if (!this.isInViewport(el))
        return { isRelevant: false, isInteractive: false };
      const style = window.getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        parseFloat(style.opacity || "1") === 0
      )
        return { isRelevant: false, isInteractive: false };
      const isDisabled = el.hasAttribute("disabled");
      if (!isDisabled) {
        const isStandard = [
          "a",
          "button",
          "input",
          "textarea",
          "select",
        ].includes(tagName);
        const role = el.getAttribute("role")?.toLowerCase();
        const hasRole =
          role &&
          [
            "button",
            "link",
            "checkbox",
            "radio",
            "switch",
            "menuitem",
            "menuitemcheckbox",
            "menuitemradio",
            "tab",
            "slider",
            "spinbutton",
            "textbox",
            "combobox",
            "listbox",
            "option",
          ].includes(role);
        const isEdit = (el as HTMLElement).isContentEditable;
        const hasIdx =
          el.hasAttribute("tabindex") &&
          parseInt(el.getAttribute("tabindex") || "-1", 10) >= 0;
        const isFocusDS = hasIdx && (tagName === "div" || tagName === "span");
        if (isStandard || hasRole || isEdit || isFocusDS) isInteractive = true;
      } else {
        console.log(`[DOMManager] Info ${tagName}${id}: Disabled`);
      }
      const isContentTag = [
        "p",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "td",
        "th",
        "blockquote",
        "article",
        "section",
        "main",
        "aside",
        "nav",
        "ul",
        "ol",
        "dl",
        "figure",
        "figcaption",
        "details",
        "summary",
        "label",
      ].includes(tagName);
      let hasText = false;
      if (["div", "span"].includes(tagName) && !isInteractive) {
        const text = (el as HTMLElement).innerText?.trim();
        if (text && text.length > 25) hasText = true;
      }
      isRelevant = isInteractive || isContentTag || hasText;
    } catch (error) {
      console.error("[DOMManager] Error isRelevantElement:", error, el);
      isRelevant = false;
      isInteractive = false;
    }
    return { isRelevant, isInteractive };
  }

  /** Calculates bounding box. */
  private getBoundingBox(
    el: Element,
    offset: { x: number; y: number }
  ): BoundingBox {
    /* ... same ... */ const rect = el.getBoundingClientRect();
    return {
      x: rect.left + offset.x,
      y: rect.top + offset.y,
      width: rect.width,
      height: rect.height,
    };
  }
  /** Converts BoundingBox to tuple. */
  private boundingBoxToTuple(
    box: BoundingBox
  ): [number, number, number, number] {
    /* ... same ... */ return [box.x, box.y, box.width, box.height];
  }
  /** Extracts relevant attributes. */
  private getRelevantAttributes(el: Element): Record<string, string> {
    /* ... same ... */ const attributes: Record<string, string> = {};
    try {
      const attrs = [
        "id",
        "class",
        "href",
        "type",
        "role",
        "aria-label",
        "aria-labelledby",
        "aria-describedby",
        "placeholder",
        "name",
        "for",
        "value",
        "checked",
        "selected",
        "disabled",
        "readonly",
        "data-testid",
        "data-test-id",
        "data-cy",
        "data-qa",
      ];
      attrs.forEach((attr) => {
        if (el.hasAttribute(attr))
          attributes[attr] = el.getAttribute(attr) || "";
      });
      if (isInputElement(el) && el.type !== "password") {
        if (["checkbox", "radio"].includes(el.type)) {
          attributes["checked"] = String(el.checked);
          if (el.hasAttribute("value")) attributes["value"] = el.value;
        } else {
          attributes["value"] = el.value;
        }
      } else if (isTextAreaElement(el)) {
        attributes["value"] = el.value;
      } else if (isSelectElement(el)) {
        attributes["value"] = el.value;
        if (el.selectedIndex >= 0 && el.options[el.selectedIndex])
          attributes["selectedText"] = el.options[el.selectedIndex].text;
      }
    } catch (error) {
      console.error("Error getRelevantAttributes:", error, el);
    }
    return attributes;
  }
  /** Gets meaningful text content. */
  private getMeaningfulText(el: Element): string {
    /* ... same ... */ try {
      const ariaLabel = el.getAttribute("aria-label")?.trim();
      if (ariaLabel) return ariaLabel;
      if (isInputElement(el) && el.type !== "password")
        return el.value || el.placeholder || "";
      if (isTextAreaElement(el)) return el.value || el.placeholder || "";
      if (
        isSelectElement(el) &&
        el.selectedIndex >= 0 &&
        el.options[el.selectedIndex]
      )
        return el.options[el.selectedIndex].text?.trim() || el.value;
      const text = (el as HTMLElement).innerText || el.textContent || "";
      return text.trim().replace(/\s+/g, " ").slice(0, 100);
    } catch (error) {
      console.error("Error getMeaningfulText:", error, el);
      return "";
    }
  }
  /** Generates a random color. */
  private getRandomColor(): string {
    /* ... same ... */ const r = Math.floor(Math.random() * 200 + 56);
    const g = Math.floor(Math.random() * 200 + 56);
    const b = Math.floor(Math.random() * 200 + 56);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // --- UPDATED drawDebugHighlight function ---
  /** Draws debug highlight into the appropriate container, applying differentiated styles directly. */
  drawDebugHighlight(
    el: Element,
    index: number,
    offset: { x: number; y: number },
    docContext: Document, // Document where highlight div should be added
    modalContentDocument: Document | null, // Used for styling decision
    isInteractive: boolean // Used for styling decision
  ): void {
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // --- Get or create the container IN THE CORRECT DOCUMENT ---
      const container = this.ensureHighlightContainer(docContext);
      // ---

      const highlight = docContext.createElement("div");
      highlight.className = "debug-highlight";
      highlight.dataset.d4mIndex = index.toString();

      // Determine Highlight Style Based on Context & Interactivity
      const isPrimaryContext =
        !modalContentDocument || el.ownerDocument === modalContentDocument;
      const primaryInteractiveColor = this.getRandomColor();
      const primaryContentColor = this.getRandomColor();
      const secondaryColor = "rgba(100, 100, 100, 0.8)";
      const primaryInteractiveStyle = `2px solid ${primaryInteractiveColor}`;
      const primaryContentStyle = `2px dotted ${primaryContentColor}`;
      const secondaryStyle = `2px dashed ${secondaryColor}`;
      const primaryInteractiveBg = `${primaryInteractiveColor}33`;
      const primaryContentBg = `${primaryContentColor}1A`;
      const secondaryBg = "rgba(128, 128, 128, 0.05)";
      const primaryInteractiveLabelBg = primaryInteractiveColor;
      const primaryContentLabelBg = primaryContentColor;
      const secondaryLabelBg = "rgba(80, 80, 80, 0.7)";
      const primaryLabelColor = "black";
      const secondaryLabelColor = "white";
      const primaryZIndex = "2147483647";
      const secondaryZIndex = "2147483646";

      // Apply final styles directly
      let finalBorderStyle = "none";
      let finalOutlineStyle = "none";
      let finalBgColor = secondaryBg;
      let finalLabelBg = secondaryLabelBg;
      let finalLabelColor = secondaryLabelColor;
      let finalZIndex = secondaryZIndex;
      if (isPrimaryContext) {
        if (isInteractive) {
          finalBorderStyle = primaryInteractiveStyle;
          finalBgColor = primaryInteractiveBg;
          finalLabelBg = primaryInteractiveLabelBg;
          finalLabelColor = primaryLabelColor;
          finalZIndex = primaryZIndex;
        } else {
          finalOutlineStyle = primaryContentStyle;
          finalBgColor = primaryContentBg;
          finalLabelBg = primaryContentLabelBg;
          finalLabelColor = primaryLabelColor;
          finalZIndex = (parseInt(primaryZIndex) - 1).toString();
        }
      } else {
        finalOutlineStyle = secondaryStyle;
        finalBgColor = secondaryBg;
        finalLabelBg = secondaryLabelBg;
        finalLabelColor = secondaryLabelColor;
        finalZIndex = secondaryZIndex;
      }

      Object.assign(highlight.style, {
        position: "absolute",
        left: `${rect.left + offset.x + window.scrollX}px`,
        top: `${rect.top + offset.y + window.scrollY}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        pointerEvents: "none",
        boxSizing: "border-box",
        backgroundColor: finalBgColor,
        zIndex: finalZIndex,
        border: finalBorderStyle,
        outline: finalOutlineStyle,
        outlineOffset: finalOutlineStyle !== "none" ? "-2px" : "",
      });

      const label = docContext.createElement("span");
      label.textContent = `${index}`;
      Object.assign(label.style, {
        position: "absolute",
        top: "-16px",
        left: "0px",
        background: finalLabelBg,
        color: finalLabelColor,
        padding: "1px 3px",
        fontSize: "10px",
        fontWeight: "bold",
        borderRadius: "2px",
        boxShadow: "0 0 2px rgba(0,0,0,0.5)",
        zIndex: "2147483647",
      });

      highlight.appendChild(label);
      // --- Append to container, NOT body ---
      container.appendChild(highlight);
      // --- REMOVED setTimeout for individual removal ---
    } catch (error) {
      console.error(
        `[DOMManager] Error drawing highlight index ${index}:`,
        error,
        el
      );
    }
  }
  // --- END drawDebugHighlight ---

  /** Extracts relevant elements, draws highlights into containers */
  extractPageElements(): {
    compressed: PageElement[];
    uncompressed: UncompressedPageElement[];
  } {
    this.clearDebugHighlights(); // Uses fast container removal now

    const compressedElements: PageElement[] = [];
    const uncompressedElements: UncompressedPageElement[] = [];
    let currentIndex = 0;
    let modalContentDocument: Document | null = null; // Track primary modal

    const processNode = (
      node: Document | ShadowRoot,
      currentOffset: { x: number; y: number },
      ownerDocument: Document = document
    ): void => {
      let potentialElements: Element[] = [];
      try {
        potentialElements = Array.from(
          node.querySelectorAll(
            "a, button, input, textarea, select, [role], [contenteditable='true'], [tabindex], p, h1, h2, h3, h4, h5, h6, li, td, th, article, section, main, label, dl, dt, dd, figure, summary"
          )
        );
      } catch (error) {
        console.error(
          `[DOMManager processNode] Error querying in ${node.nodeName}:`,
          error
        );
        return;
      }

      potentialElements.forEach((el) => {
        try {
          const { isRelevant, isInteractive } = this.isRelevantElement(el);
          if (isRelevant) {
            const elementIndex = currentIndex++;
            el.setAttribute("data-d4m-index", elementIndex.toString());
            const boundingBox = this.getBoundingBox(el, currentOffset);
            const attributes = this.getRelevantAttributes(el);
            const text = this.getMeaningfulText(el);
            const tagName = el.tagName.toLowerCase();
            const compressedData: PageElement = [
              elementIndex,
              tagName,
              text,
              attributes,
              this.boundingBoxToTuple(boundingBox),
              [],
            ];
            const uncompressedData: UncompressedPageElement = {
              index: elementIndex,
              tagName,
              text,
              attributes,
              boundingBox: this.boundingBoxToTuple(boundingBox),
              childElements: [],
              element: el as HTMLElement,
            };
            compressedElements.push(compressedData);
            uncompressedElements.push(uncompressedData);
            this.elementMap.set(elementIndex, el as HTMLElement);

            // --- Call drawDebugHighlight directly with context info ---
            this.drawDebugHighlight(
              el,
              elementIndex,
              currentOffset,
              ownerDocument,
              modalContentDocument,
              isInteractive
            );
          }
        } catch (elementError) {
          console.error(
            "[DOMManager processNode] Error processing element:",
            elementError,
            el
          );
        }
      });

      // --- Process IFrames (sets modalContentDocument for subsequent processing) ---
      try {
        const iframes = (node as Document).getElementsByTagName?.("iframe");
        if (iframes) {
          Array.from(iframes).forEach((iframe) => {
            /* ... iframe logic same as before, sets modalContentDocument ... */ const iframeSrc =
              iframe.getAttribute("src") || "no src";
            const viewportCheck = this.isInViewport(iframe);
            console.log(
              `[DOMManager iframe Check] Src: ${iframeSrc}, InViewport: ${viewportCheck}`
            );
            if (!viewportCheck) return;
            const iframeRect = iframe.getBoundingClientRect();
            const iframeOffset = {
              x: currentOffset.x + iframeRect.left,
              y: currentOffset.y + iframeRect.top,
            };
            try {
              const contentDoc = iframe.contentDocument;
              if (contentDoc) {
                const readyState = contentDoc.readyState;
                console.log(
                  `[DOMManager iframe Access] Src: ${iframeSrc}, ReadyState: ${readyState}`
                );
                if (readyState === "complete") {
                  let isLikelyModal = false;
                  if (node === document && !modalContentDocument) {
                    console.log(`Identifying modal iframe: ${iframeSrc}`);
                    modalContentDocument = contentDoc;
                    isLikelyModal = true;
                  }
                  console.log(
                    `[DOMManager iframe Recurse START] Modal: ${isLikelyModal}, Src: ${iframeSrc}`
                  );
                  let iCount = 0;
                  const oIdx = currentIndex;
                  processNode(contentDoc, iframeOffset, ownerDocument);
                  iCount = currentIndex - oIdx;
                  console.log(
                    `[DOMManager iframe Recurse END] Found ${iCount} elements inside. Src: ${iframeSrc}`
                  );
                } else {
                  console.warn(
                    `Skipping iframe (not complete). State: ${readyState}, Src: ${iframeSrc}`
                  );
                }
              } else {
                console.warn(
                  `Skipping iframe (no contentDoc). Src: ${iframeSrc}`,
                  iframe
                );
              }
            } catch (e: any) {
              console.warn(
                `Error accessing iframe contentDoc. Src: ${iframeSrc}. Error: ${e.message}`,
                iframe
              );
            }
          });
        }
      } catch (iframeError) {
        console.error("Error processing iframes:", iframeError);
      }

      // --- Process Shadow DOM ---
      try {
        const shadowHosts = node.querySelectorAll("*");
        shadowHosts.forEach((el) => {
          if (
            el.shadowRoot &&
            el.shadowRoot.mode === "open" &&
            this.isInViewport(el)
          ) {
            const hostRect = el.getBoundingClientRect();
            const shadowOffset = {
              x: currentOffset.x + hostRect.left,
              y: currentOffset.y + hostRect.top,
            };
            processNode(el.shadowRoot, shadowOffset, ownerDocument);
          }
        });
      } catch (shadowError) {
        console.error("Error processing Shadow DOM:", shadowError);
      }
    }; // End of processNode definition

    // Start processing
    try {
      if (document && document.readyState !== "loading")
        processNode(document, { x: 0, y: 0 }, document);
      else console.warn("[DOMManager] Main document not ready.");
    } catch (mainError) {
      console.error("[DOMManager] Error starting extraction:", mainError);
    }

    // --- REMOVED Post-Processing Style Loop ---
    // Styles are now applied directly in drawDebugHighlight based on context known at that point

    console.log(
      `[DOMManager] Extracted ${currentIndex} total relevant elements.`
    );
    return {
      compressed: compressedElements,
      uncompressed: uncompressedElements,
    };
  } // End of extractPageElements

  getElementByIndex(index: number): HTMLElement | undefined {
    return this.elementMap.get(index);
  }
} // End of class DOMManager
