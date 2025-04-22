import {
  GeminiFunctionCall,
  GeminiFunctionCallWrapper,
  PageElement,
  ReportCurrentStateArgs,
  UncompressedPageElement,
} from "./services/ai/interfaces";
import { executeAppsScriptFunction } from "./services/google/appsScript";
import { chatWithAI } from "./services/openai/api";
import { LocalAction } from "./types/actionType";
import { getGoogleDocUrlFromId } from "./utils/helpers";

let automationStopped: boolean = false;
const activeAutomationTabs: Set<number> = new Set();
const recentActionsMap: Record<number, string[]> = {};
const currentTasks: Record<number, string> = {};
const activePorts: Record<number, chrome.runtime.Port> = {};

// Constants for logging AI responses - REMOVED
// const LOG_SHEET_ID = "1tE_DOOyTp19XgHJd2esdOdQZEQMhEE0cDmr_731mhAA";
// const LOG_SHEET_NAME = "Sheet1"; // Assuming the first sheet is named Sheet1

chrome.action.onClicked.addListener(async (tab) => {
  console.log("[background.ts] Extension action clicked, tab:", tab);
  if (!tab?.id) return;
  chrome.sidePanel.open({ windowId: tab.windowId });
  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    enabled: true,
    path: "sidepanel.html",
  });
  await ensureContentScriptInjected(tab.id);
  activeAutomationTabs.delete(tab.id);
});

// Listener for when a tab is removed
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(`[background.ts] Tab removed: ${tabId}`);
  activeAutomationTabs.delete(tabId);
  delete activePorts[tabId];
  resetExecutionState(tabId); // Clean up state for removed tab
});

// Listener for when the active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log(`[background.ts] Tab activated: ${activeInfo.tabId}`);
  // Attempt to inject content script directly, ignoring errors if already present
  await ensureContentScriptInjected(activeInfo.tabId);
});

// Listener for when a tab is updated (e.g., URL change, page reload)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Inject after the page is complete and it's a valid URL
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    !tab.url.startsWith("chrome://") &&
    !tab.url.startsWith("about:")
  ) {
    console.log(
      `[background.ts] Tab updated and complete: ${tabId}, URL: ${tab.url}`
    );
    // Attempt to inject content script directly, ignoring errors if already present
    await ensureContentScriptInjected(tabId);
  }
});

// Simplified injection function - attempts injection and ignores common errors.
async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  console.log(
    `[background.ts] Attempting to inject content script into tab ${tabId} (ignoring if already present)`
  );
  try {
    // Check if tab exists and has a valid URL before attempting injection
    const tab = await chrome.tabs.get(tabId);
    if (
      !tab ||
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("about:") ||
      tab.url.startsWith("chrome-extension://") // Add this check
    ) {
      console.warn(
        `[background.ts] Skipping injection for invalid tab or URL: ${tabId}, URL: ${tab?.url}`
      );
      return false;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    console.log(
      `[background.ts] Content script injection attempt finished for tab ${tabId}`
    );
    return true; // Assume success (either injected or was already there and executeScript didn't throw)
  } catch (err: any) {
    // Log common non-critical errors, but don't treat them as failures for this function's purpose
    if (
      err.message?.includes("Cannot access a chrome:// URL") ||
      err.message?.includes("No tab with id") ||
      err.message?.includes("The tab was closed") ||
      err.message?.includes("Cannot access contents of the page") || // Often means script already injected or page denied access
      err.message?.includes("Missing host permission for the tab") ||
      err.message?.includes("Receiving end does not exist") || // Can indicate script already there or context issues
      err.message?.includes("Could not establish connection") // Similar to receiving end does not exist
    ) {
      console.warn(
        `[background.ts] Content script injection skipped/ignored for tab ${tabId}: ${err.message}`
      );
      return false; // Indicate injection didn't happen or wasn't needed
    } else {
      // Log unexpected errors
      console.error(
        `[background.ts] Unexpected injection error for tab ${tabId}:`,
        err
      );
      return false; // Indicate failure
    }
  }
}

