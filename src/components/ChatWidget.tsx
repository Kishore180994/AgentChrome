import React, { useState, useRef, useEffect } from "react";
import { chatWithOpenAI } from "../services/openai/api";
import { Send, Eye, EyeOff } from "lucide-react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string; // RichText or PlainText
  actions?: Array<{
    type: string;
    data: any;
  }>;
}

export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleWatching = () => {
    setIsWatching((watching) => !watching);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setIsLoading(true);

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMessage },
    ]);

    try {
      const response = await chatWithOpenAI(userMessage, isWatching);
      if (response.error) {
        setError(
          response.errorDetails?.message || "Error processing your request"
        );
        return;
      }

      // Add AI response to chat
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: response.text,
          actions: response.actions,
        },
      ]);
    } catch (err) {
      setError("Failed to send message. Please try again.");
      console.error("Error in chat:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className="
        ext-relative 
        ext-bg-gray-800/80 
        ext-rounded-xl
        ext-ring-1 ext-ring-inset ext-ring-gray-500/50
        ext-shadow-xl 
        ext-backdrop-blur-md
        ext-flex ext-flex-col 
        ext-w-full 
        ext-text-gray-100
        ext-resize-y 
        ext-overflow-auto
        ext-min-h-[300px] 
        ext-max-h-[80vh]
      "
    >
      {/* Header */}
      <div className="ext-p-4 ext-border-b ext-border-gray-700 ext-flex ext-justify-between ext-items-center ext-bg-transparent">
        <h2 className="ext-text-sm ext-font-semibold ext-text-cyan-200">
          Chat with AI
        </h2>
        <button
          onClick={toggleWatching}
          className={`
            ext-p-2 ext-rounded-md ext-transition-colors ext-flex ext-items-center ext-gap-1
            ${
              isWatching
                ? "ext-bg-cyan-700/20 ext-text-cyan-200 ext-ring-1 ext-ring-cyan-400"
                : "ext-bg-gray-700 ext-text-gray-300 ext-ring-1 ext-ring-gray-500/50 ext-hover:bg-gray-600"
            }
          `}
          title={isWatching ? "Stop Watching" : "Start Watching"}
        >
          {isWatching ? (
            <>
              <Eye className="ext-w-5 ext-h-5" />
              <span className="ext-text-xs ext-font-medium">Watching</span>
            </>
          ) : (
            <>
              <EyeOff className="ext-w-5 ext-h-5" />
              <span className="ext-text-xs ext-font-medium">Not Watching</span>
            </>
          )}
        </button>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="ext-flex-1 ext-overflow-y-auto ext-p-4 ext-space-y-3 ext-bg-transparent"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`ext-flex ${
              message.role === "user" ? "ext-justify-end" : "ext-justify-start"
            }`}
          >
            <div
              className={`ext-rounded-lg ext-px-4 ext-py-2 ext-text-sm ext-max-w-[80%] ${
                message.role === "user"
                  ? "ext-bg-cyan-700 ext-text-white ext-self-end"
                  : "ext-bg-gray-700 ext-text-gray-100 ext-self-start"
              }`}
            >
              {message.role === "user" ? (
                <div>{message.content}</div>
              ) : (
                <Markdown
                  components={{
                    code({ children, className }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return match ? (
                        <SyntaxHighlighter language={match[1]} style={oneDark}>
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className={`ext-bg-gray-900/80 ext-px-1 ext-py-0.5 ext-text-sm ${
                            className || ""
                          }`}
                        >
                          {children}
                        </code>
                      );
                    },
                    h1: ({ children }) => (
                      <h1 className="ext-text-lg ext-font-semibold ext-mt-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="ext-text-base ext-font-medium ext-mt-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="ext-text-sm ext-font-medium ext-mt-2">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="ext-mt-1 ext-text-sm ext-leading-relaxed">
                        {children}
                      </p>
                    ),
                  }}
                >
                  {message.content}
                </Markdown>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="ext-flex ext-justify-start">
            <div
              className="
                ext-bg-gray-700 ext-text-gray-200 ext-rounded-lg 
                ext-px-4 ext-py-2 ext-text-sm ext-italic ext-relative 
                ext-overflow-hidden
              "
            >
              Thinking...
              <span className="ext-absolute ext-inset-0 ext-bg-gradient-to-r ext-from-transparent ext-via-white ext-to-transparent ext-opacity-30 ext-animate-pulse" />
            </div>
          </div>
        )}

        {error && (
          <div className="ext-flex ext-justify-center">
            <div className="ext-bg-red-700 ext-text-red-100 ext-rounded-lg ext-px-4 ext-py-2 ext-text-sm">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="ext-p-3 ext-border-t ext-border-gray-700 ext-bg-transparent"
      >
        <div className="ext-flex ext-items-center ext-space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="
              ext-flex-1 ext-px-3 ext-py-2 
              ext-bg-gray-900 ext-border ext-border-gray-600
              ext-rounded-md ext-text-sm 
              ext-placeholder-gray-600 ext-text-gray-200
              ext-focus:outline-none ext-focus:ring-2 ext-focus:ring-cyan-500
            "
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`
              ext-flex ext-items-center ext-justify-center ext-px-4 ext-py-2 ext-rounded-md
              ext-transition-all
              ${
                isLoading || !input.trim()
                  ? "ext-bg-gray-600 ext-text-gray-300 ext-cursor-not-allowed"
                  : "ext-bg-cyan-600 ext-text-white ext-hover:bg-cyan-700"
              }
            `}
          >
            <Send className="ext-w-5 ext-h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
