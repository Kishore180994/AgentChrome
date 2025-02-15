/// <reference types="@types/chrome" />
import OpenAI from "openai";
import { ChatMessage } from "../../utils/chatHistory";

interface AIResponse {
  text: string;
  code?: string;
  actions: Action[];
  nextStep: string;
  errorStep?: {
    condition: string;
    actions: Action[];
  };
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
  | "navigate"
  | "verify";

interface Action {
  type: ActionType;
  data: ActionData;
  description?: string;
}

interface ActionData {
  selector?: string;
  value?: string;
  duration?: number;
  key?: string;
  url?: string;
}

const HISTORY_LIMIT = 5;
const MAX_RETRIES = 3;
let openaiInstance: OpenAI | null = null;

const SYSTEM_PROMPT = (currentState: string) =>
  `
You are an AI web automation engine. Follow these STRICT RULES:

1. RESPONSE FORMAT (MUST USE):
{
  "text": "Brief step description",
  "actions": [{
    "type": "ActionType",
    "data": {
      "selector": "CSS selector from current elements",
      "value": "Optional input value",
      "url": "For navigation/verification"
    },
    "description": "Why this action is needed"
  }],
  "nextStep": "Next immediate action description",
  "errorStep": {
    "condition": "Specific failure scenario",
    "actions": [/* Recovery steps */]
  }
}

2. CORE PRINCIPLES:
- Verify URL before interacting with elements
- Use ONLY selectors from current elements
- One primary action per response + recovery plan
- Assume nothing about page state
- Handle both successful and failed outcomes

3. ACTION TYPES GUIDE:
• verify: Check URL/Page Load (requires 'url')
• navigate: Go to new URL (requires 'url')
• click: Standard click (requires 'selector')
• input: Type text (needs 'selector' + 'value')
• scroll: Scroll to element (needs 'selector')
• wait: Pause execution (needs 'duration')

4. CURRENT PAGE STATE (USE THESE SELECTORS):
${currentState}

5. EXAMPLE SCENARIOS:

🔹 Google Search:
{
  "text": "Searching for 'AI automation tools'",
  "actions": [
    {
      "type": "verify",
      "data": { "url": "google.com" },
      "description": "Ensure we're on Google"
    },
    {
      "type": "input",
      "data": {
        "selector": "[name='q']",
        "value": "AI automation tools"
      },
      "description": "Enter search query"
    }
  ],
  "nextStep": "Click search button",
  "errorStep": {
    "condition": "Search input missing",
    "actions": [
      { "type": "navigate", "data": { "url": "https://google.com" } }
    ]
  }
}

🔹 E-commerce Checkout:
{
  "text": "Completing purchase",
  "actions": [
    {
      "type": "click",
      "data": { "selector": ".checkout-btn" },
      "description": "Initiate checkout"
    }
  ],
  "nextStep": "Fill shipping information",
  "errorStep": {
    "condition": "Checkout button not found",
    "actions": [
      { "type": "scroll", "data": { "selector": "footer" } },
      { "type": "wait", "data": { "duration": 2000 } },
      { "type": "click", "data": { "selector": ".checkout-btn" } }
    ]
  }
}

6. VALIDATION CHECKLIST (REQUIRED):
✅ Selectors exist in current elements
✅ Required data fields present per action type
✅ nextStep describes concrete next action
✅ errorStep has executable recovery plan
✅ No markdown formatting
✅ Pure JSON only
`.trim();

async function getOpenAIInstance(): Promise<OpenAI> {
  console.debug("[OpenAI] Initializing OpenAI instance");

  const openaiKey =
    "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";

  try {
    if (!openaiInstance) {
      console.debug("[OpenAI] Creating new OpenAI client instance");
      openaiInstance = new OpenAI({
        apiKey: openaiKey,
        dangerouslyAllowBrowser: true,
      });
      console.debug("[OpenAI] OpenAI instance created successfully");
    } else {
      console.debug("[OpenAI] Using existing OpenAI instance");
    }
    return openaiInstance;
  } catch (error) {
    console.error("[OpenAI] Error creating OpenAI instance:", error);
    throw error;
  }
}

export async function chatWithOpenAI(
  message: string,
  sessionId: string,
  currentState: Record<string, any> = {},
  isInitialCommand: boolean = false
): Promise<AIResponse> {
  console.debug(`[chatWithOpenAI] Session ${sessionId} started processing`, {
    messagePreview: message.substring(0, 50),
    isInitialCommand,
    currentStateElements: Object.keys(currentState).length,
  });

  const defaultResponse: AIResponse = {
    text: "Failed to process request",
    code: "ERR_DEFAULT",
    actions: [],
    nextStep: "ABORT_AUTOMATION",
    errorStep: {
      condition: "Initial failure",
      actions: [],
    },
  };

  try {
    console.debug(`[chatWithOpenAI][${sessionId}] Getting OpenAI instance`);
    const openai = await getOpenAIInstance();
    if (!openai) {
      console.error(`[chatWithOpenAI][${sessionId}] OpenAI client unavailable`);
      throw new Error("OpenAI client unavailable");
    }

    console.debug(`[chatWithOpenAI][${sessionId}] Building system prompt`);
    const systemPrompt = buildSystemPrompt(
      currentState,
      isInitialCommand,
      message
    );

    console.debug(
      `[chatWithOpenAI][${sessionId}] Preparing conversation context`
    );
    const conversation = await prepareConversation(systemPrompt, message);
    console.debug(
      `[chatWithOpenAI][${sessionId}] Conversation context prepared`,
      {
        messageCount: conversation.length,
      }
    );

    console.debug(
      `[chatWithOpenAI][${sessionId}] Sending request with retries`
    );
    const response = await sendWithRetry(openai, conversation, sessionId);
    console.debug(`[chatWithOpenAI][${sessionId}] Received API response`, {
      responsePreview: response.choices[0]?.message?.content?.substring(0, 100),
    });

    console.debug(
      `[chatWithOpenAI][${sessionId}] Validating response structure`
    );
    const validatedResponse = validateAIResponse(response);
    console.debug(`[chatWithOpenAI][${sessionId}] Response validated`, {
      actionCount: validatedResponse.actions.length,
      nextStep: validatedResponse.nextStep,
    });

    console.debug(
      `[chatWithOpenAI][${sessionId}] Updating conversation history`
    );
    await updateConversationHistory(conversation, validatedResponse.text);
    console.debug(
      `[chatWithOpenAI][${sessionId}] History updated successfully`
    );

    return validatedResponse;
  } catch (error) {
    console.error(`[chatWithOpenAI][${sessionId}] Critical error:`, error);
    if (error instanceof Error) {
      console.debug(`[chatWithOpenAI][${sessionId}] Error stack:`, error.stack);
    }
    return {
      ...defaultResponse,
      text: error instanceof Error ? error.message : "Unknown error",
      code: "ERR_CRITICAL",
    };
  }
}

function buildSystemPrompt(
  currentState: Record<string, any>,
  isInitial: boolean,
  message: string
): ChatMessage[] {
  console.debug("[buildSystemPrompt] Constructing system messages", {
    isInitialCommand: isInitial,
    currentStateElementCount: Object.keys(currentState).length,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT(JSON.stringify(currentState)) },
  ];

  if (isInitial) {
    console.debug("[buildSystemPrompt] Adding initial command", {
      commandPreview: message.substring(0, 50),
    });
    messages.push({
      role: "system",
      content: `INITIAL COMMAND: ${message}`,
    });
  }

  console.debug("[buildSystemPrompt] System messages prepared", {
    systemMessageCount: messages.length,
  });
  return messages;
}

async function prepareConversation(
  systemMessages: ChatMessage[],
  userMessage: string
): Promise<ChatMessage[]> {
  console.debug("[prepareConversation] Building conversation context", {
    systemMessageCount: systemMessages.length,
    userMessageLength: userMessage.length,
  });

  try {
    console.debug("[prepareConversation] Retrieving conversation history");
    const history = await getConversationHistory();
    console.debug("[prepareConversation] Retrieved history", {
      historyItemCount: history.length,
    });

    const filteredHistory = history.filter((msg) => msg.role !== "system");
    console.debug("[prepareConversation] Filtered non-system messages", {
      filteredCount: filteredHistory.length,
    });

    const conversation: ChatMessage[] = [
      ...systemMessages,
      ...filteredHistory,
      { role: "user", content: userMessage } as ChatMessage,
    ].slice(-HISTORY_LIMIT * 2);

    console.debug("[prepareConversation] Final conversation context", {
      totalMessages: conversation.length,
      firstSystemMessage:
        typeof systemMessages[0]?.content === "string"
          ? systemMessages[0].content.substring(0, 50)
          : "",
    });

    return conversation;
  } catch (error) {
    console.error("[prepareConversation] Error preparing conversation:", error);
    throw error;
  }
}

async function sendWithRetry(
  openai: OpenAI,
  messages: ChatMessage[],
  sessionId: string,
  retries = MAX_RETRIES
): Promise<any> {
  console.debug(`[sendWithRetry][${sessionId}] Attempting API request`, {
    retriesRemaining: retries,
  });

  try {
    console.debug(`[sendWithRetry][${sessionId}] Sending request to OpenAI`, {
      messageCount: messages.length,
      firstMessage:
        typeof messages[0]?.content === "string"
          ? messages[0].content.substring(0, 50)
          : "",
    });

    console.log({ messages });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages.map((msg) => ({
        role: msg.role,
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
      })),
      max_tokens: 1000,
      temperature: 0.7,
    });

