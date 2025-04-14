import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content, // SDK type for history/messages
  Part as GeminiSdkPart, // SDK type for message parts (renamed to avoid conflict if needed)
  InlineDataPart, // Specific SDK type for inline data
  TextPart,
  Tool, // Specific SDK type for text
} from "@google/generative-ai";
import { agentPrompt } from "../../utils/prompts"; // Assuming this exists and is a string

// Using your provided interfaces directly
import {
  ClaudeChatMessage,
  ClaudeChatContent,
  GeminiChatMessage,
  Role, // Your Role type
  // Other interfaces like BoundingBox, PageElement etc. are not directly used in API calls here
} from "./interfaces"; // Adjust path as needed

import { AgentResponseFormat } from "../../types/responseFormat"; // Assuming this type is defined correctly
import Anthropic from "@anthropic-ai/sdk";
import { googleWorkspaceTools } from "./tools";

// Single global references (Consider alternatives like dependency injection if managing state becomes complex)
let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: GenerativeModel | null = null;
let claudeClient: Anthropic | null = null;

// Use your Role type now
export type AIProvider = "gemini" | "claude";

// --- Helper Functions ---

/**
 * Helper to safely get text content from a Gemini or Claude message part/content.
 * Uses your specific interface definitions.
 */
export function getTextFromMessage(
  message: GeminiChatMessage | ClaudeChatMessage | Content // Accept GeminiChatMessage, ClaudeChatMessage, or SDK Content type
): string | undefined {
  // Handle GeminiChatMessage or SDK Content (which have 'parts')
  if ("parts" in message && !("content" in message)) {
    // Ensure 'parts' is an array
    if (!Array.isArray(message.parts)) return undefined;

    // --- CORRECTED LOGIC for GeminiSdkCompatiblePart ---
    // Find the first part that is specifically a text part
    const textPart = message.parts.find(
      // Type guard checks if 'part' has a 'text' property and it's a string
      (part): part is { text: string } => typeof (part as any).text === "string"
    );
    // Safely return the text if found
    return textPart?.text;
    // --- END CORRECTION ---
  }
  // Handle ClaudeChatMessage (which has 'content')
  else if ("content" in message && !("parts" in message)) {
    // Ensure 'content' is an array
    if (!Array.isArray(message.content)) return undefined;
    // Find the first content item of type 'text'
    const textContent = message.content.find(
      (content: ClaudeChatContent) => content.type === "text"
    );
    // Return its text property if found
    return textContent?.text;
  }

  // Return undefined if message structure doesn't match or no text found
  return undefined;
}
/**
 * Processes an array of chat messages according to your interfaces,
 * keeping full content for the last message and truncating earlier messages
 * at the '&&' delimiter based on their text content.
 */
function processTextData<T extends GeminiChatMessage | ClaudeChatMessage>(
  textData: T[]
): T[] {
  if (!Array.isArray(textData) || textData.length === 0) {
    return [];
  }

  const processedData: T[] = [];
  for (let i = 0; i < textData.length; i++) {
    const currentMessage = textData[i];
    if (i === textData.length - 1) {
      processedData.push(currentMessage);
    } else {
      const textContent = getTextFromMessage(currentMessage);

      if (typeof textContent === "string") {
        const delimiterIndex = textContent.indexOf("&&");
        if (delimiterIndex !== -1) {
          const truncatedText = textContent
            .substring(0, delimiterIndex)
            .trimEnd();

          // Reconstruct based on original message type (Gemini or Claude)
          if ("parts" in currentMessage) {
            // GeminiChatMessage
            // Create a new Parts array with only the truncated text
            const newParts: GeminiSdkPart[] = [{ text: truncatedText }];
            // Ensure fileData is not carried over if originally present and now truncated
            processedData.push({
              ...currentMessage,
              parts: newParts,
            } as T); // Cast necessary as we modify structure based on type T
          } else if ("content" in currentMessage) {
            // ClaudeChatMessage
            // Create a new ClaudeChatContent array with only the truncated text
            const newContent: ClaudeChatContent[] = [
              { type: "text", text: truncatedText, cache_control: undefined },
            ]; // Explicitly handle cache_control if needed or omit
            // Ensure image source is not carried over if originally present and now truncated
            processedData.push({
              ...currentMessage,
              content: newContent,
            } as T); // Cast necessary
          } else {
            processedData.push(currentMessage); // Fallback, should not happen
          }
        } else {
          processedData.push(currentMessage); // No delimiter
        }
      } else {
        processedData.push(currentMessage); // No text content
      }
    }
  }
  return processedData;
}

/**
 * Extracts MIME type and base64 data from a data URL.
 */