async function fetchPageElements(tabId: number): Promise<{
  compressed: PageElement[];
  uncompressed: UncompressedPageElement[];
}> {
  console.log("[background.ts] Fetching fresh page elements for tab", tabId);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await new Promise<{
        compressed: PageElement[];
        uncompressed: UncompressedPageElement[];
      }>((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabId,
          { type: "GET_PAGE_ELEMENTS", tabId },
          (resp) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (resp && resp.compressed && resp.uncompressed) {
              console.log(
                "[background.ts] Fetched",
                resp.compressed.length,
                "elements"
              );
              resolve({
                compressed: resp.compressed,
                uncompressed: resp.uncompressed,
              });
            } else {
              reject(
                new Error(
                  "Invalid response received from content script for GET_PAGE_ELEMENTS"
                )
              );
            }
          }
        );
      });
      return result;
    } catch (err) {
      console.warn(
        "[background.ts] Fetch failed (attempt",
        attempt + 1,
        "):",
        err
      );
      await ensureContentScriptInjected(tabId);
    }
  }
  throw new Error(
    "[background.ts] Failed to fetch page elements after retries"
  );
}

async function getAllTabs(): Promise<string[]> {
  console.log("[background.ts] Fetching all tab URLs");
  const tabs = await chrome.tabs.query({});
  return tabs.map((t) => t.url ?? "");
}

const getTabUrl = (tabId: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (tab && tab.url) {
        resolve(tab.url);
      } else {
        reject("Tab URL not found");
      }
    });
  });
};

async function waitForPotentialNavigation(
  tabId: number,
  lastActionType: string
): Promise<void> {
  if (
    lastActionType === "go_to_url" ||
    lastActionType === "open_tab" ||
    lastActionType === "navigate"
  ) {
    await waitForTabLoad(tabId);
  } else if (lastActionType === "click" || lastActionType === "submit_form") {
    const initialUrl = await getTabUrl(tabId);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
    const currentUrl = await getTabUrl(tabId);
    if (currentUrl !== initialUrl) {
      await waitForTabLoad(tabId);
    }
  }
}

