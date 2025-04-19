/// <reference types="@types/chrome" />
import {
  DoneArgs,
  PageElement,
  ReportCurrentStateArgs,
  UncompressedPageElement,
} from "./services/ai/interfaces";
import { chatWithAI } from "./services/openai/api";
import {
  GeminiResponse,
  GeminiFunctionCallWrapper,
  CurrentState,
} from "./services/ai/interfaces";
console.log(chrome.identity.getRedirectURL());

let automationStopped: boolean = false;
const activeAutomationTabs: Set<number> = new Set();
const recentActionsMap: Record<number, string[]> = {};
const currentTasks: Record<number, string> = {};
const activePorts: Record<number, chrome.runtime.Port> = {};

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

chrome.tabs.onRemoved.addListener((tabId) => {
  activeAutomationTabs.delete(tabId);
});

async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  console.log("[background.ts] Ensuring content script for tab", tabId);
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "PING" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        console.log("[background.ts] Injecting content script on tab", tabId);
        chrome.scripting
          .executeScript({ target: { tabId }, files: ["content.js"] })
          .then(() => setTimeout(() => resolve(true), 500))
          .catch((err) => {
            console.error("[background.ts] Injection error:", err);
            resolve(false);
          });
      } else {
        resolve(true);
      }
    });
  });
}

