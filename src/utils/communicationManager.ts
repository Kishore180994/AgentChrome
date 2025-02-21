export function sendMessageToContent(tabId: number, msg: any): void {
  chrome.tabs.sendMessage(tabId, msg);
}

export function ensureContentScriptInjected(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "PING" }, (res) => {
      if (chrome.runtime.lastError || !res) {
        chrome.scripting.executeScript(
          { target: { tabId }, files: ["content.js"] },
          () => resolve()
        );
      } else {
        resolve();
      }
    });
  });
}
