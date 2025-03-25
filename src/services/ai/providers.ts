import { GoogleGenerativeAI } from "@google/generative-ai";
import { agentPrompt } from "../../utils/prompts";
import { GeminiChatMessage } from "./interfaces";
import { AgentResponseFormat } from "../../types/responseFormat";

// Single global references for Gemini
let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: any = null; // Replace 'any' with proper type if known
export type AIProvider = "openai" | "gemini";
/**
 * Processes an array of chat messages, keeping full content for the last message
 * and truncating earlier messages at the '&&' delimiter.
 */
function processTextData(textData: GeminiChatMessage[]): GeminiChatMessage[] {
  if (!textData || !Array.isArray(textData) || textData.length === 0) {
    return [];
  }

  const processedData: GeminiChatMessage[] = [];
  for (let i = 0; i < textData.length; i++) {
    if (i === textData.length - 1) {
      processedData.push(textData[i]);
    } else {
      const currentMessage = textData[i];
      if (
        currentMessage.parts &&
        currentMessage.parts.length > 0 &&
        typeof currentMessage.parts[0].text === "string"
      ) {
        const textContent = currentMessage.parts[0].text;
        const delimiterIndex = textContent.indexOf("&&");

        if (delimiterIndex !== -1) {
          const truncatedText = textContent.substring(0, delimiterIndex - 2);
          processedData.push({
            ...currentMessage,
            parts: [{ text: truncatedText }],
          });
        } else {
          processedData.push(currentMessage);
        }
      } else {
        processedData.push(currentMessage);
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
  screenShotDataUrl?: string // Changed from screenShotLink to clarify it’s a data URL
): Promise<AgentResponseFormat | null> {
  console.debug("[callGemini] Called with messages:", messages.length);

  // 1) Ensure we have a Gemini client & model
  if (!geminiClient) {
    console.debug("[callGemini] Creating new GoogleGenerativeAI client...");
    if (!geminiKey) {
      throw new Error("Gemini API key is not set or empty.");
    }

    geminiClient = new GoogleGenerativeAI(geminiKey);

    // Use a vision-capable model
    geminiModel = geminiClient.getGenerativeModel({
      model: "gemini-2.0-flash", // Updated to a model with vision support
      systemInstruction: agentPrompt,
    });
  } else {
    console.debug("[callGemini] Reusing existing Gemini client & model.");
  }

  // 2) Build generation config
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseModalities: [],
    responseMimeType: "application/json",
  };

  // 3) Prepare chat history (all but the last message)
  const chatHistory: GeminiChatMessage[] = processTextData(messages);
  console.log("[callGemini] chatHistory:", chatHistory);

  // 4) Start a chat session
  const chatSession = geminiModel.startChat({
    generationConfig,
    history: chatHistory,
  });

  // 5) Extract the last user message
  const lastMsg = messages[messages.length - 1];
  console.log("[callGemini] lastMsg:", lastMsg);
  let lastUserText =
    typeof lastMsg.parts[0].text === "string"
      ? lastMsg.parts[0].text
      : JSON.stringify(lastMsg.parts[0].text);

  // 6) Process screenshot if provided
  let imagePart;
  if (screenShotDataUrl) {
    // Expecting a data URL like "data:image/png;base64,..."
    const [mimeTypePart, base64Data] = screenShotDataUrl.split(",");
    const mimeType = mimeTypePart.split(":")[1].split(";")[0]; // e.g., "image/png"
    imagePart = {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    };
  }

  // 7) Send message with text and optional image
  const messageToSend = imagePart ? [lastUserText, imagePart] : lastUserText;
  const result = await chatSession.sendMessage(messageToSend);

  // 8) Parse the response
  const raw = result.response?.text() || "";
  if (!raw) {
    console.warn("[callGemini] No text from gemini.");
    return null;
  }

  try {
    const parsed = JSON.parse(raw.trim()) as AgentResponseFormat;
    return parsed;
  } catch (err) {
    console.error(
      "[callGemini] Could not parse gemini response as AgentResponseFormat",
      err
    );
    return null;
  }
}

export async function callAI(
  provider: AIProvider,
  messages: GeminiChatMessage[],
  screenShotDataUrl?: string // Updated parameter name
): Promise<AgentResponseFormat | null> {
  switch (provider) {
    case "gemini":
      const geminiKey = "AIzaSyCl0Fvr4ydPw6HF2rvdeTTuAgcn7TCvAFs";
      return await callGemini(messages, geminiKey, screenShotDataUrl);
    default:
      throw new Error(`[callAI] Unknown provider: ${provider}`);
  }
}