async function executeAppsScriptFunction(
  functionName: string,
  argsFromGemini: any
): Promise<any> {
  const webAppUrl =
    "https://script.google.com/macros/s/AKfycbyqg16NJ8lT1ijW81TIAPlIOyKCjq6PlAk4HcBY2kERNFHRDo52MV4z7kIcG46oKhpIkA/exec";

  if (!webAppUrl) {
    throw new Error("Apps Script Web App URL is not configured.");
  }

  console.log(
    `[background.ts] Preparing to call Apps Script function: ${functionName}`
  );
  console.log(`[background.ts] Args from Gemini:`, argsFromGemini);

  // Step 1: Get OAuth Token
  let authToken = "";
  try {
    const tokenResponse = await chrome.identity.getAuthToken({
      interactive: true,
    });
    if (chrome.runtime.lastError || !tokenResponse?.token) {
      throw new Error(
        `Failed to get authentication token: ${
          chrome.runtime.lastError?.message || "No token returned."
        }`
      );
    }
    authToken = tokenResponse.token;
    console.log("[background.ts] OAuth token obtained successfully.");
  } catch (error) {
    throw new Error(
      `Authentication failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Step 2: Build Payload
  const payloadForAppsScript: any = {
    scriptFunction: functionName,
  };

  // Add specific fields based on the function
  switch (functionName) {
    case "createNewGoogleDoc":
      payloadForAppsScript.fileName = argsFromGemini.fileName;
      payloadForAppsScript.content = argsFromGemini.content || [];
      break;
    case "insertStructuredDocContent":
    case "updateDocText":
    case "appendDocText":
    case "deleteDocText":
    case "getDocContent":
    case "getDocFileName":
      if (!argsFromGemini.fileId) {
        throw new Error(
          `Missing required 'fileId' for function ${functionName}`
        );
      }
      payloadForAppsScript.fileId = argsFromGemini.fileId;
      if (functionName === "insertStructuredDocContent") {
        payloadForAppsScript.content = argsFromGemini.content || [];
      } else if (functionName === "updateDocText") {
        payloadForAppsScript.searchText = argsFromGemini.searchText;
        payloadForAppsScript.replaceText = argsFromGemini.replaceText;
      } else if (
        functionName === "appendDocText" ||
        functionName === "deleteDocText"
      ) {
        payloadForAppsScript.text = argsFromGemini.text;
      }
      break;
    case "createNewGoogleSheet":
      payloadForAppsScript.fileName = argsFromGemini.fileName;
      payloadForAppsScript.sheetNames = argsFromGemini.sheetNames || [];
      break;
    case "appendSheetRow":
    case "updateSheetCell":
    case "getSheetData":
    case "deleteSheetRow":
      if (!argsFromGemini.fileId) {
        throw new Error(
          `Missing required 'fileId' for function ${functionName}`
        );
      }
      if (!argsFromGemini.sheetName) {
        throw new Error(
          `Missing required 'sheetName' for function ${functionName}`
        );
      }
      payloadForAppsScript.fileId = argsFromGemini.fileId;
      payloadForAppsScript.sheetName = argsFromGemini.sheetName;
      if (functionName === "appendSheetRow") {
        payloadForAppsScript.values = argsFromGemini.values || [];
      } else if (functionName === "updateSheetCell") {
        payloadForAppsScript.cell = argsFromGemini.cell;
        payloadForAppsScript.value = argsFromGemini.value;
      } else if (functionName === "getSheetData") {
        payloadForAppsScript.range = argsFromGemini.range;
      } else if (functionName === "deleteSheetRow") {
        payloadForAppsScript.rowNumber = argsFromGemini.rowNumber;
      }
      break;
    default:
      throw new Error(`Unsupported Apps Script function: ${functionName}`);
  }

  // Step 3: Call Apps Script
  try {
    console.log(`[background.ts] Calling Apps Script URL: ${webAppUrl}`);
    console.log(
      `[background.ts] Payload: ${JSON.stringify(payloadForAppsScript)}`
    );

    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Authorization: `Bearer ${authToken}`,
      },
      mode: "cors",
      body: JSON.stringify(payloadForAppsScript),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(
          `Apps Script failed (${response.status}): ${
            errorJson.message || errorText
          }, Payload: ${JSON.stringify(payloadForAppsScript)}`
        );
      } catch {
        throw new Error(
          `Apps Script failed (${
            response.status
          }): ${errorText}, Payload: ${JSON.stringify(payloadForAppsScript)}`
        );
      }
    }

    const result = await response.json();
    console.log("[background.ts] Apps Script Result:", result);

    if (result.status === "error") {
      throw new Error(
        `Apps Script error: ${result.message}, Payload: ${JSON.stringify(
          payloadForAppsScript
        )}`
      );
    }

    return result;
  } catch (error) {
    console.error(`[background.ts] Apps Script execution error:`, error);
    throw error;
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
            } else {
              console.log(
                "[background.ts] Fetched",
                resp.compressed.length,
                "elements"
              );
              resolve({
                compressed: resp.compressed,
                uncompressed: resp.uncompressed,
              });
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
    lastActionType === "goToUrl" ||
    lastActionType === "openTab" ||
    lastActionType === "navigate"
  ) {
    await waitForTabLoad(tabId);
  } else if (
    lastActionType === "clickElement" ||
    lastActionType === "submitForm"
  ) {
    const initialUrl = await getTabUrl(tabId);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds for potential navigation
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
  try {
    const result = await fetchPageElements(tabId);
    pageState = result.compressed;
    uncompressedPageState = result.uncompressed;
  } catch (err) {
    console.error("[background.ts] Failed to fetch page elements:", err);
    await chrome.runtime.sendMessage({
      type: "FINISH_PROCESS_COMMAND",
      response:
        "Failed to fetch page elements: " +
        (err instanceof Error ? err.message : String(err)),
    });
    return;
  }

  let screenshotDataUrl: string | null = null;

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
            resolve();
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
                screenshotDataUrl = dataUrl;
              }
              resolve();
            }
          );
        }
      );
    } catch (err) {
      console.error("[background.ts] Error getting tab info:", err);
      resolve();
    }
  });

  const allTabs = await getAllTabs();
  let tabUrl: string;
  try {
    tabUrl = await getTabUrl(tabId);
  } catch (error) {
    console.error("[background.ts] Tab URL error:", error);
    await chrome.runtime.sendMessage({
      type: "FINISH_PROCESS_COMMAND",
      response:
        "Failed to get tab URL: " +
        (error instanceof Error ? error.message : String(error)),
    });
    return;
  }

  if (!pageState.length) {
    console.warn("[background.ts] No elements found, aborting");
    await chrome.runtime.sendMessage({
      type: "FINISH_PROCESS_COMMAND",
      response: "No page elements found, aborting command processing.",
    });
    return;
  }

  const currentState = {
    elements: pageState,
    tabs: allTabs,
    currentTabUrl: tabUrl,
    actionHistory: actionHistory.slice(-3),
    screenshot: screenshotDataUrl,
  };
  console.log({ pageState });

  try {
    const recentActionsStr = actionHistory.length
      ? `Recent actions: ${actionHistory.slice(-3).join(", ")}.`
      : "";
    const fullContextMessage = `${contextMessage}. ${recentActionsStr}`;
    console.log(
      "[background.ts] Sending context message to AI:",
      fullContextMessage
    );
    const response = await chatWithAI(
      fullContextMessage,
      "session-id",
      currentState,
      screenshotDataUrl || undefined,
      model as "gemini" | "claude"
    );
    console.log("[background.ts] Raw response from AI:", response);

    if (!response) {
      console.error("[background.ts] Received null response from chatWithAI.");
      chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: "AI provider returned no response.",
      });
      activeAutomationTabs.delete(tabId);
      return;
    }

    // Extract current_state from reportCurrentState
    const reportCurrentStateCall = response.find(
      (part) => part.functionCall.name === "reportCurrentState"
    );
    if (!reportCurrentStateCall) {
      console.error("[background.ts] Missing reportCurrentState in response.");
      await chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: "Missing mandatory reportCurrentState call, aborting.",
      });
      return;
    }

    const current_state: CurrentState = (
      reportCurrentStateCall.functionCall.args as ReportCurrentStateArgs
    ).current_state;
    console.log(
      "[background.ts] Extracted current_state from AI response:",
      current_state
    );

    // Extract other function calls (excluding reportCurrentState) as actions
    const actions = response.filter(
      (part) => part.functionCall.name !== "reportCurrentState"
    );
    console.log("[background.ts] Extracted actions from AI response:", actions);

    current_state.user_command = initialCommand;
    const {
      evaluation_previous_goal: evaluation,
      memory,
      user_command,
    } = current_state;
    const tabIdRef = { value: tabId };

    chrome.runtime.sendMessage({ type: "MEMORY_UPDATE", response: memory });
    chrome.tabs.sendMessage(tabIdRef.value, {
      type: "MEMORY_UPDATE",
      response: memory,
    });

    if (actions.length === 0) {
      console.log("[background.ts] No actions, process complete");
      resetExecutionState(tabId);
      activeAutomationTabs.clear();
      return;
    }

    const executedActions: string[] = [];
    const result = await executeFunctionCalls(
      actions,
      0,
      tabIdRef,
      contextMessage,
      current_state,
      uncompressedPageState,
      executedActions,
      model
    );

    if (result === "DONE" || result === "ASK_PAUSED") {
      console.log(`[background.ts] Execution stopped with ${result}`);
      resetExecutionState(tabId);
      activeAutomationTabs.clear();
      return;
    }

    // Check if the last action was potentially DOM-changing and wait if necessary
    if (actions.length > 0) {
      const lastAction = actions[actions.length - 1].functionCall.name;
      await waitForPotentialNavigation(tabIdRef.value, lastAction);
    }

    const doneAction = actions.find(
      (part) => part.functionCall.name === "done"
    );
    if (doneAction) {
      automationStopped = true;
      chrome.tabs.sendMessage(tabIdRef.value, {
        type: "COMMAND_RESPONSE",
        response: {
          message:
            (doneAction.functionCall.args as DoneArgs).message ||
            "Task completed.",
          output: (doneAction.functionCall.args as DoneArgs).output,
        },
      });
      resetExecutionState(tabId);
      activeAutomationTabs.clear();
      return;
    }

    const refetchAction = actions.find(
      (part) => part.functionCall.name === "refetch"
    );
    if (refetchAction) {
      chrome.tabs.sendMessage(tabIdRef.value, {
        type: "DISPLAY_MESSAGE",
        response: {
          message: "Refetching page elements",
        },
      });
    }

    recentActionsMap[tabId] = [
      ...recentActionsMap[tabId],
      ...executedActions,
    ].slice(-5);

    const promptParts = [
      evaluation ? `Evaluation: ${evaluation}` : "",
      memory ? `Memory: ${JSON.stringify(memory)}` : "",
      user_command ? `Objective: ${user_command}` : "",
      result &&
      typeof result === "string" &&
      result !== "ASK_PAUSED" &&
      result !== "ACTIONS_COMPLETED"
        ? `Extracted: ${result}`
        : "",
      "Provide next actions to achieve the goal.",
    ]
      .filter(Boolean)
      .join(". ");

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
      recentActionsMap[tabId] || [],
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
    const errorMessage = `Command processing failed: ${err.message}`;
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
}

function resetExecutionState(tabId: number) {
  recentActionsMap[tabId] = [];
  delete currentTasks[tabId];
}

async function executeFunctionCalls(
  actions: GeminiFunctionCallWrapper[],
  index: number,
  tabIdRef: { value: number },
  contextMessage: string,
  currentState: CurrentState,
  uncompressedPageElements: UncompressedPageElement[],
  executedActions: string[] = [],
  model: string
): Promise<any> {
  const logPrefix = `[background.ts] Tab ${tabIdRef.value}`;
  if (index >= actions.length) {
    console.log(`${logPrefix} All actions completed`);
    return "ACTIONS_COMPLETED";
  }

  const action = actions[index].functionCall;
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    try {
      console.log(
        `${logPrefix} Executing action ${index + 1}/${actions.length}:`,
        action
      );
      const output = await sendActionToTab(action, tabIdRef.value);
      const actionDesc = getActionDescription(action);
      executedActions.push(actionDesc);

      if (output === "ASK_PAUSED" || output === "DONE") {
        console.log(`${logPrefix} Paused with ${output}`);
        return output;
      }
      if (action.name === "extractContent") return output;

      return await executeFunctionCalls(
        actions,
        index + 1,
        tabIdRef,
        contextMessage,
        currentState,
        uncompressedPageElements,
        executedActions,
        model
      );
    } catch (err) {
      console.error(`${logPrefix} Action failed:`, action, "Error:", err);
      retryCount++;
      if (retryCount <= maxRetries) {
        console.log(`${logPrefix} Retrying (${retryCount}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        const prompt = `Action "${action.name}" failed after ${maxRetries} attempts: ${err}. Suggest alternatives for: '${currentState.user_command}'.`;
        await processCommand(
          tabIdRef.value,
          prompt,
          currentState.user_command || "",
          recentActionsMap[tabIdRef.value],
          model
        );
        return;
      }
    }
  }
}

