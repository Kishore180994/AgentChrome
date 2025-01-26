// Check if script is already injected
const AGENT_KEY = "__AGENT_CHROME_INITIALIZED__";
if (!(window as any)[AGENT_KEY]) {
  (window as any)[AGENT_KEY] = true;

  // Track sidebar state
  let sidebarContainer: HTMLDivElement | null = null;
  let sidebarVisible = false;

  // Send ready message to background script
  chrome.runtime.sendMessage({ type: "CONTENT_SCRIPT_READY" });

  // Function to inject the sidebar
  async function injectSidebar() {
    if (sidebarContainer || document.getElementById("agent-chrome-root"))
      return;

    try {
      // Create container for sidebar
      sidebarContainer = document.createElement("div");
      sidebarContainer.id = "agent-chrome-root";
      document.body.appendChild(sidebarContainer);

      // Add styles to shift page content
      if (!document.getElementById("agent-chrome-style")) {
        const style = document.createElement("style");
        style.id = "agent-chrome-style";
        style.textContent = `
          body {
            width: calc(100% - 400px) !important;
            margin-right: 400px !important;
            position: relative !important;
            transition: all 0.3s ease-in-out !important;
          }
          body.sidebar-hidden {
            width: 100% !important;
            margin-right: 0 !important;
          }
          #agent-chrome-root {
            position: fixed;
            top: 0;
            right: 0;
            width: 400px;
            height: 100vh;
            background: white;
            box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
            z-index: 2147483647;
            transition: transform 0.3s ease-in-out;
          }
          #agent-chrome-root.hidden {
            transform: translateX(100%);
          }
        `;
        document.head.appendChild(style);
      }

      // Load CSS if not already loaded
      if (!document.querySelector('link[href*="index.css"]')) {
        const linkElem = document.createElement("link");
        linkElem.rel = "stylesheet";
        linkElem.href = chrome.runtime.getURL("index.css");
        document.head.appendChild(linkElem);
      }

      // Create and append the script
      const script = document.createElement("script");
      script.type = "module";
      script.src = chrome.runtime.getURL("sidebar.js");
      script.id = "agent-chrome-script";
      document.body.appendChild(script);

      sidebarVisible = true;
    } catch (error) {
      console.error("Error injecting sidebar:", error);
    }
  }

  // Function to toggle sidebar visibility
  function toggleSidebar() {
    if (!sidebarContainer) {
      injectSidebar();
      return;
    }

    sidebarVisible = !sidebarVisible;
    sidebarContainer.classList.toggle("hidden", !sidebarVisible);
    document.body.classList.toggle("sidebar-hidden", !sidebarVisible);
  }

  // Function to perform actions on elements
  async function performAction(action: any) {
    try {
      let element: HTMLElement | null = null;

      // Find the target element based on the action data
      if (action.selector) {
        element = document.querySelector(action.selector);
      } else if (action.data) {
        // Try to find element by various attributes
        const { tagName, id, className, textContent } = action.data;
        const selector = [];

        if (tagName) selector.push(tagName.toLowerCase());
        if (id) selector.push(`#${id}`);
        if (className) selector.push(`.${className.split(" ").join(".")}`);

        const elements = document.querySelectorAll(selector.join(""));

        // If multiple elements found, try to match by text content
        if (elements.length > 1 && textContent) {
          element = Array.from(elements).find(
            (el) => el.textContent?.trim() === textContent.trim()
          ) as HTMLElement;
        } else {
          element = elements[0] as HTMLElement;
        }
      }

      if (!element) {
        throw new Error("Element not found");
      }

      // Perform the action
      switch (action.type) {
        case "click":
          element.click();
          break;
        case "input":
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
          ) {
            element.value = action.data.value || "";
            element.dispatchEvent(new Event("input", { bubbles: true }));
          }
          break;
        case "select":
          if (element instanceof HTMLSelectElement) {
            element.value = action.data.value || "";
            element.dispatchEvent(new Event("change", { bubbles: true }));
          }
          break;
        case "scroll":
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      return { success: true };
    } catch (error) {
      console.error("Error performing action:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Listen for keyboard shortcuts
  document.addEventListener("keydown", (event) => {
    // Command/Control + Shift + L for listening
    if (
      (event.metaKey || event.ctrlKey) &&
      event.shiftKey &&
      event.key === "L"
    ) {
      chrome.runtime.sendMessage({ type: "TOGGLE_LISTENING" });
    }

    // Command/Control + Shift + W for watching
    if (
      (event.metaKey || event.ctrlKey) &&
      event.shiftKey &&
      event.key === "W"
    ) {
      chrome.runtime.sendMessage({ type: "TOGGLE_WATCHING" });
    }
  });

  // Listen for Command/Control + Click
  document.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      const element = event.target as HTMLElement;

      // Get relevant information about the clicked element
      const elementInfo = {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        textContent: element.textContent?.trim(),
        href: element instanceof HTMLAnchorElement ? element.href : undefined,
        value: element instanceof HTMLInputElement ? element.value : undefined,
        type: element instanceof HTMLInputElement ? element.type : undefined,
      };

      // Send the element info to the extension
      chrome.runtime.sendMessage({
        type: "ELEMENT_CLICKED",
        data: elementInfo,
      });
    }
  });

  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case "TOGGLE_SIDEBAR":
        toggleSidebar();
        break;
      case "PERFORM_ACTION":
        performAction(message.data).then(sendResponse);
        return true; // Keep the message channel open for async response
      case "PREPARE_SCREENSHOT":
        // Temporarily hide sidebar and adjust page layout
        if (sidebarContainer) {
          sidebarContainer.style.display = "none";
          document.body.classList.add("sidebar-hidden");
        }
        break;
      case "RESTORE_AFTER_SCREENSHOT":
        // Restore sidebar and page layout
        if (sidebarContainer) {
          sidebarContainer.style.display = "";
          if (sidebarVisible) {
            document.body.classList.remove("sidebar-hidden");
          }
        }
        break;
    }
  });
} else {
  console.warn("Agent Chrome already initialized");
}
