/// <reference types="@types/chrome" />

import OpenAI from "openai";
import { storage } from "../../utils/storage";
import {
  ChatMessage,
  getConversationHistory,
  saveConversationHistory,
} from "../../utils/chatHistory";

// Add Chrome types
declare global {
  interface Window {
    chrome: typeof chrome;
  }
}

interface AIResponse {
  text: string;
  error?: boolean;
  errorDetails?: {
    type: string;
    message: string;
    code?: string;
    action?: string;
  };
  actions?: Array<{
    type: string;
    data: any;
  }>;
}

let openaiInstance: OpenAI | null = null;

/**
 * Initializes and returns the OpenAI instance.
 */
async function getOpenAIInstance(): Promise<OpenAI> {
  const { openaiKey } = await storage.get(["openaiKey"]);

  if (!openaiKey) {
    throw new Error("OpenAI API key not found. Please add it in settings.");
  }

  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: openaiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  return openaiInstance;
}

/**
 * Sends a message to the active tab.
 */
async function sendMessageToActiveTab(message: any): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }
  await chrome.tabs.sendMessage(tab.id, message);
}

/**
 * Captures a screenshot of the current tab.
 */
export function captureTabScreenshot(): Promise<string> {
  return new Promise((resolve, reject) => {
    // The content script environment supports chrome.runtime.sendMessage
    chrome.runtime.sendMessage(
      { type: "CAPTURE_TAB_SCREENSHOT" },
      (response) => {
        console.log({ response });
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError.message);
        }
        if (response?.error) {
          return reject(response.error);
        }
        resolve(response.dataUrl);
      }
    );
  });
}

/**
 * Parses actions like click, input, and scroll from AI responses.
 */
function parseActionsFromResponse(response: string): {
  text: string;
  actions: any[];
} {
  const actions: any[] = [];
  let cleanText = response;

  const actionPatterns = [
    { pattern: /click (?:on )?["']?([^"'.,]+)["']?/i, type: "click" },
    {
      pattern: /type ["']([^"']+)["'] in ["']?([^"'.,]+)["']?/i,
      type: "input",
    },
    {
      pattern: /select ["']([^"']+)["'] from ["']?([^"'.,]+)["']?/i,
      type: "select",
    },
    { pattern: /scroll to ["']?([^"'.,]+)["']?/i, type: "scroll" },
  ];

  actionPatterns.forEach(({ pattern, type }) => {
    const matches = cleanText.match(new RegExp(pattern, "g")) || [];
    matches.forEach((match) => {
      const parts = match.match(pattern);
      if (parts) {
        actions.push({
          type,
          data: {
            value: parts[1]?.trim(),
            textContent: parts[2]?.trim() || null,
          },
        });
        cleanText = cleanText.replace(match, ""); // Remove matched action text
      }
    });
  });

  return { text: cleanText.trim(), actions };
}

/**
 * Sends a chat request to OpenAI.
 */
async function sendChatRequest(
  openai: OpenAI,
  messages: any[]
): Promise<AIResponse> {
  try {
    console.log("Sending chat request with messages:", messages);

    // Send the request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    console.log("OpenAI API response:", response);

    // Validate response structure
    if (!response.choices || response.choices.length === 0) {
      throw new Error("Invalid response: No choices returned.");
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned in the response.");
    }

    // Parse actions from the response
    const { text, actions } = parseActionsFromResponse(content);

    // Log parsed actions for debugging
    console.log("Parsed actions:", actions);

    // Perform actions on the active tab, if any
    if (actions.length > 0) {
      for (const action of actions) {
        console.log("Performing action on active tab:", action);

        await sendMessageToActiveTab({
          type: "PERFORM_ACTION",
          data: action,
        });
      }
    }

    return { text, error: false, actions };
  } catch (error: any) {
    console.error("Error in sendChatRequest:", error);

    // Return an error response for the caller to handle
    return {
      text: error.message || "An unknown error occurred.",
      error: true,
      errorDetails: {
        type: "API_ERROR",
        message: error.message || "Failed to communicate with OpenAI.",
        action: "Please check your network and API key settings.",
      },
    };
  }
}

