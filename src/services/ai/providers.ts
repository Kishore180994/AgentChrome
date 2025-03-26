import { GoogleGenerativeAI } from "@google/generative-ai";
import { agentPrompt } from "../../utils/prompts";
import { ClaudeChatMessage, GeminiChatMessage } from "./interfaces";
import { AgentResponseFormat } from "../../types/responseFormat";
import Anthropic from "@anthropic-ai/sdk";

// Single global references
let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: any = null; // Replace 'any' with proper type if known
let claudeClient: Anthropic | null = null;

export type AIProvider = "openai" | "gemini" | "claude";

/**
 * Processes an array of chat messages, keeping full content for the last message
 * and truncating earlier messages at the '&&' delimiter.
 */
function processTextData(
  textData: GeminiChatMessage[] | ClaudeChatMessage[]
): (GeminiChatMessage | ClaudeChatMessage)[] {
  if (!textData || !Array.isArray(textData) || textData.length === 0) {
    return [];
  }

  const processedData: (GeminiChatMessage | ClaudeChatMessage)[] = [];
  for (let i = 0; i < textData.length; i++) {
    if (i === textData.length - 1) {
      processedData.push(textData[i]);
    } else {
      const currentMessage = textData[i];
      const textContent =
        "parts" in currentMessage
          ? currentMessage.parts[0]?.text
          : currentMessage.content[0]?.text;
      if (typeof textContent === "string") {
        const delimiterIndex = textContent.indexOf("&&");
        if (delimiterIndex !== -1) {
          const truncatedText = textContent.substring(0, delimiterIndex - 2);
          if ("parts" in currentMessage) {
            processedData.push({
              role: currentMessage.role,
              parts: [{ text: truncatedText }],
            } as GeminiChatMessage);
          } else {
            processedData.push({
              role: currentMessage.role,
              content: [{ type: "text", text: truncatedText }],
            } as ClaudeChatMessage);
          }
        } else {
          processedData.push({
            role: currentMessage.role,
            ...(("parts" in currentMessage && {
              parts: (currentMessage as GeminiChatMessage).parts,
            }) || {
              content: (currentMessage as ClaudeChatMessage).content,
            }),
          });
        }
      } else {
        processedData.push({
          role: currentMessage.role,
          ...(("parts" in currentMessage && {
            parts: (currentMessage as GeminiChatMessage).parts,
          }) || {
            content: (currentMessage as ClaudeChatMessage).content,
          }),
        });
      }
    }
  }
  return processedData;
}

/**
 * Calls the Gemini API with chat history and optional screenshot data URL.
 * Supports vision by sending the screenshot as an image part.
 */
export async function callGemini(
  messages: GeminiChatMessage[],
  geminiKey: string,
  screenShotDataUrl?: string
): Promise<AgentResponseFormat | null> {
  console.debug("[callGemini] Called with messages:", messages.length);

  if (!geminiClient) {
    console.debug("[callGemini] Creating new GoogleGenerativeAI client...");
    if (!geminiKey) throw new Error("Gemini API key is not set or empty.");
    geminiClient = new GoogleGenerativeAI(geminiKey);
    geminiModel = geminiClient.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: agentPrompt,
    });
  } else {
    console.debug("[callGemini] Reusing existing Gemini client & model.");
  }

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseModalities: [],
    responseMimeType: "application/json",
  };

  const chatHistory = processTextData(messages) as GeminiChatMessage[];
  console.log("[callGemini] chatHistory:", chatHistory);

  const chatSession = geminiModel.startChat({
    generationConfig,
    history: chatHistory,
  });
  const lastMsg = messages[messages.length - 1];
  console.log("[callGemini] lastMsg:", lastMsg);
  let lastUserText =
    typeof lastMsg.parts[0].text === "string"
      ? lastMsg.parts[0].text
      : JSON.stringify(lastMsg.parts[0].text);

  let imagePart;
  if (screenShotDataUrl) {
    const [mimeTypePart, base64Data] = screenShotDataUrl.split(",");
    const mimeType = mimeTypePart.split(":")[1].split(";")[0];
    imagePart = { inlineData: { data: base64Data, mimeType } };
  }

  const messageToSend = imagePart ? [lastUserText, imagePart] : lastUserText;
  const result = await chatSession.sendMessage(messageToSend);

  const raw = result.response?.text() || "";
  if (!raw) {
    console.warn("[callGemini] No text from Gemini.");
    return null;
  }

  try {
    return JSON.parse(raw.trim()) as AgentResponseFormat;
  } catch (err) {
    console.error(
      "[callGemini] Could not parse Gemini response as AgentResponseFormat",
      err
    );
    return null;
  }
}

