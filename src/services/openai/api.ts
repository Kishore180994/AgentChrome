/// <reference types="@types/chrome" />

import OpenAI from "openai";
import {
  ChatMessage,
  getConversationHistory,
  saveConversationHistory,
} from "../../utils/chatHistory";

// Add Chrome types
declare global {
  interface Window {
    chrome: typeof chrome;
  }
}

// New AIResponse interface and supporting types
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
  | "navigate";

interface Action {
  type: ActionType;
  data: ActionData;
  message?: string;
  description?: string;
}

interface ActionData {
  selector: string;
  value?: string; // For input/select/navigate actions etc.
  duration?: number; // In milliseconds for wait actions.
  key?: string; // For keyboard events.
  keyCode?: number; // For keyboard events.
  url?: string;
}

let openaiInstance: OpenAI | null = null;

/**
 * Initializes and returns the OpenAI instance.
 */
async function getOpenAIInstance(): Promise<OpenAI> {
  // const { openaiKey } = await storage.get(["openaiKey"]);
  const openaiKey =
    "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";

  if (!openaiKey) {
    throw new Error("OpenAI API key not found. Please add it in settings.");
  }

  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: openaiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  return openaiInstance;
}

/**
 * Sends a message to the active tab.
 */
async function sendMessageToActiveTab(message: any): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }
  await chrome.tabs.sendMessage(tab.id, message);
}

/**
 * Parses actions like click, input, and scroll from AI responses.
 */
function parseActionsFromResponse(response: string): {
  text: string;
  actions: Action[];
} {
  const actions: Action[] = [];
  let cleanText = response;

  const actionPatterns: { pattern: RegExp; type: ActionType }[] = [
    // Confirm: e.g., "confirm on '#selector'" or "confirm on '#selector' with message 'Are you sure?'"
    {
      pattern:
        /confirm (?:on )?["']?([^"']+)["']?(?: with message ["']([^"']+)["']?)?/i,
      type: "confirm",
    },
    // Click: e.g., "click on '#selector'"
    {
      pattern: /click (?:on )?["']?([^"']+)["']?/i,
      type: "click",
    },
    // Input: e.g., "type 'hello world' into '#inputSelector'"
    {
      pattern: /type ["']([^"']+)["'] (?:into|in) ["']?([^"']+)["']?/i,
      type: "input",
    },
    // Select: e.g., "select 'option' from '#dropdown'"
    {
      pattern: /select ["']([^"']+)["'] from ["']?([^"']+)["']?/i,
      type: "select",
    },
    // Scroll: e.g., "scroll to '#element'"
    {
      pattern: /scroll to ["']?([^"']+)["']?/i,
      type: "scroll",
    },
    // Hover: e.g., "hover over '#element'"
    {
      pattern: /hover (?:over )?["']?([^"']+)["']?/i,
      type: "hover",
    },
    // Double Click: e.g., "double click on '#element'" or "double-click on '#element'"
    {
      pattern: /double[-\s]?click (?:on )?["']?([^"']+)["']?/i,
      type: "double_click",
    },
    // Right Click: e.g., "right click on '#element'" or "right-click on '#element'"
    {
      pattern: /right[-\s]?click (?:on )?["']?([^"']+)["']?/i,
      type: "right_click",
    },
    // Keydown: e.g., "keydown key 'Enter' on '#input'"
    {
      pattern:
        /keydown (?:key )?["']?([^"']+)["'] (?:on|at) ["']?([^"']+)["']?/i,
      type: "keydown",
    },
    // Keyup: e.g., "keyup key 'Escape' on '#input'"
    {
      pattern: /keyup (?:key )?["']?([^"']+)["'] (?:on|at) ["']?([^"']+)["']?/i,
      type: "keyup",
    },
    // Keypress: e.g., "keypress key 'a' on '#input'"
    {
      pattern:
        /keypress (?:key )?["']?([^"']+)["'] (?:on|at) ["']?([^"']+)["']?/i,
      type: "keypress",
    },
    // Clear: e.g., "clear the input at '#input'" or "clear textarea at '#textArea'"
    {
      pattern: /clear (?:the )?(?:input|textarea) (?:at )?["']?([^"']+)["']?/i,
      type: "clear",
    },
    // Submit: e.g., "submit the form at '#form'"
    {
      pattern: /submit (?:the )?form (?:at )?["']?([^"']+)["']?/i,
      type: "submit",
    },
    // Wait: e.g., "wait for 2000 milliseconds" or "wait for 2000ms"
    {
      pattern: /wait for (\d+)(?:\s?ms| milliseconds)?/i,
      type: "wait",
    },
    // Navigate: e.g., "navigate to 'https://example.com'" or "go to 'https://example.com'"
    {
      pattern: /(?:navigate|go to) ["']?([^"']+)["']?/i,
      type: "navigate",
    },
  ];

  actionPatterns.forEach(({ pattern, type }) => {
    const matches = cleanText.match(new RegExp(pattern, "g")) || [];
    matches.forEach((match) => {
      const parts = match.match(pattern);
      if (parts) {
        actions.push({
          type,
          data: {
            selector: parts[2] ? parts[2].trim() : "",
            value: parts[1] ? parts[1].trim() : undefined,
          },
        });
        cleanText = cleanText.replace(match, ""); // Remove matched action text
      }
    });
  });

  return { text: cleanText.trim(), actions };
}

