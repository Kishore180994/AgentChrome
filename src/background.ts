// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Assistant Extension installed");
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    console.error("No tab ID found");
    return;
  }

  try {
    // Check if the tab's URL is valid and accessible
    const tabInfo = await chrome.tabs.get(tab.id);
    if (!tabInfo.url || !tabInfo.url.startsWith("http")) {
      console.warn(
        "Cannot access this page. URL must start with http:// or https://"
      );
      return;
    }

    // Inject the content script if it hasn't been injected yet
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // Send a message to toggle the sidebar
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
  } catch (error) {
    console.error("Error injecting content script:", error);
  }
});

// Listen for commands (keyboard shortcuts)
chrome.commands.onCommand.addListener(async (command) => {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      console.error("No active tab found");
      return;
    }

    // Handle commands
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

// Handle messages from content scripts or popups
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      switch (message.type) {
        case "CAPTURE_TAB_SCREENSHOT":
          // We can now safely call chrome.tabs.query
          chrome.tabs.query(
            { active: true, currentWindow: true },
            async (tabs) => {
              if (!tabs.length) {
                sendResponse({ error: "No active tab found." });
                return;
              }
              const tab = tabs[0];
              if (!tab.id) {
                sendResponse({ error: "No valid tab ID." });
                return;
              }
              // Ask content script to "prepare" the page if needed
              chrome.tabs.sendMessage(
                tab.id,
                { type: "PREPARE_SCREENSHOT" },
                async () => {
                  // Wait some time for UI changes if needed
                  await new Promise((resolve) => setTimeout(resolve, 200));

                  // Actually capture the screenshot
                  chrome.tabs.captureVisibleTab(
                    { format: "jpeg", quality: 50 },
                    (dataUrl) => {
                      if (chrome.runtime.lastError) {
                        sendResponse({
                          error: chrome.runtime.lastError.message,
                        });
                      } else {
                        if (tab?.id) {
                          // After capturing, restore if needed
                          chrome.tabs.sendMessage(tab.id, {
                            type: "RESTORE_AFTER_SCREENSHOT",
                          });
                          sendResponse({ dataUrl });
                        }
                      }
                    }
                  );
                }
              );
            }
          );

          // Return true to indicate we’ll send an async response later
          return true;
        case "CAPTURE_TAB": {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (!tab?.id) {
            throw new Error("No active tab found");
          }

          // Prepare for screenshot
          chrome.tabs.sendMessage(tab.id, { type: "PREPARE_SCREENSHOT" });

          // Capture the tab
          const dataUrl = await chrome.tabs.captureVisibleTab({
            format: "jpeg",
            quality: 50,
          });

          // Restore UI after capturing
          chrome.tabs.sendMessage(tab.id, { type: "RESTORE_AFTER_SCREENSHOT" });

          return { success: true, dataUrl };
        }

        case "CONTENT_SCRIPT_READY": {
          console.log("Content script ready in tab:", sender.tab?.id);
          return { success: true };
        }

        default: {
          console.warn("Unknown message type:", message.type);
          return { success: false, error: "Unknown message type" };
        }
      }
    } catch (error: any) {
      console.error("Error handling message:", error);
      return { success: false, error: error.message };
    }
  };

  // Handle async response
  handleMessage().then(sendResponse);
  return true; // Keep the message channel open for async response
});
