import React from "react";
import { Message, ProcessedMessage } from "./chatInterface";
import { HubSpotExecutionResult } from "../../services/ai/interfaces";
import MarkdownWrapper from "../MarkDownWrapper";
import HubspotErrorCard from "../HubspotErrorCard";
import HubspotSuccessCard from "../HubspotSuccessCard";
import { AccentColor } from "../../utils/themes";
import { linkifyUrls } from "../../utils/helpers";
import { ChevronUp, ChevronDown, Check, X, HelpCircle } from "lucide-react";

// Define ThemeStyle type
interface ThemeStyle {
  container?: string;
  messageBubble?: string;
  suggestion?: string;
  [key: string]: string | undefined;
}

interface MessageRendererProps {
  processedMessages: ProcessedMessage[];
  textColor: string;
  currentTheme: ThemeStyle;
  accentColor: AccentColor;
  mode: "light" | "dark";
  expandedExecutions: Set<number>;
  handleToggleExecution: (index: number) => void;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({
  processedMessages,
  textColor,
  currentTheme,
  accentColor,
  mode,
  expandedExecutions,
  handleToggleExecution,
}) => {
  return (
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
          // Align user messages to the right
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

          // Use full width for AI messages, keep user messages at the current width
          const widthClass =
            message.role === "user"
              ? "d4m-max-w-[85%] md:d4m-max-w-[75%]"
              : "d4m-w-full";

          // Apply futuristic styles to AI messages - make AI messages truly take full width
          const messageContainerStyle =
            message.role === "user"
              ? `d4m-flex ${widthClass} ${alignment} d4m-mb-3`
              : `d4m-flex d4m-w-full d4m-mb-3 d4m-justify-start`; // Full width container, left-aligned

          // Enhanced styling for AI message bubbles - make AI bubbles take full width
          const enhancedBubbleStyle =
            message.role === "model"
              ? `d4m-text-sm d4m-p-4 d4m-rounded-lg ${bubbleStyle} d4m-border-l-4 ${
                  accentColor === "white"
                    ? "d4m-border-orange-500"
                    : `d4m-border-${accentColor}-500`
                } d4m-backdrop-blur-sm ${
                  mode === "light" ? "d4m-bg-opacity-80" : "d4m-bg-opacity-90"
                } d4m-transition-all d4m-duration-300 d4m-w-full`
              : `d4m-text-sm d4m-p-2.5 d4m-rounded-lg ${bubbleStyle} d4m-shadow-sm`;

          return (
            <div key={itemKey} className={messageContainerStyle}>
              <div className={enhancedBubbleStyle}>
                {message.role === "model" ? (
                  // --- Model Message Content ---
                  "type" in message && message.type === "hubspot_error" ? (
                    // The Message type can have both standalone props and content
                    // Try to use the top-level props first, then fall back to content
                    <HubspotErrorCard
                      errorType={
                        message.errorType ||
                        (message.content &&
                        typeof message.content === "object" &&
                        "errorType" in message.content
                          ? message.content.errorType
                          : "general")
                      }
                      message={
                        message.message ||
                        (message.content &&
                        typeof message.content === "object" &&
                        "error" in message.content
                          ? message.content.error
                          : "An error occurred")
                      }
                      details={JSON.stringify(
                        message.details ||
                          (message.content &&
                          typeof message.content === "object"
                            ? message.content
                            : {}),
                        null,
                        2
                      )}
                      status={message.status || 0}
                      mode={mode}
                    />
                  ) : "type" in message &&
                    message.type === "hubspot_success" &&
                    typeof message.content === "object" ? (
                    <HubspotSuccessCard
                      result={message.content as HubSpotExecutionResult}
                      mode={mode}
                      accentColor={accentColor}
                      currentTheme={currentTheme}
                    />
                  ) : "type" in message && message.type === "question" ? (
                    // Question message from AI with futuristic design
                    <div className="d4m-flex d4m-flex-col d4m-gap-3">
                      <div className="d4m-flex d4m-items-center d4m-gap-2 d4m-bg-black/10 dark:d4m-bg-white/10 d4m-p-2 d4m-rounded-md d4m-backdrop-blur-sm">
                        <HelpCircle
                          size={18}
                          className={
                            accentColor === "white"
                              ? "d4m-text-orange-400"
                              : `d4m-text-${accentColor}-400`
                          }
                        />
                        <span className="d4m-font-medium d4m-text-base d4m-tracking-wide">
                          AI Question
                        </span>
                      </div>
                      <div className="d4m-pl-2">
                        <MarkdownWrapper content={message.content as string} />
                      </div>
                    </div>
                  ) : "type" in message && message.type === "completion" ? (
                    // Completion message from AI with futuristic design
                    <div className="d4m-flex d4m-flex-col d4m-gap-3">
                      <div className="d4m-flex d4m-items-center d4m-gap-2 d4m-bg-green-500/20 dark:d4m-bg-green-500/20 d4m-p-2 d4m-rounded-md d4m-backdrop-blur-sm">
                        <Check
                          size={18}
                          className="d4m-text-green-500 dark:d4m-text-green-400"
                        />
                        <span className="d4m-font-medium d4m-text-base d4m-tracking-wide d4m-text-green-700 dark:d4m-text-green-400">
                          Task Completed
                        </span>
                      </div>
                      <div className="d4m-pl-2">
                        <MarkdownWrapper content={message.content as string} />
                      </div>
                    </div>
                  ) : typeof message.content === "string" ? (
                    // Standard markdown for string content
                    <MarkdownWrapper content={message.content} />
                  ) : typeof message.content === "object" &&
                    message.content !== null &&
                    !Array.isArray(message.content) &&
                    "success" in message.content ? (
                    // Handle HubSpot result that wasn't properly typed
                    message.content.success === true ? (
                      <HubspotSuccessCard
                        result={message.content as HubSpotExecutionResult}
                        mode={mode}
                        accentColor={accentColor}
                        currentTheme={currentTheme}
                      />
                    ) : (
                      <HubspotErrorCard
                        errorType={message.content.errorType || "general"}
                        message={message.content.error || "Unknown error"}
                        details={message.content.details}
                        status={0}
                        mode={mode}
                      />
                    )
                  ) : (
                    // Fallback for unknown model content - display as JSON with futuristic styling
                    <pre className="d4m-text-xs d4m-whitespace-pre-wrap d4m-bg-black/20 dark:d4m-bg-white/5 d4m-p-3 d4m-rounded-md d4m-overflow-auto d4m-max-h-[300px] d4m-border d4m-border-gray-200/30 dark:d4m-border-gray-700/30 d4m-backdrop-blur-sm d4m-font-mono">
                      <div className="d4m-flex d4m-items-center d4m-justify-between d4m-mb-2 d4m-pb-2 d4m-border-b d4m-border-gray-200/30 dark:d4m-border-gray-700/30">
                        <span
                          className={`d4m-text-xs d4m-font-medium ${
                            accentColor === "white"
                              ? "d4m-text-orange-400"
                              : `d4m-text-${accentColor}-400`
                          }`}
                        >
                          JSON Data
                        </span>
                      </div>
                      <code className="d4m-text-gray-800 dark:d4m-text-gray-200">
                        {JSON.stringify(message.content, null, 2)}
                      </code>
                    </pre>
                  )
                ) : (
                  // --- User message content ---
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
              className={`d4m-flex d4m-flex-col d4m-gap-1 d4m-w-full d4m-mr-auto d4m-mb-3`}
            >
              {item.messages!.map((msg, msgIdx) => (
                <div
                  key={msg.id || msgIdx}
                  className={`d4m-text-sm d4m-p-4 d4m-rounded-lg ${
                    mode === "light" ? "d4m-bg-gray-100" : "d4m-bg-gray-700"
                  } ${textColor} d4m-border-l-4 ${
                    accentColor === "white"
                      ? "d4m-border-orange-500"
                      : `d4m-border-${accentColor}-500`
                  } d4m-backdrop-blur-sm ${
                    mode === "light" ? "d4m-bg-opacity-80" : "d4m-bg-opacity-90"
                  } d4m-transition-all d4m-duration-300 d4m-w-full`}
                >
                  {typeof msg.content === "string" ? (
                    <MarkdownWrapper content={msg.content} />
                  ) : // Handle potential objects within model groups too
                  "type" in msg && msg.type === "hubspot_error" ? (
                    <HubspotErrorCard
                      errorType={
                        msg.errorType ||
                        (msg.content &&
                        typeof msg.content === "object" &&
                        "errorType" in msg.content
                          ? msg.content.errorType
                          : "general")
                      }
                      message={
                        msg.message ||
                        (msg.content &&
                        typeof msg.content === "object" &&
                        "error" in msg.content
                          ? msg.content.error
                          : "An error occurred")
                      }
                      details={JSON.stringify(
                        msg.details ||
                          (msg.content && typeof msg.content === "object"
                            ? msg.content
                            : {}),
                        null,
                        2
                      )}
                      status={msg.status || 0}
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
                    <pre className="d4m-text-xs d4m-whitespace-pre-wrap d4m-bg-black/20 dark:d4m-bg-white/5 d4m-p-3 d4m-rounded-md d4m-overflow-auto d4m-max-h-[300px] d4m-border d4m-border-gray-200/30 dark:d4m-border-gray-700/30 d4m-backdrop-blur-sm d4m-font-mono">
                      <div className="d4m-flex d4m-items-center d4m-justify-between d4m-mb-2 d4m-pb-2 d4m-border-b d4m-border-gray-200/30 dark:d4m-border-gray-700/30">
                        <span
                          className={`d4m-text-xs d4m-font-medium ${
                            accentColor === "white"
                              ? "d4m-text-orange-400"
                              : `d4m-text-${accentColor}-400`
                          }`}
                        >
                          JSON Data
                        </span>
                      </div>
                      <code className="d4m-text-gray-800 dark:d4m-text-gray-200">
                        {JSON.stringify(msg.content, null, 2)}
                      </code>
                    </pre>
                  )}
                </div>
              ))}
            </div>
          );
        }
        // We no longer render executionGroup type messages in chat
        // as they've been moved to the TaskSection component above the input area
        else if (item.type === "executionGroup") {
          return null; // Don't render execution groups in the chat messages
        }
        return null;
      })}
    </React.Fragment>
  );
};

export default MessageRenderer;
