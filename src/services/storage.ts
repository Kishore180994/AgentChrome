export const D4M_CONVERSATION_HISTORY_KEY = "d4mConversationhistory";
export const HUBSPOT_CONVERSATION_HISTORY_KEY = "hubspotConversationHistory";

export const saveConversationHistory = async (key: string, history: any[]) => {
  try {
    await chrome.storage.local.set({ [key]: history });
  } catch (error) {
    console.error(`Error saving conversation history for key ${key}:`, error);
  }
};

export const loadConversationHistory = async (key: string): Promise<any[]> => {
  try {
    const data = await chrome.storage.local.get([key]);
    return data[key] ? data[key] : [];
  } catch (error) {
    console.error(`Error loading conversation history for key ${key}:`, error);
    return [];
  }
};

export const clearLocalStorageItem = async (key: string) => {
  try {
    await chrome.storage.local.remove(key);
  } catch (error) {
    console.error(`Error clearing local storage item for key ${key}:`, error);
  }
};
