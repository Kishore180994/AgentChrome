import { CurrentState } from "./types/responseFormat";
import { PageElement } from "./services/ai/interfaces";
import { chatWithAI } from "./services/openai/api";
import {
  AgentActionItem,
  LocalAction,
  LocalActionType,
} from "./types/actionType";
import {
  generateRandomHash,
  uploadScreenshot,
} from "./services/s3UploadService";

let automationStopped: boolean = false;
const s3UploadUserHash = generateRandomHash();
const activeAutomationTabs: Set<number> = new Set();
const executionHistories: Record<
  number,
  { step: string; status: "pending" | "success" | "failed"; message?: string }[]
> = {};
const recentActionsMap: Record<number, string[]> = {};
const currentTasks: Record<number, string> = {};
const activePorts: Record<number, chrome.runtime.Port> = {};
let showHorizontalBarDebounce: { [tabId: number]: NodeJS.Timeout } = {};

function debounceShowHorizontalBar(tabId: number, delay: number = 1000): void {
  if (showHorizontalBarDebounce[tabId]) {
    clearTimeout(showHorizontalBarDebounce[tabId]);
  }
  showHorizontalBarDebounce[tabId] = setTimeout(() => {
    sendMessageToContent(tabId, { type: "SHOW_HORIZONTAL_BAR" });
    delete showHorizontalBarDebounce[tabId];
  }, delay);
}

async function captureAndUploadScreenshot(tabId: number): Promise<string> {
  let screenshot: string | null = null;

  try {
    // Retrieve the tab to get its window id
    const tab = await chrome.tabs.get(tabId);
    // Use the windowId for capturing the visible tab
    screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
    });
  } catch (err) {
    console.error("[background.ts] Error capturing screenshot:", err);
    throw err;
  }

  // Use the modular S3 upload service
  try {
    // Pass screenshot first and tabId second as expected by uploadScreenshot
    const screenshotLink = await uploadScreenshot(s3UploadUserHash, screenshot);
    return screenshotLink;
  } catch (err) {
    console.error("[background.ts] Error uploading screenshot to S3:", err);
    throw err;
  }
}

/********************************************************
 * 4) Utility: sendExecutionUpdate
 ********************************************************/
function sendExecutionUpdate(tabId: number) {
  const history = executionHistories[tabId] || [];
  console.log(
    "[background.ts] Sending execution update to tab",
    tabId,
    ":",
    history
  );
  try {
    chrome.tabs.sendMessage(tabId, {
      type: "EXECUTION_UPDATE",
      taskHistory: history,
    });
  } catch (err) {
    console.warn(
      "[background.ts] Failed to send exec update to tab",
      tabId,
      ":",
      err
    );
  }
}

/********************************************************
 * 5) Toggle Sidebar & Content Script Injection
 ********************************************************/
chrome.action.onClicked.addListener(async (tab) => {
  console.log("[background.ts] Extension action clicked, tab:", tab);
  if (!tab?.id) return;
  await ensureContentScriptInjected(tab.id);
  sendMessageToContent(tab.id, { type: "TOGGLE_SIDEBAR" });
  if (activeAutomationTabs.has(tab.id)) {
    activeAutomationTabs.delete(tab.id); // Clear any prior automation state
  }
});

function sendMessageToContent(tabId: number, msg: any) {
  console.log(
    "[background.ts] Sending message to content script on tab",
    tabId,
    ":",
    msg
  );
  if (activePorts[tabId]) {
    activePorts[tabId].postMessage(msg);
  } else {
    ensureContentScriptInjected(tabId).then(() => {
      chrome.tabs.sendMessage(tabId, msg);
    });
  }
}

chrome.tabs.onRemoved.addListener((tabId, _removeInfo) => {
  activeAutomationTabs.delete(tabId);
});