async function processCommand(
  tabId: number,
  contextMessage: string,
  initialCommand: string,
  actionHistory: string[] = [],
  model: string = "gemini"
) {
  if (automationStopped) {
    console.log("[background.ts] Automation stopped. Not processing.");
    return;
  }

  activeAutomationTabs.add(tabId);
  recentActionsMap[tabId] = recentActionsMap[tabId] || [];

  let pageState: PageElement[] = [];
  let uncompressedPageState: UncompressedPageElement[] = [];
  let screenshotDataUrl: string | null = null;
  let tabUrl: string = "";
  let allTabs: string[] = [];

  try {
    // --- Fetch initial state ---
    console.log(
      `[background.ts processCommand ${tabId}] Attempting to fetch page elements...`
    );
    const fetchStart = Date.now();
    try {
      const pageElementsResult = await fetchPageElements(tabId);
      pageState = pageElementsResult.compressed;
      uncompressedPageState = pageElementsResult.uncompressed;
      console.log(
        `[background.ts processCommand ${tabId}] Page elements fetched in ${
          Date.now() - fetchStart
        }ms`
      );
    } catch (err) {
      console.error(
        `[background.ts processCommand ${tabId}] Failed to fetch page elements after ${
          Date.now() - fetchStart
        }ms:`,
        err
      );
      await chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response:
          "Failed to fetch page elements: " +
          (err instanceof Error ? err.message : String(err)),
      });
      return; // Stop processing if page elements fail
    }

    await new Promise<void>(async (resolve) => {
      try {
        const targetTab = await chrome.tabs.get(tabId);
        if (!targetTab || typeof targetTab.windowId !== "number") {
          console.error("[background.ts] No valid tab or window");
          resolve();
          return;
        }
        chrome.tabs.captureVisibleTab(
          targetTab.windowId,
          { format: "jpeg", quality: 60 },
          (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
              console.error(
                "[background.ts] Failed to capture screenshot:",
                chrome.runtime.lastError?.message || "No data URL returned"
              );
              resolve(); // Resolve even if screenshot fails
              return;
            }
            chrome.tabs.sendMessage(
              tabId,
              { type: "RESIZE_SCREENSHOT", dataUrl },
              (response) => {
                if (response?.resizedDataUrl) {
                  screenshotDataUrl = response.resizedDataUrl;
                  console.log(
                    "[background.ts] Screenshot resized via content.js"
                  );
                } else {
                  console.warn(
                    "[background.ts] Failed to compress screenshot in content.js"
                  );
                  screenshotDataUrl = dataUrl; // Use original if resize fails
                }
                resolve();
              }
            );
          }
        );
      } catch (err) {
        console.error("[background.ts] Error getting tab info:", err);
        resolve(); // Resolve even if screenshot fails
      }
    });

    try {
      allTabs = await getAllTabs();
      tabUrl = await getTabUrl(tabId);
    } catch (error) {
      console.error("[background.ts] Tab URL/List error:", error);
      await chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response:
          "Failed to get tab URL/List: " +
          (error instanceof Error ? error.message : String(error)),
      });
      return; // Stop processing if tab info fails
    }

    if (!pageState.length) {
      console.warn("[background.ts] No elements found, aborting");
      await chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: "No page elements found, aborting command processing.",
      });
      return;
    }

    // --- Call AI ---
    const aiCurrentState = {
      elements: pageState,
      tabs: allTabs,
      currentTabUrl: tabUrl,
      actionHistory: actionHistory.slice(-3),
      screenshot: screenshotDataUrl,
    };
    console.log({ aiCurrentState }); // Log the state being sent

    const recentActionsStr = actionHistory.length
      ? `Recent actions: ${actionHistory.slice(-3).join(", ")}.`
      : "";
    const fullContextMessage = `${contextMessage}. ${recentActionsStr}`;
    console.log(
      "[background.ts] Sending context message to AI:",
      fullContextMessage
    );

    const raw = await chatWithAI(
      fullContextMessage,
      "session-id", // Consider making this dynamic if needed
      aiCurrentState,
      screenshotDataUrl || undefined,
      model as "gemini" | "claude"
    );
    console.log("[background.ts] Raw response from AI:", raw);

    if (!raw) {
      console.error("[background.ts] Received null response from chatWithAI.");
      chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: "AI provider returned no response.",
      });
      activeAutomationTabs.delete(tabId);
      return;
    }

    // --- Process AI Response ---
    const reportStateCall = raw.find(
      (callWrapper: GeminiFunctionCallWrapper) =>
        callWrapper.functionCall.name === "reportCurrentState"
    );

    if (!reportStateCall) {
      console.error(
        "[background.ts] Mandatory 'reportCurrentState' function call missing in AI response."
      );
      chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: "AI response missing mandatory state report. Aborting.",
      });
      activeAutomationTabs.delete(tabId);
      return;
    }

    const reportArgs = reportStateCall.functionCall
      .args as ReportCurrentStateArgs;
    const current_state = reportArgs.current_state; // Define current_state here
    console.log(
      "[background.ts] Extracted current_state from reportCurrentState args:",
      current_state
    );

    if (!current_state) {
      console.warn("[background.ts] No valid current_state found, stopping");
      await chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: "No valid state returned from AI, aborting.",
      });
      return;
    }

    // Filter out reportCurrentState to get action calls
    const actionCalls = raw.filter(
      (callWrapper: GeminiFunctionCallWrapper) =>
        callWrapper.functionCall.name !== "reportCurrentState"
    );
    console.log("[background.ts] Extracted action calls:", actionCalls);

    // Add initial command to state
    current_state.user_command = initialCommand;

    const {
      evaluation_previous_goal: evaluation,
      memory,
      user_command,
    } = current_state;

    const tabIdRef = { value: tabId };

    // Update memory if available
    if (memory) {
      chrome.runtime.sendMessage({ type: "MEMORY_UPDATE", response: memory });
      chrome.tabs.sendMessage(tabIdRef.value, {
        type: "MEMORY_UPDATE",
        response: memory,
      });
    } else {
      console.warn("[background.ts] No memory object found in current_state");
    }

    // If no action calls, finish processing
    if (!actionCalls.length) {
      console.log(
        "[background.ts] No actions besides reportCurrentState, process complete"
      );
      chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: evaluation || "Task likely completed (no further actions).",
      });
      resetExecutionState(tabId);
      activeAutomationTabs.clear();
      return;
    }

    // Execute function calls in sequence
    const executedActions: string[] = [];
    let result: any = null;
    let lastActionType: string | null = null;

    // Process each function call in order
    for (let i = 0; i < actionCalls.length; i++) {
      const functionCall = actionCalls[i].functionCall;
      const functionName = functionCall.name;
      const args = functionCall.args;

      console.log(
        `[background.ts] Executing function call ${i + 1}/${
          actionCalls.length
        }: ${functionName}`,
        args
      );

      try {
        // Handle Google Workspace functions
        if (
          [
            "createNewGoogleDoc",
            "callWorkspaceAppsScript",
            "insertStructuredDocContent",
          ].includes(functionName)
        ) {
          try {
            const result = await executeAppsScriptFunction(functionName, args);
            console.log(
              "[background.ts] Google Workspace function call executed successfully:",
              result
            );
            // Stop automation after successful Apps Script execution
            automationStopped = true;
            console.log(
              "[background.ts] Automation stopped due to successful Apps Script execution."
            );
            await chrome.runtime.sendMessage({
              type: "COMMAND_RESPONSE",
              response: {
                message: result.status,
                output: `url: ${
                  result.fileId
                    ? getGoogleDocUrlFromId(result.fileId)
                    : result.newDocUrl
                }`,
              },
            });
            executedActions.push(
              `Executed Google Workspace function: ${functionName}`
            );
            continue;
          } catch (error) {
            console.error(
              "[background.ts] Google Workspace function call failed:",
              error
            );
            await chrome.runtime.sendMessage({
              type: "COMMAND_RESPONSE",
              response: {
                message:
                  "Google Workspace function execution failed: " +
                  (error as Error).message,
              },
            });
            throw error; // Re-throw to be caught by the outer try-catch
          }
        }

        // Handle DOM interaction functions
        else if (["click_element", "clickElement"].includes(functionName)) {
          const index = (args as any).index;
          if (typeof index !== "number") {
            throw new Error(`Invalid index for ${functionName}: ${index}`);
          }
          await sendActionToTab(
            {
              id: Date.now().toString(),
              type: "click_element", // Map to valid LocalActionType
              data: { index },
              description: functionName, // Keep original name here
            },
            tabIdRef.value
          );
          executedActions.push(`Clicked on element at index ${index}`);
          lastActionType = "click"; // Keep simplified type for navigation check
        } else if (["input_text", "inputText"].includes(functionName)) {
          const index = (args as any).index;
          const text = (args as any).text ?? ""; // Ensure text is string
          if (typeof index !== "number") {
            throw new Error(`Invalid index for ${functionName}: ${index}`);
          }
          await sendActionToTab(
            {
              id: Date.now().toString(),
              type: "input_text", // Map to valid LocalActionType
              data: { index, text },
              description: functionName, // Keep original name here
            },
            tabIdRef.value
          );
          executedActions.push(`Entered text "${text}" at index ${index}`);
        } else if (["submit_form", "submitForm"].includes(functionName)) {
          const index = (args as any).index;
          if (typeof index !== "number") {
            throw new Error(`Invalid index for ${functionName}: ${index}`);
          }
          await sendActionToTab(
            {
              id: Date.now().toString(),
              type: "submit_form", // Map to valid LocalActionType
              data: { index },
              description: functionName, // Keep original name here
            },
            tabIdRef.value
          );
          executedActions.push(`Submitted form at index ${index}`);
          lastActionType = "submit_form"; // Keep simplified type for navigation check
        } else if (["key_press", "keyPress"].includes(functionName)) {
          const index = (args as any).index;
          const key = (args as any).key;
          if (typeof index !== "number") {
            throw new Error(`Invalid index for ${functionName}: ${index}`);
          }
          if (typeof key !== "string") {
            throw new Error(`Invalid key for ${functionName}: ${key}`);
          }
          await sendActionToTab(
            {
              id: Date.now().toString(),
              type: "key_press", // Map to valid LocalActionType
              data: { index, key },
              description: functionName, // Keep original name here
            },
            tabIdRef.value
          );
          executedActions.push(`Pressed key "${key}" at index ${index}`);
        } else if (
          ["extract_content", "extractContent"].includes(functionName)
        ) {
          const index = (args as any).index;
          if (typeof index !== "number") {
            throw new Error(`Invalid index for ${functionName}: ${index}`);
          }
          result = await sendActionToTab(
            {
              id: Date.now().toString(),
              type: "extract", // Map to valid LocalActionType
              data: { index },
              description: functionName, // Keep original name here
            },
            tabIdRef.value
          );
          executedActions.push(
            `Extracted content from element at index ${index}: "${result}"`
          );
        } else if (
          ["go_to_url", "goToUrl", "navigate"].includes(functionName)
        ) {
          const url = (args as any).url;
          if (!url) {
            throw new Error(`No URL provided for ${functionName}`);
          }
          await navigateTab(tabIdRef.value, url);
          executedActions.push(`Navigated to ${url}`);
          lastActionType = "navigate"; // Keep simplified type for navigation check
        } else if (["open_tab", "openTab"].includes(functionName)) {
          const url = (args as any).url;
          if (!url) {
            throw new Error(`No URL provided for ${functionName}`);
          }
          const newTab = await createTab(url);
          if (newTab.id) tabIdRef.value = newTab.id;
          executedActions.push(`Opened new tab with URL ${url}`);
          lastActionType = "open_tab"; // Keep simplified type for navigation check
        } else if (functionName === "scroll") {
          const direction = (args as any).direction;
          const offset = (args as any).offset;
          if (direction !== "up" && direction !== "down") {
            throw new Error(`Invalid direction for scroll: ${direction}`);
          }
          if (typeof offset !== "number") {
            throw new Error(`Invalid offset for scroll: ${offset}`);
          }
          await sendActionToTab(
            {
              id: Date.now().toString(),
              type: "scroll", // Map to valid LocalActionType
              data: { direction, offset },
              description: functionName, // Keep original name here
            },
            tabIdRef.value
          );
          executedActions.push(`Scrolled ${direction} by ${offset} pixels`);
        } else if (functionName === "verify") {
          const url = (args as any).url;
          if (!url) {
            throw new Error(`No URL provided for ${functionName}`);
          }
          await verifyOrOpenTab(url, tabIdRef);
          executedActions.push(`Verified URL contains ${url}`);
        } else if (functionName === "ask") {
          const question =
            (args as any).question || "Please provide instructions.";
          console.log(`[background.ts] Asking: ${question}`);
          automationStopped = true; // Pause automation
          chrome.runtime.sendMessage({
            type: "UPDATE_SIDEPANEL",
            question: question,
          });
          executedActions.push(`Asked question: "${question}"`);
          return "ASK_PAUSED"; // Signal that execution is paused
        } else if (functionName === "done") {
          console.log(`[background.ts] Tasks completed`);
          const message = (args as any).message || "Task completed.";
          const output = (args as any).output;
          const response = { message, output };
          chrome.runtime.sendMessage({
            type: "COMMAND_RESPONSE",
            response,
          });
          automationStopped = true;
          executedActions.push(`Completed task: ${message}`);
          return "DONE";
        } else if (functionName === "refetch") {
          console.log("[background.ts] Refetch action detected, will loop...");
          executedActions.push("Re-fetched page elements");
        } else {
          console.warn(
            `[background.ts] Unknown function call: ${functionName}`,
            args
          );
          executedActions.push(`Unknown function: ${functionName}`);
        }

        // Check if navigation might have occurred and wait if needed
        if (lastActionType) {
          await waitForPotentialNavigation(tabIdRef.value, lastActionType);
          lastActionType = null;
        }
      } catch (error) {
        console.error(
          `[background.ts] Error executing function ${functionName}:`,
          error
        );
        const errorMessage = `Function ${functionName} failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
        chrome.runtime.sendMessage({
          type: "DISPLAY_MESSAGE",
          response: { message: errorMessage },
        });

        // For critical errors, stop automation
        if (["navigate", "open_tab", "verify"].includes(functionName)) {
          automationStopped = true;
          await chrome.runtime.sendMessage({
            type: "FINISH_PROCESS_COMMAND",
            response: errorMessage,
          });
          resetExecutionState(tabId);
          activeAutomationTabs.delete(tabId);
          return;
        }
      }
    }

    // Update recent actions
    recentActionsMap[tabId] = [
      ...recentActionsMap[tabId],
      ...executedActions,
    ].slice(-5);

    // Prepare prompt for next iteration
    const promptParts = [
      evaluation ? `Evaluation: ${evaluation}` : "",
      memory ? `Memory: ${JSON.stringify(memory)}` : "",
      user_command ? `Objective: ${user_command}` : "",
      result && typeof result === "string" ? `Extracted: ${result}` : "",
      "Provide next actions to achieve the goal.",
    ]
      .filter(Boolean)
      .join(". ");

    // Continue processing if not stopped
    if (!automationStopped) {
      await processCommand(
        tabIdRef.value,
        promptParts,
        initialCommand,
        recentActionsMap[tabId],
        model
      );
    }
  } catch (err) {
    console.error("[background.ts] Error in processCommand:", err);
    await handleError(
      err,
      tabId,
      contextMessage,
      initialCommand,
      actionHistory,
      model
    );
  }
}

async function handleError(
  err: any,
  tabId: number,
  contextMessage: string,
  initialCommand: string,
  actionHistory: string[],
  model: string
) {
  const tabIdRef = { value: tabId };
  if (err.message?.includes("quota") || err.message?.includes("429")) {
    const message = err.message.includes("quota")
      ? "API Quota Exhausted. Try again later."
      : "Rate limit hit. Retrying in 60s.";
    chrome.tabs.sendMessage(tabIdRef.value, {
      type: "DISPLAY_MESSAGE",
      response: { message },
    });
    if (err.message.includes("quota")) {
      await chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: message,
      });
      automationStopped = true;
    } else if (err.message.includes("429")) {
      setTimeout(
        () =>
          processCommand(
            tabId,
            contextMessage,
            initialCommand,
            actionHistory,
            model
          ),
        60000
      );
    }
  } else {
    const errorMessage = `Command processing failed: ${
      err instanceof Error ? err.message : String(err)
    }`;
    chrome.tabs.sendMessage(tabIdRef.value, {
      type: "DISPLAY_MESSAGE",
      response: { message: errorMessage },
    });
    await chrome.runtime.sendMessage({
      type: "FINISH_PROCESS_COMMAND",
      response: errorMessage,
    });
    automationStopped = true;
  }
  resetExecutionState(tabId);
  activeAutomationTabs.delete(tabId);
}

function resetExecutionState(tabId: number) {
  recentActionsMap[tabId] = [];
  delete currentTasks[tabId];
}

// No replacement needed - removing these functions

async function verifyOrOpenTab(urlPart: string, tabIdRef: { value: number }) {
  const tabs = await chrome.tabs.query({});
  const found = tabs.find((t) => t.url?.includes(urlPart));
  if (found?.id) {
    await chrome.tabs.update(found.id, { active: true });
    activeAutomationTabs.add(found.id);
    await waitForTabLoad(found.id);
    tabIdRef.value = found.id;
  } else {
    const newTab = await createTab(`https://${urlPart}`);
    if (newTab?.id) {
      tabIdRef.value = newTab.id;
      activeAutomationTabs.add(newTab.id);
    }
  }
}

