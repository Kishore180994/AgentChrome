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
Your goal is to process user commands and generate **JavaScript code** to automate interactions with the webpage.

## **Response Format**
You must **always** return a valid JSON object with the following structure:
{
  "text": "A concise description of the step",
  "code": "JavaScript code that is directly executable on the page",
  "actions": [
    {
      "type": "confirm | click | input | select | scroll | hover | double_click | right_click | keydown | keyup | keypress | clear | submit | wait | navigate",
      "data": {
        "selector": "A valid CSS selector for the target element",
        "value": "Any required value (if applicable)",
        "duration": "Duration in milliseconds (for wait actions)",
        "key": "Key identifier for keyboard events (if applicable)"
      }
    }
  ]
}

## **Rules**
1️⃣ **Return only one step at a time.** Each response should describe a single, discrete action.
2️⃣ **Provide directly executable JavaScript code** that interacts with the current webpage.
3️⃣ **Use the provided interactable elements data** to generate the correct \`selector\` for actions.
4️⃣ **For Google searches:** Identify the proper search input (textarea or input) and simulate entering text followed by clicking the search button.
5️⃣ **For input actions:** Locate the correct element and insert the provided text.
6️⃣ **For dropdown actions:** Set the correct value and trigger the change event.
7️⃣ **For click actions:** Ensure the targeted element is correct before simulating a click.
8️⃣ **For hover actions:** Simulate mouse over events (e.g., dispatch \`mouseover\` and \`mouseenter\` events).
9️⃣ **For double-click and right-click actions:** Simulate the corresponding mouse events (e.g., \`dblclick\` for double-click, \`contextmenu\` for right-click).
🔟 **For keyboard events** (\`keydown\`, \`keyup\`, \`keypress\`): Include the appropriate \`key\` or \`keyCode\` in the event data.
1️⃣1️⃣ **For clear actions:** Remove any existing text from input fields.
1️⃣2️⃣ **For submit actions:** Target the appropriate form or element and trigger a submission.
1️⃣3️⃣ **For wait actions:** Pause execution for the specified duration before proceeding.
1️⃣4️⃣ **For navigation actions:** Redirect the browser to the provided URL.
1️⃣5️⃣ **Include debugging output** in the \`code\` field using \`console.log\` statements as needed for tracing execution.
1️⃣6️⃣ **Keep actions sequential.** If multiple interactions are required, break them into separate steps.

## **Current Page State**
Below are the available interactable elements:
\`\`\`
${JSON.stringify(currentState, null, 2)}
\`\`\`
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