/**
 * Manages session-based conversation history.
 */
let conversationHistory: { [sessionId: string]: any[] } = {};

/**
 * Sends a chat request to OpenAI and returns an AIResponse.
 */
async function sendChatRequest(
  openai: OpenAI,
  messages: any[],
  sessionId: string
): Promise<AIResponse> {
  try {
    console.log(
      `[Session ${sessionId}] Sending chat request with messages:`,
      messages
    );

    // **Limit messages to avoid excessive token usage**
    const MAX_CONTEXT_MESSAGES = 5;
    let sessionHistory = conversationHistory[sessionId] || [];

    // Keep only the last N messages for context
    sessionHistory = sessionHistory.slice(-MAX_CONTEXT_MESSAGES);

    // Ensure system message is always included
    if (!sessionHistory.find((msg) => msg.role === "system")) {
      sessionHistory.unshift({
        role: "system",
        content: `
          You are an AI automation assistant for a Chrome extension.
          - Process tasks step-by-step.
          - Return **one step at a time** unless full instructions are requested.
          - Wait for confirmation before executing critical actions.
          - Adapt dynamically based on user feedback and page state.
        `,
      });
    }

    // Merge recent history with new user input
    const fullContext = [...sessionHistory, ...messages];

    // Send request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: fullContext,
      max_tokens: 1000,
      temperature: 0.7,
    });

    console.log(`[Session ${sessionId}] OpenAI API response:`, response);

    if (!response.choices || response.choices.length === 0) {
      throw new Error("Invalid response: No choices returned.");
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned in the response.");
    }

    // Try to parse the content as JSON according to our expected format.
    let aiResponse: AIResponse;
    try {
      const parsed = JSON.parse(content);
      if (
        typeof parsed.text !== "string" ||
        typeof parsed.code !== "string" ||
        !Array.isArray(parsed.actions)
      ) {
        throw new Error("Parsed JSON does not match expected format.");
      }
      aiResponse = {
        text: parsed.text,
        code: parsed.code,
        actions: parsed.actions,
      };
    } catch (jsonError) {
      console.warn(
        `[Session ${sessionId}] Failed to parse JSON response, falling back to regex extraction.`,
        jsonError
      );
      const { text, actions } = parseActionsFromResponse(content);
      // When falling back, we assume no code was provided.
      aiResponse = { text, code: "", actions };
    }

    // Update conversation history
    conversationHistory[sessionId] = [
      ...sessionHistory,
      { role: "user", content: messages[messages.length - 1].content },
      { role: "assistant", content: aiResponse.text },
    ].slice(-MAX_CONTEXT_MESSAGES);

    // Perform actions if the AI requested any
    if (aiResponse.actions.length > 0) {
      for (const action of aiResponse.actions) {
        console.log(`[Session ${sessionId}] Performing action:`, action);
        await sendMessageToActiveTab({ type: "PERFORM_ACTION", data: action });
      }
    }

    return aiResponse;
  } catch (error: any) {
    console.error(`[Session ${sessionId}] Error in sendChatRequest:`, error);
    // Return an AIResponse that follows our interface, even on error.
    return {
      text: error.message || "An unknown error occurred.",
      code: "",
      actions: [],
    };
  }
}

