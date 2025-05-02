// src/components/ChatWidget.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Square,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  HelpCircle,
  Plus,
} from "lucide-react";

import HubspotErrorCard from "../HubspotErrorCard";
import { CommandInputArea } from "./CommandInputArea";
import MarkdownWrapper from "../MarkDownWrapper";
import { ToastNotification } from "../ToastNotifications";
// import SettingsModal from "../SettingsModal";

import { AccentColor, hubspotTheme, themeStyles } from "../../utils/themes";
import { loadHubSpotConfig } from "../../services/hubspot/api";
import { HubSpotExecutionResult } from "../../services/ai/interfaces";
import { StepState } from "../../types/responseFormat";
import { Message, ProcessedMessage } from "./chatInterface";

import {
  handleSubmit as originalHandleSubmit,
  handleStop,
  handleNewChat,
  toggleExecutionGroup,
  handleChipClick,
  handleFocus,
  handleBlur,
} from "./chatHandlers";
import { useSiriBorderWithRef } from "../../hooks/useSiriBorder";
import HubspotSuccessCard from "../HubspotSuccessCard";
import StarfallCascadeAnimation, { linkifyUrls } from "../../utils/helpers";
import { Tool } from "@google/generative-ai";
import { hubspotModularTools } from "../../services/ai/hubspotTool";
import Overlay from "./overlay";

interface ActionInfo {
  name: string; // Original function name (e.g., "hubspot_createContact")
  displayName: string; // User-friendly name (e.g., "Create Contact")
  description: string; // Description from the tool definition
}

