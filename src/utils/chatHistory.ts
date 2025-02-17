import { GeminiChatMessage } from "../services/ai/interfaces";
import { storage } from "./storage";

/** Key used in chrome storage to track conversation messages */
const CONVERSATION_KEY = "conversationHistory";

/**
 * Saves the entire conversation array to Chrome storage.
 */
export async function saveConversationHistory(
  conversation: GeminiChatMessage[]
) {
  try {
    await storage.set({ [CONVERSATION_KEY]: conversation });
    console.log("Successfully saved conversation.");
  } catch (e) {
    console.error("Failed to save conversation:", e);
  }
}

/**
 * Clears the entire conversation from storage if needed.
 */
export async function getConversationHistory(): Promise<GeminiChatMessage[]> {
  try {
    const data = await storage.get([CONVERSATION_KEY]);
    return (data[CONVERSATION_KEY] as GeminiChatMessage[]) || [];
  } catch (e) {
    console.error("Failed to get conversation:", e);
    return [];
  }
}