function getActionDescription(action: { name: string; args: any }): string {
  switch (action.name) {
    case "clickElement":
      return `Clicked on element at index ${action.args.index}`;
    case "goToUrl":
      return `Navigated to ${action.args.url}`;
    case "extractContent":
      return `Extracted from element at index ${action.args.index}`;
    case "refetch":
      return "Re-fetched page elements";
    default:
      return action.name;
  }
}

// async function performFunctionCall(
//   action: { name: string; args: any },
//   tabIdRef: { value: number },
//   model: string
// ): Promise<any> {
//   const logPrefix = `[background.ts] Tab ${tabIdRef.value}`;

//   switch (action.name) {
//     case "goToUrl":
//     case "navigate":
//       if (!action.args.url) {
//         const errorMessage = `${logPrefix} No URL provided`;
//         await chrome.runtime.sendMessage({
//           type: "FINISH_PROCESS_COMMAND",
//           response: errorMessage,
//         });
//         throw new Error(errorMessage);
//       }
//       console.log(`${logPrefix} Navigating to ${action.args.url}`);
//       await navigateTab(tabIdRef.value, action.args.url);
//       break;

//     case "openTab":
//       if (!action.args.url) {
//         const errorMessage = `${logPrefix} No URL provided`;
//         await chrome.runtime.sendMessage({
//           type: "FINISH_PROCESS_COMMAND",
//           response: errorMessage,
//         });
//         throw new Error(errorMessage);
//       }
//       console.log(`${logPrefix} Opening tab with ${action.args.url}`);
//       const newTab = await createTab(action.args.url);
//       if (newTab.id) tabIdRef.value = newTab.id;
//       break;

