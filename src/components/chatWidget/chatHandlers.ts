import {
  saveConversationHistory,
  D4M_CONVERSATION_HISTORY_KEY,
  HUBSPOT_CONVERSATION_HISTORY_KEY,
  clearLocalStorageItem,
} from "../../services/storage.ts";

import { Message, ProcessedMessage } from "./chatInterface";
import { HubSpotExecutionResult } from "../../services/ai/interfaces";

const storage = chrome.storage;
// Handles submitting the prompt/command from the input area
export const handleSubmit = async (
  prompt: string,
  command: string | null,
  isLoading: boolean,
  setInput: (value: string) => void,
  setSelectedCommand: (value: string | null) => void,
  setError: (value: string | null) => void,
  setIsLoading: (value: boolean) => void,
  setShowCommandPopup: (value: boolean) => void,
  setCommandHistory: (value: (prev: string[]) => string[]) => void,
  setHistoryIndex: (value: number | null) => void,
  setMessages: (value: (prev: Message[]) => Message[]) => void,
  setToast: (
    value: { message: string; type: "success" | "info" | "error" } | null
  ) => void,
  setIsInputAreaFocused: (value: boolean) => void,
  selectedModel: "gemini" | "claude",
  hubspotMode: boolean
) => {
  const userMessage = (command ? `/${command} ${prompt}` : prompt).trim();
  if (!userMessage || isLoading) return;
  const messageToSend = prompt;

  if (typeof messageToSend !== "string" || messageToSend.trim() === "") {
    console.error(
      "[Handlers] Attempted to send PROCESS_COMMAND with invalid prompt:",
      messageToSend
    );
    setError("Cannot process an empty command.");
    setIsLoading(false);
    return;
  }

  console.log("[Handlers] handleSubmit:", { command, prompt, userMessage });

  setInput("");
  setSelectedCommand(null);
  setError(null);
  setIsLoading(true);
  setShowCommandPopup(false);
  setIsInputAreaFocused(false);
  setCommandHistory((prev) => {
    // Avoid duplicates and limit size
    const updatedHistory = [
      userMessage,
      ...prev.filter((cmd) => cmd !== userMessage),
    ].slice(0, 50);
    storage.local.set({ commandHistory: updatedHistory });
    return updatedHistory;
  });
  setHistoryIndex(null);

  const userMsg: Message = {
    id: Date.now().toString(),
    role: "user" as const,
    content: userMessage,
  };
  setMessages((prev) => {
    const updatedMessages = [...prev, userMsg];
    const key = hubspotMode
      ? HUBSPOT_CONVERSATION_HISTORY_KEY
      : D4M_CONVERSATION_HISTORY_KEY;
    saveConversationHistory(key, updatedMessages); // Use new storage API
    return updatedMessages;
  });

  // --- Sync Message to Backend (if logged in) ---
  try {
    const storageData = await storage.local.get([
      "agentchrome_user",
      "agentchrome_token",
      "currentChat",
    ]);
    const user = storageData.agentchrome_user
      ? JSON.parse(storageData.agentchrome_user)
      : null;
    const token = storageData.agentchrome_token;
    const currentChat = storageData.currentChat;
    const isLoggedIn = !!(user && token && !user.isGuest);

    if (isLoggedIn) {
      let chatIdToSend: string | null = null;
      // Use existing server chat ID if available
      if (currentChat?._id && !currentChat._id.startsWith("local_")) {
        chatIdToSend = currentChat._id;
      } else {
        // Otherwise, create a new chat on the backend
        console.log("[Handlers] No server chat selected, creating new one.");
        try {
          const api = await import("../../services/api"); // Adjust path
          const newChat = await api.default.chats.createChat({
            title: `Chat ${new Date().toLocaleString()}`,
          });
          await storage.local.set({ currentChat: newChat }); // Store new chat reference
          chatIdToSend = newChat._id;
          console.log("[Handlers] New backend chat created:", newChat);
        } catch (error) {
          console.error("[Handlers] Failed to create new backend chat:", error);
          setToast({
            message: "Failed to create backend chat.",
            type: "error",
          });
        }
      }

      // If we have a chat ID, send the message to the backend
      if (chatIdToSend) {
        console.log(
          "[Handlers] Sending message to backend chat:",
          chatIdToSend
        );
        try {
          const api = await import("../../services/api");
          // Send the full user message for backend history context
          const messageStats = {
            messageLength: userMessage.length,
            tokenLength: Math.ceil(userMessage.length / 4),
          };
          await api.default.chats.addMessage(chatIdToSend, {
            sender: "user",
            content: userMessage,
            stats: messageStats,
          });
          console.log("[Handlers] Message sent to backend.");
        } catch (error) {
          console.error("[Handlers] Failed to send message to backend:", error);
        }
      }
    } else {
      console.log("[Handlers] User not logged in, skipping backend sync.");
    }
  } catch (storageError) {
    console.error(
      "[Handlers] Error accessing storage for backend sync:",
      storageError
    );
  }

  // --- Send Command/Prompt to Background Script for Processing ---
  try {
    console.log("[Handlers] Sending PROCESS_COMMAND to background:", {
      command,
      prompt: messageToSend,
      model: selectedModel,
      mode: hubspotMode ? "hubspot" : "d4m",
    });
    chrome.runtime.sendMessage(
      {
        type: "PROCESS_COMMAND",
        slashCommand: command,
        prompt: messageToSend,
        fullInput: userMessage,
        model: selectedModel,
        mode: hubspotMode ? "hubspot" : "d4m",
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "[Handlers] Error receiving immediate response from background:",
            chrome.runtime.lastError.message
          );
          setError(
            `Background script error: ${chrome.runtime.lastError.message?.substring(
              0,
              100
            )}`
          );
        } else {
          console.log(
            "[Handlers] Initial response from background PROCESS_COMMAND:",
            response
          );
          // Check if the *immediate* response indicates a failure (e.g., validation)
          if (response && response.success === false && response.error) {
            setIsLoading(false);
            const errorMsg: Message = {
              id: Date.now().toString() + "-error",
              role: "model",
              type: "hubspot_error",
              content: response as HubSpotExecutionResult,
            };
            setMessages((prev) => {
              const updated = [...prev, errorMsg];
              storage.local.set({ conversationHistory: updated });
              return updated;
            });
          }
        }
      }
    );
  } catch (err: any) {
    console.error("[Handlers] Failed to send message to background:", err);
    setError(`Failed to send command: ${err.message || err}`);
    setToast({ message: "Failed to send command", type: "error" });
    setIsLoading(false);
  }
};

