import { ActionError } from "./classes/ActionError";
import { PageElement } from "./services/ai/interfaces";
import { LocalAction } from "./types/actionType";

/******************************************************
 * content.ts
 ******************************************************/
declare global {
  interface Window {
    __AGENT_CHROME_INITIALIZED__?: boolean;
  }
}

const AGENT_KEY = "__AGENT_CHROME_INITIALIZED__";
let myTabId = -1; // Global variable to hold this tab's ID

if (!window[AGENT_KEY]) {
  window[AGENT_KEY] = true;
  console.log("[content.ts] Loaded content script successfully.");

  // Ask background for this tab's ID
  chrome.runtime.sendMessage({ type: "GET_TAB_ID" }, (response) => {
    myTabId = response?.tabId ?? -1;
    console.log("[content.ts] My tabId is", myTabId);
  });

  // Listen for one-time messages from background
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "EXECUTE_ACTIONS") {
      console.log(
        "[content.ts] Received EXECUTE_ACTIONS with actions:",
        message.actions
      );
      executeLocalActions(message.actions)
        .then(() => {
          const initialCommand = message.INITIAL_COMMAND
            ? message.INITIAL_COMMAND
            : "No initial command";
          // Signal that the entire batch of actions is complete.
          chrome.runtime.sendMessage({
            type: "LOCAL_ACTIONS_COMPLETED",
            tabId: myTabId,
            INITIAL_COMMAND: initialCommand,
            contextMessage: `
            Main Objective: ${message.INITIAL_COMMAND},
            Evaluation of Previous goal: ${message.evaluation_previous_goal},
            History of the task: ${message.memory},
            Next goal: ${message.next_goal}
            `,
            success: true,
          });
          sendResponse({ success: true });
        })
        .catch((err) => {
          const initialCommand = message.INITIAL_COMMAND
            ? message.INITIAL_COMMAND
            : "No initial command";
          chrome.runtime.sendMessage({
            type: "LOCAL_ACTIONS_COMPLETED",
            tabId: myTabId,
            INITIAL_COMMAND: initialCommand,
            contextMessage: `
            Main Objective: ${message.INITIAL_COMMAND},
            Evaluation of Previous goal: ${message.evaluation_previous_goal},
            History of the task: ${message.memory},
            Next goal: ${message.nextGoal}
            `,
            success: false,
          });
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }
    // Retain your existing one-time message handlers for TOGGLE_SIDEBAR, GET_PAGE_ELEMENTS, etc.
    if (message.type === "TOGGLE_SIDEBAR") {
      toggleSidebar();
      sendResponse({ success: true });
      return true;
    }
    if (message.type === "GET_PAGE_ELEMENTS") {
      console.log("[content.ts] Extracting page elements...");
      const elements = extractPageElements();
      sendResponse({ success: true, elements });
      return true;
    }
    console.warn("[content.ts] Unknown message type:", message.type);
    sendResponse({ success: false, error: "Unknown message type" });
    return true;
  });

  function executeLocalActions(actions: LocalAction[]): Promise<void> {
    return (
      actions
        .reduce((promiseChain, action) => {
          return promiseChain.then(() => {
            console.log("[content.ts] Executing action:", action);
            return executeDOMActionPromise(action)
              .then((response) => {
                console.log("[content.ts] Completed action:", action.id);
                return response; // propagate the response (if needed)
              })
              .catch((err) => {
                console.error(
                  `[content.ts] Error executing action ${action.id}:`,
                  err
                );
                // Reject immediately with an error that includes the failing action details
                return Promise.reject(
                  new ActionError(
                    action,
                    `Failed executing action with id ${action.id}: ${
                      err instanceof Error ? err.message : err
                    }`
                  )
                );
              });
          });
        }, Promise.resolve())
        // Ensure the chain resolves to void
        .then(() => undefined)
    );
  }

  async function executeDOMActionPromise(action: LocalAction): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const sel = action.data.selector || "";
        let element = sel ? (document.querySelector(sel) as HTMLElement) : null;
        if (!element && sel) {
          console.warn("[content.ts] Element not found. Attempting scroll...");
          window.scrollTo(0, document.body.scrollHeight);
          setTimeout(async () => {
            element = document.querySelector(sel) as HTMLElement;
            if (!element) {
              return reject(
                new Error(`Element not found for selector: ${sel}`)
              );
            }
            await performLocalDOMAction(element, action)
              .then(() => {
                resolve();
              })
              .catch((err) => {
                reject(err);
              });
          }, 1000);
        } else if (element) {
          await performLocalDOMAction(element, action)
            .then(() => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        } else {
          await performLocalDOMAction(null, action)
            .then(() => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        }
      } catch (error: any) {
        reject(error);
      }
    });
  }

  /******************************************************
   * DOM Action Helpers (unchanged)
   ******************************************************/
  function highlightElement(selector: string) {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn("[content.ts] highlightElement: not found:", selector);
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

  async function performLocalDOMAction(
    target: HTMLElement | null,
    action: LocalAction
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        switch (action.type) {
          case "click":
          case "click_element":
            if (target) {
              // Attach a temporary event listener to confirm the click
              const handleClick = (e: Event) => {
                console.log(`[DEBUG] Click event received on:`, target);
                target.removeEventListener("click", handleClick);
              };
              target.addEventListener("click", handleClick);

              // Dispatch the events
              target.dispatchEvent(
                new MouseEvent("mousedown", { bubbles: true })
              );
              target.dispatchEvent(
                new MouseEvent("mouseup", { bubbles: true })
              );
              target.dispatchEvent(new MouseEvent("click", { bubbles: true }));

              // You may wait a little to check if the event fires
              setTimeout(() => {
                // Optionally verify if any action-specific change occurred here.
                resolve();
              }, 100);
            } else {
              console.warn("[content.ts] No target to click.");
              reject(new Error("No target to click."));
            }
            break;
          case "input_text": {
            if (!target) {
              reject(new Error("No element for input_text"));
              break;
            }
            console.log("[content.ts] action_input_text:", target);

            // Add a temporary event listener to confirm the input event.
            const handleInput = (event: Event) => {
              console.log("[DEBUG] Input event received on", target, event);
              target.removeEventListener("input", handleInput);
            };
            target.addEventListener("input", handleInput);

            // Set the input value.
            (target as HTMLInputElement).value = action.data.text || "invalid";
            // Dispatch the input event.
            target.dispatchEvent(new Event("input", { bubbles: true }));
            resolve();
            break;
          }

          case "scroll_down":
            window.scrollBy({
              top: window.innerHeight,
              behavior: "smooth",
            });
            resolve();
            break;
          case "scroll_up":
            window.scrollBy({
              top: -window.innerHeight,
              behavior: "smooth",
            });
            resolve();
            break;
          case "scroll":
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "center" });
              resolve();
            } else {
              window.scrollBy({
                top: action.data.offset || 200,
                behavior: "smooth",
              });
              resolve();
            }
            break;
          case "submit_form":
            if (!target) {
              reject(new Error("No element for submit_form"));
              break;
            }
            if (target instanceof HTMLFormElement) {
              target.submit();
              resolve();
            } else {
              const formEl = target.closest("form");
              if (formEl) {
                formEl.submit();
                resolve();
              } else {
                reject(new Error("submit_form: no form found"));
              }
            }
            break;
          case "key_press":
            const key = action.data.key || "Enter";
            console.log("[content.ts] key_press:", key);

            // Use the provided selector to find the target element.
            const targetElement = document.querySelector(action.data.selector!);
            if (!targetElement) {
              reject(
                new Error(
                  `No element found with selector: ${action.data.selector}`
                )
              );
              break;
            }

            // Attach a temporary listener to confirm the key event.
            const handleKeyDown = (e: KeyboardEvent) => {
              console.log(
                "[DEBUG] Keydown event received on",
                targetElement,
                e
              );
              // Remove the listener after the event is confirmed.
              (targetElement as HTMLElement).removeEventListener(
                "keydown",
                handleKeyDown
              );
            };
            (targetElement as HTMLElement).addEventListener(
              "keydown",
              handleKeyDown
            );

            // Create a keyboard event. For now, just using 'keydown'.
            const keyEvent = new KeyboardEvent("keydown", {
              key,
              bubbles: true,
              cancelable: true,
            });

            targetElement.dispatchEvent(keyEvent);
            resolve();
            break;

          case "extract":
            // Do extraction if needed.
            resolve();
            break;
          case "done":
            chrome.runtime.sendMessage({
              type: "PROCESS_COMPLETED",
            });
            resolve();
            break;
          default:
            console.warn("[content.ts] Unknown action:", action.type);
            reject(new Error(`Unknown action: ${action.type}`));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /******************************************************
   * Sidebar Handling (unchanged)
   ******************************************************/
  function toggleSidebar() {
    if (!sidebarContainer) injectSidebar();
    sidebarVisible = !sidebarVisible;
    sidebarContainer?.classList.toggle("hidden", !sidebarVisible);
    document.body.classList.toggle("sidebar-hidden", !sidebarVisible);
  }

  let sidebarContainer: HTMLDivElement | null = null;
  let sidebarVisible = false;

  function injectSidebar() {
    if (document.getElementById("agent-chrome-root")) return;
    sidebarContainer = document.createElement("div");
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
    sidebarVisible = true;
  }

  /******************************************************
   * Listen for "USER_COMMAND" from ChatWidget
   ******************************************************/
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== window) {
      return;
    }
    const data = event.data;
    if (data?.type === "USER_COMMAND" && data.command) {
      console.log(
        "[content.ts] ChatWidget command -> background:",
        data.command
      );
      chrome.runtime.sendMessage({
        type: "PROCESS_COMMAND",
        command: data.command,
        commandType: "INITIAL_COMMAND",
      });
    }
  });

  /**
   * Extracts interactive, visible elements within the viewport,
   * skipping those that have no meaningful text.
   *
   * @returns {PageElement[]} filtered array of elements
   *
   * @typedef {Object} PageElement
   * @property {number} index
   * @property {string} tagName
   * @property {string} selector
   * @property {string} text
   * @property {string} fullText
   * @property {Record<string, string | null>} attributes
   * @property {string} [role]
   * @property {string} [accessibleLabel]
   * @property {Object} boundingBox
   * @property {number} boundingBox.x
   * @property {number} boundingBox.y
   * @property {number} boundingBox.width
   * @property {number} boundingBox.height
   */
  function extractPageElements(): PageElement[] {
    const elements: PageElement[] = [];
    let idx = 1;

    // 1) Check if the element is visible (not display:none, not visibility:hidden, and nonzero bounding box)
    function isVisible(el: HTMLElement): boolean {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden")
        return false;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;

      return true;
    }

    // 2) Check if the element is in the current viewport (i.e., partially or fully)
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

    // 3) Extract meaningful text from element
    function getMeaningfulText(el: HTMLElement): string {
      // Prefer aria-label, alt, placeholder, then fallback to textContent
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("alt") ||
        el.getAttribute("placeholder") ||
        el.textContent;
      return (label || "").trim();
    }

    // 4) Check if the element is likely interactive by tag or role
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
        // Special case for <a>, require a meaningful href
        if (el.tagName === "A") {
          const href = el.getAttribute("href");
          if (!href || href === "#") return false;
        }
        return true;
      }

      // If it has a role, check if it's not purely presentational
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

      // A) Must be interactive
      if (!isElementInteractive(el)) return;

      // B) Must be visible
      if (!isVisible(el)) return;

      // C) Must be in the viewport (uncomment to filter out offscreen elements)
      if (!isInViewport(el)) return;

      // D) Extract meaningful text and skip if there's none
      const textSnippet = getMeaningfulText(el);
      if (!textSnippet) return;

      // E) Build a best-guess selector
      let selector: string;
      if (el.id) {
        selector = `#${CSS.escape(el.id)}`;
      } else if (el.className) {
        selector = `.${el.className.trim().replace(/\s+/g, ".")}`;
      } else {
        selector = `tag:${el.tagName.toLowerCase()}`;
      }

      // F) Whitelist of attributes to keep
      const attributes: Record<string, string | null> = {};
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
      ];
      Array.from(el.attributes).forEach((attr) => {
        if (attributeWhitelist.includes(attr.name)) {
          attributes[attr.name] = attr.value;
        }
      });

      // G) Compute bounding box
      const rect = el.getBoundingClientRect();
      const boundingBox = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };

      // H) Finally, add to our result array
      elements.push({
        index: idx++,
        tagName: el.tagName.toLowerCase(),
        selector,
        text: textSnippet.slice(0, 100), // truncated snippet
        fullText: "", // or you can collect a snippet from the parent container
        attributes,
        role: el.getAttribute("role") || undefined,
        accessibleLabel:
          el.getAttribute("aria-label") || el.getAttribute("alt") || undefined,
        boundingBox,
      });
      drawDebugHighlight(el, idx, selector);
    });

    return elements;
  }

  function getRandomColor() {
    // Generates a random hex color string, e.g. "#a3f9c2"
    return (
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
    );
  }

  function drawDebugHighlight(
    element: HTMLElement,
    index: number,
    selector: string
  ) {
    const rect = element.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.className = "debug-highlight";
    overlay.style.position = "absolute";
    overlay.style.border = "2px solid " + getRandomColor();
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "999999";
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.backgroundColor = "rgba(0, 0, 255, 0.1)";
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
    setTimeout(() => overlay.remove(), 3000);
  }
}
