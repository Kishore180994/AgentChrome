import {
  saveConversationHistory,
  D4M_CONVERSATION_HISTORY_KEY,
  HUBSPOT_CONVERSATION_HISTORY_KEY,
} from "./services/storage.ts";

import {
  GeminiFunctionCall,
  GeminiFunctionCallWrapper,
  HubSpotExecutionResult,
  PageElement,
  ReportCurrentStateArgs,
  UncompressedPageElement,
} from "./services/ai/interfaces";
import { executeAppsScriptFunction } from "./services/google/appsScript";
import { executeHubspotFunction } from "./services/hubspot";
import { chatWithAI } from "./services/openai/api";
import { DOMAction, LocalAction } from "./types/actionType.ts";
import { getGoogleDocUrlFromId } from "./utils/helpers";
import { MESSAGE_TYPE } from "./components/chatWidget/types.ts";
import { MemoryState } from "./types/memoryTypes.ts";
// --- Modularized Tool Handlers ---

/**
 * Handles Google Workspace tool actions.
 */
async function handleGoogleWorkspaceAction(
  functionName: string,
  args: any,
  _tabId: number,
  executedActions: string[]
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
      type: MESSAGE_TYPE.COMMAND_RESPONSE,
      response: {
        message: result.status,
        output: `url: ${
          result.fileId
            ? getGoogleDocUrlFromId(result.fileId)
            : result.newDocUrl
        }`,
      },
    });
    await findAndUngroupDfmGroup();
    executedActions.push(`Executed Google Workspace function: ${functionName}`);
  } catch (error) {
    console.error(
      "[background.ts] Google Workspace function call failed:",
      error
    );
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.COMMAND_RESPONSE,
      response: {
        message:
          "Google Workspace function execution failed: " +
          (error as Error).message,
      },
    });
    await findAndUngroupDfmGroup();
    throw error;
  }
}

/**
 * Handles HubSpot tool actions.
 */
async function handleHubspotAction(
  functionName: string,
  args: any,
  tabId: number,
  executedActions: string[]
) {
  try {
    console.log("[background.ts] handleHubspotAction ENTRY", {
      functionName,
      args,
      tabId,
      executedActions,
    });
    // Check for duplicate create operations to prevent multiple identical operations
    const isCreateOperation = [
      "hubspot_createContact",
      "hubspot_createCompany",
      "hubspot_createDeal",
      "hubspot_createTask",
      "hubspot_createTicket",
      "hubspot_createList",
    ].includes(functionName);

    // Generate a unique key for this operation to deduplicate
    const operationKey = isCreateOperation
      ? `${functionName}-${JSON.stringify(args)}`
      : null;

    // For create operations, check if this exact operation was already executed
    if (isCreateOperation && operationKey) {
      // Get the last 5 actions to check for duplicates
      const recentActions = recentActionsMap[tabId] || [];

      // Check if we already executed this exact create operation recently
      const isDuplicate = recentActions.some(
        (action) =>
          action.includes(`Executed HubSpot function: ${functionName}`) &&
          action.includes(operationKey.substring(0, 20))
      );

      if (isDuplicate) {
        console.log(
          `[background.ts] Skipping duplicate HubSpot create operation: ${functionName}`,
          args
        );

        // Send a HubspotResponse indicating a skipped duplicate
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.HUBSPOT_RESPONSE,
          response: {
            success: true,
            functionName: functionName,
            message: `Skipped duplicate ${functionName} operation - already executed`,
            details: { args, skipped: true }, // Provide context
          } as HubSpotExecutionResult,
        });
        await findAndUngroupDfmGroup();
        executedActions.push(
          `Skipped duplicate HubSpot function: ${functionName}`
        );
        return;
      }
    }

    console.log("[background.ts] Executing HubSpot function:", {
      functionName,
      args,
    });
    // Execute the HubSpot function
    const result: HubSpotExecutionResult = await executeHubspotFunction({
      name: functionName,
      args,
    });
    console.log(
      "[background.ts] HubSpot function call executed successfully:",
      result
    );
    // Send the HubSpot execution result using the new MESSAGE_TYPE.HUBSPOT_RESPONSE type
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.HUBSPOT_RESPONSE,
      response: result,
    });
    await findAndUngroupDfmGroup();
    // For create operations, include a unique fingerprint in the action description
    if (isCreateOperation && operationKey) {
      executedActions.push(
        `Executed HubSpot function: ${functionName} [${operationKey.substring(
          0,
          20
        )}...]`
      );
      // Set automation to stop after this iteration
      automationStopped = true;
      console.log(
        `[background.ts] Stopping automation after successful ${functionName} to prevent duplicates`
      );
    } else {
      executedActions.push(`Executed HubSpot function: ${functionName}`);
    }
  } catch (error) {
    console.error("[background.ts] HubSpot function call failed:", error);
    // Send a HubspotResponse indicating an error
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPE.HUBSPOT_RESPONSE,
      response: {
        success: false,
        functionName: functionName,
        // Provide a user-friendly error message
        error:
          "HubSpot function execution failed: " +
          (error instanceof Error ? error.message : String(error)),
        // Provide a general error type, or try to infer a more specific one if possible
        errorType: (error as any).errorType || "general",
        details: error, // Include the error object for details
        status: (error as any).status,
      } as HubSpotExecutionResult,
    });
    await findAndUngroupDfmGroup();
    automationStopped = true;
    throw error;
  }
}

/**
 * Handles DOM tool actions.
 */