function parseDataUrl(
  dataUrl: string
): { mimeType: string; base64Data: string } | null {
  // Regex updated to be slightly more permissive for potential variations like image/svg+xml
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.*)$/);
  if (!match || match.length < 3) {
    console.error(
      "[parseDataUrl] Invalid data URL format:",
      dataUrl.substring(0, 50) + "..."
    );
    return null;
  }
  // match[1] is the mimeType (e.g., "image/png"), match[2] is the base64 data
  return { mimeType: match[1], base64Data: match[2] };
}

// --- Gemini Implementation ---

// --- Gemini Implementation --- (Corrected)

/**
 * Calls the Gemini API using your GeminiChatMessage interface for history,
 * and constructs SDK-compatible messages for the API call.
 */
export async function callGemini(
  messages: GeminiChatMessage[], // Uses your GeminiChatMessage interface
  geminiKey: string,
  screenShotDataUrl?: string
): Promise<AgentResponseFormat | null> {
  console.debug(`[callGemini] Called with ${messages.length} messages.`);

  if (!geminiKey) {
    console.error("[callGemini] Gemini API key is missing.");
    return null;
  }

  try {
    if (!geminiClient || !geminiModel) {
      console.debug(
        "[callGemini] Initializing GoogleGenerativeAI client and model..."
      );
      geminiClient = new GoogleGenerativeAI(geminiKey);
      geminiModel = geminiClient.getGenerativeModel({
        model: "gemini-2.0-flash", // Verify model name
        systemInstruction: agentPrompt,
        // generationConfig can also be set here globally for the model
      });
      console.debug("[callGemini] Gemini client and model initialized.");
    } else {
      console.debug("[callGemini] Reusing existing Gemini client & model.");
    }

    // Define generationConfig separately for clarity
    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "application/json", // <-- Set responseMimeType HERE
    };

    const processedHistoryMessages = processTextData(messages.slice(0, -1));
    const sdkHistory: Content[] = processedHistoryMessages
      .map((msg) => {
        const text = getTextFromMessage(msg);
        const sdkRole = msg.role === "assistant" ? "model" : msg.role;
        return {
          role: sdkRole as "user" | "model", // Ensure only valid roles passed to SDK
          parts: text ? [{ text: text }] : [],
        };
      })
      .filter((content) => content.parts.length > 0);

    // Pass the generationConfig when starting the chat
    const chatSession = geminiModel.startChat({
      generationConfig, // <-- Pass the config object here
      history: sdkHistory,
      tools: googleWorkspaceTools,
    });

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) {
      console.error("[callGemini] No last message found in messages array.");
      return null;
    }

    const lastMessageSdkParts: GeminiSdkPart[] = [];
    const lastUserText = getTextFromMessage(lastMsg);
    if (lastUserText) {
      lastMessageSdkParts.push({ text: lastUserText } as TextPart);
    } else {
      console.warn(
        "[callGemini] Last message has no text content based on 'Parts' interface."
      );
    }

    if (screenShotDataUrl) {
      const parsedImage = parseDataUrl(screenShotDataUrl);
      if (parsedImage) {
        console.debug("[callGemini] Adding image part to the last message...");
        lastMessageSdkParts.push({
          inlineData: {
            data: parsedImage.base64Data,
            mimeType: parsedImage.mimeType,
          },
        } as InlineDataPart);
      } else {
        console.error(
          "[callGemini] Failed to parse screenshot data URL. Skipping image."
        );
      }
    }

    if (lastMessageSdkParts.length === 0) {
      console.error(
        "[callGemini] Cannot send message with no SDK parts (no text and no valid image)."
      );
      return null;
    }

    console.debug(
      `[callGemini] Sending ${lastMessageSdkParts.length} SDK part(s) to Gemini.`
    );

    // Send the message WITHOUT the invalid option
    const result = await chatSession.sendMessage(lastMessageSdkParts); // <-- Removed options object

    const response = result.response;
    const raw = response?.text();

    if (!raw) {
      console.warn(
        "[callGemini] No text content received from Gemini response."
      );
      console.warn(
        "[callGemini] Full response:",
        JSON.stringify(response?.candidates ?? response, null, 2)
      );
      return null;
    }

    console.debug(
      "[callGemini] Received raw response:",
      raw.substring(0, 100) + "..."
    );

    try {
      return JSON.parse(raw.trim()) as AgentResponseFormat;
    } catch (parseError) {
      console.error(
        "[callGemini] Could not parse Gemini response as JSON:",
        parseError
      );
      console.error("[callGemini] Raw response that failed parsing:", raw);
      return null;
    }
  } catch (error) {
    console.error("[callGemini] Error calling Gemini API:", error);
    // Add more specific error logging if available
    if (error instanceof Error) {
      console.error(`[callGemini] Error details: ${error.message}`);
    }
    return null;
  }
}

