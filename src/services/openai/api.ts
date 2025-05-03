/// <reference types="@types/chrome" />
import {
  ClaudeChatMessage,
  ClaudeChatContent,
  ConversationHistory,
  GeminiChatMessage,
  GeminiResponse,
} from "../ai/interfaces";
import { AIProvider, callAI } from "../ai/providers";

const MAX_RETRIES = 3;
let currentProvider: AIProvider = "gemini"; // Default provider, can be overridden

/**
 * Communicates with the AI to process a user message and returns the raw GeminiResponse.
 *
 * @param userMessage - The message from the user to be sent to the AI.
 * @param sessionId - The unique identifier for the current session.
 * @param currentState - The current state of the conversation.
 * @param screenShotDataUrl - An optional data URL of a screenshot to be sent to the AI.
 * @param provider - The AI provider to use (defaults to currentProvider).
 * @returns A promise that resolves to a `GeminiResponse` containing the AI's response.
 */
export async function chatWithAI(
  userMessage: string,
  sessionId: string,
  currentState: Record<string, any> = {},
  isHubspotMode: boolean = false,
  selectedTool: string = "",
  screenShotDataUrl?: string,
  provider: AIProvider = currentProvider
): Promise<GeminiResponse | null> {
  try {
    console.debug("[chatWithAI] userMessage", userMessage);
    // Capture screenshot if none provided and provider supports vision
    let finalScreenShotDataUrl = screenShotDataUrl;

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
      isHubspotMode,
      selectedTool,
      finalScreenShotDataUrl
    );
    console.log("[chatWithAI] response", response);

    if (!response) throw new Error("No response from AI");

    // Validate that reportCurrentState is present (mandatory)
    const hasReportCurrentState = response.some(
      (part) => part.functionCall.name === "dom_reportCurrentState"
    );
    if (!hasReportCurrentState) {
      throw new Error("Missing mandatory reportCurrentState function call");
    }

    // Convert conversation to ConversationHistory format for storage
    const historyConversation = convertToConversationHistory(conversation);
    await updateConversationHistory(
      historyConversation,
      JSON.stringify(response)
    );

    return response;
  } catch (err) {
    console.log("[chatWithAI] Fatal error => null", err);
    return null;
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
  console.log("[prepareConversation] existingHistory", existingHistory);

  await storeUserMessage(userMsg);

  // Get previously stored AI current state
  const storedState = await getStoredCurrentState();

  // Prepare context message - combine user message with appropriate context
  let userMsgWithState: string;

  // If we have stored state, include it in the message
  if (storedState) {
    console.log(
      "[prepareConversation] Using stored AI current state:",
      storedState
    );
    userMsgWithState = `${userMsg} && Previous AI State: ${JSON.stringify(
      storedState
    )} && Current DOM Elements on Page: ${JSON.stringify(
      currentState,
      null,
      2
    )}`;
  } else {
    // Otherwise just include the DOM elements
    userMsgWithState = `${userMsg} && Current DOM Elements on Page: ${JSON.stringify(
      currentState,
      null,
      2
    )}`;
  }

  switch (provider) {
    case "gemini":
      const geminiHistory: GeminiChatMessage[] = existingHistory.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));
      return [
        ...geminiHistory,
        { role: "user", parts: [{ text: userMsgWithState }] },
      ];

    case "claude":
      const claudeHistory: ClaudeChatMessage[] = existingHistory.map((m) => ({
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
 * Stores just the user message in conversation history without DOM elements
 */
async function storeUserMessage(userMsg: string): Promise<void> {
  const existingHistory = await getConversationHistory();
  const newHistory: ConversationHistory[] = [
    ...existingHistory,
    { role: "user", content: userMsg },
  ];
  await chrome.storage.local.set({ conversationHistory: newHistory });
}

/**
 * Sends a conversation to the AI provider with retry logic.
 */
async function sendWithRetry(
  conversation: GeminiChatMessage[] | ClaudeChatMessage[],
  sessionId: string,
  isHubspotMode: boolean = false,
  selectedTool: string = "",
  screenShotDataUrl?: string,
  retries = MAX_RETRIES
): Promise<GeminiResponse | null> {
  try {
    console.debug(`[sendWithRetry][${sessionId}] requesting AI...`);
    const resp = await callAI(
      currentProvider,
      conversation,
      isHubspotMode,
      selectedTool,
      screenShotDataUrl || ""
    );
    console.log("[sendWithRetry] AI response", resp);
    if (!resp) throw new Error("Null response from AI");
    return resp;
  } catch (err) {
    console.log(`[sendWithRetry][${sessionId}] error=`, err);
    if (retries > 0) {
      console.debug(
        `[sendWithRetry][${sessionId}] retrying attempts left=`,
        retries - 1
      );
      await new Promise((res) => setTimeout(res, 1000));
      return sendWithRetry(
        conversation,
        sessionId,
        isHubspotMode,
        selectedTool,
        screenShotDataUrl,
        retries - 1
      );
    }
    throw err;
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
 * Instead of storing raw JSON responses, store a user-friendly message and the current state.
 */
async function updateConversationHistory(
  conversation: ConversationHistory[],
  agentJSON: string
): Promise<void> {
  try {
    // Parse the agent JSON to extract function calls
    const functionCalls = JSON.parse(agentJSON);

    // Extract the current state from reportCurrentState function call
    const reportStateCall = functionCalls.find(
      (item: any) => item?.functionCall?.name === "dom_reportCurrentState"
    );

    let currentState = null;
    if (reportStateCall?.functionCall?.args?.current_state) {
      currentState = reportStateCall.functionCall.args.current_state;
      console.log(
        "[updateConversationHistory] Extracted current state:",
        currentState
      );
    }

    // Check if it contains HubSpot function calls
    const hubspotCall = functionCalls.find(
      (item: any) =>
        item?.functionCall?.name &&
        item.functionCall.name.startsWith("hubspot_")
    );

    // Extract a user-friendly message based on the function calls
    let userFriendlyMessage = "Processing your request...";

    if (hubspotCall) {
      const functionName = hubspotCall.functionCall.name;
      const args = hubspotCall.functionCall.args;

      // Create a friendly message based on the HubSpot action
      if (functionName.includes("create")) {
        const entityType = functionName.replace("hubspot_create", "");
        userFriendlyMessage = `Creating ${entityType.toLowerCase()} record...`;
      } else if (functionName.includes("get")) {
        const entityType = functionName.replace("hubspot_get", "");
        userFriendlyMessage = `Retrieving ${entityType.toLowerCase()} information...`;
      } else if (functionName.includes("update")) {
        const entityType = functionName.replace("hubspot_update", "");
        userFriendlyMessage = `Updating ${entityType.toLowerCase()} record...`;
      } else {
        // Generic message for other HubSpot operations
        userFriendlyMessage = `Executing ${functionName
          .replace("hubspot_", "")
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()}...`;
      }
    } else if (currentState?.current_goal) {
      // If no HubSpot call but we have current state with a goal, use that
      userFriendlyMessage = currentState.current_goal;
    }

    // For regular history, just store user-friendly content
    const newHistory: ConversationHistory[] = [
      ...conversation,
      {
        role: "model",
        content: userFriendlyMessage, // Store user-friendly message instead of raw JSON
      },
    ];
    await chrome.storage.local.set({ conversationHistory: newHistory });

    // Also store the current state separately if available
    if (currentState) {
      await chrome.storage.local.set({
        aiCurrentState: currentState,
      });
      console.log(
        "[updateConversationHistory] Stored AI current state separately"
      );
    }
  } catch (error) {
    // Fallback in case of parsing errors
    console.error("Error parsing agent JSON:", error);
    const newHistory: ConversationHistory[] = [
      ...conversation,
      { role: "model", content: "Processing your request..." },
    ];
    await chrome.storage.local.set({ conversationHistory: newHistory });
  }
}

/**
 * Retrieves the conversation history from local storage.
 */
async function getConversationHistory(): Promise<ConversationHistory[]> {
  const result = await chrome.storage.local.get("conversationHistory");
  return result.conversationHistory || [];
}

/**
 * Retrieves the stored AI current state from local storage.
 * This state contains the AI's understanding of the current goal, memory, etc.
 */
async function getStoredCurrentState(): Promise<any> {
  const result = await chrome.storage.local.get("aiCurrentState");
  return result.aiCurrentState || null;
}