async function handleDomAction(
  functionName: string,
  args: any,
  tabIdRef: { value: number },
  executedActions: string[],
  setLastActionType: (type: string) => void,
  initialCommand: string,
  model: string
) {
  switch (functionName) {
    case DOMAction.clickElement.name: {
      const index = (args as any).index;
      if (typeof index !== "number")
        throw new Error(`Invalid index for ${functionName}: ${index}`);
      await sendActionToTab(
        {
          id: Date.now().toString(),
          type: DOMAction.clickElement.name,
          data: { index },
          description: functionName,
        },
        tabIdRef.value
      );
      executedActions.push(`Clicked on element at index ${index}`);
      setLastActionType("click");
      break;
    }
    case DOMAction.inputText.name: {
      const index = (args as any).index;
      const text = (args as any).text ?? "";
      if (typeof index !== "number")
        throw new Error(`Invalid index for ${functionName}: ${index}`);
      await sendActionToTab(
        {
          id: Date.now().toString(),
          type: DOMAction.inputText.name,
          data: { index, text },
          description: functionName,
        },
        tabIdRef.value
      );
      executedActions.push(`Entered text "${text}" at index ${index}`);
      break;
    }
    case DOMAction.submitForm.name: {
      const index = (args as any).index;
      if (typeof index !== "number")
        throw new Error(`Invalid index for ${functionName}: ${index}`);
      await sendActionToTab(
        {
          id: Date.now().toString(),
          type: DOMAction.submitForm.name,
          data: { index },
          description: functionName,
        },
        tabIdRef.value
      );
      executedActions.push(`Submitted form at index ${index}`);
      setLastActionType(DOMAction.submitForm.name);
      break;
    }
    case DOMAction.keyPress.name: {
      const index = (args as any).index;
      const key = (args as any).key;
      if (typeof index !== "number")
        throw new Error(`Invalid index for ${functionName}: ${index}`);
      if (typeof key !== "string")
        throw new Error(`Invalid key for ${functionName}: ${key}`);
      await sendActionToTab(
        {
          id: Date.now().toString(),
          type: DOMAction.keyPress.name, // Map to valid LocalActionType
          data: { index, key },
          description: functionName, // Keep original name here
        },
        tabIdRef.value
      );
      executedActions.push(`Pressed key "${key}" at index ${index}`);
      break;
    }
    case DOMAction.scroll.name: {
      const direction = (args as any).direction;
      const offset = (args as any).offset;
      if (direction !== "up" && direction !== "down")
        throw new Error(`Invalid direction for scroll: ${direction}`);
      if (typeof offset !== "number")
        throw new Error(`Invalid offset for scroll: ${offset}`);
      await sendActionToTab(
        {
          id: Date.now().toString(),
          type: DOMAction.scroll.name, // Map to valid LocalActionType
          data: { direction, offset },
          description: functionName, // Keep original name here
        },
        tabIdRef.value
      );
      executedActions.push(`Scrolled ${direction} by ${offset} pixels`);
      break;
    }
    case DOMAction.goToExistingTab.name: {
      const targetUrl = (args as any).url;
      if (!targetUrl) throw new Error(`No URL provided for ${functionName}`);
      await navigateTab(targetUrl, initialCommand, executedActions, model);
      break;
    }

    case DOMAction.openTab.name: {
      const url = (args as any).url;
      if (!url) throw new Error(`No URL provided for ${functionName}`);
      console.log("[background.ts] Handling DOM action:", functionName, args);
      await sendActionToTab(
        {
          id: Date.now().toString(),
          type: DOMAction.openTab.name,
          data: { url },
          description: functionName,
        },
        tabIdRef.value
      );
      executedActions.push(`Opened new tab with URL ${url}`);
      setLastActionType(DOMAction.openTab.name);
      break;
    }
    case DOMAction.extractContent.name: {
      const index = (args as any).index;
      if (typeof index !== "number")
        throw new Error(`Invalid index for ${functionName}: ${index}`);
      const result = await sendActionToTab(
        {
          id: Date.now().toString(),
          type: DOMAction.extractContent.name, // Map to valid LocalActionType
          data: { index },
          description: functionName, // Keep original name here
        },
        tabIdRef.value
      );
      executedActions.push(
        `Extracted content from element at index ${index}: "${result}"`
      );
      break;
    }
    case DOMAction.done.name: {
      const message = (args as any).message || "Task completed.";
      const output = (args as any).output;
      console.log(`[background.ts] Task completed: "${message}"`);
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.AI_RESPONSE,
        action: "completion",
        message: message,
        output: output,
      });
      await findAndUngroupDfmGroup();
      executedActions.push(
        `Completed task: ${message}${output ? ` Output: ${output}` : ""}`
      );
      automationStopped = true;
      break;
    }
    case DOMAction.ask.name: {
      const question = (args as any).question || "Please provide instructions.";
      console.log(
        `[background.ts] Asking question via ${DOMAction.ask.name}: "${question}"`
      );
      // Send as an AI_RESPONSE with action "question"
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.AI_RESPONSE,
        action: "question",
        question: question,
      });
      executedActions.push(`Asked question: "${question}"`);
      automationStopped = true;
      break;
    }
    case DOMAction.reportCurrentState.name: {
      executedActions.push("Reported current state.");
      break;
    }
    default:
      throw new Error(`Unknown DOM action: ${functionName}`);
  }
}

// --- End Modularized Tool Handlers ---

let automationStopped: boolean = false;
const activeAutomationTabs: Set<number> = new Set();
const recentActionsMap: Record<number, string[]> = {};
const currentTasks: Record<number, string> = {};
const activePorts: Record<number, chrome.runtime.Port> = {};

// Add state for the background script (optional but helpful for clarity)
let isRecordingActive = false;
let isWebSocketConnected = false;

// Global variable to store the group ID once found/created
let doFormeGroupId: number | null = null;
const doFormeGroupName = "DFM";
/**
 * Finds the existing 'DFM' group ID.
 * Returns null if not found.
 */
