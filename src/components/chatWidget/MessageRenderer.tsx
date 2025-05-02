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

          return (
            <div
              key={itemKey}
              className={`d4m-flex d4m-max-w-[85%] md:d4m-max-w-[75%] ${alignment} d4m-mb-3`}
            >
              <div
                className={`d4m-text-sm d4m-p-2.5 d4m-rounded-lg ${bubbleStyle} d4m-shadow-sm`}
              >
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
                        (message.content as HubSpotExecutionResult)?.details
                      }
                      status={
                        (message.content as HubSpotExecutionResult)?.success
                          ? 1 // Map true to 1
                          : 0 // Map false to 0
                      }
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
                    // Question message from AI
                    <div className="d4m-flex d4m-flex-col d4m-gap-2">
                      <div className="d4m-flex d4m-items-center d4m-gap-2">
                        <HelpCircle
                          size={16}
                          className={
                            accentColor === "white"
                              ? "d4m-text-orange-500"
                              : `d4m-text-${accentColor}-500`
                          }
                        />
                        <span className="d4m-font-semibold">AI Question</span>
                      </div>
                      <MarkdownWrapper content={message.content as string} />
                    </div>
                  ) : "type" in message && message.type === "completion" ? (
                    // Completion message from AI
                    <div className="d4m-flex d4m-flex-col d4m-gap-2">
                      <div className="d4m-flex d4m-items-center d4m-gap-2">
                        <Check size={16} className="d4m-text-green-500" />
                        <span className="d4m-font-semibold">
                          Task Completed
                        </span>
                      </div>
                      <MarkdownWrapper content={message.content as string} />
                    </div>
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
              className={`d4m-flex d4m-flex-col d4m-gap-1 d4m-max-w-[85%] md:d4m-max-w-[75%] d4m-mr-auto d4m-mb-3`}
            >
              {item.messages!.map((msg, msgIdx) => (
                <div
                  key={msg.id || msgIdx}
                  className={`d4m-text-sm d4m-p-2.5 d4m-rounded-lg ${
                    mode === "light" ? "d4m-bg-gray-100" : "d4m-bg-gray-700"
                  } ${textColor} d4m-shadow-sm`}
                >
                  {typeof msg.content === "string" ? (
                    <MarkdownWrapper content={msg.content} />
                  ) : // Handle potential objects within model groups too
                  "type" in msg &&
                    msg.type === "hubspot_error" &&
                    typeof msg.content === "object" ? (
                    <HubspotErrorCard {...(msg.content as any)} mode={mode} />
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
                onClick={() => handleToggleExecution(index)}
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
                  <table className={`d4m-w-full d4m-text-xs ${textColor}`}>
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
                          <td className="d4m-py-1.5 d4m-px-2">{taskIdx + 1}</td>
                          <td className="d4m-py-1.5 d4m-px-2">
                            {task.description || task.step_number || "N/A"}
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
  );
};

export default MessageRenderer;
