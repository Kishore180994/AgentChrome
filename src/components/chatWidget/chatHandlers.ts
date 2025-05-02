// src/components/chatHandlers.ts
import { Message, ProcessedMessage } from "./chatInterface"; // Ensure path is correct
import { HubSpotExecutionResult } from "../../services/ai/interfaces"; // Ensure path is correct and type exists

const storage = chrome.storage; // Use Chrome storage API
// --- MODIFIED handleSubmit ---
// Handles submitting the prompt/command from the input area
export const handleSubmit = async (
  prompt: string, // Text part of the input
  command: string | null, // Selected slash command (e.g., 'contact') or null
  isLoading: boolean,
  // State Setters from ChatWidget:
  setInput: (value: string) => void,
  setSelectedCommand: (value: string | null) => void, // Setter for command state
  setError: (value: string | null) => void,
  setIsLoading: (value: boolean) => void,
  setShowCommandPopup: (value: boolean) => void, // History popup visibility
  setCommandHistory: (value: (prev: string[]) => string[]) => void,
  setHistoryIndex: (value: number | null) => void,
  setMessages: (value: (prev: Message[]) => Message[]) => void,
  setToast: (
    value: { message: string; type: "success" | "info" | "error" } | null
  ) => void,
  setIsInputAreaFocused: (value: boolean) => void, // Use corrected name
  // Config/Context from ChatWidget:
  selectedModel: "gemini" | "claude",
  hubspotMode: boolean
  // Optional animation setter
  // setCurrentAnimation?: (value: "starfallCascade") => void,
) => {
  // Combine command and prompt for history and user message display
  const userMessage = (command ? `/${command} ${prompt}` : prompt).trim();

  // Prevent submission if already loading or message is empty
  if (!userMessage || isLoading) return;

  const messageToSend = prompt; // Use only the text part for AI processing

  console.log("[Handlers] handleSubmit:", { command, prompt, userMessage });

  // --- Update UI State Immediately ---
  setInput(""); // Clear text input state
  setSelectedCommand(null); // Clear command chip state
  setError(null); // Clear any previous error
  setIsLoading(true); // Set loading indicator
  setShowCommandPopup(false); // Hide history popup
  setIsInputAreaFocused(false); // Defocus input visually (optional)
  // setCurrentAnimation?.("starfallCascade"); // Start animation if setter provided

  // --- Update Command History ---
  setCommandHistory((prev) => {
    // Avoid duplicates and limit size
    const updatedHistory = [
      userMessage,
      ...prev.filter((cmd) => cmd !== userMessage),
    ].slice(0, 50);
    storage.local.set({ commandHistory: updatedHistory }); // Persist history
    return updatedHistory;
  });
  setHistoryIndex(null); // Reset history navigation index

  // --- Add User Message to Chat UI ---
  const userMsg: Message = {
    id: Date.now().toString(),
    role: "user" as const,
    content: userMessage, // Display the full command + prompt in the UI
  };
  setMessages((prev) => {
    const updatedMessages = [...prev, userMsg];
    // Save updated history to local storage immediately
    chrome.storage.local.set({ conversationHistory: updatedMessages });
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
    const isLoggedIn = !!(user && token && !user.isGuest); // Check isGuest property

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
          // Continue locally even if backend chat creation fails
        }
      }

      // If we have a chat ID, send the message to the backend
      if (chatIdToSend) {
        console.log(
          "[Handlers] Sending message to backend chat:",
          chatIdToSend
        );
        try {
          const api = await import("../../services/api"); // Adjust path
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
          // Optional: Toast notification for backend sync failure?
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
        command: command, // The selected slash command (e.g., 'contact') or null
        prompt: messageToSend, // The text part typed by the user
        fullInput: userMessage, // The combined original input for context
        model: selectedModel,
        mode: hubspotMode ? "hubspot" : "d4m", // Provide mode context
      },
      (response) => {
        // This callback handles the *initial* response from sendMessage.
        // Often, the background script starts processing and sends results later
        // via separate messages (like MEMORY_UPDATE, COMMAND_RESPONSE).
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
          setToast({
            message: "Error starting command processing.",
            type: "error",
          });
          setIsLoading(false); // Stop loading on immediate error
        } else {
          console.log(
            "[Handlers] Initial response from background PROCESS_COMMAND:",
            response
          );
          // Check if the *immediate* response indicates a failure (e.g., validation)
          if (response && response.success === false && response.error) {
            setIsLoading(false); // Stop loading
            // Add error message to UI. The ChatWidget listener might also add it, so check needed there.
            const errorMsg: Message = {
              id: Date.now().toString() + "-error",
              role: "model",
              type: "hubspot_error", // Assume error is HubSpot-related if structured like this
              content: response as HubSpotExecutionResult, // Store the whole response object
            };
            setMessages((prev) => {
              const updated = [...prev, errorMsg];
              storage.local.set({ conversationHistory: updated });
              return updated;
            });
            setToast({ message: `Error: ${response.error}`, type: "error" });
          }
          // Otherwise, assume processing started successfully in the background.
          // The loading state remains true, waiting for further updates.
        }
      }
    );
  } catch (err: any) {
    console.error("[Handlers] Failed to send message to background:", err);
    setError(`Failed to send command: ${err.message || err}`);
    setToast({ message: "Failed to send command", type: "error" });
    setIsLoading(false); // Stop loading if send message itself fails
  }
};

