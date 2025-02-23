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
    <div className="ext-w-full ext-h-full ext-border-cyan-500/30 ext-shadow-2xl ext-flex ext-flex-col ext-text-gray-100 ext-p-4 ext-rounded-xl">
      {/* Header */}
      <div className="ext-flex ext-justify-between ext-items-center ext-mb-4 ext-pb-2 ext-border-b ext-border-cyan-700/40">
        <div className="ext-text-lg ext-font-bold ext-tracking-wide ext-text-cyan-400 ext-text-shadow-[0_0_8px_rgba(0,255,255,0.7)]">
          D4M Agent
        </div>
        <button
          onClick={toggleWatching}
          className="ext-p-2 ext-rounded-full ext-bg-gray-800 ext-text-gray-400 ext-ring-1 ext-ring-cyan-500/50 ext-hover:bg-gray-700"
        >
          {isWatching ? (
            <Eye className="ext-w-5 ext-h-5" />
          ) : (
            <EyeOff className="ext-w-5 ext-h-5" />
          )}
        </button>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="ext-flex-1 ext-overflow-y-auto ext-space-y-4 ext-px-2 ext-scrollbar-thin ext-scrollbar-thumb-cyan-500/50"
      >
        {processedMessages.map((item, index) => {
          if (item.type === "single") {
            const message = item.message!;
            return (
              <div key={index} className="ext-flex ext-flex-col ext-mb-4">
                <div className="ext-flex ext-items-center ext-space-x-2 ext-mb-1">
                  {message.role === "user" ? (
                    <img
                      src="https://via.placeholder.com/24"
                      alt="User"
                      className="ext-w-6 ext-h-6 ext-rounded-full"
                    />
                  ) : (
                    <div className="ext-w-6 ext-h-6 ext-rounded-full ext-bg-gray-700 ext-flex ext-items-center ext-justify-center">
                      <span className="ext-text-white ext-text-xs">AI</span>
                    </div>
                  )}
                  <span className="ext-text-sm ext-font-medium ext-text-white">
                    {message.role === "user" ? "You" : "D4M Agent"}
                  </span>
                </div>
                <div className="ext-text-white ext-text-sm ext-ml-8">
                  <Markdown
                    components={{
                      code({ children, className }) {
                        const match = /language-(\w+)/.exec(className || "");
                        return match ? (
                          <SyntaxHighlighter
                            language={match[1]}
                            style={oneDark}
                            className="ext-rounded-md ext-shadow-inner"
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="ext-bg-gray-900 ext-px-1 ext-py-0.5 ext-rounded ext-text-cyan-300">
                            {children}
                          </code>
                        );
                      },
                      p: ({ children }) => (
                        <p className="ext-mt-1 ext-text-sm ext-leading-relaxed">
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
              <div key={index} className="ext-flex ext-flex-col ext-mb-4">
                {item.messages!.map((message, idx) => (
                  <div key={idx} className="ext-flex ext-flex-col ext-mb-2">
                    <div className="ext-flex ext-items-center ext-space-x-2 ext-mb-1">
                      <div className="ext-w-6 ext-h-6 ext-rounded-full ext-bg-gray-700 ext-flex ext-items-center ext-justify-center">
                        <span className="ext-text-white ext-text-xs">AI</span>
                      </div>
                      <span className="ext-text-sm ext-font-medium ext-text-white">
                        D4M Agent
                      </span>
                      {idx === 0 && item.timestamp && (
                        <span className="ext-text-xs ext-text-gray-400">
                          ({item.timestamp})
                        </span>
                      )}
                    </div>
                    <div className="ext-text-white ext-text-sm ext-ml-8">
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
                                className="ext-rounded-md ext-shadow-inner"
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="ext-bg-gray-900 ext-px-1 ext-py-0.5 ext-rounded ext-text-cyan-300">
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
                className="ext-bg-gray-800 ext-p-2 ext-rounded-lg ext-shadow-md ext-mb-4 ext-border ext-border-cyan-500/30"
              >
                <div
                  className="ext-flex ext-justify-between ext-items-center ext-cursor-pointer"
                  onClick={() => toggleExecutionGroup(index)}
                >
                  <h6 className="ext-font-bold ext-text-cyan-400 ext-mb-1">
                    Task Execution Steps
                  </h6>
                  {isExpanded ? (
                    <ChevronUp className="ext-w-5 ext-h-5 ext-text-cyan-400" />
                  ) : (
                    <ChevronDown className="ext-w-5 ext-h-5 ext-text-cyan-400" />
                  )}
                </div>
                {isExpanded && (
                  <ul className="ext-space-y-2 ext-mt-2">
                    {item.taskHistories!.map((taskHistory, idx) => (
                      <li
                        key={idx}
                        className="ext-text-sm ext-italic ext-text-gray-300"
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
          <div className="ext-bg-gray-800 ext-text-cyan-300 ext-p-3 ext-rounded-lg ext-text-sm ext-italic">
            Analyzing...
          </div>
        )}
        {error && (
          <div className="ext-bg-red-800 ext-text-red-100 ext-p-3 ext-rounded-lg ext-text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="ext-mt-4 ext-p-2 ext-bg-gray-800 ext-shadow-inner"
      >
        <div className="ext-flex ext-items-center ext-space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="ext-flex-1 ext-px-3 ext-py-2 ext-bg-gray-900 ext-border ext-border-gray-700 ext-rounded-md ext-text-sm ext-text-white ext-focus:outline-none ext-focus:ring-2 ext-focus:ring-cyan-500 ext-placeholder-gray-400 ext-resize-none"
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
            className="ext-bg-cyan-600 ext-text-white ext-hover:bg-cyan-700 ext-p-2 ext-rounded-md ext-transition-colors ext-duration-200 ext-disabled:bg-gray-600 ext-disabled:cursor-not-allowed"
          >
            <Send className="ext-w-5 ext-h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