export function ChatWidget() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [processedMessages, setProcessedMessages] = useState<
    ProcessedMessage[]
  >([]);
  const [input, setInput] = useState("");
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedExecutions, setExpandedExecutions] = useState<Set<number>>(
    new Set()
  );
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
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [showCommandPopup, setShowCommandPopup] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);
  const [hasHubspotApiKey, setHasHubspotApiKey] = useState<boolean>(false);

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
      hubspotMode
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
    handleStop(setIsLoading, setMessages, setError, setToast)();
  }, [setIsLoading, setMessages, setError, setToast]);

  const handleNewChatClick = useCallback(() => {
    handleNewChat(
      setMessages,
      setProcessedMessages,
      setError,
      setIsLoading,
      setToast
    )();
  }, [setMessages, setProcessedMessages, setError, setIsLoading, setToast]);

  const handleToggleExecution = useCallback(
    (index: number) => {
      toggleExecutionGroup(index, setExpandedExecutions);
    },
    [setExpandedExecutions]
  );

  // --- Effects ---

  // Effect 1: Load initial state from chrome.storage on component mount
  useEffect(() => {
    const loadState = async () => {
      console.log("[ChatWidget] Loading initial state...");
      try {
        // Fetch multiple keys at once
        const data = await chrome.storage.local.get([
          "conversationHistory",
          "commandHistory",
          "theme",
          "accentColor",
          "d4mAccentColor",
          "mode",
          "selectedModel",
          "hubspotMode",
        ]);
        console.log("[ChatWidget] Loaded state data:", data);

        // Set state based on loaded data, with fallbacks
        if (Array.isArray(data.conversationHistory))
          setMessages(formatMessages(data.conversationHistory));
        if (Array.isArray(data.commandHistory))
          setCommandHistory(data.commandHistory);
        setTheme(data.theme || "neumorphism");
        setMode(data.mode || "dark");
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
        } else {
          // Use loaded D4M color, fallback to loaded accentColor, fallback to rose
          setAccentColor(data.d4mAccentColor || data.accentColor || "rose");
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
          // Use ID of the first message in the group as timestamp anchor
          processed.push({
            type: "modelGroup",
            messages: currentModelGroup,
            timestamp: currentModelGroup[0].id,
          });
          currentModelGroup = [];
        }
        // Add execution group if it has content
        const taskHistories = message.content as StepState[];
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
  }, []); // Add dependencies if this callback uses external state/props, currently none

  useEffect(() => {
    processMessages(messages);
  }, [messages, processMessages]); // Re-process whenever raw messages change

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
    const handleBackgroundMessage = (
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
        if (message?.type === "MEMORY_UPDATE") {
          const steps = message.response?.steps as StepState[] | undefined;
          if (steps) {
            console.log("[ChatWidget] Handling MEMORY_UPDATE");
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              let updatedMessages: Message[];
              // If last message was execution, update its content; otherwise add new execution message
              if (lastMsg?.role === "execution") {
                updatedMessages = [
                  ...prev.slice(0, -1),
                  { ...lastMsg, content: steps },
                ];
              } else {
                updatedMessages = [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    role: "execution",
                    content: steps,
                  },
                ];
              }
              chrome.storage.local.set({
                conversationHistory: updatedMessages,
              }); // Persist change
              return updatedMessages;
            });
            messageHandled = true;
          } else {
            console.warn(
              "[ChatWidget] MEMORY_UPDATE received without valid steps data."
            );
          }
        } else if (message?.type === "COMMAND_RESPONSE") {
          console.log("[ChatWidget] Handling COMMAND_RESPONSE");
          setIsLoading(false); // Stop loading on any command response
          const responseData = message.response;

          if (responseData) {
            // Check if responseData exists
            let newMessage: Message | null = null;
            if (typeof responseData === "object") {
              // Determine if it's a structured success/error (e.g., HubSpotExecutionResult)
              const isSuccess = responseData.success === true;
              const isError =
                responseData.success === false || !!responseData.error; // Check for error property too

              if (isSuccess || isError) {
                // Create a structured message for HubSpot cards
                newMessage = {
                  id: Date.now().toString(),
                  role: "model",
                  type: isSuccess ? "hubspot_success" : "hubspot_error",
                  content: responseData as HubSpotExecutionResult, // Store the whole object
                };
                console.log(
                  `[ChatWidget] Created structured ${newMessage.type} message.`
                );
              } else {
                // Fallback for other object structures - try to get meaningful text
                let contentText =
                  responseData.message ||
                  responseData.output ||
                  responseData.text ||
                  JSON.stringify(responseData);
                newMessage = {
                  id: Date.now().toString(),
                  role: "model",
                  content: contentText,
                };
                console.log(
                  "[ChatWidget] Created fallback model message from object."
                );
              }
            } else if (typeof responseData === "string") {
              // Handle plain string response
              newMessage = {
                id: Date.now().toString(),
                role: "model",
                content: responseData,
              };
              console.log("[ChatWidget] Created model message from string.");
            }

            // Add the new message to state if one was created
            if (newMessage) {
              setMessages((prev) => {
                // Optional: Check for duplicate messages before adding
                const lastMsgContent = prev[prev.length - 1]?.content;
                if (
                  JSON.stringify(lastMsgContent) ===
                  JSON.stringify(newMessage!.content)
                ) {
                  console.warn(
                    "[ChatWidget] Duplicate message content detected, skipping add."
                  );
                  return prev;
                }
                const updated = [...prev, newMessage!];
                chrome.storage.local.set({ conversationHistory: updated }); // Persist
                return updated;
              });
            }
          } else {
            console.warn(
              "[ChatWidget] COMMAND_RESPONSE received with null/undefined data."
            );
          }
          messageHandled = true;
        } else if (message?.type === "FINISH_PROCESS_COMMAND") {
          console.log("[ChatWidget] Handling FINISH_PROCESS_COMMAND");
          setIsLoading(false); // Ensure loading stops
          const msg =
            typeof message.response === "string"
              ? message.response
              : message.response?.message || "Task completed";
          setToast({ message: msg, type: "success" });
          messageHandled = true;
        }
        // Add other message type handlers here (e.g., "ERROR_MESSAGE", "STATUS_UPDATE")
      } catch (error) {
        console.error(
          "[ChatWidget] Error processing background message:",
          message?.type,
          error
        );
        // Optionally set a general error state or toast
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

  // Effect 7: Apply HubSpot pulse animation CSS (runs once)
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

  // --- Render Logic ---
  const currentTheme = hubspotMode
    ? hubspotTheme[mode]
    : themeStyles[theme][mode];
  const textColor =
    mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200";

  const welcomeSuggestions = hubspotMode
    ? [
        "Create contact 'Jane Doe'",
        "Find company 'example.com'",
        "List my open deals",
        "Add note to contact 'jane@...",
      ]
    : [
        "Summarize this page",
        "Search Google for 'AI news'",
        "Open twitter.com",
        "Extract main points",
      ];

  // --- JSX ---
  return (
    <React.Fragment>
      {/* Main Widget Container */}
      <div
        ref={widgetContainerRef} // Ref for Siri border hook
        className={`d4m-w-full d4m-h-full d4m-flex d4m-flex-col ${currentTheme.container} d4m-relative d4m-overflow-hidden`} // Use theme, flex column, hide overflow
        role="log" // ARIA role for chat log area
        aria-live="polite" // Announce changes politely
      >
        {/* Header Section */}
        <div className="d4m-flex d4m-justify-end d4m-items-center d4m-px-3 d4m-py-2 d4m-gap-3 d4m-relative d4m-z-30 d4m-flex-shrink-0 d4m-border-b d4m-border-black/10 dark:d4m-border-white/10">
          {" "}
          {/* Added border */}
          {/* New Chat Button */}
          <button
            onClick={handleNewChatClick}
            className={`d4m-p-1.5 d4m-rounded-full d4m-text-gray-600 dark:d4m-text-gray-300 hover:d4m-bg-black/5 dark:hover:d4m-bg-white/10 d4m-transition-colors`}
            title="New Chat"
            aria-label="Start a new chat"
          >
            <Plus size={18} /> {/* Use Plus icon */}
          </button>
          {/* Mode Selector Capsule */}
          <div
            className={`d4m-relative d4m-flex d4m-items-center d4m-rounded-full d4m-p-0.5 d4m-overflow-hidden d4m-border ${
              mode === "light"
                ? "d4m-bg-gray-200 d4m-border-gray-300"
                : "d4m-bg-gray-700 d4m-border-gray-600"
            }`}
          >
            {/* Animated background pill */}
            <div
              className={`d4m-absolute d4m-top-0.5 d4m-bottom-0.5 d4m-rounded-full d4m-transition-all d4m-duration-300 d4m-ease-in-out ${
                hubspotMode
                  ? "d4m-bg-white dark:d4m-bg-gray-900" // Selected pill background
                  : accentColor === "white"
                  ? "d4m-bg-orange-500"
                  : `d4m-bg-${accentColor}-500` // Use orange if D4M is white, else accent
              }`}
              style={{
                left: !hubspotMode ? "2px" : "calc(50%)", // Adjusted for cleaner look
                width: "calc(50% - 2px)", // Adjusted for cleaner look
                height: "calc(100% - 4px)", // Take up full height minus padding
              }}
              aria-hidden="true"
            ></div>

            {/* D4M Mode Button */}
            <button
              onClick={() => {
                if (!hubspotMode) return; // No change if already active
                setHubspotMode(false);
                const restoredColor = d4mAccentColor || "rose";
                setAccentColor(restoredColor); // Restore D4M accent color
                chrome.storage.local.set({
                  hubspotMode: false,
                  accentColor: restoredColor,
                }); // Save state
                chrome.storage.sync.set({ hubspotMode: false }); // Sync preference if needed
              }}
              className={`d4m-relative d4m-z-10 d4m-flex d4m-items-center d4m-justify-center d4m-px-3 d4m-py-0.5 d4m-rounded-full d4m-transition-colors d4m-duration-300 d4m-w-1/2 ${
                !hubspotMode
                  ? mode === "light"
                    ? "d4m-text-white"
                    : "d4m-text-white"
                  : mode === "light"
                  ? "d4m-text-gray-500"
                  : "d4m-text-gray-400"
              }`}
              title="D4M Mode"
              aria-pressed={!hubspotMode}
            >
              <img
                src="/icons/icon48.png"
                alt="D4M"
                className="d4m-w-5 d4m-h-5"
              />
            </button>
            {/* HubSpot Mode Button */}
            <button
              onClick={() => {
                if (hubspotMode) return; // No change if already active
                // Save current D4M color before switching if it's not white
                if (accentColor !== "white") setD4mAccentColor(accentColor);
                setHubspotMode(() => true);
                setAccentColor("white"); // HubSpot visual mode uses white base
                chrome.storage.local.set({
                  hubspotMode: true,
                  accentColor: "white",
                  d4mAccentColor:
                    accentColor === "white" ? d4mAccentColor : accentColor,
                }); // Save state
                chrome.storage.sync.set({ hubspotMode: true }); // Sync preference if needed
              }}
              className={`d4m-relative d4m-z-10 d4m-flex d4m-items-center d4m-justify-center d4m-px-3 d4m-py-0.5 d4m-rounded-full d4m-transition-colors d4m-duration-300 d4m-w-1/2 ${
                hubspotMode
                  ? mode === "light"
                    ? "d4m-text-orange-600"
                    : "d4m-text-orange-400" // Text color when selected (Orange)
                  : mode === "light"
                  ? "d4m-text-gray-500"
                  : "d4m-text-gray-400" // Text color when not selected
              }`}
              title="Hubspot Mode"
              aria-pressed={hubspotMode}
            >
              <img
                src="/icons/hubspot/hubspot48.png"
                alt="Hubspot"
                className="d4m-w-5 d4m-h-5"
              />
            </button>
          </div>
          {/* Settings Button (Example) */}
          {/* <button onClick={() => setIsSettingsOpen(true)} title="Settings" className="d4m-p-1.5 ..."><Settings size={18} /></button> */}
        </div>

        {/* Toast Notification Area */}
        {toast && (
          <ToastNotification
            {...toast}
            onClose={() => setToast(null)}
            duration={4000}
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
          {/* --- Overlay for HubMode Commands/Options --- */}
          {hubspotMode && isInputAreaFocused && selectedCommand && (
            <Overlay
              isVisible={true}
              mode={mode}
              accentColor={accentColor}
              padding="20px 24px"
              borderRadius="12px"
              centerContent={false}
              style={{
                margin: "12px",
                maxWidth: "96%",
                marginLeft: "auto",
                marginRight: "auto",
                pointerEvents: "auto",
              }}
            >
              {(() => {
                // Format function name helper
                const formatFunctionName = (name: string): string => {
                  if (name.startsWith("hubspot_")) {
                    name = name.substring(8);
                  }
                  name = name.replace(/_/g, " ");
                  return name
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())
                    .trim();
                };

                const selectedToolGroup = hubspotModularTools.find(
                  (tool) => tool.toolGroupName === selectedCommand
                ) as
                  | {
                      toolGroupName: string;
                      functionDeclarations?: {
                        name: string;
                        description: string;
                      }[];
                    }
                  | undefined;

                if (
                  !selectedToolGroup ||
                  !selectedToolGroup.functionDeclarations
                ) {
                  return (
                    <div>
                      <div
                        style={{
                          fontWeight: "bold",
                          marginBottom: 12,
                          fontSize: 18,
                        }}
                      >
                        No actions available for /{selectedCommand}
                      </div>
                    </div>
                  );
                }

                return (
                  <div>
                    <div
                      style={{
                        fontWeight: "bold",
                        marginBottom: 12,
                        fontSize: 18,
                      }}
                    >
                      Available Actions for{" "}
                      <span
                        style={{
                          color:
                            accentColor === "white"
                              ? "#ea580c"
                              : `var(--${accentColor}-500)`,
                        }}
                      >
                        /{selectedCommand}
                      </span>
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                      {selectedToolGroup.functionDeclarations.map((action) => (
                        <li key={action.name} style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 500, fontSize: 16 }}>
                            {formatFunctionName(action.name)}
                          </div>
                          <div
                            style={{
                              marginLeft: 12,
                              color: mode === "light" ? "#6b7280" : "#9ca3af",
                              fontSize: 14,
                            }}
                          >
                            {action.description}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </Overlay>
          )}
          {hubspotMode &&
            isInputAreaFocused &&
            !selectedCommand &&
            slashActive && (
              <Overlay
                isVisible={true}
                mode={mode}
                accentColor={accentColor}
                padding="20px 24px"
                borderRadius="12px"
                centerContent={false}
                style={{
                  margin: "12px",
                  maxWidth: "96%",
                  marginLeft: "auto",
                  marginRight: "auto",
                  pointerEvents: "auto",
                }}
              >
                <div
                  style={{ fontWeight: "bold", marginBottom: 12, fontSize: 18 }}
                >
                  Command Options for{" "}
                  <span style={{ color: "#b91c1c" }}>
                    / {slashFilter || "..."}
                  </span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {hubspotSlashCommands
                    .filter((cmd) => cmd.command.startsWith(slashFilter))
                    .map((cmd) => (
                      <li key={cmd.command} style={{ marginBottom: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 16 }}>
                          / {cmd.command}
                        </span>
                        <span
                          style={{
                            marginLeft: 12,
                            color: mode === "light" ? "#666" : "#9ca3af",
                            fontSize: 14,
                          }}
                        >
                          {cmd.description}
                        </span>
                      </li>
                    ))}
                  {hubspotSlashCommands.filter((cmd) =>
                    cmd.command.startsWith(slashFilter)
                  ).length === 0 && (
                    <li
                      style={{
                        color: mode === "light" ? "#999" : "#6b7280",
                        fontSize: 14,
                      }}
                    >
                      No matching commands
                    </li>
                  )}
                </ul>
              </Overlay>
            )}
          {/* Render Empty State */}
          {processedMessages.length === 0 && !isLoading && (
            <div className="d4m-flex d4m-flex-col d4m-items-center d4m-justify-center d4m-text-center d4m-p-6 d4m-animate-fade-in d4m-h-full d4m-text-gray-500 dark:d4m-text-gray-400">
              {/* Logo Display */}
              <div className="d4m-relative d4m-flex d4m-items-center d4m-justify-center d4m-mb-6 d4m-mt-2">
                {hubspotMode ? (
                  <div className="d4m-relative d4m-flex d4m-items-center">
                    <div className="d4m-relative d4m-z-20 d4m-transition-all d4m-duration-300 d4m-transform hover:d4m-scale-110">
                      <img
                        src="/icons/icon128.png"
                        alt="D4M"
                        className="d4m-w-16 h-16 md:d4m-w-20 md:d4m-h-20 d4m-drop-shadow-lg"
                      />
                    </div>
                    <div
                      className={`d4m-relative d4m-z-10 d4m-rounded-full d4m-bg-gradient-to-br d4m-from-orange-400 d4m-to-orange-600 d4m-flex d4m-items-center d4m-justify-center d4m-w-16 h-16 md:d4m-w-20 md:d4m-h-20 d4m-shadow-lg d4m-ml-[-30px] md:d4m-ml-[-35px] d4m-transform hover:d4m-scale-110 d4m-transition-transform d4m-duration-300 hover:d4m-rotate-3`}
                      style={{
                        animation:
                          "pulseAndShine 3s infinite alternate ease-in-out",
                      }}
                    >
                      <img
                        src="/icons/hubspot/hubspot128.png"
                        alt="Hubspot"
                        className="d4m-w-12 h-12 md:d4m-w-16 md:d4m-h-16 d4m-opacity-95 hover:d4m-opacity-100 d4m-transition-opacity d4m-duration-300"
                      />
                    </div>
                  </div>
                ) : (
                  <img
                    src="/icons/icon128.png"
                    alt="Agent Logo"
                    className="d4m-w-16 h-16 md:d4m-w-20 md:d4m-h-20 d4m-mb-4 d4m-opacity-80"
                  />
                )}
              </div>
              {/* Welcome Text */}
              <h2
                className={`d4m-text-lg d4m-font-semibold ${textColor} d4m-mb-2`}
              >
                Welcome!
              </h2>
              {/* HubSpot API Key Warning */}
              {hubspotMode && !hasHubspotApiKey && (
                <div className="d4m-flex d4m-flex-col d4m-items-center d4m-text-center d4m-my-4 d4m-max-w-xs">
                  <div className="d4m-p-4 d4m-bg-red-500/10 dark:d4m-bg-red-500/20 d4m-border d4m-border-red-500/30 dark:d4m-border-red-500/50 d4m-rounded-lg">
                    <p className="d4m-text-red-600 dark:d4m-text-red-400 d4m-font-medium d4m-mb-2">
                      HubSpot API Key Required
                    </p>
                    <p className="d4m-text-sm d4m-text-gray-600 dark:d4m-text-gray-300">
                      Please add your HubSpot Private App token in Settings to
                      use HubSpot features.
                    </p>
                  </div>
                </div>
              )}
              {!(hubspotMode && !hasHubspotApiKey) && (
                <>
                  <p
                    className={`d4m-text-sm ${
                      mode === "light"
                        ? "d4m-text-gray-600"
                        : "d4m-text-gray-400"
                    } d4m-mb-5`}
                  >
                    How can I assist you today?
                  </p>
                  <p
                    className={`d4m-text-xs d4m-font-medium ${
                      mode === "light"
                        ? "d4m-text-gray-500"
                        : "d4m-text-gray-400"
                    } d4m-mb-3`}
                  >
                    Try an example:
                  </p>
                  <div className="d4m-flex d4m-flex-wrap d4m-gap-2 d4m-justify-center d4m-max-w-md">
                    {welcomeSuggestions.slice(0, 4).map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`d4m-text-xs ${
                          currentTheme.suggestion || ""
                        } d4m-px-3 d4m-py-1 hover:d4m-opacity-80 d4m-transition-opacity d4m-rounded-full ${
                          mode === "light"
                            ? "d4m-bg-gray-100 d4m-text-gray-700"
                            : "d4m-bg-gray-700 d4m-text-gray-200"
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Render Actual Messages */}
          <React.Fragment>
            {processedMessages.map((item, index) => {
              // Stable key generation
              const itemKey =
                item.type === "single"
                  ? item.message?.id || `s-${index}`
                  : item.timestamp ||
                    `${item.type}-${index}-${
                      item.messages?.[0]?.id ||
                      item.taskHistories?.[0]?.step_number ||
                      ""
                    }`;

              // --- Single Message Renderer ---
              if (item.type === "single") {
                const message = item.message!;
                // Align user messages to the right (example)
                const alignment =
                  message.role === "user" ? "d4m-ml-auto" : "d4m-mr-auto";
                const bubbleStyle =
                  message.role === "user"
                    ? `${currentTheme.messageBubble || ""} ${
                        accentColor === "white"
                          ? "d4m-bg-orange-500 d4m-text-white"
                          : `d4m-bg-${accentColor}-500 d4m-text-white`
                      }` // User bubble style
                    : `${
                        mode === "light" ? "d4m-bg-gray-100" : "d4m-bg-gray-700"
                      } ${textColor}`; // Model/other bubble style

                return (
                  <div
                    key={itemKey}
                    className={`d4m-flex d4m-max-w-[85%] md:d4m-max-w-[75%] ${alignment} d4m-mb-3`}
                  >
                    <div
                      className={`d4m-text-sm d4m-p-2.5 d4m-rounded-lg ${bubbleStyle} d4m-shadow-sm`}
                    >
                      {" "}
                      {/* Added padding, shadow */}
                      {message.role === "model" ? (
                        // --- Model Message Content ---
                        "type" in message &&
                        message.type === "hubspot_error" &&
                        typeof message.content === "object" ? (
                          <HubspotErrorCard
                            errorType={
                              (message.content as HubSpotExecutionResult) &&
                              "errorType" in message.content
                                ? message.content.errorType
                                : "hubspot_api"
                            }
                            message={
                              (message.content as HubSpotExecutionResult) &&
                              "error" in message.content
                                ? message.content.error
                                : "Unknown HubSpot error"
                            }
                            details={
                              (message.content as HubSpotExecutionResult)
                                ?.details
                            }
                            status={
                              (message.content as HubSpotExecutionResult)
                                ?.success
                                ? 1 // Map true to 1
                                : 0 // Map false to 0
                            }
                            mode={mode}
                          />
                        ) : "type" in message &&
                          message.type === "hubspot_success" &&
                          typeof message.content === "object" ? (
                          <HubspotSuccessCard // Use the new success card
                            result={message.content as HubSpotExecutionResult}
                            mode={mode}
                            accentColor={accentColor} // Pass active accent color
                            currentTheme={currentTheme}
                          />
                        ) : typeof message.content === "string" ? (
                          // Standard markdown for string content
                          <MarkdownWrapper content={message.content} />
                        ) : (
                          // Fallback for unknown model content - display as JSON
                          <pre className="d4m-text-xs d4m-whitespace-pre-wrap">
                            {JSON.stringify(message.content, null, 2)}
                          </pre>
                        )
                      ) : (
                        // --- End Model Message Content ---
                        // User message content
                        <span className="d4m-whitespace-pre-wrap d4m-break-words">
                          {linkifyUrls(message.content as string)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
              // --- Model Group Renderer ---
              else if (item.type === "modelGroup") {
                return (
                  <div
                    key={itemKey}
                    className={`d4m-flex d4m-flex-col d4m-gap-1 d4m-max-w-[85%] md:d4m-max-w-[75%] d4m-mr-auto d4m-mb-3`}
                  >
                    {item.messages!.map((msg, msgIdx) => (
                      <div
                        key={msg.id || msgIdx}
                        className={`d4m-text-sm d4m-p-2.5 d4m-rounded-lg ${
                          mode === "light"
                            ? "d4m-bg-gray-100"
                            : "d4m-bg-gray-700"
                        } ${textColor} d4m-shadow-sm`}
                      >
                        {typeof msg.content === "string" ? (
                          <MarkdownWrapper content={msg.content} />
                        ) : // Handle potential objects within model groups too
                        "type" in msg &&
                          msg.type === "hubspot_error" &&
                          typeof msg.content === "object" ? (
                          <HubspotErrorCard
                            {...(msg.content as any)}
                            mode={mode}
                          />
                        ) : "type" in msg &&
                          msg.type === "hubspot_success" &&
                          typeof msg.content === "object" ? (
                          <HubspotSuccessCard
                            result={msg.content as HubSpotExecutionResult}
                            mode={mode}
                            accentColor={accentColor}
                            currentTheme={currentTheme}
                          />
                        ) : (
                          <pre className="d4m-text-xs d4m-whitespace-pre-wrap">
                            {JSON.stringify(msg.content, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }
              // --- Execution Group Renderer ---
              else if (item.type === "executionGroup") {
                const isExpanded = expandedExecutions.has(index);
                return (
                  <div
                    key={itemKey}
                    className={`d4m-p-3 d4m-mb-3 d4m-rounded-lg d4m-border ${
                      mode === "light"
                        ? "d4m-bg-gray-50/50 d4m-border-gray-200"
                        : "d4m-bg-gray-700/30 d4m-border-gray-600"
                    } d4m-max-w-[90%] d4m-mr-auto`}
                  >
                    <div
                      className="d4m-flex d4m-justify-between d4m-items-center d4m-cursor-pointer"
                      onClick={() => handleToggleExecution(index)} // Use original index
                      aria-expanded={isExpanded}
                      aria-controls={`execution-details-${index}`}
                    >
                      <h6
                        className={`d4m-text-sm d4m-font-semibold ${
                          accentColor === "white"
                            ? "d4m-text-orange-500"
                            : `d4m-text-${accentColor}-500`
                        }`}
                      >
                        Task Steps ({item.taskHistories!.length})
                      </h6>
                      {isExpanded ? (
                        <ChevronUp size={16} className={textColor} />
                      ) : (
                        <ChevronDown size={16} className={textColor} />
                      )}
                    </div>
                    {isExpanded && (
                      <div
                        className="d4m-mt-2 d4m-overflow-x-auto"
                        id={`execution-details-${index}`}
                      >
                        <table
                          className={`d4m-w-full d4m-text-xs ${textColor}`}
                        >
                          <thead className="d4m-border-b d4m-border-gray-300 dark:d4m-border-gray-600">
                            <tr>
                              <th className="d4m-py-1 d4m-px-2 d4m-text-left d4m-font-medium">
                                #
                              </th>
                              <th className="d4m-py-1 d4m-px-2 d4m-text-left d4m-font-medium">
                                Description
                              </th>
                              <th className="d4m-py-1 d4m-px-2 d4m-text-center d4m-font-medium">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.taskHistories!.map((task, taskIdx) => (
                              <tr
                                key={taskIdx}
                                className="d4m-border-b d4m-border-gray-200 dark:d4m-border-gray-700 d4m-last:border-b-0"
                              >
                                <td className="d4m-py-1.5 d4m-px-2">
                                  {taskIdx + 1}
                                </td>
                                <td className="d4m-py-1.5 d4m-px-2">
                                  {task.description ||
                                    task.step_number ||
                                    "N/A"}
                                </td>
                                <td className="d4m-py-1.5 d4m-px-2 d4m-text-center">
                                  {/* Status Icons */}
                                  {(task.status === "PASS" ||
                                    task.status === "passed") && (
                                    <Check
                                      size={14}
                                      className="d4m-text-green-500 d4m-mx-auto"
                                    />
                                  )}
                                  {(task.status === "FAIL" ||
                                    task.status === "failed") && (
                                    <X
                                      size={14}
                                      className="d4m-text-red-500 d4m-mx-auto"
                                    />
                                  )}
                                  {(task.status === "PENDING" ||
                                    task.status === "pending") && (
                                    <div className="d4m-w-3 d4m-h-3 d4m-border-2 d4m-border-gray-400 d4m-border-t-transparent d4m-rounded-full d4m-animate-spin d4m-mx-auto"></div>
                                  )}
                                  {(task.status === "IN_PROGRESS" ||
                                    task.status === "in_progress") && (
                                    <div className="d4m-w-3 d4m-h-3 d4m-border-2 d4m-border-blue-400 d4m-border-t-transparent d4m-rounded-full d4m-animate-spin d4m-mx-auto"></div>
                                  )}
                                  {![
                                    "PASS",
                                    "passed",
                                    "FAIL",
                                    "failed",
                                    "PENDING",
                                    "pending",
                                    "IN_PROGRESS",
                                    "in_progress",
                                  ].includes(task.status) && (
                                    <HelpCircle
                                      size={14}
                                      className="d4m-text-gray-400 d4m-mx-auto"
                                    />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </React.Fragment>
        </div>

        {/* Input Area Section */}
        <div className="d4m-flex-shrink-0 d4m-relative d4m-z-20 d4m-border-t d4m-border-black/10 dark:d4m-border-white/10">
          {isLoading ? (
            // --- Loading Indicator ---
            <div
              className={`d4m-flex d4m-items-center d4m-justify-between d4m-w-full d4m-px-4 d4m-py-3 ${
                currentTheme.loading || ""
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
