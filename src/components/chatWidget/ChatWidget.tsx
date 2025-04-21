import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Square,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  HelpCircle,
  Settings,
  Mic,
  List, // Import List icon
} from "lucide-react";
import MarkdownWrapper from "../MarkDownWrapper";
import { StepState } from "../../types/responseFormat";
import { storage } from "../../utils/storage";
import { SettingsModal } from "../SettingsModal";
import { AccentColor, themeStyles } from "../../utils/themes";
import { ToastNotification } from "../ToastNotifications";
import {
  handleSubmit,
  handleStop,
  handleNewChat,
  handlePopupSelect,
  toggleExecutionGroup,
  handleChipClick,
  toggleWatching,
  handleFocus,
  handleBlur,
} from "./chatHandlers";
import { Message, ProcessedMessage } from "./chatInterface";
import api, { Chat } from "../../services/api"; // Import api and Chat
import ChatListModal from "./ChatListModal"; // Default import
import { RecordingMic } from "./RecordingMic";
import StarfallCascadeAnimation from "../../utils/helpers";
import { TranscriptLine, useDeepgramLive } from "../../hooks/useDeepgramLive";
import { useSiriBorderWithRef } from "../../hooks/useSiriBorder";

export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [processedMessages, setProcessedMessages] = useState<
    ProcessedMessage[]
  >([]);
  const [isRecordingClicked, setIsRecording] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [expandedExecutions, setExpandedExecutions] = useState<Set<number>>(
    new Set()
  );
  const [userTypedInput, setUserTypedInput] = useState("");
  const selectedCommandRef = useRef<HTMLDivElement | null>(null);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"gemini" | "claude">(
    "gemini"
  );
  const [theme, setTheme] = useState<
    "neumorphism" | "glassmorphism" | "claymorphism"
  >("neumorphism");
  const [accentColor, setAccentColor] = useState<AccentColor>("rose");
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatListOpen, setIsChatListOpen] = useState(false); // Add state for ChatListModal
  const [currentAnimation, setCurrentAnimation] =
    useState<"starfallCascade">("starfallCascade");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [showCommandPopup, setShowCommandPopup] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptLine[]>([]);

  const { startRecording, stopRecording } = useDeepgramLive({
    apiKey: "0f7e30b6546822958e971a12c1a4215bccceabb5",
    onTranscript: (line) => {
      setLiveTranscript((prev) => [...prev, line]);
    },
  });
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const suggestions = [
    "Open a new tab with Google",
    "Summarize this page",
    "Extract text from this page",
    "Search for 'AI tools' on Bing",
    "Navigate to x.com",
    "Click the first link on the page",
    "Fill form with my details",
    "Scroll to the bottom of the page",
    "show me the code that is displayed on the screen",
  ];

  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const {
          conversationHistory,
          commandHistory,
          theme,
          accentColor,
          mode,
        } = await chrome.storage.local.get([
          "conversationHistory",
          "commandHistory",
          "theme",
          "accentColor",
          "mode",
        ]);
        if (Array.isArray(conversationHistory))
          setMessages(formatMessages(conversationHistory));
        if (Array.isArray(commandHistory)) setCommandHistory(commandHistory);
        if (theme) setTheme(theme);
        if (accentColor) setAccentColor(accentColor);
        if (mode) setMode(mode);
      } catch (err) {
        console.error("Error loading initial state:", err);
      }
    };

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return;
      if (changes.conversationHistory) {
        if (Array.isArray(changes.conversationHistory))
          setMessages(formatMessages(changes.conversationHistory));
      }
      if (changes.commandHistory) {
        const newCommands = changes.commandHistory.newValue || [];
        setCommandHistory(newCommands);
      }
    };

    loadInitialState();
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const loadSettings = async () => {
    try {
      const { conversationHistory, theme, accentColor, mode, commandHistory } =
        await storage.get([
          "conversationHistory",
          "theme",
          "accentColor",
          "mode",
          "commandHistory",
        ]);
      if (conversationHistory && Array.isArray(conversationHistory))
        setMessages(formatMessages(conversationHistory));
      if (commandHistory && Array.isArray(commandHistory))
        setCommandHistory(commandHistory);
      setTheme(theme || "neumorphism");
      setAccentColor(accentColor || "rose");
      setMode(mode || "dark");
    } catch (err) {
      console.error("[ChatWidget] Failed to load data from storage:", err);
      setError("Failed to load conversation history or settings.");
    }
  };

  function formatMessages(messages: Message[]): Message[] {
    return messages
      .filter((msg) => {
        if (msg.role === "execution") {
          return Array.isArray(msg.content) && msg.content.length > 0;
        }
        if (msg.role === "model" && typeof msg.content === "string") {
          try {
            const parsed = JSON.parse(msg.content);
            return !!parsed?.action?.[0]?.done?.output;
          } catch {
            return true;
          }
        }
        return true;
      })
      .map((msg) => {
        if (msg.role === "model" && typeof msg.content === "string") {
          try {
            const parsed = JSON.parse(msg.content);
            if (parsed?.action?.[0]?.done?.output) {
              return { ...msg, content: parsed.action[0].done.output };
            }
          } catch {
            // Leave as-is if not JSON
          }
        }
        return msg;
      });
  }

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesContainerRef.current)
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
    };
    scrollToBottom();
  }, [processedMessages, isLoading, error]);

  const processMessages = (msgs: Message[]) => {
    const processed: ProcessedMessage[] = [];
    let currentModelGroup: Message[] = [];
    msgs.forEach((message) => {
      if (message.role === "model") {
        if (currentModelGroup.length === 0)
          currentModelGroup.push({
            ...message,
            id: message.id || Date.now().toString(),
          });
        else currentModelGroup.push(message);
      } else if (
        message.role === "execution" &&
        Array.isArray(message.content)
      ) {
        if (currentModelGroup.length > 0) {
          processed.push({
            type: "modelGroup",
            messages: currentModelGroup,
            timestamp: currentModelGroup[0].id,
          });
          currentModelGroup = [];
        }
        const taskHistories = message.content as StepState[];
        if (
          taskHistories.length > 0 &&
          taskHistories.some(
            (task) => task.step_number || task.description || task.status
          )
        ) {
          processed.push({ type: "executionGroup", taskHistories });
        }
      } else {
        if (currentModelGroup.length > 0) {
          processed.push({
            type: "modelGroup",
            messages: currentModelGroup,
            timestamp: currentModelGroup[0].id,
          });
          currentModelGroup = [];
        }
        processed.push({ type: "single", message });
      }
    });
    if (currentModelGroup.length > 0)
      processed.push({
        type: "modelGroup",
        messages: currentModelGroup,
        timestamp: currentModelGroup[0].id,
      });
    setProcessedMessages(processed.reverse());
  };

  useEffect(() => {
    const handleBackgroundMessage = (
      message: any,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: any) => void
    ) => {
      console.log("[ChatWidget] Received message:", message);
      if (message.type === "MEMORY_UPDATE") {
        const memory = message.response;
        if (memory) {
          const steps = memory.steps as StepState[];
          setMessages((prev) => {
            const updatedMessages =
              prev.length > 0 && prev[prev.length - 1].role === "execution"
                ? [
                    ...prev.slice(0, -1),
                    { ...prev[prev.length - 1], content: steps },
                  ]
                : [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      role: "execution" as const,
                      content: steps,
                    },
                  ];
            chrome.storage.local.set({ conversationHistory: updatedMessages });
            return updatedMessages;
          });
        }
        sendResponse({ success: true });
      } else if (message.type === "COMMAND_RESPONSE") {
        let content: string;
        if (typeof message.response === "string") {
          content = message.response;
        } else if (message.response.message) {
          content = message.response.message;
          if (message.response.output)
            content += "\n\n" + message.response.output;
        } else {
          const { data } = message.response;
          const { text, output } = data || {};
          content = (text || "Task completed") + (output || "");
        }
        setMessages((prev) => {
          const updatedMessages = [
            ...prev,
            { id: Date.now().toString(), role: "model" as const, content },
          ];
          chrome.storage.local.set({ conversationHistory: updatedMessages });
          return updatedMessages;
        });
        setIsLoading(false);
        sendResponse({ success: true });
      } else if (message.type === "FINISH_PROCESS_COMMAND") {
        setToast({ message: message.response, type: "success" });
        setIsLoading(false);
        sendResponse({ success: true });
      } else if (message.type === "UPDATE_SIDEPANEL") {
        if (message.question) {
          setMessages((prev) => {
            const updatedMessages = [
              ...prev,
              {
                id: Date.now().toString(),
                role: "model" as const,
                content: message.question,
              },
            ];
            chrome.storage.local.set({ conversationHistory: updatedMessages });
            return updatedMessages;
          });
          sendResponse({ success: true });
        }
      }
      return true;
    };
    chrome.runtime.onMessage.addListener(handleBackgroundMessage);
    return () =>
      chrome.runtime.onMessage.removeListener(handleBackgroundMessage);
  }, []);

  useEffect(() => {
    processMessages(messages);
  }, [messages]);

  useSiriBorderWithRef(isLoading, "16px");

  useEffect(() => {
    if (selectedCommandRef.current) {
      selectedCommandRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [historyIndex]);

  const currentTheme = themeStyles[theme][mode];
  const textColor =
    mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200";
  const borderColor =
    mode === "light" ? "d4m-border-gray-300" : "d4m-border-gray-700";

  return (
    <React.Fragment>
      <div
        ref={widgetContainerRef}
        className={`d4m-w-full d4m-h-full d4m-flex d4m-flex-col ${currentTheme.container} d4m-relative`}
      >
        {isTextareaFocused && (
          <div
            className={`d4m-absolute d4m-inset-0 d4m-backdrop-blur-[0.6px] d4m-bg-opacity-80 d4m-z-10 ${
              mode === "light" ? "d4m-bg-gray-200" : "d4m-bg-gray-900"
            }`}
          ></div>
        )}

        <div
          className={`d4m-flex d4m-justify-between d4m-items-center d4m-px-3 d4m-py-2 ${currentTheme.header}`}
        >
          <div
            className={`d4m-text-sm d4m-font-bold d4m-text-${accentColor}-500`}
          >
            D4M Agent
          </div>
          <div className="d4m-flex d4m-items-center d4m-space-x-2">
            <button
              onClick={handleNewChat(
                setMessages,
                setProcessedMessages,
                setError,
                setIsLoading,
                setToast
              )}
              className={`d4m-px-2 d4m-py-1 d4m-text-${accentColor}-400 d4m-text-sm d4m-rounded-lg ${currentTheme.button} d4m-transition-transform d4m-duration-200 d4m-active:scale-95`}
            >
              New Chat
            </button>

            <div className="d4m-flex d4m-gap-2">
              <button
                onClick={toggleWatching(setIsWatching)}
                className={`d4m-p-1 d4m-rounded-full d4m-bg-${accentColor}-400 d4m-text-white ${currentTheme.button} d4m-transition-transform d4m-duration-200 d4m-active:scale-95`}
              >
                {isWatching ? (
                  <Eye className="d4m-w-4 d4m-h-4" />
                ) : (
                  <EyeOff className="d4m-w-4 d4m-h-4" />
                )}
              </button>
              <button
                onClick={() => {
                  setIsRecording(true);
                  startRecording();
                }}
                className={`d4m-p-1 d4m-rounded-full d4m-bg-${accentColor}-400 d4m-text-white ${currentTheme.button} d4m-transition-transform d4m-duration-200 d4m-active:scale-95 d4m-cursor-pointer`}
              >
                <Mic className="d4m-w-4 d4m-h-4" />
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`d4m-p-1 d4m-rounded-full d4m-bg-${accentColor}-400 d4m-text-white ${currentTheme.button} d4m-transition-transform d4m-duration-200 d4m-active:scale-95`}
              >
                <Settings className="d4m-w-4 d4m-h-4" />
              </button>
              {/* Added Chat List Button */}
              <button
                onClick={() => setIsChatListOpen(true)}
                className={`d4m-p-1 d4m-rounded-full d4m-bg-${accentColor}-400 d4m-text-white ${currentTheme.button} d4m-transition-transform d4m-duration-200 d4m-active:scale-95`}
                title="View Chat History"
              >
                <List className="d4m-w-4 d4m-h-4" /> {/* Use List icon */}
              </button>
            </div>
          </div>
        </div>
        {toast && (
          <ToastNotification
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
            duration={1000}
            animationDuration={300}
          />
        )}
        <div
          ref={messagesContainerRef}
          className={`d4m-flex-1 d4m-overflow-y-auto d4m-space-y-4 d4m-px-3 d4m-py-2 d4m-bg-transparent d4m-scrollbar-thin d4m-relative ${
            theme === "glassmorphism"
              ? "d4m-scrollbar-thumb-gray-500/50"
              : mode === "light"
              ? "d4m-scrollbar-thumb-gray-400"
              : "d4m-scrollbar-thumb-gray-600"
          } d4m-flex d4m-flex-col-reverse`}
        >
          {processedMessages.length === 0 &&
            !isLoading &&
            !isRecordingClicked && (
              <div className="d4m-flex d4m-flex-col d4m-items-center d4m-justify-center d4m-text-center d4m-p-6 d4m-animate-fade-in d4m-h-full">
                {" "}
                {/* Ensure it can fill height */}
                {/* Logo from public folder - ADJUST PATH/FILENAME IF NEEDED */}
                <img
                  src="/icons/icon128.png"
                  alt="Agent Logo"
                  className="d4m-w-16 d4m-h-16 d4m-mb-4 d4m-opacity-80"
                />
                <h2
                  className={`d4m-text-lg d4m-font-semibold ${textColor} d4m-mb-2`}
                >
                  Welcome!
                </h2>
                <p className={`d4m-text-sm ${accentColor} d4m-mb-6`}>
                  How can I assist you today?
                </p>
                <p
                  className={`d4m-text-xs d4m-font-medium ${accentColor} d4m-mb-3`}
                >
                  Try an example:
                </p>
                <div className="d4m-flex d4m-flex-wrap d4m-gap-2 d4m-justify-center d4m-max-w-xs">
                  {/* Map over your suggestions array */}
                  {suggestions.slice(0, 4).map(
                    (
                      suggestion // Show first 4 suggestions
                    ) => (
                      <button
                        key={suggestion}
                        onClick={() =>
                          handleChipClick(suggestion, setInput, textareaRef)
                        }
                        // Apply theme styles for consistency
                        className={`d4m-text-xs ${currentTheme.suggestion} d4m-px-3 d4m-py-1 hover:d4m-opacity-80 d4m-transition-opacity d4m-rounded-full`}
                      >
                        {suggestion}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          {isRecordingClicked ? (
            <RecordingMic
              accentColor={accentColor}
              textColor={textColor}
              onStop={() => {
                stopRecording();
                setIsRecording(false);
              }}
              transcript={liveTranscript}
            />
          ) : (
            <React.Fragment>
              {processedMessages.map((item, index) => {
                if (item.type === "single") {
                  const message = item.message!;
                  return (
                    <div key={index} className="d4m-flex d4m-flex-col d4m-mb-4">
                      <div
                        className={`d4m-text-sm d4m-p-2 ${
                          message.role === "user"
                            ? `${currentTheme.messageBubble} ${textColor}`
                            : "d4m-bg-transparent d4m-border-none"
                        } ${textColor}`}
                      >
                        {message.role === "model" ? (
                          <MarkdownWrapper
                            content={message.content as string}
                          />
                        ) : (
                          <span>{message.content as string}</span>
                        )}
                      </div>
                    </div>
                  );
                } else if (item.type === "modelGroup") {
                  const formatTimestamp = (timestamp?: string) => {
                    if (!timestamp) return "";
                    const date = new Date(parseInt(timestamp, 10));
                    return isNaN(date.getTime())
                      ? ""
                      : date.toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        });
                  };
                  return (
                    <div key={index} className="d4m-flex d4m-flex-col d4m-mb-4">
                      {item.messages!.map((message, idx) => (
                        <div
                          key={idx}
                          className="d4m-flex d4m-flex-col d4m-mb-1 d4m-relative group"
                        >
                          <div
                            className={`d4m-text-sm d4m-p-2 d4m-bg-transparent d4m-border-none ${textColor}`}
                          >
                            <MarkdownWrapper
                              content={message.content as string}
                            />
                          </div>
                          {idx === 0 && item.timestamp && (
                            <span
                              className={`d4m-absolute d4m-top-0 d4m-left-0 d4m-text-xs ${
                                mode === "light"
                                  ? "d4m-text-gray-600"
                                  : "d4m-text-gray-500"
                              } d4m-opacity-0 group-hover:d4m-opacity-100 d4m-transition-opacity d4m-duration-200`}
                            >
                              {formatTimestamp(item.timestamp)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                } else if (item.type === "executionGroup") {
                  const isExpanded = expandedExecutions.has(index);
                  return (
                    <div
                      key={index}
                      className={`d4m-p-2 d4m-mb-8 ${currentTheme.executionGroup}`}
                    >
                      <div
                        className="d4m-flex d4m-justify-between d4m-items-center d4m-cursor-pointer"
                        onClick={() =>
                          toggleExecutionGroup(index, setExpandedExecutions)
                        }
                      >
                        <h6
                          className={`d4m-text-sm d4m-font-bold d4m-text-${accentColor}-400`}
                        >
                          Task Steps ({item.taskHistories!.length})
                        </h6>
                        {isExpanded ? (
                          <ChevronUp
                            className={`d4m-w-4 d4m-h-4 d4m-text-${accentColor}-400`}
                          />
                        ) : (
                          <ChevronDown
                            className={`d4m-w-4 d4m-h-4 d4m-text-${accentColor}-400`}
                          />
                        )}
                      </div>
                      {isExpanded && (
                        <div className="d4m-mt-2">
                          <table
                            className={`d4m-w-full d4m-text-sm ${
                              mode === "light"
                                ? "d4m-text-gray-700"
                                : "d4m-text-gray-300"
                            }`}
                          >
                            <thead>
                              <tr
                                className={`d4m-border-b ${
                                  theme === "glassmorphism"
                                    ? "d4m-border-gray-500/50"
                                    : borderColor
                                }`}
                              >
                                <th
                                  className={`d4m-py-1 d4m-px-2 d4m-text-left d4m-font-medium d4m-text-${accentColor}-400`}
                                >
                                  Step
                                </th>
                                <th
                                  className={`d4m-py-1 d4m-px-2 d4m-text-left d4m-font-medium d4m-text-${accentColor}-400`}
                                >
                                  Description
                                </th>
                                <th
                                  className={`d4m-py-1 d4m-px-2 d4m-text-center d4m-font-medium d4m-text-${accentColor}-400`}
                                >
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.taskHistories!.map((task, idx) => (
                                <tr
                                  key={idx}
                                  className={`d4m-border-b ${
                                    theme === "glassmorphism"
                                      ? "d4m-border-gray-500/50"
                                      : borderColor
                                  } d4m-last:border-b-0`}
                                >
                                  <td className="d4m-py-1 d4m-px-2">
                                    {idx + 1}
                                  </td>
                                  <td className="d4m-py-1 d4m-px-2">
                                    {task.step_number || "N/A"}
                                    {task.description && (
                                      <span
                                        className={`d4m-block d4m-text-xs ${
                                          mode === "light"
                                            ? "d4m-text-gray-600"
                                            : "d4m-text-gray-500"
                                        }`}
                                      >
                                        {task.description}
                                      </span>
                                    )}
                                  </td>
                                  <td className="d4m-py-1 d4m-px-2 d4m-text-center">
                                    {["PENDING", "pending"].includes(
                                      task.status
                                    ) ? (
                                      <span className="d4m-inline-flex d4m-items-center d4m-justify-center">
                                        <span
                                          className={`d4m-w-3 d4m-h-3 d4m-border-2 d4m-border-t-${accentColor}-400 ${
                                            theme === "glassmorphism"
                                              ? "d4m-border-gray-500/50"
                                              : borderColor
                                          } d4m-rounded-full d4m-animate-spin`}
                                        ></span>
                                      </span>
                                    ) : [
                                        "IN_PROGRESS",
                                        "in_progress",
                                        "in progress",
                                      ].includes(task.status) ? (
                                      <span className="d4m-inline-flex d4m-items-center d4m-justify-center">
                                        <span
                                          className={`d4m-w-3 d4m-h-3 d4m-border-2 d4m-border-t-yellow-400 ${
                                            theme === "glassmorphism"
                                              ? "d4m-border-gray-500/50"
                                              : borderColor
                                          } d4m-rounded-full d4m-animate-spin`}
                                        ></span>
                                      </span>
                                    ) : ["PASS", "pass", "passed"].includes(
                                        task.status
                                      ) ? (
                                      <Check className="d4m-w-4 d4m-h-4 d4m-text-green-400 d4m-mx-auto" />
                                    ) : ["FAIL", "fail", "failed"].includes(
                                        task.status
                                      ) ? (
                                      <X className="d4m-w-4 d4m-h-4 d4m-text-red-400 d4m-mx-auto" />
                                    ) : (
                                      <HelpCircle
                                        className={`d4m-w-4 d4m-h-4 ${
                                          mode === "light"
                                            ? "d4m-text-gray-500"
                                            : "d4m-text-gray-400"
                                        } d4m-mx-auto`}
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

              {isTextareaFocused && (
                <div
                  className={`d4m-absolute d4m-inset-0 d4m-flex d4m-items-center d4m-justify-center d4m-p-2 d4m-z-20 ${currentTheme.suggestion} d4m-bg-opacity-0 d4m-rounded-lg d4m-overflow-y-auto`}
                >
                  <div className="d4m-flex d4m-flex-wrap d4m-gap-1 d4m-justify-center d4m-items-center">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() =>
                          handleChipClick(suggestion, setInput, textareaRef)
                        }
                        className={`d4m-px-2 d4m-py-1 d4m-text-${accentColor}-400 d4m-text-xs ${currentTheme.suggestion} d4m-transition-transform d4m-duration-200 d4m-active:scale-95 d4m-rounded-md`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          )}
        </div>

        {isLoading ? (
          <div
            className={`d4m-w-full d4m-px-3 d4m-py-4 d4m-flex d4m-items-center d4m-justify-between ${currentTheme.loading}`}
          >
            {currentAnimation === "starfallCascade" && (
              <StarfallCascadeAnimation
                accentColor={accentColor}
                textColor={textColor}
              />
            )}
            <button
              onClick={handleStop(
                setIsLoading,
                setMessages,
                setError,
                setToast
              )}
              className={`d4m-p-2 d4m-text-white d4m-rounded-full ${currentTheme.stopButton.replace(
                "red",
                accentColor
              )} d4m-transition-transform d4m-duration-200 d4m-active:scale-95`}
            >
              <Square className="d4m-w-5 d4m-h-5" />
            </button>
          </div>
        ) : (
          <div className="d4m-relative d4m-px-3 d4m-py-4 d4m-w-full d4m-box-border d4m-z-20">
            <form
              onSubmit={(e) =>
                handleSubmit(
                  e,
                  input,
                  isLoading,
                  setInput,
                  setError,
                  setIsLoading,
                  setShowCommandPopup,
                  setCurrentAnimation,
                  setCommandHistory,
                  setHistoryIndex,
                  setMessages,
                  selectedModel,
                  setToast,
                  setIsTextareaFocused
                )
              }
            >
              <div className="d4m-flex d4m-items-center d4m-space-x-3 d4m-w-full d4m-max-w-[calc(100%-8px)]">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(
                        e,
                        input,
                        isLoading,
                        setInput,
                        setError,
                        setIsLoading,
                        setShowCommandPopup,
                        setCurrentAnimation,
                        setCommandHistory,
                        setHistoryIndex,
                        setMessages,
                        selectedModel,
                        setToast,
                        setIsTextareaFocused
                      );
                    }
                  }}
                  onFocus={() => {
                    console.log("[ChatWidget] Textarea onFocus triggered!"); // <-- ADD THIS LOG
                    // Make sure to call the function returned by handleFocus
                    handleFocus(setIsTextareaFocused, setShowCommandPopup)();
                  }}
                  onBlur={() => {
                    console.log("[ChatWidget] Textarea onBlur triggered!"); // <-- ADD THIS LOG
                    handleBlur(setIsTextareaFocused, setShowCommandPopup)();
                  }}
                  placeholder="Enter command..."
                  className={`d4m-flex-1 d4m-px-3 d4m-py-2 ${textColor} d4m-text-sm d4m-rounded-xl d4m-border-none ${
                    currentTheme.textarea
                  } d4m-focus:outline-none d4m-focus:ring-2 d4m-focus:ring-${accentColor}-500 ${
                    mode === "light"
                      ? "d4m-placeholder-gray-400"
                      : "d4m-placeholder-gray-500"
                  } d4m-resize-none d4m-box-border d4m-transition-all`}
                  disabled={isLoading}
                  rows={1}
                  style={{ height: "auto", overflowY: "hidden" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className={`d4m-p-2 d4m-text-white d4m-rounded-full ${currentTheme.sendButton.replace(
                    "amber",
                    accentColor
                  )} d4m-transition-transform d4m-duration-200 d4m-active:scale-95`}
                >
                  <Send className="d4m-w-5 d4m-h-5" />
                </button>
              </div>
            </form>
            {showCommandPopup && (
              <div
                className={`d4m-absolute d4m-bottom-[70px] d4m-left-3 d4m-right-3 d4m-bg-${
                  mode === "light" ? "gray-100" : "gray-800"
                } d4m-rounded-lg d4m-shadow-lg d4m-z-30 d4m-max-h-[150px] d4m-overflow-y-auto`}
              >
                {[...commandHistory].reverse().map((cmd, revIdx) => {
                  const idx = commandHistory.length - 1 - revIdx;
                  const isSelected = historyIndex === idx;
                  return (
                    <div
                      key={idx}
                      ref={isSelected ? selectedCommandRef : null}
                      onClick={() =>
                        handlePopupSelect(
                          cmd,
                          setInput,
                          setUserTypedInput,
                          setShowCommandPopup,
                          setHistoryIndex,
                          textareaRef
                        )
                      }
                      className={`d4m-px-3 d4m-py-2 d4m-text-sm ${textColor} d4m-cursor-pointer hover:d4m-bg-${accentColor}-500/20 ${
                        isSelected ? `d4m-bg-${accentColor}-500/30` : ""
                      }`}
                    >
                      {cmd}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdate={(newSettings) => {
          setTheme(
            (newSettings.theme as
              | "neumorphism"
              | "glassmorphism"
              | "claymorphism") || theme
          );
          setAccentColor(
            (newSettings.accentColor as
              | "rose"
              | "cyan"
              | "green"
              | "fuchsia"
              | "sky") || accentColor
          );
          setMode((newSettings.mode as "light" | "dark") || mode);
        }}
        theme={theme}
        accentColor={accentColor}
        mode={mode}
      />
      {/* Added ChatListModal */}
      <ChatListModal
        isOpen={isChatListOpen}
        onClose={() => setIsChatListOpen(false)}
        onChatSelect={async (chat: Chat) => {
          console.log("Selected chat:", chat._id, chat.title);
          setIsLoading(true); // Show loading indicator
          setError(null);
          try {
            // Fetch the full chat details, including messages
            const fullChat = await api.chats.getChatById(chat._id);
            if (fullChat && fullChat.messages) {
              // Map API messages to local Message type
              const localMessages: Message[] = fullChat.messages.map(
                (apiMsg) => ({
                  id: apiMsg._id, // Map _id to id
                  role: apiMsg.sender === "ai" ? "model" : apiMsg.sender, // Map sender to role ('ai' -> 'model')
                  content: apiMsg.content,
                  // Add other fields if necessary, or ensure they are optional in local Message type
                })
              );
              // Format messages using the existing function (which expects local Message type)
              const formatted = formatMessages(localMessages);
              setMessages(formatted);
              // Optionally save to storage as the current conversation
              await chrome.storage.local.set({
                conversationHistory: formatted,
              });
              setToast({ message: `Loaded chat: ${chat.title}`, type: "info" });
            } else {
              throw new Error("Chat messages not found.");
            }
          } catch (err) {
            console.error("Failed to load selected chat:", err);
            setError("Failed to load the selected chat.");
            setToast({ message: "Error loading chat.", type: "error" });
          } finally {
            setIsLoading(false);
            setIsChatListOpen(false); // Close modal regardless of success/failure
          }
        }}
        theme={theme}
        accentColor={accentColor}
        mode={mode}
      />
    </React.Fragment>
  );
}
