import { LocalAction } from "../types/actionType";
import { PageElement } from "../services/ai/interfaces";

/**
 * Recursively searches for an element using a selector, including nested iframes.
 * @param selector - The CSS selector to find the element.
 * @param doc - The document to search within (default is the main document).
 * @returns An object with the found element and its owner document, or null element if not found.
 */
export function querySelectorWithIframes(
  selector: string,
  doc: Document = document
): { element: Element | null; ownerDocument: Document } {
  const element = doc.querySelector(selector);
  if (element) return { element, ownerDocument: doc };

  const iframes = Array.from(doc.getElementsByTagName("iframe"));
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) continue; // Skip inaccessible iframes
      const result = querySelectorWithIframes(selector, iframeDoc);
      if (result.element) return result;
    } catch (error) {
      console.warn(
        "[querySelectorWithIframes] Could not access iframe:",
        error
      );
    }
  }

  return { element: null, ownerDocument: doc };
}

/**
 * Simplified to only use selector since xPath is not part of PageElement anymore.
 * Recursively searches the provided document and its iframes using a CSS selector.
 */
export function querySelectorInFrames(
  selector: string,
  doc: Document = document
): { element: Element | null; ownerDocument: Document } {
  const result = querySelectorWithIframes(selector, doc);
  return result;
}

export async function executeLocalActions(
  actions: LocalAction[],
  index: number,
  tabIdRef: { value: number },
  contextMsg: string,
  evaluation?: string,
  pageElements: PageElement[] = []
): Promise<any> {
  if (index >= actions.length) {
    return "ACTIONS_COMPLETED";
  }

  const action = actions[index];
  try {
    const result = await performLocalAction(action, tabIdRef, pageElements);
    if (action.type === "extract") return result; // Return extracted content
    if (action.type === "done") return "PROCESS_COMPLETED";
    return await executeLocalActions(
      actions,
      index + 1,
      tabIdRef,
      contextMsg,
      evaluation,
      pageElements
    );
  } catch (err) {
    console.error("[executeLocalActions] Error executing action:", action, err);
    throw err; // Let the caller handle retries or fallback
  }
}

async function performLocalAction(
  action: LocalAction,
  tabIdRef: { value: number },
  pageElements: PageElement[]
): Promise<any> {
  const logPrefix = `[performLocalAction] Tab ${tabIdRef.value}`;
  const elementIndex = action.data.index;

  const getElementByIndex = (index: number | undefined): PageElement => {
    if (typeof index !== "number") {
      throw new Error(`${logPrefix} No valid index provided`);
    }
    const el = pageElements.find((pe) => pe.index === index);
    if (!el)
      throw new Error(`${logPrefix} Element not found for index ${index}`);
    return el;
  };

  const sendActionWithIframe = async (action: LocalAction): Promise<any> => {
    const el =
      elementIndex !== undefined ? getElementByIndex(elementIndex) : null;
    if (el && el.frame.length > 0) {
      const response = await chrome.scripting.executeScript({
        target: { tabId: tabIdRef.value },
        func: (framePath: number[], actionData: LocalAction) => {
          let context: Window = window;
          for (const idx of framePath) {
            const iframes = context.document.getElementsByTagName("iframe");
            if (idx >= iframes.length)
              throw new Error("Iframe index out of range");
            const nextContext = iframes[idx].contentWindow;
            if (!nextContext)
              throw new Error("Iframe contentWindow inaccessible");
            context = nextContext;
          }
          const el = context.document.querySelector(
            actionData.data.selector || ""
          );
          if (!el) throw new Error("Element not found in iframe");
          switch (actionData.type) {
            case "click":
            case "click_element":
              (el as HTMLElement).click();
              break;
            case "input_text":
              (el as HTMLInputElement).value = actionData.data.text || "";
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
              break;
            case "submit_form":
              (el as HTMLFormElement).submit();
              break;
            case "key_press":
              el.dispatchEvent(
                new KeyboardEvent("keydown", { key: actionData.data.key })
              );
              break;
            case "extract":
              return el.textContent || "";
            default:
              throw new Error(
                `Unsupported action in iframe: ${actionData.type}`
              );
          }
        },
        args: [el.frame, action],
      });
      return response?.[0]?.result;
    }
    return sendActionToTab(action, tabIdRef.value);
  };

  switch (action.type) {
    case "click":
    case "click_element":
    case "input_text":
    case "submit_form":
    case "key_press": {
      const el =
        elementIndex !== undefined ? getElementByIndex(elementIndex) : null;
      if (el) {
        action.data.selector = `${el.tagName}[data-index="${el.index}"]`;
      } else if (!action.data.selector) {
        throw new Error(
          `${logPrefix} No selector or valid index for ${action.type}`
        );
      }
      if (action.type === "key_press" && !action.data.key) {
        throw new Error(`${logPrefix} No key specified for key_press`);
      }
      console.log(`${logPrefix} Executing ${action.type}`, action.data);
      await sendActionWithIframe(action);
      break;
    }
    case "extract": {
      const el =
        elementIndex !== undefined ? getElementByIndex(elementIndex) : null;
      if (el) {
        action.data.selector = `${el.tagName}[data-index="${el.index}"]`;
      } else if (!action.data.selector) {
        throw new Error(`${logPrefix} No selector or valid index for extract`);
      }
      console.log(
        `${logPrefix} Extracting with selector: ${action.data.selector}`
      );
      return await sendActionWithIframe(action);
    }
    case "scroll":
      console.log(`${logPrefix} Scrolling`, action.data);
      await sendActionToTab(action, tabIdRef.value);
      break;
    case "done":
      console.log(`${logPrefix} Process completed`);
      throw new Error("PROCESS_COMPLETED"); // Use throw to signal completion
    default:
      throw new Error(`${logPrefix} Unknown action: ${action.type}`);
  }
}

function sendActionToTab(action: LocalAction, tabId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "PERFORM_ACTION", action },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response?.success) {
          resolve(response.result);
        } else {
          reject(new Error(response?.error || "Action failed"));
        }
      }
    );
  });
}