async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  console.log(
    "[background.ts] Ensuring content script is injected for tab",
    tabId
  );
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "PING" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        console.log(
          "[background.ts] No response to PING, injecting content script on tab",
          tabId
        );
        chrome.scripting
          .executeScript({ target: { tabId }, files: ["content.js"] })
          .then(() => {
            setTimeout(() => {
              console.log(
                "[background.ts] Content script injected on tab",
                tabId
              );
              // Only show horizontal bar if tab is in active automation and debounce
              if (activeAutomationTabs.has(tabId)) {
                debounceShowHorizontalBar(tabId);
              }
              resolve(true);
            }, 500);
          })
          .catch((err) => {
            console.error(
              "[background.ts] Error injecting content script:",
              err
            );
            resolve(false);
          });
      } else {
        console.log(
          "[background.ts] Content script already active on tab",
          tabId
        );
        // Only show horizontal bar if tab is in active automation and debounce
        if (activeAutomationTabs.has(tabId)) {
          debounceShowHorizontalBar(tabId);
        }
        resolve(true);
      }
    });
  });
}

/********************************************************
 * 6) Gather Page Elements + All Tabs
 ********************************************************/
async function fetchPageElements(
  tabId: number,
  retries = 3
): Promise<PageElement[]> {
  console.log("[background.ts] Fetching page elements for tab", tabId);
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const elements = await new Promise<PageElement[]>((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabId,
          { type: "GET_PAGE_ELEMENTS" },
          (resp) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "[background.ts] Failed to fetch page elements (attempt",
                attempt + 1,
                "):",
                chrome.runtime.lastError.message
              );
              reject(chrome.runtime.lastError);
            } else {
              console.log(
                "[background.ts] Fetched",
                resp.elements.length,
                "page elements"
              );
              resolve(resp.elements);
            }
          }
        );
      });
      return elements;
    } catch (err) {
      if (
        (err as Error).message?.includes("back/forward cache") ||
        (err as Error).message?.includes("Receiving end does not exist")
      ) {
        console.warn("[background.ts] Connection issue detected, retrying...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await ensureContentScriptInjected(tabId);
      } else {
        throw err;
      }
    }
  }
  throw new Error(
    "[background.ts] Failed to fetch page elements after retries"
  );
}

async function getAllTabs(): Promise<string[]> {
  console.log("[background.ts] Fetching all tab URLs");
  const tabs = await chrome.tabs.query({});
  const urls = tabs.map((t) => t.url ?? "");
  console.log("[background.ts] Retrieved", urls.length, "tab URLs:", urls);
  return urls;
}

const getTabUrl = (tabId: number): Promise<string> => {
  console.log("[background.ts] Getting URL for tab", tabId);
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.error(
          "[background.ts] Error getting tab URL:",
          chrome.runtime.lastError.message
        );
        return reject(chrome.runtime.lastError);
      }
      if (tab && tab.url) {
        console.log("[background.ts] Tab URL retrieved:", tab.url);
        resolve(tab.url);
      } else {
        console.error("[background.ts] Tab URL not found for tab", tabId);
        reject("Tab URL not found");
      }
    });
  });
};

/********************************************************
 * 7) The main "processCommand"
 ********************************************************/