/**
 * Sends an action to the content script for execution.
 * This function creates a GeminiFunctionCall object and sends it to the content script.
 *
 * @param action The action to execute
 * @param tabId The ID of the tab to send the action to
 * @returns A promise that resolves with the result of the action
 */
async function sendActionToTab(
  action: LocalAction,
  tabId: number
): Promise<any> {
  await ensureContentScriptInjected(tabId);

  // Create a GeminiFunctionCall object from the LocalAction
  // Use action.description (original AI function name) for the name sent to content script
  // Cast action.data to any to avoid TypeScript errors with optional properties
  const functionCall: GeminiFunctionCall = {
    name: action.description || action.type, // Prioritize original name from description
    args: action.data as any,
  };

  // Add logging to verify the name being sent
  console.log(
    `[background.ts sendActionToTab] Sending function call with name: ${functionCall.name}`,
    functionCall
  );

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "PERFORM_ACTION", functionCall },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response?.success) {
          resolve(response.result);
        } else {
          reject(
            new Error(response?.error || "Action failed in content script")
          );
        }
      }
    );
  });
}

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === "PROCESS_COMMAND") {
    automationStopped = false;
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!activeTab?.id) {
      await chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: "No active tab found, aborting command processing.",
      });
      sendResponse({ success: false, error: "No active tab" });
      return true; // Indicate async response
    }
    recentActionsMap[activeTab.id] = [];
    currentTasks[activeTab.id] = msg.command; // Store the initial command as the task
    processCommand(
      activeTab.id,
      msg.command,
      msg.command,
      [],
      msg.model || "gemini"
    )
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
        console.error("Error starting processCommand:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Indicate async response
  } else if (msg.type === "NEW_CHAT") {
    chrome.storage.local.set({ conversationHistory: [] }, () => {
      sendResponse({ success: true });
    });
    return true; // Indicate async response
  } else if (msg.type === "STOP_AUTOMATION") {
    automationStopped = true;
    activeAutomationTabs.clear(); // Clear all active tabs on stop
    // Optionally reset state for all tabs if needed
    // Object.keys(recentActionsMap).forEach(tabIdStr => {
    //   resetExecutionState(parseInt(tabIdStr));
    // });
    console.log("[background.ts] Automation stopped by user.");
    sendResponse({ success: true });
  } else if (msg.type === "GET_TAB_ID") {
    if (sender.tab?.id) {
      console.log(
        `[background.ts] Responding to GET_TAB_ID from tab: ${sender.tab.id}`
      );
      sendResponse({ success: true, tabId: sender.tab.id });
    } else {
      console.error(
        "[background.ts] GET_TAB_ID received, but sender tab ID is missing."
      );
      sendResponse({ success: false, error: "Sender tab ID not found" });
    }
    // No return true needed here as it's synchronous
  }
  // Return true for other async listeners if any, otherwise false/undefined is fine
  return false;
});

