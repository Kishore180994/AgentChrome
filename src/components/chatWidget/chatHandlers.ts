import { RefObject } from "react";
import { Message, ProcessedMessage } from "./chatInterface";

export const handleSubmit = async (
  e: React.FormEvent,
  input: string,
  isLoading: boolean,
  setInput: (value: string) => void,
  setError: (value: string | null) => void,
  setIsLoading: (value: boolean) => void,
  setShowCommandPopup: (value: boolean) => void,
  setCurrentAnimation: (value: "starfallCascade") => void,
  setCommandHistory: (value: (prev: string[]) => string[]) => void,
  setHistoryIndex: (value: number | null) => void,
  setMessages: (value: (prev: Message[]) => Message[]) => void,
  selectedModel: "gemini" | "claude",
  setToast: (
    value: { message: string; type: "success" | "info" | "error" } | null
  ) => void,
  setIsTextAreaFocussed: (value: boolean) => void
) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;
  const userMessage = input.trim();
  setInput("");
  setError(null);
  setIsLoading(true);
  setShowCommandPopup(false);
  setIsTextAreaFocussed(false);
  setCurrentAnimation("starfallCascade");
  setCommandHistory((prev) => {
    const updatedHistory = [
      userMessage,
      ...prev.filter((cmd) => cmd !== userMessage),
    ].slice(0, 50);
    chrome.storage.local.set({ commandHistory: updatedHistory });
    return updatedHistory;
  });
  setHistoryIndex(null);

  // Get the current user and token from storage
  chrome.storage.local.get(
    ["agentchrome_user", "agentchrome_token"],
    (authData) => {
      const user = authData.agentchrome_user
        ? JSON.parse(authData.agentchrome_user)
        : null;
      const token = authData.agentchrome_token;
      const isLoggedIn = user && token && !("isGuest" in user);

      console.log("[chatHandlers] handleSubmit - User authentication status:", {
        isLoggedIn,
        hasUser: !!user,
        hasToken: !!token,
        isGuest: user ? "isGuest" in user : false,
      });

      // Get the current chat from storage
      chrome.storage.local.get("currentChat", async (chatData) => {
        const currentChat = chatData.currentChat;

        // Create the message objects
        const userMsg = {
          id: Date.now().toString(),
          role: "user" as const,
          content: userMessage,
        };

        const executionMsg = {
          id: (Date.now() + 1).toString(),
          role: "execution" as const,
          content: [],
        };

        // Update the messages state
        setMessages((prev) => {
          const updatedMessages = [...prev, userMsg, executionMsg];

          // Always store in local storage (both guest and logged in)
          chrome.storage.local.set({ conversationHistory: updatedMessages });

          return updatedMessages;
        });

        // --- Backend Sync Logic ---
        if (isLoggedIn) {
          let chatIdToSend: string | null = null;

          // Case 1: Already have a server chat selected
          if (
            currentChat &&
            currentChat._id &&
            !currentChat._id.startsWith("local_")
          ) {
            chatIdToSend = currentChat._id;
            console.log(
              "[chatHandlers] handleSubmit - Using existing server chat:",
              chatIdToSend
            );
          }
          // Case 2: Logged in, but no chat or only a local chat selected -> Create new chat
          else {
            console.log(
              "[chatHandlers] handleSubmit - No server chat selected, creating a new one for the message."
            );
            try {
              const api = await import("../../services/api");
              const defaultTitle = `Chat ${new Date().toLocaleString()}`;
              const newChat = await api.default.chats.createChat({
                title: defaultTitle,
              });
              console.log(
                "[chatHandlers] handleSubmit - New chat created:",
                newChat
              );
              chrome.storage.local.set({ currentChat: newChat }); // Store new chat as current
              chatIdToSend = newChat._id;
            } catch (error) {
              console.error(
                "[chatHandlers] handleSubmit - Failed to create new chat:",
                error
              );
              setToast({
                message: "Failed to create new chat on backend.",
                type: "error",
              });
              // Continue without backend sync for this message if chat creation fails
            }
          }

          // If we have a valid chat ID (either existing or newly created), send the message
          if (chatIdToSend) {
            console.log(
              "[chatHandlers] handleSubmit - Sending message to backend for chat:",
              chatIdToSend
            );
            try {
              const api = await import("../../services/api");
              const messageStats = {
                messageLength: userMessage.length,
                tokenLength: Math.ceil(userMessage.length / 4), // Rough estimate
              };
              const messageResponse = await api.default.chats.addMessage(
                chatIdToSend,
                { sender: "user", content: userMessage, stats: messageStats }
              );
              console.log(
                "[chatHandlers] handleSubmit - Message sent to backend:",
                messageResponse
              );
            } catch (error) {
              console.error(
                "[chatHandlers] handleSubmit - Failed to send message to backend:",
                error
              );
              // Don't necessarily show toast here, local storage succeeded.
            }
          }
        } else {
          console.log(
            "[chatHandlers] handleSubmit - User not logged in, skipping backend sync."
          );
        }
      });
    }
  );

  try {
    chrome.runtime.sendMessage(
      { type: "PROCESS_COMMAND", command: userMessage, model: selectedModel },
      (response) => {
        if (chrome.runtime.lastError)
          console.error("Error from background:", chrome.runtime.lastError);
        else console.log("Response from background:", response);
      }
    );
  } catch (err) {
    console.error("Failed to send message:", err);
    setError("Failed to send message.");
    setToast({ message: "Failed to send message", type: "error" });
    setIsLoading(false);
  }
};

