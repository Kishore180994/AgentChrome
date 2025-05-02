import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part as GeminiSdkPart,
  InlineDataPart,
  TextPart,
  FunctionCallingMode,
} from "@google/generative-ai";
import { agentPrompt, hubspotSystemPrompt } from "../../utils/prompts";
import {
  ClaudeChatMessage,
  ClaudeChatContent,
  GeminiChatMessage,
  Role,
  GeminiResponse,
} from "./interfaces";
import Anthropic from "@anthropic-ai/sdk";
import { googleTools, HSTools } from "./tools";

// Global references
let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: GenerativeModel | null = null;
let claudeClient: Anthropic | null = null;
// Flag for background context to know if this is a HubSpot-related command
let global_isHubspotCommand = false;
// Track the last HubSpot system prompt state to detect changes
let lastUseHubspotSystemPrompt: boolean | undefined = undefined;

export type AIProvider = "gemini" | "claude";

// --- Helper Functions ---
/**
 * Filters messages based on Role and calls the appropriate AI provider.
 * Returns the raw GeminiResponse to preserve the [functioncall, functioncall, ...] format.
 */
// Helper to determine if we should use the HubSpot system prompt
export async function shouldUseHubspotSystemPrompt(): Promise<boolean> {
  console.debug("[shouldUseHubspotSystemPromptAsync] Function called.");
  try {
    // Check if chrome.storage is available (good practice for extensions)
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.sync
    ) {
      console.warn(
        "[shouldUseHubspotSystemPromptAsync] chrome.storage.sync not available. Returning false."
      );
      return false;
    }

    // Fetch both items concurrently
    const items = await chrome.storage.sync.get([
      "hubspotMode",
      "hubspotConfig",
    ]);

    const storedHubspotMode = items.hubspotMode;
    const isHubspotMode = storedHubspotMode === true; // Store as boolean directly if possible, otherwise check string "true"
    console.debug(
      `[shouldUseHubspotSystemPromptAsync] hubspotMode from storage: ${storedHubspotMode}, isHubspotMode: ${isHubspotMode}`
    );

    const hubspotConfigValue = items.hubspotConfig; // Assume stored as object
    let hasApiKey = false;
    if (hubspotConfigValue && typeof hubspotConfigValue === "object") {
      hasApiKey = !!hubspotConfigValue.apiKey; // Check for truthy apiKey
      console.debug(
        `[shouldUseHubspotSystemPromptAsync] Found hubspotConfig object, hasApiKey: ${hasApiKey}`,
        hubspotConfigValue
      );
    } else {
      console.debug(
        "[shouldUseHubspotSystemPromptAsync] hubspotConfig not found or not an object in storage."
      );
    }

    const result = isHubspotMode && hasApiKey;
    console.debug(
      `[shouldUseHubspotSystemPromptAsync] Final result (isHubspotMode && hasApiKey): ${result}`
    );
    return result;
  } catch (e) {
    console.error("[shouldUseHubspotSystemPromptAsync] Error during check:", e);
    return false;
  }
}
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
  if (!geminiKey) {
    console.error("[callGemini] Gemini API key is missing.");
    return null;
  }

  try {
    const useHubspotSystemPrompt = await shouldUseHubspotSystemPrompt();

    // Reset the model if we're switching between HubSpot and regular mode
    // This ensures we use the correct system prompt
    if (
      lastUseHubspotSystemPrompt !== undefined &&
      lastUseHubspotSystemPrompt !== useHubspotSystemPrompt
    ) {
      // console.debug(
      //   `[callGemini] System prompt changed from ${
      //     lastUseHubspotSystemPrompt ? "HubSpot" : "default"
      //   } to ${useHubspotSystemPrompt ? "HubSpot" : "default"}, resetting model`
      // );
      geminiClient = null;
      geminiModel = null;
    }
    lastUseHubspotSystemPrompt = useHubspotSystemPrompt;

    // Initialize or reinitialize the model if needed
    if (!geminiClient || !geminiModel) {
      console.debug(
        "[callGemini] Initializing GoogleGenerativeAI client and model..."
      );
      geminiClient = new GoogleGenerativeAI(geminiKey);

      const systemPrompt = useHubspotSystemPrompt
        ? hubspotSystemPrompt
        : agentPrompt;

      geminiModel = geminiClient.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemPrompt,
      });
      console.debug(
        `[callGemini] Gemini client and model initialized with ${
          useHubspotSystemPrompt ? "HubSpot" : "default"
        } system prompt.`
      );
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

    const finalTools = (await shouldUseHubspotSystemPrompt())
      ? HSTools
      : googleTools;
    console.log({ finalTools });
    // Initialize chat session
    const chatSession = geminiModel.startChat({
      generationConfig,
      history: sdkHistory,
      tools: finalTools,
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY,
        },
      },
    });
    // Prepare last message
    let lastMsg = messages[messages.length - 1];
    console.log("[callGemini] useHubspotSystemPrompt:", useHubspotSystemPrompt);

    if (
      useHubspotSystemPrompt &&
      lastMsg &&
      lastMsg.parts &&
      lastMsg.parts.length > 0 &&
      lastMsg.parts[0].text
    ) {
      console.log("[callGemini] Entered main condition block."); // Did we get inside?
      const originalText = lastMsg.parts[0].text;
      const delimiter = " && ";
      const delimiterIndex = originalText.indexOf(delimiter);
      if (delimiterIndex !== -1) {
        const truncatedText = originalText.substring(0, delimiterIndex).trim();
        // *** This is the modification line ***
        lastMsg.parts[0].text = truncatedText;
      } else {
        console.log("[callGemini] Delimiter '&&' not found in text.");
      }
    } else {
      console.log(
        "[callGemini] Main condition not met. No truncation needed or possible based on conditions."
      );
    }

    // Log the state *after* the potential modification attempt
    // console.log("[callGemini] Final last message object logged below:");
    // console.log("[callGemini] Last message:", JSON.stringify(lastMsg, null, 2));
    // Also check the original array if possible
    // console.log("[callGemini] Last message text in original array:", messages[messages.length - 1]?.parts?.[0]?.text);
    // console.log("[callGemini] Last message:", JSON.stringify(lastMsg, null, 2));
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

    // Add detailed debugging information about what we're sending
    // console.debug("[callGemini] DETAILED REQUEST DEBUG:");
    // console.debug(
    //   "[callGemini] Last message parts:",
    //   JSON.stringify(lastMessageSdkParts, null, 2)
    // );
    // console.debug("[callGemini] Message history length:", sdkHistory.length);
    // console.debug("[callGemini] Has screenshot:", !!screenShotDataUrl);
    // console.debug("[callGemini] Tools config:", {
    //   toolsCount: geminiTools.length,
    //   // Check if the first tool has functionDeclarations property before accessing it
    //   functionDeclarationsCount: Array.isArray(
    //     geminiTools[0] && "functionDeclarations" in geminiTools[0]
    //       ? geminiTools[0].functionDeclarations
    //       : []
    //   )
    //     ? (geminiTools[0] as any).functionDeclarations.length
    //     : 0,
    //   mode: FunctionCallingMode.ANY,
    // });

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
      (part) =>
        part.functionCall.name === "dom_reportCurrentState" ||
        part.functionCall.name === "google_workspace_reportCurrentState"
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

  // First, check if we're in HubSpot mode
  let isHubspotMode = false;
  try {
    // Try to get HubSpot mode from localStorage (UI context)
    isHubspotMode = await shouldUseHubspotSystemPrompt();
  } catch (e) {
    console.debug("[callAI] Error accessing localStorage:", e);
  }

  // No longer checking message content for HubSpot keywords
  // We now only consider HubSpot mode for determining if we should use the HubSpot system prompt

  // A message is HubSpot-related ONLY if we're in HubSpot mode
  console.debug("[callAI] Based on isHubspotMode:", isHubspotMode);

  if (isHubspotMode) {
    // Set the global flag for the shouldUseHubspotSystemPrompt function to use
    global_isHubspotCommand = true;
    console.debug("[callAI] Set global_isHubspotCommand to true");
    screenShotDataUrl = undefined;
  } else {
    // Reset the flag for non-HubSpot commands
    global_isHubspotCommand = false;
    console.debug("[callAI] Set global_isHubspotCommand to false");
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
          } else if ("content" in msg) {
            // This is a ClaudeChatMessage
            const text =
              msg.content.find((c: ClaudeChatContent) => c.type === "text")
                ?.text ?? "";
            return { role: geminiRole, parts: [{ text: text }] };
          } else {
            // Fallback for any unexpected message format
            console.warn("[callAI] Unexpected message format:", msg);
            return { role: geminiRole, parts: [{ text: "" }] };
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
