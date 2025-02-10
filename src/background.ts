import { chatWithOpenAI } from "./services/openai/api"; // AI logic stays here

interface AIResponse {
  text: string;
  code: string;
  actions: Action[];
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
  | "navigate";

interface Action {
  type: ActionType;
  data: ActionData;
  message?: string;
  description?: string;
}

interface ActionData {
  selector: string;
  value?: string;
  duration?: number;
  key?: string;
  keyCode?: number;
  url?: string;
}

// background.ts (Manifest V3 - service worker)
chrome.runtime.onInstalled.addListener(() => {
  console.log("[background.ts] AI Assistant Extension installed");
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  console.log("[background.ts] Extension icon clicked on tab:", tab);
  if (!tab?.id) {
    console.error("[background.ts] No tab ID found");
    return;
  }

  try {
    console.log("[background.ts] Fetching tab info...");
    const tabInfo = await chrome.tabs.get(tab.id);
    console.log("[background.ts] Tab info:", tabInfo);

    if (!tabInfo.url || !tabInfo.url.startsWith("http")) {
      console.warn(
        "[background.ts] Cannot access this page. URL must start with http:// or https://"
      );
      return;
    }

    console.log("[background.ts] Injecting content script...");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    console.log("[background.ts] Sending TOGGLE_SIDEBAR message...");
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
  } catch (error) {
    console.error("[background.ts] Error injecting content script:", error);
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.log("[background.ts] Keyboard shortcut triggered:", command);
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    console.log("[background.ts] Active tab:", tab);

    if (!tab?.id) {
      console.error("[background.ts] No active tab found");
      return;
    }

    switch (command) {
      case "toggle-listening":
        console.log("[background.ts] Toggling listening...");
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_LISTENING" });
        break;
      case "toggle-watching":
        console.log("[background.ts] Toggling watching...");
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_WATCHING" });
        break;
      default:
        console.warn("[background.ts] Unknown command:", command);
    }
  } catch (error) {
    console.error("[background.ts] Error handling command:", error);
  }
});

// Process AI commands and execute actions step-by-step
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log(
    "[background.ts] Received message:",
    message,
    "from sender:",
    sender
  );

  switch (message.type) {
    case "PROCESS_COMMAND":
      console.log("[background.ts] Processing AI command:", message.command);

      fetchCurrentPageElements((currentState) => {
        console.log("[background.ts] Current page elements:", currentState);

        chatWithOpenAI(message.command, "session-id", currentState).then(
          (aiResponse) => {
            console.log("[background.ts] Raw AI Response:", aiResponse);

            // ✅ Safely parse AI response before execution
            try {
              const parsedResponse: AIResponse = JSON.parse(aiResponse.text);
              console.log(
                "[background.ts] Parsed AI Response:",
                parsedResponse
              );

              if (parsedResponse.actions?.length) {
                executeStep(parsedResponse.actions[0]);
              } else {
                console.error(
                  "[background.ts] No valid actions found in AI response."
                );
              }
            } catch (error) {
              console.error(
                "[background.ts] Error parsing AI response:",
                error
              );
            }
          }
        );

        sendResponse({ success: true });
      });

      return true;

    case "ACTION_SUCCESS":
      console.log("[background.ts] Action succeeded, requesting next step...");

      fetchCurrentPageElements((currentState) => {
        console.log("[background.ts] Fetching next step from AI...");
        chatWithOpenAI("Next step?", "session-id", currentState).then(
          (aiResponse) => {
            console.log("[background.ts] Raw Next AI Response:", aiResponse);

            // ✅ Parse AI response before execution
            try {
              const parsedResponse: AIResponse = JSON.parse(aiResponse.text);
              console.log(
                "[background.ts] Parsed Next AI Response:",
                parsedResponse
              );

              if (parsedResponse.actions?.length) {
                executeStep(parsedResponse.actions[0]);
              } else {
                console.error("[background.ts] No valid next actions found.");
              }
            } catch (error) {
              console.error(
                "[background.ts] Error parsing next AI response:",
                error
              );
            }
          }
        );
      });

      return true;

    case "ACTION_FAILED":
      console.error("[background.ts] Action failed:", message.error);

      fetchCurrentPageElements((currentState) => {
        console.log(
          "[background.ts] Requesting AI for the next step after failure..."
        );
        chatWithOpenAI(
          "The last action failed. What should I do next?",
          "session-id",
          currentState
        ).then((aiResponse) => {
          console.log("[background.ts] Raw Recovery AI Response:", aiResponse);

          // ✅ Parse AI response before execution
          try {
            const parsedResponse: AIResponse = JSON.parse(aiResponse.text);
            console.log(
              "[background.ts] Parsed Recovery AI Response:",
              parsedResponse
            );

            if (parsedResponse.actions?.length) {
              executeStep(parsedResponse.actions[0]);
            } else {
              console.error("[background.ts] No valid recovery actions found.");
            }
          } catch (error) {
            console.error(
              "[background.ts] Error parsing recovery AI response:",
              error
            );
          }
        });
      });

      return true;

    case "SHOW_PAGE_ELEMENTS":
      if (sender.tab?.id !== undefined) {
        console.log(
          "[background.ts] Showing page elements in tab:",
          sender.tab.id
        );
        chrome.tabs.sendMessage(
          sender.tab.id,
          { type: "SHOW_PAGE_ELEMENTS" },
          (response) => {
            console.log("[background.ts] Elements shown:", response);
            sendResponse(response);
          }
        );
        return true;
      }
      break;

    case "CAPTURE_TAB_SCREENSHOT":
      console.log("[background.ts] Capturing screenshot...");
      captureScreenshot(sendResponse);
      return true;

    default:
      console.warn("[background.ts] Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
  }
});

