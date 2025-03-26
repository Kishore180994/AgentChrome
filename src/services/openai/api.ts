/// <reference types="@types/chrome" />

import { AgentResponseFormat, MemoryState } from "../../types/responseFormat";
import {
  ClaudeChatContent,
  ClaudeChatMessage,
  ConversationHistory,
  GeminiChatMessage,
} from "../ai/interfaces";
import { AIProvider, callAI } from "../ai/providers";

const MAX_RETRIES = 3;
let currentProvider: AIProvider = "gemini"; // Default provider, can be overridden

/**
 * Communicates with the AI to process a user message and returns a structured response.
 *
 * @param userMessage - The message from the user to be sent to the AI.
 * @param sessionId - The unique identifier for the current session.
 * @param currentState - The current state of the conversation.
 * @param screenShotDataUrl - An optional data URL of a screenshot to be sent to the AI.
 * @param provider - The AI provider to use (defaults to currentProvider).
 * @returns A promise that resolves to an `AgentResponseFormat` object containing the AI's response.
 */
export async function chatWithAI(
  userMessage: string,
  sessionId: string,
  currentState: Record<string, any> = {},
  screenShotDataUrl?: string,
  provider: AIProvider = currentProvider
): Promise<AgentResponseFormat> {
  const fallback: AgentResponseFormat = {
    current_state: {
      page_summary: "",
      evaluation_previous_goal: "Unknown",
      memory: {} as MemoryState,
      current_goal: "",
      next_goal: "",
      next_goal_elements_type: [],
    },
    action: [],
  };

  try {
    // Capture screenshot if none provided and provider supports vision
    let finalScreenShotDataUrl = screenShotDataUrl;
    // if (
    //   !finalScreenShotDataUrl &&
    //   (provider === "gemini" || provider === "claude")
    // ) {
    //   const [tab] = await chrome.tabs.query({
    //     active: true,
    //     currentWindow: true,
    //   });
    //   if (tab?.id) {
    //     finalScreenShotDataUrl = await new Promise((resolve) => {
    //       chrome.tabs.captureVisibleTab(
    //         tab.windowId,
    //         { format: "png" },
    //         resolve
    //       );
    //     });
    //   }
    // }

    // Set the current provider for consistency
    currentProvider = provider;

    // Prepare conversation based on provider
    if (provider !== "gemini" && provider !== "claude") {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    const conversation = await prepareConversation(
      userMessage,
      currentState,
      provider
    );
    const response = await sendWithRetry(
      conversation,
      sessionId,
      finalScreenShotDataUrl
    );
    console.log("[chatWithAI] response", response);

    if (!response) throw new Error("No response from AI");
    const parsed = parseAgentResponseFormat(response);

    // Convert conversation to ConversationHistory format for storage
    const historyConversation = convertToConversationHistory(conversation);
    await updateConversationHistory(
      historyConversation,
      JSON.stringify(parsed)
    );

    return parsed;
  } catch (err) {
    console.error("[chatWithAI] Fatal error => fallback", err);
    return fallback;
  }
}

/**
 * Prepares a conversation by combining the user's message with the current state and
 * existing conversation history, formatting for the specified provider.
 */
async function prepareConversation(
  userMsg: string,
  currentState: Record<string, any> = {},
  provider: "gemini" | "claude"
): Promise<GeminiChatMessage[] | ClaudeChatMessage[]> {
  const existingHistory = await getConversationHistory();
  const historyToUse = existingHistory.filter((m) => m.role !== "model"); // Filter out old "model" messages

  const userMsgWithState = `${userMsg} && Current DOM Elements on Page: ${JSON.stringify(
    currentState,
    null,
    2
  )}`;

  switch (provider) {
    case "gemini":
      const geminiHistory: GeminiChatMessage[] = historyToUse.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));
      return [
        ...geminiHistory,
        { role: "user", parts: [{ text: userMsgWithState }] },
      ];

    case "claude":
      const claudeHistory: ClaudeChatMessage[] = historyToUse.map((m) => ({
        role: m.role === "model" ? "assistant" : m.role,
        content: [{ type: "text", text: m.content } as ClaudeChatContent],
      }));
      return [
        ...claudeHistory,
        {
          role: "user",
          content: [
            { type: "text", text: userMsgWithState } as ClaudeChatContent,
          ],
        },
      ];

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Sends a conversation to the AI provider with retry logic.
 */
async function sendWithRetry(
  conversation: GeminiChatMessage[] | ClaudeChatMessage[],
  sessionId: string,
  screenShotDataUrl?: string,
  retries = MAX_RETRIES
): Promise<AgentResponseFormat | null> {
  try {
    console.debug(`[sendWithRetry][${sessionId}] requesting AI...`);
    const resp = await callAI(currentProvider, conversation, screenShotDataUrl);
    if (!resp) throw new Error("Null response from AI");
    return resp;
  } catch (err) {
    console.error(`[sendWithRetry][${sessionId}] error=`, err);
    if (retries > 0) {
      console.debug(
        `[sendWithRetry][${sessionId}] retrying attempts left=`,
        retries - 1
      );
      await new Promise((res) => setTimeout(res, 1000));
      return sendWithRetry(
        conversation,
        sessionId,
        screenShotDataUrl,
        retries - 1
      );
    }
    throw err;
  }
}

/**
 * Parses the API response to match the AgentResponseFormat.
 */
function parseAgentResponseFormat(apiResponse: any): AgentResponseFormat {
  const fallback: AgentResponseFormat = {
    current_state: {
      page_summary: "",
      evaluation_previous_goal: "Unknown",
      memory: {} as MemoryState,
      current_goal: "",
      next_goal: "",
      next_goal_elements_type: [],
    },
    action: [],
  };

  if (!apiResponse) {
    console.warn("[parseAgentResponseFormat] no AI content => fallback empty");
    return fallback;
  }

  try {
    if (!apiResponse.current_state || !Array.isArray(apiResponse.action)) {
      console.warn(
        "[parseAgentResponseFormat] missing current_state/action => fallback"
      );
      return fallback;
    }
    return apiResponse as AgentResponseFormat;
  } catch (err) {
    console.error("[parseAgentResponseFormat] parse error => fallback", err);
    return fallback;
  }
}

/**
 * Converts GeminiChatMessage[] or ClaudeChatMessage[] to ConversationHistory[].
 */
function convertToConversationHistory(
  conversation: GeminiChatMessage[] | ClaudeChatMessage[]
): ConversationHistory[] {
  return conversation.map((msg) => {
    if ("parts" in msg) {
      return { role: msg.role, content: msg.parts[0]?.text || "" };
    } else {
      return {
        role: msg.role,
        content: msg.content.find((c) => c.type === "text")?.text || "",
      };
    }
  });
}

/**
 * Updates the conversation history by appending a new message from the model.
 */
async function updateConversationHistory(
  conversation: ConversationHistory[],
  agentJSON: string
): Promise<void> {
  const newHistory: ConversationHistory[] = [
    ...conversation,
    { role: "model", content: agentJSON },
  ];
  await chrome.storage.local.set({ conversationHistory: newHistory });
}

/**
 * Retrieves the conversation history from local storage.
 */
async function getConversationHistory(): Promise<ConversationHistory[]> {
  const result = await chrome.storage.local.get("conversationHistory");
  return result.conversationHistory || [];
}
