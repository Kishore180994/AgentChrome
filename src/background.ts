import { PageElement, UncompressedPageElement } from "./services/ai/interfaces";
import { chatWithAI } from "./services/openai/api";
import {
  AgentActionItem,
  AskAction,
  LocalAction,
  LocalActionType,
} from "./types/actionType";
import { AIResponseFormat } from "./types/responseFormat";

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
    lastActionType === "go_to_url" ||
    lastActionType === "open_tab" ||
    lastActionType === "navigate"
  ) {
    await waitForTabLoad(tabId);
  } else if (lastActionType === "click" || lastActionType === "submit_form") {
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
                screenshotDataUrl = dataUrl; // fallback
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

    const raw = await chatWithAI(
      fullContextMessage,
      "session-id",
      currentState,
      screenshotDataUrl || undefined,
      model as "gemini" | "claude"
    );
    const { current_state } = raw;
    let { action } = raw || (current_state.action ? current_state : {});

    if (!current_state || !action) {
      console.warn("[background.ts] No valid state or action, stopping");
      await chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: "No valid state or action returned from AI, aborting.",
      });
      return;
    }

    current_state.user_command = initialCommand;
    const {
      evaluation_previous_goal: evaluation,
      memory,
      next_goal,
      user_command,
    } = current_state;

    currentTasks[tabId] = next_goal || "Processing...";
    const tabIdRef = { value: tabId };

    chrome.runtime.sendMessage({ type: "MEMORY_UPDATE", response: memory });
    chrome.tabs.sendMessage(tabIdRef.value, {
      type: "MEMORY_UPDATE",
      response: memory,
    });

    if (!action.length) {
      console.log("[background.ts] No actions, process complete");
      resetExecutionState(tabId);
      activeAutomationTabs.clear();
      return;
    }

    const localActions: LocalAction[] = action.map(mapAiItemToLocalAction);
    const executedActions: string[] = [];
    const result = await executeLocalActions(
      localActions,
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
    if (localActions.length > 0) {
      const lastAction = localActions[localActions.length - 1];
      await waitForPotentialNavigation(tabIdRef.value, lastAction.type);
    }

    const doneAction = localActions.find((a) => a.type === "done");
    if (doneAction) {
      automationStopped = true;
      chrome.tabs.sendMessage(tabIdRef.value, {
        type: "DISPLAY_MESSAGE",
        response: doneAction,
      });
      resetExecutionState(tabId);
      activeAutomationTabs.clear();
      return;
    }

    const refetchAction = localActions.find((a) => a.type === "refetch");
    if (refetchAction) {
      chrome.tabs.sendMessage(tabIdRef.value, {
        type: "DISPLAY_MESSAGE",
        response: {
          ...refetchAction,
          data: { ...refetchAction.data, text: "Refetching page elements" },
        },
      });
    }

    recentActionsMap[tabId] = [
      ...recentActionsMap[tabId],
      ...executedActions,
    ].slice(-5);

    const promptParts = [
      evaluation ? `Evaluation: ${evaluation}` : "",
      memory ? `Previous actions: ${memory}` : "",
      next_goal ? `Next step: ${next_goal}` : "",
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

function mapAiItemToLocalAction(item: AgentActionItem): LocalAction {
  const actionName = Object.keys(item)[0];
  const params = (item as any)[actionName] || {};

  let type: LocalActionType;
  // --- Focus on extracting the direct index ---
  const index = typeof params.index === "number" ? params.index : undefined;
  let data: LocalAction["data"] = {}; // Initialize data

  switch (actionName.toLowerCase()) {
    case "click_element":
      type = "click";
      // Only pass the index, as per the new prompt/DOM structure
      data = { index };
      // Optional: keep selector for logging/debugging if AI still provides it
      // if (params.selector) data.selector = params.selector;
      break;
    case "input_text":
      type = "input_text";
      // Pass index and text
      data = { index, text: params.text };
      // if (params.selector) data.selector = params.selector; // Optional logging
      break;
    case "open_tab":
    case "go_to_url":
    case "navigate":
      type = "navigate";
      data = { url: params.url };
      break;
    case "extract_content":
      type = "extract";
      // Pass index
      data = { index };
      // if (params.selector) data.selector = params.selector; // Optional logging
      break;
    case "submit_form":
      type = "submit_form";
      // Pass index (targeting the submit button/element directly)
      data = { index };
      // if (params.selector) data.selector = params.selector; // Optional logging
      break;
    case "key_press":
      type = "key_press";
      // Pass index and key
      data = { key: params.key, index };
      // if (params.selector) data.selector = params.selector; // Optional logging
      break;
    case "scroll":
      type = "scroll";
      // Scroll doesn't usually target an index, pass direction/offset
      data = { direction: params.direction, offset: params.offset };
      break;
    case "verify":
      // This action seems browser-level, not element specific
      type = "verify";
      data = { url: params.url };
      break;
    case "ask":
      type = "ask";
      // Ensure correct type casting if using AskAction type
      data = {
        question: (item as AskAction).ask?.question || "Missing question",
      };
      break;
    case "refetch":
      type = "refetch";
      data = {};
      break;
    case "done":
      type = "done";
      data = {
        text: params.text || "Task completed.",
        output: params.output,
      };
      break;
    default:
      console.warn(
        "[background.ts] Unknown action from AI:",
        actionName,
        params
      );
      // Default to 'wait' or handle as an error appropriately
      type = "wait"; // Or potentially throw an error
      data = {};
  }

  // Ensure index is valid number for actions that require it
  if (
    ["click", "input_text", "extract", "submit_form", "key_press"].includes(
      type
    ) &&
    typeof index !== "number"
  ) {
    console.error(
      `[background.ts] Invalid or missing index for action type ${type}:`,
      params
    );
    // Handle error - maybe default to a 'fail' state or throw?
    // For now, let's map it but ActionExecutor will likely fail it.
    // Alternatively, map to a different action type like 'wait' or 'fail'.
    // type = 'wait'; // Example: Change type if index is invalid
  }

  return { id: Date.now().toString(), type, data, description: actionName };
}

async function executeLocalActions(
  actions: LocalAction[],
  index: number,
  tabIdRef: { value: number },
  contextMessage: string,
  currentState: AIResponseFormat,
  uncompressedPageElements: UncompressedPageElement[],
  executedActions: string[] = [],
  model: string
): Promise<any> {
  const logPrefix = `[background.ts] Tab ${tabIdRef.value}`;
  if (index >= actions.length) {
    console.log(`${logPrefix} All actions completed`);
    return "ACTIONS_COMPLETED";
  }

  const action = actions[index];
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    try {
      console.log(
        `${logPrefix} Executing action ${index + 1}/${actions.length}:`,
        action
      );
      const output = await performLocalAction(action, tabIdRef, model);
      const actionDesc = getActionDescription(action);
      executedActions.push(actionDesc);

      if (output === "ASK_PAUSED" || output === "DONE") {
        console.log(`${logPrefix} Paused with ${output}`);
        return output;
      }
      if (action.type === "extract") return output;

      return await executeLocalActions(
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
        const prompt = `Action "${action.type}" failed after ${maxRetries} attempts: ${err}. Suggest alternatives for: '${currentState.user_command}'.`;
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

function getActionDescription(action: LocalAction): string {
  switch (action.type) {
    case "click":
      return `Clicked on element at index ${action.data.index}`;
    case "navigate":
      return `Navigated to ${action.data.url}`;
    case "extract":
      return `Extracted from element at index ${action.data.index}`;
    case "refetch":
      return "Re-fetched page elements";
    default:
      return action.type;
  }
}

async function performLocalAction(
  a: LocalAction,
  tabIdRef: { value: number },
  model: string
): Promise<any> {
  const logPrefix = `[background.ts] Tab ${tabIdRef.value}`;

  switch (a.type) {
    case "go_to_url":
    case "navigate":
      if (!a.data.url) {
        const errorMessage = `${logPrefix} No URL provided`;
        await chrome.runtime.sendMessage({
          type: "FINISH_PROCESS_COMMAND",
          response: errorMessage,
        });
        throw new Error(errorMessage);
      }
      console.log(`${logPrefix} Navigating to ${a.data.url}`);
      await navigateTab(tabIdRef.value, a.data.url);
      break;

    case "open_tab":
      if (!a.data.url) {
        const errorMessage = `${logPrefix} No URL provided`;
        await chrome.runtime.sendMessage({
          type: "FINISH_PROCESS_COMMAND",
          response: errorMessage,
        });
        throw new Error(errorMessage);
      }
      console.log(`${logPrefix} Opening tab with ${a.data.url}`);
      const newTab = await createTab(a.data.url);
      if (newTab.id) tabIdRef.value = newTab.id;
      break;

    case "verify":
      if (!a.data.url) {
        const errorMessage = `${logPrefix} No URL provided`;
        await chrome.runtime.sendMessage({
          type: "FINISH_PROCESS_COMMAND",
          response: errorMessage,
        });
        throw new Error(errorMessage);
      }
      console.log(`${logPrefix} Verifying URL: ${a.data.url}`);
      await verifyOrOpenTab(a.data.url, tabIdRef);
      break;

    case "click":
    case "input_text":
    case "submit_form":
    case "key_press":
    case "extract":
      {
        try {
          return await sendActionToTab(a, tabIdRef.value);
        } catch (err) {
          const errorMessage = `Failed to perform action ${a.type}: ${
            err instanceof Error ? err.message : "Unknown error"
          }`;
          console.log(`${logPrefix} ${errorMessage}`);
        }
      }
      break;

    case "scroll":
      console.log(`${logPrefix} Scrolling`, a.data);
      await sendActionToTab(a, tabIdRef.value);
      break;

    case "done":
      console.log(`${logPrefix} Tasks completed`);
      const response = {
        message: a.data.text || "Task completed.",
        output: a.data.output,
      };
      chrome.runtime.sendMessage({
        type: "COMMAND_RESPONSE",
        response,
      });
      automationStopped = true;
      return "DONE";

    case "wait":
      console.log(`${logPrefix} Waiting 2s`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      break;

    case "refetch":
      console.log(`${logPrefix} Refetching page elements`);
      const refetchPrompt = `Page elements refetched. Current goal: ${
        currentTasks[tabIdRef.value] || "unknown"
      }. Provide next actions based on the updated page state.`;
      await processCommand(
        tabIdRef.value,
        refetchPrompt,
        currentTasks[tabIdRef.value] || "",
        recentActionsMap[tabIdRef.value],
        model
      );
      break;

    case "ask":
      const question = a.data.question || "Please provide instructions.";
      console.log(`${logPrefix} Asking: ${question}`);
      automationStopped = true;
      chrome.tabs.sendMessage(tabIdRef.value, {
        type: "DISPLAY_MESSAGE",
        response: { message: question },
      });
      return "ASK_PAUSED";

    default:
      const errorMessage = `${logPrefix} Unknown action: ${a.type}`;
      await chrome.runtime.sendMessage({
        type: "FINISH_PROCESS_COMMAND",
        response: errorMessage,
      });
      throw new Error(errorMessage);
  }
}

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
  action: LocalAction,
  tabId: number
): Promise<any> {
  await ensureContentScriptInjected(tabId);
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

chrome.runtime.onMessage.addListener(async (msg, _sender, resp) => {
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
      resp({ success: false, error: "No active tab" });
      return;
    }
    recentActionsMap[activeTab.id] = [];
    currentTasks[activeTab.id] = "Processing...";
    await processCommand(
      activeTab.id,
      msg.command,
      msg.command,
      [],
      msg.model || "gemini"
    );
    resp({ success: true });
  } else if (msg.type === "NEW_CHAT") {
    await chrome.storage.local.set({ conversationHistory: [] });
    resp({ success: true });
  } else if (msg.type === "STOP_AUTOMATION") {
    automationStopped = true;
    resp({ success: true });
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