async function findDoFormeGroupId(): Promise<number | null> {
  console.log(
    `[findDoFormeGroupId] Function start. Current stored ID: ${doFormeGroupId}`
  ); // Log start
  if (doFormeGroupId !== null) {
    console.log(
      `[findDoFormeGroupId] Checking validity of stored ID: ${doFormeGroupId}`
    ); // Log check
    try {
      await chrome.tabGroups.get(doFormeGroupId);
      console.log(`[findDoFormeGroupId] Stored ID ${doFormeGroupId} is valid.`);
      return doFormeGroupId;
    } catch (e) {
      // Catch specific error
      console.warn(
        `[findDoFormeGroupId] Stored group ID ${doFormeGroupId} no longer valid. Error: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      doFormeGroupId = null;
    }
  } else {
    console.log(`[findDoFormeGroupId] No stored ID.`);
  }

  try {
    console.log(
      `[findDoFormeGroupId] Querying for group titled '${doFormeGroupName}'...`
    );
    const groups = await chrome.tabGroups.query({ title: doFormeGroupName });
    console.log(`[findDoFormeGroupId] Query returned ${groups.length} groups.`);
    if (groups.length > 0) {
      doFormeGroupId = groups[0].id;
      console.log(
        `[findDoFormeGroupId] Found existing group with ID: ${doFormeGroupId}`
      );
      return doFormeGroupId;
    } else {
      console.log(
        `[findDoFormeGroupId] Query found no groups named '${doFormeGroupName}'.`
      );
    }
  } catch (error) {
    console.error("[findDoFormeGroupId] Error querying tab groups:", error);
  }

  console.log("[findDoFormeGroupId] Function end. Returning null.");
  return null;
}

/**
 * Ungroups all tabs currently within a specific group.
 * The tabs themselves will remain open in the window.
 * Requires "tabs" permission (and potentially "tabGroups" for related operations).
 *
 * @param groupId The numeric ID of the group whose tabs should be ungrouped.
 */
async function ungroupTabsInGroup(groupId: number): Promise<void> {
  // Basic validation for the groupId
  if (typeof groupId !== "number" || groupId < 0) {
    // Group IDs are non-negative
    console.warn("[ungroupTabsInGroup] Invalid groupId provided:", groupId);
    return;
  }
  console.log(
    `[ungroupTabsInGroup] Attempting to ungroup tabs in group ${groupId}...`
  );

  try {
    // 1. Find all tabs belonging to the specified group
    const tabsInGroup = await chrome.tabs.query({ groupId: groupId });

    if (tabsInGroup.length === 0) {
      console.log(
        `[ungroupTabsInGroup] No tabs found in group ${groupId}. The group might be empty or already removed.`
      );
      return;
    }

    // 2. Extract the valid IDs of the tabs found
    const tabIdsToUngroup = tabsInGroup
      .map((tab) => tab.id)
      .filter((id) => typeof id === "number") as number[];

    if (tabIdsToUngroup.length === 0) {
      console.warn(
        `[ungroupTabsInGroup] Found tabs in group ${groupId}, but could not extract valid tab IDs.`
      );
      return;
    }

    console.log(
      `[ungroupTabsInGroup] Found ${tabIdsToUngroup.length} tabs to ungroup from group ${groupId}:`,
      tabIdsToUngroup
    );

    // 3. Call chrome.tabs.ungroup with the collected tab IDs
    await chrome.tabs.ungroup(tabIdsToUngroup);

    console.log(
      `[ungroupTabsInGroup] Successfully ungrouped ${tabIdsToUngroup.length} tabs from group ${groupId}.`
    );
  } catch (error) {
    console.error(
      `[ungroupTabsInGroup] Error during ungrouping process for group ${groupId}:`,
      error
    );

    if (error instanceof Error) {
      if (error.message.includes("No group with id")) {
        console.warn(
          `[ungroupTabsInGroup] Group ${groupId} likely ceased to exist before ungrouping finished.`
        );
      } else if (error.message.includes("No tab with id")) {
        console.warn(
          `[ungroupTabsInGroup] One or more tabs may have been closed before they could be ungrouped.`
        );
      }
    }
  }
}

async function findAndUngroupDfmGroup() {
  console.log("Finding DFM group to ungroup...");
  try {
    const groups = await chrome.tabGroups.query({ title: doFormeGroupName });
    if (groups.length > 0) {
      const currentGroupId = groups[0].id;
      console.log(
        `Found current DFM group ID: ${currentGroupId}. Now attempting to ungroup.`
      );
      await ungroupTabsInGroup(currentGroupId);
    } else {
      console.log("Could not find any group named 'DFM' right now.");
    }
  } catch (error) {
    console.error("Error finding or ungrouping DFM group:", error);
  }
}

/**
 * Adds a tab to the 'doForme' group.
 * Creates the group if it doesn't exist.
 */
async function addTabToDoFormeGroup(tabId: number): Promise<void> {
  if (!tabId) {
    console.warn("[addTabToDoFormeGroup] Invalid tabId received:", tabId);
    return;
  }
  console.log(
    `[addTabToDoFormeGroup] Attempting to add tab ${tabId} to '${doFormeGroupName}' group.`
  );

  try {
    let groupId = await findDoFormeGroupId();

    if (groupId !== null) {
      // --- Group exists ---
      console.log(
        `[addTabToDoFormeGroup] Adding tab ${tabId} to existing group ${groupId}.`
      );
      try {
        await chrome.tabs.get(tabId); // Check if tab exists
        await chrome.tabs.group({ groupId: groupId, tabIds: [tabId] });
        console.log(
          `[addTabToDoFormeGroup] Tab ${tabId} added to existing group ${groupId}.`
        );
      } catch (tabError) {
        console.warn(
          `[addTabToDoFormeGroup] Tab ${tabId} check failed or couldn't be added to group ${groupId}:`,
          tabError instanceof Error ? tabError.message : String(tabError)
        );
      }
    } else {
      // --- Group doesn't exist, create it ---
      console.log(
        `[addTabToDoFormeGroup] No '${doFormeGroupName}' group found. Creating new group with tab ${tabId}.`
      );
      try {
        await chrome.tabs.get(tabId); // Check if tab exists first
        const newGroupId = await chrome.tabs.group({ tabIds: [tabId] });
        console.log(
          `[addTabToDoFormeGroup] New group ${newGroupId} created. Attempting to update title/color...` // Log before update
        );

        // --- CRITICAL STEP: Try to update the new group ---
        try {
          await chrome.tabGroups.update(newGroupId, {
            title: doFormeGroupName,
            color: "yellow", // Make sure color is valid
          });
          console.log(
            `[addTabToDoFormeGroup] Successfully updated group ${newGroupId}. Storing ID.`
          ); // Log update success
          // --- Store the ID ONLY if the update succeeded ---
          doFormeGroupId = newGroupId;
        } catch (updateError) {
          // --- Log failure to update ---
          console.error(
            `[addTabToDoFormeGroup] FAILED to update group ${newGroupId} title/color:`,
            updateError
          );
          // Consider ungrouping the tab if setup failed
          try {
            console.warn(
              `[addTabToDoFormeGroup] Attempting to ungroup tab ${tabId} due to update failure.`
            );
            await chrome.tabs.ungroup([tabId]);
          } catch (ungroupError) {
            console.error(
              `[addTabToDoFormeGroup] Failed to ungroup tab ${tabId}:`,
              ungroupError
            );
          }
          // DO NOT store the group ID if update failed
        }
      } catch (tabError) {
        console.warn(
          `[addTabToDoFormeGroup] Tab ${tabId} check failed or couldn't be used to create group:`,
          tabError instanceof Error ? tabError.message : String(tabError)
        );
      }
    }
  } catch (error) {
    console.error(
      `[addTabToDoFormeGroup] Error processing tab ${tabId} for group:`,
      error
    );
    if (error instanceof Error && error.message.includes("No group with id")) {
      console.warn(
        `[addTabToDoFormeGroup] The stored group ID ${doFormeGroupId} seems invalid. Resetting.`
      );
      doFormeGroupId = null; // Reset stored ID if it became invalid
    }
  }
}

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
      tab.url.startsWith("chrome-extension://")
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
    return true;
  } catch (err: any) {
    // Log common non-critical errors, but don't treat them as failures for this function's purpose
    if (
      err.message?.includes("Cannot access a chrome:// URL") ||
      err.message?.includes("No tab with id") ||
      err.message?.includes("The tab was closed") ||
      err.message?.includes("Cannot access contents of the page") ||
      err.message?.includes("Missing host permission for the tab") ||
      err.message?.includes("Receiving end does not exist") ||
      err.message?.includes("Could not establish connection")
    ) {
      console.warn(
        `[background.ts] Content script injection skipped/ignored for tab ${tabId}: ${err.message}`
      );
      return false;
    } else {
      // Log unexpected errors
      console.error(
        `[background.ts] Unexpected injection error for tab ${tabId}:`,
        err
      );
      return false;
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
  // If in HubSpot mode, skip throwing error and return empty arrays
  if (await getIsHubspotMode()) {
    console.warn(
      "[background.ts] HubSpot mode active - skipping DOM error and returning empty elements"
    );
    return { compressed: [], uncompressed: [] };
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
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const currentUrl = await getTabUrl(tabId);
    if (currentUrl !== initialUrl) {
      await waitForTabLoad(tabId);
    }
  }
}

const MAX_STATE_RETRIES = 1;

export async function getIsHubspotMode(): Promise<boolean> {
  try {
    const syncResult = await chrome.storage.sync.get(["hubspotMode"]);
    if (syncResult.hubspotMode === true) return true;
    const localResult = await chrome.storage.local.get(["hubspotMode"]);
    return localResult.hubspotMode === true;
  } catch {
    return false;
  }
}

export async function processCommand(
  tabId: number,
  contextMessage: string,
  initialCommand: string,
  actionHistory: string[] = [],
  model: string = "gemini",
  selectedSlashCommand: string,
  retryCount: number = 0
) {
  const isHubspotMode = await getIsHubspotMode();
  const modeLogPrefix = isHubspotMode ? "[HubSpot Mode]" : "[D4M Mode]";

  console.log(
    `[background.ts]${modeLogPrefix} processCommand ENTRY (Retry: ${retryCount})`,
    {
      tabId,
      contextMessage,
      initialCommand,
      actionHistory: actionHistory.slice(-3),
      model,
    }
  );

  if (automationStopped) {
    console.log(
      "[background.ts] Automation stopped flag is true. Not processing."
    );
    // Ensure cleanup if stopped abruptly
    if (activeAutomationTabs.has(tabId)) {
      resetExecutionState(tabId);
      activeAutomationTabs.delete(tabId);
      await findAndUngroupDfmGroup();
    }
    return;
  }

  // Ensure tab is tracked and potentially grouped
  if (!activeAutomationTabs.has(tabId)) {
    await addTabToDoFormeGroup(tabId);
    activeAutomationTabs.add(tabId);
    recentActionsMap[tabId] = recentActionsMap[tabId] || [];
  }

  let pageState: PageElement[] = [];
  let screenshotDataUrl: string | null = null;
  let tabUrl: string = "";
  let allTabs: string[] = [];
  let current_state: ReportCurrentStateArgs["current_state"] | null = null;

  try {
    // --- 1. Fetch Environment State (DOM, Screenshot, Tabs) ---
    if (!isHubspotMode) {
      console.log(`[background.ts]${modeLogPrefix} Fetching DOM elements...`);
      try {
        const pageElementsResult = await fetchPageElements(tabId);
        pageState = pageElementsResult.compressed;
        console.log(
          `[background.ts]${modeLogPrefix} Fetched ${pageState.length} DOM elements.`
        );
        if (pageState.length === 0) {
          console.warn(
            `[background.ts]${modeLogPrefix} No DOM elements found. Aborting D4M task.`
          );
          await chrome.runtime.sendMessage({
            type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
            response: "No page elements found to interact with.",
          });
          throw new Error("No DOM elements found");
        }
      } catch (err) {
        console.error(
          `[background.ts]${modeLogPrefix} Failed to fetch page elements:`,
          err
        );
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
          response:
            "Failed to fetch page elements: " +
            (err instanceof Error ? err.message : String(err)),
        });
        throw err;
      }

      console.log(`[background.ts]${modeLogPrefix} Capturing screenshot...`);
      // Screenshot capturing logic (simplified, ensure it handles errors)
      try {
        const targetTab = await chrome.tabs.get(tabId);
        if (targetTab && typeof targetTab.windowId === "number") {
          screenshotDataUrl = await new Promise((resolve) => {
            chrome.tabs.captureVisibleTab(
              targetTab.windowId!,
              { format: "jpeg", quality: 60 },
              (dataUrl) => {
                if (chrome.runtime.lastError || !dataUrl) {
                  console.warn(
                    "[background.ts] Screenshot capture failed:",
                    chrome.runtime.lastError?.message
                  );
                  resolve(null);
                } else {
                  // Optional: Resize screenshot via content script if needed
                  chrome.tabs.sendMessage(
                    tabId,
                    { type: "RESIZE_SCREENSHOT", dataUrl },
                    (response) => {
                      resolve(response?.resizedDataUrl || dataUrl);
                    }
                  );
                }
              }
            );
          });
          console.log(
            `[background.ts]${modeLogPrefix} Screenshot ${
              screenshotDataUrl ? "captured" : "failed"
            }.`
          );
        }
      } catch (tabErr) {
        console.warn(
          `[background.ts]${modeLogPrefix} Error getting tab for screenshot:`,
          tabErr
        );
      }
    } else {
      console.log(
        `[background.ts]${modeLogPrefix} Skipping DOM/Screenshot fetch.`
      );
    }

    // Fetch tab info regardless of mode
    try {
      allTabs = await getAllTabs();
      tabUrl = await getTabUrl(tabId);
    } catch (error) {
      console.error("[background.ts] Failed to get tab URL/List:", error);
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
        response:
          "Failed to get tab information: " +
          (error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }

    // --- 2. Call AI ---
    const aiCurrentState = {
      // Data sent *to* the AI
      elements: pageState,
      tabs: allTabs,
      currentTabUrl: tabUrl,
      actionHistory: actionHistory.slice(-3),
    };

    console.log(
      `[background.ts]${modeLogPrefix} Calling AI with context: "${contextMessage}"`
    );
    const rawAiResponse: GeminiFunctionCallWrapper[] | null = await chatWithAI(
      contextMessage,
      `session-${tabId}`,
      isHubspotMode ? undefined : aiCurrentState,
      isHubspotMode,
      selectedSlashCommand,
      screenshotDataUrl || undefined,
      model as "gemini" | "claude"
    );

    if (!rawAiResponse) {
      console.error(
        `[background.ts]${modeLogPrefix} AI provider returned null response.`
      );
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
        response: "AI provider returned no response.",
      });
      throw new Error("AI provider returned null response.");
    }

    console.log(
      `[background.ts]${modeLogPrefix} Raw AI Response:`,
      JSON.stringify(rawAiResponse)
    );

    // --- 3. Validate AI Response Structure ---
    const reportStateCallWrapper = rawAiResponse.find(
      (callWrapper) =>
        callWrapper.functionCall.name === DOMAction.reportCurrentState.name
    );

    // A) Check if dom_reportCurrentState exists
    if (!reportStateCallWrapper) {
      console.error(
        `[background.ts]${modeLogPrefix} Mandatory 'dom_reportCurrentState' missing in AI response.`
      );
      if (retryCount < MAX_STATE_RETRIES) {
        console.warn(
          `[background.ts] Retrying processCommand due to missing reportCurrentState (retry ${
            retryCount + 1
          })`
        );
        const retryContext = `Invalid response: You MUST include the '${DOMAction.reportCurrentState.name}' function call.\n${contextMessage}`;
        await processCommand(
          tabId,
          retryContext,
          initialCommand,
          actionHistory,
          model,
          selectedSlashCommand,
          retryCount + 1
        );
      } else {
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
          response: "AI response missing mandatory state report. Aborting.",
        });
        throw new Error("AI response missing mandatory state report.");
      }
      return;
    }
    // B) Extract current_state and check its validity
    const reportArgs = reportStateCallWrapper.functionCall.args as
      | ReportCurrentStateArgs
      | undefined;
    current_state = reportArgs?.current_state ?? null;

    if (
      !current_state ||
      typeof current_state !== "object" ||
      !current_state.memory
    ) {
      console.error(
        `[background.ts]${modeLogPrefix} Invalid or missing 'current_state' object in dom_reportCurrentState.`,
        reportArgs
      );
      if (retryCount < MAX_STATE_RETRIES) {
        console.warn(
          `[background.ts] Retrying processCommand due to invalid current_state (retry ${
            retryCount + 1
          })`
        );
        const retryContext = `Invalid response: The '${DOMAction.reportCurrentState.name}' function call MUST contain a valid 'current_state' object with a 'memory' property.\n${contextMessage}`;
        await processCommand(
          tabId,
          retryContext,
          initialCommand,
          actionHistory,
          model,
          selectedSlashCommand,
          retryCount + 1
        );
      } else {
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
          response: "AI response contained invalid state report. Aborting.",
        });
        throw new Error("AI response contained invalid state report.");
      }
      return;
    }

    console.log(
      `[background.ts]${modeLogPrefix} Extracted valid current_state:`,
      JSON.stringify(current_state)
    );

    // C) Filter out reportCurrentState to get action/done/ask calls
    const nonReportActionCalls = rawAiResponse.filter(
      (callWrapper) =>
        callWrapper.functionCall.name !== DOMAction.reportCurrentState.name
    );

    // D) Check if *only* dom_reportCurrentState was returned (Invalid according to prompt rules)
    if (nonReportActionCalls.length === 0) {
      console.error(
        `[background.ts]${modeLogPrefix} Invalid AI Response: Only dom_reportCurrentState was returned. At least one other action (or done/ask) is required.`
      );
      if (retryCount < MAX_STATE_RETRIES) {
        console.warn(
          `[background.ts] Retrying processCommand due to only reportCurrentState returned (retry ${
            retryCount + 1
          })`
        );
        const retryContext = `Invalid response: You MUST return at least one action, 'dom_done', or 'dom_ask' call BEFORE the final '${DOMAction.reportCurrentState.name}' call.\n${contextMessage}`;
        await processCommand(
          tabId,
          retryContext,
          initialCommand,
          actionHistory,
          model,
          selectedSlashCommand,
          retryCount + 1
        );
      } else {
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
          response:
            "AI failed to provide required actions before state report. Aborting.",
        });
        throw new Error(
          "AI failed to provide required actions before state report."
        );
      }
      return;
    }

    console.log(
      `[background.ts]${modeLogPrefix} Validated AI response structure.`
    );

    // --- 4. Send Memory Update to UI ---
    // Use the extracted and validated current_state
    if (current_state.memory) {
      console.log(
        `[background.ts]${modeLogPrefix} Sending MEMORY_UPDATE to UI.`
      );
      chrome.runtime
        .sendMessage({
          type: MESSAGE_TYPE.MEMORY_UPDATE,
          response: { current_state },
        })
        .catch((err) =>
          console.warn("Failed to send MEMORY_UPDATE to runtime:", err)
        );

      chrome.tabs
        .sendMessage(tabId, {
          type: MESSAGE_TYPE.MEMORY_UPDATE,
          response: { current_state },
        })
        .catch((err) =>
          console.warn("Failed to send MEMORY_UPDATE to tab:", err)
        );
    } else {
      console.warn(
        `[background.ts]${modeLogPrefix} Memory object missing in validated current_state. Cannot send update.`
      );
    }

    // --- 5. Execute Action Calls ---
    const executedActions: string[] = [];
    let lastActionType: string | null = null;
    const tabIdRef = { value: tabId };

    for (let i = 0; i < nonReportActionCalls.length; i++) {
      if (automationStopped) {
        console.log(
          "[background.ts] Stopping action execution loop as automationStopped is true."
        );
        break;
      }

      const functionCall = nonReportActionCalls[i].functionCall;
      const functionName = functionCall.name;
      const args = functionCall.args;

      console.log(
        `[background.ts] Executing call ${i + 1}/${
          nonReportActionCalls.length
        }: ${functionName}`,
        args ?? "{}"
      );

      try {
        if (functionName.startsWith("google_workspace_")) {
          await handleGoogleWorkspaceAction(
            functionName,
            args,
            tabIdRef.value,
            executedActions
          );
        } else if (functionName.startsWith("hubspot_")) {
          await handleHubspotAction(
            functionName,
            args,
            tabIdRef.value,
            executedActions
          );
        } else if (functionName.startsWith("dom_")) {
          await handleDomAction(
            functionName,
            args,
            tabIdRef,
            executedActions,
            (type) => {
              lastActionType = type;
            },
            initialCommand,
            model
          );
        } else {
          console.warn(
            `[background.ts] Unknown function call type skipped: ${functionName}`
          );
          executedActions.push(`Skipped unknown function: ${functionName}`);
        }

        // If action caused automationStopped, break immediately
        if (automationStopped) {
          console.log(
            `[background.ts] Automation stopped after executing: ${functionName}`
          );
          break;
        }

        // Wait after potential navigation actions handled by handleDomAction
        if (lastActionType && functionName.startsWith("dom_")) {
          console.log(
            `[background.ts] Waiting after potential navigation action: ${lastActionType}`
          );
          await waitForPotentialNavigation(tabIdRef.value, lastActionType);
          lastActionType = null;
        }
      } catch (error) {
        console.error(
          `[background.ts] Error executing ${functionName}:`,
          error
        );
        const errorMsg = `Action ${functionName} failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
        // Send error to UI
        chrome.runtime.sendMessage({
          type: "DISPLAY_MESSAGE",
          response: { message: errorMsg },
        });
        // Stop automation on *any* action execution error
        automationStopped = true;
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
          response: errorMsg,
        });
        console.log(
          "[background.ts] Automation stopped due to action execution error."
        );
        break;
      }
    }

    // --- 6. Update Action History ---
    // Add descriptions logged by handlers to the persistent history map
    if (executedActions.length > 0) {
      recentActionsMap[tabIdRef.value] = [
        // Use potentially updated tabId
        ...(recentActionsMap[tabIdRef.value] || []),
        ...executedActions,
      ].slice(-5);
    }

    // --- 7. Recursive Call or Finish ---
    if (!automationStopped) {
      console.log(
        "[background.ts] Actions executed, preparing for next iteration."
      );

      // Prepare the CONCISE context for the NEXT AI call
      const evaluation = current_state?.evaluation_previous_goal;
      const currentGoal = current_state?.current_goal;
      const reportedMemory = current_state?.memory as MemoryState | undefined;

      const lastPhase =
        reportedMemory?.phases?.[reportedMemory.phases.length - 1];
      const lastStepInPhase = lastPhase?.steps?.[lastPhase.steps.length - 1];
      // Status reported by AI *for the last planned step* after evaluating this turn's actions
      const lastReportedStepStatus = lastStepInPhase?.status;

      // Description of the action physically executed *in this turn*
      const lastExecutedActionDesc =
        executedActions.length > 0
          ? executedActions[executedActions.length - 1]
          : "No actions executed in this step.";

      const nextContextMessage = [
        `Previous Step Evaluation: ${evaluation || "N/A"}.`,
        `Action Just Executed: ${lastExecutedActionDesc}.`,
        lastReportedStepStatus
          ? `Reported Status of Action: ${lastReportedStepStatus}.`
          : "No specific step status reported.",
        // Use the goal AI set for *itself* last turn, fallback to overall
        `Current Goal: ${
          currentGoal || reportedMemory?.overall_goal || initialCommand
        }.`,
        "Based on the latest Page Elements and Screenshot provided, determine the single next action (or use 'dom_done'/'dom_ask') and report the updated state.",
      ]
        .filter(Boolean)
        .join(" ");

      // Make the recursive call
      await processCommand(
        tabIdRef.value,
        nextContextMessage,
        initialCommand,
        recentActionsMap[tabIdRef.value],
        model,
        selectedSlashCommand,
        0
      );
    } else {
      console.log(
        "[background.ts] Automation stopped. Ending processCommand task."
      );
      // Cleanup if stopped during this iteration
      await findAndUngroupDfmGroup();
      resetExecutionState(tabIdRef.value);
      activeAutomationTabs.delete(tabIdRef.value);
    }
  } catch (err) {
    // Catch errors from initial setup, AI call, or action execution loop
    console.error(
      "[background.ts] Unhandled error in processCommand main block:",
      err
    );
    // Ensure automation is marked as stopped
    automationStopped = true;
    // Send a generic failure message if not already handled
    await chrome.runtime
      .sendMessage({
        type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
        response: `Command processing failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      })
      .catch(() => {});

    // Final cleanup
    await findAndUngroupDfmGroup();
    resetExecutionState(tabId);
    activeAutomationTabs.delete(tabId);
  } finally {
    // This block might run too early if processCommand is async recursive.
    // Cleanup is better handled at points where the process definitively stops.
    // console.log(`[background.ts] processCommand finally block for tab ${tabId}`);
  }
}

