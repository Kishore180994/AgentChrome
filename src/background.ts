import { chatWithOpenAI } from "./services/openai/api"; // AI logic stays here

interface AIResponse {
  text: string;
  code: string;
  actions: Action[];
  nextStep: string; // Required
  errorStep?: {
    // Optional
    condition: string;
    actions: Action[];
  };
}

type ActionType =
  | "confirm"
  | "click"
  | "input"
  | "select"
  | "scroll"
  | "hover"
  | "double_click"
  | "right_click"
  | "keydown"
  | "keyup"
  | "keypress"
  | "clear"
  | "submit"
  | "wait"
  | "input_text"
  | "doubleClick"
  | "rightClick"
  | "navigate"
  | "verify";

interface Action {
  type: ActionType;
  data: ActionData;
  message?: string;
  description?: string;
}

interface ActionData {
  selector?: string;
  value?: string;
  duration?: number;
  key?: string;
  keyCode?: number;
  url?: string;
}

// ✅ Execution history tracking
let executionHistory: {
  step: string;
  status: "pending" | "success" | "failed";
  retries: number;
  message?: string;
}[] = [];

// ✅ Store active ports for persistent connection
const activePorts: Record<number, chrome.runtime.Port> = {};

// ✅ Send execution updates
function sendExecutionUpdate() {
  try {
    chrome.runtime.sendMessage({
      type: "EXECUTION_UPDATE",
      history: executionHistory.slice(-10),
    });
  } catch (error) {
    console.warn("[background.ts] Failed to send execution update:", error);
  }
}

// ✅ Ensure Sidebar Injection & Toggle
chrome.action.onClicked.addListener(async (tab) => {
  console.log("[background.ts] Extension icon clicked on tab:", tab);

  if (!tab?.id) {
    console.error("[background.ts] No tab ID found");
    return;
  }

  try {
    console.log("[background.ts] Ensuring content script is injected...");
    await ensureContentScriptInjected(tab.id);

    console.log("[background.ts] Sending TOGGLE_SIDEBAR message...");
    sendMessageToContent(tab.id, { type: "TOGGLE_SIDEBAR" });
  } catch (error) {
    console.error("[background.ts] Error injecting content script:", error);
  }
});

// ✅ Send message with persistent connection
function sendMessageToContent(tabId: number, message: any) {
  if (activePorts[tabId]) {
    console.log(`[background.ts] Sending message to tab ${tabId}:`, message);
    activePorts[tabId].postMessage(message);
  } else {
    console.warn(
      `[background.ts] No active port for tab ${tabId}. Retrying connection.`
    );
    ensureContentScriptInjected(tabId).then(() => {
      chrome.tabs.sendMessage(tabId, message);
    });
  }
}

// ✅ Ensure Content Script is Injected Before Sending Messages
async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "PING" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        console.warn(
          `[background.ts] Content script not found in tab ${tabId}, injecting now...`
        );
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

// ✅ Fetch Page Elements Before Sending AI Request
async function fetchPageElements(tabId: number): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "GET_PAGE_ELEMENTS" },
      (response) => {
        if (!response || chrome.runtime.lastError) {
          console.error(
            "[background.ts] Error fetching page elements:",
            chrome.runtime.lastError?.message
          );
          resolve({});
        } else {
          resolve(response.elements);
        }
      }
    );
  });
}

// ✅ Process AI Commands and Execute Actions Recursively
async function processCommand(
  tabId: number,
  contextMessage: string,
  isInitialCommand: boolean = false
) {
  console.log("[background.ts] Fetching page elements before AI request...");

  const pageElements = await fetchPageElements(tabId);
  console.log("[background.ts] Retrieved Page Elements:", pageElements);

  if (!pageElements || Object.keys(pageElements).length === 0) {
    console.warn(
      "[background.ts] No valid page elements found, aborting AI request."
    );
    return;
  }

  console.log(
    `[background.ts] Requesting AI next step with message: "${contextMessage}"`
  );

  try {
    const aiResponse = await chatWithOpenAI(
      contextMessage,
      "session-id",
      pageElements,
      isInitialCommand
    );
    console.log("[background.ts] AI Response:", aiResponse);

    if (aiResponse.nextStep === "FINISHED_AUTOMATION") {
      chrome.runtime.sendMessage({ type: "AUTOMATION_COMPLETE" });
      return;
    }

    if (aiResponse.actions?.length) {
      executeStep(aiResponse.actions, 0, tabId, contextMessage);
    } else {
      console.log("[background.ts] No more actions. Execution complete.");
    }
  } catch (error) {
    console.error("[background.ts] Error communicating with AI:", error);
  }
}

