import React, { useState, useRef, useEffect } from "react";
import { Send, Eye, EyeOff } from "lucide-react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// Message interface
interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
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

  // Auto-scroll to the latest message
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleWatching = () => {
    setIsWatching((prev) => !prev);
  };

  // Listen for AI responses from content.ts
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === "COMMAND_RESPONSE") {
        console.log("[ChatWidget] Received AI response:", event.data.response);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: event.data.response },
        ]);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Handle user input submission
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

    // **Send command to content.ts (content.ts will handle everything else)**
    window.postMessage({ type: "USER_COMMAND", command: userMessage }, "*");
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="ext-w-full ext-h-1/2 ext-bg-gradient-to-t ext-from-gray-900/90 ext-bg-gray-900/80 ext-backdrop-blur-xl ext-border-cyan-500/30 ext-shadow-2xl ext-flex ext-flex-col ext-text-gray-100 ext-p-4 ext-rounded-xl">
      {/* Header */}
      <div className="ext-flex ext-justify-between ext-items-center ext-mb-4 ext-pb-2 ext-border-b ext-border-cyan-700/40">
        <h2 className="ext-text-lg ext-font-bold ext-tracking-wide ext-text-cyan-400 ext-text-shadow-[0_0_8px_rgba(0,255,255,0.7)]">
          D4M Agent
        </h2>
        <button
          onClick={toggleWatching}
          className="ext-p-2 ext-rounded-full ext-transition-all ext-duration-200 ext-flex ext-items-center ext-gap-1 ext-bg-gray-800 ext-text-gray-400 ext-ring-1 ext-ring-cyan-500/50 ext-hover:bg-gray-700 ext-focus:outline-none ext-focus:ring-2 ext-focus:ring-cyan-500"
          title={isWatching ? "Stop Watching" : "Start Watching"}
        >
          {isWatching ? (
            <>
              <Eye className="ext-w-5 ext-h-5 ext-animate-pulse" />
              <span className="ext-text-xs ext-font-medium">Scanning</span>
            </>
          ) : (
            <>
              <EyeOff className="ext-w-5 ext-h-5" />
              <span className="ext-text-xs ext-font-medium">Idle</span>
            </>
          )}
        </button>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="ext-flex-1 ext-overflow-y-auto ext-space-y-4 ext-px-2 ext-scrollbar-thin ext-scrollbar-thumb-cyan-500/50 ext-scrollbar-track-gray-800"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`ext-flex ${
              message.role === "user" ? "ext-justify-end" : "ext-justify-start"
            }`}
          >
            <div
              className={`ext-max-w-[75%] ext-p-3 ext-rounded-lg ext-text-sm ${
                message.role === "user"
                  ? "ext-bg-cyan-800/80 ext-text-cyan-100 ext-shadow-cyan-500/20"
                  : "ext-bg-gray-800/80 ext-text-gray-200 ext-shadow-gray-500/20"
              } ext-shadow-md`}
            >
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
                      <code className="ext-bg-gray-900/70 ext-px-1 ext-py-0.5 ext-rounded ext-text-cyan-300">
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
                {message.content}
              </Markdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="ext-flex ext-justify-start">
            <div className="ext-bg-gray-800/80 ext-text-cyan-300 ext-p-3 ext-rounded-lg ext-text-sm ext-italic ext-relative ext-overflow-hidden ext-shadow-md">
              Analyzing...
              <span className="ext-absolute ext-inset-0 ext-bg-gradient-to-r ext-from-transparent ext-via-cyan-400/20 ext-to-transparent ext-opacity-50 ext-animate-pulse" />
            </div>
          </div>
        )}
        {error && (
          <div className="ext-flex ext-justify-center">
            <div className="ext-bg-red-800/80 ext-text-red-100 ext-p-3 ext-rounded-lg ext-text-sm ext-shadow-md">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="ext-mt-4 ext-p-2 ext-bg-gray-800/50 ext-border-t ext-border-cyan-700/40 ext-shadow-inner"
      >
        <div className="ext-flex ext-items-center ext-space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="ext-flex-1 ext-px-3 ext-py-2 ext-bg-gray-900/70 ext-border ext-border-gray-700/50 ext-rounded-md ext-text-sm ext-text-gray-100 ext-focus:outline-none ext-focus:ring-2 ext-focus:ring-cyan-500 ext-placeholder-gray-500"
            disabled={isLoading}
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
