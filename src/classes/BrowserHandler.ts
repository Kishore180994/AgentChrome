export class BrowserManager {
  private port: chrome.runtime.Port | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the BrowserManager by setting up a persistent connection to the background script.
   */
  private initialize(): void {
    this.port = chrome.runtime.connect({ name: "content-script" });

    this.port.onMessage.addListener((message) => {
      console.log(
        "[BrowserManager] Received message from background:",
        message
      );

      switch (message.type) {
        case "PERFORM_ACTION":
          this.handleAction(message.action);
          break;

        case "TOGGLE_SIDEBAR":
          this.toggleSidebar();
          break;

        case "GET_PAGE_ELEMENTS":
          this.extractPageElementsAndSend();
          break;

        default:
          console.warn("[BrowserManager] Unknown message type:", message.type);
      }
    });

    // Keep the connection alive
    setInterval(() => {
      this.port?.postMessage({ type: "KEEP_ALIVE", tabId: -1 });
    }, 5000);

    // Notify background that content script is active
    chrome.runtime.sendMessage({ type: "REGISTER_CONTENT_SCRIPT" });
  }

  /**
   * Handle incoming actions from the background script.
   * @param action The action to execute.
   */
  private handleAction(action: LocalAction): void {
    try {
      if (action.data.selector) {
        this.highlightElement(action.data.selector);
      }
      this.executeDOMAction(action);
    } catch (error: any) {
      console.error("[BrowserManager] Error handling action:", error);
      chrome.runtime.sendMessage({
        type: "ACTION_FAILED",
        error: error.message,
      });
    }
  }

  /**
   * Execute a DOM action based on the provided action object.
   * @param action The action to execute.
   */
  private executeDOMAction(action: LocalAction): void {
    const selector = action.data.selector || "";
    let element = selector
      ? (document.querySelector(selector) as HTMLElement)
      : null;

    if (!element && selector) {
      console.warn("[BrowserManager] Element not found. Attempting scroll...");
      window.scrollTo(0, document.body.scrollHeight);

      setTimeout(() => {
        element = document.querySelector(selector) as HTMLElement;
        if (!element) {
          console.error(
            "[BrowserManager] Element still not found after scroll."
          );
          chrome.runtime.sendMessage({
            type: "ACTION_FAILED",
            error: `Element not found for selector: ${selector}`,
          });
          return;
        }
        this.performLocalDOMAction(element, action);
      }, 1000);
    } else {
      this.performLocalDOMAction(element, action);
    }
  }

  /**
   * Perform a local DOM action on the target element.
   * @param target The target element.
   * @param action The action to perform.
   */
  private performLocalDOMAction(
    target: HTMLElement | null,
    action: LocalAction
  ): void {
    try {
      switch (action.type) {
        case "click":
        case "click_element":
          target?.click();
          this.actionSuccess();
          break;

        case "input_text":
          if (!target) {
            this.actionFail("No element for input_text");
            break;
          }
          const text = action.data.text || "";
          if (target.tagName.toUpperCase() === "CANVAS") {
            this.simulatePaste(target, text);
          } else {
            (target as HTMLInputElement).value = text;
            target.dispatchEvent(new Event("input", { bubbles: true }));
          }
          this.actionSuccess();
          break;

        case "scroll":
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            window.scrollBy({
              top: action.data.offset || 200,
              behavior: "smooth",
            });
          }
          this.actionSuccess();
          break;

        case "submit_form":
          if (!target) {
            this.actionFail("No element for submit_form");
            break;
          }
          if (target instanceof HTMLFormElement) {
            target.submit();
          } else {
            const formEl = target.closest("form");
            if (formEl) formEl.submit();
            else this.actionFail("submit_form: no form found");
          }
          this.actionSuccess();
          break;

        default:
          console.warn(
            "[BrowserManager] Unknown or no-OP action type:",
            action.type
          );
          chrome.runtime.sendMessage({
            type: "ACTION_FAILED",
            error: `Unknown action: ${action.type}`,
          });
      }
    } catch (error: any) {
      console.error("[BrowserManager] Error performing DOM action:", error);
      chrome.runtime.sendMessage({
        type: "ACTION_FAILED",
        error: error.message,
      });
    }
  }

  /**
   * Simulate pasting text into a target element.
   * @param target The target element.
   * @param text The text to paste.
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
   * Highlight an element visually.
   * @param selector The CSS selector of the element to highlight.
   */
  private highlightElement(selector: string): void {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn("[BrowserManager] highlightElement: not found:", selector);
      return;
    }

    const rect = element.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.className = "ai-highlight-box";
    overlay.style.position = "absolute";
    overlay.style.border = "2px solid red";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "999999";
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.backgroundColor = "rgba(255, 0, 0, 0.2)";

    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2000);
  }

  /**
   * Toggle the visibility of the sidebar.
   */
  private toggleSidebar(): void {
    const sidebarContainer = document.getElementById("agent-chrome-root");
    if (!sidebarContainer) {
      this.injectSidebar();
    }

    const isVisible = !sidebarContainer?.classList.contains("hidden");
    sidebarContainer?.classList.toggle("hidden", isVisible);
    document.body.classList.toggle("sidebar-hidden", isVisible);
  }

  /**
   * Inject the sidebar into the DOM.
   */
  private injectSidebar(): void {
    if (document.getElementById("agent-chrome-root")) return;

    const sidebarContainer = document.createElement("div");
    sidebarContainer.id = "agent-chrome-root";
    document.body.appendChild(sidebarContainer);

    if (!document.getElementById("agent-chrome-style")) {
      const style = document.createElement("style");
      style.id = "agent-chrome-style";
      style.textContent = `
        body { width: calc(100% - 400px) !important; margin-right: 400px !important; transition: all 0.3s ease-in-out !important; }
        body.sidebar-hidden { width: 100% !important; margin-right: 0 !important; }
        #agent-chrome-root { position: fixed; top: 0; right: 0; width: 400px; height: 100vh; background: white; box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1); z-index: 2147483647; transition: transform 0.3s ease-in-out; }
        #agent-chrome-root.hidden { transform: translateX(100%); }
      `;
      document.head.appendChild(style);
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = chrome.runtime.getURL("sidebar.js");
    script.id = "agent-chrome-script";
    document.body.appendChild(script);
  }

  /**
   * Extract page elements and send them to the background script.
   */
  private extractPageElementsAndSend(): void {
    const elements = this.extractPageElements();
    chrome.runtime.sendMessage({
      type: "PAGE_ELEMENTS",
      elements,
    });
  }

  /**
   * Extract interactive, visible elements within the viewport.
   * @returns An array of extracted page elements.
   */
  private extractPageElements(): PageElement[] {
    const elements: PageElement[] = [];
    let idx = 1;

    function isVisible(el: HTMLElement): boolean {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden")
        return false;
      const rect = el.getBoundingClientRect();
      return !(rect.width === 0 || rect.height === 0);
    }

    function isInViewport(el: HTMLElement): boolean {
      const rect = el.getBoundingClientRect();
      return (
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <=
          (window.innerHeight || document.documentElement.clientHeight) &&
        rect.left <= (window.innerWidth || document.documentElement.clientWidth)
      );
    }

    function getMeaningfulText(el: HTMLElement): string {
      const label =
        el.textContent ||
        el.getAttribute("aria-label") ||
        el.getAttribute("alt") ||
        el.getAttribute("placeholder");
      return (label || "").trim();
    }

    function isElementInteractive(el: HTMLElement): boolean {
      const interactiveTags = [
        "BUTTON",
        "A",
        "INPUT",
        "TEXTAREA",
        "SELECT",
        "LABEL",
      ];
      if (interactiveTags.includes(el.tagName)) {
        if (el.tagName === "A") {
          const href = el.getAttribute("href");
          if (!href || href === "#") return false;
        }
        return true;
      }
      const roleAttr = el.getAttribute("role");
      if (
        roleAttr &&
        roleAttr.trim() &&
        !["presentation", "none"].includes(roleAttr.trim())
      ) {
        return true;
      }
      return false;
    }

    document.querySelectorAll("*:not(#agent-chrome-root *)").forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (!isElementInteractive(el)) return;

      const isCanvas = el.tagName.toUpperCase() === "CANVAS";
      if (!isCanvas) {
        if (!isVisible(el) || !isInViewport(el)) return;
        const textSnippet = getMeaningfulText(el);
        if (!textSnippet) return;
      }

      const selector = el.id
        ? `#${CSS.escape(el.id)}`
        : el.className
        ? `.${el.className.trim().replace(/\s+/g, ".")}`
        : `tag:${el.tagName.toLowerCase()}`;

      const attributes: Record<string, string> = {};
      [
        "href",
        "id",
        "type",
        "name",
        "value",
        "title",
        "aria-label",
        "alt",
        "placeholder",
      ].forEach((attr) => {
        if (el.hasAttribute(attr)) {
          attributes[attr] = el.getAttribute(attr)!;
        }
      });

      const rect = el.getBoundingClientRect();
      const boundingBox = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };

      const textSnippet =
        getMeaningfulText(el) || (isCanvas ? "Canvas Element" : "");

      elements.push({
        index: idx++,
        tagName: el.tagName.toLowerCase(),
        selector,
        text: textSnippet.slice(0, 100),
        fullText: "",
        attributes,
        role: el.getAttribute("role") || undefined,
        accessibleLabel:
          el.getAttribute("aria-label") || el.getAttribute("alt") || undefined,
        boundingBox,
      });
    });

    return elements;
  }

  /**
   * Notify the background script of a successful action.
   * @param msg Optional success message.
   */
  private actionSuccess(msg?: string): void {
    chrome.runtime.sendMessage({ type: "ACTION_SUCCESS", message: msg });
  }

  /**
   * Notify the background script of a failed action.
   * @param errorMsg The error message.
   */
  private actionFail(errorMsg: string): void {
    console.error("[BrowserManager]", errorMsg);
    chrome.runtime.sendMessage({
      type: "ACTION_FAILED",
      error: errorMsg,
    });
  }
}
