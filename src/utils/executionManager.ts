import { LocalAction } from "../types/actionType";
import { PageElement } from "../services/ai/interfaces";

/**
 * Recursively searches for an element using a selector, including elements inside nested iframes.
 * @param selector - The CSS selector to find the element.
 * @param doc - The document or iframe document to search within (default is the main document).
 * @returns The first matching element, or null if no match is found.
 */
export function querySelectorWithIframes(
  selector: string,
  doc: Document = document
): { element: Element | null; ownerDocument: Document } {
  const element = doc.querySelector(selector);
  if (element) {
    return { element, ownerDocument: doc };
  }

  const iframes = doc.querySelectorAll("iframe");
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument;
      if (iframeDoc) {
        const result = querySelectorWithIframes(selector, iframeDoc);
        if (result.element) return result;
      }
    } catch (error) {
      console.warn(
        `[querySelectorWithIframes] Could not access iframe content:`,
        error
      );
    }
  }

  return { element: null, ownerDocument: doc };
}

export async function executeLocalActions(
  actions: LocalAction[],
  index: number,
  tabIdRef: { value: number },
  contextMsg: string,
  evaluation?: string,
  pageElements: PageElement[] = []
) {
  if (index >= actions.length) {
    // All actions have been executed.
    return;
  }

  const action = actions[index];

  try {
    await performLocalAction(action, tabIdRef, pageElements);
    // Proceed to the next action.
    await executeLocalActions(
      actions,
      index + 1,
      tabIdRef,
      contextMsg,
      evaluation,
      pageElements
    );
  } catch (err) {
    console.error("[executeLocalActions] Error executing action:", err);
    throw err;
  }
}

async function performLocalAction(
  action: LocalAction,
  tabIdRef: { value: number },
  pageElements: PageElement[]
) {
  switch (action.type) {
    case "click":
    case "input_text":
    case "submit_form":
    case "key_press":
    case "extract": {
      const elementIndex = action.data.index;
      if (typeof elementIndex === "number") {
        const foundEl = pageElements.find((pe) => pe.index === elementIndex);
        if (!foundEl) {
          throw new Error(`Element not found for index ${elementIndex}`);
        }
        action.data.selector = foundEl.selector;
      }
      await sendActionToActiveTab(action);
      break;
    }
    case "scroll":
      await sendActionToActiveTab(action);
      break;
    case "done":
      throw new Error("PROCESS_COMPLETED");
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function sendActionToActiveTab(action: LocalAction): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "PERFORM_ACTION", action },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      } else {
        reject("No active tab found");
      }
    });
  });
}