// --- handleStop ---
// Handles clicking the stop button during loading
export const handleStop =
  (
    // State Setters from ChatWidget:
    setIsLoading: (value: boolean) => void,
    setMessages: (value: (prev: Message[]) => Message[]) => void,
    setError: (value: string | null) => void,
    setToast: (
      value: { message: string; type: "success" | "info" | "error" } | null
    ) => void
  ) =>
  async () => {
    // Make async if using await inside
    console.log("[Handlers] handleStop called");
    setError(null); // Clear previous errors

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
            // Still update UI even if background script communication fails? Maybe.
            setToast({
              message: "Request sent, but confirmation failed.",
              type: "info",
            });
            setIsLoading(false); // Attempt to stop loading anyway
          } else {
            console.log(
              "[Handlers] Automation stop confirmed by background:",
              response
            );
            setIsLoading(false); // Stop loading indicator

            // Add "Automation stopped" message to chat UI
            const modelMsg: Message = {
              id: Date.now().toString(),
              role: "model",
              content: "Automation stopped by user.",
            };
            setMessages((prev) => {
              const updated = [...prev, modelMsg];
              storage.local.set({ conversationHistory: updated }); // Save history
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
                  const api = await import("../../services/api"); // Adjust path
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
      setIsLoading(false); // Ensure loading stops
    }
  };

// --- handleNewChat ---
// Handles clicking the new chat button
export const handleNewChat =
  (
    // State Setters from ChatWidget:
    setMessages: (value: Message[]) => void,
    setProcessedMessages: (value: ProcessedMessage[]) => void, // Setter for processed messages state
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
      setProcessedMessages([]); // Clear processed messages if used
      setError(null);
      setIsLoading(false); // Ensure loading is stopped

      // --- Clear Local Storage ---
      storage.local.remove(["currentChat", "conversationHistory"]); // Clear current chat marker and history

      // --- Inform Background Script (Optional) ---
      // If the background script maintains state related to the current chat, notify it.
      // chrome.runtime.sendMessage({ type: "NEW_CHAT_SESSION_STARTED" });

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
                  await storage.local.set({ currentChat: newChat }); // Set the new backend chat as current
                  console.log(
                    "[Handlers] New Chat: Backend chat created and set as current:",
                    newChat
                  );
                } catch (error) {
                  console.error(
                    "[Handlers] New Chat: Failed to create backend chat:",
                    error
                  );
                  // Inform user that backend chat failed, but local chat is active
                  setToast({
                    message: "New chat started (failed to sync to cloud)",
                    type: "info",
                  });
                  // No need to call handleLocalNewChat as UI/storage are already cleared
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

// --- handlePopupSelect ---
// Handles selecting an item from the command history popup
export const handlePopupSelect = (
  commandText: string, // Full text from history item
  // State Setters from ChatWidget:
  setInput: (value: string) => void,
  setSelectedCommand: (value: string | null) => void, // Added: Need to clear chip state
  setShowCommandPopup: (value: boolean) => void,
  setHistoryIndex: (value: number | null) => void
  // REMOVED: textareaRef - Focus handled elsewhere
) => {
  console.log("[Handlers] handlePopupSelect called with:", commandText);
  setInput(commandText); // Set input text to the selected history item
  setSelectedCommand(null); // Clear any active command chip
  setShowCommandPopup(false); // Hide the history popup
  setHistoryIndex(null); // Reset history navigation index
  // Focus should ideally return to the input area after selection.
  // This might happen naturally or require explicit focus() call in CommandInputArea/ChatWidget.
};

// --- toggleExecutionGroup --- (No changes needed from previous version)
// Toggles the visibility of execution step details
export const toggleExecutionGroup = (
  index: number,
  setExpandedExecutions: (value: (prev: Set<number>) => Set<number>) => void
) => {
  setExpandedExecutions((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    return newSet;
  });
};

// --- handleChipClick ---
// Handles clicking a suggestion chip below the input area
export const handleChipClick = (
  suggestion: string, // The suggestion text
  // State Setters from ChatWidget:
  setInput: (value: string) => void,
  setSelectedCommand: (value: string | null) => void // Added: Need to clear chip state
  // REMOVED: textareaRef - Focus handled elsewhere
) => {
  console.log("[Handlers] handleChipClick called with:", suggestion);
  setInput(suggestion); // Set input text to the suggestion
  setSelectedCommand(null); // Clear any active command chip
  // Focus should ideally move to the input area after clicking a chip.
  // This might happen naturally or require explicit focus() call in CommandInputArea/ChatWidget.
};

// --- toggleWatching --- (Keep if this state exists and is used)
// export const toggleWatching = (setIsWatching: (value: (prev: boolean) => boolean) => void) => () => {
//     setIsWatching((prev) => !prev);
// };

// --- handleFocus ---
// Handles the input area gaining focus
export const handleFocus =
  (
    // State Setters from ChatWidget:
    setIsInputAreaFocused: (value: boolean) => void, // Use corrected name
    setShowCommandPopup: (value: boolean) => void // History popup visibility setter
  ) =>
  () => {
    console.log("[Handlers] handleFocus triggered");
    setIsInputAreaFocused(true); // Set focused state for potential overlays/styling
    // Optionally show history popup on focus? Or only on key press?
    // setShowCommandPopup(true); // Decide if history should show immediately on focus
  };

// --- handleBlur ---
// Handles the input area losing focus
export const handleBlur =
  (
    // State Setters from ChatWidget:
    setIsInputAreaFocused: (value: boolean) => void, // Use corrected name
    setShowCommandPopup: (value: boolean) => void // History popup visibility setter
  ) =>
  () => {
    console.log("[Handlers] handleBlur triggered, scheduling hide");
    // Delay hiding popups to allow clicks within them (e.g., history item, slash command item)
    // If focus moves to an element *within* a popup, the popup shouldn't hide.
    // This requires more complex logic involving relatedTarget, often handled within the component's blur handler.
    // This basic version hides popups after a short delay.
    setTimeout(() => {
      console.log("[Handlers] handleBlur timeout executing");
      setIsInputAreaFocused(false); // Hide focus state indicator/overlay
      setShowCommandPopup(false); // Hide history popup
      // Note: Hiding the slash command popup should be handled within CommandInputArea's blur logic
    }, 150); // 150ms delay - adjust as needed
  };
