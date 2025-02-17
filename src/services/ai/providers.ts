// aiProviders.ts

import OpenAI from "openai";
import { AgentResponseFormat } from "../../types/responseFormat";

/*******************************************************
 * For Gemini (GoogleGenerativeAI)
 *******************************************************/
import { GoogleGenerativeAI } from "@google/generative-ai"; // or import {...} from "@google/generative-ai";
import { agentPrompt } from "../../utils/prompts";
import { ChatMessage, Parts, Role } from "./interfaces";

///////////////////////////////////////////////////////////////////////////////////
// Single global references for OpenAI and Gemini
///////////////////////////////////////////////////////////////////////////////////
let openaiClient: OpenAI | null = null;
let geminiClient: any = null; // typed as 'GoogleGenerativeAI' but using 'any' if uncertain
let geminiModel: any = null; // typed as ReturnType<GoogleGenerativeAI['getGenerativeModel']>

/********************************************************
 * callOpenAI:
 * - Reuses or creates a single OpenAI instance
 * - Invokes the chat completion
 * - Returns the raw result as AgentResponseFormat or null
 ********************************************************/
export async function callOpenAI(
  messages: ChatMessage[],
  openaiKeyOverride?: string
): Promise<AgentResponseFormat | null> {
  console.debug("[callOpenAI] Called with messages:", messages.length);

  // 1) Ensure we have an OpenAI client
  if (!openaiClient) {
    console.debug("[callOpenAI] Creating a new OpenAI instance...");
    const openaiKey =
      openaiKeyOverride ||
      "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";
    if (!openaiKey) {
      throw new Error("OpenAI API key is not set or empty.");
    }

    openaiClient = new OpenAI({
      apiKey: openaiKey,
      dangerouslyAllowBrowser: true,
    });
  } else {
    console.debug("[callOpenAI] Reusing existing OpenAI instance.");
  }

  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini", // or "gpt-4"
    messages: messages.map((m) => ({
      role: m.role === "model" ? "assistant" : "user", // Map "model" to "assistant"
      content: m.parts?.[0].text ?? "",
    })),
    max_tokens: 1000,
    temperature: 0.2,
  });

  // 3) Parse the response into AgentResponseFormat if possible
  const contentString = response.choices[0]?.message?.content;
  if (!contentString) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentString.trim()) as AgentResponseFormat;
    return parsed;
  } catch (err) {
    console.error(
      "[callOpenAI] Could not parse response as AgentResponseFormat",
      err
    );
    return null;
  }
}

/**
 * Processes an array of chat messages, keeping full content for the last message
 * and truncating earlier messages at the '&&' delimiter.
 *
 * @param {ChatMessage[]} textData - An array of chat messages.
 * @returns {ChatMessage[]} - A processed array of chat messages.
 */
function processTextData(textData: ChatMessage[]): ChatMessage[] {
  if (!textData || !Array.isArray(textData) || textData.length === 0) {
    return []; // Return empty array if input is invalid or empty.
  }

  const processedData: ChatMessage[] = [];
  for (let i = 0; i < textData.length; i++) {
    if (i === textData.length - 1) {
      // Last message: keep the full content.
      processedData.push(textData[i]);
    } else {
      // Earlier messages: truncate at the '&&' delimiter.
      const currentMessage = textData[i];
      if (
        currentMessage.parts &&
        currentMessage.parts.length > 0 &&
        typeof currentMessage.parts[0].text === "string"
      ) {
        const textContent = currentMessage.parts[0].text;
        const delimiterIndex = textContent.indexOf("&&");

        if (delimiterIndex !== -1) {
          // Create a new ChatMessage with the truncated text.
          const truncatedText = textContent.substring(0, delimiterIndex);
          processedData.push({
            ...currentMessage, // Copy other properties of the original message
            parts: [{ text: truncatedText }], // Replace the parts array with the truncated text
          });
        } else {
          processedData.push(currentMessage); // If delimiter not found, keep the original message.
        }
      } else {
        processedData.push(currentMessage); // Handle cases where message parts are missing or not strings.
      }
    }
  }
  return processedData;
}

/********************************************************
 * callGemini:
 * - Reuses or creates a single Gemini client/model
 * - Transforms ChatMessages -> Gemini chat session
 * - Returns an AgentResponseFormat or null
 ********************************************************/
export async function callGemini(
  messages: ChatMessage[],
  geminiKey: string
): Promise<AgentResponseFormat | null> {
  console.debug("[callGemini] Called with messages:", messages.length);

  // 1) Ensure we have a Gemini client & model
  if (!geminiClient) {
    console.debug("[callGemini] Creating new GoogleGenerativeAI client...");
    if (!geminiKey) {
      throw new Error("Gemini API key is not set or empty.");
    }

    geminiClient = new GoogleGenerativeAI(geminiKey);

    // e.g. "gemini-2.0-flash" or "models/chat-bison-001" depending on availability
    geminiModel = geminiClient.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: agentPrompt,
    });
  } else {
    console.debug("[callGemini] Reusing existing Gemini client & model.");
  }

  // 2) Build a generation config (you can tweak these)
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  };

  // 3) Convert ChatMessage[] to a format suitable for 'startChat'
  //    Typically "history" might be an array of {author, content}
  //    We'll store all but the last user message in "history"
  //    Then send the last user message as the final .sendMessage() call
  const chatHistory: ChatMessage[] = processTextData(messages);
  console.log("[callGemini] chatHistory:", chatHistory);
  // 4) Start a chat session
  const chatSession = geminiModel.startChat({
    generationConfig,
    history: chatHistory,
  });

  // The last user message to send explicitly
  const lastMsg = messages[messages.length - 1];
  console.log("[callGemini] lastMsg:", lastMsg);
  const lastUserText =
    typeof lastMsg.parts[0].text === "string"
      ? lastMsg.parts[0].text
      : JSON.stringify(lastMsg.parts[0].text);

  // 5) Send the last user message
  const result = await chatSession.sendMessage(lastUserText);
  // e.g. gemini returns the result in result.response.text()
  const raw = result.response?.text() || "";
  if (!raw) {
    console.warn("[callGemini] No text from gemini.");
    return null;
  }

  // 6) Attempt to parse as AgentResponseFormat
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

/********************************************************
 * callAI => chooses which provider to use
 ********************************************************/
export type AIProvider = "openai" | "gemini";

export async function callAI(
  provider: AIProvider,
  messages: ChatMessage[]
): Promise<AgentResponseFormat | null> {
  switch (provider) {
    case "openai":
      return callOpenAI(messages);
    case "gemini":
      // Example "geminiKey" or fetch from storage
      const geminiKey = "AIzaSyDcDTlmwYLVRflcPIR9oklm5IlTUNzhu0Q";
      return callGemini(messages, geminiKey);
    default:
      throw new Error(`[callAI] Unknown provider: ${provider}`);
  }
}