async function processCommand(
  tabId: number,
  contextMessage: string,
  initialCommand: string,
  actionHistory: string[] = []
) {
  // If automation has been stopped, do nothing
  if (automationStopped) {
    console.log(
      "[background.ts] Automation has been stopped. Not processing further commands."
    );
    return;
  }
  // Add tab to active automation tabs
  activeAutomationTabs.add(tabId);

  if (!executionHistories[tabId]) {
    executionHistories[tabId] = [];
  }
  if (!recentActionsMap[tabId]) {
    recentActionsMap[tabId] = [];
  }

  console.log(
    "[background.ts] recentActionsMap for tab",
    tabId,
    ":",
    recentActionsMap[tabId]
  );

  const pageState = await fetchPageElements(tabId);
  const allTabs = await getAllTabs();

  let tabUrl: string;
  try {
    tabUrl = await getTabUrl(tabId);
  } catch (error) {
    console.error(
      "[background.ts] Aborting processCommand due to tab URL error:",
      error
    );
    return;
  }

  if (!pageState || pageState.length === 0) {
    console.warn(
      "[background.ts] No valid elements found, aborting AI request"
    );
    return;
  }

  const currentState = {
    elements: pageState,
    tabs: allTabs,
    currentTabUrl: tabUrl,
    actionHistory: actionHistory.slice(-3),
  };
  console.log("[background.ts] Current state prepared:", currentState);

  try {
    const recentActionsStr = actionHistory.length
      ? `Recent actions: ${actionHistory
          .slice(-3)
          .join(", ")}. Consider these when suggesting the next steps.`
      : "";
    const fullContextMessage = `${contextMessage}. ${recentActionsStr}`;

    console.log("[background.ts] Calling AI with context:", fullContextMessage);
    // const screenShotLink = await captureAndUploadScreenshot(tabId);
    const raw = await chatWithAI(
      fullContextMessage,
      "session-id",
      currentState
    );
    console.log("[background.ts] Received raw AI response:", raw);

    const { current_state, action } = raw;
    if (!current_state || !action) {
      console.warn("[background.ts] Missing current_state or action, stopping");
      return;
    }

    current_state.user_command = initialCommand;

    const {
      page_summary,
      evaluation_previous_goal: evaluation,
      memory,
      next_goal,
      user_command,
    } = current_state;

    console.log("[background.ts] AI response parsed:", {
      page_summary,
      evaluation,
      memory,
      next_goal,
      user_command,
    });

    currentTasks[tabId] = next_goal || "Processing...";
    executionHistories[tabId].push({
      step: currentTasks[tabId],
      status: "pending",
    });
    sendExecutionUpdate(tabId);

    if (!action.length) {
      console.log(
        "[background.ts] No actions returned, process possibly complete"
      );
      executionHistories[tabId][executionHistories[tabId].length - 1].status =
        "success";
      executionHistories[tabId][
        executionHistories[tabId].length - 1
      ].message = `Success - Completed: ${currentTasks[tabId]}`;
      sendExecutionUpdate(tabId);
      resetExecutionState(tabId);

      // Close horizontal bar and open vertical sidebar for all active tabs
      for (const activeTabId of activeAutomationTabs) {
        chrome.tabs.sendMessage(activeTabId, { type: "HIDE_HORIZONTAL_BAR" });
        chrome.tabs.sendMessage(activeTabId, { type: "TOGGLE_SIDEBAR" });
      }
      activeAutomationTabs.clear();
      return;
    }

    const localActions: LocalAction[] = action.map(mapAiItemToLocalAction);
    console.log(
      "[background.ts] Mapped",
      localActions.length,
      "local actions:",
      localActions
    );

    const tabIdRef = { value: tabId };
    console.log(
      "[background.ts] Starting action execution with tabIdRef:",
      tabIdRef.value
    );

    const executedActions: string[] = [];
    const resultBack = await executeLocalActions(
      localActions,
      0,
      tabIdRef,
      contextMessage,
      current_state,
      pageState,
      executedActions
    );

    console.log(`[background.ts] Extracted content: ${resultBack}`);
    // Check if "done" was the last action
    const doneAction = localActions.find((a) => a.type === "done");
    if (doneAction) {
      // Set the global flag to prevent further AI calls until a new command is issued.
      automationStopped = true;
      // Close horizontal bar and open vertical sidebar for all active tabs
      for (const activeTabId of activeAutomationTabs) {
        chrome.tabs.sendMessage(activeTabId, { type: "HIDE_HORIZONTAL_BAR" });
        chrome.tabs.sendMessage(activeTabId, { type: "TOGGLE_SIDEBAR" });
      }

      chrome.tabs.sendMessage(tabIdRef.value, {
        type: "DISPLAY_MESSAGE",
        response: doneAction,
      });
      return;
    }

    executionHistories[tabId][executionHistories[tabId].length - 1].status =
      "success";
    executionHistories[tabId][
      executionHistories[tabId].length - 1
    ].message = `Success - Completed: ${currentTasks[tabId]}`;
    sendExecutionUpdate(tabId);

    recentActionsMap[tabId] = [
      ...recentActionsMap[tabId],
      ...executedActions,
    ].slice(-5);

    const memoryPart = memory ? `Summary of previous actions: ${memory}` : "";
    const goalPart = next_goal ? `Next step to perform: ${next_goal}` : "";
    const objectivePart = user_command
      ? `Ultimate objective: ${user_command}`
      : "";
    const extractedContent = resultBack
      ? `Extracted content: ${resultBack}`
      : "";
    const promptParts = [
      evaluation ? `Evaluation of previous goal: ${evaluation}` : "",
      memoryPart,
      goalPart,
      objectivePart,
      extractedContent,
      "Based on the current state and the screenshot (if provided), provide the next specific actions to achieve the next goal while considering the main objective.",
    ]
      .filter(Boolean)
      .join(". ");

    console.log(
      "[background.ts] Calling processCommand with next prompt:",
      promptParts
    );
    await processCommand(
      tabIdRef.value,
      promptParts,
      initialCommand,
      recentActionsMap[tabId]
    );
  } catch (err) {
    console.error("[background.ts] Error in processCommand:", err);
    if (executionHistories[tabId].length > 0) {
      executionHistories[tabId][executionHistories[tabId].length - 1].status =
        "failed";
      executionHistories[tabId][
        executionHistories[tabId].length - 1
      ].message = `Failed - ${String(err)}`;
      sendExecutionUpdate(tabId);
    }
    if (
      err instanceof Error &&
      (err.message.includes("429") || err.message.includes("quota"))
    ) {
      console.warn("[background.ts] API quota exhausted, pausing execution");
      executionHistories[tabId].push({
        step: "API Quota Exhausted",
        status: "failed",
        message: "Resource limit reached, retrying in 1 minute.",
      });
      sendExecutionUpdate(tabId);
      await new Promise((resolve) => setTimeout(resolve, 60000));
      await processCommand(
        tabId,
        contextMessage,
        initialCommand,
        actionHistory
      );
    }
  }
  console.log("[background.ts] processCommand completed for tab", tabId);
}

