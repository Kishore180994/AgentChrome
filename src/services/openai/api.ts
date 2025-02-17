/// <reference types="@types/chrome" />

import { AgentResponseFormat } from "../../types/responseFormat";
import { ChatMessage } from "../ai/interfaces";
import { AIProvider, callAI } from "../ai/providers";

const MAX_RETRIES = 3;
let currentProvider: AIProvider = "gemini";

/**
 * Communicates with the AI to process a user message and returns a structured response.
 *
 * @param userMessage - The message from the user to be sent to the AI.
 * @param sessionId - The unique identifier for the current session.
 * @param currentState - The current state of the conversation, represented as a record of key-value pairs.
 * @param isInitialCommand - A boolean indicating if this is the initial command in the conversation.
 * @returns A promise that resolves to an `AgentResponseFormat` object containing the AI's response.
 *
 * @throws Will return a fallback response if an error occurs during the process.
 */
export async function chatWithAI(
  userMessage: string,
  sessionId: string,
  currentState: Record<string, any> = {}
): Promise<AgentResponseFormat> {
  // console.log(`[chatWithOpenAI] session=${sessionId}`, {
  //   userMessagePreview: userMessage.slice(0, 50),
  //   isInitialCommand,
  //   currentStateCount: Object.keys(currentState).length,
  // });

  // Fallback if something fails
  const fallback: AgentResponseFormat = {
    current_state: {
      page_summary: "",
      evaluation_previous_goal: "Unknown",
      memory: "",
      next_goal: "",
    },
    action: [],
  };

  try {
    const conversation = await prepareConversation(userMessage, currentState);
    const response = await sendWithRetry(conversation, sessionId);

    const parsed = parseAgentResponseFormat(response);
    await updateConversationHistory(conversation, JSON.stringify(parsed));

    return parsed;
  } catch (err) {
    console.error("[chatWithOpenAI] Fatal error => fallback", err);
    return fallback;
  }
}

/**
 * Prepares a conversation by combining the user's message with the current state and
 * the existing conversation history, while filtering out old system messages.
 *
 * @param userMsg - The message from the user to be included in the conversation.
 * @param currentState - An optional object representing the current state of the application.
 * @returns A promise that resolves to an array of `ChatMessage` objects representing the prepared conversation.
 */
async function prepareConversation(
  userMsg: string,
  currentState: Record<string, any> = {}
): Promise<ChatMessage[]> {
  const existingHistory = await getConversationHistory();
  // Filter out old system messages from the history
  const pruned = existingHistory.filter((m) => m.role !== "model");

  // Add the current URL, currentState to the userMsg
  const userMsgWithState = `${userMsg} && 

  Current DOM Elements on Page: ${JSON.stringify(currentState, null, 2)}`;
  // Combine pruned history and user message, then slice
  const combined = [
    ...pruned,
    { role: "user", parts: [{ text: userMsgWithState }] } as ChatMessage,
  ];

  // Add only the latest system messages
  const final: ChatMessage[] = [...combined];

  return final;
}

/**
 * Sends a conversation to the AI provider with retry logic.
 *
 * @param conversation - An array of chat messages to be sent to the AI.
 * @param sessionId - A unique identifier for the session.
 * @param retries - The number of retry attempts left (default is MAX_RETRIES).
 * @returns A promise that resolves with the AI response or rejects with an error after all retries are exhausted.
 * @throws Will throw an error if all retry attempts fail.
 */
async function sendWithRetry(
  conversation: ChatMessage[],
  sessionId: string,
  retries = MAX_RETRIES
): Promise<any> {
  try {
    console.debug(`[sendWithRetry][${sessionId}] requesting AI...`);
    const resp = await callAI(currentProvider, conversation);
    return resp;
  } catch (err) {
    console.error(`[sendWithRetry][${sessionId}] error=`, err);
    if (retries > 0) {
      console.debug(
        `[sendWithRetry][${sessionId}] retrying attempts left=`,
        retries - 1
      );
      await new Promise((res) => setTimeout(res, 1000));
      return sendWithRetry(conversation, sessionId, retries - 1);
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
        memory: "",
        next_goal: "",
      },
      action: [],
    };
  }

  try {
    if (!apiResponse.current_state || !apiResponse.action) {
      console.warn(
        "[parseAgentResponseFormat] missing current_state/action => fallback"
      );
      return {
        current_state: {
          page_summary: "",
          evaluation_previous_goal: "Unknown",
          memory: "",
          next_goal: "",
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
        memory: "",
        next_goal: "",
      },
      action: [],
    };
  }
}

/**
 * Updates the conversation history by appending a new message from the model.
 *
 * @param {ChatMessage[]} conversation - The current conversation history.
 * @param {string} agentJSON - The JSON string representing the agent's response.
 * @returns {Promise<void>} A promise that resolves when the conversation history is updated in local storage.
 */
async function updateConversationHistory(
  conversation: ChatMessage[],
  agentJSON: string
) {
  const newHistory: ChatMessage[] = [
    ...conversation,
    { role: "model", parts: [{ text: agentJSON }] },
  ];

  await chrome.storage.local.set({ conversationHistory: newHistory });
}

/**
 * Retrieves the conversation history from local storage.
 *
 * @returns {Promise<ChatMessage[]>} A promise that resolves to an array of `ChatMessage` objects representing the conversation history.
 */
async function getConversationHistory(): Promise<ChatMessage[]> {
  const result = await chrome.storage.local.get("conversationHistory");
  return result.conversationHistory || [];
}