function resetExecutionState(tabId: number) {
  recentActionsMap[tabId] = [];
  delete currentTasks[tabId];
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

  const functionCall: GeminiFunctionCall = {
    name: action.description || action.type,
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

// --- Helper function to ensure the offscreen document is open ---
async function setupOffscreenDocument(path = "offscreen.html") {
  // Check if the offscreen document is already open
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({});

  const offscreenDocument = existingContexts.find(
    (context) =>
      context.contextType === "OFFSCREEN_DOCUMENT" &&
      context.documentUrl === offscreenUrl
  );

  if (!offscreenDocument) {
    // Create the offscreen document if it doesn't exist
    console.log("Background: Creating offscreen document...");
    try {
      await chrome.offscreen.createDocument({
        url: path,
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: "Handling tab and microphone audio recording",
      });
      console.log("Background: Offscreen document created.");
    } catch (error) {
      console.error(
        `Background: Failed to create offscreen document: ${error}`
      );
      throw new Error(
        `Failed to create offscreen document: ${
          (error as Error).message || error
        }`
      );
    }
  } else {
    console.log("Background: Offscreen document already exists.");
  }
}

// --- Function to Send Status Updates to UI (Side Panel) ---
function sendStatusUpdateToUI(details?: { message?: string }) {
  console.log("Background: Sending status update to UI:", {
    isRecording: isRecordingActive,
    isConnected: isWebSocketConnected,
    message: details?.message,
    // Audio level updates are forwarded separately from offscreen
  });
  chrome.runtime
    .sendMessage({
      type: details?.message ? "STATUS_UPDATE" : "RECORDING_STATE_UPDATE",
      isRecording: isRecordingActive,
      isConnected: isWebSocketConnected,
      message: details?.message,
    })
    .catch((error) => {
      // Catch potential errors if side panel is not open or listening
      if (
        error.message !==
        "Could not establish connection. Receiving end does not exist."
      ) {
        console.warn(
          "Background: Could not send status update message to UI:",
          error.message
        );
      }
    });
}

// --- Function to Close the Offscreen Document (Optional, good for cleanup) ---
async function closeOffscreenDocument(path = "offscreen.html") {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({});

  const offscreenDocument = existingContexts.find(
    (context) =>
      context.contextType === "OFFSCREEN_DOCUMENT" &&
      context.documentUrl === offscreenUrl
  );

  if (offscreenDocument) {
    console.log("Background: Closing offscreen document.");
    try {
      await chrome.offscreen.closeDocument();
      console.log("Background: Offscreen document closed.");
    } catch (error) {
      console.error(`Background: Failed to close offscreen document: ${error}`);
    }
  } else {
    console.log("Background: Offscreen document not found to close.");
  }
}

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  // Forward UPDATE_TRANSCRIPTION messages from offscreen.js to UI components
  if (msg.type === "UPDATE_TRANSCRIPTION" && msg.target === "background") {
    console.log("Background: from offscreen, forwarding to UI");

    // Now the server message is in the data field
    if (msg.data) {
      console.log("Background: Message contains data field:", msg.data);

      // Check if this is the speaker_transcription_update format
      if (msg.data.type === "speaker_transcription_update") {
        console.log(
          "Background: Processing speaker_transcription_update format with segments:",
          msg.data.segments?.length || 0
        );
      }
    }

    // Remove the target field as it's not needed anymore
    const { target, ...messageData } = msg;

    // Forward the message to any listening UI components or content scripts
    // If we have data field, we should forward it properly
    if (msg.data) {
      console.log(
        "Background: Forwarding with speaker_transcription_update data"
      );
      chrome.runtime
        .sendMessage({
          type: "UPDATE_TRANSCRIPTION",
          ...msg.data, // Use data from the server directly
        })
        .catch((error) => {
          // Ignore errors when no listeners are available
          if (
            error.message !==
            "Could not establish connection. Receiving end does not exist."
          ) {
            console.warn(
              "Background: Error forwarding UPDATE_TRANSCRIPTION:",
              error
            );
          }
        });
    } else {
      // Legacy format, just forward as is
      chrome.runtime
        .sendMessage({
          type: "UPDATE_TRANSCRIPTION",
          ...messageData,
        })
        .catch((error) => {
          // Ignore errors when no listeners are available
          if (
            error.message !==
            "Could not establish connection. Receiving end does not exist."
          ) {
            console.warn(
              "Background: Error forwarding UPDATE_TRANSCRIPTION:",
              error
            );
          }
        });
    }
    return true; // Indicate async response handling
  }
  if (msg.type === "PROCESS_COMMAND") {
    automationStopped = false;
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!activeTab?.id) {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
        response: "No active tab found, aborting command processing.",
      });
      await findAndUngroupDfmGroup();
      sendResponse({ success: false, error: "No active tab" });
      return true; // Indicate async response
    }
    recentActionsMap[activeTab.id] = [];
    currentTasks[activeTab.id] = msg.command;

    // Always send immediate success response to prevent "Error starting command processing" toast
    sendResponse({ success: true });

    processCommand(
      activeTab.id,
      msg.prompt,
      msg.fullInput,
      [],
      msg.model || "gemini",
      msg.slashCommand
    ).catch((err) => {
      console.debug("Error during processCommand:", err);
    });

    return true;
  } else if (msg.type === "NEW_CHAT") {
    // Clear both conversation histories using the new storage API
    await saveConversationHistory(D4M_CONVERSATION_HISTORY_KEY, []);
    await saveConversationHistory(HUBSPOT_CONVERSATION_HISTORY_KEY, []);
    sendResponse({ success: true });
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
  } else if (msg.type === "START_RECORDING") {
    console.log("Background: Received START_RECORDING message from UI.");

    if (isRecordingActive) {
      // Use internal state
      console.log("Background: Recording already reported as active.");
      sendResponse({ success: false, error: "Recording already started." });
      return true;
    }

    try {
      // Update background state to indicate start attempt
      isRecordingActive = true;
      isWebSocketConnected = false;
      sendStatusUpdateToUI({ message: "Starting recording setup..." });

      // 1. Ensure the offscreen document is open
      sendStatusUpdateToUI({
        message: "Ensuring offscreen document is ready...",
      });
      await setupOffscreenDocument();
      sendStatusUpdateToUI({ message: "Offscreen document ready." });

      // Ensure the tab ID is available (e.g., from the sender tab)
      const targetTabId = msg.tabId;
      if (!targetTabId) {
        const errorMsg = "Background: Could not get target tab ID.";
        console.error(errorMsg);
        // Signal failure and clean up background state
        isRecordingActive = false;
        sendStatusUpdateToUI({ message: `Error: ${errorMsg}` });
        sendResponse({ success: false, error: errorMsg });
        closeOffscreenDocument();
        return true;
      }

      // 2. Get Tab Audio Stream ID (Requires user gesture context, which the message from UI provides)
      console.log("Background: Attempting to get tab audio stream ID...");
      sendStatusUpdateToUI({ message: "Getting tab audio stream..." });
      // This requires the 'desktopCapture' permission
      const tabStreamId = await new Promise<string>((resolve, reject) => {
        chrome.tabCapture.getMediaStreamId(
          {
            targetTabId: targetTabId,
          },
          (streamId) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError.message);
            } else {
              resolve(streamId);
            }
          }
        );
      });
      console.log("Background: Tab audio stream ID obtained:", tabStreamId);
      sendStatusUpdateToUI({ message: "Tab audio stream obtained." });

      if (!tabStreamId) {
        const errorMsg =
          chrome.runtime.lastError?.message || "Failed to get tab stream ID.";
        console.error("Background:", errorMsg);
        // Signal failure and clean up background state
        isRecordingActive = false;
        sendStatusUpdateToUI({ message: `Error: ${errorMsg}` });
        sendResponse({
          success: false,
          error: `Failed to start tab capture: ${errorMsg}`,
        });
        closeOffscreenDocument(); // Optional based on desired lifecycle
        return true;
      }

      // 4. Send message to offscreen document to start recording
      console.log(
        "Background: Sending start recording message to offscreen document..."
      );
      sendStatusUpdateToUI({
        message: "Sending start command to offscreen...",
      });
      chrome.runtime
        .sendMessage({
          type: "START_RECORDING_OFFSCREEN",
          target: "offscreen",
          data: {
            tabStreamId: tabStreamId,
            meetingName: msg.meetingName,
          },
        })
        .catch((error) => {
          // Handle error if offscreen document is not listening or message fails
          console.error(
            "Background: Failed to send start message to offscreen:",
            error
          );
          // Signal failure and clean up background state
          isRecordingActive = false;
          sendStatusUpdateToUI({
            message: `Error: Failed to communicate with offscreen: ${
              error.message || error
            }`,
          }); // Update UI with inactive state and error
          sendResponse({
            success: false,
            error: `Failed to communicate with offscreen document: ${
              error.message || error
            }`,
          });
          closeOffscreenDocument(); // Optional
        });

      // Send success response back to the Side Panel immediately after messaging offscreen
      // The Side Panel will get actual recording status from messages *from* offscreen later.
      sendResponse({ success: true });
    } catch (error: any) {
      // This catch block primarily handles errors from setupOffscreenDocument or getMediaStreamId if not caught earlier
      console.error(
        "Background: Caught error during start setup process:",
        error
      );
      // Ensure background state is marked inactive and UI is updated if an error occurred early
      isRecordingActive = false;
      sendStatusUpdateToUI({ message: `Error: ${error.message || error}` }); // Update UI with inactive state and error
      // Send failure response if it hasn't been sent yet by internal catch blocks
      if (!sender.tab) {
        // Simple check if response wasn't sent via previous errors
        sendResponse({
          success: false,
          error: error.message || "Unknown error during start setup.",
        });
      }
    }

    return true;
  } else if (msg.type === "STOP_RECORDING") {
    console.log("Background: Received STOP_RECORDING message from UI.");
    isRecordingActive = false;
    // Send message to offscreen document to stop recording
    chrome.runtime
      .sendMessage({
        type: "STOP_RECORDING_OFFSCREEN",
        target: "offscreen",
      })
      .catch((error) => {
        console.error(
          "Background: Failed to send stop message to offscreen:",
          error
        );
        // If we can't even tell offscreen to stop, we might be stuck.
        // Force background state cleanup?
        isRecordingActive = false;
        sendStatusUpdateToUI({
          message: `Error: Failed to communicate stop command: ${
            error.message || error
          }`,
        });
        closeOffscreenDocument();
        sendResponse({
          success: false,
          error: `Failed to communicate stop command: ${
            error.message || error
          }`,
        });
      });

    // Acknowledge the stop request was sent
    sendResponse({ success: true });
    return true;
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
      if (activeAutomationTabs.has(tabId)) {
        console.log(
          `[background.ts] Stopping automation for disconnected tab ${tabId}`
        );
        automationStopped = true;
        activeAutomationTabs.delete(tabId);
        resetExecutionState(tabId);
      }
    });
  } else {
    console.error(
      `[background.ts] Invalid port name (not a number): ${port.name}`
    );
  }
});

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise(async (resolve) => {
    let observer: MutationObserver | null = null as MutationObserver | null;
    let contentScriptChecked = false;
    const startTime = Date.now();
    const MAX_WAIT = 5000;
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
      resolve();
    }, MAX_WAIT);
  });
}

