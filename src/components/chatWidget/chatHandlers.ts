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
  setIsTextareaFocused: (value: boolean) => void,
  setCurrentAnimation: (value: "starfallCascade") => void,
  setCommandHistory: (value: (prev: string[]) => string[]) => void,
  setHistoryIndex: (value: number | null) => void,
  setMessages: (value: (prev: Message[]) => Message[]) => void,
  selectedModel: "gemini" | "claude",
  setToast: (
    value: { message: string; type: "success" | "info" | "error" } | null
  ) => void
) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;
  const userMessage = input.trim();
  setInput("");
  setError(null);
  setIsLoading(true);
  setShowCommandPopup(false);
  // setIsTextareaFocused(false);
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
  setMessages((prev) => {
    const updatedMessages = [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user" as const,
        content: userMessage,
      },
      {
        id: (Date.now() + 1).toString(),
        role: "execution" as const,
        content: [],
      },
    ];
    chrome.storage.local.set({ conversationHistory: updatedMessages });
    return updatedMessages;
  });
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
          setMessages((prev) => {
            const updatedMessages = [
              ...prev,
              {
                id: Date.now().toString(),
                role: "model" as const,
                content: "Automation stopped by user.",
              },
            ];
            chrome.storage.local.set({ conversationHistory: updatedMessages });
            return updatedMessages;
          });
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
      chrome.runtime.sendMessage({ type: "NEW_CHAT" }, () => {
        setMessages([]);
        setProcessedMessages([]);
        setError(null);
        setIsLoading(false);
        chrome.storage.local.set({ conversationHistory: [] });
        setToast({ message: "New chat started", type: "success" });
      });
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
  setIsTextareaFocused: (value: boolean) => void,
  textareaRef: RefObject<HTMLTextAreaElement>
) => {
  setInput(suggestion);
  // setIsTextareaFocused(false);
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