// --- Claude Implementation ---

type ClaudeImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";
const ALLOWED_CLAUDE_MIME_TYPES: ReadonlySet<string> =
  new Set<ClaudeImageMediaType>([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ]);

/**
 * Calls the Claude API using your ClaudeChatMessage interface for history,
 * and constructs SDK-compatible messages for the API call.
 */
export async function callClaude(
  messages: ClaudeChatMessage[], // Uses your ClaudeChatMessage interface
  claudeKey: string,
  screenShotDataUrl?: string
): Promise<AgentResponseFormat | null> {
  console.debug(`[callClaude] Called with ${messages.length} messages.`);

  if (!claudeKey) {
    console.error("[callClaude] Claude API key is missing.");
    return null;
  }

  try {
    if (!claudeClient) {
      console.debug("[callClaude] Initializing Anthropic client...");
      claudeClient = new Anthropic({
        apiKey: claudeKey,
        defaultHeaders: { "anthropic-dangerous-direct-browser-access": "true" },
      });
      console.debug("[callClaude] Anthropic client initialized.");
    } else {
      console.debug("[callClaude] Reusing existing Claude client.");
    }

    const processedHistoryMessages = processTextData(messages.slice(0, -1));

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) {
      console.error("[callClaude] No last message found in messages array.");
      return null;
    }

    // Prepare the content for the last message using SDK types
    const lastMessageSdkContent: Anthropic.MessageParam["content"] = [];

    // Add text content from your ClaudeChatContent structure
    const lastTextContent = getTextFromMessage(lastMsg);
    if (lastTextContent) {
      lastMessageSdkContent.push({ type: "text", text: lastTextContent });
    } else {
      console.warn(
        "[callClaude] Last message has no text content based on 'ClaudeChatContent' interface."
      );
    }

    // Add image content if screenshot URL is provided
    if (screenShotDataUrl) {
      const parsedImage = parseDataUrl(screenShotDataUrl);
      if (parsedImage && ALLOWED_CLAUDE_MIME_TYPES.has(parsedImage.mimeType)) {
        console.debug(
          "[callClaude] Adding valid image part to the last message..."
        );
        lastMessageSdkContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: parsedImage.mimeType as ClaudeImageMediaType, // Cast after validation
            data: parsedImage.base64Data,
          },
        });
      } else if (parsedImage) {
        console.error(
          `[callClaude] Unsupported image MIME type for Claude: ${parsedImage.mimeType}. Skipping image.`
        );
      } else {
        console.error(
          "[callClaude] Failed to parse screenshot data URL. Skipping image."
        );
      }
    }

    if (
      Array.isArray(lastMessageSdkContent) &&
      lastMessageSdkContent.length === 0
    ) {
      console.error(
        "[callClaude] Cannot send last message with no content (no text and no valid image)."
      );
      return null;
    }

    // Convert processed history (ClaudeChatMessage[]) to SDK MessageParam[] format
    const sdkMessagesToSend: Anthropic.MessageParam[] = processedHistoryMessages
      .map((msg): Anthropic.MessageParam | null => {
        // Map Role to SDK 'assistant' or 'user'
        const role =
          msg.role === "model"
            ? "assistant"
            : msg.role === "assistant"
            ? "assistant"
            : "user";
        // Extract only text content for history, as per typical Claude usage
        const text = getTextFromMessage(msg);
        if (text) {
          // Use SDK format for history content (text only)
          const content: Anthropic.TextBlockParam[] = [
            { type: "text", text: text },
          ];
          return { role, content };
        }
        return null; // Filter out messages that become empty
      })
      .filter((msg): msg is Anthropic.MessageParam => msg !== null) // Remove null entries
      .concat({
        // Add the last message (user or assistant role)
        // Map Role to SDK 'assistant' or 'user' for the last message
        role:
          lastMsg.role === "model"
            ? "assistant"
            : lastMsg.role === "assistant"
            ? "assistant"
            : "user",
        content: lastMessageSdkContent, // Use the prepared SDK content (text + optional image)
      });

    if (sdkMessagesToSend.length === 0) {
      console.error(
        "[callClaude] No valid SDK messages to send after processing."
      );
      return null;
    }

    console.debug(
      `[callClaude] Sending ${sdkMessagesToSend.length} SDK message(s) to Claude.`
    );

    const response = await claudeClient.messages.create({
      model: "claude-3-sonnet-20240229", // Verify model name
      max_tokens: 4096,
      system: agentPrompt,
      messages: sdkMessagesToSend, // Use the SDK-formatted messages
    });

    console.debug("[callClaude] Received response from Claude.");

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (textBlocks.length === 0 || !textBlocks[0].text) {
      console.warn(
        "[callClaude] No text content found in Claude response:",
        JSON.stringify(response.content, null, 2)
      );
      return null;
    }

    const raw = textBlocks
      .map((block) => block.text)
      .join("")
      .trim();
    console.debug(
      "[callClaude] Received raw text:",
      raw.substring(0, 100) + "..."
    );

    try {
      return JSON.parse(raw) as AgentResponseFormat;
    } catch (parseError) {
      console.error(
        "[callClaude] Could not parse Claude response text as JSON:",
        parseError
      );
      console.error("[callClaude] Raw text that failed parsing:", raw);
      return null;
    }
  } catch (error) {
    console.error("[callClaude] Error calling Claude API:", error);
    if (error instanceof Anthropic.APIError) {
      console.error(
        `[callClaude] Claude API Error ${error.status}: ${error.message}`
      );
    }
    return null;
  }
}