async function navigateTab(
  url: string,
  initialCommand: string,
  actionHistory: string[] | undefined,
  model: string
): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({});
  const existingTab = tabs.find(
    (tab) => tab && tab.id && tab.url?.includes(url)
  );

  if (!existingTab) {
    return createTab(url);
  }

  await chrome.tabs.update(existingTab.id!, { active: true });
  await chrome.windows.update(existingTab.windowId, { focused: true });

  await addTabToDoFormeGroup(existingTab.id!);

  activeAutomationTabs.add(existingTab.id!);
  await waitForTabLoad(existingTab.id!);
  await ensureContentScriptInjected(existingTab.id!);
  processCommand(
    existingTab.id!,
    "navigated to new tab",
    initialCommand,
    actionHistory,
    model,
    "",
    0
  );
  return existingTab;
}

async function createTab(url: string): Promise<chrome.tabs.Tab> {
  console.log(`[createTab] Creating new tab with URL: ${url}`);
  const tab = await chrome.tabs.create({ url });
  if (!tab.id) {
    throw new Error("Failed to create tab or tab ID is missing.");
  }
  console.log(`[createTab] Tab ${tab.id} created.`);

  // Add the new tab to the group immediately
  await addTabToDoFormeGroup(tab.id);

  activeAutomationTabs.add(tab.id);
  await waitForTabLoad(tab.id);
  await ensureContentScriptInjected(tab.id);
  return tab;
}