// **Reset Execution State**
function resetExecutionState(tabId: number) {
  console.log("[background.ts] Resetting execution state for tab", tabId);
  executionHistories[tabId] = [];
  recentActionsMap[tabId] = [];
  delete currentTasks[tabId];
  sendExecutionUpdate(tabId);
}

/********************************************************
 * 8) Convert AgentActionItem => local "Action"
 ********************************************************/
function mapAiItemToLocalAction(item: AgentActionItem): LocalAction {
  const actionName = Object.keys(item)[0];
  const params = (item as any)[actionName] || {};
  console.log(
    "[background.ts] Mapping AI action:",
    actionName,
    "with params:",
    params
  );

  let type: LocalActionType = "wait";
  let description = actionName;
  let data: any = {};

  switch (actionName) {
    case "click_element":
      type = "click";
      data = {
        url: params.url,
        text: params.text,
        index: params.index,
        selector: params.selector || "",
      };
      break;
    case "input_text":
      type = "input_text";
      data = {
        text: params.text,
        index: params.index,
        selector: params.selector || "",
      };
      break;
    case "open_tab":
    case "go_to_url":
    case "refresh_page":
    case "navigate":
      type = "navigate";
      data = {
        url: params.url,
      };
      break;
    case "extract_content":
      type = "extract";
      data = {
        selector: params.selector || "",
        index: params.index,
      };
      break;
    case "submit_form":
      type = "submit_form";
      data = {
        selector: params.selector || "",
        index: params.index,
      };
      break;
    case "key_press":
      type = "key_press";
      data = {
        key: params.key,
      };
      break;
    case "scroll_down":
      type = "scroll";
      data = {
        direction: "down",
        offset: params.offset | 200,
      };
      break;
    case "scroll_up":
      type = "scroll";
      data = {
        direction: "up",
        offset: params.offset | 200,
      };
      break;
    case "scroll":
      type = "scroll";
      data = {
        direction: params.direction,
        offset: params.offset | 200,
      };
      break;
    case "verify":
      type = "verify";
      break;
    case "done":
      type = "done";
      data = {
        text: params.message || "Task completed successfully.", // Use message if provided, else default
        ...params, // Include all other params to preserve additional data
      };
      break;
    default:
      console.warn(
        "[background.ts] Unknown action name in mapping:",
        actionName
      );
      break;
  }

  const mappedAction: LocalAction = {
    id: Date.now().toString(),
    type,
    description,
    data,
  };
  console.log("[background.ts] Mapped action:", mappedAction);
  return mappedAction;
}

/********************************************************
 * 9) Execute local actions in sequence
 ********************************************************/