// --- Dispatcher ---

/**
 * Filters messages based on Role and calls the appropriate AI provider,
 * using the provided API key. Handles conversion between your specific
 * GeminiChatMessage and ClaudeChatMessage formats if necessary.
 */
export async function callAI(
  provider: AIProvider,
  // Input messages can be either type, matching your interfaces
  messages: (GeminiChatMessage | ClaudeChatMessage)[],
  screenShotDataUrl?: string
): Promise<AgentResponseFormat | null> {
  // Filter messages based on your Role type, keeping only 'user' and 'model'/'assistant'
  const filteredMessages = messages.filter(
    (
      msg
    ): msg is GeminiChatMessage | ClaudeChatMessage => // Type predicate
      msg.role === "user" || msg.role === "model" || msg.role === "assistant"
  );

  if (filteredMessages.length === 0) {
    console.warn(
      "[callAI] No user, model, or assistant messages remaining after filtering."
    );
    return null;
  }

  switch (provider) {
    case "gemini": {
      // Convert all filtered messages to GeminiChatMessage format before calling
      const geminiMessages: GeminiChatMessage[] = filteredMessages.map(
        (msg): GeminiChatMessage => {
          // Ensure role is 'user' or 'model' for Gemini
          const geminiRole: Role = (
            msg.role === "assistant" ? "model" : msg.role
          ) as "user" | "model";

          if ("parts" in msg) {
            // Already GeminiChatMessage (or compatible)
            // Use existing parts, assuming they fit the 'Parts' interface (text/fileData)
            return { role: geminiRole, parts: msg.parts };
          } else {
            // Convert from ClaudeChatMessage
            // Extract text, ignore images during this conversion
            const text = msg.content.find((c) => c.type === "text")?.text ?? "";
            // Create Gemini Parts array with text
            return { role: geminiRole, parts: [{ text: text }] };
          }
        }
      );
      // Call Gemini with the consistently formatted messages
      return await callGemini(
        geminiMessages,
        "AIzaSyDcDTlmwYLVRflcPIR9oklm5IlTUNzhu0Q",
        screenShotDataUrl
      );
    }

    case "claude": {
      // Convert all filtered messages to ClaudeChatMessage format before calling
      const claudeMessages: ClaudeChatMessage[] = filteredMessages.map(
        (msg) => {
          // Ensure role is 'user' or 'assistant' for Claude
          const claudeRole: Role = (
            msg.role === "model" ? "assistant" : msg.role
          ) as "user" | "assistant";

          if ("content" in msg) {
            // Already ClaudeChatMessage (or compatible)
            // Use existing content, assuming it fits ClaudeChatContent[]
            // Note: We removed the addition of cache_control: null here
            return { role: claudeRole, content: msg.content };
          } else {
            const textPart = msg.parts.find(
              (p): p is { text: string } => typeof (p as any).text === "string" // Type guard to check if p has 'text' property
            );
            const text = textPart?.text ?? "";
            // Create Claude content array with text
            // No cache_control added here
            const content: ClaudeChatContent[] = text
              ? [{ type: "text", text: text, cache_control: undefined }]
              : [];
            return { role: claudeRole, content: content };
          }
        }
      );
      // Call Claude with the consistently formatted messages
      return await callClaude(claudeMessages, "apiKey", screenShotDataUrl);
    }

    default:
      const _exhaustiveCheck: never = provider;
      console.error(`[callAI] Unknown provider specified: ${provider}`);
      throw new Error(`[callAI] Unknown provider: ${provider}`);
  }
}