// Handles clicking the stop button during loading
export const handleStop =
  (
    // State Setters from ChatWidget:
    setIsLoading: (value: boolean) => void,
    setMessages: (value: (prev: Message[]) => Message[]) => void,
    setError: (value: string | null) => void,
    setToast: (
      value: { message: string; type: "success" | "info" | "error" } | null
    ) => void,
    hubspotMode: boolean
  ) =>
  async () => {
    // Make async if using await inside
    console.log("[Handlers] handleStop called");
    setError(null);

    try {
      chrome.runtime.sendMessage(
        { type: "STOP_AUTOMATION" },
        async (response) => {
          // Make callback async
          if (chrome.runtime.lastError) {
            console.warn(
              "[Handlers] Non-critical error stopping automation:",
              chrome.runtime.lastError.message
            );
            setToast({
              message: "Request sent, but confirmation failed.",
              type: "info",
            });
            setIsLoading(false);
          } else {
            console.log(
              "[Handlers] Automation stop confirmed by background:",
              response
            );
            setIsLoading(false);

            // Add "Automation stopped" message to chat UI
            const modelMsg: Message = {
              id: Date.now().toString(),
              role: "model",
              content: "Automation stopped by user.",
            };
            setMessages((prev) => {
              const updated = [...prev, modelMsg];
              const key = hubspotMode
                ? HUBSPOT_CONVERSATION_HISTORY_KEY
                : D4M_CONVERSATION_HISTORY_KEY;
              saveConversationHistory(key, updated);
              return updated;
            });

            // --- Sync Stop Message to Backend (if logged in) ---
            try {
              const storageData = await storage.local.get([
                "agentchrome_user",
                "agentchrome_token",
                "currentChat",
              ]);
              const user = storageData.agentchrome_user
                ? JSON.parse(storageData.agentchrome_user)
                : null;
              const token = storageData.agentchrome_token;
              const currentChat = storageData.currentChat;
              const isLoggedIn = !!(user && token && !user.isGuest);

              if (
                isLoggedIn &&
                currentChat?._id &&
                !currentChat._id.startsWith("local_")
              ) {
                console.log(
                  "[Handlers] Sending stop message to backend chat:",
                  currentChat._id
                );
                try {
                  const api = await import("../../services/api");
                  const messageStats = {
                    messageLength: modelMsg.content.length,
                    tokenLength: Math.ceil(modelMsg.content.length / 4),
                  };
                  await api.default.chats.addMessage(currentChat._id, {
                    sender: "ai",
                    content: Array.isArray(modelMsg.content)
                      ? JSON.stringify(modelMsg.content)
                      : modelMsg.content,
                    stats: messageStats,
                  }); // Use 'ai' sender
                  console.log("[Handlers] Stop message sent to backend.");
                } catch (error) {
                  console.error(
                    "[Handlers] Failed to send stop message to backend:",
                    error
                  );
                }
              } else {
                console.log(
                  "[Handlers] Stop: User not logged in or no server chat, skipping backend sync."
                );
              }
            } catch (storageError) {
              console.error(
                "[Handlers] Stop: Error accessing storage for backend sync:",
                storageError
              );
            }
          }
        }
      );
    } catch (err: any) {
      console.error("[Handlers] Failed to send STOP_AUTOMATION message:", err);
      setError(`Failed to stop automation: ${err.message || err}`);
      setToast({ message: "Failed to stop automation", type: "error" });
      setIsLoading(false);
    }
  };