// ✅ Execute AI-generated steps sequentially
async function executeStep(
  actions: Action[],
  actionIndex: number,
  tabId: number,
  _contextMessage: string
) {
  if (actionIndex >= actions.length) {
    console.log(
      "[background.ts] All actions completed. Requesting next AI step..."
    );
    await processCommand(
      tabId,
      `Previous step completed successfully. What should I do next?`
    );
    return;
  }

  const action = actions[actionIndex];
  console.log("[background.ts] Executing AI Step:", action);

  executionHistory.push({
    step: action.description || action.type,
    status: "pending",
    retries: 0,
  });
  sendExecutionUpdate();

  try {
    await performAction(action);
    executionHistory[executionHistory.length - 1].status = "success";
    sendExecutionUpdate();

    executeStep(
      actions,
      actionIndex + 1,
      tabId,
      `Action "${action.type}" executed successfully. Proceed with the next step.`
    );
  } catch (error) {
    console.error("[background.ts] Error executing action:", error);

    executionHistory[executionHistory.length - 1].status = "failed";
    executionHistory[executionHistory.length - 1].message = (
      error as any
    ).message;
    sendExecutionUpdate();

    if (executionHistory[executionHistory.length - 1].retries < 2) {
      console.log("[background.ts] Retrying failed action...");
      executionHistory[executionHistory.length - 1].retries += 1;
      executeStep(
        actions,
        actionIndex,
        tabId,
        `Action "${action.type}" failed. Attempting retry.`
      );
    } else {
      console.log(
        "[background.ts] Maximum retries reached. Asking AI for guidance."
      );
      processCommand(
        tabId,
        `Action "${action.type}" failed multiple times. What should I do next?`
      );
    }
  }
}

// ✅ Perform AI-generated action
async function performAction(action: Action) {
  switch (action.type) {
    case "verify":
      await verifyOrOpenTab(action.data.url || "");
      break;
    case "navigate":
      if (action.data.url) chrome.tabs.create({ url: action.data.url });
      break;
    case "click":
    case "double_click":
    case "right_click":
    case "hover":
    case "scroll":
    case "input":
    case "input_text":
      sendActionToActiveTab(action);
      break;
    default:
      throw new Error(`[background.ts] Unknown action type: ${action.type}`);
  }
}

// ✅ Send action to content script for execution
function sendActionToActiveTab(action: Action) {
  console.log("[background.ts] Sending action to active tab:", action);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "PERFORM_ACTION", action });
    } else {
      console.error("[background.ts] No active tab found to send action.");
    }
  });
}

// ✅ Check if a tab is open or open a new one (Verification)
async function verifyOrOpenTab(urlContains: string) {
  console.log("[background.ts] Checking if tab is open:", urlContains);

  const tabs = await chrome.tabs.query({});
  const matchingTab = tabs.find((tab) => tab.url?.includes(urlContains));

  if (matchingTab && matchingTab.id) {
    console.log("[background.ts] Found existing tab:", matchingTab.url);
    chrome.tabs.update(matchingTab.id, { active: true });
  } else {
    console.log("[background.ts] No matching tab found, opening a new one.");
    chrome.tabs.create({ url: `https://${urlContains}` });
  }

  sendExecutionUpdate();
}

// ✅ Handle messages from content scripts or UI
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log(
    "[background.ts] Received message:",
    message,
    "from sender:",
    sender
  );

  if (message.type === "PROCESS_COMMAND") {
    console.log("[background.ts] Processing AI command:", message.command);

    const tabId = sender.tab?.id;
    if (!tabId) {
      console.error("[background.ts] No active tab ID found, aborting.");
      sendResponse({ success: false, error: "No active tab ID found" });
      return;
    }

    executionHistory = [
      { step: "Processing Command", status: "pending", retries: 0 },
    ];
    sendExecutionUpdate();

    await processCommand(
      tabId,
      message.command,
      message.commandType && message.commandType === "INITIAL_COMMAND"
        ? true
        : false
    );
    sendResponse({ success: true });
  }
});