/**
 * Chat with OpenAI while preserving conversation history.
 * @param {string} message - The user's message.
 * @param {boolean} includeScreenshot - Whether to capture a screenshot of the current tab.
 * @returns {Promise<AIResponse>}
 */
export async function chatWithOpenAI(
  message: string,
  includeScreenshot: boolean = false
): Promise<AIResponse> {
  try {
    if (!message.trim()) {
      throw new Error("No message provided.");
    }

    const openai = await getOpenAIInstance();

    const existingHistory = await getConversationHistory();

    console.log({ existingHistory });

    let conversation = [...existingHistory];

    if (!conversation.find((m) => m.role === "system")) {
      conversation.unshift({
        role: "system",
        content: `You are a helpful AI assistant in a Chrome extension that can:
                  1. See what's on the screen when screen capture is enabled.
                  2. Interact with the webpage using natural language commands like click, type, select, and scroll.
                  3. Help users with their browsing tasks.`,
      });
    }

    conversation.push({
      role: "user",
      content: message,
    });

    // const messages: any[] = [
    //   {
    //     role: "system",
    //     content: `You are a helpful AI assistant in a Chrome extension that can interact with webpages. You can:
    //     1. See what's on the screen when screen capture is enabled.
    //     2. Interact with the webpage using natural language commands like click, type, select, and scroll.
    //     3. Help users with their browsing tasks.`,
    //   },
    //   { role: "user", content: message },
    // ];

    if (includeScreenshot) {
      try {
        const screenshot = await captureTabScreenshot();

        conversation.push({
          role: "user",
          content: {
            type: "image_url",
            image_url: { url: screenshot },
          },
        });
      } catch (error) {
        console.error("Screenshot error:", error);
      }
    }

    // Filter out messages missing a valid "role"
    const validMessages = conversation.filter(
      (msg) => msg.role && typeof msg.role === "string"
    );

    const openAIMessages = validMessages.map((msg) => {
      // If the content is an object, we turn it to string JSON:
      const contentString =
        typeof msg.content === "object"
          ? JSON.stringify(msg.content)
          : msg.content;
      return {
        role: msg.role,
        content: contentString,
      };
    });

    console.log("Sending chat request with conversation:", openAIMessages);
    const { text, error, actions } = await sendChatRequest(
      openai,
      openAIMessages
    );

    let newReply: ChatMessage = {
      role: "assistant",
      content: text,
    };
    conversation.push(newReply);

    await saveConversationHistory(conversation);

    return { text, error, actions };
  } catch (error: any) {
    console.error("Error in chatWithOpenAI:", error);
    return {
      text: error.message || "Error",
      error: true,
      errorDetails: {
        type: "CHAT_ERROR",
        message: error.message || "An unknown error occurred.",
        action: "Please try again later.",
      },
    };
  }
}

/**
 * Handles image analysis requests with OpenAI.
 */
export async function analyzeImageWithOpenAI(
  imageData: string
): Promise<AIResponse> {
  try {
    if (!imageData) {
      throw new Error("No image data provided.");
    }

    const openai = await getOpenAIInstance();
    const messages: any[] = [
      {
        role: "system",
        content:
          "You are a helpful AI assistant that can analyze images and provide insights.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "What do you see in this image?" },
          { type: "image_url", image_url: { url: imageData } },
        ],
      },
    ];

    return await sendChatRequest(openai, messages);
  } catch (error: any) {
    console.error("Error in analyzeImageWithOpenAI:", error);
    return {
      text: error.message || "Error analyzing the image.",
      error: true,
      errorDetails: {
        type: "VISION_ERROR",
        message: "Failed to analyze image.",
        action: "Please check your settings and try again.",
      },
    };
  }
}
