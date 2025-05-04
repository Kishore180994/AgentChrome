// src/components/ChatWidget.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Square } from "lucide-react";
import ComponentHeader, { commonButtons } from "../common/ComponentHeader";

import { CommandInputArea } from "./CommandInputArea";
import WelcomeScreen from "./WelcomeScreen";
import MessageRenderer from "./MessageRenderer";
import HubspotModularOptions from "./HubspotModularOptions";
import { ToastNotification } from "../ToastNotifications";
// import SettingsModal from "../SettingsModal";

import { AccentColor, hubspotTheme, themeStyles } from "../../utils/themes";
import { updateAndSaveMessages } from "../../utils/messageUtils";
import { loadHubSpotConfig } from "../../services/hubspot/api";
import { HubSpotExecutionResult } from "../../services/ai/interfaces";
import { Message, ProcessedMessage } from "./chatInterface";
import {
  handleSubmit as originalHandleSubmit,
  handleStop,
  handleNewChat,
  handleChipClick,
  handleFocus,
  handleBlur,
} from "./chatHandlers";
import { useSiriBorderWithRef } from "../../hooks/useSiriBorder";
import StarfallCascadeAnimation from "../../utils/helpers";
import { hubspotModularTools } from "../../services/ai/hubspotTool";
import { TaskProgressDisplay } from "../tasks/TaskProgressDisplay";
import { MemoryState } from "../../types/memoryTypes";

import {
  saveConversationHistory,
  loadConversationHistory,
  D4M_CONVERSATION_HISTORY_KEY,
  HUBSPOT_CONVERSATION_HISTORY_KEY,
} from "../../services/storage.ts";
import { MESSAGE_TYPE } from "./types.ts";

