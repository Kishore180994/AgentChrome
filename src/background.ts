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
// --- Modularized Tool Handlers ---

/**
 * Handles Google Workspace tool actions.
 */
async function handleGoogleWorkspaceAction(
  functionName: string,
  args: any,
  tabId: number,
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
          action.includes(operationKey.substring(0, 20)) // Use first 20 chars of key as a fingerprint
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
            success: true, // Treat skipping as a successful handling of the situation
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
        status: (error as any).status, // Include status if available
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
        question: question, // Use 'question' property for consistency with AskArgs
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
      console.log(`[findDoFormeGroupId] Stored ID ${doFormeGroupId} is valid.`); // Log valid
      return doFormeGroupId;
    } catch (e) {
      // Catch specific error
      console.warn(
        `[findDoFormeGroupId] Stored group ID ${doFormeGroupId} no longer valid. Error: ${
          e instanceof Error ? e.message : String(e)
        }` // Log invalidation error
      );
      doFormeGroupId = null; // Reset if group was deleted by user
    }
  } else {
    console.log(`[findDoFormeGroupId] No stored ID.`); // Log no stored ID
  }

  // If no valid stored ID, query existing groups
  try {
    console.log(
      `[findDoFormeGroupId] Querying for group titled '${doFormeGroupName}'...`
    ); // Log query
    const groups = await chrome.tabGroups.query({ title: doFormeGroupName });
    console.log(`[findDoFormeGroupId] Query returned ${groups.length} groups.`); // Log query result count
    if (groups.length > 0) {
      doFormeGroupId = groups[0].id; // Store the found ID
      console.log(
        `[findDoFormeGroupId] Found existing group with ID: ${doFormeGroupId}` // Log found
      );
      return doFormeGroupId;
    } else {
      console.log(
        `[findDoFormeGroupId] Query found no groups named '${doFormeGroupName}'.`
      ); // Log not found by query
    }
  } catch (error) {
    console.error("[findDoFormeGroupId] Error querying tab groups:", error); // Log query error
  }

  console.log("[findDoFormeGroupId] Function end. Returning null."); // Log returning null
  return null; // Group not found
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
    // Note: We query the tabs API, filtering by groupId
    const tabsInGroup = await chrome.tabs.query({ groupId: groupId });

    if (tabsInGroup.length === 0) {
      console.log(
        `[ungroupTabsInGroup] No tabs found in group ${groupId}. The group might be empty or already removed.`
      );
      return; // Nothing to do
    }

    // 2. Extract the valid IDs of the tabs found
    const tabIdsToUngroup = tabsInGroup
      .map((tab) => tab.id) // Get the ID from each tab object
      .filter((id) => typeof id === "number") as number[]; // Filter out any potentially undefined IDs and ensure they are numbers

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
    // NOTE: When a group becomes empty after ungrouping its last tabs,
    // Chrome usually removes the group entity automatically.
  } catch (error) {
    console.error(
      `[ungroupTabsInGroup] Error during ungrouping process for group ${groupId}:`,
      error
    );
    // Handle potential errors, e.g., the group or tabs were removed concurrently
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

// Call this new function instead of directly calling ungroupTabsInGroup
// findAndUngroupDfmGroup();

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
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
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
async function processCommand(
  tabId: number,
  contextMessage: string,
  initialCommand: string,
  actionHistory: string[] = [],
  model: string = "gemini",
  selectedSlashCommand: string,
  retryCount: number = 0
) {
  const isHubspotMode = await getIsHubspotMode();

  if (isHubspotMode) {
    console.log(`[background.ts][HubSpot Mode] processCommand ENTRY`, {
      tabId,
      contextMessage,
      initialCommand,
      actionHistory,
      model,
      retryCount,
    });
  }

  if (automationStopped) {
    console.log("[background.ts] Automation stopped. Not processing.");
    return;
  }
  // Add the new tab to the group immediately
  await addTabToDoFormeGroup(tabId);
  activeAutomationTabs.add(tabId);
  recentActionsMap[tabId] = recentActionsMap[tabId] || [];

  let pageState: PageElement[] = [];
  let screenshotDataUrl: string | null = null;
  let tabUrl: string = "";
  let allTabs: string[] = [];

  try {
    if (!isHubspotMode) {
      // --- Fetch initial state ---
      console.log(
        `[background.ts processCommand ${tabId}] Attempting to fetch page elements...`
      );
      const fetchStart = Date.now();
      try {
        const pageElementsResult = await fetchPageElements(tabId);
        pageState = pageElementsResult.compressed;
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
          type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
          response:
            "Failed to fetch page elements: " +
            (err instanceof Error ? err.message : String(err)),
        });
        await findAndUngroupDfmGroup();
        return; // Stop processing if page elements fail
      }
    }
    if (isHubspotMode) {
      console.log(
        "[background.ts][HubSpot Mode] Skipping DOM and screenshot logic for HubSpot mode."
      );
    }

    !isHubspotMode &&
      (await new Promise<void>(async (resolve) => {
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
          resolve();
        }
      }));

    try {
      allTabs = await getAllTabs();
      tabUrl = await getTabUrl(tabId);
    } catch (error) {
      console.error("[background.ts] Tab URL/List error:", error);
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
        response:
          "Failed to get tab URL/List: " +
          (error instanceof Error ? error.message : String(error)),
      });
      await findAndUngroupDfmGroup();
      return;
    }

    if (!pageState.length) {
      if (await getIsHubspotMode()) {
        console.warn(
          "[background.ts] No elements found, but continuing because HubSpot mode is active"
        );
      } else {
        console.warn("[background.ts] No elements found, aborting");
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
          response: "No page elements found, aborting command processing.",
        });
        await findAndUngroupDfmGroup();
        return;
      }
    }

    // --- Call AI ---
    // First check if we're in HubSpot mode from storage
    // HubSpot mode already determined at top of function, use isHubspotMode directly.

    // Check ONLY if we're in HubSpot mode - no longer looking at message keywords
    // This strictly separates API mode (HubSpot) from DOM interaction mode (D4M)

    // A message is HubSpot-related ONLY if we're in HubSpot mode
    // Create aiCurrentState with appropriate values
    const aiCurrentState = {
      elements: pageState, // Don't send DOM elements for HubSpot commands
      tabs: allTabs,
      currentTabUrl: tabUrl,
      actionHistory: actionHistory.slice(-3),
    };

    // Enhanced debug logging
    if (isHubspotMode) {
      console.log(
        "[background.ts][HubSpot Mode] HubSpot command detected - sending with NO screenshots and NO DOM elements"
      );
    }

    const recentActionsStr = isHubspotMode
      ? actionHistory.length
        ? `Recent actions: ${actionHistory.slice(-3).join(", ")}.`
        : ""
      : "";
    const fullContextMessage = `${contextMessage}. ${recentActionsStr}`;
    console.log(
      "[background.ts] Sending context message to AI:",
      fullContextMessage
    );

    if (isHubspotMode) {
      console.log(
        "[background.ts][HubSpot Mode] Calling chatWithAI with context:",
        fullContextMessage
      );
    }
    const raw = await chatWithAI(
      fullContextMessage,
      "session-id",
      isHubspotMode ? [] : aiCurrentState,
      isHubspotMode,
      selectedSlashCommand,
      screenshotDataUrl || undefined,
      model as "gemini" | "claude"
    );
    if (isHubspotMode) {
      console.log("[background.ts][HubSpot Mode] Raw response from AI:", raw);

      // --- HubSpot Mode: Execute HubSpot function calls from AI response ---
      if (raw) {
        const hubspotCalls = raw.filter(
          (callWrapper: any) =>
            callWrapper.functionCall &&
            typeof callWrapper.functionCall.name === "string" &&
            callWrapper.functionCall.name.startsWith("hubspot_")
        );
        if (hubspotCalls.length === 0) {
          console.warn(
            "[background.ts][HubSpot Mode] No HubSpot function calls found in AI response."
          );
        } else {
          for (const callWrapper of hubspotCalls) {
            const { name, args } = callWrapper.functionCall;
            console.log(
              "[background.ts][HubSpot Mode] Executing HubSpot function from AI response:",
              { name, args }
            );
            try {
              const result = await executeHubspotFunction({ name, args });
              console.log(
                "[background.ts][HubSpot Mode] HubSpot function executed successfully:",
                { name, result }
              );
              if (result && result.success) {
                // TODO: Send error to UI and stop further processing
                chrome.runtime.sendMessage({
                  type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
                  response: result,
                });
                await findAndUngroupDfmGroup();
                activeAutomationTabs.delete(tabId);
                automationStopped = true;
                return;
              }
              // Optionally, send result to UI or handle as needed
            } catch (err) {
              console.error(
                "[background.ts][HubSpot Mode] Error executing HubSpot function:",
                { name, err }
              );
            }
          }
        }
      }
    } else {
      console.log("[background.ts] Raw response from AI:", raw);
    }

    if (!raw) {
      if (isHubspotMode) {
        console.error(
          "[background.ts][HubSpot Mode] Received null response from chatWithAI."
        );
      } else {
        console.error(
          "[background.ts] Received null response from chatWithAI."
        );
      }
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
        response: "AI provider returned no response.",
      });
      await findAndUngroupDfmGroup();
      activeAutomationTabs.delete(tabId);
      return;
    }

    // --- Process AI Response ---
    const reportStateCall = raw.find(
      (callWrapper: GeminiFunctionCallWrapper) =>
        callWrapper.functionCall.name === DOMAction.reportCurrentState.name
    );

    if (!reportStateCall) {
      if (isHubspotMode) {
        console.log(
          "[background.ts][HubSpot Mode] Mandatory 'dom_reportCurrentState' function call missing in AI response."
        );
      } else {
        console.log(
          "[background.ts] Mandatory 'dom_reportCurrentState' function call missing in AI response."
        );
      }
      if (retryCount < MAX_STATE_RETRIES) {
        if (isHubspotMode) {
          console.warn(
            `[background.ts][HubSpot Mode] Retrying processCommand due to missing reportCurrentState (retry ${
              retryCount + 1
            })`
          );
        } else {
          console.warn(
            `[background.ts] Retrying processCommand due to missing reportCurrentState (retry ${
              retryCount + 1
            })`
          );
        }
        const retryContextMessage = `Previous response was missing ${DOMAction.reportCurrentState.name}. Please include it in your next response.\n
          ${contextMessage}`;
        await processCommand(
          tabId,
          retryContextMessage,
          initialCommand,
          actionHistory,
          model,
          selectedSlashCommand,
          retryCount + 1
        );
      } else {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
          response:
            "AI response missing mandatory state report. Aborting after retry.",
        });
        await findAndUngroupDfmGroup();
        activeAutomationTabs.delete(tabId);
      }
      return;
    }

    const reportArgs = reportStateCall.functionCall
      .args as ReportCurrentStateArgs;
    const current_state = reportArgs.current_state; // Define current_state here
    console.log(
      "[background.ts] Extracted current_state from dom_reportCurrentState args:",
      current_state
    );

    if (!current_state) {
      console.warn(
        "[background.ts] No valid current_state found, retrying or stopping"
      );
      if (retryCount < MAX_STATE_RETRIES) {
        console.warn(
          `[background.ts] Retrying processCommand due to invalid current_state (retry ${
            retryCount + 1
          })`
        );
        const retryContextMessage =
          "Previous response had invalid 'current_state'. Please provide a valid state in your next response.\n" +
          contextMessage;
        await processCommand(
          tabId,
          retryContextMessage,
          initialCommand,
          actionHistory,
          model,
          selectedSlashCommand,
          retryCount + 1
        );
      } else {
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
          response: "No valid state returned from AI, aborting after retry.",
        });
        await findAndUngroupDfmGroup();
      }
      return;
    }

    // Filter out reportCurrentState to get action calls
    const actionCalls = raw.filter(
      (callWrapper: GeminiFunctionCallWrapper) =>
        callWrapper.functionCall.name !== DOMAction.reportCurrentState.name
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
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPE.MEMORY_UPDATE,
        response: memory,
      });
      chrome.tabs.sendMessage(tabIdRef.value, {
        type: MESSAGE_TYPE.MEMORY_UPDATE,
        response: memory,
      });
    } else {
      console.warn("[background.ts] No memory object found in current_state");
    }

    if (!actionCalls.length) {
      console.log(
        "[background.ts] No actions besides dom_reportCurrentState, process complete"
      );
      if (retryCount < MAX_STATE_RETRIES) {
        console.warn(
          `[background.ts] Retrying processCommand due to empty action list (retry ${
            retryCount + 1
          })`
        );
        const retryContextMessage =
          "Previous response had no actions specified. Please provide a valid actions in your next response.\n" +
          contextMessage;
        await processCommand(
          tabId,
          retryContextMessage,
          initialCommand,
          actionHistory,
          model,
          selectedSlashCommand,
          retryCount + 1
        );
      } else {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
          response: evaluation || "Task likely completed (no further actions).",
        });
        await findAndUngroupDfmGroup();
        resetExecutionState(tabId);
        activeAutomationTabs.clear();
        return;
      }
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
        if (functionName.startsWith("google_workspace_")) {
          await handleGoogleWorkspaceAction(
            functionName,
            args,
            tabId,
            executedActions
          );
          continue;
        }

        // Handle HubSpot functions
        else if (functionName.startsWith("hubspot_")) {
          console.log("[background.ts] Received HubSpot action:", {
            functionName,
            args,
            tabId,
            executedActions,
          });
          await handleHubspotAction(functionName, args, tabId, executedActions);
          continue;
        }

        // Handle DOM interaction functions
        else if (functionName === DOMAction.keyPress.name) {
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
              type: DOMAction.keyPress.name, // Map to valid LocalActionType
              data: { index, key },
              description: functionName, // Keep original name here
            },
            tabIdRef.value
          );
          executedActions.push(`Pressed key "${key}" at index ${index}`);
        } else if (functionName === DOMAction.extractContent.name) {
          const index = (args as any).index;
          if (typeof index !== "number") {
            throw new Error(`Invalid index for ${functionName}: ${index}`);
          }
          result = await sendActionToTab(
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
        } else if (functionName === DOMAction.goToExistingTab.name) {
          const url = (args as any).url;
          if (!url) {
            throw new Error(`No URL provided for ${functionName}`);
          }
          const existingTab = await navigateTab(
            url,
            initialCommand,
            actionHistory,
            model
          );
          if (existingTab.id) tabIdRef.value = existingTab.id;
          executedActions.push(`Switched to tab: ${url}`);
          lastActionType = DOMAction.goToExistingTab.name;
        } else if (functionName === DOMAction.openTab.name) {
          const url = (args as any).url;
          if (!url) {
            throw new Error(`No URL provided for ${functionName}`);
          }
          const newTab = await createTab(url);
          if (newTab.id) tabIdRef.value = newTab.id;
          executedActions.push(`Opened new tab with URL ${url}`);
          lastActionType = DOMAction.openTab.name;
        } else if (functionName === DOMAction.scroll.name) {
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
              type: DOMAction.scroll.name, // Map to valid LocalActionType
              data: { direction, offset },
              description: functionName, // Keep original name here
            },
            tabIdRef.value
          );
          executedActions.push(`Scrolled ${direction} by ${offset} pixels`);
        } else if (functionName === DOMAction.refetch.name) {
          console.log("[background.ts] Refetch action detected, will loop...");
          executedActions.push("Re-fetched page elements");
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
          continue;
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

        // TODO: For critical errors, stop automation
        // if (["navigate", "open_tab", "verify"].includes(functionName)) {
        //   automationStopped = true;
        //   await chrome.runtime.sendMessage({
        //     type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
        //     response: errorMessage,
        //   });
        //   resetExecutionState(tabId);
        //   activeAutomationTabs.delete(tabId);
        //   return;
        // }
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
        model,
        selectedSlashCommand,
        retryCount
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
        type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
        response: message,
      });
      await findAndUngroupDfmGroup();
      automationStopped = true;
    } else if (err.message.includes("429")) {
      setTimeout(
        () =>
          processCommand(
            tabId,
            contextMessage,
            initialCommand,
            actionHistory,
            model,
            ""
          ),
        60000
      );
    }
  } else {
    const errorMessage = `Command processing failed: ${
      err instanceof Error ? err.message : String(err)
    }`;
    console.log({ errorMessage });
    chrome.tabs.sendMessage(tabIdRef.value, {
      type: MESSAGE_TYPE.FINISH_PROCESS_COMMAND,
      response: { message: errorMessage },
    });
    await findAndUngroupDfmGroup();
  }
  resetExecutionState(tabId);
  activeAutomationTabs.delete(tabId);
  automationStopped = true;
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
      type: details?.message ? "STATUS_UPDATE" : "RECORDING_STATE_UPDATE", // Use STATUS_UPDATE if message is provided
      isRecording: isRecordingActive,
      isConnected: isWebSocketConnected, // Include websocket status
      message: details?.message, // Include the message
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
    currentTasks[activeTab.id] = msg.command; // Store the initial command as the task

    // Always send immediate success response to prevent "Error starting command processing" toast
    sendResponse({ success: true });
    const selectedSlashCommand = msg.slashCommand;

    processCommand(
      activeTab.id,
      msg.command,
      msg.command,
      [],
      msg.model || "gemini",
      selectedSlashCommand
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
      isWebSocketConnected = false; // Assume not connected yet
      sendStatusUpdateToUI({ message: "Starting recording setup..." }); // Notify UI that start is in progress

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
        sendStatusUpdateToUI({ message: `Error: ${errorMsg}` }); // Update UI with inactive state and error
        sendResponse({ success: false, error: errorMsg });
        // Consider closing offscreen document if it was just opened solely for this
        // closeOffscreenDocument(); // Optional based on desired lifecycle
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
        sendStatusUpdateToUI({ message: `Error: ${errorMsg}` }); // Update UI with inactive state and error
        sendResponse({
          success: false,
          error: `Failed to start tab capture: ${errorMsg}`,
        });
        // closeOffscreenDocument(); // Optional based on desired lifecycle
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
          target: "offscreen", // Target the offscreen document
          data: {
            // Pass necessary data
            tabStreamId: tabStreamId,
            meetingName: msg.meetingName, // Pass meeting name if needed by offscreen/backend
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
          // closeOffscreenDocument(); // Optional
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
      // Note: Specific errors during getUserMedia or getMediaStreamId are caught and handle stopRecording within their blocks
    }

    // ALWAYS return true from async listeners that send responses
    return true;
  } else if (msg.type === "STOP_RECORDING") {
    console.log("Background: Received STOP_RECORDING message from UI.");

    // Update background state to indicate stop attempt
    // isRecordingActive will be set to false definitely when offscreen confirms stop
    // but setting it here can provide immediate UI feedback depending on messaging
    // isRecordingActive = false; // Maybe let offscreen drive this state change
    // sendStatusUpdateToUI(); // Notify UI that stop is in progress
    isRecordingActive = false;
    // Send message to offscreen document to stop recording
    chrome.runtime
      .sendMessage({
        type: "STOP_RECORDING_OFFSCREEN",
        target: "offscreen", // Target the offscreen document
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
        }); // Update UI
        // Consider closing offscreen forcibly?
        // closeOffscreenDocument();
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
  // processCommand(
  //   existingTab.id!,
  //   "navigated to new tab",
  //   initialCommand,
  //   actionHistory,
  //   model,
  //   "",
  //   0
  // );
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

  activeAutomationTabs.add(tab.id); // Keep tracking if needed elsewhere
  await waitForTabLoad(tab.id);
  await ensureContentScriptInjected(tab.id);
  return tab;
}
