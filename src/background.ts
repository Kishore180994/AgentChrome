import { PageElement } from "./services/ai/interfaces";
/********************************************************
 * background.ts — Single-File Integration
 * ------------------------------------------------------
 * This script:
 * 1) Defines the AI's "AgentResponseFormat" with current_state + action
 * 2) Interprets them as local "Action"
 * 3) Dynamically updates tabId when new tabs are opened
 * 4) Passes the current list of tabs to chatWithOpenAI
 * 5) Uses your existing structure for toggling sidebar, etc.
 ********************************************************/

/********************************************************
 * 1) Agent Response Format & Action Types
 ********************************************************/

type AgentActionItem =
  | {
      click_element: {
        index: number;
        selector?: string;
      };
    }
  | {
      input_text: {
        index: number;
        text: string;
        selector?: string;
      };
    }
  | {
      open_tab: {
        url?: string;
      };
    }
  | {
      go_to_url: {
        url: string;
      };
    }
  | {
      extract_content: {
        selectors?: string[];
      };
    }
  | {
      submit_form: {
        index?: number;
        selector?: string;
      };
    }
  | {
      key_press: {
        key: string;
      };
    }
  | {
      scroll: {
        direction?: "up" | "down";
        offset?: number;
      };
    }
  | {
      verify: {
        url: string;
      };
    }
  | {
      done: {};
    };

/********************************************************
 * 2) Local Action Mapping
 ********************************************************/
import { chatWithAI } from "./services/openai/api";

type LocalActionType =
  | "click"
  | "click_element"
  | "input_text"
  | "navigate"
  | "verify"
  | "open_tab"
  | "go_to_url"
  | "extract"
  | "submit_form"
  | "key_press"
  | "scroll"
  | "done"
  | "wait"; // fallback

interface LocalAction {
  type: LocalActionType;
  data: {
    url?: string;
    text?: string;
    index?: number;
    selector: string;
    key?: string;
    direction?: "up" | "down";
    offset?: number;
  };
  description?: string;
}

/********************************************************
 * 3) Execution Tracking & Connection
 ********************************************************/
let executionHistory: {
  step: string;
  status: "pending" | "success" | "failed";
  retries: number;
  message?: string;
}[] = [];

const activePorts: Record<number, chrome.runtime.Port> = {};

/********************************************************
 * 4) Utility: sendExecutionUpdate
 ********************************************************/
function sendExecutionUpdate() {
  try {
    chrome.runtime.sendMessage({
      type: "EXECUTION_UPDATE",
      history: executionHistory.slice(-10),
    });
  } catch (err) {
    console.warn("[background.ts] Failed to send exec update:", err);
  }
}

/********************************************************
 * 5) Toggle Sidebar & Content Script Injection
 ********************************************************/
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  await ensureContentScriptInjected(tab.id);
  sendMessageToContent(tab.id, { type: "TOGGLE_SIDEBAR" });
});

function sendMessageToContent(tabId: number, msg: any) {
  if (activePorts[tabId]) {
    activePorts[tabId].postMessage(msg);
  } else {
    ensureContentScriptInjected(tabId).then(() => {
      chrome.tabs.sendMessage(tabId, msg);
    });
  }
}

async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "PING" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        chrome.scripting.executeScript(
          { target: { tabId }, files: ["content.js"] },
          () => {
            setTimeout(() => resolve(true), 500);
          }
        );
      } else {
        resolve(true);
      }
    });
  });
}

/********************************************************
 * 6) Gather Page Elements + All Tabs
 ********************************************************/
async function fetchPageElements(tabId: number): Promise<PageElement[]> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_ELEMENTS" }, (resp) => {
      if (!resp || chrome.runtime.lastError) {
        resolve([]);
      } else {
        resolve(resp.elements);
      }
    });
  });
}

/**
 * Retrieve all existing tabs' URLs, for passing to AI
 */
async function getAllTabs(): Promise<string[]> {
  const tabs = await chrome.tabs.query({});
  return tabs.map((t) => t.url ?? "");
}

// Helper function to get the current tab URL as a Promise
const getTabUrl = (tabId: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      if (tab && tab.url) {
        resolve(tab.url);
      } else {
        reject("Tab URL not found");
      }
    });
  });
};

/********************************************************
 * 7) The main "processCommand"
 *    1) fetch page elements + tab list
 *    2) call AI
 *    3) interpret & run actions
 ********************************************************/
