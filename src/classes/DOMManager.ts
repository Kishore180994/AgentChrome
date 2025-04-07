// DOMManager.ts (UPDATED with documentURI fix)
import {
  PageElement,
  UncompressedPageElement,
  BoundingBox,
} from "../services/ai/interfaces"; // Adjust path as needed

// Helper type guards (place at top or bottom)
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

export class DOMManager {
  private elementMap: Map<number, HTMLElement>;

  constructor() {
    this.elementMap = new Map();
    console.log("[DOMManager] Initialized (Direct Indexing Model).");
  }

  /** Clears all debug highlights AND temporary index attributes, and resets the element map. */
  clearDebugHighlights(doc: Document = document): void {
    try {
      // Remove the attribute from elements in the main document
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
      // Remove highlight divs from main document
      doc.querySelectorAll(".debug-highlight").forEach((el) => el.remove());

      // Clear highlights AND attributes from within IFRAMES
      const iframes = doc.getElementsByTagName("iframe");
      Array.from(iframes).forEach((iframe) => {
        try {
          const contentDoc = iframe.contentDocument;
          if (contentDoc) {
            contentDoc.querySelectorAll("[data-d4m-index]").forEach((el) => {
              try {
                el.removeAttribute("data-d4m-index");
              } catch (e) {
                /* ignore */
              }
            });
            contentDoc
              .querySelectorAll(".debug-highlight")
              .forEach((el) => el.remove());
          }
        } catch (e) {
          /* ignore potential cross-origin */
        }
      });

      this.elementMap.clear(); // Clear the internal map
      console.log("[DOMManager] Cleared highlights, attributes, and map.");
    } catch (error) {
      console.error("[DOMManager] Error during clearDebugHighlights:", error);
    }
  }