async function executeLocalActions(
  actions: LocalAction[],
  index: number,
  tabIdRef: { value: number },
  contextMessage: string,
  currentState: CurrentState,
  pageElements: PageElement[] = [],
  executedActions: string[] = []
): Promise<any> {
  const tabId = tabIdRef.value;
  if (!executionHistories[tabId]) {
    executionHistories[tabId] = [];
  }
  if (!recentActionsMap[tabId]) {
    recentActionsMap[tabId] = [];
  }

  if (index >= actions.length) {
    console.log(
      "[background.ts] All actions executed for task, returning control to processCommand"
    );
    return "ACTIONS_COMPLETED";
  }

  const action = actions[index];
  console.log("[background.ts] Executing action at index", index, ":", action);

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    try {
      const output = await performLocalAction(action, tabIdRef, pageElements);
      console.log("[background.ts] Action succeeded:", action);
      const actionDesc =
        action.type === "click" || action.type === "click_element"
          ? `Clicked on ${action.data.selector || action.data.index}`
          : action.type === "navigate"
          ? `Navigated to ${action.data.url}`
          : action.type === "extract"
          ? `Extracted content from ${
              action.data.selector || action.data.index
            }`
          : action.type;
      executedActions.push(actionDesc);

      if (output) {
        return output;
      }

      const result = await executeLocalActions(
        actions,
        index + 1,
        tabIdRef,
        contextMessage,
        currentState,
        pageElements,
        executedActions
      );
      if (result === "ACTIONS_COMPLETED") {
        return "ACTIONS_COMPLETED";
      }
      return result;
    } catch (err) {
      console.error("[background.ts] Action failed:", action, "Error:", err);
      retryCount++;
      if (retryCount <= maxRetries) {
        console.log(
          "[background.ts] Retry attempt",
          retryCount,
          "of",
          maxRetries,
          "for action:",
          action
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.log(
          "[background.ts] Max retries reached for action:",
          action,
          "Asking AI for alternatives"
        );
        const prompt = `Action "${action.type}" failed after ${maxRetries} attempts: ${err}. Suggest alternative steps to continue toward the main objective: '${currentState.user_command}'.`;
        await processCommand(
          tabIdRef.value,
          prompt,
          currentState.user_command || "No Initial Command",
          recentActionsMap[tabId]
        );
        return;
      }
    }
  }
}

/********************************************************
 * 10) Perform each local action
 ********************************************************/