    console.debug(`[sendWithRetry][${sessionId}] API request successful`);
    return response;
  } catch (error) {
    console.error(`[sendWithRetry][${sessionId}] API request failed:`, error);

    if (retries > 0) {
      console.debug(`[sendWithRetry][${sessionId}] Retrying...`, {
        retriesRemaining: retries - 1,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return sendWithRetry(openai, messages, sessionId, retries - 1);
    }

    console.error(`[sendWithRetry][${sessionId}] All retries exhausted`);
    throw error;
  }
}

function validateAIResponse(rawResponse: any): AIResponse {
  console.debug("[validateAIResponse] Validating response structure");

  try {
    console.debug("[validateAIResponse] Parsing raw response");
    const content = JSON.parse(rawResponse.choices[0].message.content);
    console.debug("[validateAIResponse] JSON parsed successfully");

    if (!content.text || !Array.isArray(content.actions)) {
      console.error("[validateAIResponse] Invalid structure", {
        hasText: !!content.text,
        hasActions: Array.isArray(content.actions),
      });
      throw new Error("Invalid response structure");
    }

    console.debug("[validateAIResponse] Building validated response", {
      actionCount: content.actions.length,
      nextStep: content.nextStep,
    });

    return {
      text: content.text,
      code: content.code || "",
      actions: content.actions || [],
      nextStep: content.nextStep || "CONTINUE_AUTOMATION",
      errorStep: content.errorStep || {
        condition: "Generic failure",
        actions: [],
      },
    };
  } catch (error) {
    console.error("[validateAIResponse] Validation failed, using fallback");
    return parseFallbackResponse(rawResponse);
  }
}

function parseFallbackResponse(response: any): AIResponse {
  console.debug("[parseFallbackResponse] Attempting fallback parsing");

  try {
    const content = response.choices[0]?.message?.content || "";
    console.debug("[parseFallbackResponse] Raw content:", {
      contentPreview: content.substring(0, 100),
    });

    const textMatch = content.match(/"text":\s*"([^"]+)"/);
    const actionsMatch = content.match(/"actions":\s*(\[[\s\S]*?\])/);

    console.debug("[parseFallbackResponse] Regex matches", {
      textFound: !!textMatch,
      actionsFound: !!actionsMatch,
    });

    return {
      text: textMatch?.[1] || "Could not parse response",
      code: "ERR_PARSE_FAILED",
      actions: actionsMatch ? JSON.parse(actionsMatch[1]) : [],
      nextStep: content.includes("FINISHED_AUTOMATION")
        ? "FINISHED_AUTOMATION"
        : "REQUIRE_MANUAL_INPUT",
      errorStep: {
        condition: "Invalid response format",
        actions: [],
      },
    };
  } catch (error) {
    console.error("[parseFallbackResponse] Fallback parsing failed");
    return {
      text: "Critical parse failure",
      code: "ERR_PARSE_FAILED",
      actions: [],
      nextStep: "ABORT_AUTOMATION",
      errorStep: {
        condition: "Unrecoverable parse error",
        actions: [],
      },
    };
  }
}

async function updateConversationHistory(
  conversation: ChatMessage[],
  responseText: string
) {
  console.debug("[updateConversationHistory] Updating storage", {
    conversationLength: conversation.length,
    responsePreview: responseText.substring(0, 50),
  });

  try {
    const newHistory = [
      ...conversation,
      { role: "assistant", content: responseText },
    ].slice(-HISTORY_LIMIT);

    console.debug("[updateConversationHistory] Setting new history", {
      newHistoryLength: newHistory.length,
    });

    await chrome.storage.local.set({ conversationHistory: newHistory });
    console.debug("[updateConversationHistory] Storage updated successfully");
  } catch (error) {
    console.error("[updateConversationHistory] Storage update failed:", error);
    throw error;
  }
}

async function getConversationHistory(): Promise<ChatMessage[]> {
  console.debug("[getConversationHistory] Retrieving from storage");

  try {
    const result = await chrome.storage.local.get("conversationHistory");
    const history = result.conversationHistory || [];

    console.debug("[getConversationHistory] Retrieved history", {
      historyLength: history.length,
    });

    return history;
  } catch (error) {
    console.error("[getConversationHistory] Storage retrieval failed:", error);
    return [];
  }
}
