// background.ts (Manifest V3 - service worker)

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Assistant Extension installed");
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) {
    console.error("No tab ID found");
    return;
  }

  try {
    // Check if the tab's URL is valid (http/https only)
    const tabInfo = await chrome.tabs.get(tab.id);
    if (!tabInfo.url || !tabInfo.url.startsWith("http")) {
      console.warn(
        "Cannot access this page. URL must start with http:// or https://"
      );
      return;
    }

    // Optionally inject content.ts if your manifest doesn't already do so
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // Tell the content script to toggle the sidebar
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
  } catch (error) {
    console.error("Error injecting content script:", error);
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      console.error("No active tab found");
      return;
    }

    switch (command) {
      case "toggle-listening":
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_LISTENING" });
        break;
      case "toggle-watching":
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_WATCHING" });
        break;
      default:
        console.warn("Unknown command:", command);
    }
  } catch (error) {
    console.error("Error handling command:", error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      switch (message.type) {
        case "SHOW_PAGE_ELEMENTS":
          if (sender.tab?.id !== undefined) {
            chrome.tabs.sendMessage(
              sender.tab.id,
              { type: "SHOW_PAGE_ELEMENTS" },
              (response) => {
                console.log("Elements shown in tab:", sender.tab?.id);
                sendResponse(response);
              }
            );
            return true; // Keep channel open
          }
          break;
        case "CAPTURE_TAB_SCREENSHOT":
          {
            const tabs = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            });
            if (!tabs.length) {
              sendResponse({ error: "No active tab found." });
              return;
            }
            const activeTab = tabs[0];
            if (!activeTab.id) {
              sendResponse({ error: "No valid tab ID." });
              return;
            }
            // Ask content script to "prepare" the page
            chrome.tabs.sendMessage(
              activeTab.id,
              { type: "PREPARE_SCREENSHOT" },
              async () => {
                // Wait a bit if needed
                await new Promise((resolve) => setTimeout(resolve, 200));
                // Capture
                chrome.tabs.captureVisibleTab(
                  { format: "jpeg", quality: 50 },
                  (dataUrl) => {
                    if (chrome.runtime.lastError) {
                      sendResponse({
                        error: chrome.runtime.lastError.message,
                      });
                    } else {
                      if (activeTab.id) {
                        // Restore
                        chrome.tabs.sendMessage(activeTab.id, {
                          type: "RESTORE_AFTER_SCREENSHOT",
                        });
                      }
                      sendResponse({ dataUrl });
                    }
                  }
                );
              }
            );
          }
          return true;

        case "CAPTURE_TAB": {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (!tab?.id) {
            throw new Error("No active tab found");
          }
          // Prepare
          chrome.tabs.sendMessage(tab.id, { type: "PREPARE_SCREENSHOT" });
          // Capture
          const dataUrl = await chrome.tabs.captureVisibleTab({
            format: "jpeg",
            quality: 50,
          });
          // Restore
          chrome.tabs.sendMessage(tab.id, {
            type: "RESTORE_AFTER_SCREENSHOT",
          });
          return { success: true, dataUrl };
        }

        case "CONTENT_SCRIPT_READY":
          console.log("Content script ready in tab:", sender.tab?.id);
          return { success: true };

        case "HIDE_PAGE_ELEMENTS":
          if (sender.tab?.id !== undefined) {
            chrome.tabs.sendMessage(
              sender.tab.id,
              { type: "HIDE_PAGE_ELEMENTS" },
              sendResponse
            );
            return true;
          }
          return { success: false, error: "No sender.tab.id" };

        default:
          console.warn("Unknown message type:", message.type);
          return { success: false, error: "Unknown message type" };
      }
    } catch (err: any) {
      console.error("Error handling message:", err);
      return { success: false, error: err.message };
    }
  };

  handleMessage().then(sendResponse);
  return true; // Keep the message channel open for async responses
});

// background.ts (Manifest V3, "type": "module")

// Helper to inject window._EXTENSION_ID_
async function injectExtensionId(tabId: number) {
  const extensionId = chrome.runtime.id; // works in extension context

  // We'll pass extensionId as an argument to a small function
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (extId) => {
      // This runs in the context of the webpage
      // We define a global variable
      (window as any)._EXTENSION_ID_ = extId;
      console.log("[Injected] _EXTENSION_ID_ =", extId);
    },
    args: [extensionId],
  });
}

// Example: handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  // Possibly inject your content script, etc. here

  // Then inject the extension ID
  await injectExtensionId(tab.id);

  // Now your webpage's JS can do:
  // chrome.runtime.sendMessage(window._EXTENSION_ID_, { ... })
});