async function performLocalAction(
  a: LocalAction,
  tabIdRef: { value: number },
  pageElements: PageElement[]
): Promise<any> {
  console.log(
    "[background.ts] Performing action on tab",
    tabIdRef.value,
    ":",
    a
  );
  const elementIndex = a.data.index;
  switch (a.type) {
    case "go_to_url":
      if (a.data.url) {
        console.log(
          "[background.ts] Navigating tab",
          tabIdRef.value,
          "to",
          a.data.url
        );
        await navigateTab(tabIdRef.value, a.data.url);
      }
      break;
    case "open_tab":
      if (a.data.url) {
        console.log("[background.ts] Opening new tab with URL:", a.data.url);
        const newTab = await createTab(a.data.url);
        if (newTab.id) {
          tabIdRef.value = newTab.id;
          console.log(
            "[background.ts] Updated tabIdRef to new tab:",
            newTab.id
          );
        }
      }
      break;
    case "verify":
      console.log("[background.ts] Verifying URL:", a.data.url);
      await verifyOrOpenTab(a.data.url || "", tabIdRef);
      break;
    case "navigate":
      if (a.data.url) {
        console.log(
          "[background.ts] Navigating to URL in new tab:",
          a.data.url
        );
        const newTab = await createTab(a.data.url);
        if (newTab.id) {
          tabIdRef.value = newTab.id;
          console.log(
            "[background.ts] Updated tabIdRef to new tab:",
            newTab.id
          );
        }
      }
      break;
    case "click":
    case "click_element":
    case "input_text":
    case "submit_form":
    case "key_press":
      if (a.data.selector && typeof elementIndex === "number") {
        const foundEl = pageElements.find((pe) => pe.index === elementIndex);
        if (!foundEl || foundEl.selector !== a.data.selector) {
          throw new Error(
            `[background.ts] Selector validation failed for index ${elementIndex}`
          );
        }
        console.log(
          "[background.ts] Selector validated for index",
          elementIndex,
          ":",
          a.data.selector
        );
      } else if (!a.data.selector && typeof elementIndex === "number") {
        const foundEl = pageElements.find((pe) => pe.index === elementIndex);
        if (!foundEl) {
          throw new Error(
            `[background.ts] Element not found for index ${elementIndex}`
          );
        }
        a.data.selector = foundEl.selector;
        console.log(
          "[background.ts] Updated action selector from index",
          elementIndex,
          "to:",
          a.data.selector
        );
      }
      console.log(
        "[background.ts] Sending action to tab",
        tabIdRef.value,
        ":",
        a
      );
      await sendActionToTab(a, tabIdRef.value);
      console.log("[background.ts] Action acknowledged by tab", tabIdRef.value);
      break;
    case "refresh":
      console.log("[background.ts] Refreshing tab", tabIdRef.value);
      await chrome.tabs.reload(tabIdRef.value);
      await waitForTabLoad(tabIdRef.value);
      console.log("[background.ts] Tab", tabIdRef.value, "refreshed");
      break;
    case "extract":
      if (a.data.selector && typeof elementIndex === "number") {
        const foundEl = pageElements.find((pe) => pe.index === elementIndex);
        if (!foundEl || foundEl.selector !== a.data.selector) {
          throw new Error(
            `[background.ts] Selector validation failed for index ${elementIndex}`
          );
        }
        console.log(
          "[background.ts] Selector validated for index",
          elementIndex,
          ":",
          a.data.selector
        );
      } else if (a.data.selector) {
        console.log(
          "[background.ts] Using provided selector:",
          a.data.selector
        );
      } else if (typeof elementIndex === "number") {
        const foundEl = pageElements.find((pe) => pe.index === elementIndex);
        if (!foundEl) {
          throw new Error(
            `[background.ts] Element not found for index ${elementIndex}`
          );
        }
        a.data.selector = foundEl.selector;
        console.log(
          "[background.ts] Updated action selector from index",
          elementIndex,
          "to:",
          a.data.selector
        );
      } else {
        console.log(
          "[background.ts] No selector or index provided, proceeding without validation"
        );
      }
      console.log(
        "[background.ts] Sending action to tab",
        tabIdRef.value,
        ":",
        a
      );
      const response = await sendActionToTab(a, tabIdRef.value);
      console.log("[background.ts] Action acknowledged by tab", tabIdRef.value);
      return response?.result || null;

    case "scroll":
      console.log(
        "[background.ts] Sending scroll action to tab",
        tabIdRef.value,
        ":",
        a
      );
      await sendActionToTab(a, tabIdRef.value);
      console.log(
        "[background.ts] Scroll action acknowledged by tab",
        tabIdRef.value
      );
      break;
    case "done":
      console.log("[background.ts] AI indicates all tasks are done");
      break;
    case "wait":
      console.log("[background.ts] Waiting for 2 seconds");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log("[background.ts] Wait completed");
      break;
    default:
      throw new Error(`[background.ts] Unknown/unhandled action: ${a.type}`);
  }
}

/********************************************************
 * 11) "verify" => check tab or open new
 ********************************************************/
async function verifyOrOpenTab(urlPart: string, tabIdRef: { value: number }) {
  console.log(
    "[background.ts] Verifying or opening tab with URL part:",
    urlPart
  );
  const tabs = await chrome.tabs.query({});
  const found = tabs.find((t) => t.url?.includes(urlPart));

  if (found?.id) {
    console.log(
      "[background.ts] Found existing tab:",
      found.id,
      "Activating it"
    );
    await chrome.tabs.update(found.id, { active: true });
    activeAutomationTabs.add(found.id);
    await waitForTabLoad(found.id);
    console.log("[background.ts] Tab", found.id, "loaded and active");
    tabIdRef.value = found.id;
  } else {
    console.log(
      "[background.ts] No matching tab found, creating new tab with URL:",
      `https://${urlPart}`
    );
    const newTab = await createTab(`https://${urlPart}`);
    if (newTab && newTab.id) {
      tabIdRef.value = newTab.id;
      activeAutomationTabs.add(newTab.id);
      console.log(
        "[background.ts] New tab created, updated tabIdRef to:",
        newTab.id
      );
    }
  }
  sendExecutionUpdate(tabIdRef.value);
}

/********************************************************
 * 12) Pass an action to content script
 ********************************************************/