export const handleStop =
  (
    setIsLoading: (value: boolean) => void,
    setMessages: (value: (prev: Message[]) => Message[]) => void,
    setError: (value: string | null) => void,
    setToast: (
      value: { message: string; type: "success" | "info" | "error" } | null
    ) => void
  ) =>
  () => {
    try {
      chrome.runtime.sendMessage({ type: "STOP_AUTOMATION" }, (response) => {
        if (chrome.runtime.lastError)
          console.warn(
            "Non-critical error stopping automation:",
            chrome.runtime.lastError
          );
        else {
          console.log("Automation stopped:", response);
          setIsLoading(false);

          // Get the current user and token from storage
          chrome.storage.local.get(
            ["agentchrome_user", "agentchrome_token"],
            (authData) => {
              const user = authData.agentchrome_user
                ? JSON.parse(authData.agentchrome_user)
                : null;
              const token = authData.agentchrome_token;
              const isLoggedIn = user && token && !("isGuest" in user);

              console.log(
                "[chatHandlers] handleStop - User authentication status:",
                {
                  isLoggedIn,
                  hasUser: !!user,
                  hasToken: !!token,
                  isGuest: user ? "isGuest" in user : false,
                }
              );

              // Get the current chat from storage
              chrome.storage.local.get("currentChat", async (chatData) => {
                const currentChat = chatData.currentChat;

                // Create the model message
                const modelMsg = {
                  id: Date.now().toString(),
                  role: "model" as const,
                  content: "Automation stopped by user.",
                };

                // Update the messages state
                setMessages((prev) => {
                  const updatedMessages = [...prev, modelMsg];

                  // Always store in local storage (both guest and logged in)
                  chrome.storage.local.set({
                    conversationHistory: updatedMessages,
                  });

                  return updatedMessages;
                });

                // If logged in and we have a current server chat, send the message to the backend
                if (
                  isLoggedIn &&
                  currentChat &&
                  currentChat._id &&
                  !currentChat._id.startsWith("local_")
                ) {
                  console.log(
                    "[chatHandlers] handleStop - Sending stop message to backend for chat:",
                    currentChat._id
                  );
                  try {
                    const api = await import("../../services/api");
                    const messageStats = {
                      messageLength: modelMsg.content.length,
                      tokenLength: Math.ceil(modelMsg.content.length / 4), // Rough estimate
                    };
                    const messageResponse = await api.default.chats.addMessage(
                      currentChat._id,
                      {
                        sender: "ai",
                        content: modelMsg.content,
                        stats: messageStats,
                      } // Use 'ai' as sender for model messages
                    );
                    console.log(
                      "[chatHandlers] handleStop - Stop message sent to backend:",
                      messageResponse
                    );
                  } catch (error) {
                    console.error(
                      "[chatHandlers] handleStop - Failed to send stop message to backend:",
                      error
                    );
                  }
                } else {
                  console.log(
                    "[chatHandlers] handleStop - User not logged in or no server chat, skipping backend sync."
                  );
                }
              });
            }
          );
        }
      });
    } catch (err) {
      console.error("Failed to send stop message:", err);
      setError("Failed to stop automation.");
      setToast({ message: "Failed to stop automation", type: "error" });
      setIsLoading(false);
    }
  };