async function processCommand(
  tabId: number,
  contextMessage: string,
  isInitialCommand = false
) {
  // Gather the page's interactive elements
  const pageState = await fetchPageElements(tabId);
  console.log("[background.ts] Page elements:", pageState);
  // Gather all existing tabs
  const allTabs = await getAllTabs();

  // Get the current tab URL using the helper function
  let tabUrl: string;
  try {
    tabUrl = await getTabUrl(tabId);
    console.log("Current tab URL:", tabUrl);
  } catch (error) {
    console.error("Failed to retrieve tab URL:", error);
    return;
  }

  if (!pageState || Object.keys(pageState).length === 0) {
    console.warn(
      "[background.ts] No valid elements found; aborting AI request."
    );
    return;
  }

  // Merge page elements + tab list
  const currentState = {
    elements: pageState,
    tabs: allTabs,
    currentTabUrl: tabUrl,
  };
  try {
    // 1) Call AI
    const raw = await chatWithAI(contextMessage, "session-id", currentState);
    console.log("[background.ts] Raw AI response:", raw);

    const { current_state, action } = raw;
    if (!current_state || !action) {
      console.warn(
        "[background.ts] Missing current_state or action => stopping"
      );
      return;
    }

    const evaluation = current_state.evaluation_previous_goal;
    // console.log("[background.ts] AI says previous step was:", evaluation);

    if (!action.length) {
      console.log("[background.ts] No further actions => possibly done");
      return;
    }

    // 2) Convert each AgentActionItem => local "Action"
    const localActions: LocalAction[] = action.map(mapAiItemToLocalAction);

    // 3) We'll track tabId in a mutable reference so we can update if "navigate" opens a new tab
    const tabIdRef = { value: tabId };

    // 4) Execute them in sequence
    executeLocalActions(
      localActions,
      0,
      tabIdRef,
      contextMessage,
      isInitialCommand ? evaluation : "",
      pageState
    );
  } catch (err) {
    console.error("[background.ts] Error calling AI:", err);
  }
}

function resetExecutionState() {
  executionHistory = [];
  sendExecutionUpdate();
}

/********************************************************
 * 8) Convert AgentActionItem => local "Action"
 ********************************************************/
function mapAiItemToLocalAction(item: AgentActionItem): LocalAction {
  const actionName = Object.keys(item)[0];
  const params = (item as any)[actionName] || {};

  let type: LocalActionType = "wait";
  let description = actionName;

  switch (actionName) {
    case "click_element":
      type = "click";
      break;
    case "input_text":
      type = "input_text";
      break;
    case "open_tab":
    case "go_to_url":
    case "navigate":
      type = "navigate";
      break;
    case "extract_content":
      type = "extract";
      break;
    case "submit_form":
      type = "submit_form";
      break;
    case "key_press":
      type = "key_press";
      break;
    case "scroll":
      type = "scroll";
      break;
    case "verify":
      type = "verify";
      break;
    case "done":
      type = "done";
      break;
    default:
      console.warn("[mapAiItemToLocalAction] Unknown action name:", actionName);
      break;
  }

  return {
    type,
    description,
    data: {
      url: params.url,
      text: params.text,
      index: params.index,
      selector: params.selector,
      key: params.key,
      direction: params.direction,
      offset: params.offset,
    },
  };
}

/********************************************************
 * 9) Execute local actions in sequence
 ********************************************************/
