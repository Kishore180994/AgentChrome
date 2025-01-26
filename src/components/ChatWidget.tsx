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

  // Scroll to the bottom when new messages are added
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
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
          content: response.text, // ChatGPT response is in Markdown
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
    <div className="flex flex-col h-full w-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-base font-medium text-gray-800">Chat with AI</h2>
        <button
          onClick={toggleWatching}
          className={`p-2 rounded-md transition-colors ${
            isWatching
              ? "bg-blue-100 text-blue-600"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          title={isWatching ? "Stop Watching" : "Start Watching"}
        >
          {isWatching ? (
            <Eye className="w-5 h-5" />
          ) : (
            <EyeOff className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`rounded-lg px-4 py-2 text-sm ${
                message.role === "user"
                  ? "max-w-[80%] bg-blue-500 text-white self-end"
                  : "bg-gray-100 text-gray-800 self-start w-auto"
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
                          className={`bg-gray-200 rounded px-1 py-0.5 text-sm ${
                            className || ""
                          }`}
                        >
                          {children}
                        </code>
                      );
                    },
                    h1: ({ children }) => (
                      <h1 className="text-lg font-semibold mt-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-medium mt-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-medium mt-2">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="mt-1 text-sm leading-relaxed">{children}</p>
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
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-2 text-sm italic relative overflow-hidden">
              Thinking...
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-gloss" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-100 text-red-600 rounded-lg px-4 py-2 text-sm">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-gray-200 bg-gray-50"
      >
        <div className="flex items-center space-x-2">
          {/* Input Field */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isLoading}
          />
          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`flex items-center justify-center px-4 py-2 rounded-md transition-all ${
              isLoading || !input.trim()
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