export const handleNewChat =
  (
    setMessages: (value: Message[]) => void,
    setProcessedMessages: (value: ProcessedMessage[]) => void,
    setError: (value: string | null) => void,
    setIsLoading: (value: boolean) => void,
    setToast: (
      value: { message: string; type: "success" | "info" | "error" } | null
    ) => void
  ) =>
  () => {
    try {
      // Get the current user and token from storage
      chrome.storage.local.get(
        ["agentchrome_user", "agentchrome_token"],
        (authData) => {
          const user = authData.agentchrome_user
            ? JSON.parse(authData.agentchrome_user)
            : null;
          const token = authData.agentchrome_token;
          const isLoggedIn = user && token && !("isGuest" in user);

          console.log(
            "[chatHandlers] handleNewChat - User authentication status:",
            {
              isLoggedIn,
              hasUser: !!user,
              hasToken: !!token,
              isGuest: user ? "isGuest" in user : false,
            }
          );

          // Function to handle local chat creation (used for guests or if backend fails)
          const handleLocalNewChat = () => {
            chrome.runtime.sendMessage({ type: "NEW_CHAT" }, () => {
              setMessages([]);
              setProcessedMessages([]);
              setError(null);
              setIsLoading(false);
              chrome.storage.local.remove("currentChat"); // Remove any existing current chat
              chrome.storage.local.set({ conversationHistory: [] }); // Clear history
              setToast({ message: "New local chat started", type: "success" });
            });
          };

          // If logged in, attempt to create a new chat in the backend
          if (isLoggedIn) {
            console.log(
              "[chatHandlers] handleNewChat - Creating new chat in backend"
            );
            import("../../services/api").then(async (api) => {
              try {
                const defaultTitle = `Chat ${new Date().toLocaleString()}`;
                const newChat = await api.default.chats.createChat({
                  title: defaultTitle,
                });
                console.log(
                  "[chatHandlers] handleNewChat - New chat created in backend:",
                  newChat
                );

                // Store the new chat as the current chat
                chrome.storage.local.set({ currentChat: newChat });

                // Clear UI state and local history
                setMessages([]);
                setProcessedMessages([]);
                setError(null);
                setIsLoading(false);
                chrome.storage.local.set({ conversationHistory: [] });

                // Optionally notify background script (if needed)
                // chrome.runtime.sendMessage({ type: "NEW_CHAT_CREATED", chatId: newChat._id });

                setToast({ message: "New chat created", type: "success" });
              } catch (error) {
                console.error(
                  "[chatHandlers] handleNewChat - Failed to create chat in backend:",
                  error
                );
                setToast({
                  message:
                    "Failed to create backend chat, starting local chat.",
                  type: "info",
                });
                handleLocalNewChat(); // Fallback to local chat
              }
            });
          } else {
            // Not logged in, just create a local chat
            console.log(
              "[chatHandlers] handleNewChat - User not logged in, starting local chat."
            );
            handleLocalNewChat();
          }
        }
      );
    } catch (err) {
      console.error("Failed to send NEW_CHAT message:", err);
      setError("Failed to start new chat.");
      setToast({ message: "Failed to start new chat", type: "error" });
    }
  };

export const handleKeyDown = (
  e: React.KeyboardEvent,
  commandHistory: string[],
  historyIndex: number | null,
  setUserTypedInput: (value: string) => void,
  setHistoryIndex: (value: number | null) => void,
  setInput: (value: string) => void,
  setShowCommandPopup: (value: boolean) => void,
  userTypedInput: string
) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    // handleSubmit is called via form submission
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (commandHistory.length === 0) return;
    if (historyIndex === null) {
      setUserTypedInput(userTypedInput);
      setHistoryIndex(0);
      setInput(commandHistory[0]);
      setShowCommandPopup(true);
    } else if (historyIndex < commandHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setInput(commandHistory[nextIndex]);
    }
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (historyIndex === null) return;
    const prevIndex = historyIndex - 1;
    if (prevIndex < 0) {
      setHistoryIndex(null);
      setInput(userTypedInput);
      setShowCommandPopup(false);
    } else {
      setHistoryIndex(prevIndex);
      setInput(commandHistory[prevIndex]);
    }
  }
};

export const handlePopupSelect = (
  command: string,
  setInput: (value: string) => void,
  setUserTypedInput: (value: string) => void,
  setShowCommandPopup: (value: boolean) => void,
  setHistoryIndex: (value: number | null) => void,
  textareaRef: RefObject<HTMLTextAreaElement>
) => {
  setInput(command);
  setUserTypedInput(command);
  setShowCommandPopup(false);
  setHistoryIndex(null);
  textareaRef.current?.focus();
};

export const toggleExecutionGroup = (
  index: number,
  setExpandedExecutions: (value: (prev: Set<number>) => Set<number>) => void
) => {
  setExpandedExecutions((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    return newSet;
  });
};

export const handleChipClick = (
  suggestion: string,
  setInput: (value: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement>
) => {
  setInput(suggestion);
  textareaRef.current?.blur();
};

export const toggleWatching =
  (setIsWatching: (value: (prev: boolean) => boolean) => void) => () => {
    setIsWatching((prev) => !prev);
  };

export const handleFocus =
  (
    setIsTextareaFocused: (value: boolean) => void,
    setShowCommandPopup: (value: boolean) => void
  ) =>
  () => {
    console.log("[chatHandlers] handleFocus executed!"); // <-- ADD THIS LOG
    setIsTextareaFocused(true);
    console.log("[chatHandlers] setIsTextareaFocused(true) called."); // <-- ADD THIS LOG
    setShowCommandPopup(false);
  };

export const handleBlur =
  (
    setIsTextareaFocused: (value: boolean) => void,
    setShowCommandPopup: (value: boolean) => void
  ) =>
  () => {
    console.log("[chatHandlers] handleBlur executed! Setting timeout..."); // <-- ADD THIS LOG
    setTimeout(() => {
      console.log(
        "[chatHandlers] handleBlur timeout finished. Setting states to false."
      ); // <-- ADD THIS LOG
      setIsTextareaFocused(false);
      setShowCommandPopup(false);
    }, 200);
  };