async function executeLocalActions(
  actions: LocalAction[],
  index: number,
  tabIdRef: { value: number },
  contextMsg: string,
  evaluation?: string,
  pageElements: PageElement[] = []
) {
  if (index >= actions.length) {
    // All actions have been acknowledged by content script.
    // Now, if needed, call processCommand to get the next set of steps.
    await processCommand(
      tabIdRef.value,
      evaluation
        ? `${evaluation}. Scan the current document elements and get me the next steps that can be performed on the current page.`
        : "",
      false
    );
    return;
  }

  const action = actions[index];
  executionHistory.push({
    step: action.description || action.type,
    status: "pending",
    retries: 0,
  });
  sendExecutionUpdate();

  try {
    // Await the execution of this action, which now includes waiting for the content script's ack.
    await performLocalAction(action, tabIdRef, pageElements);
    executionHistory[executionHistory.length - 1].status = "success";
    sendExecutionUpdate();

    // Proceed to the next action after acknowledgement.
    await executeLocalActions(
      actions,
      index + 1,
      tabIdRef,
      contextMsg,
      evaluation,
      pageElements
    );
  } catch (err) {
    // Retry or fallback logic remains similar.
    const hist = executionHistory[executionHistory.length - 1];
    hist.status = "failed";
    hist.message = String(err);
    sendExecutionUpdate();

    if (hist.retries < 2) {
      hist.retries++;
      console.log("[background.ts] Retrying failed action...");
      await executeLocalActions(
        actions,
        index,
        tabIdRef,
        contextMsg,
        evaluation,
        pageElements
      );
    } else {
      console.log(
        "[background.ts] Max retries reached, asking AI for alternative steps..."
      );
      await processCommand(
        tabIdRef.value,
        `Action "${action.type}" kept failing. Next?`,
        false
      );
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
) {
  switch (a.type) {
    case "go_to_url":
      if (a.data.url) {
        await navigateTab(tabIdRef.value, a.data.url);
      }
      break;
    case "open_tab":
      if (a.data.url) {
        const newTab = await createTab(a.data.url);
        if (newTab.id) {
          tabIdRef.value = newTab.id;
          console.log(`Updated tab ID to ${newTab.id}`);
        }
      }
      break;

    case "verify":
      await verifyOrOpenTab(a.data.url || "", tabIdRef);
      break;

    case "navigate":
      if (a.data.url) {
        // open new or go to the URL in a new tab,
        // then update our tabIdRef so subsequent steps act on the new tab
        const newTab = await createTab(a.data.url);
        if (newTab.id) {
          tabIdRef.value = newTab.id;
          console.log(`[background.ts] Updated tabIdRef to ${newTab.id}`);
        }
      }
      break;

    case "click":
    case "click_element":
    case "input_text":
    case "submit_form":
    case "key_press":
    case "extract": {
      const elementIndex = a.data.index;
      if (typeof elementIndex === "number") {
        const foundEl = pageElements.find((pe) => pe.index === elementIndex);
        if (!foundEl) {
          throw new Error(
            `Element not found in pageElements for index ${elementIndex}`
          );
        }
        a.data.selector = foundEl.selector;
      }
      // Now wait for the content script to process the action
      await sendActionToActiveTab(a);
      break;
    }

    case "scroll":
      sendActionToActiveTab(a);
      break;

    case "done":
      console.log("[background.ts] AI indicates all tasks are done.");
      resetExecutionState();
      throw new Error("PROCESS_COMPLETED");

    case "wait":
      // Implement a meaningful wait (e.g., 2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      break;

    default:
      throw new Error(
        `[performLocalAction] Unknown/unhandled action: ${a.type}`
      );
  }
}

/********************************************************
 * 11) "verify" => check tab or open new
 ********************************************************/
// Update verifyOrOpenTab to wait for loads
async function verifyOrOpenTab(urlPart: string, tabIdRef: { value: number }) {
  const tabs = await chrome.tabs.query({});
  const found = tabs.find((t) => t.url?.includes(urlPart));

  if (found?.id) {
    await chrome.tabs.update(found.id, { active: true });
    await waitForTabLoad(found.id);
  } else {
    const newTab = await createTab(`https://${urlPart}`);
    if (newTab && newTab.id) tabIdRef.value = newTab.id;
  }
  sendExecutionUpdate();
}

/********************************************************
 * 12) Pass an action to content script
 ********************************************************/
function sendActionToActiveTab(a: LocalAction): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "PERFORM_ACTION", action: a },
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

/********************************************************
 * 13) Listen for PROCESS_COMMAND from UI / content scripts
 ********************************************************/
chrome.runtime.onMessage.addListener(async (msg, _sender, resp) => {
  if (msg.type === "PROCESS_COMMAND") {
    await chrome.storage.local.set({ conversationHistory: [] });
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!activeTab?.id) {
      resp({ success: false, error: "No active tab found" });
      return;
    }

    // Reset execution history
    executionHistory = [
      { step: "Processing Command", status: "pending", retries: 0 },
    ];
    sendExecutionUpdate();

    const isInit = msg.commandType === "INITIAL_COMMAND";
    await processCommand(activeTab.id, msg.command, isInit);

    resp({ success: true });
  }
});

/********************************************************
 * 14) Optional: Keep Alive
 ********************************************************/
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((m) => {
    if (m.type === "KEEP_ALIVE") {
      activePorts[m.tabId] = port;
    }
  });
  port.onDisconnect.addListener(() => {
    delete activePorts[parseInt(port.name, 10)];
  });
});

/********************************************************
 * 15) Tab Loading Utilities
 ********************************************************/
function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function navigateTab(tabId: number, url: string): Promise<void> {
  await chrome.tabs.update(tabId, { url });
  return waitForTabLoad(tabId);
}

function createTab(url: string): Promise<chrome.tabs.Tab> {
  return new Promise((resolve) => {
    chrome.tabs.create({ url }, (tab) => {
      const listener = (
        tabId: number,
        changeInfo: chrome.tabs.TabChangeInfo
      ) => {
        if (tabId === tab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(tab);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

/********************************************************
 * Explanation of Key Updates:
 * ------------------------------------------------------
 * 1) getAllTabs() => Collects all tab URLs to pass to AI
 * 2) processCommand => Merges page elements + tab list
 *    into currentState for chatWithOpenAI
 * 3) createTab() => Async, returns new Tab object.
 * 4) performLocalAction => If "navigate", we await createTab()
 *    and update tabIdRef.value so subsequent steps run on the new tab.
 ********************************************************/