//     case "verify":
//       if (!action.args.url) {
//         const errorMessage = `${logPrefix} No URL provided`;
//         await chrome.runtime.sendMessage({
//           type: "FINISH_PROCESS_COMMAND",
//           response: errorMessage,
//         });
//         throw new Error(errorMessage);
//       }
//       console.log(`${logPrefix} Verifying URL: ${action.args.url}`);
//       await verifyOrOpenTab(action.args.url, tabIdRef);
//       break;

//     case "done":
//       console.log(`${logPrefix} Tasks completed`);
//       const response = {
//         message: action.args.message || "Task completed.",
//         output: action.args.output,
//       };
//       chrome.runtime.sendMessage({
//         type: "COMMAND_RESPONSE",
//         response,
//       });
//       automationStopped = true;
//       return "DONE";

//     case "wait":
//       console.log(`${logPrefix} Waiting 2s`);
//       await new Promise((resolve) => setTimeout(resolve, 2000));
//       break;

//     case "refetch":
//       console.log(`${logPrefix} Refetching page elements`);
//       const refetchPrompt = `Page elements refetched. Current goal: ${
//         currentTasks[tabIdRef.value] || "unknown"
//       }. Provide next actions based on the updated page state.`;
//       await processCommand(
//         tabIdRef.value,
//         refetchPrompt,
//         currentTasks[tabIdRef.value] || "",
//         recentActionsMap[tabIdRef.value],
//         model
//       );
//       break;