async function sendActionToTab(
  action: LocalAction,
  tabId: number
): Promise<any> {
  console.log("[background.ts] Sending action to tab", tabId, ":", action);
  await ensureContentScriptInjected(tabId);
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "PERFORM_ACTION", action },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "[background.ts] Error sending action to tab",
            tabId,
            ":",
            chrome.runtime.lastError.message
          );
          reject(chrome.runtime.lastError);
        } else if (response?.success) {
          console.log(
            "[background.ts] Action succeeded, response from tab",
            tabId,
            ":",
            response
          );
          console.log(`[sendActionToTab] Extracted content: ${response}`);
          resolve(response);
        } else {
          console.error(
            "[background.ts] Action failed, response from tab",
            tabId,
            ":",
            response
          );
          reject(new Error(response?.error || "Action failed"));
        }
      }
    );
  });
}

/********************************************************
 * 13) Listen for PROCESS_COMMAND from UI / content scripts
 ********************************************************/
chrome.runtime.onMessage.addListener(async (msg, _sender, resp) => {
  if (msg.type === "PROCESS_COMMAND") {
    // Reset the flag for new commands
    automationStopped = false;
    console.log("[background.ts] Received PROCESS_COMMAND:", msg);
    await chrome.storage.local.set({ conversationHistory: [] });
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!activeTab?.id) {
      console.error("[background.ts] No active tab found for PROCESS_COMMAND");
      resp({ success: false, error: "No active tab found" });
      return;
    }

    console.log(
      "[background.ts] Active tab found for PROCESS_COMMAND:",
      activeTab.id
    );
    executionHistories[activeTab.id] = [
      { step: "Processing Command", status: "pending" },
    ];
    recentActionsMap[activeTab.id] = [];
    currentTasks[activeTab.id] = "Processing...";
    sendExecutionUpdate(activeTab.id);

    await processCommand(activeTab.id, msg.command, msg.command, []);

    console.log("[background.ts] PROCESS_COMMAND completed, sending response");
    resp({ success: true });
  }
});

/********************************************************
 * 14) Optional: Keep Alive
 ********************************************************/
chrome.runtime.onConnect.addListener((port) => {
  console.log("[background.ts] New port connection established:", port.name);
  port.onMessage.addListener((m) => {
    if (m.type === "KEEP_ALIVE") {
      console.log("[background.ts] Received KEEP_ALIVE from tab", m.tabId);
      activePorts[m.tabId] = port;
    }
  });
  port.onDisconnect.addListener(() => {
    const tabId = parseInt(port.name, 10);
    console.log("[background.ts] Port disconnected for tab", tabId);
    delete activePorts[tabId];
  });
});

/********************************************************
 * 15) Tab Loading Utilities
 ********************************************************/
function waitForTabLoad(tabId: number): Promise<void> {
  console.log("[background.ts] Waiting for tab", tabId, "to load");
  return new Promise((resolve) => {
    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        console.log("[background.ts] Tab", tabId, "loaded");
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && activeAutomationTabs.has(tabId)) {
    ensureContentScriptInjected(tabId).then(() => {
      // Only send if the horizontal bar isn’t already visible
      const bar = document.getElementById("agent-chrome-bar");
      if (!bar || bar.classList.contains("hidden")) {
        debounceShowHorizontalBar(tabId);
      }
    });
  }
});

async function navigateTab(tabId: number, url: string): Promise<void> {
  console.log("[background.ts] Updating tab", tabId, "to URL:", url);
  await chrome.tabs.update(tabId, { url });
  activeAutomationTabs.add(tabId);
  await waitForTabLoad(tabId);
  console.log("[background.ts] Tab", tabId, "navigated to", url);
  await ensureContentScriptInjected(tabId);
}

async function createTab(url: string): Promise<chrome.tabs.Tab> {
  console.log("[background.ts] Creating new tab with URL:", url);
  return new Promise((resolve) => {
    chrome.tabs.create({ url }, (tab) => {
      const listener = async (
        tabId: number,
        changeInfo: chrome.tabs.TabChangeInfo
      ) => {
        if (tabId === tab.id && changeInfo.status === "complete") {
          activeAutomationTabs.add(tab.id);
          console.log("[background.ts] New tab", tab.id, "created and loaded");
          chrome.tabs.onUpdated.removeListener(listener);
          await ensureContentScriptInjected(tab.id);
          resolve(tab);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}