// Handles clicking the new chat button
export const handleNewChat =
  (
    // State Setters from ChatWidget:
    setMessages: (value: Message[]) => void,
    setProcessedMessages: (value: ProcessedMessage[]) => void,
    setError: (value: string | null) => void,
    setIsLoading: (value: boolean) => void,
    setToast: (
      value: { message: string; type: "success" | "info" | "error" } | null
    ) => void
  ) =>
  () => {
    console.log("[Handlers] handleNewChat called");
    try {
      // --- Clear UI State Immediately ---
      setMessages([]);
      setProcessedMessages([]);
      setError(null);
      setIsLoading(false);

      saveConversationHistory(D4M_CONVERSATION_HISTORY_KEY, []);
      saveConversationHistory(HUBSPOT_CONVERSATION_HISTORY_KEY, []);
      clearLocalStorageItem("aiCurrentState"); // Clear aiCurrentState
      storage.local.remove(["currentChat", "conversationHistory"]);
      // --- Handle Backend Chat Creation (if logged in) ---
      storage.local
        .get(["agentchrome_user", "agentchrome_token"])
        .then((authData) => {
          const user = authData.agentchrome_user
            ? JSON.parse(authData.agentchrome_user)
            : null;
          const token = authData.agentchrome_token;
          const isLoggedIn = !!(user && token && !user.isGuest);

          if (isLoggedIn) {
            console.log(
              "[Handlers] New Chat: Attempting to create backend chat."
            );
            // Don't wait for backend creation to show toast, provide immediate feedback
            setToast({ message: "New chat started", type: "success" });
            // Attempt to create in background without blocking UI
            import("../../services/api")
              .then(async (api) => {
                // Adjust path
                try {
                  const newChat = await api.default.chats.createChat({
                    title: `Chat ${new Date().toLocaleString()}`,
                  });
                  await storage.local.set({ currentChat: newChat });
                  console.log(
                    "[Handlers] New Chat: Backend chat created and set as current:",
                    newChat
                  );
                } catch (error) {
                  console.error(
                    "[Handlers] New Chat: Failed to create backend chat:",
                    error
                  );
                  setToast({
                    message: "New chat started (failed to sync to cloud)",
                    type: "info",
                  });
                }
              })
              .catch((err) =>
                console.error("Failed to load API for new chat", err)
              ); // Handle API import error
          } else {
            // Not logged in, just confirm local chat started
            console.log(
              "[Handlers] New Chat: User not logged in, local chat started."
            );
            setToast({ message: "New local chat started", type: "success" });
          }
        })
        .catch((storageError) => {
          console.error(
            "[Handlers] New Chat: Error accessing storage for auth check:",
            storageError
          );
          setToast({
            message: "New local chat started (storage error)",
            type: "info",
          });
        });
    } catch (err: any) {
      console.error("[Handlers] Failed during new chat process:", err);
      setError(`Failed to start new chat: ${err.message || err}`);
      setToast({ message: "Failed to start new chat", type: "error" });
    }
  };

// Handles selecting an item from the command history popup
export const handlePopupSelect = (
  commandText: string,
  setInput: (value: string) => void,
  setSelectedCommand: (value: string | null) => void,
  setShowCommandPopup: (value: boolean) => void,
  setHistoryIndex: (value: number | null) => void
) => {
  console.log("[Handlers] handlePopupSelect called with:", commandText);
  setInput(commandText);
  setSelectedCommand(null);
  setShowCommandPopup(false);
  setHistoryIndex(null);
};

// Handles clicking a suggestion chip below the input area
export const handleChipClick = (
  suggestion: string, // The suggestion text
  // State Setters from ChatWidget:
  setInput: (value: string) => void,
  setSelectedCommand: (value: string | null) => void
) => {
  setInput(suggestion);
  setSelectedCommand(null);
};

// Handles the input area gaining focus
export const handleFocus =
  (
    setIsInputAreaFocused: (value: boolean) => void,
    setShowCommandPopup: (value: boolean) => void
  ) =>
  () => {
    console.log("[Handlers] handleFocus triggered");
    setIsInputAreaFocused(true);
  };

// Handles the input area losing focus
export const handleBlur =
  (
    setIsInputAreaFocused: (value: boolean) => void,
    setShowCommandPopup: (value: boolean) => void
  ) =>
  () => {
    console.log("[Handlers] handleBlur triggered, scheduling hide");
    setTimeout(() => {
      console.log("[Handlers] handleBlur timeout executing");
      setIsInputAreaFocused(false);
      setShowCommandPopup(false);
    }, 150);
  };
