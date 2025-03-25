/// <reference types="@types/chrome" />

import { AgentResponseFormat, MemoryState } from "../../types/responseFormat";
import { GeminiChatMessage } from "../ai/interfaces";
import { AIProvider, callAI } from "../ai/providers";

const MAX_RETRIES = 3;
let currentProvider: AIProvider = "gemini";

/**
 * Communicates with the AI to process a user message and returns a structured response.
 *
 * @param userMessage - The message from the user to be sent to the AI.
 * @param sessionId - The unique identifier for the current session.
 * @param currentState - The current state of the conversation, represented as a record of key-value pairs.
 * @param screenShotDataUrl - An optional data URL of a screenshot to be sent to the AI (e.g., for Gemini vision capabilities).
 * @returns A promise that resolves to an `AgentResponseFormat` object containing the AI's response.
 *
 * @throws Will return a fallback response if an error occurs during the process.
 */
export async function chatWithAI(
  userMessage: string,
  sessionId: string,
  currentState: Record<string, any> = {},
  screenShotDataUrl?: string
): Promise<AgentResponseFormat> {
  // Fallback if something fails
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
    // Capture screenshot if using Gemini and no screenshot is provided
    let finalScreenShotDataUrl = screenShotDataUrl;
    if (currentProvider === "gemini" && !finalScreenShotDataUrl) {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab && tab.id) {
        finalScreenShotDataUrl = await new Promise((resolve) => {
          chrome.tabs.captureVisibleTab(
            tab.windowId,
            { format: "png" },
            (dataUrl) => {
              resolve(dataUrl);
            }
          );
        });
      }
    }

    const conversation = await prepareConversation(userMessage, currentState);
    const response = await sendWithRetry(
      conversation,
      sessionId,
      finalScreenShotDataUrl
    );
    console.log("[chatWithAI] response", response);
    const parsed = parseAgentResponseFormat(response);
    await updateConversationHistory(conversation, JSON.stringify(parsed));

    return parsed;
  } catch (err) {
    console.error("[chatWithAI] Fatal error => fallback", err);
    return fallback;
  }
}

/**
 * Prepares a conversation by combining the user's message with the current state and
 * the existing conversation history, while filtering out old system messages.
 *
 * @param userMsg - The message from the user to be included in the conversation.
 * @param currentState - An optional object representing the current state of the application.
 * @returns A promise that resolves to an array of `GeminiChatMessage` objects representing the prepared conversation.
 */
async function prepareConversation(
  userMsg: string,
  currentState: Record<string, any> = {}
): Promise<GeminiChatMessage[]> {
  const existingHistory = await getConversationHistory();
  // Filter out old system messages from the history
  // const pruned = existingHistory.filter((m) => m.role !== "model");

  // Add the current URL, currentState to the userMsg
  const userMsgWithState = `${userMsg} &&

  Current DOM Elements on Page: ${JSON.stringify(currentState, null, 2)}`;
  // Combine pruned history and user message, then slice
  const combined = [
    ...existingHistory,
    { role: "user", parts: [{ text: userMsgWithState }] } as GeminiChatMessage,
  ];

  // Add only the latest system messages
  const final: GeminiChatMessage[] = [...combined];

  return final;
}

/**
 * Sends a conversation to the AI provider with retry logic.
 *
 * @param conversation - An array of chat messages to be sent to the AI.
 * @param sessionId - A unique identifier for the session.
 * @param screenShotDataUrl - An optional data URL of a screenshot to be sent to the AI.
 * @param retries - The number of retry attempts left (default is MAX_RETRIES).
 * @returns A promise that resolves with the AI response or rejects with an error after all retries are exhausted.
 * @throws Will throw an error if all retry attempts fail.
 */
async function sendWithRetry(
  conversation: GeminiChatMessage[],
  sessionId: string,
  screenShotDataUrl?: string,
  retries = MAX_RETRIES
): Promise<any> {
  try {
    console.debug(`[sendWithRetry][${sessionId}] requesting AI...`);
    const resp = await callAI(currentProvider, conversation, screenShotDataUrl);
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
 *
 * @param apiResponse - The response object from the API.
 * @returns The parsed AgentResponseFormat object. If the response is invalid or an error occurs,
 *          it returns a fallback object with default values.
 *
 * The fallback object structure:
 * {
 *   current_state: {
 *     page_summary: "",
 *     evaluation_previous_goal: "Unknown",
 *     memory: "",
 *     next_goal: "",
 *   },
 *   action: [],
 * }
 *
 * Logs warnings if the response is missing required fields or is null/undefined.
 * Logs an error if an exception occurs during parsing.
 */
function parseAgentResponseFormat(apiResponse: any): AgentResponseFormat {
  if (!apiResponse) {
    console.warn("[parseAgentResponseFormat] no AI content => fallback empty");
    return {
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
  }

  try {
    if (!apiResponse.current_state) {
      console.warn(
        "[parseAgentResponseFormat] missing current_state/action => fallback"
      );
      return {
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
    }
    return apiResponse;
  } catch (err) {
    console.error("[parseAgentResponseFormat] parse error => fallback");
    return {
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
  }
}

/**
 * Updates the conversation history by appending a new message from the model.
 *
 * @param {GeminiChatMessage[]} conversation - The current conversation history.
 * @param {string} agentJSON - The JSON string representing the agent's response.
 * @returns {Promise<void>} A promise that resolves when the conversation history is updated in local storage.
 */
async function updateConversationHistory(
  conversation: GeminiChatMessage[],
  agentJSON: string
) {
  const newHistory: GeminiChatMessage[] = [
    ...conversation,
    { role: "model", parts: [{ text: agentJSON }] },
  ];

  await chrome.storage.local.set({ conversationHistory: newHistory });
}

/**
 * Retrieves the conversation history from local storage.
 *
 * @returns {Promise<GeminiChatMessage[]>} A promise that resolves to an array of `GeminiChatMessage` objects representing the conversation history.
 */
async function getConversationHistory(): Promise<GeminiChatMessage[]> {
  const result = await chrome.storage.local.get("conversationHistory");
  return result.conversationHistory || [];
}
