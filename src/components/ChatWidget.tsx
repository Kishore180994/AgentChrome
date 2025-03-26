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
} from "lucide-react";
import MarkdownWrapper from "./MarkDownWrapper";
import { StepState } from "../types/responseFormat";

// Define the Message interface
interface Message {
  id: string;
  role: "user" | "model" | "execution";
  content: string | StepState[];
}

// Define the ProcessedMessage interface
interface ProcessedMessage {
  type: "single" | "modelGroup" | "executionGroup";
  message?: Message;
  messages?: Message[];
  taskHistories?: StepState[];
  timestamp?: string;
}

export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [processedMessages, setProcessedMessages] = useState<
    ProcessedMessage[]
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [expandedExecutions, setExpandedExecutions] = useState<Set<number>>(
    new Set()
  );
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = [
    "Open a new tab with Google",
    "Summarize this page",
    "Extract text from this page",
    "Search for 'AI tools' on Bing",
    "Navigate to x.com",
    "Click the first link on the page",
    "Fill form with my details",
    "Scroll to the bottom of the page",
  ];

  // Scroll to bottom when messages update
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    };
    scrollToBottom();
    const timeoutId = setTimeout(scrollToBottom, 0);
    return () => clearTimeout(timeoutId);
  }, [processedMessages, isLoading, error]);

  // Process messages into groups
  const processMessages = (msgs: Message[]) => {
    const processed: ProcessedMessage[] = [];
    let currentModelGroup: Message[] = [];

    msgs.forEach((message) => {
      if (message.role === "model") {
        if (currentModelGroup.length === 0) {
          currentModelGroup.push({
            ...message,
            id: new Date().toLocaleTimeString(),
          });
        } else {
          currentModelGroup.push(message);
        }
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
        processed.push({
          type: "executionGroup",
          taskHistories: message.content as StepState[],
        });
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

    if (currentModelGroup.length > 0) {
      processed.push({
        type: "modelGroup",
        messages: currentModelGroup,
        timestamp: currentModelGroup[0].id,
      });
    }

    setProcessedMessages(processed);
  };

  // Handle background messages
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
            if (prev.length > 0 && prev[prev.length - 1].role === "execution") {
              // Update the last execution message
              const updatedMessages = [...prev];
              updatedMessages[updatedMessages.length - 1] = {
                ...updatedMessages[updatedMessages.length - 1],
                content: steps,
              };
              return updatedMessages;
            } else {
              // Add a new execution message (shouldn't happen after handleSubmit)
              return [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "execution",
                  content: steps,
                },
              ];
            }
          });
        }
        sendResponse({ success: true });
      } else if (message.type === "COMMAND_RESPONSE") {
        let content: string;
        if (typeof message.response === "string") {
          content = message.response;
        } else if (message.response.message) {
          content = message.response.message;
          if (message.response.output) {
            content += `\n\n**Result:** ${
              typeof message.response.output === "string"
                ? message.response.output
                : JSON.stringify(message.response.output, null, 2)
            }`;
          }
        } else {
          const { data } = message.response;
          const { text, output } = data || {};
          const formattedOutput =
            typeof output === "string"
              ? output
              : JSON.stringify(output, null, 2);
          content = `${text || "Task result"}\n\n\`\`\`json\n${
            formattedOutput || "No output"
          }\n\`\`\``;
        }
        console.log(
          "[ChatWidget] Processed COMMAND_RESPONSE content:",
          content
        );
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "model", content },
        ]);
        setIsLoading(false);
        sendResponse({ success: true });
      } else if (message.type === "FINISH_PROCESS_COMMAND") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "model",
            content: "Command processing finished.",
          },
        ]);
        setIsLoading(false);
        sendResponse({ success: true });
      } else if (message.type === "UPDATE_SIDEPANEL") {
        if (message.question) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "model",
              content: message.question,
            },
          ]);
          sendResponse({ success: true });
        }
      }
      return true;
    };

    chrome.runtime.onMessage.addListener(handleBackgroundMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleBackgroundMessage);
    };
  }, []);

  // Update processed messages when messages change
  useEffect(() => {
    processMessages(messages);
  }, [messages]);

  // Handle user command submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setIsLoading(true);
    setIsTextareaFocused(false);

    // Add user message and initial execution message
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMessage },
      { id: (Date.now() + 1).toString(), role: "execution", content: [] },
    ]);

    try {
      chrome.runtime.sendMessage(
        { type: "PROCESS_COMMAND", command: userMessage },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error from background:", chrome.runtime.lastError);
          } else {
            console.log("Response from background:", response);
          }
        }
      );
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message.");
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    try {
      chrome.runtime.sendMessage({ type: "STOP_AUTOMATION" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "Non-critical error stopping automation:",
            chrome.runtime.lastError
          );
        } else {
          console.log("Automation stopped:", response);
          setIsLoading(false);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "model",
              content: "Automation stopped by user.",
            },
          ]);
        }
      });
    } catch (err) {
      console.error("Failed to send stop message:", err);
      setError("Failed to stop automation.");
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    try {
      chrome.runtime.sendMessage({ type: "NEW_CHAT" }, () => {
        setMessages([]);
        setProcessedMessages([]);
        setError(null);
        setIsLoading(false);
      });
    } catch (err) {
      console.error("Failed to send NEW_CHAT message:", err);
      setError("Failed to start new chat.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleExecutionGroup = (index: number) => {
    setExpandedExecutions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  };

  const handleChipClick = (suggestion: string) => {
    setInput(suggestion);
    setIsTextareaFocused(false);
    textareaRef.current?.blur();
  };

  const toggleWatching = () => setIsWatching((prev) => !prev);

  const handleFocus = () => setIsTextareaFocused(true);
  const handleBlur = () => setTimeout(() => setIsTextareaFocused(false), 200);

  return (
    <div className="d4m-w-full d4m-h-full d4m-flex d4m-flex-col d4m-bg-gray-900 d4m-text-gray-100">
      {/* Header */}
      <div className="d4m-flex d4m-justify-between d4m-items-center d4m-px-2 d4m-py-2 d4m-border-b d4m-border-cyan-700/40">
        <div className="d4m-text-base d4m-font-bold d4m-text-cyan-400 d4m-text-shadow-[0_0_8px_rgba(0,255,255,0.7)]">
          D4M Agent
        </div>
        <div className="d4m-flex d4m-items-center d4m-space-x-2">
          <button
            onClick={handleNewChat}
            className="d4m-px-2 d4m-py-1 d4m-bg-gray-800 d4m-text-cyan-400 d4m-text-xs d4m-rounded d4m-border d4m-border-cyan-500/50 d4m-hover:bg-gray-700 d4m-transition-colors"
          >
            New Chat
          </button>
          <button
            onClick={toggleWatching}
            className="d4m-p-1 d4m-rounded-full d4m-bg-gray-800 d4m-text-gray-400 d4m-ring-1 d4m-ring-cyan-500/50 d4m-hover:bg-gray-700"
          >
            {isWatching ? (
              <Eye className="d4m-w-4 d4m-h-4" />
            ) : (
              <EyeOff className="d4m-w-4 d4m-h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="d4m-h-[calc(100%-140px)] d4m-overflow-y-auto d4m-space-y-2 d4m-px-2 d4m-py-2 d4m-scrollbar-thin d4m-scrollbar-thumb-cyan-500/50 d4m-relative"
      >
        {processedMessages.map((item, index) => {
          if (item.type === "single") {
            const message = item.message!;
            return (
              <div key={index} className="d4m-flex d4m-flex-col d4m-mb-2">
                <div className="d4m-flex d4m-items-center d4m-space-x-1 d4m-mb-1">
                  {message.role === "user" ? (
                    <div className="d4m-w-5 d4m-h-5 d4m-rounded-full d4m-bg-gray-700 d4m-flex d4m-items-center d4m-justify-center">
                      <span className="d4m-text-white d4m-text-[10px]">U</span>
                    </div>
                  ) : (
                    <div className="d4m-w-5 d4m-h-5 d4m-rounded-full d4m-bg-gray-700 d4m-flex d4m-items-center d4m-justify-center">
                      <span className="d4m-text-white d4m-text-[10px]">AI</span>
                    </div>
                  )}
                  <span className="d4m-text-xs d4m-font-medium d4m-text-white">
                    {message.role === "user" ? "You" : "D4M Agent"}
                  </span>
                </div>
                <div className="d4m-text-white d4m-text-xs d4m-ml-6">
                  {message.role === "model" ? (
                    <MarkdownWrapper content={message.content as string} />
                  ) : (
                    <span>{message.content as string}</span>
                  )}
                </div>
              </div>
            );
          } else if (item.type === "modelGroup") {
            return (
              <div key={index} className="d4m-flex d4m-flex-col d4m-mb-2">
                {item.messages!.map((message, idx) => (
                  <div key={idx} className="d4m-flex d4m-flex-col d4m-mb-1">
                    <div className="d4m-flex d4m-items-center d4m-space-x-1 d4m-mb-1">
                      <div className="d4m-w-5 d4m-h-5 d4m-rounded-full d4m-bg-gray-700 d4m-flex d4m-items-center d4m-justify-center">
                        <span className="d4m-text-white d4m-text-[10px]">
                          AI
                        </span>
                      </div>
                      <span className="d4m-text-xs d4m-font-medium d4m-text-white">
                        D4M Agent
                      </span>
                      {idx === 0 && item.timestamp && (
                        <span className="d4m-text-[10px] d4m-text-gray-400">
                          ({item.timestamp})
                        </span>
                      )}
                    </div>
                    <div className="d4m-ml-6">
                      <MarkdownWrapper content={message.content as string} />
                    </div>
                  </div>
                ))}
              </div>
            );
          } else if (item.type === "executionGroup") {
            const isExpanded = expandedExecutions.has(index);
            return (
              <div
                key={index}
                className="d4m-bg-gray-800 d4m-p-2 d4m-rounded d4m-mb-2 d4m-border d4m-border-cyan-500/30"
              >
                <div
                  className="d4m-flex d4m-justify-between d4m-items-center d4m-cursor-pointer"
                  onClick={() => toggleExecutionGroup(index)}
                >
                  <h6 className="d4m-text-xs d4m-font-bold d4m-text-cyan-400">
                    Task Steps ({item.taskHistories!.length})
                  </h6>
                  {isExpanded ? (
                    <ChevronUp className="d4m-w-4 d4m-h-4 d4m-text-cyan-400" />
                  ) : (
                    <ChevronDown className="d4m-w-4 d4m-h-4 d4m-text-cyan-400" />
                  )}
                </div>
                {isExpanded && (
                  <div className="d4m-mt-2">
                    <table className="d4m-w-full d4m-text-xs d4m-text-gray-300">
                      <thead>
                        <tr className="d4m-border-b d4m-border-cyan-500/20">
                          <th className="d4m-py-1 d4m-px-2 d4m-text-left d4m-font-medium d4m-text-cyan-400">
                            Step
                          </th>
                          <th className="d4m-py-1 d4m-px-2 d4m-text-left d4m-font-medium d4m-text-cyan-400">
                            Description
                          </th>
                          <th className="d4m-py-1 d4m-px-2 d4m-text-center d4m-font-medium d4m-text-cyan-400">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.taskHistories!.map((task, idx) => (
                          <tr
                            key={idx}
                            className="d4m-border-b d4m-border-gray-700/50 last:d4m-border-b-0"
                          >
                            <td className="d4m-py-1 d4m-px-2">{idx + 1}</td>
                            <td className="d4m-py-1 d4m-px-2">
                              {task.step_number}
                              {task.description && (
                                <span className="d4m-block d4m-text-[10px] d4m-text-gray-500">
                                  {task.description}
                                </span>
                              )}
                            </td>
                            <td className="d4m-py-1 d4m-px-2 d4m-text-center">
                              {["PENDING", "pending"].includes(task.status) ? (
                                <span className="d4m-inline-flex d4m-items-center d4m-justify-center">
                                  <span className="d4m-w-3 d4m-h-3 d4m-border-2 d4m-border-t-cyan-400 d4m-border-gray-700 d4m-rounded-full d4m-animate-spin"></span>
                                </span>
                              ) : [
                                  "IN_PROGRESS",
                                  "in_progress",
                                  "in progress",
                                ].includes(task.status) ? (
                                <span className="d4m-inline-flex d4m-items-center d4m-justify-center">
                                  <span className="d4m-w-3 d4m-h-3 d4m-border-2 d4m-border-t-yellow-400 d4m-border-gray-700 d4m-rounded-full d4m-animate-spin"></span>
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
                                <HelpCircle className="d4m-w-4 d4m-h-4 d4m-text-gray-400 d4m-mx-auto" />
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
        {isLoading && (
          <div className="d4m-bg-gray-800 d4m-text-cyan-300 d4m-p-2 d4m-rounded d4m-text-xs d4m-italic">
            Analyzing...
          </div>
        )}
        {error && (
          <div className="d4m-bg-red-800 d4m-text-red-100 d4m-p-2 d4m-rounded d4m-text-xs">
            {error}
          </div>
        )}

        {/* Floating Suggestions */}
        <div
          className={`d4m-absolute d4m-top-1/2 d4m-left-1/2 d4m-transform d4m--translate-x-1/2 d4m-flex d4m-flex-wrap d4m-gap-2 d4m-px-4 d4m-py-3 d4m-bg-gray-800/90 d4m-rounded-lg d4m-shadow-[0_0_10px_rgba(0,255,255,0.3)] d4m-z-10 d4m-w-[calc(100%-16px)] d4m-backdrop-blur-sm d4m-transition-all d4m-duration-300 ${
            isTextareaFocused
              ? "d4m-opacity-100 d4m-translate-y-[-50%]"
              : "d4m-opacity-0 d4m-translate-y-[50%] d4m-pointer-events-none"
          }`}
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleChipClick(suggestion)}
              className="d4m-px-3 d4m-py-1 d4m-bg-gray-700 d4m-text-cyan-400 d4m-text-[12px] d4m-rounded-full d4m-hover:bg-gray-600 d4m-transition-colors d4m-shadow-[0_0_3px_rgba(0,255,255,0.2)]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="d4m-px-2 d4m-py-2 d4m-bg-gray-900 d4m-border-t d4m-border-cyan-700/40 d4m-shadow-[0_0_10px_rgba(0,255,255,0.3)] d4m-w-full d4m-box-border d4m-pb-4"
      >
        <div className="d4m-flex d4m-items-center d4m-space-x-2 d4m-w-full d4m-max-w-[calc(100%-8px)]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Enter command..."
            className="d4m-flex-1 d4m-px-3 d4m-py-2 d4m-bg-gray-800/80 d4m-border d4m-border-cyan-500/50 d4m-rounded-lg d4m-text-sm d4m-text-white d4m-focus:outline-none d4m-focus:ring-2 d4m-focus:ring-cyan-400 d4m-placeholder-gray-500 d4m-resize-none d4m-box-border d4m-transition-all d4m-shadow-[inset_0_0_5px_rgba(0,255,255,0.2)] d4m-hover:shadow-[inset_0_0_8px_rgba(0,255,255,0.3)] d4m-backdrop-blur-sm"
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
            type={isLoading ? "button" : "submit"}
            onClick={isLoading ? handleStop : undefined}
            disabled={!isLoading && !input.trim()}
            className={`d4m-p-2 d4m-rounded-lg d4m-transition-all d4m-duration-200 d4m-flex-shrink-0 d4m-shadow-[0_0_8px_rgba(255,0,0,0.5)] d4m-hover:shadow-[0_0_12px_rgba(255,0,0,0.7)] ${
              isLoading
                ? "d4m-bg-red-600 d4m-text-white d4m-hover:bg-red-700"
                : "d4m-bg-cyan-600 d4m-text-white d4m-hover:bg-cyan-700 d4m-shadow-[0_0_8px_rgba(0,255,255,0.5)] d4m-hover:shadow-[0_0_12px_rgba(0,255,255,0.7)] d4m-disabled:bg-gray-600 d4m-disabled:cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <Square className="d4m-w-5 d4m-h-5" />
            ) : (
              <Send className="d4m-w-5 d4m-h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
