import React, { useState, useRef, useEffect } from "react";
import { Send, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { TaskHistory } from "../types/actionType";

// Define the Message interface
interface Message {
  id?: string;
  role: "user" | "model" | "execution";
  content: string | TaskHistory[];
  actions?: Array<{ type: string; data: any }>;
  timestamp?: string;
}

// Define the ProcessedMessage interface for grouped messages
interface ProcessedMessage {
  type: "single" | "modelGroup" | "executionGroup";
  message?: Message; // For single messages (e.g., user)
  messages?: Message[]; // For grouped model messages
  taskHistories?: TaskHistory[]; // For grouped task history steps
  timestamp?: string; // For model groups
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [processedMessages]);

  const toggleWatching = () => setIsWatching((prev) => !prev);

  // Process messages to group consecutive model messages and task history steps
  const processMessages = (messages: Message[]) => {
    const processed: ProcessedMessage[] = [];
    let currentModelGroup: Message[] = [];
    let currentExecutionGroup: TaskHistory[] = [];

    messages.forEach((message) => {
      if (message.role === "model") {
        // If there's an ongoing execution group, finalize it
        if (currentExecutionGroup.length > 0) {
          processed.push({
            type: "executionGroup",
            taskHistories: currentExecutionGroup,
          });
          currentExecutionGroup = [];
        }
        // Start or add to a model group
        if (currentModelGroup.length === 0) {
          currentModelGroup.push({
            ...message,
            timestamp: new Date().toLocaleTimeString(),
          });
        } else {
          currentModelGroup.push(message);
        }
      } else if (
        message.role === "execution" &&
        Array.isArray(message.content)
      ) {
        // If there's an ongoing model group, finalize it
        if (currentModelGroup.length > 0) {
          processed.push({
            type: "modelGroup",
            messages: currentModelGroup,
            timestamp: currentModelGroup[0].timestamp,
          });
          currentModelGroup = [];
        }
        // Add to execution group
        currentExecutionGroup.push(...(message.content as TaskHistory[]));
      } else {
        // Handle single messages (e.g., user messages)
        if (currentModelGroup.length > 0) {
          processed.push({
            type: "modelGroup",
            messages: currentModelGroup,
            timestamp: currentModelGroup[0].timestamp,
          });
          currentModelGroup = [];
        }
        if (currentExecutionGroup.length > 0) {
          processed.push({
            type: "executionGroup",
            taskHistories: currentExecutionGroup,
          });
          currentExecutionGroup = [];
        }
        processed.push({ type: "single", message });
      }
    });

    // Finalize any remaining groups
    if (currentModelGroup.length > 0) {
      processed.push({
        type: "modelGroup",
        messages: currentModelGroup,
        timestamp: currentModelGroup[0].timestamp,
      });
    }
    if (currentExecutionGroup.length > 0) {
      processed.push({
        type: "executionGroup",
        taskHistories: currentExecutionGroup,
      });
    }

    setProcessedMessages(processed);
  };

  // Listen for AI responses and execution updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type !== "COMMAND_RESPONSE") return;

      const { response: receivedResponse } = event.data;
      const { response, type } = receivedResponse;

      switch (type) {
        case "DISPLAY_MESSAGE":
          const { data } = response;
          const { text, output } = data;
          const formattedOutput =
            typeof output === "string"
              ? output
              : JSON.stringify(output, null, 2);
          const combinedContent = `${text}\n\n\`\`\`json\n${formattedOutput}\n\`\`\``;
          setMessages((prev) => [
            ...prev,
            { role: "model", content: combinedContent },
          ]);
          break;
        case "EXECUTION_UPDATE":
          const taskHistory = receivedResponse?.taskHistory as
            | TaskHistory[]
            | undefined;
          if (taskHistory) {
            setMessages((prev) => [
              ...prev,
              { role: "execution", content: taskHistory },
            ]);
          }
          break;
      }
      setIsLoading(false);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Reprocess messages when they change
  useEffect(() => processMessages(messages), [messages]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setIsLoading(true);

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMessage },
    ]);
    window.postMessage({ type: "USER_COMMAND", command: userMessage }, "*");
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

  return (
    <div className="d4m-w-full d4m-h-full d4m-border-cyan-500/30 d4m-shadow-2xl d4m-flex d4m-flex-col d4m-text-gray-100 d4m-p-4 d4m-rounded-xl">
      {/* Header */}
      <div className="d4m-flex d4m-justify-between d4m-items-center d4m-mb-4 d4m-pb-2 d4m-border-b d4m-border-cyan-700/40">
        <div className="d4m-text-lg d4m-font-bold d4m-tracking-wide d4m-text-cyan-400 d4m-text-shadow-[0_0_8px_rgba(0,255,255,0.7)]">
          D4M Agent
        </div>
        <button
          onClick={toggleWatching}
          className="d4m-p-2 d4m-rounded-full d4m-bg-gray-800 d4m-text-gray-400 d4m-ring-1 d4m-ring-cyan-500/50 d4m-hover:bg-gray-700"
        >
          {isWatching ? (
            <Eye className="d4m-w-5 d4m-h-5" />
          ) : (
            <EyeOff className="d4m-w-5 d4m-h-5" />
          )}
        </button>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="d4m-flex-1 d4m-overflow-y-auto d4m-space-y-4 d4m-px-2 d4m-scrollbar-thin d4m-scrollbar-thumb-cyan-500/50"
      >
        {processedMessages.map((item, index) => {
          if (item.type === "single") {
            const message = item.message!;
            return (
              <div key={index} className="d4m-flex d4m-flex-col d4m-mb-4">
                <div className="d4m-flex d4m-items-center d4m-space-x-2 d4m-mb-1">
                  {message.role === "user" ? (
                    <div className="d4m-w-6 d4m-h-6 d4m-rounded-full d4m-bg-gray-700 d4m-flex d4m-items-center d4m-justify-center">
                      <span className="d4m-text-white d4m-text-xs">AI</span>
                    </div>
                  ) : (
                    <div className="d4m-w-6 d4m-h-6 d4m-rounded-full d4m-bg-gray-700 d4m-flex d4m-items-center d4m-justify-center">
                      <span className="d4m-text-white d4m-text-xs">AI</span>
                    </div>
                  )}
                  <span className="d4m-text-sm d4m-font-medium d4m-text-white">
                    {message.role === "user" ? "You" : "D4M Agent"}
                  </span>
                </div>
                <div className="d4m-text-white d4m-text-sm d4m-ml-8">
                  <Markdown
                    components={{
                      code({ children, className }) {
                        const match = /language-(\w+)/.exec(className || "");
                        return match ? (
                          <SyntaxHighlighter
                            language={match[1]}
                            style={oneDark}
                            className="d4m-rounded-md d4m-shadow-inner"
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="d4m-bg-gray-900 d4m-px-1 d4m-py-0.5 d4m-rounded d4m-text-cyan-300">
                            {children}
                          </code>
                        );
                      },
                      p: ({ children }) => (
                        <p className="d4m-mt-1 d4m-text-sm d4m-leading-relaxed">
                          {children}
                        </p>
                      ),
                    }}
                  >
                    {message.content as string}
                  </Markdown>
                </div>
              </div>
            );
          } else if (item.type === "modelGroup") {
            return (
              <div key={index} className="d4m-flex d4m-flex-col d4m-mb-4">
                {item.messages!.map((message, idx) => (
                  <div key={idx} className="d4m-flex d4m-flex-col d4m-mb-2">
                    <div className="d4m-flex d4m-items-center d4m-space-x-2 d4m-mb-1">
                      <div className="d4m-w-6 d4m-h-6 d4m-rounded-full d4m-bg-gray-700 d4m-flex d4m-items-center d4m-justify-center">
                        <span className="d4m-text-white d4m-text-xs">AI</span>
                      </div>
                      <span className="d4m-text-sm d4m-font-medium d4m-text-white">
                        D4M Agent
                      </span>
                      {idx === 0 && item.timestamp && (
                        <span className="d4m-text-xs d4m-text-gray-400">
                          ({item.timestamp})
                        </span>
                      )}
                    </div>
                    <div className="d4m-text-white d4m-text-sm d4m-ml-8">
                      <Markdown
                        components={{
                          code({ children, className }) {
                            const match = /language-(\w+)/.exec(
                              className || ""
                            );
                            return match ? (
                              <SyntaxHighlighter
                                language={match[1]}
                                style={oneDark}
                                className="d4m-rounded-md d4m-shadow-inner"
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="d4m-bg-gray-900 d4m-px-1 d4m-py-0.5 d4m-rounded d4m-text-cyan-300">
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {message.content as string}
                      </Markdown>
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
                className="d4m-bg-gray-800 d4m-p-2 d4m-rounded-lg d4m-shadow-md d4m-mb-4 d4m-border d4m-border-cyan-500/30"
              >
                <div
                  className="d4m-flex d4m-justify-between d4m-items-center d4m-cursor-pointer"
                  onClick={() => toggleExecutionGroup(index)}
                >
                  <h6 className="d4m-font-bold d4m-text-cyan-400 d4m-mb-1">
                    Task Execution Steps
                  </h6>
                  {isExpanded ? (
                    <ChevronUp className="d4m-w-5 d4m-h-5 d4m-text-cyan-400" />
                  ) : (
                    <ChevronDown className="d4m-w-5 d4m-h-5 d4m-text-cyan-400" />
                  )}
                </div>
                {isExpanded && (
                  <ul className="d4m-space-y-2 d4m-mt-2">
                    {item.taskHistories!.map((taskHistory, idx) => (
                      <li
                        key={idx}
                        className="d4m-text-sm d4m-italic d4m-text-gray-300"
                      >
                        {taskHistory.step}: {taskHistory.status}{" "}
                        {taskHistory.message && `- ${taskHistory.message}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }
          return null;
        })}
        {isLoading && (
          <div className="d4m-bg-gray-800 d4m-text-cyan-300 d4m-p-3 d4m-rounded-lg d4m-text-sm d4m-italic">
            Analyzing...
          </div>
        )}
        {error && (
          <div className="d4m-bg-red-800 d4m-text-red-100 d4m-p-3 d4m-rounded-lg d4m-text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="d4m-mt-4 d4m-p-2 d4m-bg-gray-800 d4m-shadow-inner"
      >
        <div className="d4m-flex d4m-items-center d4m-space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="d4m-flex-1 d4m-px-3 d4m-py-2 d4m-bg-gray-900 d4m-border d4m-border-gray-700 d4m-rounded-md d4m-text-sm d4m-text-white d4m-focus:outline-none d4m-focus:ring-2 d4m-focus:ring-cyan-500 d4m-placeholder-gray-400 d4m-resize-none"
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
            disabled={isLoading || !input.trim()}
            className="d4m-bg-cyan-600 d4m-text-white d4m-hover:bg-cyan-700 d4m-p-2 d4m-rounded-md d4m-transition-colors d4m-duration-200 d4m-disabled:bg-gray-600 d4m-disabled:cursor-not-allowed"
          >
            <Send className="d4m-w-5 d4m-h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
