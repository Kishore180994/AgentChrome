import { Message } from "../components/chatWidget/chatInterface";
import {
  saveConversationHistory,
  D4M_CONVERSATION_HISTORY_KEY,
  HUBSPOT_CONVERSATION_HISTORY_KEY,
} from "../services/storage";

export async function updateAndSaveMessages(
  prevMessages: Message[],
  newMessage: Message,
  hubspotMode: boolean
): Promise<Message[]> {
  const updated = [...prevMessages, newMessage];
  await saveConversationHistory(
    hubspotMode
      ? HUBSPOT_CONVERSATION_HISTORY_KEY
      : D4M_CONVERSATION_HISTORY_KEY,
    updated
  );
  return updated;
}