chrome.runtime.onConnect.addListener((port) => {
  console.log(`[background.ts] Port connected: ${port.name}`);
  // Extract tabId correctly from names like "content-script-12345" or "sidepanel-12345"
  const nameParts = port.name.split("-");
  const tabIdStr = nameParts[nameParts.length - 1];
  const tabId = parseInt(tabIdStr, 10);

  if (!isNaN(tabId)) {
    console.log(
      `[background.ts] Parsed tabId ${tabId} from port name ${port.name}`
    );
    activePorts[tabId] = port;
    port.onDisconnect.addListener(() => {
      console.log(`[background.ts] Port disconnected: ${port.name}`);
      delete activePorts[tabId];
      // Optionally stop automation if the sidepanel disconnects?
      // if (activeAutomationTabs.has(tabId)) {
      //   console.log(`[background.ts] Stopping automation for disconnected tab ${tabId}`);
      //   automationStopped = true;
      //   activeAutomationTabs.delete(tabId);
      //   resetExecutionState(tabId);
      // }
    });
  } else {
    console.error(
      `[background.ts] Invalid port name (not a number): ${port.name}`
    );
  }

  // Note: Keep_Alive listener removed as it's not standard practice
  // and might prevent the background script from becoming inactive.
});

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise(async (resolve) => {
    let observer: MutationObserver | null = null as MutationObserver | null;
    let contentScriptChecked = false;
    const startTime = Date.now();
    const MAX_WAIT = 5000; // Reduced to 5 seconds max
    const POLL_INTERVAL = 500;
    console.log(
      `[background.ts waitForTabLoad ${tabId}] Starting wait (max ${MAX_WAIT}ms)`
    );

    const checkDOMReady = async () => {
      try {
        // First ensure content script is injected
        if (!contentScriptChecked) {
          await ensureContentScriptInjected(tabId);
          contentScriptChecked = true;
        }

        // Check via content script if DOM is interactive
        const isReady = await new Promise<boolean>((resolve) => {
          chrome.tabs.sendMessage(
            tabId,
            { type: "CHECK_DOM_READY" },
            (response) => {
              resolve(response?.ready === true);
            }
          );
        });

        if (isReady) {
          console.log(
            `[background.ts] Tab ${tabId} DOM ready in ${
              Date.now() - startTime
            }ms`
          );
          cleanup();
          resolve();
          return true;
        }
      } catch (error) {
        console.warn(`[background.ts] DOM check error:`, error);
      }
      return false;
    };

    const cleanup = () => {
      if (observer) {
        observer.disconnect();
      }
      clearTimeout(timeoutId);
      chrome.tabs.onUpdated.removeListener(urlChangeListener);
    };

    const urlChangeListener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "loading") {
        // Reset checks if navigation starts again
        contentScriptChecked = false;
      }
    };

    // Track URL changes
    chrome.tabs.onUpdated.addListener(urlChangeListener);

    // Progressive checking
    const checkInterval = setInterval(async () => {
      if ((await checkDOMReady()) || Date.now() - startTime > MAX_WAIT) {
        clearInterval(checkInterval);
        cleanup();
        resolve();
      }
    }, POLL_INTERVAL);

    // Initial check
    if (await checkDOMReady()) {
      clearInterval(checkInterval);
      cleanup();
      resolve();
      return;
    }

    // Fallback timeout
    const timeoutId = setTimeout(() => {
      console.warn(
        `[background.ts] Tab ${tabId} load timeout after ${MAX_WAIT}ms`
      );
      console.warn(
        `[background.ts waitForTabLoad ${tabId}] Timeout after ${MAX_WAIT}ms`
      );
      cleanup();
      resolve(); // Resolve even on timeout
    }, MAX_WAIT);
  });
}

async function navigateTab(tabId: number, url: string): Promise<void> {
  await chrome.tabs.update(tabId, { url });
  activeAutomationTabs.add(tabId);
  await waitForTabLoad(tabId);
  await ensureContentScriptInjected(tabId);
}

async function createTab(url: string): Promise<chrome.tabs.Tab> {
  const tab = await chrome.tabs.create({ url });
  if (!tab.id) {
    throw new Error("Failed to create tab or tab ID is missing.");
  }
  await waitForTabLoad(tab.id);
  await ensureContentScriptInjected(tab.id);
  activeAutomationTabs.add(tab.id); // Ensure new tab is marked active
  return tab;
}