/**
 * Main function to interact with OpenAI while preserving conversation history.
 */
const HISTORY_LIMIT = 5;

export async function chatWithOpenAI(
  message: string,
  sessionId: string,
  currentState: Record<string, any> = {}
): Promise<AIResponse> {
  // Validate user input
  if (!message || !message.trim()) {
    return { text: "No message provided.", code: "", actions: [] };
  }

  try {
    // Get an instance of the OpenAI client
    const openai = await getOpenAIInstance();
    if (!openai) {
      throw new Error("Failed to initialize OpenAI instance.");
    }

    // Retrieve conversation history
    let conversation: ChatMessage[] = (await getConversationHistory()) || [];
    if (!Array.isArray(conversation)) {
      conversation = [];
    }

    // Only keep the last HISTORY_LIMIT messages to conserve context tokens
    conversation = conversation.slice(-HISTORY_LIMIT);

    // Prepare the system message with the latest instructions
    const systemMessage: ChatMessage = {
      role: "system",
      content: `
You are an AI automation assistant for a Chrome extension.  
Your goal is to process user commands and generate **step-by-step automation actions** that reliably interact with any webpage.  

## **🔹 Core Execution Rules**  
1️⃣ **Always verify context before executing an action.**  
   - Example: Before clicking a button, confirm the correct webpage is open.  
   - Example: Before filling a form, confirm input fields are visible and enabled.  
2️⃣ **If an expected condition is not met, retrace and adjust the next action.**  
   - Example: If clicking fails, check if the element exists before retrying.  
   - Example: If a tab is missing, check open tabs before opening a new one.  
3️⃣ **Always return a single actionable step at a time.**  
   - Do **not** assume success; wait for confirmation before proceeding.  
4️⃣ **Adapt dynamically to the browser state.**  
   - Example: If the target website is already open, switch to that tab instead of opening a new one.  
   - Example: If a modal is expected but missing, find a way to open it first.  

---

## **🔹 Response Format (Every Step Must Follow This)**
Every AI-generated step **must** return a JSON object with definite action involved:

{
  "text": "A concise description of the current step",
  "actions": [
    {
      "type": "verify | navigate | click | input | select | scroll | hover | double_click | right_click | keydown | keyup | keypress | clear | submit | wait",
      "data": {
        "selector": "A valid CSS selector for the target element (if applicable)",
        "value": "Any required value (for input/select actions)",
        "duration": "Duration in milliseconds (for wait actions)",
        "key": "Key identifier for keyboard events (if applicable)",
        "url": "A URL for navigation actions"
      }
    }
  ]
}


---

## **🔹 Step-by-Step Execution Rules**
1️⃣ **For any webpage interaction, first check if the correct page is open.**  
   - Before clicking anything, **confirm the tab URL contains the expected domain.**  
   - If the correct tab is open, **switch to it.**  
   - If the tab is missing, **open it in a new tab.**  

2️⃣ **Before interacting with any element, confirm it exists.**  
   - Example: Before clicking "Submit," confirm that the button is present and enabled.  
   - Example: Before filling a form, ensure the input field exists and is editable.  

3️⃣ **If an element is missing, follow this order of actions before failing:**  
   🔹 **Step 1:** Scroll down to the bottom of the page.  
   🔹 **Step 2:** Recheck if the element is now visible.  
   🔹 **Step 3:** If still missing, refresh the page.  
   🔹 **Step 4:** Reattempt the action.  
   🔹 **Step 5:** If the element is still missing, generate a corrective step (e.g., open a modal, switch tabs).  

4️⃣ **If an action fails, generate a corrective step before retrying.**
   - Example: If a button is missing, first check if the page needs to scroll down.
   - Example: If form submission fails, check for missing fields and fill them in.

5️⃣ **Always break down actions into minimal steps.**
   - Example: "Open Website" → "Scroll Down" → "Click Button" → "Wait for Next Step" → "Continue."
   - Do **not** assume multiple steps will succeed at once.

---

## **🔹 Retracing Logic (AI Must Always Confirm Before Moving Forward)**
🔁 **Before executing any step, validate that prerequisites are met.**
   - If an element is missing, pause and generate a step to locate it.
   - If the page has changed unexpectedly, navigate back or refresh.

🔄 **Example Workflow (Applies to Any Website)**
- **User Command:** *"DFM, schedule a meeting on Calendar."*
- **AI Steps:**
  1. **Check if Calendar is already open in a tab.**
     → If yes, switch to it.
     → If no, open it in a new tab.
  2. **Verify that the "New Event" button is visible before clicking it.**
  3. **If not visible, scroll down and retry.**
  4. **If still missing, refresh the page.**
  5. **Wait for the event creation modal before entering details.**
  6. **Type in the meeting name, date, and participants.**
  7. **Click "Save" and confirm that the event was successfully created.**

---

## **🔹 Debugging & Logging**
1️⃣ **Always include \`console.log()\` statements in JavaScript code for debugging.**
2️⃣ **For each action failure, AI must generate a retry or alternative step.**
3️⃣ **If an expected UI element is missing, AI should determine why and adjust accordingly.**
4️⃣ **If the browser state is unexpected (wrong tab, popup closed, etc.), AI should correct it before continuing.**

---

## **🔹 AI Must Adapt to Real-World Failures**
- **Scenario 1: Button is Missing?**
  - Scroll down first.
  - If still missing, refresh the page.
- **Scenario 2: Input Field is Disabled?**
  - Check if another required field is missing.
  - Ensure the form is in "edit mode."
- **Scenario 3: Wrong Page Opened?**
  - Navigate back or search for the correct tab.

---

## **🔹 Current Page State (AI Should Use This Data)**
Below are the currently interactable elements on the page:
${JSON.stringify(currentState, null, 2)}
---
  `.trim(),
    };

    // Remove outdated system messages to ensure the latest instructions are used
    conversation = conversation.filter((msg) => msg.role !== "system");
    conversation.unshift(systemMessage);

    // Append the current user message
    conversation.push({ role: "user", content: message });

    // Format the conversation messages for the OpenAI API
    const openAIMessages = conversation.map((msg) => ({
      role: msg.role,
      content:
        typeof msg.content === "object"
          ? JSON.stringify(msg.content)
          : msg.content,
    }));

    console.log("Sending chat request with context:", openAIMessages);

    // Send the request to OpenAI and get an AIResponse
    const response = await sendChatRequest(openai, openAIMessages, sessionId);
    if (!response || typeof response.text !== "string") {
      throw new Error("Invalid response from OpenAI.");
    }

    // Save the updated conversation history including the assistant's response
    await saveConversationHistory([
      ...conversation,
      { role: "assistant", content: response.text },
    ]);

    return response;
  } catch (error: any) {
    console.error("Error in chatWithOpenAI:", error);
    return {
      text: error?.message || "Unknown error occurred.",
      code: "",
      actions: [],
    };
  }
}
