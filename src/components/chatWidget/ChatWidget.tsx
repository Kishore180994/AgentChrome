// src/components/ChatWidget.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Square, Plus } from "lucide-react";

import { CommandInputArea } from "./CommandInputArea";
import WelcomeScreen from "./WelcomeScreen";
import MessageRenderer from "./MessageRenderer";
import HubspotModularOptions from "./HubspotModularOptions";
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
import StarfallCascadeAnimation from "../../utils/helpers";
import { hubspotModularTools } from "../../services/ai/hubspotTool";

export function ChatWidget() {
  // State
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
          "d4mConversationHistory",
          "hubspotConversationHistory",
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

          // Load appropriate conversation history based on mode
          if (
            Array.isArray(data.hubspotConversationHistory) &&
            data.hubspotConversationHistory.length > 0
          ) {
            console.log("[ChatWidget] Loading Hubspot conversation history");
            setMessages(formatMessages(data.hubspotConversationHistory));
            // Also set as active conversation
            chrome.storage.local.set({
              conversationHistory: data.hubspotConversationHistory,
            });
          } else if (Array.isArray(data.conversationHistory)) {
            // Fallback to generic conversation history if mode-specific one doesn't exist
            console.log(
              "[ChatWidget] No Hubspot history found, using generic conversation history"
            );
            setMessages(formatMessages(data.conversationHistory));
          }
        } else {
          // D4M mode: use D4M accent color
          setAccentColor(data.d4mAccentColor || data.accentColor || "rose");

          // Load D4M conversation history
          if (
            Array.isArray(data.d4mConversationHistory) &&
            data.d4mConversationHistory.length > 0
          ) {
            console.log("[ChatWidget] Loading D4M conversation history");
            setMessages(formatMessages(data.d4mConversationHistory));
            // Also set as active conversation
            chrome.storage.local.set({
              conversationHistory: data.d4mConversationHistory,
            });
          } else if (Array.isArray(data.conversationHistory)) {
            // Fallback to generic conversation history if mode-specific one doesn't exist
            console.log(
              "[ChatWidget] No D4M history found, using generic conversation history"
            );
            setMessages(formatMessages(data.conversationHistory));
          }
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
              // Save to both the active conversation and mode-specific storage
              if (hubspotMode) {
                chrome.storage.local.set({
                  conversationHistory: updatedMessages,
                  hubspotConversationHistory: updatedMessages,
                }); // Persist to active and Hubspot storage
              } else {
                chrome.storage.local.set({
                  conversationHistory: updatedMessages,
                  d4mConversationHistory: updatedMessages,
                }); // Persist to active and D4M storage
              }
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

            // Check if it's a HubSpot API response that needs to be displayed as a card
            const isHubspotResult =
              typeof responseData === "object" &&
              (responseData.success === true ||
                responseData.success === false) &&
              (responseData.functionName?.includes("hubspot") ||
                message.source === "hubspot" ||
                (responseData.details &&
                  typeof responseData.details === "object"));

            if (isHubspotResult) {
              console.log(
                "[ChatWidget] Processing HubSpot API response:",
                responseData
              );
              // Force the response into the right structure for a card
              if (responseData.success === true) {
                // Create a structured message for HubSpot success
                newMessage = {
                  id: Date.now().toString(),
                  role: "model",
                  type: "hubspot_success",
                  content: responseData as HubSpotExecutionResult, // Store the whole object
                };
                console.log(
                  `[ChatWidget] Created hubspot_success card message.`
                );
              } else {
                // Create a properly structured message for HubSpot error
                // For debugging
                console.log(
                  "[ChatWidget] Creating hubspot_error with data:",
                  responseData
                );

                // Extract details and ensure it's a string for display
                let detailsString = "";
                try {
                  if (responseData.details) {
                    detailsString =
                      typeof responseData.details === "string"
                        ? responseData.details
                        : JSON.stringify(responseData.details, null, 2);
                  } else {
                    // If no details, use the full response for debugging
                    detailsString = JSON.stringify(responseData, null, 2);
                  }
                } catch (err) {
                  console.error("Error stringifying details:", err);
                  detailsString = "Error parsing details";
                }

                // Create message with properly formatted properties
                newMessage = {
                  id: Date.now().toString(),
                  role: "model",
                  type: "hubspot_error",
                  // Ensure all required properties are explicitly set
                  errorType: responseData.errorType || "general",
                  message:
                    responseData.error ||
                    "An error occurred with the HubSpot operation",
                  details: detailsString,
                  status: responseData.status || 0,
                  // Use undefined instead of null to comply with the type definition
                  content: undefined,
                };

                console.log(
                  `[ChatWidget] Created hubspot_error card message:`,
                  newMessage
                );
              }
            } else if (typeof responseData === "object") {
              // Check for specific message types
              if (responseData.type === "question") {
                // This is an "ask" action from AI
                newMessage = {
                  id: Date.now().toString(),
                  role: "model",
                  type: "question",
                  content: responseData.message,
                };
                console.log(
                  `[ChatWidget] Created question message: "${responseData.message}"`
                );
              } else if (responseData.type === "completion") {
                // This is a "done" action from AI
                newMessage = {
                  id: Date.now().toString(),
                  role: "model",
                  type: "completion",
                  content:
                    responseData.message +
                    (responseData.output ? `: ${responseData.output}` : ""),
                };
                console.log(
                  `[ChatWidget] Created completion message: "${responseData.message}"`
                );
              } else if (
                responseData.success === false ||
                !!responseData.error
              ) {
                // Create a properly structured message for HubSpot error
                newMessage = {
                  id: Date.now().toString(),
                  role: "model",
                  type: "hubspot_error",
                  // Ensure all required properties are present for HubspotErrorCard
                  errorType: responseData.errorType || "general",
                  message: responseData.error || "An error occurred",
                  details: responseData.details || responseData,
                  status: responseData.status || 0,
                  content: responseData as HubSpotExecutionResult, // Also store the full object
                };
                console.log(
                  `[ChatWidget] Created structured hubspot_error message:`,
                  newMessage
                );
              } else if (
                Array.isArray(responseData) &&
                responseData.length > 0 &&
                responseData[0]?.functionCall
              ) {
                // This is a raw function call array from Gemini - don't display as raw JSON
                console.log(
                  "[ChatWidget] Detected raw function call array:",
                  responseData
                );

                // Extract a user-friendly message
                let friendlyMessage = "Processing your request...";

                // Look for Hubspot actions specifically
                const hubspotAction = responseData.find((item) =>
                  item?.functionCall?.name?.includes("hubspot_")
                );

                if (hubspotAction) {
                  const functionName = hubspotAction.functionCall.name.replace(
                    "hubspot_",
                    ""
                  );
                  const args = hubspotAction.functionCall.args;

                  // Create a friendly message based on the action
                  if (functionName.includes("create")) {
                    const entityType = functionName
                      .replace("create", "")
                      .toLowerCase();
                    friendlyMessage = `Creating ${entityType} with the provided information...`;
                  } else if (functionName.includes("get")) {
                    const entityType = functionName
                      .replace("get", "")
                      .toLowerCase();
                    friendlyMessage = `Retrieving ${entityType} information...`;
                  } else if (functionName.includes("update")) {
                    const entityType = functionName
                      .replace("update", "")
                      .toLowerCase();
                    friendlyMessage = `Updating ${entityType} with the provided information...`;
                  } else {
                    friendlyMessage = `Processing ${functionName
                      .replace(/([A-Z])/g, " $1")
                      .toLowerCase()} request...`;
                  }
                }

                newMessage = {
                  id: Date.now().toString(),
                  role: "model",
                  content: friendlyMessage,
                };
                console.log(
                  `[ChatWidget] Created friendly model message: "${friendlyMessage}"`
                );
              } else {
                // Fallback for other object structures - try to get meaningful text
                let contentText =
                  responseData.message ||
                  responseData.output ||
                  responseData.text ||
                  (typeof responseData === "object"
                    ? "Processing your request..." // Don't stringify objects
                    : JSON.stringify(responseData));

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
                // Save to both the active conversation and mode-specific storage
                if (hubspotMode) {
                  chrome.storage.local.set({
                    conversationHistory: updated,
                    hubspotConversationHistory: updated,
                  }); // Persist to active and Hubspot storage
                } else {
                  chrome.storage.local.set({
                    conversationHistory: updated,
                    d4mConversationHistory: updated,
                  }); // Persist to active and D4M storage
                }
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

          // Process the response
          const response = message.response;

          // Handle HubSpot success response with card view
          if (
            typeof response === "object" &&
            response.success === true &&
            (response.functionName?.includes("hubspot") ||
              message.source === "hubspot")
          ) {
            console.log(
              "[ChatWidget] Processing HubSpot success response as card:",
              response
            );

            // Create a data structure that HubspotSuccessCard can properly display
            const hubspotResponse = {
              success: true,
              functionName: response.functionName || "hubspot_operation",
              message: response.message || "Operation completed successfully",
              // Ensure we have a details object with the full API response
              details: response.data || response.details || response,
            };

            // Add a structured message for display in the chat
            setMessages((prev) => {
              // Create a properly typed message with correct structure
              const newMessage: Message = {
                id: Date.now().toString(),
                role: "model", // Must be 'model' not just string
                type: "hubspot_success", // This must be a valid type
                content: hubspotResponse as HubSpotExecutionResult, // Ensure proper typing
              };
              const updated = [...prev, newMessage];
              // Save to both the active conversation and mode-specific storage
              if (hubspotMode) {
                chrome.storage.local.set({
                  conversationHistory: updated,
                  hubspotConversationHistory: updated,
                }); // Persist to active and Hubspot storage
              } else {
                chrome.storage.local.set({
                  conversationHistory: updated,
                  d4mConversationHistory: updated,
                }); // Persist to active and D4M storage
              }
              return updated;
            });

            // Skip toast since we're showing a card
            console.log("[ChatWidget] Added hubspot_success card to messages");
          } else {
            // For non-card responses, just show a toast
            const msg =
              typeof response === "string"
                ? response
                : response?.message || "Task completed";
            setToast({ message: msg, type: "success" });
          }

          messageHandled = true;
        }
        // Handle UPDATE_SIDEPANEL messages sent by the background script
        else if (message?.type === "UPDATE_SIDEPANEL" && message.question) {
          console.log(
            "[ChatWidget] Handling UPDATE_SIDEPANEL with question:",
            message.question
          );
          setIsLoading(false); // Stop loading indicator

          // Create a question message
          const newMessage: Message = {
            id: Date.now().toString(),
            role: "model",
            type: "question",
            content: message.question,
          };

          // Add the question to the chat
          setMessages((prev) => {
            const updated = [...prev, newMessage];
            // Save to both the active conversation and mode-specific storage
            if (hubspotMode) {
              chrome.storage.local.set({
                conversationHistory: updated,
                hubspotConversationHistory: updated,
              }); // Persist to active and Hubspot storage
            } else {
              chrome.storage.local.set({
                conversationHistory: updated,
                d4mConversationHistory: updated,
              }); // Persist to active and D4M storage
            }
            return updated;
          });

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

                // Save current Hubspot chat before switching
                chrome.storage.local.get(["conversationHistory"], (data) => {
                  if (
                    Array.isArray(data.conversationHistory) &&
                    data.conversationHistory.length > 0
                  ) {
                    chrome.storage.local.set({
                      hubspotConversationHistory: data.conversationHistory,
                    });
                    console.log(
                      "[ChatWidget] Saved Hubspot conversation history"
                    );
                  }
                });

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
                chrome.storage.local.get(["d4mConversationHistory"], (data) => {
                  if (
                    Array.isArray(data.d4mConversationHistory) &&
                    data.d4mConversationHistory.length > 0
                  ) {
                    setMessages(formatMessages(data.d4mConversationHistory));
                    chrome.storage.local.set({
                      conversationHistory: data.d4mConversationHistory,
                    });
                    console.log(
                      "[ChatWidget] Restored D4M conversation history"
                    );
                  } else {
                    // Start a new chat if no history exists
                    setMessages([]);
                    setProcessedMessages([]);
                    chrome.storage.local.remove(["conversationHistory"]);
                    console.log(
                      "[ChatWidget] Started new D4M chat (no history found)"
                    );
                  }
                });
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

                // Save current D4M chat before switching
                chrome.storage.local.get(["conversationHistory"], (data) => {
                  if (
                    Array.isArray(data.conversationHistory) &&
                    data.conversationHistory.length > 0
                  ) {
                    chrome.storage.local.set({
                      d4mConversationHistory: data.conversationHistory,
                    });
                    console.log("[ChatWidget] Saved D4M conversation history");
                  }
                });

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
                chrome.storage.local.get(
                  ["hubspotConversationHistory"],
                  (data) => {
                    if (
                      Array.isArray(data.hubspotConversationHistory) &&
                      data.hubspotConversationHistory.length > 0
                    ) {
                      setMessages(
                        formatMessages(data.hubspotConversationHistory)
                      );
                      chrome.storage.local.set({
                        conversationHistory: data.hubspotConversationHistory,
                      });
                      console.log(
                        "[ChatWidget] Restored Hubspot conversation history"
                      );
                    } else {
                      // Start a new chat if no history exists
                      setMessages([]);
                      setProcessedMessages([]);
                      chrome.storage.local.remove(["conversationHistory"]);
                      console.log(
                        "[ChatWidget] Started new Hubspot chat (no history found)"
                      );
                    }
                  }
                );
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
              expandedExecutions={expandedExecutions}
              handleToggleExecution={handleToggleExecution}
            />
          )}
        </div>

        {/* Input Area Section */}
        <div className="d4m-flex-shrink-0 d4m-relative d4m-z-20 d4m-border-t d4m-border-black/10 dark:d4m-border-white/10">
          {isLoading ? (
            // --- Loading Indicator with Star Animation when waiting for AI response ---
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