// Execute AI-generated steps sequentially
async function executeStep(action: any) {
  console.log("[background.ts] Executing AI Step:", action);

  switch (action.type) {
    case "VERIFY_TAB":
      console.log("[background.ts] Verifying or opening tab:", action.data.url);
      verifyOrOpenTab(action.data.url);
      break;

    case "PERFORM_ACTION":
      console.log("[background.ts] Sending action to active tab:", action.data);
      sendActionToActiveTab(action.data);
      break;

    default:
      console.warn("[background.ts] Unknown action type:", action.type);
      chrome.runtime.sendMessage(undefined, {
        type: "ACTION_FAILED",
        error: "Unknown action",
      });
  }
}

// Check if a tab exists or open a new one
async function verifyOrOpenTab(urlContains: string) {
  console.log("[background.ts] Checking for existing tab with:", urlContains);
  const tabs = await chrome.tabs.query({});
  const matchingTab = tabs.find((tab) => tab.url?.includes(urlContains));

  if (matchingTab && matchingTab.id) {
    console.log("[background.ts] Found existing tab:", matchingTab.url);
    chrome.tabs.update(matchingTab.id, { active: true });
    chrome.runtime.sendMessage(undefined, { type: "ACTION_SUCCESS" });
  } else {
    console.log("[background.ts] No matching tab found, opening a new one.");
    chrome.tabs.create({ url: `https://${urlContains}` });
    chrome.runtime.sendMessage(undefined, { type: "ACTION_SUCCESS" });
  }
}

// Send action to content script for execution
function sendActionToActiveTab(action: any) {
  console.log("[background.ts] Sending action to active tab:", action);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "PERFORM_ACTION", action });
    }
  });
}

// Capture active tab screenshot
async function captureScreenshot(sendResponse: Function) {
  console.log("[background.ts] Capturing screenshot...");
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      console.error("[background.ts] No active tab found.");
      sendResponse({ error: "No active tab found." });
      return;
    }

    chrome.tabs.captureVisibleTab(
      { format: "jpeg", quality: 50 },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error(
            "[background.ts] Screenshot capture error:",
            chrome.runtime.lastError.message
          );
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          console.log("[background.ts] Screenshot captured successfully.");
          sendResponse({ dataUrl });
        }
      }
    );
  } catch (error) {
    console.error("[background.ts] Error capturing screenshot:", error);
    sendResponse({ error: "Failed to capture screenshot" });
  }
}

// Fetch current page elements from content.ts
function fetchCurrentPageElements(
  callback: (currentState: Record<string, any>) => void
) {
  console.log("[background.ts] Fetching current page elements...");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "GET_PAGE_ELEMENTS" },
        (response) => {
          console.log(
            "[background.ts] Received page elements response:",
            response
          );
          if (chrome.runtime.lastError || !response) {
            console.error(
              "[background.ts] Error fetching page elements:",
              chrome.runtime.lastError?.message
            );
            callback({});
          } else {
            callback(response.elements);
          }
        }
      );
    } else {
      callback({});
    }
  });
}