export function ChatWidget() {
  // State
  const [isTaskProgressExpanded, setIsTaskProgressExpanded] = useState(true); // State for task progress display
  const [messages, setMessages] = useState<Message[]>([]);
  const [processedMessages, setProcessedMessages] = useState<
    ProcessedMessage[]
  >([]);
  const [input, setInput] = useState("");
  // Wrapped setSelectedCommand to also update the tools.ts file and storage
  const [selectedCommand, setSelectedCommandRaw] = useState<string | null>(
    null
  );

  // Create a wrapper to update tools when command changes
  const setSelectedCommand = useCallback((command: string | null) => {
    // Update state with the raw setter
    setSelectedCommandRaw(command);

    // Store the command in localStorage for the providers.ts to access
    if (command) {
      chrome.storage.local.set({ selectedHubspotCommand: command });
      console.log(`[ChatWidget] Saved selected command to storage: ${command}`);
    } else {
      // If command is null, remove it from storage
      chrome.storage.local.remove("selectedHubspotCommand");
      console.log("[ChatWidget] Cleared selected command from storage");
    }
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInputAreaFocused, setIsInputAreaFocused] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"gemini" | "claude">(
    "gemini"
  );
  const [hubspotMode, setHubspotMode] = useState<boolean>(false);
  const [theme, setTheme] = useState<
    "neumorphism" | "glassmorphism" | "claymorphism"
  >("neumorphism");
  const [accentColor, setAccentColor] = useState<AccentColor>("rose");
  const [d4mAccentColor, setD4mAccentColor] = useState<AccentColor>("rose");

  // Overlay state for slash commands
  const [slashActive, setSlashActive] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");

  // HubSpot commands (should match CommandInputArea)
  const hubspotSlashCommands = [
    {
      command: "contact",
      description: "Manage Contacts (Get, Create, Update...)",
    },
    {
      command: "company",
      description: "Manage Companies (Get, Create, Update...)",
    },
    { command: "deal", description: "Manage Deals (Get, Create, Update...)" },
    { command: "ticket", description: "Manage Tickets (Get, Create...)" },
    { command: "task", description: "Manage Tasks (Get, Create...)" },
    { command: "note", description: "Add Notes to records" },
    { command: "meeting", description: "Schedule or Log Meetings" },
    { command: "call", description: "Log Calls" },
    {
      command: "search",
      description: "Advanced Search (Contacts, Companies...)",
    },
    { command: "list", description: "Get details of Contact/Company Lists" },
    { command: "workflow", description: "Trigger Workflows or Enroll records" },
    {
      command: "associate",
      description: "Associate records (e.g., Contact to Deal)",
    },
  ];
  // Callback for slash command state from CommandInputArea

  const handleSlashCommandStateChange = (
    active: boolean,
    filter: string
  ): void => {
    setSlashActive(active);
    setSlashFilter(filter);
  };
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [taskProgress, setTaskProgress] = useState<MemoryState | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [showCommandPopup, setShowCommandPopup] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);
  const [hasHubspotApiKey, setHasHubspotApiKey] = useState<boolean>(false);
  // No need for a separate state for currentTheme, we'll derive it directly
  // Just save the theme name and mode, and compute currentTheme when needed
  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const selectedCommandRef = useRef<HTMLDivElement>(null);
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  // Handlers
  const handleInputFocus = useCallback(() => {
    handleFocus(setIsInputAreaFocused, setShowCommandPopup)();
  }, [setIsInputAreaFocused, setShowCommandPopup]);

  const handleInputBlur = useCallback(() => {
    handleBlur(setIsInputAreaFocused, setShowCommandPopup)();
  }, [setIsInputAreaFocused, setShowCommandPopup]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleChipClick(suggestion, setInput, setSelectedCommand);
    },
    [setInput, setSelectedCommand]
  );

  const handleInputSubmit = useCallback(() => {
    originalHandleSubmit(
      input,
      selectedCommand,
      isLoading,
      setInput,
      setSelectedCommand,
      setError,
      setIsLoading,
      setShowCommandPopup,
      setCommandHistory,
      setHistoryIndex,
      setMessages,
      setToast,
      setIsInputAreaFocused,
      selectedModel,
      hubspotMode // Pass hubspotMode
    );
  }, [
    input,
    selectedCommand,
    isLoading,
    setInput,
    setSelectedCommand,
    setError,
    setIsLoading,
    setShowCommandPopup,
    setCommandHistory,
    setHistoryIndex,
    setMessages,
    selectedModel,
    setToast,
    setIsInputAreaFocused,
    hubspotMode,
  ]);

  const handleStopClick = useCallback(() => {
    handleStop(setIsLoading, setMessages, setError, setToast, hubspotMode)(); // Pass hubspotMode
  }, [setIsLoading, setMessages, setError, setToast, hubspotMode]);

  const handleNewChatClick = useCallback(() => {
    handleNewChat(
      setMessages,
      setProcessedMessages,
      setError,
      setIsLoading,
      setToast
    )();
  }, [setMessages, setProcessedMessages, setError, setIsLoading, setToast]);

  // --- Effects ---

  // Effect 1: Load initial state from chrome.storage on component mount
  useEffect(() => {
    const loadState = async () => {
      console.log("[ChatWidget] Loading initial state...");
      try {
        // Fetch multiple keys at once
        const data = await chrome.storage.local.get([
          "commandHistory",
          "theme",
          "accentColor",
          "d4mAccentColor",
          "mode",
          "selectedModel",
          "hubspotMode",
        ]);
        console.log("[ChatWidget] Loaded state data:", data);

        // Set basic UI state from storage
        if (Array.isArray(data.commandHistory))
          setCommandHistory(data.commandHistory);
        setTheme(data.theme || "neumorphism");
        setMode(data.mode || "light"); // Default to light mode
        setSelectedModel(
          ["gemini", "claude"].includes(data.selectedModel)
            ? data.selectedModel
            : "gemini"
        );
        setD4mAccentColor(data.d4mAccentColor || data.accentColor || "rose"); // Load D4M color, fallback to accent, then rose

        const initialHubspotMode = data.hubspotMode ?? false;
        setHubspotMode(initialHubspotMode);

        // Set the active accentColor based on the mode
        if (initialHubspotMode) {
          setAccentColor("white");
          // Load Hubspot conversation history using the new API
          const hubspotHistory = await loadConversationHistory(
            HUBSPOT_CONVERSATION_HISTORY_KEY
          );
          console.log(
            "[ChatWidget] Loaded Hubspot conversation history:",
            hubspotHistory
          );
          setMessages(formatMessages(hubspotHistory));
        } else {
          // D4M mode: use D4m accent color
          setAccentColor(data.d4mAccentColor || data.accentColor || "rose");
          // Load D4M conversation history using the new API
          const d4mHistory = await loadConversationHistory(
            D4M_CONVERSATION_HISTORY_KEY
          );
          console.log(
            "[ChatWidget] Loaded D4M conversation history:",
            d4mHistory
          );
          setMessages(formatMessages(d4mHistory));
        }

        console.log("[ChatWidget] Initial state set.");
      } catch (err) {
        console.error("[ChatWidget] Error loading initial state:", err);
        setError("Failed to load initial state.");
      }
    };
    loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  // Effect 2: Check HubSpot API Key Status
  const checkHubspotApiKey = useCallback(async () => {
    console.log("[ChatWidget] Checking HubSpot API key status...");
    try {
      const config = await loadHubSpotConfig();
      const keyExists = !!config?.apiKey;
      setHasHubspotApiKey(keyExists);
      console.log("[ChatWidget] HubSpot API key status:", keyExists);
    } catch (err) {
      console.error("[ChatWidget] Failed to check Hubspot API key:", err);
      setHasHubspotApiKey(false); // Assume no key on error
    }
  }, []); // No dependencies needed for this callback itself

  useEffect(() => {
    checkHubspotApiKey(); // Check on mount
  }, [checkHubspotApiKey]); // Re-run if the checking function itself changes (unlikely)

  // Re-check key specifically when HubSpot mode is enabled
  useEffect(() => {
    if (hubspotMode) {
      console.log("[ChatWidget] HubSpot mode enabled, re-checking API key...");
      checkHubspotApiKey();
    }
  }, [hubspotMode, checkHubspotApiKey]);

  // Effect 3: Process raw messages into grouped/structured messages for display
  const processMessages = useCallback((msgs: Message[]) => {
    console.log("[ChatWidget] Processing messages for display...");
    const processed: ProcessedMessage[] = [];
    let currentModelGroup: Message[] = [];

    msgs.forEach((message, msgIndex) => {
      if (!message) {
        // Add a check for potentially null/undefined messages
        console.warn(
          `[ChatWidget] Null or undefined message encountered at index ${msgIndex}`
        );
        return; // Skip this message
      }

      if (message.role === "model") {
        // Ensure message has an ID, generate if missing
        currentModelGroup.push({
          ...message,
          id: message.id || `msg-${Date.now()}-${msgIndex}`,
        });
      } else if (
        message.role === "execution" &&
        Array.isArray(message.content)
      ) {
        // Finalize previous model group
        if (currentModelGroup.length > 0) {
          processed.push({
            type: "modelGroup",
            messages: currentModelGroup,
            timestamp: currentModelGroup[0].id,
          });
          currentModelGroup = [];
        }
        // Add execution group if it has content
        const taskHistories = message.content;
        if (taskHistories.length > 0) {
          processed.push({ type: "executionGroup", taskHistories });
        }
      } else {
        // User message or other single types
        // Finalize previous model group
        if (currentModelGroup.length > 0) {
          processed.push({
            type: "modelGroup",
            messages: currentModelGroup,
            timestamp: currentModelGroup[0].id,
          });
          currentModelGroup = [];
        }
        processed.push({
          type: "single",
          message: {
            ...message,
            id: message.id || `msg-${Date.now()}-${msgIndex}`,
          },
        }); // Ensure ID
      }
    });
    // Finalize any trailing model group
    if (currentModelGroup.length > 0) {
      processed.push({
        type: "modelGroup",
        messages: currentModelGroup,
        timestamp: currentModelGroup[0].id,
      });
    }

    // Reverse the final array for display with flex-col-reverse
    setProcessedMessages(processed.reverse());
    console.log("[ChatWidget] Messages processed.", processed);
  }, []);

  useEffect(() => {
    processMessages(messages);
  }, [messages, processMessages]);

  // Effect 4: Scroll messages container to show the latest message
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // For flex-col-reverse, scrolling to the top shows the latest message (at the bottom visually)
      if (container.scrollTop !== 0) {
        // Only scroll if not already at top
        console.log("[ChatWidget] Scrolling message container to top.");
        container.scrollTop = 0;
      }
    }
    // Trigger scroll when processed messages change, loading starts/stops, or an error occurs
  }, [processedMessages, isLoading, error]);

  // Effect 5: Listen for messages from the background script
  useEffect(() => {
    const handleBackgroundMessage = async (
      message: any, // Consider defining a more specific type for background messages
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      console.log(
        `[ChatWidget] Received background message: ${message?.type}`,
        message
      );

      let messageHandled = false; // Flag to check if any handler processed the message

      try {
        // Add try-catch block for safety within the listener
        switch (message?.type) {
          case MESSAGE_TYPE.MEMORY_UPDATE:
            try {
              const memoryState = message.response as MemoryState | undefined;
              // (Basic check: is it an object and does it have the 'phases' array?)
              if (
                memoryState &&
                typeof memoryState === "object" &&
                Array.isArray(memoryState.phases)
              ) {
                console.log(
                  "[ChatWidget] Handling MEMORY_UPDATE with hierarchical MemoryState:",
                  memoryState
                );
                setTaskProgress(() => memoryState);
              }
            } catch (error) {
              console.error(
                "[ChatWidget] Error handling MEMORY_UPDATE:",
                error
              );
            }
            messageHandled = true;
            break;

          case MESSAGE_TYPE.AI_RESPONSE:
            console.log("[ChatWidget] Handling AI_RESPONSE");
            setIsLoading(false);

            const {
              action,
              question,
              message: completionMessage,
              output,
            } = message;
            let aiNewMessage: Message | null = null;

            if (action === "question") {
              aiNewMessage = {
                id: Date.now().toString(),
                role: "model",
                type: "question",
                content: question,
              };
              console.log(
                `[ChatWidget] Created question message: "${question}"`
              );
            } else if (action === "completion") {
              aiNewMessage = {
                id: Date.now().toString(),
                role: "model",
                type: "completion",
                content: completionMessage + (output ? `: ${output}` : ""),
              };
              console.log(
                `[ChatWidget] Created completion message: "${completionMessage}"`
              );
            }

            if (aiNewMessage) {
              setMessages((prev) => {
                updateAndSaveMessages(prev, aiNewMessage, hubspotMode);
                return [...prev, aiNewMessage];
              });
            }
            messageHandled = true;
            break;

          case MESSAGE_TYPE.HUBSPOT_RESPONSE:
            console.log("[ChatWidget] Handling HUBSPOT_RESPONSE");
            setIsLoading(false); // Stop loading on any Hubspot response

            const hubspotResult = message.response as HubSpotExecutionResult;
            let hubspotNewMessage: Message | null = null;

            if (hubspotResult.success === true) {
              hubspotNewMessage = {
                id: Date.now().toString(),
                role: "model",
                type: "hubspot_success",
                content: hubspotResult,
              };
              console.log(`[ChatWidget] Created hubspot_success card message.`);
            } else {
              let detailsString = "";
              try {
                if (hubspotResult.details) {
                  detailsString =
                    typeof hubspotResult.details === "string"
                      ? hubspotResult.details
                      : JSON.stringify(hubspotResult.details, null, 2);
                } else {
                  detailsString = JSON.stringify(hubspotResult, null, 2);
                }
              } catch (err) {
                console.error("Error stringifying details:", err);
                detailsString = "Error parsing details";
              }

              hubspotNewMessage = {
                id: Date.now().toString(),
                role: "model",
                type: "hubspot_error",
                errorType: hubspotResult.errorType || "general",
                message:
                  hubspotResult.error ||
                  "An error occurred with the HubSpot operation",
                details: detailsString,
                status: hubspotResult.status || 0,
                content: undefined,
              };
              console.log(
                `[ChatWidget] Created hubspot_error card message:`,
                hubspotNewMessage
              );
            }

            if (hubspotNewMessage) {
              setMessages((prev) => {
                updateAndSaveMessages(prev, hubspotNewMessage, hubspotMode);
                return [...prev, hubspotNewMessage];
              });
            }
            messageHandled = true;
            break;

          case MESSAGE_TYPE.COMMAND_RESPONSE:
            console.log("[ChatWidget] Handling COMMAND_RESPONSE (D4M)");
            setIsLoading(false); // Stop loading on any command response
            const responseData = message.response;

            if (responseData) {
              let commandNewMessage: Message | null = null;
              let contentText =
                typeof responseData === "string"
                  ? responseData
                  : responseData.message ||
                    responseData.output ||
                    responseData.text ||
                    (typeof responseData === "object"
                      ? "Processing your request..."
                      : JSON.stringify(responseData));

              commandNewMessage = {
                id: Date.now().toString(),
                role: "model",
                content: contentText,
              };
              console.log("[ChatWidget] Created D4M model message.");

              if (commandNewMessage) {
                setMessages((prev) => {
                  updateAndSaveMessages(prev, commandNewMessage, hubspotMode);
                  return [...prev, commandNewMessage];
                });
              }
            } else {
              console.warn(
                "[ChatWidget] COMMAND_RESPONSE received with null/undefined data."
              );
            }
            messageHandled = true;
            break;

          case MESSAGE_TYPE.FINISH_PROCESS_COMMAND:
            // Responsible for Toast Messages
            console.log("[ChatWidget] Handling FINISH_PROCESS_COMMAND");
            setIsLoading(false);
            const finishResponse = message.response;
            const msg =
              typeof finishResponse === "string"
                ? finishResponse
                : finishResponse?.message || "Task completed";
            setToast({ message: msg, type: "success" });
            messageHandled = true;
            break;

          // Add other message type handlers here (e.g., "ERROR_MESSAGE", "STATUS_UPDATE")
          default:
            console.log(
              "[ChatWidget] Background message type not handled:",
              message?.type
            );
            // No handler matched, send default sync response or do nothing
            sendResponse(); // Close channel immediately
            return false; // Indicate not handled
        }
      } catch (error) {
        console.error(
          "[ChatWidget] Error processing background message:",
          message?.type,
          error
        );
        setError("Error processing background message.");
      }

      // Indicate if the message was handled (important for async responses)
      // If messageHandled is true, Chrome knows to keep the message channel open for a potential async sendResponse.
      // If false, the channel closes immediately after this function returns.
      if (messageHandled) {
        // If your handlers might need to send an async response later, return true.
        // If they always respond synchronously (or don't respond), you can omit sendResponse/return true.
        // sendResponse({ack: true}); // Example sync response
        return true; // Keep channel open for potential async response from handlers
      } else {
        console.log(
          "[ChatWidget] Background message type not handled:",
          message?.type
        );
        // No handler matched, send default sync response or do nothing
        sendResponse(); // Close channel immediately
        return false;
      }
    };

    chrome.runtime.onMessage.addListener(handleBackgroundMessage);
    // Cleanup function to remove the listener when the component unmounts
    return () => {
      console.log("[ChatWidget] Removing background message listener.");
      chrome.runtime.onMessage.removeListener(handleBackgroundMessage);
    };
    // Add dependencies used within the listener's scope (setters mainly)
  }, [setIsLoading, setError, setToast, setMessages]);

  // Effect 6: Apply Siri border effect using the hook
  useSiriBorderWithRef(isLoading, "16px");

  // Effect 7: Listen for storage changes (for mode sync across components)
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      console.log(
        "[ChatWidget] Storage change detected:",
        changes,
        "in",
        areaName
      );

      // Check if mode was changed (by SettingsPage or other components)
      if (changes.mode && changes.mode.newValue !== undefined) {
        console.log(`[ChatWidget] Mode changed to: ${changes.mode.newValue}`);
        setMode(changes.mode.newValue);
      }

      // Check if theme was changed
      if (changes.theme && changes.theme.newValue !== undefined) {
        console.log(`[ChatWidget] Theme changed to: ${changes.theme.newValue}`);
        setTheme(changes.theme.newValue);
      }

      // Check if accent color was changed
      if (changes.accentColor && changes.accentColor.newValue !== undefined) {
        console.log(
          `[ChatWidget] Accent color changed to: ${changes.accentColor.newValue}`
        );
        setAccentColor(changes.accentColor.newValue);
      }
    };

    // Add listener for both local and sync storage
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []); // Empty dependency array as we want this to run once and stay active

  // Effect 8: Apply HubSpot pulse animation CSS (runs once)
  useEffect(() => {
    const styleId = "hubspot-pulse-animation";
    if (document.getElementById(styleId)) return; // Prevent adding multiple times
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.innerHTML = `
         @keyframes pulseAndShine {
           0% { box-shadow: 0 0 8px 1px rgba(255, 120, 28, 0.4); transform: translateY(0) scale(1); }
           50% { box-shadow: 0 0 16px 4px rgba(255, 120, 28, 0.6); transform: translateY(-2px) scale(1.03); }
           100% { box-shadow: 0 0 8px 1px rgba(255, 120, 28, 0.4); transform: translateY(0) scale(1); }
         }
       `;
    document.head.appendChild(styleEl);
    // Cleanup function (optional, but good practice)
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  // Effect 8: Scroll selected history item into view (if history nav implemented)
  useEffect(() => {
    if (historyIndex !== null && selectedCommandRef.current) {
      console.log(
        "[ChatWidget] Scrolling history item into view:",
        historyIndex
      );
      selectedCommandRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [historyIndex]); // Trigger only when historyIndex changes

  // --- Helper Functions ---

  // Formats raw messages (basic filtering, can be expanded)
  function formatMessages(msgs: Message[]): Message[] {
    if (!Array.isArray(msgs)) return []; // Handle case where msgs isn't an array
    // Filter out any potentially invalid message entries
    return msgs.filter(
      (msg) =>
        msg &&
        (typeof msg.content === "string"
          ? msg.content.trim()
          : msg.content !== undefined && msg.content !== null)
    );
  }

  // Compute current theme directly from mode/theme settings instead of using a separate state
  const currentTheme = hubspotMode
    ? hubspotTheme[mode]
    : themeStyles[theme][mode];
  const textColor =
    mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200";

  // Handler to toggle task progress display
  const toggleTaskProgress = useCallback(() => {
    setIsTaskProgressExpanded((prev) => !prev);
  }, []);

  // --- JSX ---
  return (
    <React.Fragment>
      {/* Main Widget Container */}
      <div
        ref={widgetContainerRef} // Ref for Siri border hook
        className={`d4m-w-full d4m-h-full d4m-flex d4m-flex-col ${
          currentTheme?.container || "d4m-bg-gray-800 d4m-text-gray-200"
        } d4m-relative d4m-overflow-hidden`} // Use theme, flex column, hide overflow with fallback
        role="log" // ARIA role for chat log area
        aria-live="polite" // Announce changes politely
      >
        {/* Header Section using the new ComponentHeader */}
        <ComponentHeader
          activeTab="chatWidget"
          mode={mode}
          onModeToggle={() => {
            // Toggle mode
            const newMode = mode === "light" ? "dark" : "light";
            setMode(newMode);

            // Save to storage for persistence
            chrome.storage.local.set({ mode: newMode });
            chrome.storage.sync.set({ mode: newMode }); // Also sync for global preference

            console.log(`[ChatWidget] Switched to ${newMode} mode`);
          }}
          accentColor={accentColor}
          hubspotMode={hubspotMode}
          d4mAccentColor={d4mAccentColor}
          toggleD4MMode={() => {
            if (!hubspotMode) return; // No change if already active

            // TODO: Save current Hubspot chat before switching
            saveConversationHistory(HUBSPOT_CONVERSATION_HISTORY_KEY, messages);
            console.log("[ChatWidget] Saved Hubspot conversation history");

            // Switch to D4M mode
            setHubspotMode(false);

            // Restore visual state
            const restoredColor = d4mAccentColor || "rose";
            setAccentColor(restoredColor); // Restore D4M accent color

            // Save mode state
            chrome.storage.local.set({
              hubspotMode: false,
              accentColor: restoredColor,
            }); // Save state
            chrome.storage.sync.set({ hubspotMode: false }); // Sync preference if needed

            // Restore previous D4M chat or start a new one
            const d4mHistory = loadConversationHistory(
              D4M_CONVERSATION_HISTORY_KEY
            );
            if (Array.isArray(d4mHistory) && d4mHistory.length > 0) {
              setMessages(formatMessages(d4mHistory));
              console.log("[ChatWidget] Restored D4M conversation history");
            } else {
              // Start a new chat if no history exists
              setMessages([]);
              setProcessedMessages([]);
              console.log(
                "[ChatWidget] Started new D4M chat (no history found)"
              );
            }
          }}
          toggleHubspotMode={() => {
            if (hubspotMode) return; // No change if already active

            //TODO:  Save current D4M chat before switching
            saveConversationHistory(D4M_CONVERSATION_HISTORY_KEY, messages);
            console.log("[ChatWidget] Saved D4M conversation history");

            // Save current D4M color before switching if it's not white
            if (accentColor !== "white") setD4mAccentColor(accentColor);

            // Switch to Hubspot mode
            setHubspotMode(() => true);
            setAccentColor("white"); // HubSpot visual mode uses white base

            // Save mode state
            chrome.storage.local.set({
              hubspotMode: true,
              accentColor: "white",
              d4mAccentColor:
                accentColor === "white" ? d4mAccentColor : accentColor,
            }); // Save state
            chrome.storage.sync.set({ hubspotMode: true }); // Sync preference if needed

            // Restore previous Hubspot chat or start a new one
            const hubspotHistory = loadConversationHistory(
              HUBSPOT_CONVERSATION_HISTORY_KEY
            );
            if (Array.isArray(hubspotHistory) && hubspotHistory.length > 0) {
              setMessages(formatMessages(hubspotHistory));
              console.log("[ChatWidget] Restored Hubspot conversation history");
            } else {
              // Start a new chat if no history exists
              setMessages([]);
              setProcessedMessages([]);
              console.log(
                "[ChatWidget] Started new Hubspot chat (no history found)"
              );
            }
          }}
          additionalButtons={[
            {
              ...commonButtons.newChat,
              onClick: handleNewChatClick,
            },
            // Add more buttons as needed based on tab
          ]}
        />

        {/* Toast Notification Area */}
        {toast && (
          <ToastNotification
            {...toast}
            onClose={() => setToast(null)}
            duration={4000}
          />
        )}

        {/* Task Progress Display */}
        {taskProgress && ( // Only render if taskProgress data exists
          <TaskProgressDisplay
            memory={taskProgress}
            mode={mode}
            isExpanded={isTaskProgressExpanded}
            onToggleExpand={toggleTaskProgress}
          />
        )}

        {/* Messages Area (Scrollable) */}
        <div
          ref={messagesContainerRef}
          className={`d4m-flex-1 d4m-overflow-y-auto d4m-space-y-4 d4m-px-4 d4m-py-3 d4m-scrollbar-thin ${
            // Adjusted padding
            mode === "light"
              ? "d4m-scrollbar-thumb-gray-300 hover:d4m-scrollbar-thumb-gray-400"
              : "d4m-scrollbar-thumb-gray-600 hover:d4m-scrollbar-thumb-gray-500"
          } d4m-flex d4m-flex-col-reverse d4m-relative d4m-z-0`} // flex-col-reverse displays newest at bottom
          aria-label="Chat messages"
        >
          {/* Hubspot Command Options Overlay */}
          <HubspotModularOptions
            isVisible={
              !!(
                hubspotMode &&
                isInputAreaFocused &&
                (selectedCommand || slashActive)
              )
            }
            mode={mode}
            accentColor={accentColor}
            selectedCommand={selectedCommand}
            slashActive={slashActive}
            slashFilter={slashFilter}
            hubspotSlashCommands={hubspotSlashCommands}
            hubspotModularTools={hubspotModularTools}
          />
          {/* Render Welcome Screen when no messages exist */}
          {processedMessages.length === 0 && !isLoading && (
            <WelcomeScreen
              hubspotMode={hubspotMode}
              hasHubspotApiKey={hasHubspotApiKey}
              mode={mode}
              accentColor={accentColor}
              textColor={textColor}
              currentTheme={currentTheme}
              handleSuggestionClick={handleSuggestionClick}
            />
          )}

          {/* Render Messages using MessageRenderer component */}
          {processedMessages.length > 0 && (
            <MessageRenderer
              processedMessages={processedMessages}
              textColor={textColor}
              currentTheme={currentTheme}
              accentColor={accentColor}
              mode={mode}
            />
          )}
        </div>

        {/* Input Area Section */}
        <div
          className={`d4m-flex-shrink-0 d4m-relative d4m-z-20 d4m-border-t ${
            mode === "light" ? "d4m-border-black/10" : "d4m-border-white/10"
          }`}
        >
          {isLoading ? (
            // --- Loading Indicator with Star Animation when waiting for AI response ---
            <div
              className={`d4m-flex d4m-items-center d4m-justify-between d4m-w-full d4m-px-4 d4m-py-3 ${
                currentTheme?.loading ||
                "d4m-bg-gray-800 d4m-border-t d4m-border-gray-700"
              }`}
            >
              <StarfallCascadeAnimation
                accentColor={accentColor}
                textColor={textColor}
              />
              <button
                onClick={handleStopClick}
                className={`d4m-p-2 d4m-rounded-full d4m-transition-colors d4m-duration-200 d4m-active:scale-95 ${
                  accentColor === "white"
                    ? "d4m-bg-red-500 hover:d4m-bg-red-600 d4m-text-white" // Red stop button in HS mode
                    : `d4m-bg-${accentColor}-500 hover:d4m-bg-${accentColor}-600 d4m-text-white` // Accent color stop button otherwise
                }`}
                title="Stop Generating"
                aria-label="Stop generating response"
              >
                <Square size={18} />
              </button>
            </div>
          ) : (
            // --- Command Input Area Component ---
            <CommandInputArea
              input={input}
              selectedCommand={selectedCommand}
              isLoading={isLoading}
              hubspotMode={hubspotMode}
              hasHubspotApiKey={hasHubspotApiKey}
              commandHistory={commandHistory}
              historyIndex={historyIndex}
              showCommandPopup={showCommandPopup}
              setInput={setInput}
              setSelectedCommand={setSelectedCommand}
              onSubmit={handleInputSubmit}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onPopupSelect={() => {}}
              selectedCommandRef={selectedCommandRef}
              currentTheme={currentTheme}
              accentColor={accentColor}
              textColor={textColor}
              mode={mode}
              placeholder={
                hubspotMode
                  ? "Type / for HubSpot commands (e.g. /contact, /deal...)"
                  : "Type your message here..."
              }
              onSlashCommandStateChange={handleSlashCommandStateChange}
            />
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

// Default export might be needed depending on how you import/use it
// export default ChatWidget;
