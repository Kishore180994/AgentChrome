import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part as GeminiSdkPart,
  InlineDataPart,
  TextPart,
  FunctionCallingMode,
} from "@google/generative-ai";
import { agentPrompt } from "../../utils/prompts";
import {
  ClaudeChatMessage,
  ClaudeChatContent,
  GeminiChatMessage,
  Role,
  GeminiResponse,
} from "./interfaces";
import Anthropic from "@anthropic-ai/sdk";
import { geminiTools } from "./tools";

// Global references
let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: GenerativeModel | null = null;
let claudeClient: Anthropic | null = null;

export type AIProvider = "gemini" | "claude";

// --- Helper Functions ---

/**
 * Extracts text content from a Gemini message part.
 */
export function getTextFromMessage(
  message: GeminiChatMessage | Content
): string | undefined {
  if ("parts" in message && Array.isArray(message.parts)) {
    const textPart = message.parts.find(
      (part): part is TextPart => typeof (part as TextPart).text === "string"
    );
    return textPart?.text;
  }
  return undefined;
}

/**
 * Processes an array of chat messages, keeping full content for the last message
 * and truncating earlier messages at the '&&' delimiter.
 */
function processTextData<T extends GeminiChatMessage>(textData: T[]): T[] {
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
        const truncatedText =
          delimiterIndex !== -1
            ? textContent.substring(0, delimiterIndex).trimEnd()
            : textContent;
        processedData.push({
          ...currentMessage,
          parts: [{ text: truncatedText }],
        } as T);
      } else {
        processedData.push(currentMessage);
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
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.*)$/);
  if (!match || match.length < 3) {
    console.error(
      "[parseDataUrl] Invalid data URL format:",
      dataUrl.substring(0, 50) + "..."
    );
    return null;
  }
  return { mimeType: match[1], base64Data: match[2] };
}

// --- Gemini Implementation ---

/**
 * Calls the Gemini API using GeminiChatMessage for history, returning the raw GeminiResponse.
 */
export async function callGemini(
  messages: GeminiChatMessage[],
  geminiKey: string,
  screenShotDataUrl?: string
): Promise<GeminiResponse | null> {
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
        model: "gemini-2.0-flash",
        systemInstruction: agentPrompt,
      });
      console.debug("[callGemini] Gemini client and model initialized.");
    } else {
      console.debug("[callGemini] Reusing existing Gemini client & model.");
    }

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
    };

    // Process history messages
    const processedHistoryMessages = processTextData(messages.slice(0, -1));
    const sdkHistory: Content[] = processedHistoryMessages
      .map((msg) => {
        const text = getTextFromMessage(msg);
        const sdkRole =
          msg.role === "assistant" || msg.role === "model" ? "model" : "user";
        return {
          role: sdkRole,
          parts: text ? [{ text }] : [],
        };
      })
      .filter((content) => content.parts.length > 0);

    // Initialize chat session
    const chatSession = geminiModel.startChat({
      generationConfig,
      history: sdkHistory,
      tools: geminiTools,
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY,
        },
      },
    });

    // Prepare last message
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
      console.warn("[callGemini] Last message has no text content.");
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
      console.error("[callGemini] Cannot send message with no SDK parts.");
      return null;
    }

    console.debug(
      `[callGemini] Sending ${lastMessageSdkParts.length} SDK part(s) to Gemini.`
    );

    // Send message and process response
    const result = await chatSession.sendMessage(lastMessageSdkParts);
    const response = result.response;
    const candidates = response.candidates;
    const content = candidates?.[0]?.content;
    const parts = content?.parts;

    if (!parts || parts.length === 0) {
      console.warn("[callGemini] No parts found in Gemini response.");
      console.warn(
        "[callGemini] Full response:",
        JSON.stringify(response, null, 2)
      );
      return null;
    }

    // Validate that the parts are all function calls and include reportCurrentState
    const functionCallParts = parts.filter(
      (part): part is { functionCall: { name: string; args: any } } =>
        "functionCall" in part
    );

    if (functionCallParts.length !== parts.length) {
      console.warn(
        "[callGemini] Response contains non-functionCall parts, which is unexpected."
      );
      console.warn("[callGemini] Full parts:", JSON.stringify(parts, null, 2));
      return null;
    }

    if (functionCallParts.length === 0) {
      console.warn("[callGemini] No function calls found in Gemini response.");
      return null;
    }

    // Validate presence of reportCurrentState
    const hasReportCurrentState = functionCallParts.some(
      (part) => part.functionCall.name === "reportCurrentState"
    );
    if (!hasReportCurrentState) {
      console.error(
        "[callGemini] Missing mandatory reportCurrentState function call."
      );
      return null;
    }

    // Return the raw parts array, typed as GeminiResponse
    return functionCallParts as GeminiResponse;
  } catch (error) {
    console.error("[callGemini] Error calling Gemini API:", error);
    if (error instanceof Error) {
      console.error(`[callGemini] Error details: ${error.message}`);
    }
    return null;
  }
}

// --- Dispatcher ---

/**
 * Filters messages based on Role and calls the appropriate AI provider.
 * Returns the raw GeminiResponse to preserve the [functioncall, functioncall, ...] format.
 */
export async function callAI(
  provider: AIProvider,
  messages: (GeminiChatMessage | ClaudeChatMessage)[],
  screenShotDataUrl?: string
): Promise<GeminiResponse | null> {
  // Filter messages based on Role, keeping only 'user' and 'model'/'assistant'
  const filteredMessages = messages.filter(
    (msg): msg is GeminiChatMessage | ClaudeChatMessage =>
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
          const geminiRole: Role = (
            msg.role === "assistant" ? "model" : msg.role
          ) as "user" | "model";

          if ("parts" in msg) {
            return { role: geminiRole, parts: msg.parts };
          } else {
            const text = msg.content.find((c) => c.type === "text")?.text ?? "";
            return { role: geminiRole, parts: [{ text: text }] };
          }
        }
      );
      // Call Gemini with the consistently formatted messages
      const geminiKey =
        process.env.GEMINI_API_KEY || "AIzaSyDcDTlmwYLVRflcPIR9oklm5IlTUNzhu0Q";
      return await callGemini(geminiMessages, geminiKey, screenShotDataUrl);
    }

    case "claude": {
      // Placeholder for Claude implementation (ignored as requested)
      return null;
    }

    default:
      const _exhaustiveCheck: never = provider;
      console.error(`[callAI] Unknown provider specified: ${provider}`);
      throw new Error(`[callAI] Unknown provider: ${provider}`);
  }
}