  /** Checks if an element is currently within the browser's viewport. */
  private isInViewport(el: Element): boolean {
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
      const windowHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const windowWidth =
        window.innerWidth || document.documentElement.clientWidth;
      const vertInView = rect.top < windowHeight && rect.bottom > 0;
      const horzInView = rect.left < windowWidth && rect.right > 0;
      return vertInView && horzInView;
    } catch (error) {
      console.error("[DOMManager] Error isInViewport:", error, el);
      return false;
    }
  }

  /** Determines if an element is considered interactive and important. Includes visibility/viewport checks. */
  private isInteractiveElement(el: Element): boolean {
    try {
      const id = el.id ? `#${el.id}` : "";
      const tagName = el.tagName.toLowerCase();
      if (!this.isInViewport(el)) return false; // Skip if not in viewport first
      const isDisabled = el.hasAttribute("disabled");
      // --- Log Reason for Skipping ---
      if (isDisabled) {
        console.log(
          `[DOMManager isInteractiveElement] Skip ${tagName}${id}: Disabled`
        );
        return false;
      }
      const style = window.getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        parseFloat(style.opacity || "1") === 0
      ) {
        console.log(
          `[DOMManager isInteractiveElement] Skip ${tagName}${id}: Not visible`
        );
        return false;
      }
      // --- End Logging Skips ---
      const isStandardInteractive = [
        "a",
        "button",
        "input",
        "textarea",
        "select",
      ].includes(tagName);
      const role = el.getAttribute("role")?.toLowerCase();
      const hasInteractiveRole =
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
      const isEditable = (el as HTMLElement).isContentEditable;
      const hasTabIndex =
        el.hasAttribute("tabindex") &&
        parseInt(el.getAttribute("tabindex") || "-1", 10) >= 0;
      const isFocusableDivSpan =
        hasTabIndex && (tagName === "div" || tagName === "span");
      if (
        isStandardInteractive ||
        hasInteractiveRole ||
        isEditable ||
        isFocusableDivSpan
      )
        return true;
      return false; // Skip if none of the above
    } catch (error) {
      console.error("[DOMManager] Error isInteractiveElement:", error, el);
      return false;
    }
  }

  /** Calculates bounding box relative to the main document's viewport. */
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
  /** Converts BoundingBox object to the tuple format [x, y, width, height]. */
  private boundingBoxToTuple(
    box: BoundingBox
  ): [number, number, number, number] {
    return [box.x, box.y, box.width, box.height];
  }

  /** Extracts relevant attributes from an element. */
  private getRelevantAttributes(el: Element): Record<string, string> {
    const attributes: Record<string, string> = {};
    try {
      const relevantAttrs = [
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
      relevantAttrs.forEach((attr) => {
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
      console.error("[DOMManager] Error getRelevantAttributes:", error, el);
    }
    return attributes;
  }
  /** Gets meaningful text content, prioritizing value, labels, etc. */
  private getMeaningfulText(el: Element): string {
    try {
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
      console.error("[DOMManager] Error getMeaningfulText:", error, el);
      return "";
    }
  }
  /** Generates a random color for debug highlights. */
  private getRandomColor(): string {
    const r = Math.floor(Math.random() * 200 + 56);
    const g = Math.floor(Math.random() * 200 + 56);
    const b = Math.floor(Math.random() * 200 + 56);
    return `rgb(${r}, ${g}, ${b})`;
  }

  /** Draws a debug highlight box - initially applies SECONDARY style and stores index */
  drawDebugHighlight(
    el: Element,
    index: number,
    offset: { x: number; y: number },
    docContext: Document // The document to add the highlight div to (usually main doc)
    // No longer needs modalContentDocument passed here directly
  ): void {
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return; // Don't draw zero-size elements

      const highlight = docContext.createElement("div");
      highlight.className = "debug-highlight"; // Class for easy removal
      // --- Store index on the element for later lookup ---
      highlight.dataset.d4mIndex = index.toString();

      // --- Style definitions for SECONDARY only initially ---
      const secondaryOutlineColor = "rgba(100, 100, 100, 0.8)";
      const secondaryOutlineStyle = `2px dashed ${secondaryOutlineColor}`; // Use dashed outline
      const secondaryBgColor = "rgba(128, 128, 128, 0.05)";
      const secondaryLabelBg = "rgba(80, 80, 80, 0.7)";
      const secondaryLabelColor = "white";
      const secondaryZIndex = "2147483646";

      // Apply base styles + SECONDARY border/outline/bg/zIndex
      Object.assign(highlight.style, {
        position: "absolute",
        left: `${rect.left + offset.x + window.scrollX}px`,
        top: `${rect.top + offset.y + window.scrollY}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        pointerEvents: "none",
        boxSizing: "border-box",
        backgroundColor: secondaryBgColor, // Apply secondary BG
        zIndex: secondaryZIndex, // Apply secondary Z
        outline: secondaryOutlineStyle, // Apply secondary outline
        border: "none", // Ensure no border initially
        outlineOffset: "-2px", // Optional offset
      });

      const label = docContext.createElement("span");
      label.textContent = `${index}`;
      // Apply SECONDARY label styles initially
      Object.assign(label.style, {
        position: "absolute",
        top: "-16px",
        left: "0px",
        background: secondaryLabelBg,
        color: secondaryLabelColor,
        padding: "1px 3px",
        fontSize: "10px",
        fontWeight: "bold",
        borderRadius: "2px",
        boxShadow: "0 0 2px rgba(0,0,0,0.5)",
        zIndex: "2147483647", // Keep label zIndex high
      });

      highlight.appendChild(label);
      docContext.body.appendChild(highlight);

      // Auto-remove timeout (applies to all highlights)
      setTimeout(() => {
        highlight.remove();
      }, 3000);
    } catch (error) {
      console.error(
        `[DOMManager] Error drawing initial highlight index ${index}:`,
        error,
        el
      );
    }
  }

  /** Extracts interactive elements and applies final highlight styles */
  extractPageElements(): {
    compressed: PageElement[];
    uncompressed: UncompressedPageElement[];
  } {
    // --- Call the UPDATED clear function ---
    this.clearDebugHighlights(); // Clears attributes too

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
            "a, button, input, textarea, select, [role], [contenteditable='true'], [tabindex]"
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
          if (this.isInteractiveElement(el)) {
            const elementIndex = currentIndex++;
            el.setAttribute("data-d4m-index", elementIndex.toString()); // Set attribute for this scan cycle
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
            // --- Draw initial SECONDARY highlight ---
            this.drawDebugHighlight(
              el,
              elementIndex,
              currentOffset,
              ownerDocument
            );
          }
        } catch (elementError) {
          console.error(
            "[DOMManager processNode] Error processing element:",
            elementError,
            el
          );
        }
      }); // End forEach potentialElement

      // --- Recursively process IFrames ---
      try {
        const iframes = (node as Document).getElementsByTagName?.("iframe");
        if (iframes) {
          Array.from(iframes).forEach((iframe) => {
            const iframeSrc = iframe.getAttribute("src") || "no src";
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
                  // Identify potential modal iframe (only first one found when scanning main doc)
                  if (node === document && !modalContentDocument) {
                    console.log(
                      `[DOMManager] Identifying potential modal iframe: ${iframeSrc}`
                    );
                    modalContentDocument = contentDoc; // Store its document
                    isLikelyModal = true;
                  }
                  // Log and Recurse
                  console.log(
                    `[DOMManager iframe Recurse START] Processing. Modal: ${isLikelyModal}, Src: ${iframeSrc}`
                  );
                  let iframeElementCount = 0;
                  const originalIndex = currentIndex;
                  processNode(contentDoc, iframeOffset, ownerDocument); // Recursive Call
                  iframeElementCount = currentIndex - originalIndex;
                  console.log(
                    `[DOMManager iframe Recurse END] Finished. Found ${iframeElementCount} elements inside. Src: ${iframeSrc}`
                  );
                } else {
                  console.warn(
                    `[DOMManager] Skipping iframe content (not complete). State: ${readyState}, Src: ${iframeSrc}`
                  );
                }
              } else {
                console.warn(
                  `[DOMManager] Skipping iframe content (no contentDocument). Src: ${iframeSrc}`,
                  iframe
                );
              }
            } catch (e: any) {
              console.warn(
                `[DOMManager] Error accessing iframe contentDoc. Src: ${iframeSrc}. Error: ${e.message}`,
                iframe
              );
            }
          });
        }
      } catch (iframeError) {
        console.error(
          "[DOMManager processNode] Error processing iframes:",
          iframeError
        );
      }

      // --- Recursively process Shadow DOM ---
      try {
        const elementsWithShadowRoot = node.querySelectorAll("*");
        elementsWithShadowRoot.forEach((el) => {
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
      } catch (shadowDomError) {
        console.error(
          "[DOMManager processNode] Error processing Shadow DOM:",
          shadowDomError
        );
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

    // --- Post-Processing: Update styles for primary context elements ---
    // This loop runs AFTER the entire scan (all processNode calls) is complete
    if (modalContentDocument) {
      // *** USE documentURI instead of URL ***
      console.log(
        `[DOMManager] Applying primary styles to elements in modal:`,
        (modalContentDocument as Document).documentURI || "..."
      ); // Use Type Assertion
      // *** END CHANGE ***
      const primaryBorderColor = this.getRandomColor(); // Use a consistent random color for the primary elements in this pass
      const primaryBorderStyle = `2px solid ${primaryBorderColor}`;
      const primaryBgColor = `${primaryBorderColor}33`;
      const primaryLabelBg = primaryBorderColor;
      const primaryLabelColor = "black";
      const primaryZIndex = "2147483647";

      // *** USE 'document' HERE instead of 'ownerDocument' - CORRECTED ***
      document.body
        .querySelectorAll(".debug-highlight")
        .forEach((highlightDiv) => {
          const indexStr = (highlightDiv as HTMLElement).dataset.d4mIndex;
          if (indexStr) {
            const index = parseInt(indexStr, 10);
            // Check if index exists in the map before getting element
            if (this.elementMap.has(index)) {
              const element = this.elementMap.get(index);
              // If element exists AND belongs to the identified modal document, update its style
              if (element && element.ownerDocument === modalContentDocument) {
                try {
                  Object.assign((highlightDiv as HTMLElement).style, {
                    backgroundColor: primaryBgColor,
                    zIndex: primaryZIndex,
                    border: primaryBorderStyle, // Apply primary border
                    outline: "none", // Remove outline
                    outlineOffset: "", // Reset offset
                  });
                  // Update label style too
                  const label = highlightDiv.querySelector("span");
                  if (label) {
                    Object.assign(label.style, {
                      background: primaryLabelBg,
                      color: primaryLabelColor,
                    });
                  }
                } catch (styleError) {
                  console.error(
                    `[DOMManager] Error updating primary style for index ${index}:`,
                    styleError
                  );
                }
              }
            } else {
              console.warn(
                `[DOMManager] Post-processing: Element for index ${index} not found in map.`
              );
            }
          }
        });
    } else {
      console.log(
        "[DOMManager] No modal iframe identified, all highlights remain secondary style."
      );
    }
    // --- End Post-Processing ---

    console.log(
      `[DOMManager] Extracted ${currentIndex} total interactive elements.`
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