//     case "ask":
//       const question = action.args.question || "Please provide instructions.";
//       console.log(`${logPrefix} Asking: ${question}`);
//       automationStopped = true;
//       chrome.tabs.sendMessage(tabIdRef.value, {
//         type: "COMMAND_RESPONSE",
//         response: { message: question },
//       });
//       return "ASK_PAUSED";

//     default:
//       const errorMessage = `${logPrefix} Unknown action: ${action.name}`;
//       await chrome.runtime.sendMessage({
//         type: "FINISH_PROCESS_COMMAND",
//         response: errorMessage,
//       });
//       throw new Error(errorMessage);
//   }
// }

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

async function sendActionToTab(
  action: { name: string; args: any },
  tabId: number
): Promise<any> {
  await ensureContentScriptInjected(tabId);
  console.log(
    `[background.ts] Sending action to content script on tab ${tabId}:`
  );
  console.log(action);
  // Map the function call name to the action type expected by content.js
  const actionType = action.name;
  console.log(actionType);
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      {
        type: "PERFORM_ACTION",
        action: { type: actionType, data: action.args },
      },
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

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === "PROCESS_COMMAND") {
    console.log("[background.ts] Received PROCESS_COMMAND message:", msg);
    automationStopped = false;
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!activeTab?.id) {
      console.error(
        "[background.ts] No active tab found, aborting command processing."
      );
      await chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: "No active tab found, aborting command processing.",
      });
      sendResponse({ success: false, error: "No active tab" });
      return;
    }
    console.log("[background.ts] Active tab ID:", activeTab.id);
    recentActionsMap[activeTab.id] = [];
    currentTasks[activeTab.id] = "Processing...";
    console.log(
      "[background.ts] Starting processCommand for tab:",
      activeTab.id
    );
    await processCommand(
      activeTab.id,
      msg.command,
      msg.command,
      [],
      msg.model || "gemini"
    );
    console.log(
      "[background.ts] Finished processing command for tab:",
      activeTab.id
    );
    sendResponse({ success: true });
  } else if (msg.type === "NEW_CHAT") {
    console.log("[background.ts] Received NEW_CHAT message");
    await chrome.storage.local.set({ conversationHistory: [] });
    console.log("[background.ts] Cleared conversation history");
    sendResponse({ success: true });
  } else if (msg.type === "STOP_AUTOMATION") {
    console.log("[background.ts] Received STOP_AUTOMATION message");
    automationStopped = true;
    console.log("[background.ts] Automation stopped");
    sendResponse({ success: true });
  } else if (msg.type === "GET_TAB_ID") {
    console.log("[background.ts] Received GET_TAB_ID message");
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
    return false;
  } else if (msg.type === "LOGIN_WITH_GOOGLE") {
    console.log("[background.ts] Received LOGIN_WITH_GOOGLE message");
    try {
      // Get the auth token from Chrome's identity API
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError || !token) {
          console.error(
            "[background.ts] Failed to get auth token:",
            chrome.runtime.lastError?.message
          );
          sendResponse({
            success: false,
            error:
              chrome.runtime.lastError?.message || "Failed to get auth token",
          });
          return;
        }

        try {
          // Fetch user info from Google API
          const userInfoResponse = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!userInfoResponse.ok) {
            throw new Error(
              `Failed to fetch user info: ${userInfoResponse.statusText}`
            );
          }

          const userInfo = await userInfoResponse.json();
          console.log("[background.ts] Successfully fetched user info");

          // Send the user info back to the content script
          sendResponse({
            success: true,
            userInfo,
            token,
          });
        } catch (error) {
          console.error("[background.ts] Error fetching user info:", error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
      return true; // Keep the message channel open for the async response
    } catch (error) {
      console.error(
        "[background.ts] Error in LOGIN_WITH_GOOGLE handler:",
        error
      );
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  } else if (msg.type === "LOGOUT") {
    console.log("[background.ts] Received LOGOUT message");
    try {
      // Get the auth token to revoke it
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          console.log("[background.ts] No token found to revoke");
          sendResponse({ success: true, message: "No token to revoke" });
          return;
        }

        // Revoke token
        chrome.identity.removeCachedAuthToken({ token }, () => {
          // Revoke access on Google's servers
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
            .then(() => {
              console.log("[background.ts] Token revoked successfully");
              sendResponse({ success: true });
            })
            .catch((error) => {
              console.error("[background.ts] Error revoking token:", error);
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              });
            });
        });
      });
      return true; // Keep the message channel open for the async response
    } catch (error) {
      console.error("[background.ts] Error in LOGOUT handler:", error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  } else if (msg.type === "EXECUTE_APPS_SCRIPT") {
    console.log("[background.ts] Received EXECUTE_APPS_SCRIPT message:", msg);
    const { functionName, args } = msg;
    try {
      console.log(
        `[background.ts] Executing Apps Script function: ${functionName} with args:`,
        args
      );
      const result = await executeAppsScriptFunction(functionName, args);
      console.log(
        `[background.ts] Successfully executed Apps Script function: ${functionName}`,
        result
      );
      sendResponse({ success: true, result });
    } catch (error: any) {
      console.error(
        `[background.ts] Failed to execute Apps Script function ${functionName}:`,
        error
      );
      sendResponse({
        success: false,
        error: error.message || "Failed to execute Apps Script function",
      });
    }
    return true;
  }
});

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
  activeAutomationTabs.add(tabId);
  await waitForTabLoad(tabId);
  await ensureContentScriptInjected(tabId);
}

async function createTab(url: string): Promise<chrome.tabs.Tab> {
  return new Promise((resolve) => {
    chrome.tabs.create({ url }, (tab) => {
      const listener = async (
        tabId: number,
        changeInfo: chrome.tabs.TabChangeInfo
      ) => {
        if (tabId === tab.id && changeInfo.status === "complete") {
          activeAutomationTabs.add(tab.id);
          chrome.tabs.onUpdated.removeListener(listener);
          await ensureContentScriptInjected(tab.id);
          resolve(tab);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}
