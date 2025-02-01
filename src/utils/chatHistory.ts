import { storage } from "./storage";

/** The shape of a single message in the conversation. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | object; // For text or structured data
}

/** Key used in chrome storage to track conversation messages */
const CONVERSATION_KEY = "conversationHistory";

/**
 * Saves the entire conversation array to Chrome storage.
 */
export async function saveConversationHistory(conversation: ChatMessage[]) {
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
export async function getConversationHistory(): Promise<ChatMessage[]> {
  try {
    const data = await storage.get([CONVERSATION_KEY]);
    return (data[CONVERSATION_KEY] as ChatMessage[]) || [];
  } catch (e) {
    console.error("Failed to get conversation:", e);
    return [];
  }
}