/**
 * Calls the Claude API with chat history and optional screenshot data URL.
 */
export async function callClaude(
  messages: ClaudeChatMessage[],
  claudeKey: string,
  screenShotDataUrl?: string
): Promise<AgentResponseFormat | null> {
  console.debug("[callClaude] Called with messages:", messages.length);

  if (!claudeClient) {
    console.debug("[callClaude] Creating new Anthropic client...");
    if (!claudeKey) throw new Error("Claude API key is not set or empty.");
    claudeClient = new Anthropic({
      apiKey: claudeKey,
      defaultHeaders: {
        "anthropic-dangerous-direct-browser-access": "true",
      },
    });
  } else {
    console.debug("[callClaude] Reusing existing Claude client.");
  }

  const chatHistory = processTextData(messages) as ClaudeChatMessage[];
  console.log("[callClaude] chatHistory:", chatHistory);
  const lastMsg = messages[messages.length - 1];
  console.log("[callClaude] lastMsg:", lastMsg);

  const lastTextContent = lastMsg.content.find((c) => c.type === "text")?.text;
  if (!lastTextContent) {
    console.error("[callClaude] Last message has no valid text content");
    return null;
  }

  const contentToSend: Anthropic.ContentBlockParam[] = [
    { type: "text", text: lastTextContent },
  ];
  if (screenShotDataUrl) {
    const [mimeTypePart, base64Data] = screenShotDataUrl.split(",");
    const mimeType = mimeTypePart.split(":")[1].split(";")[0];
    contentToSend.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mimeType as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: base64Data,
      },
    });
  }

  const messagesToSend: Anthropic.MessageParam[] = chatHistory
    .slice(0, -1)
    .map((msg) => ({
      role: msg.role === "model" ? "assistant" : msg.role,
      content: msg.content.map((c) => ({
        type: c.type,
        text: c.type === "text" ? c.text : undefined,
        source: c.type === "image" ? c.source : undefined,
      })) as Anthropic.ContentBlockParam[],
    }))
    .concat({
      role: lastMsg.role === "model" ? "assistant" : lastMsg.role,
      content: contentToSend,
    });

  try {
    const response = await claudeClient.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      system: agentPrompt,
      messages: messagesToSend,
    });

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const raw = textBlocks.length > 0 ? textBlocks[0].text : "";
    if (!raw) {
      console.warn(
        "[callClaude] No text content in Claude response:",
        response.content
      );
      return null;
    }

    return JSON.parse(raw.trim()) as AgentResponseFormat;
  } catch (error) {
    console.error("[callClaude] Error calling Claude API:", error);
    return null;
  }
}

/**
 * Filters out execution-type messages and converts to the appropriate format for the AI provider.
 */
export async function callAI(
  provider: AIProvider,
  messages: (GeminiChatMessage | ClaudeChatMessage)[],
  screenShotDataUrl?: string
): Promise<AgentResponseFormat | null> {
  // Filter out execution messages
  const filteredMessages = messages.filter(
    (msg) => msg.role !== ("execution" as unknown as typeof msg.role)
  );

  switch (provider) {
    case "gemini": {
      const geminiKey = "AIzaSyCl0Fvr4ydPw6HF2rvdeTTuAgcn7TCvAFs";
      // Convert to Gemini format, keeping only relevant fields
      const geminiMessages: GeminiChatMessage[] = filteredMessages.map(
        (msg) => ({
          role: msg.role === "model" ? "model" : "user",
          parts:
            "parts" in msg ? msg.parts : [{ text: msg.content[0]?.text || "" }],
        })
      );
      return await callGemini(geminiMessages, geminiKey, screenShotDataUrl);
    }
    case "claude": {
      const claudeKey =
        "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";
      // Convert to Claude format, keeping only relevant fields
      const claudeMessages: ClaudeChatMessage[] = filteredMessages.map(
        (msg) => ({
          role: msg.role === "model" ? "model" : "user",
          content:
            "content" in msg
              ? msg.content
              : [
                  {
                    type: "text",
                    text: msg.parts[0]?.text || "",
                    cache_control: null,
                  },
                ],
        })
      );
      return await callClaude(claudeMessages, claudeKey, screenShotDataUrl);
    }
    default:
      throw new Error(`[callAI] Unknown provider: ${provider}`);
  }
}
